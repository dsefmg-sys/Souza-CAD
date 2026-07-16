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
      <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="size-5 text-primary" /> Conferência da planilha SIGEF</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">Confira antes de baixar. Para corrigir algum valor, edite os campos do projeto (proprietário, confrontantes, vértices) — a planilha é gerada automaticamente a partir deles.</p>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-sm border p-2 text-xs md:grid-cols-3">
          {idt.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2 border-b border-dashed border-border/50 py-0.5">
              <span className="text-muted-foreground">{k}</span><span className="truncate text-right font-medium">{v}</span>
            </div>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-sm border">
          <table className="w-full text-[11px] font-mono">
            <thead className="sticky top-0 bg-muted/60 text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="px-1.5 py-1 text-left">Código</th>
                <th className="px-1.5 py-1 text-left">Longitude</th>
                <th className="px-1.5 py-1 text-left">Latitude</th>
                <th className="px-1.5 py-1 text-right">Alt.</th>
                <th className="px-1.5 py-1 text-center">Método</th>
                <th className="px-1.5 py-1 text-center">Limite</th>
                <th className="px-1.5 py-1 text-left">Confrontante</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l, i) => (
                <tr key={i} className="border-t">
                  <td className="px-1.5 py-1 font-semibold">{l.codigo}</td>
                  <td className="px-1.5 py-1">{l.longitude}</td>
                  <td className="px-1.5 py-1">{l.latitude}</td>
                  <td className="px-1.5 py-1 text-right">{l.altitude}</td>
                  <td className="px-1.5 py-1 text-center">{l.metodo}</td>
                  <td className="px-1.5 py-1 text-center">{l.tipoLimite}</td>
                  <td className="px-1.5 py-1 truncate" title={`${l.confrontante}${l.matricula ? ` · Matrícula ${l.matricula}` : ''}`}>{l.confrontante || '—'}{l.matricula ? ` · Mat. ${l.matricula}` : ''}</td>
                </tr>
              ))}
              {linhas.length === 0 && <tr><td colSpan={7} className="p-3 text-center text-muted-foreground">Sem dados — importe pontos e defina os confrontantes.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{linhas.length} vértice(s)</span>
          <Button size="sm" disabled={!linhas.length} onClick={onBaixar}><Download className="size-4" /> Baixar planilha (.ods)</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
