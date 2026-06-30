'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Eye, Satellite, AlertTriangle, GripVertical } from 'lucide-react';
import { utmParaGeo } from '@/lib/topo/coords';
import ErrorBoundary from './ErrorBoundary';

const PreviaSatelite = dynamic(() => import('./PreviaSatelite'), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Carregando satélite…</div>,
});

export interface SelecaoImport {
  ordem: number[];        // índices originais, na ordem de exibição
  importar: boolean[];    // por índice original: traz o vértice?
  noPoligono: boolean[];  // por índice original: o perímetro passa por ele?
}

interface PontoPrev { nome: string; leste: number; norte: number }

// dois segmentos AB e CD se cruzam? (teste de orientação)
function orient(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number {
  return Math.sign((bx - ax) * (cy - ay) - (by - ay) * (cx - ax));
}
function segCruza(a: [number, number], b: [number, number], c: [number, number], d: [number, number]): boolean {
  const o1 = orient(a[0], a[1], b[0], b[1], c[0], c[1]);
  const o2 = orient(a[0], a[1], b[0], b[1], d[0], d[1]);
  const o3 = orient(c[0], c[1], d[0], d[1], a[0], a[1]);
  const o4 = orient(c[0], c[1], d[0], d[1], b[0], b[1]);
  return o1 !== o2 && o3 !== o4;
}
// o anel fechado cruza consigo mesmo? (polígono em "8"), ignorando arestas vizinhas
function anelCruzado(ring: [number, number][]): boolean {
  const n = ring.length;
  if (n < 4) return false;
  for (let i = 0; i < n; i++) {
    const a = ring[i], b = ring[(i + 1) % n];
    for (let j = i + 1; j < n; j++) {
      if ((i + 1) % n === j || (j + 1) % n === i || i === j) continue; // vizinhas compartilham vértice
      const c = ring[j], d = ring[(j + 1) % n];
      if (segCruza(a, b, c, d)) return true;
    }
  }
  return false;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  pontos: PontoPrev[];
  zona: number;
  hemisferio: 'N' | 'S';
  fusosPermitidos?: number[];
  onConfirm: (gerarPoligono: boolean, zona: number, selecao: SelecaoImport) => void;
}

export default function ImportPreviewModal({ open, onOpenChange, pontos, zona, hemisferio, fusosPermitidos, onConfirm }: Props) {
  const n = pontos.length;
  const [zonaSel, setZonaSel] = useState(zona);
  const [ordem, setOrdem] = useState<number[]>([]);
  const [importar, setImportar] = useState<boolean[]>([]);
  const [noPoligono, setNoPoligono] = useState<boolean[]>([]);
  const [destaque, setDestaque] = useState<number | null>(null);
  const [arrastando, setArrastando] = useState<number | null>(null);

  // (re)inicializa tudo ao abrir
  useEffect(() => {
    if (!open) return;
    setZonaSel(zona);
    setOrdem(pontos.map((_, i) => i));
    setImportar(pontos.map(() => true));
    setNoPoligono(pontos.map(() => true));
    setDestaque(null);
  }, [open, zona, n]); // eslint-disable-line react-hooks/exhaustive-deps

  // converte UTM -> lat/lon com o fuso ESCOLHIDO (recalcula ao trocar o fuso)
  const ll = useMemo(() => pontos.map((p) => {
    const g = utmParaGeo(p.leste, p.norte, zonaSel, hemisferio);
    return [g.lat, g.lon] as [number, number];
  }), [pontos, zonaSel, hemisferio]);

  const foraDaFaixa = ll.some(([la, lo]) => !Number.isFinite(la) || !Number.isFinite(lo) || la > 6 || la < -34 || lo > -28 || lo < -74);
  const fusos = (fusosPermitidos && fusosPermitidos.length ? fusosPermitidos : [22, 23, 24, 25]);

  // dados do mapa: polígono passa só pelos importados + no polígono; marcadores = todos importados.
  // Guarda contra índices "velhos" (logo após reabrir com outra quantidade de pontos, antes do
  // useEffect reiniciar os arrays) — só usa índices que existem em `ll`/`pontos`.
  const importadosNaOrdem = ordem.filter((i) => i < n && ll[i] && pontos[i] && importar[i]);
  const poligono = importadosNaOrdem.filter((i) => noPoligono[i]).map((i) => ll[i]);
  const marcadores = importadosNaOrdem.map((i) => ({ lat: ll[i][0], lon: ll[i][1], ativo: i === destaque, noPoligono: noPoligono[i], rotulo: pontos[i].nome }));
  const destaqueLL = destaque != null && ll[destaque] ? ll[destaque] : null;

  const qtdImportar = importar.filter(Boolean).length;
  const qtdPoligono = importadosNaOrdem.filter((i) => noPoligono[i]).length;
  // polígono em "8": a ordem dos pontos faz a divisa cruzar consigo mesma (área sai errada)
  const cruzado = poligono.length >= 4 && anelCruzado(poligono);

  function moverPara(alvo: number) {
    if (arrastando == null || arrastando === alvo) return;
    setOrdem((ord) => {
      const de = ord.indexOf(arrastando);
      const para = ord.indexOf(alvo);
      if (de < 0 || para < 0) return ord;
      const novo = ord.slice();
      const [x] = novo.splice(de, 1);
      novo.splice(para, 0, x);
      return novo;
    });
  }

  if (!n) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[98vh] w-[98vw] max-w-[98vw] flex-col p-4">
        <DialogHeader className="border-b pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Eye className="size-5 text-primary" /> Prévia da importação — escolha o que entra
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Desmarque <strong>Importar</strong> para não trazer um ponto. Desmarque <strong>No polígono</strong> para trazer o vértice mas o perímetro passar direto por ele.
            Arraste pela alça para reordenar. Clique numa linha para destacá-la no satélite.
          </p>
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
            : <span className="text-xs text-muted-foreground">Confira no satélite se bate com o local real.</span>}
          <span className="ml-auto text-xs text-muted-foreground">{qtdImportar}/{n} a importar · {qtdPoligono} no polígono</span>
        </div>

        {cruzado && (
          <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <AlertTriangle className="size-4 shrink-0" />
            A divisa está cruzando consigo mesma (forma de &quot;8&quot;) — a área sairia errada. Arraste os pontos para corrigir a ordem, ou tire do polígono o ponto fora de sequência.
          </div>
        )}

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
          {/* ESQUERDA: lista completa de pontos */}
          <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-background">
            <div className="grid grid-cols-[2rem_4rem_1fr_5rem] items-center gap-2 border-b bg-muted px-3 py-2 text-xs font-bold uppercase text-muted-foreground">
              <span></span>
              <span className="text-center">Importar</span>
              <span>Ponto</span>
              <span className="text-center">No polígono</span>
            </div>
            <div className="min-h-0 flex-1 divide-y overflow-y-auto">
              {ordem.filter((i) => i < n && pontos[i]).map((i, pos) => (
                <div
                  key={i}
                  draggable
                  onDragStart={() => setArrastando(i)}
                  onDragOver={(e) => { e.preventDefault(); moverPara(i); }}
                  onDragEnd={() => setArrastando(null)}
                  onClick={() => setDestaque(i)}
                  className={`grid cursor-pointer grid-cols-[2rem_4rem_1fr_5rem] items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/40 ${destaque === i ? 'bg-amber-400/20' : ''} ${!importar[i] ? 'opacity-40' : ''}`}
                >
                  <GripVertical className="size-4 cursor-grab text-muted-foreground" />
                  <div className="flex justify-center">
                    <input type="checkbox" className="size-4 accent-emerald-600" checked={importar[i]} onClick={(e) => e.stopPropagation()} onChange={(e) => setImportar((a) => a.map((v, k) => (k === i ? e.target.checked : v)))} />
                  </div>
                  <span className="truncate font-semibold">
                    <span className="mr-1.5 text-[10px] font-normal text-muted-foreground">{pos + 1}.</span>
                    {pontos[i].nome || `Ponto ${i + 1}`}
                  </span>
                  <div className="flex justify-center">
                    <input type="checkbox" className="size-4 accent-blue-600" checked={noPoligono[i]} disabled={!importar[i]} onClick={(e) => e.stopPropagation()} onChange={(e) => setNoPoligono((a) => a.map((v, k) => (k === i ? e.target.checked : v)))} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DIREITA: satélite */}
          <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border">
            <div className="flex items-center gap-1.5 border-b bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground"><Satellite className="size-3.5" /> Localização no satélite (fuso {zonaSel}{hemisferio})</div>
            <div className="min-h-0 flex-1">
              <ErrorBoundary fallback={
                <div className="flex h-full flex-col items-center justify-center gap-1 p-4 text-center text-sm text-muted-foreground">
                  <Satellite className="size-6 opacity-50" />
                  <span>Não deu para abrir o satélite agora.</span>
                  <span className="text-xs">A lista de pontos ao lado funciona normalmente — pode importar mesmo assim.</span>
                </div>
              }>
                <PreviaSatelite poligono={poligono} marcadores={marcadores} destaque={destaqueLL} />
              </ErrorBoundary>
            </div>
          </div>
        </div>

        <footer className="flex flex-col items-center justify-between gap-3 border-t pt-3 sm:flex-row">
          <span className="text-[10px] text-muted-foreground">ESC para cancelar</span>
          <div className="flex w-full items-stretch gap-2 sm:w-auto sm:items-center">
            <Button type="button" variant="outline" className="font-semibold" onClick={() => { onConfirm(false, zonaSel, { ordem, importar, noPoligono }); onOpenChange(false); }}>
              Importar só vértices (sem perímetro)
            </Button>
            <Button type="button" className="gap-1.5 bg-emerald-600 font-bold text-white hover:bg-emerald-700" onClick={() => { onConfirm(true, zonaSel, { ordem, importar, noPoligono }); onOpenChange(false); }}>
              <Check className="size-4" /> Gerar perímetro automático
            </Button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
