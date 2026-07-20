'use client';

import React from 'react';
import { Download, RefreshCw, Archive, Eye, LogIn } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface ItemPeca {
  id: string;
  rotulo: string;
  onVisualizar: () => void;
  onBaixar?: () => void;
}

interface PecasSheetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processando: boolean;
  baixarPacoteEntrega: () => void;
  itensPecas: ItemPeca[];
  medioOuMais: boolean;
}

export function PecasSheetModal({
  open,
  onOpenChange,
  processando,
  baixarPacoteEntrega,
  itensPecas,
  medioOuMais
}: PecasSheetModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Download className="size-5 text-emerald-600 dark:text-emerald-400" /> Baixar peças técnicas
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2 max-h-[75vh] overflow-y-auto pr-1">
          {/* Botão Baixar Tudo no topo do Mobile Sheet */}
          <button
            type="button"
            disabled={processando}
            onClick={() => baixarPacoteEntrega()}
            className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3.5 py-3 text-center text-sm font-bold text-amber-700 hover:bg-amber-500/20 dark:text-amber-400 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processando ? (
              <>
                <RefreshCw className="size-4 shrink-0 animate-spin text-amber-600 dark:text-amber-400" />
                <span>Baixando...</span>
              </>
            ) : (
              <>
                <Archive className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>Baixar Tudo (Pacote ZIP)</span>
              </>
            )}
          </button>
          <div className="my-1 border-b border-border/60" />

          {/* Lista de Peças */}
          {itensPecas.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                onOpenChange(false);
                if (item.onBaixar) item.onBaixar();
                else item.onVisualizar();
              }}
              className="flex items-center justify-between gap-2 rounded-lg border bg-background/60 p-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer group"
            >
              <span className="text-xs font-semibold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 truncate pl-1" title={item.rotulo}>
                {item.rotulo}
              </span>
              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 px-2.5 text-xs text-muted-foreground hover:text-foreground active:scale-[0.97]"
                  title="Visualizar ou editar no navegador"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenChange(false);
                    item.onVisualizar();
                  }}
                >
                  <Eye className="size-3.5" /> Ver
                </Button>
                {item.onBaixar && (
                  <Button
                    size="sm"
                    className="h-8 gap-1 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-700 dark:hover:bg-emerald-800 active:scale-[0.97]"
                    title="Baixar arquivo"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenChange(false);
                      item.onBaixar?.();
                    }}
                  >
                    <Download className="size-3.5" /> Baixar
                  </Button>
                )}
              </div>
            </div>
          ))}
          {medioOuMais && (
            <a
              href="https://sso.acesso.gov.br/login?client_id=sigef.incra.gov.br&authorization_id=19f151443c3"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onOpenChange(false)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-600/40 bg-emerald-600/10 px-3 py-3 text-center text-sm font-semibold text-emerald-700 hover:bg-emerald-600/20 dark:text-emerald-400"
            >
              <LogIn className="size-4 shrink-0" /> Acessar o SIGEF (certificar)
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
