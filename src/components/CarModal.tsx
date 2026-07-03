'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Leaf } from 'lucide-react';
import { type Bioma, resumirCar, appMargemRio, appLago, APP_NASCENTE_M } from '@/lib/car/car';

// Primeira tela do CAR (Cadastro Ambiental Rural): usa o motor de cálculo puro (lib/car/car.ts)
// para mostrar reserva legal exigida, módulos fiscais e as faixas de APP do Código Florestal.
// O modo CAR completo (desenhar camadas ambientais e exportar pro SICAR) vem nas próximas etapas.

const BIOMAS: { v: Bioma; rot: string }[] = [
  { v: 'demais', rot: 'Demais regiões do país (20%)' },
  { v: 'amazonia-floresta', rot: 'Amazônia Legal — floresta (80%)' },
  { v: 'amazonia-cerrado', rot: 'Amazônia Legal — cerrado (35%)' },
  { v: 'amazonia-campos', rot: 'Amazônia Legal — campos gerais (20%)' },
];

const num = (n: number, d = 2) => n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

export default function CarModal({ open, onOpenChange, areaHa }: { open: boolean; onOpenChange: (o: boolean) => void; areaHa: number }) {
  const [bioma, setBioma] = useState<Bioma>('demais');
  const [moduloFiscal, setModuloFiscal] = useState('');
  const [reservaHa, setReservaHa] = useState('');

  const mf = parseFloat(moduloFiscal.replace(',', '.'));
  const r = resumirCar({
    areaImovelHa: areaHa,
    bioma,
    moduloFiscalHa: Number.isFinite(mf) ? mf : 0,
    reservaLegalHa: parseFloat(reservaHa.replace(',', '.')) || 0,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Leaf className="size-5 text-green-600" /> CAR — Cadastro Ambiental Rural</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Cálculos do Código Florestal a partir da área do imóvel. O desenho das camadas ambientais e a exportação para o SICAR entram nas próximas etapas.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Área do imóvel (ha)</label>
            <div className="rounded border bg-muted/40 px-3 py-2 text-sm font-bold">{num(areaHa, 4)} ha</div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Bioma / localização (define o % de reserva legal)</label>
            <select className="w-full rounded border bg-background px-3 py-2 text-sm" value={bioma} onChange={(e) => setBioma(e.target.value as Bioma)}>
              {BIOMAS.map((b) => <option key={b.v} value={b.v}>{b.rot}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Módulo fiscal do município (ha) — tabela do INCRA</label>
            <input className="w-full rounded border bg-background px-3 py-2 text-sm" placeholder="ex.: 20" value={moduloFiscal} onChange={(e) => setModuloFiscal(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Reserva legal já averbada (ha) — opcional</label>
            <input className="w-full rounded border bg-background px-3 py-2 text-sm" placeholder="ex.: 4" value={reservaHa} onChange={(e) => setReservaHa(e.target.value)} />
          </div>
        </div>

        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-lg border p-3 text-center">
            <div className="text-[10px] uppercase text-muted-foreground">Reserva legal exigida</div>
            <div className="text-lg font-bold text-green-700 dark:text-green-400">{num(r.reservaLegal.exigidaHa)} ha</div>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <div className="text-[10px] uppercase text-muted-foreground">Módulos fiscais</div>
            <div className="text-lg font-bold">{Number.isFinite(mf) && mf > 0 ? num(r.numModulos) : '—'}</div>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <div className="text-[10px] uppercase text-muted-foreground">Classe do imóvel</div>
            <div className="text-lg font-bold capitalize">{Number.isFinite(mf) && mf > 0 ? r.classe : '—'}</div>
          </div>
        </div>

        {reservaHa.trim() && (
          <div className={`rounded-lg border p-3 text-sm ${r.reservaLegal.atende ? 'border-green-600/40 bg-green-500/10 text-green-700 dark:text-green-400' : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400'}`}>
            {r.reservaLegal.atende
              ? 'A reserva legal informada ATENDE o mínimo exigido.'
              : `Falta ${num(r.reservaLegal.faltaHa)} ha de reserva legal para atingir o mínimo.`}
          </div>
        )}

        <div className="mt-2 rounded-lg border p-3">
          <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Faixas de APP (Código Florestal)</div>
          <ul className="space-y-0.5 text-xs">
            <li>Rio &lt; 10 m de largura: <strong>{appMargemRio(5)} m</strong> · 10 a 50 m: <strong>{appMargemRio(50)} m</strong> · 50 a 200 m: <strong>{appMargemRio(200)} m</strong> · 200 a 600 m: <strong>{appMargemRio(600)} m</strong> · acima de 600 m: <strong>{appMargemRio(700)} m</strong></li>
            <li>Nascente / olho d&apos;água: raio de <strong>{APP_NASCENTE_M} m</strong></li>
            <li>Lago rural até 20 ha: <strong>{appLago(10)} m</strong> · acima de 20 ha: <strong>{appLago(30)} m</strong></li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
