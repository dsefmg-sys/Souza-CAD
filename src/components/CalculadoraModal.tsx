'use client';

import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowLeftRight, Ruler, Copy, Check } from 'lucide-react';
import { utmParaGeo, geoParaUtm, grausParaDMS } from '@/lib/topo/coords';
import { azimute, distancia, azimuteDMS, numBR } from '@/lib/topo/geometry';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  zona: number;
  hemisferio: 'N' | 'S';
}

type Aba = 'converter' | 'distancia' | 'lote';

function Campo({ label, value, onChange, ph }: { label: string; value: string; onChange: (v: string) => void; ph?: string }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-semibold text-muted-foreground">{label}</span>
      <input className="rounded border bg-background px-2 py-1.5 text-sm font-mono" value={value} placeholder={ph} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function num(v: string): number {
  return Number(String(v).replace(',', '.').trim());
}

export default function CalculadoraModal({ open, onOpenChange, zona, hemisferio }: Props) {
  const [aba, setAba] = useState<Aba>('converter');
  const [zonaSel, setZonaSel] = useState(String(zona));
  const [hemi, setHemi] = useState<'N' | 'S'>(hemisferio);

  // --- conversão UTM <-> geo ---
  const [leste, setLeste] = useState('');
  const [norte, setNorte] = useState('');
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');

  const z = Math.round(num(zonaSel));
  const zOk = Number.isFinite(z) && z >= 1 && z <= 60;

  function utmParaGeoCalc() {
    const e = num(leste), n = num(norte);
    if (!zOk || !Number.isFinite(e) || !Number.isFinite(n)) return;
    const g = utmParaGeo(e, n, z, hemi);
    setLat(g.lat.toFixed(8)); setLon(g.lon.toFixed(8));
  }
  function geoParaUtmCalc() {
    const la = num(lat), lo = num(lon);
    if (!zOk || !Number.isFinite(la) || !Number.isFinite(lo)) return;
    const u = geoParaUtm(la, lo, z, hemi);
    setLeste(u.leste.toFixed(3)); setNorte(u.norte.toFixed(3));
  }
  const dmsLat = Number.isFinite(num(lat)) && lat ? grausParaDMS(num(lat), { estilo: 'memorial' }) : '';
  const dmsLon = Number.isFinite(num(lon)) && lon ? grausParaDMS(num(lon), { estilo: 'memorial' }) : '';

  // --- distância e azimute entre dois pontos UTM ---
  const [ea, setEa] = useState(''); const [na, setNa] = useState('');
  const [eb, setEb] = useState(''); const [nb, setNb] = useState('');
  const A = { e: num(ea), n: num(na) }, B = { e: num(eb), n: num(nb) };
  const valido2 = [A.e, A.n, B.e, B.n].every((x) => Number.isFinite(x)) && (A.e !== B.e || A.n !== B.n) && !!(ea && na && eb && nb);
  const dist = valido2 ? distancia(A, B) : null;
  const az = valido2 ? azimute(A, B) : null;

  // --- conversão em lote ---
  const [loteIn, setLoteIn] = useState('');
  const [loteDir, setLoteDir] = useState<'u2g' | 'g2u'>('u2g');
  const [virgula, setVirgula] = useState(true); // vírgula = separador decimal
  const [copiado, setCopiado] = useState(false);

  const lote = useMemo(() => {
    const linhas = loteIn.split(/\r?\n/);
    const sep = virgula ? /[\s;\t]+/ : /[\s,;\t]+/;
    const parseNum = (t: string) => Number((virgula ? t.replace(',', '.') : t).trim());
    type Linha = { rotulo: string; x: string; y: string; ok: boolean };
    const out: Linha[] = [];
    let nOk = 0;
    for (const raw of linhas) {
      const linha = raw.trim();
      if (!linha) continue;
      const toks = linha.split(sep).filter(Boolean);
      const nums: number[] = [], resto: string[] = [];
      for (const t of toks) {
        const v = parseNum(t);
        if (nums.length < 2 && Number.isFinite(v) && /\d/.test(t)) nums.push(v);
        else resto.push(t);
      }
      const rotulo = resto.join(' ');
      if (!zOk || nums.length < 2) { out.push({ rotulo, x: '—', y: '—', ok: false }); continue; }
      try {
        if (loteDir === 'u2g') {
          const g = utmParaGeo(nums[0], nums[1], z, hemi);
          out.push({ rotulo, x: g.lat.toFixed(8), y: g.lon.toFixed(8), ok: true });
        } else {
          const u = geoParaUtm(nums[0], nums[1], z, hemi);
          out.push({ rotulo, x: u.leste.toFixed(3), y: u.norte.toFixed(3), ok: true });
        }
        nOk++;
      } catch { out.push({ rotulo, x: '—', y: '—', ok: false }); }
    }
    return { linhas: out, nOk };
  }, [loteIn, loteDir, virgula, zOk, z, hemi]);

  function copiarLote() {
    const txt = lote.linhas.filter((l) => l.ok).map((l) => [l.rotulo, l.x, l.y].filter(Boolean).join('\t')).join('\n');
    if (!txt) return;
    navigator.clipboard?.writeText(txt).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 1500); }).catch(() => {});
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Ruler className="size-5 text-primary" /> Calculadora topográfica</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold">Fuso:</span>
          <input className="w-16 rounded border bg-background px-2 py-1 text-sm font-mono" value={zonaSel} onChange={(e) => setZonaSel(e.target.value)} />
          <div className="flex gap-1">
            {(['S', 'N'] as const).map((h) => (
              <Button key={h} size="sm" variant={hemi === h ? 'default' : 'outline'} className="h-8 px-3" onClick={() => setHemi(h)}>{h}</Button>
            ))}
          </div>
        </div>

        <div className="flex gap-1 border-b">
          <button className={`px-3 py-1.5 text-sm font-semibold ${aba === 'converter' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground'}`} onClick={() => setAba('converter')}>Converter coordenada</button>
          <button className={`px-3 py-1.5 text-sm font-semibold ${aba === 'distancia' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground'}`} onClick={() => setAba('distancia')}>Distância e azimute</button>
          <button className={`px-3 py-1.5 text-sm font-semibold ${aba === 'lote' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground'}`} onClick={() => setAba('lote')}>Em lote</button>
        </div>

        {aba === 'converter' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Campo label="Este (E)" value={leste} onChange={setLeste} ph="ex.: 290000.000" />
              <Campo label="Norte (N)" value={norte} onChange={setNorte} ph="ex.: 7720000.000" />
            </div>
            <div className="flex justify-center gap-2">
              <Button size="sm" variant="outline" className="gap-1" onClick={utmParaGeoCalc}>UTM → Geo <ArrowLeftRight className="size-3.5" /></Button>
              <Button size="sm" variant="outline" className="gap-1" onClick={geoParaUtmCalc}><ArrowLeftRight className="size-3.5" /> Geo → UTM</Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Campo label="Latitude (graus)" value={lat} onChange={setLat} ph="-20.59180" />
              <Campo label="Longitude (graus)" value={lon} onChange={setLon} ph="-42.00344" />
            </div>
            {(dmsLat || dmsLon) && (
              <div className="rounded border bg-muted/30 p-2 text-center text-sm font-mono">
                {dmsLat && <div>Lat: {dmsLat}</div>}
                {dmsLon && <div>Lon: {dmsLon}</div>}
              </div>
            )}
          </div>
        ) : aba === 'distancia' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Campo label="Ponto A — Este" value={ea} onChange={setEa} />
              <Campo label="Ponto A — Norte" value={na} onChange={setNa} />
              <Campo label="Ponto B — Este" value={eb} onChange={setEb} />
              <Campo label="Ponto B — Norte" value={nb} onChange={setNb} />
            </div>
            {dist != null && az != null ? (
              <div className="rounded border bg-muted/30 p-3 text-center">
                <div className="text-lg font-bold">{numBR(dist, 3)} m</div>
                <div className="text-sm font-mono text-muted-foreground">Azimute: {numBR(az, 4)}° ({azimuteDMS(az)})</div>
              </div>
            ) : (
              <p className="text-center text-xs text-muted-foreground">Preencha os quatro valores para calcular.</p>
            )}
            <p className="text-[10px] text-muted-foreground">Distância e azimute no plano UTM (quadrícula). Para a distância geodésica SGL use a tabela de lados do projeto.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex gap-1">
                <Button size="sm" variant={loteDir === 'u2g' ? 'default' : 'outline'} className="h-8 gap-1 px-3" onClick={() => setLoteDir('u2g')}>UTM → Geo</Button>
                <Button size="sm" variant={loteDir === 'g2u' ? 'default' : 'outline'} className="h-8 gap-1 px-3" onClick={() => setLoteDir('g2u')}>Geo → UTM</Button>
              </div>
              <span className="ml-auto text-muted-foreground">Decimal:</span>
              <div className="flex gap-1">
                <Button size="sm" variant={virgula ? 'default' : 'outline'} className="h-8 px-3" onClick={() => setVirgula(true)}>vírgula</Button>
                <Button size="sm" variant={!virgula ? 'default' : 'outline'} className="h-8 px-3" onClick={() => setVirgula(false)}>ponto</Button>
              </div>
            </div>
            <textarea
              className="h-32 w-full resize-y rounded border bg-background px-2 py-1.5 text-xs font-mono"
              value={loteIn}
              onChange={(e) => setLoteIn(e.target.value)}
              placeholder={loteDir === 'u2g' ? 'Uma linha por ponto. Ex.:\nP1 290000,000 7720000,000\nP2 290100,500 7720050,250' : 'Uma linha por ponto. Ex.:\nP1 -20,591800 -42,003440\nP2 -20,591500 -42,003100'}
            />
            <p className="text-[10px] text-muted-foreground">Cole uma linha por ponto. Aceito {loteDir === 'u2g' ? 'Este e Norte' : 'Latitude e Longitude'}, com um rótulo opcional no começo ou no fim. Separe os valores por espaço, tabulação ou ponto-e-vírgula.</p>
            {lote.linhas.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{lote.nOk} de {lote.linhas.length} convertido{lote.nOk === 1 ? '' : 's'}</span>
                  <Button size="sm" variant="outline" className="h-7 gap-1" disabled={lote.nOk === 0} onClick={copiarLote}>{copiado ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copiado ? 'Copiado' : 'Copiar'}</Button>
                </div>
                <div className="max-h-48 overflow-auto rounded border">
                  <table className="w-full text-xs font-mono">
                    <thead className="sticky top-0 bg-muted/60 text-[10px] uppercase text-muted-foreground">
                      <tr><th className="px-2 py-1 text-left">Ponto</th><th className="px-2 py-1 text-right">{loteDir === 'u2g' ? 'Latitude' : 'Este'}</th><th className="px-2 py-1 text-right">{loteDir === 'u2g' ? 'Longitude' : 'Norte'}</th></tr>
                    </thead>
                    <tbody>
                      {lote.linhas.map((l, i) => (
                        <tr key={i} className={`border-t ${l.ok ? '' : 'bg-destructive/10 text-destructive'}`}>
                          <td className="px-2 py-1">{l.rotulo || (i + 1)}</td>
                          <td className="px-2 py-1 text-right">{l.x}</td>
                          <td className="px-2 py-1 text-right">{l.y}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
