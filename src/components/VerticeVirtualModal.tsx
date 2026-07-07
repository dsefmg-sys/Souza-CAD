'use client';

import { useMemo, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Waypoints } from 'lucide-react';
import { utmParaGeo, grausParaDMS } from '@/lib/topo/coords';
import { numBR } from '@/lib/topo/geometry';
import { porAfastamento, porInterseccao } from '@/lib/topo/verticeVirtual';
import { parseAzimute } from '@/lib/topo/orto';
import { METODOS_VIRTUAIS } from '@/lib/topo/sigefVocab';
import type { Vertex } from '@/lib/topo/types';

export interface DadosVerticeVirtual {
  lat: number;
  lon: number;
  leste: number;
  norte: number;
  elevacao: number;
  metodo: string;
  sigmaX?: number;
  sigmaY?: number;
  sigmaZ?: number;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  zona: number;
  hemisferio: 'N' | 'S';
  vertices: Vertex[];
  metodoPadrao?: string;
  /** Ponto clicado no mapa que abriu o modal (vira a base do afastamento, se veio de lá). */
  basePadrao?: { leste: number; norte: number; elevacao?: number } | null;
  onCriar: (dados: DadosVerticeVirtual) => void;
}

type Aba = 'afastamento' | 'interseccao';

function num(v: string): number {
  return Number(String(v).replace(',', '.').trim());
}

