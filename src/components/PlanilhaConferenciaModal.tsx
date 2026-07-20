'use client';

import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Download } from 'lucide-react';
import type { ImovelData, TecnicoData, Confrontante, ResultadoCalculo, ImovelCad } from '@/lib/topo/types';
import { linhasConferencia } from '@/lib/export/sigefOds';
import { valoresEfetivos } from '@/lib/topo/conferencia';
import { numBR } from '@/lib/topo/geometry';
import { iniciarDoNorteHorario } from '@/lib/topo/vertices';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  imovel: ImovelData;
  res: ResultadoCalculo | null;
  confrontantes: Confrontante[];
  confrontantePorLado: Record<number, string>;
  tecnico: TecnicoData | null;
  onBaixar: () => void;
  imoveisCadastrados?: ImovelCad[];
  onAplicarCorrecoes?: (verticesAtualizados: ResultadoCalculo['vertices']) => void;
}

// Confere na tela os dados que vão para a planilha SIGEF (identificação + perímetro) ANTES de baixar.
// Só leitura: para mudar um valor, edite os campos do projeto (o app regenera a planilha correta).
export default function PlanilhaConferenciaModal({ open, onOpenChange, imovel, res, confrontantes, confrontantePorLado, tecnico, onBaixar, imoveisCadastrados }: Props) {
  const linhas = useMemo(() => {
    if (!res || !tecnico) return [];
    try { return linhasConferencia(res, confrontantes, confrontantePorLado, tecnico, imovel.cns || '', imoveisCadastrados); } catch { return []; }
  }, [res, confrontantes, confrontantePorLado, tecnico, imovel.cns, imoveisCadastrados]);
  const ef = res ? valoresEfetivos(res, imovel) : null;

  const vRef = useMemo(() => {
    if (!res?.vertices || res.vertices.length < 3) return null;
    return iniciarDoNorteHorario(res.vertices)[0];
  }, [res?.vertices]);

  const idt: [string, string][] = [
    ['Proprietário(a)', imovel.proprietario || '—'],
    ['CPF/CNPJ', imovel.cpfProprietario || '—'],
    ['Denominação', imovel.denominacao || '—'],
    ['Código INCRA', imovel.codigoImovelIncra || '—'],
    ['Cartório (CNS)', imovel.cns || '—'],
    ['Matrícula', imovel.matricula || '—'],
    ['Município(s)', imovel.municipio || '—'],
    ['Área SGL', ef ? `${numBR(ef.areaHa, 4)} ha` : '—'],
    ['Perímetro', ef ? `${numBR(ef.perimetro)} m` : '—'],
    ['Vértice Ref. (Norte)', vRef ? (vRef.codigoSigef || vRef.nome || vRef.codigoCampo || '—') : '—'],
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-6xl flex-col bg-background/95 backdrop-blur-2xl shadow-2xl p-6 rounded-2xl border border-emerald-500/20 overflow-hidden">
        <DialogHeader className="border-b border-border/50 pb-3">
          <DialogTitle className="flex items-center gap-2.5 text-base font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <FileSpreadsheet className="size-5.5 text-emerald-500" /> Conferência da Planilha SIGEF / INCRA
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground leading-snug">
          Pré-visualize a estrutura oficial do arquivo ODS antes da exportação. Todos os dados são sincronizados automaticamente com os campos do seu projeto.
        </p>

        {/* Metadados organizados em card colorido vibrante */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 text-xs shadow-xs">
          {idt.map(([k, v]) => (
            <div key={k} className="flex flex-col gap-0.5 border-b md:border-b-0 border-emerald-500/10 pb-1.5 md:pb-0">
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-700 dark:text-emerald-400">{k}</span>
              <span className="truncate font-black text-foreground text-xs" title={v}>{v}</span>
            </div>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-border/80 my-2 shadow-inner bg-card">
          <table className="w-full text-[11px] font-mono">
            <thead className="sticky top-0 bg-slate-200 text-slate-800 dark:bg-zinc-900 dark:text-white text-[10px] uppercase tracking-wider shadow-md z-10">
              <tr>
                <th className="px-3 py-2 text-left font-black">Código</th>
                <th className="px-3 py-2 text-left font-black">Longitude (E)</th>
                <th className="px-3 py-2 text-left font-black">Latitude (N)</th>
                <th className="px-3 py-2 text-right font-black">Alt. (m)</th>
                <th className="px-3 py-2 text-center font-black">Método</th>
                <th className="px-3 py-2 text-center font-black">Limite</th>
                <th className="px-3 py-2 text-left font-black">Confrontante Oficial</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {linhas.map((l, i) => (
                <tr key={i} className={`hover:bg-emerald-500/5 transition-colors ${i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}>
                  <td className="px-3 py-2 font-black text-foreground text-xs">{l.codigo}</td>
                  <td className="px-3 py-2 text-emerald-700 dark:text-emerald-300 font-semibold">{l.longitude}</td>
                  <td className="px-3 py-2 text-emerald-700 dark:text-emerald-300 font-semibold">{l.latitude}</td>
                  <td className="px-3 py-2 text-right font-mono font-bold">{l.altitude}</td>
                  <td className="px-3 py-2 text-center">
                    <span className="px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                      {l.metodo}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      {l.tipoLimite}
                    </span>
                  </td>
                  <td className="px-3 py-2 truncate max-w-[240px] font-semibold" title={`${l.confrontante}${l.matricula ? ` · Matrícula ${l.matricula}` : ''}`}>
                    {l.confrontante || <span className="text-muted-foreground italic">— Sem confrontante</span>}
                    {l.matricula ? <span className="text-xs text-muted-foreground"> · Mat. {l.matricula}</span> : ''}
                  </td>
                </tr>
              ))}
              {linhas.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground font-semibold">Nenhum vértice cadastrado no perímetro atual. Importe os vértices para visualização.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-2 pt-3 border-t shrink-0">
          <span className="text-xs text-muted-foreground font-bold">{linhas.length} vértice(s) prontos para exportação ODS</span>
          <div className="flex items-center gap-2">
            <Button size="sm" disabled={!linhas.length} onClick={onBaixar} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black h-9 shadow-md hover:shadow-lg px-5 gap-1.5 rounded-xl">
              <Download className="size-4" /> Baixar Planilha SIGEF (.ods)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
