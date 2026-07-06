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
      <DialogContent className="max-w-xl bg-background border border-border shadow-2xl p-6 rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-lg font-black text-foreground">
            <Percent className="size-5.5 text-emerald-500" /> Porcentagem entre dois polígonos
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
          Escolha duas parcelas/glebas para análise comparativa. O sistema calcula a área SGL de cada uma e estabelece as proporções.
        </p>

        <div className="grid grid-cols-2 gap-4 mt-2">
          <label className="flex flex-col gap-1.5 text-xs">
            <span className="font-bold uppercase tracking-wider text-muted-foreground">Polígono A</span>
            <select className="h-10 rounded-lg border bg-[#05140b] dark:bg-[#05140b] border-border/80 px-3 text-sm text-foreground focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" value={aId} onChange={(e) => setAId(e.target.value)}>
              {glebas.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs">
            <span className="font-bold uppercase tracking-wider text-muted-foreground">Polígono B</span>
            <select className="h-10 rounded-lg border bg-[#05140b] dark:bg-[#05140b] border-border/80 px-3 text-sm text-foreground focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" value={bId} onChange={(e) => setBId(e.target.value)}>
              {glebas.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-3 gap-3 rounded-xl border border-border/80 bg-muted/40 p-4 text-center mt-2">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Área A</div>
            <div className="text-sm md:text-base font-black text-foreground">{numBR(areaA, 4)} ha</div>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Área B</div>
            <div className="text-sm md:text-base font-black text-foreground">{numBR(areaB, 4)} ha</div>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Total (A+B)</div>
            <div className="text-sm md:text-base font-black text-emerald-500 dark:text-emerald-400">{numBR(total, 4)} ha</div>
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-border/80 p-4 text-sm bg-[#07170d]/20">
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted-foreground">A em relação a B:</span>
            <span className="font-black text-foreground text-base">{pct(areaB > 0 ? (areaA / areaB) * 100 : NaN)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted-foreground">B em relação a A:</span>
            <span className="font-black text-foreground text-base">{pct(areaA > 0 ? (areaB / areaA) * 100 : NaN)}</span>
          </div>
          <div className="h-px bg-border/60 my-2" />
          <div className="flex items-center justify-between">
            <span className="font-bold text-muted-foreground">A no total (A+B):</span>
            <span className="font-black text-emerald-500 dark:text-emerald-400 text-base">{pct(total > 0 ? (areaA / total) * 100 : NaN)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-bold text-muted-foreground">B no total (A+B):</span>
            <span className="font-black text-emerald-500 dark:text-emerald-400 text-base">{pct(total > 0 ? (areaB / total) * 100 : NaN)}</span>
          </div>
        </div>
        {aId === bId && (
          <p className="text-xs text-amber-500 dark:text-amber-400 font-bold bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 text-center animate-pulse">
            Aviso: Você escolheu o mesmo polígono nos dois lados. Selecione polígonos diferentes para comparar.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
