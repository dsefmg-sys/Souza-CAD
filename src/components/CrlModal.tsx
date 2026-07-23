'use client';

import { useState } from 'react';
import { Packer } from 'docx';
import { saveAs } from 'file-saver';
import { Download, Files, ShieldCheck, AlertTriangle } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { gerarCrlDocumento, gerarCrlLoteDocumento, type CrlInput } from '@/lib/export/crl';
import { confrontanteAssina } from '@/lib/export/confrontanteTexto';
import { compatibilizarWord2007 } from '@/lib/export/compatWord2007';
import { corPorConfrontante } from '@/lib/topo/coresConfrontante';
import type { Confrontante, ImovelData, TecnicoData, Lado } from '@/lib/topo/types';
import { avisar } from '@/lib/ui/dialogos';

/**
 * Escolha de download das Cartas de Reconhecimento de Limites (CRL - Padrão SIGEF/INCRA).
 * Abre uma lista com uma CRL por confrontante e a opção de baixar TODAS num único documento.
 */
export default function CrlModal({
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
  const [incluirTabela, setIncluirTabela] = useState(true);

  // Bem público (estrada, rio...) não tem quem assine — nem entra na lista de cartas.
  const confrontantesAssinam = confrontantes.filter(confrontanteAssina);

  const ladosDe = (id: string) => Object.entries(mapa).filter(([, cid]) => cid === id).map(([i]) => Number(i));
  const compartilhadosDe = (c: Confrontante) => ladosDe(c.id).map((i) => lados[i]).filter(Boolean);
  const inputDe = (c: Confrontante): CrlInput => ({
    imovel,
    tecnico: tecnico as TecnicoData,
    confrontante: c,
    verticesCompartilhados: compartilhadosDe(c),
    incluirTabelaVertices: incluirTabela,
  });

  const nome = (c: Confrontante) => c.nome?.trim() || 'Confrontante sem nome';

  async function baixarUma(c: Confrontante) {
    if (!tecnico) {
      await avisar({ titulo: 'Responsável Técnico', mensagem: 'Configure o responsável técnico primeiro nas configurações.' });
      return;
    }
    setOcupado(true);
    try {
      const doc = gerarCrlDocumento(inputDe(c));
      const blob = await compatibilizarWord2007(await Packer.toBlob(doc));
      saveAs(blob, `CRL SIGEF - ${nome(c)}.docx`);
    } catch {
      await avisar({ titulo: 'Carta de Reconhecimento de Limites (CRL)', mensagem: 'Erro ao gerar a CRL.' });
    } finally {
      setOcupado(false);
    }
  }

  async function baixarTodas() {
    if (!tecnico) {
      await avisar({ titulo: 'Responsável Técnico', mensagem: 'Configure o responsável técnico primeiro nas configurações.' });
      return;
    }
    if (!confrontantesAssinam.length) return;
    setOcupado(true);
    try {
      const doc = gerarCrlLoteDocumento(confrontantesAssinam.map(inputDe));
      const blob = await compatibilizarWord2007(await Packer.toBlob(doc));
      saveAs(blob, `Cartas de Reconhecimento de Limites (CRL) - ${imovel.denominacao?.trim() || 'Imovel'}.docx`);
    } catch {
      await avisar({ titulo: 'Cartas de Reconhecimento de Limites (CRL)', mensagem: 'Erro ao gerar o documento com todas as CRLs.' });
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col bg-background shadow-2xl p-6 rounded-2xl border border-border overflow-hidden">
        <DialogHeader className="border-b pb-3 shrink-0">
          <DialogTitle className="flex items-center gap-2.5 text-base font-black uppercase tracking-wider text-foreground">
            <ShieldCheck className="size-5 text-sky-600 dark:text-sky-400" /> Carta de Reconhecimento de Limites (CRL - SIGEF)
          </DialogTitle>
        </DialogHeader>

        {!tecnico && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-400 shrink-0">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>Configure o responsável técnico nas Configurações antes de gerar as cartas de reconhecimento.</span>
          </div>
        )}

        {confrontantesAssinam.length === 0 ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Não há confrontantes que precisem assinar neste projeto (bem público não conta — não tem
            quem assine). Crie os confrontantes ou pinte os trechos de divisa no mapa e volte aqui
            para gerar as Cartas de Reconhecimento de Limites (CRL).
          </p>
        ) : (
          <div className="flex flex-col gap-3 min-h-0 flex-1 overflow-hidden">
            {/* Opção da tabela de vértices */}
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-sky-500/20 bg-sky-500/5 dark:bg-sky-950/10 p-3.5 text-sm transition-colors hover:bg-sky-500/10 shrink-0">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-primary rounded"
                checked={incluirTabela}
                onChange={(e) => setIncluirTabela(e.target.checked)}
              />
              <span>
                <span className="font-semibold text-foreground">Incluir Tabela Oficial de Vértices do Trecho na CRL</span>
                <span className="block text-xs text-muted-foreground">
                  Insere a tabela detalhada com código do vértice, tipo (M/P/V), coordenadas Este/Norte (UTM) e distância de cada segmento confrontado.
                </span>
              </span>
            </label>

            {/* Baixar TODAS num único documento */}
            <button
              type="button"
              disabled={ocupado || !tecnico}
              onClick={baixarTodas}
              className="flex items-center justify-between gap-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white p-3.5 text-left transition-all duration-150 shadow-md hover:shadow-lg disabled:opacity-50 select-none font-bold shrink-0"
            >
              <div>
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white">
                  <Files className="size-4" /> Baixar todas num único documento (.docx)
                </div>
                <p className="mt-0.5 text-[11px] text-sky-100 font-medium">
                  Um único arquivo .docx com uma CRL por confrontante, cada uma em sua folha (Padrão SIGEF/INCRA).
                </p>
              </div>
              <Download className="size-5 shrink-0 text-white" />
            </button>

            <div className="text-center text-[10px] font-black uppercase tracking-wider text-muted-foreground shrink-0">
              ou uma por confrontante
            </div>

            {/* Uma CRL por confrontante */}
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {confrontantesAssinam.map((c) => {
                const n = compartilhadosDe(c).length;
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/85 bg-zinc-50/30 dark:bg-zinc-900/10 p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="inline-block h-0 w-6 shrink-0 border-t-4 border-dashed"
                        style={{ borderColor: corPorConfrontante(c.id, c) }}
                      />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-foreground">{nome(c)}</div>
                        <div className="text-xs text-muted-foreground font-medium">
                          {n} trecho(s) de divisa compartilhados
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="default"
                      className="bg-sky-600 hover:bg-sky-500 text-white font-black uppercase text-xs tracking-wider h-8 shrink-0 gap-1.5 shadow-sm px-3"
                      disabled={ocupado || !tecnico}
                      onClick={() => baixarUma(c)}
                    >
                      <Download className="size-3.5" /> Baixar CRL
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
