'use client';

import { useMemo, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Download, Pencil, AlertTriangle } from 'lucide-react';
import { confirmar } from '@/lib/ui/dialogos';
import type { ImovelData, TecnicoData, Confrontante, ResultadoCalculo, ImovelCad } from '@/lib/topo/types';
import { linhasConferencia, type LinhaConferencia } from '@/lib/export/sigefOds';
import { valoresEfetivos } from '@/lib/topo/conferencia';
import { numBR } from '@/lib/topo/geometry';
import { iniciarDoNorteHorario } from '@/lib/topo/vertices';
import { TIPOS_LIMITE, METODOS_POSICIONAMENTO } from '@/lib/topo/sigefVocab';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  imovel: ImovelData;
  res: ResultadoCalculo | null;
  confrontantes: Confrontante[];
  confrontantePorLado: Record<number, string>;
  tecnico: TecnicoData | null;
  onBaixar: (linhasEditadas?: LinhaConferencia[]) => void;
  imoveisCadastrados?: ImovelCad[];
  onAplicarCorrecoes?: (verticesAtualizados: ResultadoCalculo['vertices']) => void;
}

export default function PlanilhaConferenciaModal({
  open,
  onOpenChange,
  imovel,
  res,
  confrontantes,
  confrontantePorLado,
  tecnico,
  onBaixar,
  imoveisCadastrados,
  onMinimizar
}: Props) {
  const handleOpenChange = async (val: boolean) => {
    if (!val) {
      if (isManualEdit) {
        const desc = await confirmar({
          titulo: 'Descartar alterações?',
          mensagem: 'Você editou dados na tabela de conferência. Se fechar agora, essas alterações serão perdidas.',
          okLabel: 'Descartar e Fechar',
          perigo: true,
        });
        if (!desc) return;
      }
      onOpenChange(false);
    } else {
      onOpenChange(true);
    }
  };
  const [linhasLocal, setLinhasLocal] = useState<LinhaConferencia[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isManualEdit, setIsManualEdit] = useState(false);

  const linhas = useMemo(() => {
    if (!res || !tecnico) return [];
    try {
      return linhasConferencia(res, confrontantes, confrontantePorLado, tecnico, imovel.cns || '', imoveisCadastrados);
    } catch {
      return [];
    }
  }, [res, confrontantes, confrontantePorLado, tecnico, imovel.cns, imoveisCadastrados]);

  // Inicializa o estado local das linhas ao abrir ou resetar
  useEffect(() => {
    if (open) {
      setLinhasLocal(linhas);
      setIsManualEdit(false);
      setIsEditing(false);
    }
  }, [open, linhas]);

  const updateLinha = (idx: number, campo: keyof LinhaConferencia, valor: string) => {
    setIsManualEdit(true);
    const valorTratado = campo === 'codigo' ? valor.toUpperCase() : valor;
    setLinhasLocal(prev => prev.map((l, i) => (i === idx ? { ...l, [campo]: valorTratado } : l)));
  };

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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent onMinimize={onMinimizar} className="flex max-h-[92vh] max-w-6xl flex-col bg-background/95 backdrop-blur-2xl shadow-2xl p-6 rounded-2xl border border-emerald-500/20 overflow-hidden">
        <DialogHeader className="border-b border-border/50 pb-3">
          <DialogTitle className="flex items-center gap-2.5 text-base font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <FileSpreadsheet className="size-5.5 text-emerald-500" /> Conferência da Planilha SIGEF / INCRA
          </DialogTitle>
        </DialogHeader>

        {/* Alerta de Edição Manual */}
        {isManualEdit && (
          <div className="flex items-center gap-2 text-xs font-bold p-3 rounded-xl border bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 my-1 animate-in fade-in duration-200">
            <AlertTriangle className="size-4 shrink-0 text-amber-500" />
            <span>EDITADO MANUALMENTE — A planilha será gerada com os dados personalizados da tabela abaixo.</span>
          </div>
        )}

        <p className="text-xs text-muted-foreground leading-snug">
          Pré-visualize a estrutura oficial do arquivo ODS antes da exportação. Se preferir, altere as células diretamente antes de baixar ativando o modo de edição.
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
                <th className="px-3 py-2 text-left font-black w-24">Código</th>
                <th className="px-3 py-2 text-left font-black w-36">Longitude (E)</th>
                <th className="px-3 py-2 text-left font-black w-36">Latitude (N)</th>
                <th className="px-3 py-2 text-right font-black w-24">Alt. (m)</th>
                <th className="px-3 py-2 text-center font-black w-24">Método</th>
                <th className="px-3 py-2 text-center font-black w-24">Limite</th>
                <th className="px-3 py-2 text-left font-black">Confrontante Oficial / Matrícula / CNS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {linhasLocal.map((l, i) => (
                <tr key={i} className={`hover:bg-emerald-500/5 transition-colors ${i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}>
                  {isEditing ? (
                    <>
                      {/* Código */}
                      <td className="p-1">
                        <input
                          value={l.codigo}
                          onChange={(e) => updateLinha(i, 'codigo', e.target.value)}
                          className="w-full bg-background border rounded px-1.5 py-0.5 text-xs font-mono font-bold text-foreground focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        />
                      </td>
                      {/* Longitude */}
                      <td className="p-1">
                        <input
                          value={l.longitude}
                          onChange={(e) => updateLinha(i, 'longitude', e.target.value)}
                          className="w-full bg-background border rounded px-1.5 py-0.5 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        />
                      </td>
                      {/* Latitude */}
                      <td className="p-1">
                        <input
                          value={l.latitude}
                          onChange={(e) => updateLinha(i, 'latitude', e.target.value)}
                          className="w-full bg-background border rounded px-1.5 py-0.5 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        />
                      </td>
                      {/* Altitude */}
                      <td className="p-1">
                        <input
                          value={l.altitude}
                          onChange={(e) => updateLinha(i, 'altitude', e.target.value)}
                          className="w-full bg-background border border-transparent focus:border-border rounded px-1.5 py-0.5 text-xs font-mono font-bold text-right text-foreground focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        />
                      </td>
                      {/* Método */}
                      <td className="p-1 text-center">
                        <select
                          value={l.metodo}
                          onChange={(e) => updateLinha(i, 'metodo', e.target.value)}
                          className="bg-background border rounded px-1.5 py-0.5 text-xs font-mono font-bold text-sky-600 dark:text-sky-400 focus:ring-1 focus:ring-emerald-500 focus:outline-none w-full"
                        >
                          {METODOS_POSICIONAMENTO.map(mp => (
                            <option key={mp} value={mp}>{mp}</option>
                          ))}
                        </select>
                      </td>
                      {/* Limite */}
                      <td className="p-1 text-center">
                        <select
                          value={l.tipoLimite}
                          onChange={(e) => updateLinha(i, 'tipoLimite', e.target.value)}
                          className="bg-background border rounded px-1.5 py-0.5 text-xs font-mono font-bold text-amber-600 dark:text-amber-400 focus:ring-1 focus:ring-emerald-500 focus:outline-none w-full"
                        >
                          {TIPOS_LIMITE.map(tl => (
                            <option key={tl} value={tl}>{tl}</option>
                          ))}
                        </select>
                      </td>
                      {/* Confrontante */}
                      <td className="p-1">
                        <div className="flex gap-2 w-full">
                          <input
                            value={l.confrontante}
                            onChange={(e) => updateLinha(i, 'confrontante', e.target.value)}
                            placeholder="Confrontante"
                            className="bg-background border rounded px-1.5 py-0.5 text-xs font-sans font-semibold text-foreground focus:ring-1 focus:ring-emerald-500 focus:outline-none flex-1 min-w-0"
                          />
                          <input
                            value={l.matricula}
                            onChange={(e) => updateLinha(i, 'matricula', e.target.value)}
                            placeholder="Matrícula"
                            className="bg-background border rounded px-1.5 py-0.5 text-xs font-sans font-semibold text-muted-foreground focus:ring-1 focus:ring-emerald-500 focus:outline-none w-20 shrink-0"
                          />
                          <input
                            value={l.cns}
                            onChange={(e) => updateLinha(i, 'cns', e.target.value)}
                            placeholder="CNS"
                            className="bg-background border rounded px-1.5 py-0.5 text-xs font-sans font-semibold text-muted-foreground focus:ring-1 focus:ring-emerald-500 focus:outline-none w-16 shrink-0"
                          />
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
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
                      <td className="px-3 py-2 truncate max-w-[240px] font-semibold" title={`${l.confrontante}${l.matricula ? ` · Matrícula ${l.matricula}` : ''}${l.cns ? ` · CNS ${l.cns}` : ''}`}>
                        {l.confrontante || <span className="text-muted-foreground italic">— Sem confrontante</span>}
                        {l.matricula ? <span className="text-xs text-zinc-500"> · Mat. {l.matricula}</span> : ''}
                        {l.cns ? <span className="text-xs text-zinc-400"> · CNS {l.cns}</span> : ''}
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {linhasLocal.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground font-semibold">Nenhum vértice cadastrado no perímetro atual. Importe os vértices para visualização.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-2 pt-3 border-t shrink-0">
          <span className="text-xs text-muted-foreground font-bold">{linhasLocal.length} vértice(s) prontos para exportação ODS</span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={isEditing ? "default" : "outline"}
              onClick={() => setIsEditing(!isEditing)}
              className={`h-9 px-4 text-xs font-bold gap-1 rounded-xl transition-all ${
                isEditing
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-0'
                  : 'hover:bg-muted'
              }`}
            >
              <Pencil className="size-3.5" />
              {isEditing ? 'Confirmar Edições' : 'Editar Células'}
            </Button>
            <Button
              size="sm"
              disabled={!linhasLocal.length}
              onClick={() => onBaixar(isManualEdit ? linhasLocal : undefined)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black h-9 shadow-md hover:shadow-lg px-5 gap-1.5 rounded-xl border-0"
            >
              <Download className="size-4" /> Baixar Planilha SIGEF (.ods)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