function Campo({ label, value, onChange, ph }: { label: string; value: string; onChange: (v: string) => void; ph?: string }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-semibold text-muted-foreground">{label}</span>
      <input className="rounded-sm border bg-background px-2 py-1.5 text-sm font-mono" value={value} placeholder={ph} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

/** Seletor de um vértice do projeto; ao escolher, devolve o vértice inteiro. */
function SeletorVertice({ label, vertices, valor, onEscolher }: { label: string; vertices: Vertex[]; valor: string; onEscolher: (id: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-semibold text-muted-foreground">{label}</span>
      <select className="rounded-sm border bg-background px-2 py-1.5 text-sm" value={valor} onChange={(e) => onEscolher(e.target.value)}>
        <option value="">— escolher —</option>
        {vertices.map((v) => (
          <option key={v.id} value={v.id}>{v.codigoSigef || v.nome || `Este ${Math.round(v.leste)}`}</option>
        ))}
      </select>
    </label>
  );
}

export default function VerticeVirtualModal({ open, onOpenChange, zona, hemisferio, vertices, metodoPadrao, basePadrao, onCriar }: Props) {
  const [aba, setAba] = useState<Aba>('afastamento');
  const metodosVirtuais = METODOS_VIRTUAIS as readonly string[];
  const [metodo, setMetodo] = useState<string>(metodosVirtuais.includes(metodoPadrao || '') ? (metodoPadrao as string) : 'PT8');

  // --- afastamento ---
  const [baseId, setBaseId] = useState('');
  const [baseE, setBaseE] = useState('');
  const [baseN, setBaseN] = useState('');
  const [azimute, setAzimute] = useState('');
  const [distancia, setDistancia] = useState('');

  // --- interseção ---
  const [aId, setAId] = useState(''), [bId, setBId] = useState('');
  const [cId, setCId] = useState(''), [dId, setDId] = useState('');

  // --- comuns ---
  const [altitude, setAltitude] = useState('');
  const [sigmaXY, setSigmaXY] = useState('');
  const [sigmaZ, setSigmaZ] = useState('');

  const acharV = (id: string) => vertices.find((v) => v.id === id) || null;

  // Ao abrir vindo de um clique no mapa, pré-preenche a base do afastamento com aquele ponto.
  useEffect(() => {
    if (open && basePadrao) {
      setBaseId('');
      setBaseE(basePadrao.leste.toFixed(3));
      setBaseN(basePadrao.norte.toFixed(3));
      if (basePadrao.elevacao != null && Number.isFinite(basePadrao.elevacao)) setAltitude(String(basePadrao.elevacao));
    }
  }, [open, basePadrao]);

  // Ao escolher um vértice como base, copia E/N/altitude/sigma dele.
  function escolherBase(id: string) {
    setBaseId(id);
    const v = acharV(id);
    if (v) {
      setBaseE(v.leste.toFixed(3));
      setBaseN(v.norte.toFixed(3));
      if (Number.isFinite(v.elevacao)) setAltitude(String(v.elevacao));
      if (v.sigmaX != null && !sigmaXY) setSigmaXY(String(v.sigmaX));
      if (v.sigmaZ != null && !sigmaZ) setSigmaZ(String(v.sigmaZ));
    }
  }

  // Resultado calculado (E/N) conforme a aba.
  const resultado = useMemo<{ leste: number; norte: number } | null>(() => {
    if (aba === 'afastamento') {
      const parsedAz = parseAzimute(azimute);
      const az = parsedAz !== null ? parsedAz : num(azimute);
      const e = num(baseE), n = num(baseN), d = num(distancia);
      if (![e, n, az, d].every(Number.isFinite) || !(baseE && baseN && azimute && distancia)) return null;
      return porAfastamento({ leste: e, norte: n }, az, d);
    }
    const A = acharV(aId), B = acharV(bId), C = acharV(cId), D = acharV(dId);
    if (!A || !B || !C || !D) return null;
    return porInterseccao(A, B, C, D);
  }, [aba, baseE, baseN, azimute, distancia, aId, bId, cId, dId, vertices]);

  const geo = resultado ? utmParaGeo(resultado.leste, resultado.norte, zona, hemisferio) : null;
  const paralelas = aba === 'interseccao' && !!(aId && bId && cId && dId) && resultado === null;

  function confirmar() {
    if (!resultado || !geo) return;
    let elev = num(altitude);
    if (!Number.isFinite(elev)) {
      // interseção sem altitude digitada: média das altitudes das duas retas
      if (aba === 'interseccao') {
        const vs = [acharV(aId), acharV(bId), acharV(cId), acharV(dId)].filter(Boolean) as Vertex[];
        const alts = vs.map((v) => v.elevacao).filter((a) => Number.isFinite(a));
        elev = alts.length ? alts.reduce((s, a) => s + a, 0) / alts.length : 0;
      } else {
        elev = 0;
      }
    }
    const sxy = num(sigmaXY), sz = num(sigmaZ);
    onCriar({
      lat: geo.lat,
      lon: geo.lon,
      leste: resultado.leste,
      norte: resultado.norte,
      elevacao: elev,
      metodo,
      ...(Number.isFinite(sxy) && sigmaXY ? { sigmaX: sxy, sigmaY: sxy } : {}),
      ...(Number.isFinite(sz) && sigmaZ ? { sigmaZ: sz } : {}),
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Waypoints className="size-5 text-primary" /> Criar vértice virtual (V)</DialogTitle>
        </DialogHeader>

        <p className="text-[11px] text-muted-foreground">
          Vértice tipo V: o canto que você não conseguiu ocupar (meio de rio, dentro de benfeitoria) e
          determinou por medida indireta. Ele entra no perímetro no lado mais próximo e recebe um código
          V do seu credenciamento.
        </p>

        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold">Método:</span>
          <div className="flex gap-1">
            {metodosVirtuais.map((m) => (
              <Button key={m} size="sm" variant={metodo === m ? 'default' : 'outline'} className="h-8 px-3 font-mono" onClick={() => setMetodo(m)}>{m}</Button>
            ))}
          </div>
        </div>

        <div className="flex gap-1 border-b">
          <button className={`px-3 py-1.5 text-sm font-semibold ${aba === 'afastamento' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground'}`} onClick={() => setAba('afastamento')}>Afastamento</button>
          <button className={`px-3 py-1.5 text-sm font-semibold ${aba === 'interseccao' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground'}`} onClick={() => setAba('interseccao')}>Interseção de alinhamentos</button>
        </div>

        {aba === 'afastamento' ? (
          <div className="space-y-3">
            <p className="text-[11px] text-muted-foreground">A partir de um ponto base ocupado, informe o azimute e a distância medidos até o canto inacessível.</p>
            <SeletorVertice label="Ponto base (opcional — ou digite E/N)" vertices={vertices} valor={baseId} onEscolher={escolherBase} />
            <div className="grid grid-cols-2 gap-2">
              <Campo label="Base — Este (E)" value={baseE} onChange={(v) => { setBaseE(v); setBaseId(''); }} ph="ex.: 290000,000" />
              <Campo label="Base — Norte (N)" value={baseN} onChange={(v) => { setBaseN(v); setBaseId(''); }} ph="ex.: 7720000,000" />
              <Campo label="Azimute (graus)" value={azimute} onChange={setAzimute} ph="0 a 360" />
              <Campo label="Distância (m)" value={distancia} onChange={setDistancia} ph="ex.: 12,50" />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[11px] text-muted-foreground">O vértice fica no cruzamento da reta A→B com a reta C→D. Escolha quatro vértices já existentes.</p>
            <div className="grid grid-cols-2 gap-2">
              <SeletorVertice label="Reta 1 — ponto A" vertices={vertices} valor={aId} onEscolher={setAId} />
              <SeletorVertice label="Reta 1 — ponto B" vertices={vertices} valor={bId} onEscolher={setBId} />
              <SeletorVertice label="Reta 2 — ponto C" vertices={vertices} valor={cId} onEscolher={setCId} />
              <SeletorVertice label="Reta 2 — ponto D" vertices={vertices} valor={dId} onEscolher={setDId} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <Campo label="Altitude (m)" value={altitude} onChange={setAltitude} ph="opcional" />
          <Campo label="Precisão XY σ (m)" value={sigmaXY} onChange={setSigmaXY} ph="opcional" />
          <Campo label="Precisão Z σ (m)" value={sigmaZ} onChange={setSigmaZ} ph="opcional" />
        </div>

        {paralelas ? (
          <div className="rounded-sm border border-destructive/40 bg-destructive/10 p-2 text-center text-xs text-destructive">
            As duas retas são paralelas — não há um ponto de cruzamento. Escolha alinhamentos que se cruzam.
          </div>
        ) : resultado && geo ? (
          <div className="rounded-sm border bg-muted/30 p-3 text-center text-sm">
            <div className="font-mono">E: {numBR(resultado.leste, 3)} &nbsp; N: {numBR(resultado.norte, 3)}</div>
            <div className="font-mono text-xs text-muted-foreground">{grausParaDMS(geo.lat, { estilo: 'memorial' })} &nbsp; {grausParaDMS(geo.lon, { estilo: 'memorial' })}</div>
          </div>
        ) : (
          <p className="text-center text-xs text-muted-foreground">Preencha os campos para ver a coordenada calculada.</p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!resultado || !geo} onClick={confirmar}>Criar vértice V</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
