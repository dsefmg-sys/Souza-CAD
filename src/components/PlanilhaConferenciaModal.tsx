'use client';

import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Download } from 'lucide-react';
import type { ImovelData, TecnicoData, Confrontante, ResultadoCalculo, ImovelCad } from '@/lib/topo/types';
import { linhasConferencia } from '@/lib/export/sigefOds';
import { valoresEfetivos } from '@/lib/topo/conferencia';
import { numBR } from '@/lib/topo/geometry';

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
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col bg-background shadow-2xl p-6 rounded-xl overflow-hidden">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg font-black text-foreground">
            <FileSpreadsheet className="size-5.5 text-primary" /> Conferência da Planilha SIGEF
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">Confira as informações da planilha antes de baixar. Para corrigir qualquer dado, ajuste diretamente os campos do imóvel nas abas correspondentes.</p>

        {/* Metadados organizados em card colorido */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-950/10 p-3.5 text-xs md:grid-cols-3">
          {idt.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2 border-b border-dashed border-border/50 py-1">
              <span className="text-muted-foreground font-semibold">{k}</span>
              <span className="truncate text-right font-semibold text-foreground" title={v}>{v}</span>
            </div>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-border/80 my-2">
          <table className="w-full text-[11px] font-mono">
            <thead className="sticky top-0 bg-muted/95 text-[10px] uppercase text-muted-foreground shadow-sm">
              <tr>
                <th className="px-2 py-2 text-left">Código</th>
                <th className="px-2 py-2 text-left">Longitude</th>
                <th className="px-2 py-2 text-left">Latitude</th>
                <th className="px-2 py-2 text-right">Alt.</th>
                <th className="px-2 py-2 text-center">Método</th>
                <th className="px-2 py-2 text-center">Limite</th>
                <th className="px-2 py-2 text-left">Confrontante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {linhas.map((l, i) => (
                <tr key={i} className="hover:bg-muted/40 transition-colors">
                  <td className="px-2 py-1.5 font-bold text-foreground">{l.codigo}</td>
                  <td className="px-2 py-1.5">{l.longitude}</td>
                  <td className="px-2 py-1.5">{l.latitude}</td>
                  <td className="px-2 py-1.5 text-right">{l.altitude}</td>
                  <td className="px-2 py-1.5 text-center font-semibold text-sky-600 dark:text-sky-400">{l.metodo}</td>
                  <td className="px-2 py-1.5 text-center font-semibold text-amber-600 dark:text-amber-400">{l.tipoLimite}</td>
                  <td className="px-2 py-1.5 truncate max-w-[200px]" title={`${l.confrontante}${l.matricula ? ` · Matrícula ${l.matricula}` : ''}`}>{l.confrontante || '—'}{l.matricula ? ` · Mat. ${l.matricula}` : ''}</td>
                </tr>
              ))}
              {linhas.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-muted-foreground font-medium">Sem dados — importe pontos e defina os confrontantes.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-2 pt-3 border-t shrink-0">
          <span className="text-xs text-muted-foreground font-semibold">{linhas.length} vértice(s)</span>
          <div className="flex items-center gap-2">
            <Button size="sm" disabled={!linhas.length} onClick={onBaixar} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 shadow-md hover:shadow-lg px-4">
              <Download className="size-4" /> Baixar Planilha (.ods)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
