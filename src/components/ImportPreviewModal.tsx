'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
  nomes: string[];        // por índice original: nome do vértice (editável já na prévia)
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
  const [nomes, setNomes] = useState<string[]>([]);
  const [destaque, setDestaque] = useState<number | null>(null);
  const [arrastando, setArrastando] = useState<number | null>(null);
  // satélite: se falhar (chunk de rede, remount rápido do Leaflet...), tenta sozinho UMA vez antes
  // de deixar o botão manual — a maioria das falhas aqui é passageira e some no 2º carregamento.
  const [satRetryKey, setSatRetryKey] = useState(0);
  const satAutoRetryFeito = useRef(false);

  // (re)inicializa tudo ao abrir
  useEffect(() => {
    if (!open) return;
    setZonaSel(zona);
    setOrdem(pontos.map((_, i) => i));
    setImportar(pontos.map(() => true));
    setNoPoligono(pontos.map(() => true));
    setNomes(pontos.map((p) => p.nome || ''));
    setDestaque(null);
    setSatRetryKey(0);
    satAutoRetryFeito.current = false;
  }, [open, zona, n]); // eslint-disable-line react-hooks/exhaustive-deps

  // converte UTM -> lat/lon com o fuso ESCOLHIDO (recalcula ao trocar o fuso)
  const ll = useMemo(() => pontos.map((p) => {
    const g = utmParaGeo(p.leste, p.norte, zonaSel, hemisferio);
    return [g.lat, g.lon] as [number, number];
  }), [pontos, zonaSel, hemisferio]);

  const foraDaFaixa = ll.some(([la, lo]) => !Number.isFinite(la) || !Number.isFinite(lo) || la > 6 || la < -34 || lo > -28 || lo < -74);
  const fusos = (fusosPermitidos && fusosPermitidos.length ? fusosPermitidos : [18, 19, 20, 21, 22, 23, 24, 25]);

  // dados do mapa: polígono passa só pelos importados + no polígono; marcadores = todos importados.
  // Guarda contra índices "velhos" (logo após reabrir com outra quantidade de pontos, antes do
  // useEffect reiniciar os arrays) — só usa índices que existem em `ll`/`pontos`.
  const importadosNaOrdem = ordem.filter((i) => i < n && ll[i] && pontos[i] && importar[i]);
  const poligono = importadosNaOrdem.filter((i) => noPoligono[i]).map((i) => ll[i]);
  const marcadores = importadosNaOrdem.map((i) => ({ idx: i, lat: ll[i][0], lon: ll[i][1], ativo: i === destaque, noPoligono: noPoligono[i], rotulo: nomes[i] || pontos[i].nome }));
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
      <DialogContent className="flex h-[88vh] w-[92vw] max-w-[1360px] flex-col p-4 rounded-xl shadow-2xl">
        <DialogHeader className="border-b pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Eye className="size-5 text-primary" /> Prévia da importação — escolha o que entra
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Desmarque <strong>Importar</strong> para não trazer um ponto. Desmarque <strong>No polígono</strong> para trazer o vértice mas o perímetro passar direto por ele.
            Arraste pela alça para reordenar. Clique no nome pra editar. Clique no resto da linha para destacá-la no satélite.
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

        <div className="flex flex-wrap items-center gap-2 border-y bg-muted/20 px-3 py-2 text-xs">
          <span className="font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Ações nos Vértices:</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-[10px] font-black uppercase tracking-wider gap-1"
            onClick={() => setImportar(pontos.map(() => true))}
          >
            Importar Todos
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-[10px] font-black uppercase tracking-wider gap-1 text-red-500 hover:text-red-600 hover:bg-red-500/10"
            onClick={() => {
              setImportar(pontos.map(() => false));
              setNoPoligono(pontos.map(() => false));
            }}
          >
            Não Importar Nenhum
          </Button>
          <div className="h-4 w-px bg-border mx-1" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-[10px] font-black uppercase tracking-wider gap-1"
            onClick={() => setNoPoligono(pontos.map(() => true))}
          >
            Considerar Todos (No Polígono)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-[10px] font-black uppercase tracking-wider gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
            onClick={() => setNoPoligono(pontos.map(() => false))}
          >
            Ignorar Todos (Fora do Polígono)
          </Button>
        </div>

        {cruzado && (
          <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <AlertTriangle className="size-4 shrink-0" />
            A divisa está cruzando consigo mesma (forma de &quot;8&quot;) — a área sairia errada. Arraste os pontos para corrigir a ordem, ou tire do polígono o ponto fora de sequência.
          </div>
        )}

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
          {/* ESQUERDA: lista completa de pontos */}
          <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-background p-2">
            {destaque !== null && pontos[destaque] && (
              <div className="mb-2.5 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-between gap-3 text-xs shrink-0 select-none animate-in fade-in slide-in-from-top-1">
                <div className="min-w-0">
                  <span className="font-black text-amber-600 dark:text-amber-500 uppercase text-[9px] tracking-wider block">Ponto Selecionado</span>
                  <span className="font-extrabold text-foreground text-sm truncate uppercase">{nomes[destaque] || `PONTO ${destaque + 1}`}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    className={`h-8 font-black uppercase text-[10.5px] tracking-wider cursor-pointer transition-all ${
                      importar[destaque] && noPoligono[destaque] ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-background hover:bg-muted text-foreground border border-border'
                    }`}
                    onClick={() => {
                      setImportar(prev => prev.map((v, k) => k === destaque ? true : v));
                      setNoPoligono(prev => prev.map((v, k) => k === destaque ? true : v));
                    }}
                  >
                    Considerar no Polígono
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className={`h-8 font-black uppercase text-[10.5px] tracking-wider cursor-pointer transition-all ${
                      importar[destaque] && !noPoligono[destaque] ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-background hover:bg-muted text-foreground border border-border'
                    }`}
                    onClick={() => {
                      setImportar(prev => prev.map((v, k) => k === destaque ? true : v));
                      setNoPoligono(prev => prev.map((v, k) => k === destaque ? false : v));
                    }}
                  >
                    Não Considerar (Solto)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className={`h-8 font-black uppercase text-[10.5px] tracking-wider cursor-pointer transition-all ${
                      !importar[destaque] ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-background hover:bg-muted text-foreground border border-border'
                    }`}
                    onClick={() => {
                      setImportar(prev => prev.map((v, k) => k === destaque ? false : v));
                      setNoPoligono(prev => prev.map((v, k) => k === destaque ? false : v));
                    }}
                  >
                    Não Importar
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-[2rem_1fr_17.5rem] items-center gap-2 border-b bg-muted px-3 py-2 text-xs font-bold uppercase text-muted-foreground shrink-0 rounded-t-lg">
              <span></span>
              <span>Ponto</span>
              <span className="text-center">Status / Ação na Importação</span>
            </div>
            <div className="min-h-0 flex-1 divide-y overflow-y-auto pr-1 scroll-fino">
              {ordem.filter((i) => i < n && pontos[i]).map((i, pos) => (
                <div
                  key={i}
                  draggable
                  onDragStart={() => setArrastando(i)}
                  onDragOver={(e) => { e.preventDefault(); moverPara(i); }}
                  onDragEnd={() => setArrastando(null)}
                  onClick={() => setDestaque(i)}
                  className={`grid cursor-pointer grid-cols-[2rem_1fr_17.5rem] items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/40 ${destaque === i ? 'bg-amber-400/20' : ''} ${!importar[i] ? 'opacity-55' : ''}`}
                >
                  <GripVertical className="size-4 cursor-grab text-muted-foreground shrink-0" />
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="shrink-0 text-[10px] font-normal text-muted-foreground">{pos + 1}.</span>
                    <input
                      type="text"
                      value={nomes[i] ?? ''}
                      placeholder={`Ponto ${i + 1}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDestaque(i);
                      }}
                      onFocus={(e) => {
                        setDestaque(i);
                        e.target.select();
                      }}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setNomes((a) => a.map((v, k) => (k === i ? val : v)));
                      }}
                      className="w-full min-w-0 truncate rounded-sm border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold hover:border-border focus:border-primary focus:bg-background focus:outline-none uppercase"
                    />
                  </span>
                  
                  <div className="flex items-center gap-1 justify-center shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className={`h-7 px-2 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-1 ${
                        importar[i] && noPoligono[i]
                          ? 'bg-emerald-600 border-emerald-500 text-white shadow-xs scale-102 font-extrabold'
                          : 'bg-background hover:bg-emerald-500/10 border-border text-muted-foreground'
                      }`}
                      onClick={() => {
                        setDestaque(i);
                        setImportar((a) => a.map((v, k) => (k === i ? true : v)));
                        setNoPoligono((a) => a.map((v, k) => (k === i ? true : v)));
                      }}
                      title="Importar e considerar este ponto no polígono do perímetro"
                    >
                      🟢 Considerar
                    </button>
                    <button
                      type="button"
                      className={`h-7 px-2 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-1 ${
                        importar[i] && !noPoligono[i]
                          ? 'bg-amber-500 border-amber-400 text-white shadow-xs scale-102 font-extrabold'
                          : 'bg-background hover:bg-amber-500/10 border-border text-muted-foreground'
                      }`}
                      onClick={() => {
                        setDestaque(i);
                        setImportar((a) => a.map((v, k) => (k === i ? true : v)));
                        setNoPoligono((a) => a.map((v, k) => (k === i ? false : v)));
                      }}
                      title="Importar como ponto solto, sem fazer parte do polígono do perímetro"
                    >
                      🟡 Não Considerar
                    </button>
                    <button
                      type="button"
                      className={`h-7 px-2 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-1 ${
                        !importar[i]
                          ? 'bg-red-600 border-red-500 text-white shadow-xs scale-102 font-extrabold'
                          : 'bg-background hover:bg-red-500/10 border-border text-muted-foreground'
                      }`}
                      onClick={() => {
                        setDestaque(i);
                        setImportar((a) => a.map((v, k) => (k === i ? false : v)));
                        setNoPoligono((a) => a.map((v, k) => (k === i ? false : v)));
                      }}
                      title="Ignorar completamente este ponto na importação"
                    >
                      🔴 Não Importar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DIREITA: satélite */}
          <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border">
            <div className="flex items-center gap-1.5 border-b bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground shrink-0"><Satellite className="size-3.5" /> Localização no satélite (fuso {zonaSel}{hemisferio})</div>
            <div className="min-h-0 flex-1">
              <ErrorBoundary
                key={satRetryKey}
                onError={() => {
                  if (!satAutoRetryFeito.current) {
                    satAutoRetryFeito.current = true;
                    setTimeout(() => setSatRetryKey((k) => k + 1), 1200);
                  }
                }}
                fallback={
                  <div className="flex h-full flex-col items-center justify-center gap-1.5 p-4 text-center text-sm text-muted-foreground">
                    <Satellite className="size-6 opacity-50" />
                    <span>Não deu para abrir o satélite agora.</span>
                    <span className="text-xs">A lista de pontos ao lado funciona normalmente — pode importar mesmo assim.</span>
                    <button type="button" className="mt-1 rounded-sm border px-3 py-1 text-xs font-semibold hover:bg-muted" onClick={() => setSatRetryKey((k) => k + 1)}>
                      Tentar de novo
                    </button>
                  </div>
                }
              >
                <PreviaSatelite poligono={poligono} marcadores={marcadores} destaque={destaqueLL} onSelectMarcador={setDestaque} />
              </ErrorBoundary>
            </div>
          </div>
        </div>

        <footer className="flex flex-col items-center justify-between gap-3 border-t pt-3 sm:flex-row">
          <span className="text-[10px] text-muted-foreground">ESC para cancelar</span>
          <div className="flex w-full items-stretch gap-2 sm:w-auto sm:items-center">
            <Button type="button" variant="outline" className="font-semibold" onClick={() => { onConfirm(false, zonaSel, { ordem, importar, noPoligono, nomes }); onOpenChange(false); }}>
              Importar só vértices (sem perímetro)
            </Button>
            <Button type="button" className="gap-1.5 bg-emerald-600 font-bold text-white hover:bg-emerald-700" onClick={() => { onConfirm(true, zonaSel, { ordem, importar, noPoligono, nomes }); onOpenChange(false); }}>
              <Check className="size-4" /> Gerar perímetro automático
            </Button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
