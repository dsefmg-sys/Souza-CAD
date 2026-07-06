'use client';

import { useEffect, useState } from 'react';
import { Upload, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { ImportTxtConfig, CampoTxt } from '@/lib/topo/types';
import { carregarImportTxt, salvarImportTxt, IMPORT_TXT_PADRAO } from '@/lib/store/settings';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

// Rótulos amigáveis para cada campo que uma coluna pode representar.
const CAMPOS: { v: CampoTxt; label: string }[] = [
  { v: 'ignorar', label: '(ignorar coluna)' },
  { v: 'nome', label: 'Nome do ponto' },
  { v: 'codigo', label: 'Código / descrição (divisa)' },
  { v: 'norte', label: 'Norte N (UTM) / Latitude' },
  { v: 'leste', label: 'Leste E (UTM) / Longitude' },
  { v: 'elevacao', label: 'Altitude' },
  { v: 'sigmaX', label: 'Sigma X' },
  { v: 'sigmaY', label: 'Sigma Y' },
  { v: 'sigmaZ', label: 'Sigma Z' },
  { v: 'metodo', label: 'Método de posicionamento' },
];

function sepRegex(sep: ImportTxtConfig['separador']): RegExp {
  if (sep === 'tab') return /\t/;
  if (sep === 'espaco') return /\s+/;
  if (sep === ',') return /,/;
  return /;/;
}

// Adivinha o separador contando ocorrências na primeira linha de dados.
function detectarSeparador(linha: string): ImportTxtConfig['separador'] {
  const cont = (re: RegExp) => (linha.match(re) || []).length;
  const candidatos: [ImportTxtConfig['separador'], number][] = [
    [';', cont(/;/g)], [',', cont(/,/g)], ['tab', cont(/\t/g)],
  ];
  candidatos.sort((a, b) => b[1] - a[1]);
  return candidatos[0][1] > 0 ? candidatos[0][0] : 'espaco';
}

export default function ImportTxtConfigModal({ open, onOpenChange }: Props) {
  const [cfg, setCfg] = useState<ImportTxtConfig>(IMPORT_TXT_PADRAO);
  const [linhasCruas, setLinhasCruas] = useState<string[]>([]); // primeiras linhas do exemplo, sem dividir
  const [msg, setMsg] = useState('');

  useEffect(() => { if (open) { setCfg(carregarImportTxt()); setLinhasCruas([]); setMsg(''); } }, [open]);

  // Divide as linhas cruas pelo separador escolhido (recalcula sempre que troca o separador).
  const amostra = linhasCruas.map((l) => l.split(sepRegex(cfg.separador)).map((c) => c.trim()));

  async function lerExemplo(file: File) {
    const buf = await file.arrayBuffer();
    const texto = new TextDecoder('windows-1252').decode(buf);
    const linhas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 6);
    if (!linhas.length) { setMsg('Arquivo vazio.'); return; }

    // detecta separador pela 1ª linha que tenha números (pula cabeçalho)
    const linhaDado = linhas.find((l) => /\d/.test(l)) ?? linhas[0];
    const sep = detectarSeparador(linhaDado);
    const matriz = linhas.map((l) => l.split(sepRegex(sep)));
    const cols = Math.max(...matriz.map((r) => r.length));

    // se o nº de colunas bate com a config salva, mantém; senão chuta um padrão
    const base = cfg.colunas.length === cols ? cfg.colunas : adivinharColunas(cols);
    // primeira linha parece cabeçalho? (sem número na 3ª coluna)
    const temCab = !isFinite(parseFloat((matriz[0][2] ?? '').trim()));

    setCfg((p) => ({ ...p, separador: sep, temCabecalho: temCab, colunas: base }));
    setLinhasCruas(linhas);
    setMsg(`${cols} colunas detectadas. Confira o papel de cada uma abaixo.`);
  }

  function setColuna(i: number, v: CampoTxt) {
    setCfg((p) => { const cols = [...p.colunas]; cols[i] = v; return { ...p, colunas: cols }; });
  }

  function reaplicarSeparador(sep: ImportTxtConfig['separador']) {
    // ao trocar o separador, re-divide as linhas e ajusta o nº de papéis de coluna
    const novoN = linhasCruas.length ? Math.max(...linhasCruas.map((l) => l.split(sepRegex(sep)).length)) : cfg.colunas.length;
    setCfg((p) => ({ ...p, separador: sep, colunas: p.colunas.length === novoN ? p.colunas : adivinharColunas(novoN) }));
  }

  function salvar() {
    if (cfg.colunas.indexOf('norte') < 0 || cfg.colunas.indexOf('leste') < 0) {
      setMsg('Marque ao menos as colunas de Norte (N) e Leste (E) — são obrigatórias.');
      return;
    }
    salvarImportTxt(cfg);
    setMsg('Configuração salva. Vale para as próximas importações de TXT.');
    setTimeout(() => onOpenChange(false), 900);
  }

  function restaurar() { setCfg(IMPORT_TXT_PADRAO); setMsg('Voltou ao padrão do GNSS.'); }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[1040px]">
        <DialogHeader>
          <DialogTitle>Configurar importação de TXT</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Envie um TXT de exemplo do seu equipamento. O sistema separa as colunas e você diz o que
          cada uma significa (nome, Norte, Leste, altitude, sigmas, método). Isso fica salvo e passa a
          valer para toda importação.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-sm border px-3 py-2 text-sm hover:bg-accent">
            <Upload className="size-4" /> Escolher TXT de exemplo
            <input type="file" accept=".txt,.csv,text/plain" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) lerExemplo(f); e.target.value = ''; }} />
          </label>

          <div className="flex items-center gap-1 text-sm">
            <Label className="text-xs">Separador</Label>
            <select className="h-8 rounded-sm border bg-background px-2 text-sm" value={cfg.separador}
              onChange={(e) => reaplicarSeparador(e.target.value as ImportTxtConfig['separador'])}>
              <option value=";">ponto e vírgula ;</option>
              <option value=",">vírgula ,</option>
              <option value="tab">tabulação</option>
              <option value="espaco">espaço</option>
            </select>
          </div>

          <div className="flex items-center gap-1 text-sm">
            <Label className="text-xs">Decimal</Label>
            <select className="h-8 rounded-sm border bg-background px-2 text-sm" value={cfg.decimal}
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
                      <span className="shrink-0 rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-secondary-foreground">COL {i + 1}</span>
                      <select className="h-7 min-w-0 flex-1 rounded-sm border border-input bg-background px-1.5 text-xs"
                        value={c} onChange={(e) => setColuna(i, e.target.value as CampoTxt)}>
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
          <div className="rounded-sm border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nenhum exemplo carregado ainda. Envie um TXT para ver as colunas.
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

// Chute inicial de papéis quando o nº de colunas é desconhecido.
function adivinharColunas(n: number): CampoTxt[] {
  const padrao: CampoTxt[] = ['nome', 'codigo', 'norte', 'leste', 'elevacao', 'sigmaY', 'sigmaX', 'sigmaZ', 'metodo'];
  const out: CampoTxt[] = [];
  for (let i = 0; i < n; i++) out.push(padrao[i] ?? 'ignorar');
  return out;
}
