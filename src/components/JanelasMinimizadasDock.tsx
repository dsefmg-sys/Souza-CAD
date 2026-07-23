'use client';

import { X, Maximize2 } from 'lucide-react';

export interface JanelaMinimizada {
  id: string;
  titulo: string;
  subtitulo?: string;
  icone?: React.ReactNode;
}

interface JanelasMinimizadasDockProps {
  janelas: JanelaMinimizada[];
  onRestaurar: (id: string) => void;
  onFechar: (id: string) => void;
}

export default function JanelasMinimizadasDock({
  janelas,
  onRestaurar,
  onFechar,
}: JanelasMinimizadasDockProps) {
  if (!janelas || janelas.length === 0) return null;

  return (
    <div className="no-print fixed bottom-3 left-1/2 -translate-x-1/2 z-[4900] flex max-w-[92vw] items-center gap-1.5 overflow-x-auto rounded-2xl border border-amber-500/40 bg-zinc-900/90 dark:bg-zinc-950/95 p-1.5 shadow-2xl backdrop-blur-md transition-all animate-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center gap-1 px-2 border-r border-zinc-700/60 shrink-0 text-[10px] font-black text-amber-400 uppercase tracking-wider select-none">
        <span className="relative flex size-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex size-2 rounded-full bg-amber-500"></span>
        </span>
        <span className="hidden sm:inline">Tarefas Ativas ({janelas.length})</span>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {janelas.map((j) => (
          <div
            key={j.id}
            onClick={() => onRestaurar(j.id)}
            className="group flex items-center gap-1.5 rounded-xl border border-zinc-700/70 bg-zinc-800/90 hover:bg-amber-500/20 hover:border-amber-500/50 px-2.5 py-1 text-xs font-bold text-zinc-100 hover:text-amber-300 transition-all cursor-pointer shadow-xs select-none shrink-0"
            title={`Clique para restaurar ${j.titulo}`}
          >
            {j.icone && <span className="shrink-0">{j.icone}</span>}
            <span className="max-w-[140px] truncate text-[11px] font-black uppercase tracking-tight">
              {j.titulo}
            </span>
            <Maximize2 className="size-3 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFechar(j.id);
              }}
              className="ml-0.5 p-0.5 rounded-md text-zinc-400 hover:text-red-400 hover:bg-zinc-700/50 transition-colors"
              title="Descartar lembrete"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
