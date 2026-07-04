'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Leaf, Download, Upload } from 'lucide-react';
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

interface AreasCamadas { app: number; reservaLegal: number; vegetacao: number; usoConsolidado: number }

export default function CarModal({ open, onOpenChange, areaHa, areasCamadas, onExportarShapefiles, onImportarShapefile, processando }: { open: boolean; onOpenChange: (o: boolean) => void; areaHa: number; areasCamadas?: AreasCamadas; onExportarShapefiles?: () => void; onImportarShapefile?: () => void; processando?: boolean }) {
  const [bioma, setBioma] = useState<Bioma>('demais');
  const [moduloFiscal, setModuloFiscal] = useState('');
  const [reservaHa, setReservaHa] = useState('');
  const [appHa, setAppHa] = useState('');
  const [vegHa, setVegHa] = useState('');
  const [usoHa, setUsoHa] = useState('');

  // ao abrir, se houver camadas CAR desenhadas no mapa, já preenche as áreas com o que foi medido
  const temCamadas = !!areasCamadas && (areasCamadas.app + areasCamadas.reservaLegal + areasCamadas.vegetacao + areasCamadas.usoConsolidado) > 0;
  useEffect(() => {
    if (!open || !areasCamadas) return;
    const f = (n: number) => (n > 0 ? n.toFixed(2) : '');
    if (areasCamadas.reservaLegal > 0) setReservaHa(f(areasCamadas.reservaLegal));
    if (areasCamadas.app > 0) setAppHa(f(areasCamadas.app));
    if (areasCamadas.vegetacao > 0) setVegHa(f(areasCamadas.vegetacao));
    if (areasCamadas.usoConsolidado > 0) setUsoHa(f(areasCamadas.usoConsolidado));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const numIn = (s: string) => parseFloat((s || '').replace(',', '.')) || 0;
  const mf = parseFloat(moduloFiscal.replace(',', '.'));
  const r = resumirCar({
    areaImovelHa: areaHa,
    bioma,
    moduloFiscalHa: Number.isFinite(mf) ? mf : 0,
    reservaLegalHa: numIn(reservaHa),
    appTotalHa: numIn(appHa),
    vegetacaoNativaHa: numIn(vegHa),
    usoConsolidadoHa: numIn(usoHa),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-5xl flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Leaf className="size-5 text-green-600" /> CAR — Cadastro Ambiental Rural</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Cálculos do Código Florestal a partir da área do imóvel. A exportação para o SICAR entra na próxima etapa.
        </p>

        {/* Layout horizontal: campos à esquerda, resultados e referências à direita (aproveita a largura). */}
        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto md:grid-cols-2">
          {/* COLUNA ESQUERDA — campos */}
          <div className="space-y-3">
            {temCamadas && (
              <p className="rounded border border-green-600/30 bg-green-500/10 px-2 py-1 text-[11px] leading-tight text-green-700 dark:text-green-400">
                As áreas abaixo já vieram dos polígonos que você marcou como camada CAR no mapa (medidas automaticamente). Você pode ajustar.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Área do imóvel (ha)</label>
                <div className="rounded border bg-muted/40 px-3 py-2 text-sm font-bold">{num(areaHa, 4)} ha</div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Bioma / localização</label>
                <select className="w-full rounded border bg-background px-2 py-2 text-sm" value={bioma} onChange={(e) => setBioma(e.target.value as Bioma)}>
                  {BIOMAS.map((b) => <option key={b.v} value={b.v}>{b.rot}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Módulo fiscal (ha) — INCRA</label>
                <input className="w-full rounded border bg-background px-3 py-2 text-sm" placeholder="ex.: 20" value={moduloFiscal} onChange={(e) => setModuloFiscal(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Reserva legal averbada (ha) — opc.</label>
                <input className="w-full rounded border bg-background px-3 py-2 text-sm" placeholder="ex.: 4" value={reservaHa} onChange={(e) => setReservaHa(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">APP total (ha) — opc.</label>
                <input className="w-full rounded border bg-background px-3 py-2 text-sm" placeholder="ex.: 1,5" value={appHa} onChange={(e) => setAppHa(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Vegetação nativa (ha) — opc.</label>
                <input className="w-full rounded border bg-background px-3 py-2 text-sm" placeholder="ex.: 6" value={vegHa} onChange={(e) => setVegHa(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Uso consolidado (ha) — opc.</label>
                <input className="w-full rounded border bg-background px-3 py-2 text-sm" placeholder="ex.: 40" value={usoHa} onChange={(e) => setUsoHa(e.target.value)} />
              </div>
            </div>

            {(appHa.trim() || vegHa.trim() || usoHa.trim()) && (
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded border p-2"><div className="text-[10px] uppercase text-muted-foreground">APP</div><div className="font-bold">{num(r.appTotalHa)} ha</div></div>
                <div className="rounded border p-2"><div className="text-[10px] uppercase text-muted-foreground">Veg. nativa</div><div className="font-bold">{num(r.vegetacaoNativaHa)} ha</div></div>
                <div className="rounded border p-2"><div className="text-[10px] uppercase text-muted-foreground">Uso consolidado</div><div className="font-bold">{num(r.usoConsolidadoHa)} ha</div></div>
              </div>
            )}
          </div>

          {/* COLUNA DIREITA — resultados e referência */}
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
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

            <div className="rounded-lg border p-3">
              <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Faixas de APP (Código Florestal)</div>
              <ul className="space-y-0.5 text-xs">
                <li>Rio &lt; 10 m de largura: <strong>{appMargemRio(5)} m</strong> · 10 a 50 m: <strong>{appMargemRio(50)} m</strong> · 50 a 200 m: <strong>{appMargemRio(200)} m</strong> · 200 a 600 m: <strong>{appMargemRio(600)} m</strong> · acima de 600 m: <strong>{appMargemRio(700)} m</strong></li>
                <li>Nascente / olho d&apos;água: raio de <strong>{APP_NASCENTE_M} m</strong></li>
                <li>Lago rural até 20 ha: <strong>{appLago(10)} m</strong> · acima de 20 ha: <strong>{appLago(30)} m</strong></li>
              </ul>
            </div>
          </div>
        </div>

        {(onExportarShapefiles || onImportarShapefile) && (
          <div className="flex items-center justify-between gap-2 border-t pt-2">
            <span className="text-[11px] text-muted-foreground">Exporta o perímetro e as camadas do CAR como shapefiles (base para o SICAR), ou importa um shapefile (.zip ou .shp) como referência no desenho.</span>
            <div className="flex shrink-0 gap-1.5">
              {onImportarShapefile && (
                <Button size="sm" variant="outline" disabled={processando} className="gap-1" onClick={onImportarShapefile}><Upload className="size-4" /> Importar</Button>
              )}
              {onExportarShapefiles && (
                <Button size="sm" disabled={processando} className="gap-1" onClick={onExportarShapefiles}><Download className="size-4" /> Shapefiles (SICAR)</Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
