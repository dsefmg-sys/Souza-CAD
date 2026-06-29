'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, ClipboardList, Eye } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  perim: { leste: number; norte: number; nome: string }[];
  onConfirm: (gerarPoligono: boolean) => void;
}

export default function ImportPreviewModal({ open, onOpenChange, perim, onConfirm }: Props) {
  if (!perim || perim.length === 0) return null;

  // Calcula escala e centralização do polígono para desenhar prévia no SVG (viewBox 0 0 200 200)
  const xs = perim.map((p) => p.leste);
  const ys = perim.map((p) => p.norte);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  const esc = Math.min(160 / w, 160 / h);

  const dx = (200 - w * esc) / 2;
  const dy = (200 - h * esc) / 2;

  const pts = perim
    .map((p) => {
      const px = dx + (p.leste - minX) * esc;
      const py = 200 - dy - (p.norte - minY) * esc;
      return `${px.toFixed(1)},${py.toFixed(1)}`;
    })
    .join(' ');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col bg-background/95 backdrop-blur-md border border-border shadow-2xl p-6 rounded-lg text-foreground">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Eye className="size-5 text-primary animate-pulse" /> Prévia do Perímetro Importado
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Visualize a geometria calculada a partir dos pontos do arquivo. Decida se deseja gerar o polígono automaticamente ou importar apenas os vértices como referências para desenhar manualmente.
          </p>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-6 py-4 overflow-y-auto">
          {/* Visualizador de Shape SVG */}
          <div className="md:col-span-2 flex flex-col items-center justify-center p-3 border rounded-lg bg-muted/20">
            <span className="text-xs font-semibold text-muted-foreground mb-2">Forma Geométrica</span>
            <svg className="w-full aspect-square max-w-[220px] border rounded bg-background shadow-inner" viewBox="0 0 200 200">
              <polygon points={pts} fill="rgba(59, 130, 246, 0.12)" stroke="rgb(59, 130, 246)" strokeWidth={1.6} />
              {perim.map((p, i) => {
                const px = dx + (p.leste - minX) * esc;
                const py = 200 - dy - (p.norte - minY) * esc;
                return (
                  <g key={i}>
                    <circle cx={px} cy={py} r={2.5} fill="#ffffff" stroke="#000000" strokeWidth={0.8} />
                  </g>
                );
              })}
            </svg>
            <span className="text-[10px] text-muted-foreground mt-2 font-medium">
              {perim.length} pontos detectados no arquivo
            </span>
          </div>

          {/* Listagem de pontos */}
          <div className="md:col-span-3 flex flex-col border rounded-lg overflow-hidden bg-background">
            <div className="bg-muted px-3 py-2 text-xs font-semibold border-b flex items-center gap-1.5 text-muted-foreground">
              <ClipboardList className="size-3.5" /> Lista de Pontos Detectados
            </div>
            <div className="flex-1 overflow-y-auto text-xs divide-y max-h-[220px]">
              {perim.slice(0, 100).map((p, i) => (
                <div key={i} className="flex justify-between items-center px-3 py-1.5 hover:bg-muted/30">
                  <span className="font-bold text-muted-foreground">{p.nome || `Ponto ${i + 1}`}</span>
                  <span className="font-mono text-[10px] text-foreground/80">E: {p.leste.toFixed(3)} · N: {p.norte.toFixed(3)}</span>
                </div>
              ))}
              {perim.length > 100 && (
                <div className="px-3 py-2 text-center text-[10px] text-muted-foreground font-semibold bg-muted/10">
                  ... e mais {perim.length - 100} pontos
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="border-t pt-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <span className="text-[10px] text-muted-foreground">Pressione <kbd className="font-bold">ESC</kbd> para cancelar</span>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onConfirm(false);
                onOpenChange(false);
              }}
              className="font-semibold"
            >
              Importar apenas Vértices (Manual)
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={() => {
                onConfirm(true);
                onOpenChange(false);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
            >
              <Check className="size-4" /> Gerar Perímetro Automático
            </Button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
