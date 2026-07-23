'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Leaf, Download, Upload, AlertTriangle, Check } from 'lucide-react';
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

export default function CarModal({ open, onOpenChange, areaHa, areasCamadas, onExportarShapefiles, onImportarShapefile, processando, onMinimizar }: { open: boolean; onOpenChange: (o: boolean) => void; areaHa: number; areasCamadas?: AreasCamadas; onExportarShapefiles?: () => void; onImportarShapefile?: () => void; processando?: boolean; onMinimizar?: () => void }) {
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

  const numIn = (s: string) => {
    const clean = (s || '').replace(/[^\d.,]/g, '').replace(',', '.');
    const val = parseFloat(clean);
    return Number.isFinite(val) ? val : 0;
  };
  const mfClean = moduloFiscal.replace(/[^\d.,]/g, '').replace(',', '.');
  const mf = parseFloat(mfClean);
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
      <DialogContent onMinimize={onMinimizar} className="max-w-[96vw] xl:max-w-7xl max-h-[92vh] flex flex-col p-5 bg-background shadow-2xl rounded-xl">
        <DialogHeader className="shrink-0 pb-2 border-b border-border/60">
          <DialogTitle className="flex items-center gap-2.5 text-lg font-black text-foreground">
            <Leaf className="size-5.5 text-emerald-500" /> CAR — Cadastro Ambiental Rural
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground shrink-0 leading-relaxed pt-1">
          Cálculos e parametrização do Código Florestal com base na área SGL do imóvel. Exporte perímetros como Shapefile ou importe arquivos espaciais para balizar a sua retificação.
        </p>

        {/* Layout horizontal inteligente: 3 colunas em telas grandes (Inputs | Resultados/APP | Diretrizes) */}
        <div className="grid min-h-0 flex-grow gap-4 overflow-y-auto lg:grid-cols-12 mt-2">
          
          {/* COLUNA 1 — Entradas e Áreas Medidas (5 cols) */}
          <div className="lg:col-span-5 space-y-3 flex flex-col justify-between">
            {temCamadas && (
              <p className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-[11px] leading-snug text-emerald-600 dark:text-emerald-400 font-semibold animate-pulse">
                Áreas extraídas automaticamente dos polígonos desenhados como camadas do CAR no mapa.
              </p>
            )}

            <div className="grid grid-cols-2 gap-2.5 text-left">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-extrabold">Área do imóvel (ha) *</label>
                <div className="rounded-lg border border-border/80 bg-background dark:bg-[#05140b]/80 px-2.5 py-1.5 text-xs font-black text-foreground">{num(areaHa, 4)} ha</div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-extrabold">Bioma / localização *</label>
                <select className="w-full h-8.5 rounded-lg border bg-background dark:bg-[#05140b] border-border/80 px-2 text-xs text-foreground focus:border-emerald-500 focus:outline-none" value={bioma} onChange={(e) => setBioma(e.target.value as Bioma)}>
                  {BIOMAS.map((b) => <option key={b.v} value={b.v}>{b.rot}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-extrabold">Módulo fiscal (ha) *</label>
                <input className="w-full h-8.5 rounded-lg border bg-background dark:bg-[#05140b] border-border/80 px-2 text-xs text-foreground focus:border-emerald-500 focus:outline-none font-mono" placeholder="ex.: 20" value={moduloFiscal} onChange={(e) => setModuloFiscal(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#87a992]">Reserva legal averbada (ha)</label>
                <input className="w-full h-8.5 rounded-lg border bg-background dark:bg-[#05140b] border-border/80 px-2 text-xs text-foreground focus:border-emerald-500 focus:outline-none font-mono" placeholder="ex.: 4" value={reservaHa} onChange={(e) => setReservaHa(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#87a992]">APP total (ha)</label>
                <input className="w-full h-8.5 rounded-lg border bg-background dark:bg-[#05140b] border-border/80 px-2 text-xs text-foreground focus:border-emerald-500 focus:outline-none font-mono" placeholder="ex.: 1,5" value={appHa} onChange={(e) => setAppHa(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#87a992]">Vegetação nativa (ha)</label>
                <input className="w-full h-8.5 rounded-lg border bg-background dark:bg-[#05140b] border-border/80 px-2 text-xs text-foreground focus:border-emerald-500 focus:outline-none font-mono" placeholder="ex.: 6" value={vegHa} onChange={(e) => setVegHa(e.target.value)} />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#87a992]">Uso consolidado (ha)</label>
                <input className="w-full h-8.5 rounded-lg border bg-background dark:bg-[#05140b] border-border/80 px-2 text-xs text-foreground focus:border-emerald-500 focus:outline-none font-mono" placeholder="ex.: 40" value={usoHa} onChange={(e) => setUsoHa(e.target.value)} />
              </div>
            </div>

            {(appHa.trim() || vegHa.trim() || usoHa.trim()) && (
              <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                <div className="rounded-lg border border-border p-2 bg-muted/20">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">APP</div>
                  <div className="font-black text-xs text-foreground">{num(r.appTotalHa)} ha</div>
                </div>
                <div className="rounded-lg border border-border p-2 bg-muted/20">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Veg. Nativa</div>
                  <div className="font-black text-xs text-foreground">{num(r.vegetacaoNativaHa)} ha</div>
                </div>
                <div className="rounded-lg border border-border p-2 bg-muted/20">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Uso Consolidado</div>
                  <div className="font-black text-xs text-foreground">{num(r.usoConsolidadoHa)} ha</div>
                </div>
              </div>
            )}
          </div>

          {/* COLUNA 2 — Resultados, Alertas e Código Florestal (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-border/85 p-2.5 text-center bg-[#07170d]/20">
                <div className="text-[9px] font-bold uppercase tracking-wider text-[#87a992] mb-0.5">Reserva Legal Exigida</div>
                <div className="text-sm font-black text-emerald-500 dark:text-emerald-400">{num(r.reservaLegal.exigidaHa)} ha</div>
              </div>
              <div className="rounded-xl border border-border/85 p-2.5 text-center bg-[#07170d]/20">
                <div className="text-[9px] font-bold uppercase tracking-wider text-[#87a992] mb-0.5">Módulos Fiscais</div>
                <div className="text-sm font-black text-foreground">{Number.isFinite(mf) && mf > 0 ? num(r.numModulos) : '—'}</div>
              </div>
              <div className="rounded-xl border border-border/85 p-2.5 text-center bg-[#07170d]/20">
                <div className="text-[9px] font-bold uppercase tracking-wider text-[#87a992] mb-0.5">Classe do Imóvel</div>
                <div className="text-sm font-black text-foreground capitalize">{Number.isFinite(mf) && mf > 0 ? r.classe : '—'}</div>
              </div>
            </div>

            {reservaHa.trim() && (
              <div className={`rounded-xl border p-3 text-xs font-semibold ${r.reservaLegal.atende ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400 animate-pulse'}`}>
                <div className="flex items-center justify-center gap-1.5">
                  {r.reservaLegal.atende ? (
                    <>
                      <Check className="size-4 shrink-0 text-emerald-500" />
                      <span>A reserva legal informada atende aos mínimos legais exigidos.</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="size-4 shrink-0 text-amber-500 animate-bounce" />
                      <span>Falta {num(r.reservaLegal.faltaHa)} ha de reserva legal para atingir o limite mínimo.</span>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border/80 p-3 bg-[#07170d]/30 text-left">
              <div className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-foreground">Faixas de APP (Código Florestal)</div>
              <ul className="space-y-1 text-[11px] text-muted-foreground leading-snug">
                <li>• Rio &lt; 10 m de largura: <strong className="text-foreground">{appMargemRio(5)} m</strong> · 10 a 50 m: <strong className="text-foreground">{appMargemRio(50)} m</strong> · 50 a 200 m: <strong className="text-foreground">{appMargemRio(200)} m</strong></li>
                <li>• Nascente / olho d&apos;água: raio de <strong className="text-foreground">{APP_NASCENTE_M} m</strong></li>
                <li>• Lago rural até 20 ha: <strong className="text-foreground">{appLago(10)} m</strong> · acima de 20 ha: <strong className="text-foreground">{appLago(30)} m</strong></li>
              </ul>
            </div>
          </div>

          {/* COLUNA 3 — Diretrizes Técnicas e Responsabilidade (3 cols) */}
          <div className="lg:col-span-3 space-y-2">
            <div className="rounded-xl border border-amber-500/20 p-3 bg-amber-500/5 text-left text-[11px] leading-snug space-y-1.5 max-h-[300px] overflow-y-auto scroll-fino">
              <div className="font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5 sticky top-0 bg-background/90 backdrop-blur-xs py-0.5">
                <AlertTriangle className="size-3.5 shrink-0" /> Diretrizes no CAR (Lei 12.651)
              </div>
              <ul className="space-y-1 list-disc pl-3.5 text-muted-foreground">
                <li>
                  <strong>Módulos Fiscais:</strong> Imóveis &lt; 4 MFs contam com regras simplificadas de recomposição.
                </li>
                <li>
                  <strong>Reserva Legal:</strong> 20% no país; na Amazônia Legal: 35% (cerrado) a 80% (floresta).
                </li>
                <li>
                  <strong>Uso Consolidado:</strong> Uso antrópico antes de 22/07/2008 garante imunidade a multas e regularização.
                </li>
                <li>
                  <strong>Pronto para o SICAR (Shapefiles):</strong> Arquivos compactados de 1KB a 2KB contêm todas as 5 extensões obrigatórias (<code>.shp</code>, <code>.shx</code>, <code>.dbf</code>, <code>.prj</code>, <code>.cpg</code>).
                </li>
              </ul>
              <div className="border-t border-amber-500/10 pt-1.5 font-bold text-[10px] text-foreground">
                Isenção: Os shapefiles servem como apoio geométrico. A responsabilidade pelas declarações no SICAR é exclusiva do agrimensor.
              </div>
            </div>
          </div>

        </div>

        {(onExportarShapefiles || onImportarShapefile) && (
          <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-3 mt-auto shrink-0">
            <span className="text-[11px] text-muted-foreground max-w-xl text-left leading-normal">
              Gere os shapefiles (ZIP contendo .shp) de limites e camadas ambientais configuradas como base para o SICAR, ou carregue arquivos de referência para confrontantes e glebas.
            </span>
            <div className="flex shrink-0 gap-2">
              {onImportarShapefile && (
                <Button size="sm" variant="outline" disabled={processando} className="gap-1.5 h-9 px-3.5 font-bold text-xs" onClick={onImportarShapefile}><Upload className="size-3.5" /> Importar SHP</Button>
              )}
              {onExportarShapefiles && (
                <Button size="sm" disabled={processando} className="gap-1.5 h-9 px-3.5 font-bold text-xs bg-amber-500 hover:bg-amber-600 text-[#05140b] border-none" onClick={onExportarShapefiles}><Download className="size-3.5" /> Exportar Shapefiles</Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
