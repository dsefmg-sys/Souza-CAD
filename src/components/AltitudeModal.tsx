'use client';

import React, { useState } from 'react';
import { Mountain, ArrowUp, ArrowDown, Check, X, RefreshCw, Layers } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface VerticeAltitude {
  id: string;
  nome: string;
  tipo?: string;
  leste: number;
  norte: number;
  altitude?: number;
  elevacao?: number;
}

interface AltitudeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vertices: VerticeAltitude[];
  onAtualizarVertice: (id: string, novaAlt: number) => void;
  onAplicarAjusteGlobal: (cm: number) => void;
  onBuscarAltitudesOnline?: () => void;
  processando?: boolean;
}

export default function AltitudeModal({
  open,
  onOpenChange,
  vertices,
  onAtualizarVertice,
  onAplicarAjusteGlobal,
  onBuscarAltitudesOnline,
  processando = false,
}: AltitudeModalProps) {
  const [ajusteCm, setAjusteCm] = useState<string>('');

  const handleAjusteGlobal = () => {
    const val = parseFloat(ajusteCm);
    if (isNaN(val) || val === 0) return;
    onAplicarAjusteGlobal(val);
    setAjusteCm('');
  };

  const totalComAlt = vertices.filter((v) => Number.isFinite(v.altitude ?? v.elevacao)).length;
  const minAlt = Math.min(...vertices.map((v) => (v.altitude ?? v.elevacao ?? Infinity)).filter(Number.isFinite));
  const maxAlt = Math.max(...vertices.map((v) => (v.altitude ?? v.elevacao ?? -Infinity)).filter(Number.isFinite));
  const amplitude = Number.isFinite(minAlt) && Number.isFinite(maxAlt) ? (maxAlt - minAlt) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 rounded-2xl bg-background border border-border shadow-2xl overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/60">
          <DialogTitle className="text-base font-extrabold uppercase tracking-wide flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Mountain className="size-5 text-indigo-500" />
            Gestão de Altitudes dos Vértices
          </DialogTitle>
        </DialogHeader>

        {/* Resumo & estatísticas */}
        <div className="grid grid-cols-3 gap-2 my-2 p-3 rounded-xl bg-muted/30 border border-border/40 text-xs">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Com Altitude</span>
            <span className="font-mono font-extrabold text-foreground text-sm">
              {totalComAlt} / {vertices.length} <span className="text-[10px] font-normal text-muted-foreground">vértices</span>
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Altitude Mín / Máx</span>
            <span className="font-mono font-extrabold text-foreground text-xs">
              {Number.isFinite(minAlt) ? `${minAlt.toFixed(2)}m` : '—'} / {Number.isFinite(maxAlt) ? `${maxAlt.toFixed(2)}m` : '—'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Desnível Total</span>
            <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">
              {amplitude > 0 ? `${amplitude.toFixed(2)} m` : 'Plano (0m)'}
            </span>
          </div>
        </div>

        {/* Painel de Ajuste Global */}
        <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between gap-3 my-1">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">Ajuste Global de Relevo</span>
            <span className="text-[10px] text-muted-foreground">Soma ou subtrai valor em cm da altitude de TODOS os vértices</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="relative flex items-center">
              <Input
                type="number"
                step="1"
                value={ajusteCm}
                onChange={(e) => setAjusteCm(e.target.value)}
                placeholder="Ex: +50 ou -15"
                className="w-28 h-8 text-xs font-bold font-mono pr-7"
              />
              <span className="absolute right-2 text-[10px] font-bold text-muted-foreground">cm</span>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleAjusteGlobal}
              disabled={!ajusteCm || parseFloat(ajusteCm) === 0}
              className="h-8 px-3 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Aplicar
            </Button>
          </div>
        </div>

        {/* Botão de buscar altitudes online se houver vértices sem cota */}
        {onBuscarAltitudesOnline && totalComAlt < vertices.length && (
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs my-1">
            <span className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
              Existem <strong>{vertices.length - totalComAlt}</strong> vértices sem altitude. Deseja buscar do Satélite?
            </span>
            <Button
              type="button"
              size="sm"
              onClick={onBuscarAltitudesOnline}
              disabled={processando}
              className="h-7 text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white gap-1"
            >
              <RefreshCw className={`size-3 ${processando ? 'animate-spin' : ''}`} /> Buscar do Satélite (DEM)
            </Button>
          </div>
        )}

        {/* Tabela de Vértices */}
        <div className="flex-1 overflow-y-auto border rounded-xl my-2 scroll-fino">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-muted/50 sticky top-0 border-b text-[10px] uppercase font-bold text-muted-foreground select-none">
              <tr>
                <th className="p-2">Vértice</th>
                <th className="p-2">Tipo</th>
                <th className="p-2 font-mono">UTM Leste (m)</th>
                <th className="p-2 font-mono">UTM Norte (m)</th>
                <th className="p-2 font-mono text-right">Altitude (m)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {vertices.map((v) => {
                const alt = v.altitude ?? v.elevacao;
                return (
                  <tr key={v.id} className="hover:bg-muted/20">
                    <td className="p-2 font-bold text-foreground">{v.nome}</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono font-bold">{v.tipo || 'V'}</span></td>
                    <td className="p-2 font-mono text-muted-foreground">{v.leste.toFixed(2)}</td>
                    <td className="p-2 font-mono text-muted-foreground">{v.norte.toFixed(2)}</td>
                    <td className="p-2 font-mono text-right">
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={alt !== undefined ? alt.toFixed(2) : ''}
                        onBlur={(e) => {
                          const num = parseFloat(e.target.value);
                          if (!isNaN(num)) onAtualizarVertice(v.id, num);
                        }}
                        className="w-24 h-7 text-right px-1.5 rounded border bg-background font-bold text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                        placeholder="Sem cota"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Rodapé */}
        <div className="flex justify-end pt-2 border-t border-border/60">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} className="h-8 px-4 text-xs font-bold">
            Concluído
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
