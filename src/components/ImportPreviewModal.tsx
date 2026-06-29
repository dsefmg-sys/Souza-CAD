'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, ClipboardList, Eye, Shapes, Satellite, AlertTriangle } from 'lucide-react';
import { utmParaGeo } from '@/lib/topo/coords';

const PreviaSatelite = dynamic(() => import('./PreviaSatelite'), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Carregando satélite…</div>,
});

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  perim: { leste: number; norte: number; nome: string }[];
  zona: number;
  hemisferio: 'N' | 'S';
  fusosPermitidos?: number[];
  onConfirm: (gerarPoligono: boolean, zona: number) => void;
}

export default function ImportPreviewModal({ open, onOpenChange, perim, zona, hemisferio, fusosPermitidos, onConfirm }: Props) {
  const [zonaSel, setZonaSel] = useState(zona);
  useEffect(() => { if (open) setZonaSel(zona); }, [open, zona]);

  if (!perim || perim.length === 0) return null;

  // --- visão "forma" (SVG) em UTM, independe do fuso ---
  const xs = perim.map((p) => p.leste);
  const ys = perim.map((p) => p.norte);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = maxX - minX || 1, h = maxY - minY || 1;
  const esc = Math.min(160 / w, 160 / h);
  const dx = (200 - w * esc) / 2, dy = (200 - h * esc) / 2;
  const pts = perim.map((p) => `${(dx + (p.leste - minX) * esc).toFixed(1)},${(200 - dy - (p.norte - minY) * esc).toFixed(1)}`).join(' ');

  // --- visão "satélite": converte UTM -> lat/lon com o fuso ESCOLHIDO ---
  const anel = perim.map((p) => { const g = utmParaGeo(p.leste, p.norte, zonaSel, hemisferio); return [g.lat, g.lon] as [number, number]; });
  const foraDaFaixa = anel.some(([la, lo]) => !Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180 || la > 6 || la < -34 || lo > -28 || lo < -74);
  const fusos = (fusosPermitidos && fusosPermitidos.length ? fusosPermitidos : [22, 23, 24, 25]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] w-[90vw] max-w-[90vw] flex-col p-5">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Eye className="size-5 text-primary" /> Prévia do Perímetro Importado
          </DialogTitle>
          <p className="text-xs text-muted-foreground">Confira a geometria e, no satélite, se o imóvel caiu no lugar certo. Se o fuso estiver errado, troque-o abaixo.</p>
        </DialogHeader>

        {/* controle de fuso */}
        <div className="flex flex-wrap items-center gap-3 py-2 text-sm">
          <span className="font-semibold">Fuso UTM:</span>
          <div className="flex gap-1">
            {fusos.map((f) => (
              <Button key={f} size="sm" variant={f === zonaSel ? 'default' : 'outline'} className="h-8 px-3 font-bold" onClick={() => setZonaSel(f)}>{f}{hemisferio}</Button>
            ))}
          </div>
          {foraDaFaixa
            ? <span className="flex items-center gap-1 text-xs font-semibold text-amber-500"><AlertTriangle className="size-4" /> O imóvel caiu fora da região — provavelmente o fuso está errado.</span>
            : <span className="text-xs text-muted-foreground">Veja no satélite se bate com o local real.</span>}
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
          {/* coluna 1: forma + lista */}
          <div className="flex min-h-0 flex-col gap-3">
            <div className="flex flex-col items-center rounded-lg border bg-muted/20 p-3">
              <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground"><Shapes className="size-3.5" /> Forma Geométrica</span>
              <svg className="aspect-square w-full max-w-[220px] rounded border bg-background shadow-inner" viewBox="0 0 200 200">
                <polygon points={pts} fill="rgba(59,130,246,0.12)" stroke="rgb(59,130,246)" strokeWidth={1.6} />
                {perim.map((p, i) => <circle key={i} cx={dx + (p.leste - minX) * esc} cy={200 - dy - (p.norte - minY) * esc} r={2.2} fill="#fff" stroke="#000" strokeWidth={0.7} />)}
              </svg>
              <span className="mt-1 text-[10px] font-medium text-muted-foreground">{perim.length} pontos detectados</span>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-background">
              <div className="flex items-center gap-1.5 border-b bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground"><ClipboardList className="size-3.5" /> Pontos detectados</div>
              <div className="min-h-0 flex-1 divide-y overflow-y-auto text-xs">
                {perim.slice(0, 200).map((p, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-1 hover:bg-muted/30">
                    <span className="font-bold text-muted-foreground">{p.nome || `Ponto ${i + 1}`}</span>
                    <span className="font-mono text-[10px] text-foreground/80">E {p.leste.toFixed(2)} · N {p.norte.toFixed(2)}</span>
                  </div>
                ))}
                {perim.length > 200 && <div className="px-3 py-2 text-center text-[10px] font-semibold text-muted-foreground">… e mais {perim.length - 200} pontos</div>}
              </div>
            </div>
          </div>

          {/* colunas 2-3: satélite */}
          <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border lg:col-span-2">
            <div className="flex items-center gap-1.5 border-b bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground"><Satellite className="size-3.5" /> Localização no satélite (fuso {zonaSel}{hemisferio})</div>
            <div className="min-h-0 flex-1">
              <PreviaSatelite anel={anel} />
            </div>
          </div>
        </div>

        <footer className="flex flex-col items-center justify-between gap-3 border-t pt-3 sm:flex-row">
          <span className="text-[10px] text-muted-foreground">ESC para cancelar</span>
          <div className="flex w-full items-stretch gap-2 sm:w-auto sm:items-center">
            <Button type="button" variant="outline" className="font-semibold" onClick={() => { onConfirm(false, zonaSel); onOpenChange(false); }}>
              Importar só vértices (manual)
            </Button>
            <Button type="button" className="gap-1.5 bg-emerald-600 font-bold text-white hover:bg-emerald-700" onClick={() => { onConfirm(true, zonaSel); onOpenChange(false); }}>
              <Check className="size-4" /> Gerar perímetro automático
            </Button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
