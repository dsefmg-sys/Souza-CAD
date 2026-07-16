'use client';

import { AlertTriangle } from 'lucide-react';
import type { CorrecaoPrecisao } from '@/lib/topo/vertices';

/**
 * Bloco visual com o relatório de correções de precisão sugeridas. Usado dentro do
 * PlanilhaConferenciaModal e do ModalSpreadsheet (mesmo layout, mesmos dados) — centralizar
 * aqui garante que o usuário vê exatamente a mesma informação nos dois pontos de entrada.
 */
export interface RelatorioCorrecaoPrecisaoProps {
  nomeArquivo: string;
  correcoes: CorrecaoPrecisao[];
}

export function RelatorioCorrecaoPrecisao({ nomeArquivo, correcoes }: RelatorioCorrecaoPrecisaoProps) {
  return (
    <div className="rounded-sm border bg-amber-50/40 dark:bg-amber-900/10 border-amber-500/30 p-3 text-xs space-y-2">
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold">
        <AlertTriangle className="size-4" />
        <span>
          {correcoes.length === 0
            ? `Nenhuma correção necessária — todos os vértices já estão com a precisão do TXT "${nomeArquivo}".`
            : `${correcoes.length} vértice(s) podem ser atualizados a partir de "${nomeArquivo}":`}
        </span>
      </div>
      {correcoes.length > 0 && (
        <>
          <p className="text-muted-foreground text-[11px]">
            O sistema casa cada vértice com o ponto do TXT mais próximo (até 0,5m em cada eixo) e só atualiza
            as coordenadas em que o TXT traz mais casas decimais. A elevação, código SIGEF, ordem e tipo
            (M/P/V) ficam intactos.
          </p>
          <div className="max-h-40 overflow-auto rounded-sm border bg-background">
            <table className="w-full text-[10px] font-mono">
              <thead className="bg-muted/60 text-muted-foreground sticky top-0">
                <tr>
                  <th className="px-1.5 py-1 text-left">Vértice</th>
                  <th className="px-1.5 py-1 text-right">E antes</th>
                  <th className="px-1.5 py-1 text-right">E depois</th>
                  <th className="px-1.5 py-1 text-right">N antes</th>
                  <th className="px-1.5 py-1 text-right">N depois</th>
                  <th className="px-1.5 py-1 text-center">Dist.</th>
                  <th className="px-1.5 py-1 text-left">O que muda</th>
                </tr>
              </thead>
              <tbody>
                {correcoes.map((c, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-1.5 py-1 font-semibold">{c.codigo}</td>
                    <td className="px-1.5 py-1 text-right">{c.antes.leste}</td>
                    <td className="px-1.5 py-1 text-right text-emerald-700 dark:text-emerald-400">{c.depois.leste}</td>
                    <td className="px-1.5 py-1 text-right">{c.antes.norte}</td>
                    <td className="px-1.5 py-1 text-right text-emerald-700 dark:text-emerald-400">{c.depois.norte}</td>
                    <td className="px-1.5 py-1 text-center">{c.distanciaM.toFixed(3)} m</td>
                    <td className="px-1.5 py-1">{c.motivo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
