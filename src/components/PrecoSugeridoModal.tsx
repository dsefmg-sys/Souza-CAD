'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calculator, Printer, Copy, Check, ChevronDown } from 'lucide-react';
import {
  precosPorDificuldade,
  tabelaCompleta,
  areaEfetiva,
  comDesconto,
  AREA_MINIMA_HA,
  NIVEIS_DIFICULDADE,
  MULTIPLICADORES_DIFICULDADE,
} from '@/lib/topo/precoSugerido';
import { carregarFatorBase, salvarFatorBase, carregarDescontoPct, salvarDescontoPct, SALARIO_MINIMO_REFERENCIA } from '@/lib/store/fatorPreco';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Área do imóvel aberto, em hectares (0 se ainda não há levantamento). */
  areaHa?: number;
}

/** "R$ 2.000" — sem centavos, que aqui é uma estimativa redonda. */
function reais(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function num(v: string): number {
  return Number(String(v).replace(/\./g, '').replace(',', '.').trim());
}

// Escala de cor verde (fácil) -> âmbar (difícil), igual à tabela de campo. Fundo suave por nível.
const COR_NIVEL = [
  'bg-emerald-100 dark:bg-emerald-950/40',
  'bg-green-100 dark:bg-green-950/40',
  'bg-lime-100 dark:bg-lime-950/40',
  'bg-yellow-100 dark:bg-yellow-950/40',
  'bg-amber-100 dark:bg-amber-950/40',
  'bg-orange-100 dark:bg-orange-950/40',
];

/** Bolinhas de dificuldade (1 a 6), como na tabela impressa. */
function Bolinhas({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: 6 }, (_, i) => (
        <span key={i} className={`inline-block size-1.5 rounded-full ${i <= n ? 'bg-foreground' : 'bg-foreground/20'}`} />
      ))}
    </span>
  );
}

