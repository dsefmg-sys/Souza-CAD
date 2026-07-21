'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Waypoints, CheckSquare, Square, Download } from 'lucide-react';
import type { Gleba } from '@/lib/topo/types';
import { calcular } from '@/lib/topo/calcular';
import { numBR } from '@/lib/topo/geometry';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  glebas: Gleba[];
  glebaAtivaId?: string;
  titulo?: string;
  descricao?: string;
  onConfirmar: (glebasSelecionadas: Gleba[]) => void;
}

export default function ModalSeletorGlebasPecas({
  open,
  onOpenChange,
  glebas,
  glebaAtivaId,
  titulo = 'Selecione as Glebas para a Peça Técnica',
  descricao = 'Escolha para quais parcelas/glebas deseja gerar os documentos e relatórios técnicos:',
  onConfirmar,
}: Props) {
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      // Por padrão, se houver glebas, seleciona todas por padrão
      const ids = new Set(glebas.map((g) => g.id));
      setSelecionadas(ids);
    }
  }, [open, glebas]);

  const todasSelecionadas = glebas.length > 0 && selecionadas.size === glebas.length;

  function toggleTodas() {
    if (todasSelecionadas) {
      // Se tiver mais de uma gleba, mantém pelo menos a ativa
      const ativaId = glebaAtivaId || glebas[0]?.id;
      setSelecionadas(new Set(ativaId ? [ativaId] : []));
    } else {
      setSelecionadas(new Set(glebas.map((g) => g.id)));
    }
  }

  function toggleGleba(id: string) {
    const next = new Set(selecionadas);
    if (next.has(id)) {
      if (next.size > 1) next.delete(id); // evita deixar 0 selecionadas
    } else {
      next.add(id);
    }
    setSelecionadas(next);
  }

  function handleConfirmar() {
    const lista = glebas.filter((g) => selecionadas.has(g.id));
    onConfirmar(lista.length > 0 ? lista : glebas);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-background/98 backdrop-blur-xl shadow-2xl space-y-4">
        <DialogHeader className="border-b pb-3 space-y-1 text-left">
          <DialogTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
            <Waypoints className="size-5 text-indigo-600 dark:text-indigo-400" />
            {titulo}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">{descricao}</p>
        </DialogHeader>

        {/* Botão Selecionar Todas */}
        <div className="flex items-center justify-between px-1 py-0.5">
          <button
            type="button"
            onClick={toggleTodas}
            className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer select-none"
          >
            {todasSelecionadas ? <CheckSquare className="size-4" /> : <Square className="size-4" />}
            {todasSelecionadas ? 'Desmarcar Todas (Manter Ativa)' : 'Selecionar TODAS as Glebas'}
          </button>
          <span className="text-[11px] font-medium text-muted-foreground">
            {selecionadas.size} de {glebas.length} selecionada(s)
          </span>
        </div>

        {/* Lista de Glebas com Checkbox */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {glebas.map((g, idx) => {
            const checked = selecionadas.has(g.id);
            const isAtiva = g.id === glebaAtivaId;
            const isAuxiliar = g.tipoGleba === 'auxiliar';
            const isOculta = g.visivel === false;
            const areaHa = g.vertices?.length >= 3 ? calcular(g.vertices, {}).areaHa : 0;

            return (
              <label
                key={g.id}
                onClick={() => toggleGleba(g.id)}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${
                  checked
                    ? 'border-indigo-500/60 bg-indigo-500/10 ring-1 ring-indigo-500/20'
                    : 'border-border/60 bg-card hover:bg-muted/40 opacity-70'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleGleba(g.id)}
                    className="size-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-foreground truncate">{g.denominacao || `Parcela ${idx + 1}`}</span>
                      <span className={`text-[8px] font-black uppercase px-1.5 py-0.2 rounded-full border ${
                        isAtiva
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : isOculta
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700'
                          : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                      }`}>
                        {isAtiva ? 'ATIVA' : isOculta ? 'OCULTA' : 'AUXILIAR'}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono font-medium text-muted-foreground">
                      {g.vertices?.length ?? 0} vértices {areaHa > 0 ? `· ${numBR(areaHa, 4)} ha` : ''}
                    </p>
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        {/* Rodapé com Ações */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirmar}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 cursor-pointer"
          >
            <Download className="size-3.5" /> Gerar para {selecionadas.size} Gleba(s)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
