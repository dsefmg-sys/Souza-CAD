'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Percent } from 'lucide-react';
import { calcular } from '@/lib/topo/calcular';
import { numBR } from '@/lib/topo/geometry';
import type { Vertex } from '@/lib/topo/types';

interface GlebaOpc { id: string; nome: string; vertices: Vertex[] }

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  glebas: GlebaOpc[];
}

function areaHaDe(vs: Vertex[]): number {
  if (vs.length < 3) return 0;
  try { return calcular(vs).areaHa; } catch { return 0; }
}

function pct(n: number): string {
  return Number.isFinite(n) ? `${numBR(n, 2)} %` : '—';
}

export default function PorcentagemModal({ open, onOpenChange, glebas }: Props) {
  const [aId, setAId] = useState('');
  const [bId, setBId] = useState('');

  useEffect(() => {
    if (!open) return;
    setAId(glebas[0]?.id ?? '');
    setBId(glebas[1]?.id ?? glebas[0]?.id ?? '');
  }, [open, glebas]);

  const a = glebas.find((g) => g.id === aId);
  const b = glebas.find((g) => g.id === bId);
  const areaA = a ? areaHaDe(a.vertices) : 0;
  const areaB = b ? areaHaDe(b.vertices) : 0;
  const total = areaA + areaB;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Percent className="size-5 text-primary" /> Porcentagem entre dois polígonos</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">Escolha duas parcelas/glebas. O sistema usa a área SGL de cada uma e calcula as porcentagens.</p>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-0.5 text-xs">
            <span className="font-semibold text-muted-foreground">Polígono A</span>
            <select className="h-8 rounded border bg-background px-2 text-sm" value={aId} onChange={(e) => setAId(e.target.value)}>
              {glebas.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-0.5 text-xs">
            <span className="font-semibold text-muted-foreground">Polígono B</span>
            <select className="h-8 rounded border bg-background px-2 text-sm" value={bId} onChange={(e) => setBId(e.target.value)}>
              {glebas.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/20 p-3 text-center">
          <div><div className="text-[10px] uppercase text-muted-foreground">Área A</div><div className="text-sm font-bold">{numBR(areaA, 4)} ha</div></div>
          <div><div className="text-[10px] uppercase text-muted-foreground">Área B</div><div className="text-sm font-bold">{numBR(areaB, 4)} ha</div></div>
          <div><div className="text-[10px] uppercase text-muted-foreground">Total (A+B)</div><div className="text-sm font-bold">{numBR(total, 4)} ha</div></div>
        </div>

        <div className="space-y-1.5 rounded-lg border p-3 text-sm">
          <div className="flex items-center justify-between"><span>A em relação a B</span><span className="font-bold">{pct(areaB > 0 ? (areaA / areaB) * 100 : NaN)}</span></div>
          <div className="flex items-center justify-between"><span>B em relação a A</span><span className="font-bold">{pct(areaA > 0 ? (areaB / areaA) * 100 : NaN)}</span></div>
          <div className="my-1 h-px bg-border" />
          <div className="flex items-center justify-between"><span>A no total (A+B)</span><span className="font-bold text-primary">{pct(total > 0 ? (areaA / total) * 100 : NaN)}</span></div>
          <div className="flex items-center justify-between"><span>B no total (A+B)</span><span className="font-bold text-primary">{pct(total > 0 ? (areaB / total) * 100 : NaN)}</span></div>
        </div>
        {aId === bId && <p className="text-[11px] text-amber-600">Você escolheu o mesmo polígono nos dois lados — escolha dois diferentes para comparar.</p>}
      </DialogContent>
    </Dialog>
  );
}
