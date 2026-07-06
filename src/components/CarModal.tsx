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
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-6 bg-background border border-border shadow-2xl rounded-xl">
        <DialogHeader className="shrink-0 pb-2 border-b border-border/60">
          <DialogTitle className="flex items-center gap-2.5 text-lg font-black text-foreground">
            <Leaf className="size-5.5 text-emerald-500" /> CAR — Cadastro Ambiental Rural
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs md:text-sm text-muted-foreground shrink-0 leading-relaxed pt-1">
          Cálculos e parametrização do Código Florestal com base na área SGL do imóvel. Exporte perímetros como Shapefile ou importe arquivos espaciais para balizar a sua retificação.
        </p>

        {/* Layout horizontal: campos à esquerda, resultados e referências à direita. */}
        <div className="grid min-h-0 flex-grow gap-5 overflow-y-auto md:grid-cols-2 mt-2">
          {/* COLUNA ESQUERDA — campos */}
          <div className="space-y-4">
            {temCamadas && (
              <p className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-2.5 text-xs leading-relaxed text-emerald-600 dark:text-emerald-400 font-semibold animate-pulse">
                As áreas abaixo já foram calculadas e extraídas automaticamente a partir dos polígonos desenhados como camadas do CAR no mapa.
              </p>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 text-left">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#87a992]">Área do imóvel (ha)</label>
                <div className="rounded-lg border border-border/80 bg-[#05140b] dark:bg-[#05140b]/80 px-3 py-2.5 text-sm font-black text-foreground">{num(areaHa, 4)} ha</div>
              </div>
              <div className="space-y-1.5 text-left">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#87a992]">Bioma / localização</label>
                <select className="w-full h-11 rounded-lg border bg-[#05140b] dark:bg-[#05140b] border-border/80 px-3 text-sm text-foreground focus:border-emerald-500 focus:outline-none" value={bioma} onChange={(e) => setBioma(e.target.value as Bioma)}>
                  {BIOMAS.map((b) => <option key={b.v} value={b.v}>{b.rot}</option>)}
                </select>
              </div>
              <div className="space-y-1.5 text-left">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#87a992]">Módulo fiscal (ha) — INCRA</label>
                <input className="w-full h-11 rounded-lg border bg-[#05140b] dark:bg-[#05140b] border-border/80 px-3 text-sm text-foreground focus:border-emerald-500 focus:outline-none font-mono" placeholder="ex.: 20" value={moduloFiscal} onChange={(e) => setModuloFiscal(e.target.value)} />
              </div>
              <div className="space-y-1.5 text-left">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#87a992]">Reserva legal averbada (ha)</label>
                <input className="w-full h-11 rounded-lg border bg-[#05140b] dark:bg-[#05140b] border-border/80 px-3 text-sm text-foreground focus:border-emerald-500 focus:outline-none font-mono" placeholder="ex.: 4" value={reservaHa} onChange={(e) => setReservaHa(e.target.value)} />
              </div>
              <div className="space-y-1.5 text-left">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#87a992]">APP total (ha)</label>
                <input className="w-full h-11 rounded-lg border bg-[#05140b] dark:bg-[#05140b] border-border/80 px-3 text-sm text-foreground focus:border-emerald-500 focus:outline-none font-mono" placeholder="ex.: 1,5" value={appHa} onChange={(e) => setAppHa(e.target.value)} />
              </div>
              <div className="space-y-1.5 text-left">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#87a992]">Vegetação nativa (ha)</label>
                <input className="w-full h-11 rounded-lg border bg-[#05140b] dark:bg-[#05140b] border-border/80 px-3 text-sm text-foreground focus:border-emerald-500 focus:outline-none font-mono" placeholder="ex.: 6" value={vegHa} onChange={(e) => setVegHa(e.target.value)} />
              </div>
              <div className="space-y-1.5 text-left col-span-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#87a992]">Uso consolidado (ha)</label>
                <input className="w-full h-11 rounded-lg border bg-[#05140b] dark:bg-[#05140b] border-border/80 px-3 text-sm text-foreground focus:border-emerald-500 focus:outline-none font-mono" placeholder="ex.: 40" value={usoHa} onChange={(e) => setUsoHa(e.target.value)} />
              </div>
            </div>

            {(appHa.trim() || vegHa.trim() || usoHa.trim()) && (
              <div className="grid grid-cols-3 gap-3 text-center text-xs pt-1">
                <div className="rounded-lg border border-border p-2.5 bg-muted/20">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">APP</div>
                  <div className="font-black text-sm text-foreground">{num(r.appTotalHa)} ha</div>
                </div>
                <div className="rounded-lg border border-border p-2.5 bg-muted/20">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Veg. Nativa</div>
                  <div className="font-black text-sm text-foreground">{num(r.vegetacaoNativaHa)} ha</div>
                </div>
                <div className="rounded-lg border border-border p-2.5 bg-muted/20">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Uso Consolidado</div>
                  <div className="font-black text-sm text-foreground">{num(r.usoConsolidadoHa)} ha</div>
                </div>
              </div>
            )}
          </div>

          {/* COLUNA DIREITA — resultados e referência */}
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-border/85 p-3.5 text-center bg-[#07170d]/20">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#87a992] mb-1">Reserva Legal Exigida</div>
                <div className="text-base md:text-lg font-black text-emerald-500 dark:text-emerald-400">{num(r.reservaLegal.exigidaHa)} ha</div>
              </div>
              <div className="rounded-xl border border-border/85 p-3.5 text-center bg-[#07170d]/20">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#87a992] mb-1">Módulos Fiscais</div>
                <div className="text-base md:text-lg font-black text-foreground">{Number.isFinite(mf) && mf > 0 ? num(r.numModulos) : '—'}</div>
              </div>
              <div className="rounded-xl border border-border/85 p-3.5 text-center bg-[#07170d]/20">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#87a992] mb-1">Classe do Imóvel</div>
                <div className="text-base md:text-lg font-black text-foreground capitalize">{Number.isFinite(mf) && mf > 0 ? r.classe : '—'}</div>
              </div>
            </div>

            {reservaHa.trim() && (
              <div className={`rounded-xl border p-4 text-sm font-semibold text-center ${r.reservaLegal.atende ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400 animate-pulse'}`}>
                {r.reservaLegal.atende
                  ? '✓ A reserva legal informada atende aos mínimos legais exigidos.'
                  : `⚠️ Falta ${num(r.reservaLegal.faltaHa)} ha de reserva legal para atingir o limite mínimo.`}
              </div>
            )}

            <div className="rounded-xl border border-border/80 p-4 bg-[#07170d]/30 text-left">
              <div className="mb-2 text-xs font-black uppercase tracking-wider text-foreground">Faixas de APP (Código Florestal)</div>
              <ul className="space-y-1.5 text-xs text-muted-foreground leading-relaxed">
                <li>• Rio &lt; 10 m de largura: <strong className="text-foreground">{appMargemRio(5)} m</strong> · 10 a 50 m: <strong className="text-foreground">{appMargemRio(50)} m</strong> · 50 a 200 m: <strong className="text-foreground">{appMargemRio(200)} m</strong></li>
                <li>• Nascente / olho d&apos;água: raio de <strong className="text-foreground">{APP_NASCENTE_M} m</strong></li>
                <li>• Lago rural até 20 ha: <strong className="text-foreground">{appLago(10)} m</strong> · acima de 20 ha: <strong className="text-foreground">{appLago(30)} m</strong></li>
              </ul>
            </div>
          </div>
        </div>

        {(onExportarShapefiles || onImportarShapefile) && (
          <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-4 mt-auto shrink-0">
            <span className="text-[11px] text-muted-foreground max-w-xl text-left leading-normal">
              Gere os shapefiles (ZIP contendo .shp) de limites e camadas ambientais configuradas como base para o SICAR, ou carregue arquivos de referência para confrontantes e glebas.
            </span>
            <div className="flex shrink-0 gap-2">
              {onImportarShapefile && (
                <Button size="sm" variant="outline" disabled={processando} className="gap-1.5 h-10 px-4 font-bold text-xs" onClick={onImportarShapefile}><Upload className="size-4" /> Importar SHP</Button>
              )}
              {onExportarShapefiles && (
                <Button size="sm" disabled={processando} className="gap-1.5 h-10 px-4 font-bold text-xs bg-amber-500 hover:bg-amber-600 text-[#05140b] border-none" onClick={onExportarShapefiles}><Download className="size-4" /> Exportar Shapefiles</Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
