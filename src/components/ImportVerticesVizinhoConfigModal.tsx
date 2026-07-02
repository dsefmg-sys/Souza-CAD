'use client';

import { useEffect, useState } from 'react';
import { Upload, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { ImportVerticesVizinhoConfig, CampoVerticeVizinho } from '@/lib/topo/types';
import { carregarImportVerticesVizinho, salvarImportVerticesVizinho, IMPORT_VIZINHO_PADRAO } from '@/lib/store/settings';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const CAMPOS: { v: CampoVerticeVizinho; label: string }[] = [
  { v: 'ignorar', label: '(ignorar coluna)' },
  { v: 'nome', label: 'Nome/código do vértice (ex.: CODI-P-0007)' },
  { v: 'latitude', label: 'Latitude (grau decimal)' },
  { v: 'longitude', label: 'Longitude (grau decimal)' },
  { v: 'leste', label: 'Leste E (UTM, metros)' },
  { v: 'norte', label: 'Norte N (UTM, metros)' },
  { v: 'elevacao', label: 'Altitude' },
];

function sepRegex(sep: ImportVerticesVizinhoConfig['separador']): RegExp {
  if (sep === 'tab') return /\t/;
  if (sep === 'espaco') return /\s+/;
  if (sep === ',') return /,/;
  return /;/;
}

function detectarSeparador(linha: string): ImportVerticesVizinhoConfig['separador'] {
  const cont = (re: RegExp) => (linha.match(re) || []).length;
  const candidatos: [ImportVerticesVizinhoConfig['separador'], number][] = [
    [';', cont(/;/g)], [',', cont(/,/g)], ['tab', cont(/\t/g)],
  ];
  candidatos.sort((a, b) => b[1] - a[1]);
  return candidatos[0][1] > 0 ? candidatos[0][0] : 'espaco';
}

function adivinharColunas(n: number): CampoVerticeVizinho[] {
  const padrao: CampoVerticeVizinho[] = ['nome', 'latitude', 'longitude', 'elevacao'];
  const out: CampoVerticeVizinho[] = [];
  for (let i = 0; i < n; i++) out.push(padrao[i] ?? 'ignorar');
  return out;
}

export default function ImportVerticesVizinhoConfigModal({ open, onOpenChange }: Props) {
  const [cfg, setCfg] = useState<ImportVerticesVizinhoConfig>(IMPORT_VIZINHO_PADRAO);
  const [linhasCruas, setLinhasCruas] = useState<string[]>([]);
  const [msg, setMsg] = useState('');

  useEffect(() => { if (open) { setCfg(carregarImportVerticesVizinho()); setLinhasCruas([]); setMsg(''); } }, [open]);

  const amostra = linhasCruas.map((l) => l.split(sepRegex(cfg.separador)).map((c) => c.trim()));

  async function lerExemplo(file: File) {
    const buf = await file.arrayBuffer();
    const texto = new TextDecoder('utf-8').decode(buf);
    const linhas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 6);
    if (!linhas.length) { setMsg('Arquivo vazio.'); return; }

    const linhaDado = linhas.find((l) => /\d/.test(l)) ?? linhas[0];
    const sep = detectarSeparador(linhaDado);
    const matriz = linhas.map((l) => l.split(sepRegex(sep)));
    const cols = Math.max(...matriz.map((r) => r.length));

    const base = cfg.colunas.length === cols ? cfg.colunas : adivinharColunas(cols);
    const temCab = !isFinite(parseFloat((matriz[0][1] ?? '').trim()));

    setCfg((p) => ({ ...p, separador: sep, temCabecalho: temCab, colunas: base }));
    setLinhasCruas(linhas);
    setMsg(`${cols} colunas detectadas. Confira o papel de cada uma abaixo.`);
  }

  function setColuna(i: number, v: CampoVerticeVizinho) {
    setCfg((p) => { const cols = [...p.colunas]; cols[i] = v; return { ...p, colunas: cols }; });
  }

  function reaplicarSeparador(sep: ImportVerticesVizinhoConfig['separador']) {
    const novoN = linhasCruas.length ? Math.max(...linhasCruas.map((l) => l.split(sepRegex(sep)).length)) : cfg.colunas.length;
    setCfg((p) => ({ ...p, separador: sep, colunas: p.colunas.length === novoN ? p.colunas : adivinharColunas(novoN) }));
  }

  function salvar() {
    const temGeo = cfg.colunas.includes('latitude') && cfg.colunas.includes('longitude');
    const temUtm = cfg.colunas.includes('leste') && cfg.colunas.includes('norte');
    if (!temGeo && !temUtm) {
      setMsg('Marque ao menos um par de coordenadas: Latitude + Longitude, OU Leste + Norte (UTM).');
      return;
    }
    if (!cfg.colunas.includes('nome')) {
      setMsg('Marque a coluna do nome/código do vértice — é o dado que você quer reaproveitar do vizinho.');
      return;
    }
    salvarImportVerticesVizinho(cfg);
    setMsg('Configuração salva. Vale para as próximas importações de vértices de vizinho.');
    setTimeout(() => onOpenChange(false), 900);
  }

  function restaurar() { setCfg(IMPORT_VIZINHO_PADRAO); setMsg('Voltou ao padrão.'); }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[1040px]">
        <DialogHeader>
          <DialogTitle>Configurar leitura de vértices do vizinho</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Envie um arquivo de exemplo (o CSV/planilha que você baixou do Distribuidor de Coordenadas
          do Acervo Fundiário, com o login gov.br de vocês, para o imóvel já certificado do vizinho).
          O sistema separa as colunas e você diz o que cada uma significa — em especial qual é o
          NOME/código oficial de cada vértice, que é o dado que vamos reaproveitar em vez de gerar um
          código novo. Isso fica salvo e passa a valer para as próximas importações.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded border px-3 py-2 text-sm hover:bg-accent">
            <Upload className="size-4" /> Escolher arquivo de exemplo
            <input type="file" accept=".txt,.csv,text/plain" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) lerExemplo(f); e.target.value = ''; }} />
          </label>

          <div className="flex items-center gap-1 text-sm">
            <Label className="text-xs">Separador</Label>
            <select className="h-8 rounded border bg-background px-2 text-sm" value={cfg.separador}
              onChange={(e) => reaplicarSeparador(e.target.value as ImportVerticesVizinhoConfig['separador'])}>
              <option value=";">ponto e vírgula ;</option>
              <option value=",">vírgula ,</option>
              <option value="tab">tabulação</option>
              <option value="espaco">espaço</option>
            </select>
          </div>

          <div className="flex items-center gap-1 text-sm">
            <Label className="text-xs">Decimal</Label>
            <select className="h-8 rounded border bg-background px-2 text-sm" value={cfg.decimal}
              onChange={(e) => setCfg((p) => ({ ...p, decimal: e.target.value as '.' | ',' }))}>
              <option value=".">ponto (1.23)</option>
              <option value=",">vírgula (1,23)</option>
            </select>
          </div>

          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={cfg.temCabecalho}
              onChange={(e) => setCfg((p) => ({ ...p, temCabecalho: e.target.checked }))} />
            1ª linha é cabeçalho
          </label>
        </div>

        {amostra.length > 0 ? (
          <>
            <p className="text-xs text-muted-foreground">Diga o papel de cada coluna. Os valores de exemplo aparecem abaixo de cada uma.</p>
            <div className="grid max-h-[55vh] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
              {cfg.colunas.map((c, i) => {
                const valores = amostra.filter((_, r) => !(cfg.temCabecalho && r === 0)).map((l) => l[i]).filter((v) => v != null && v !== '').slice(0, 3);
                const usado = c !== 'ignorar';
                return (
                  <div key={i} className={`rounded-md border p-2 ${usado ? 'bg-card' : 'bg-muted/30'}`}>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-secondary-foreground">COL {i + 1}</span>
                      <select className="h-7 min-w-0 flex-1 rounded border border-input bg-background px-1.5 text-xs"
                        value={c} onChange={(e) => setColuna(i, e.target.value as CampoVerticeVizinho)}>
                        {CAMPOS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
                      </select>
                    </div>
                    <div className="truncate font-mono text-[10px] text-muted-foreground" title={valores.join('  ·  ')}>
                      {valores.length ? valores.join('  ·  ') : '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="rounded border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nenhum exemplo carregado ainda. Envie um arquivo para ver as colunas.
          </div>
        )}

        <div className="flex items-center gap-3 border-t pt-3">
          <Button onClick={salvar}><Save /> Salvar configuração</Button>
          <Button variant="outline" onClick={restaurar}>Restaurar padrão</Button>
          {msg && <span className="text-sm text-primary">{msg}</span>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
