'use client';

import { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Info, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { numBR } from '@/lib/topo/geometry';
import type { ImovelData, TecnicoData, Vertex, Confrontante } from '@/lib/topo/types';
import { conferirProntoParaExportar } from '@/lib/topo/conferenciaExportacao';
import { rotulosProfissional } from '@/lib/topo/profissional';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projetoId: string | null;
  nome: string;
  imovel: ImovelData;
  tecnico: TecnicoData | null;
  areaHa: number;
  perimetro: number;
  vertices: Vertex[];
  confrontantes: Confrontante[];
  confrontantePorLado?: Record<number, string>;
  numGlebas: number;
}

/** Marca que o botão de informações deste projeto já foi aberto pelo menos uma vez (fica verde). */
export function marcarInfoVista(projetoId: string | null): void {
  if (!projetoId || typeof window === 'undefined') return;
  try { localStorage.setItem(`metrica.infoVista:${projetoId}`, '1'); } catch { /* ignore */ }
}

/** True quando o botão de informações deste projeto já foi aberto ao menos uma vez. */
export function infoJaVista(projetoId: string | null): boolean {
  if (!projetoId || typeof window === 'undefined') return false;
  try { return localStorage.getItem(`metrica.infoVista:${projetoId}`) === '1'; } catch { return false; }
}

export default function ProjetoInfoModal({ open, onOpenChange, projetoId, nome, imovel, tecnico, areaHa, perimetro, vertices, confrontantes, confrontantePorLado, numGlebas }: Props) {
  useEffect(() => { if (open) marcarInfoVista(projetoId); }, [open, projetoId]);

  const det: [string, string][] = [
    ['Projeto', nome || '—'],
    [imovel.tipoImovel === 'urbano' ? 'Lote/Imóvel' : 'Imóvel', imovel.denominacao || '—'],
    ['Proprietário', imovel.proprietario || '—'],
    ['CPF/CNPJ', imovel.cpfProprietario || '—'],
    ['Matrícula', imovel.matricula || '—'],
    ['Cartório (CNS)', imovel.cns || '—'],
    ['Código INCRA', imovel.codigoImovelIncra || '—'],
    ['Município', imovel.municipio || '—'],
    [rotulosProfissional(tecnico).termo, imovel.numeroTrt || tecnico?.art || '—'],
    ['Responsável técnico', tecnico?.nome || '—'],
    ['Área SGL', `${numBR(areaHa, 4)} ha`],
    ['Perímetro', `${numBR(perimetro)} m`],
    ['Vértices', String(vertices.length)],
    ['Confrontantes', String(confrontantes.length)],
    ['Glebas', String(numGlebas)],
  ];

  const conferencia = conferirProntoParaExportar(imovel, vertices, confrontantes, tecnico, confrontantePorLado);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Info className="size-5 text-primary" /> Informações do projeto</DialogTitle>
        </DialogHeader>

        <div className={`rounded-sm border px-3 py-2 text-xs ${conferencia.ok ? 'border-green-600/40 bg-green-600/10' : conferencia.graves.length > 0 ? 'border-red-600/40 bg-red-600/10' : 'border-amber-600/40 bg-amber-600/10'}`}>
          {conferencia.ok ? (
            <div className="flex items-center gap-2 font-medium text-green-700 dark:text-green-400">
              <CheckCircle2 className="size-4 shrink-0" /> Projeto completo — sem pendências para exportar.
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-400">
                <AlertTriangle className="size-4 shrink-0" /> Pendências deste projeto:
              </div>
              <ul className="space-y-0.5 pl-1">
                {conferencia.problemas.map((p, i) => {
                  const grave = conferencia.graves.includes(p);
                  return (
                    <li key={i} className={`flex items-start gap-1.5 ${grave ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
                      {grave ? <XCircle className="mt-0.5 size-3.5 shrink-0" /> : <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />}
                      <span>{p}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {/* detalhes */}
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">Dados</div>
            <div className="grid gap-x-4 sm:grid-cols-2">
              {det.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-2 border-b px-2 py-1 text-xs">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="truncate text-right font-medium">{v}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-3 rounded-sm border border-dashed p-2 text-[11px] text-muted-foreground">
            Os documentos do imóvel e dos confrontantes (certidões, CNH, escrituras, fotos) agora ficam no painel <strong>Dados</strong>, cada um na sua aba, com leitura por IA e gestão dos anexos.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