export default function PrecoSugeridoModal({ open, onOpenChange, areaHa = 0 }: Props) {
  const [aba, setAba] = useState<'imovel' | 'tabela'>('tabela');
  const [fatorStr, setFatorStr] = useState(String(SALARIO_MINIMO_REFERENCIA));
  const [areaStr, setAreaStr] = useState('');
  const [copiado, setCopiado] = useState<number | null>(null);
  const [entenda, setEntenda] = useState(false);
  const [descontoPct, setDescontoPct] = useState(0);

  // Ao abrir: puxa o fator e o desconto salvos e a área do imóvel atual (se houver).
  useEffect(() => {
    if (!open) return;
    setFatorStr(String(carregarFatorBase()));
    setDescontoPct(carregarDescontoPct());
    setAreaStr(areaHa > 0 ? String(Number(areaHa.toFixed(2))) : '');
    setCopiado(null);
  }, [open, areaHa]);

  function escolherDesconto(pct: number) {
    setDescontoPct(pct);
    salvarDescontoPct(pct);
  }

  const fatorBase = useMemo(() => {
    const f = num(fatorStr);
    return Number.isFinite(f) && f > 0 ? f : SALARIO_MINIMO_REFERENCIA;
  }, [fatorStr]);

  const area = useMemo(() => {
    const a = num(areaStr);
    return Number.isFinite(a) && a > 0 ? a : 0;
  }, [areaStr]);

  // Preços cheios (base) e com o desconto aplicado, para mostrar os dois lado a lado quando houver.
  const precosCheios = useMemo(() => precosPorDificuldade(area, fatorBase), [area, fatorBase]);
  const precos = useMemo(() => precosCheios.map((p) => comDesconto(p, descontoPct)), [precosCheios, descontoPct]);
  const tabela = useMemo(
    () => tabelaCompleta(fatorBase).map((r) => ({ areaHa: r.areaHa, precos: r.precos.map((p) => comDesconto(p, descontoPct)) })),
    [fatorBase, descontoPct],
  );

  function salvarFator() {
    salvarFatorBase(fatorBase);
  }

  async function copiar(valor: number, nivel: number) {
    try {
      await navigator.clipboard.writeText(String(valor));
      setCopiado(nivel);
      setTimeout(() => setCopiado((c) => (c === nivel ? null : c)), 1500);
    } catch {
      /* clipboard bloqueado — ignora */
    }
  }

  // Impressão da tabela completa numa janela própria, sem mexer na tela do app.
  function imprimirTabela() {
    const win = window.open('', '_blank', 'width=820,height=1000');
    if (!win) return;
    const cabec = ['Área', ...NIVEIS_DIFICULDADE.map((_, i) => '•'.repeat(i + 1))];
    const linhas = tabela
      .map((r) => `<tr><th>${r.areaHa} ha</th>${r.precos.map((p) => `<td>${reais(p)}</td>`).join('')}</tr>`)
      .join('');
    const formula = MULTIPLICADORES_DIFICULDADE.map((m) => `√área × ${comDesconto(fatorBase * m, descontoPct)}`).join('</td><td>');
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Dificuldade e Custos</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:24px}
        h1{text-align:center;font-size:18px;margin:0 0 12px}
        table{border-collapse:collapse;width:100%;font-size:12px}
        th,td{border:1px solid #999;padding:6px 8px;text-align:center}
        thead th{background:#f0f0f0}
        tbody th{text-align:left;font-weight:bold}
        tfoot td,tfoot th{font-size:10px;color:#333;background:#fafafa}
        .nota{margin-top:10px;font-size:10px;color:#555;text-align:center}
      </style></head><body>
      <h1>Dificuldade e Custos — preço sugerido</h1>
      <table>
        <thead><tr>${cabec.map((c) => `<th>${c}</th>`).join('')}</tr></thead>
        <tbody>${linhas}</tbody>
        <tfoot><tr><th>Fórmula</th><td>${formula}</td></tr></tfoot>
      </table>
      <p class="nota">Referência amigável para orçamento — não é tabela oficial. Fator base ${reais(fatorBase)}. Área abaixo de ${AREA_MINIMA_HA} ha conta como ${AREA_MINIMA_HA} ha.${descontoPct > 0 ? ` Valores já com desconto de ${descontoPct}%.` : ''}</p>
      <script>window.onload=function(){window.print()}<\/script>
      </body></html>`);
    win.document.close();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-5xl flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="size-5 text-primary" /> Preço sugerido
          </DialogTitle>
        </DialogHeader>

        {/* Layout horizontal: controles à esquerda, tabela/resultados à direita (aproveita a largura). */}
        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto md:grid-cols-[320px_minmax(0,1fr)]">
          {/* COLUNA ESQUERDA — ajustes */}
          <div className="space-y-3">
            <p className="text-[11px] text-muted-foreground">
              Uma referência para te ajudar a orçar, não uma regra. O preço é a raiz da área vezes um fator que
              cresce com a dificuldade do trabalho. Ajuste como quiser — o valor final é sempre sua decisão.
            </p>

            {/* Fator base */}
            <div className="space-y-1.5 rounded-sm border bg-muted/30 p-2.5">
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-semibold text-muted-foreground">Valor base (fator)</span>
                <input
                  className="w-32 rounded-sm border bg-background px-2 py-1.5 text-sm font-mono"
                  value={fatorStr}
                  inputMode="numeric"
                  onChange={(e) => setFatorStr(e.target.value)}
                  onBlur={salvarFator}
                />
              </label>
              <p className="text-[10px] leading-tight text-muted-foreground">
                Começa no salário mínimo. Se você está começando, pode adotar um valor menor para formar
                clientela — muitos profissionais fazem isso no início. Fica salvo para os próximos orçamentos.
              </p>
            </div>

            {/* Desconto para quem está começando */}
            <div className="space-y-1.5 rounded-sm border border-emerald-200 bg-emerald-50/60 p-2.5 dark:border-emerald-900 dark:bg-emerald-950/30">
              <div className="flex flex-wrap gap-1">
                {[0, 20, 30, 40, 50].map((pct) => (
                  <Button
                    key={pct}
                    size="sm"
                    variant={descontoPct === pct ? 'default' : 'outline'}
                    className="h-8 px-3"
                    onClick={() => escolherDesconto(pct)}
                  >
                    {pct === 0 ? 'Sem desconto' : `-${pct}%`}
                  </Button>
                ))}
              </div>
              <p className="text-[10px] leading-tight text-muted-foreground">
                Está começando? Um desconto na tabela toda ajuda a conquistar os primeiros clientes e a formar
                seu portfólio. Descontos maiores fazem sentido bem no início; quando a agenda encher, é só
                voltar ao cheio. É uma estratégia, não uma obrigação.
              </p>
            </div>

            {/* Entenda o cálculo — discreto, recolhido por padrão */}
            <div className="border-t pt-2">
              <button
                className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                onClick={() => setEntenda((v) => !v)}
              >
                <ChevronDown className={`size-3.5 transition ${entenda ? 'rotate-180' : ''}`} /> Entenda o cálculo
              </button>
              {entenda && (
                <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
                  O preço é a raiz quadrada da área em hectares vezes o fator do nível. A raiz faz o valor
                  subir mais devagar em áreas grandes, porque o esforço não dobra quando a área dobra. Cada
                  nível de dificuldade soma 10% ao fator base, até 50% no mais difícil. Trabalhos abaixo de{' '}
                  {AREA_MINIMA_HA} ha contam como {AREA_MINIMA_HA} ha, porque o deslocamento, a visita e a
                  papelada existem do mesmo jeito. Tudo isso é só um ponto de partida — quem decide é você.
                </p>
              )}
            </div>
          </div>

          {/* COLUNA DIREITA — abas + conteúdo (tabela completa é a primeira) */}
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex gap-1 border-b">
              <button
                className={`px-3 py-1.5 text-sm font-semibold ${aba === 'tabela' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground'}`}
                onClick={() => setAba('tabela')}
              >
                Tabela completa
              </button>
              <button
                className={`px-3 py-1.5 text-sm font-semibold ${aba === 'imovel' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground'}`}
                onClick={() => setAba('imovel')}
              >
                Este imóvel
              </button>
            </div>

            {aba === 'imovel' ? (
              <div className="space-y-2.5">
                <label className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-muted-foreground">Área (ha)</span>
                  <input
                    className="w-32 rounded-sm border bg-background px-2 py-1.5 text-sm font-mono"
                    value={areaStr}
                    inputMode="decimal"
                    placeholder="ex.: 12,5"
                    onChange={(e) => setAreaStr(e.target.value)}
                  />
                  {area > 0 && area < AREA_MINIMA_HA && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400">conta como {AREA_MINIMA_HA} ha</span>
                  )}
                </label>

                {area > 0 ? (
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {NIVEIS_DIFICULDADE.map((n, i) => (
                      <button
                        key={i}
                        onClick={() => copiar(precos[i], i)}
                        title="Tocar para copiar o valor"
                        className={`flex w-full items-center gap-3 rounded-sm border px-3 py-2 text-left transition hover:brightness-95 ${COR_NIVEL[i]}`}
                      >
                        <Bolinhas n={i} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold leading-tight">{n.titulo}</span>
                          <span className="block text-[10px] leading-tight text-muted-foreground">{n.descricao}</span>
                        </span>
                        <span className="flex items-center gap-1.5 font-mono text-sm font-bold tabular-nums">
                          {descontoPct > 0 && (
                            <span className="text-[10px] font-normal text-muted-foreground line-through">{reais(precosCheios[i])}</span>
                          )}
                          {reais(precos[i])}
                          {copiado === i ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5 opacity-40" />}
                        </span>
                      </button>
                    ))}
                    <p className="text-center text-[10px] text-muted-foreground sm:col-span-2">
                      Área usada no cálculo: {areaEfetiva(area).toLocaleString('pt-BR')} ha
                      {descontoPct > 0 ? ` · valores já com ${descontoPct}% de desconto` : ''}. Toque num valor para copiar.
                    </p>
                  </div>
                ) : (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    Digite a área do imóvel para ver os seis preços por dificuldade.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={imprimirTabela} className="gap-1.5">
                    <Printer className="size-4" /> Imprimir
                  </Button>
                </div>
                <div className="overflow-auto rounded-sm border">
                  <table className="w-full border-collapse text-center text-xs tabular-nums">
                    <thead className="sticky top-0 bg-muted">
                      <tr>
                        <th className="border p-1.5 font-semibold">Área</th>
                        {NIVEIS_DIFICULDADE.map((_, i) => (
                          <th key={i} className="border p-1.5">
                            <span className="inline-flex justify-center"><Bolinhas n={i} /></span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tabela.map((r) => (
                        <tr key={r.areaHa}>
                          <th className="border bg-muted/40 p-1.5 text-left font-semibold">{r.areaHa} ha</th>
                          {r.precos.map((p, i) => (
                            <td key={i} className={`border p-1.5 font-mono ${COR_NIVEL[i]}`}>{reais(p)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
