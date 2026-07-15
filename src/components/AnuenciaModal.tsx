'use client';

import { useState } from 'react';
import { Packer } from 'docx';
import { saveAs } from 'file-saver';
import { Download, Files, FileText, AlertTriangle } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { gerarAnuenciaDocumento, gerarAnuenciaLoteDocumento, type AnuenciaInput } from '@/lib/export/anuencia';
import { confrontanteAssina } from '@/lib/export/confrontanteTexto';
import { compatibilizarWord2007 } from '@/lib/export/compatWord2007';
import { corPorConfrontante } from '@/lib/topo/coresConfrontante';
import type { Confrontante, ImovelData, TecnicoData, Lado } from '@/lib/topo/types';
import { avisar } from '@/lib/ui/dialogos';

/**
 * Escolha de download das Cartas de Anuência. Abre uma lista com uma carta por confrontante e,
 * no topo, a opção de baixar TODAS num único documento (cada confrontante numa folha). Assim o
 * usuário decide: um arquivo só com tudo, ou uma carta de cada vez.
 *
 * Os trechos (segmentos de divisa) de cada confrontante saem da pintura CONFRO: o mapa
 * `confrontantePorLado` liga o índice de cada lado ao id do confrontante.
 */
export default function AnuenciaModal({
  open, onOpenChange, confrontantes, lados, mapa, imovel, tecnico,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  confrontantes: Confrontante[];
  lados: Lado[];
  mapa: Record<number, string>;
  imovel: ImovelData;
  tecnico: TecnicoData | null;
}) {
  const [ocupado, setOcupado] = useState(false);
  const [incluirVertices, setIncluirVertices] = useState(false);
  // Bem público (estrada, rio...) não tem quem assine — nem entra na lista de cartas.
  const confrontantesAssinam = confrontantes.filter(confrontanteAssina);

  const ladosDe = (id: string) => Object.entries(mapa).filter(([, cid]) => cid === id).map(([i]) => Number(i));
  const compartilhadosDe = (c: Confrontante) => ladosDe(c.id).map((i) => lados[i]).filter(Boolean);
  const inputDe = (c: Confrontante): AnuenciaInput => ({
    imovel, tecnico: tecnico as TecnicoData, confrontante: c, verticesCompartilhados: compartilhadosDe(c),
    incluirVerticesLista: incluirVertices,
  });

  const nome = (c: Confrontante) => c.nome?.trim() || 'Confrontante sem nome';

  async function baixarUma(c: Confrontante) {
    if (!tecnico) { await avisar({ titulo: 'Responsável técnico', mensagem: 'Configure o responsável técnico primeiro nas configurações.' }); return; }
    setOcupado(true);
    try {
      const doc = gerarAnuenciaDocumento(inputDe(c));
      const blob = await compatibilizarWord2007(await Packer.toBlob(doc));
      saveAs(blob, `Carta de Anuencia - ${nome(c)}.docx`);
    } catch {
      await avisar({ titulo: 'Carta de Anuência', mensagem: 'Erro ao gerar a Carta de Anuência.' });
    } finally {
      setOcupado(false);
    }
  }

  async function baixarTodas() {
    if (!tecnico) { await avisar({ titulo: 'Responsável técnico', mensagem: 'Configure o responsável técnico primeiro nas configurações.' }); return; }
    if (!confrontantesAssinam.length) return;
    setOcupado(true);
    try {
      const doc = gerarAnuenciaLoteDocumento(confrontantesAssinam.map(inputDe));
      const blob = await compatibilizarWord2007(await Packer.toBlob(doc));
      saveAs(blob, `Cartas de Anuencia - ${imovel.denominacao?.trim() || 'Imovel'}.docx`);
    } catch {
      await avisar({ titulo: 'Cartas de Anuência', mensagem: 'Erro ao gerar o documento com todas as cartas.' });
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-lg flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="size-5 text-primary" /> Cartas de Anuência
          </DialogTitle>
        </DialogHeader>

        {!tecnico && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>Configure o responsável técnico nas Configurações antes de gerar as cartas.</span>
          </div>
        )}

        {confrontantesAssinam.length === 0 ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Não há confrontantes que precisem assinar neste projeto (bem público não conta — não tem
            quem assine). Crie os confrontantes ou pinte os trechos de divisa no mapa e volte aqui
            para gerar as cartas de anuência.
          </p>
        ) : (
          <>
            {/* Opções da carta (valem para o download em lote e individual) */}
            <label className="flex cursor-pointer items-start gap-2 rounded-lg border bg-muted/20 p-2.5 text-sm">
              <input type="checkbox" className="mt-0.5 size-4 accent-primary" checked={incluirVertices} onChange={(e) => setIncluirVertices(e.target.checked)} />
              <span>
                <span className="font-medium">Incluir a relação de vértices</span>
                <span className="block text-xs text-muted-foreground">Anexa, no fim de cada carta, a lista dos vértices do trecho anuído com código e coordenadas Leste/Norte.</span>
              </span>
            </label>

            {/* Baixar TODAS num único documento */}
            <button
              type="button"
              disabled={ocupado || !tecnico}
              onClick={baixarTodas}
              className="flex items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/5 p-3 text-left transition-colors hover:bg-primary/10 disabled:opacity-50"
            >
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-primary"><Files className="size-4" /> Baixar todas num único documento</div>
                <p className="mt-0.5 text-xs text-muted-foreground">Um único arquivo .docx com uma carta por confrontante, cada uma em sua folha.</p>
              </div>
              <Download className="size-4 shrink-0 text-primary" />
            </button>

            <div className="text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">ou uma de cada vez</div>

            {/* Uma carta por confrontante */}
            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
              {confrontantesAssinam.map((c) => {
                const n = compartilhadosDe(c).length;
                return (
                  <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg border p-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="inline-block h-0 w-5 shrink-0 border-t-[3px] border-dashed" style={{ borderColor: corPorConfrontante(c.id, c) }} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{nome(c)}</div>
                        <div className="text-[11px] text-muted-foreground">{n} trecho(s) de divisa</div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="h-8 shrink-0 gap-1.5" disabled={ocupado || !tecnico} onClick={() => baixarUma(c)}>
                      <Download className="size-3.5" /> Baixar
                    </Button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
