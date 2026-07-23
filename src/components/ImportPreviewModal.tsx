'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Check,
  Eye,
  Satellite,
  AlertTriangle,
  GripVertical,
  CheckCircle2,
  XCircle,
  Ban,
  Layers,
  Sparkles,
  MapPin,
} from 'lucide-react';
import { utmParaGeo } from '@/lib/topo/coords';
import ErrorBoundary from './ErrorBoundary';

const PreviaSatelite = dynamic(
  () =>
    import('./PreviaSatelite').catch((err) => {
      console.warn('Recuperando de falha de carregamento de chunk (PreviaSatelite):', err);
      return import('./PreviaSatelite');
    }),
  {
    ssr: false,
    loading: () => <div className="flex h-full items-center justify-center text-sm text-muted-foreground font-medium">Carregando mapa satélite…</div>,
  }
);

export interface SelecaoImport {
  ordem: number[];        // índices originais, na ordem de exibição
  importar: boolean[];    // por índice original: traz o vértice?
  noPoligono: boolean[];  // por índice original: o perímetro passa por ele?
  nomes: string[];        // por índice original: nome do vértice (editável já na prévia)
}

export interface PontoPrev {
  nome: string;
  codigo?: string;
  codigoSigef?: string;
  descricao?: string;
  leste: number;
  norte: number;
}

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
      if ((i + 1) % n === j || (j + 1) % n === i || i === j) continue;
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
  onConfirm: (gerarPoligono: boolean, zona: number, selecao: SelecaoImport, tituloServico: string) => void;
}

export default function ImportPreviewModal({ open, onOpenChange, pontos, zona, hemisferio, fusosPermitidos, onConfirm }: Props) {
  const n = pontos.length;
  const [zonaSel, setZonaSel] = useState(zona);
  const [tituloServico, setTituloServico] = useState('GEORREFERENCIAMENTO DE IMÓVEIS RURAIS');
  const [ordem, setOrdem] = useState<number[]>([]);
  const [importar, setImportar] = useState<boolean[]>([]);
  const [noPoligono, setNoPoligono] = useState<boolean[]>([]);
  const [nomes, setNomes] = useState<string[]>([]);
  const [destaque, setDestaque] = useState<number | null>(null);
  const [arrastando, setArrastando] = useState<number | null>(null);
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
    setTituloServico('GEORREFERENCIAMENTO DE IMÓVEIS RURAIS');
  }, [open, zona, n]);

  // converte UTM -> lat/lon com o fuso ESCOLHIDO
  const ll = useMemo(() => pontos.map((p) => {
    const g = utmParaGeo(p.leste, p.norte, zonaSel, hemisferio);
    return [g.lat, g.lon] as [number, number];
  }), [pontos, zonaSel, hemisferio]);

  const foraDaFaixa = ll.some(([la, lo]) => !Number.isFinite(la) || !Number.isFinite(lo) || la > 6 || la < -34 || lo > -28 || lo < -74);
  const fusos = (fusosPermitidos && fusosPermitidos.length ? fusosPermitidos : [18, 19, 20, 21, 22, 23, 24, 25]);

  const importadosNaOrdem = ordem.filter((i) => i < n && ll[i] && pontos[i] && importar[i]);
  const poligono = importadosNaOrdem.filter((i) => noPoligono[i]).map((i) => ll[i]);
  const marcadores = importadosNaOrdem.map((i) => ({
    idx: i,
    lat: ll[i][0],
    lon: ll[i][1],
    ativo: i === destaque,
    noPoligono: noPoligono[i],
    rotulo: nomes[i] || pontos[i].nome,
    codigo: pontos[i].codigo || pontos[i].codigoSigef || pontos[i].nome,
    descricao: pontos[i].descricao,
  }));
  const destaqueLL = destaque != null && ll[destaque] ? ll[destaque] : null;

  const qtdImportar = importar.filter(Boolean).length;
  const qtdPoligono = importadosNaOrdem.filter((i) => noPoligono[i]).length;
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
      <DialogContent className="fixed !top-0 !left-0 !right-0 !bottom-0 !inset-0 !translate-x-0 !translate-y-0 !w-screen !h-screen !max-w-none !max-h-none !rounded-none !border-none !p-4 sm:!p-5 flex flex-col bg-background z-[5000] overflow-hidden">
        {/* CABEÇALHO */}
        <DialogHeader className="border-b pb-3 shrink-0 flex flex-row items-center justify-between gap-4">
          <div>
            <DialogTitle className="flex items-center gap-2.5 text-xl font-black tracking-tight">
              <span className="flex items-center justify-center size-8 rounded-lg bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20">
                <Eye className="size-5" />
              </span>
              Prévia da Importação — Escolha o que entra
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">
              Ajuste quais pontos entram no perímetro ou permanecem soltos. Arraste pela alça para reordenar a sequência da divisa.
            </p>
          </div>

          <div className="flex items-center gap-3 pr-8 shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-card text-xs font-bold shadow-xs">
              <span className="inline-flex size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{qtdImportar} / {n} Vértices a Importar</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-emerald-500">{qtdPoligono} no Polígono</span>
            </div>
          </div>
        </DialogHeader>

        {/* BARRA DE CONTROLE E CONFIGURAÇÃO */}
        <div className="flex flex-wrap items-center gap-4 py-2.5 px-3 rounded-xl border bg-muted/20 text-xs shrink-0 my-2">
          {/* SELETOR FUSO */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-extrabold uppercase tracking-wider text-muted-foreground text-[11px]">Fuso UTM:</span>
            <div className="flex gap-1 bg-background/80 p-1 rounded-xl border shadow-2xs">
              {fusos.map((f) => {
                const ativo = f === zonaSel;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setZonaSel(f)}
                    className={`h-7 px-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                      ativo
                        ? 'bg-emerald-600 text-white shadow-xs scale-105'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {f}{hemisferio}
                  </button>
                );
              })}
            </div>
          </div>

          {foraDaFaixa ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500 font-bold text-xs">
              <AlertTriangle className="size-4 shrink-0" />
              Fora do fuso — confira no mapa satélite!
            </div>
          ) : (
            <span className="text-xs text-muted-foreground font-medium hidden md:inline">Confira visualmente no satélite ao lado.</span>
          )}

          <div className="h-4 w-px bg-border hidden md:block" />

          {/* SERVIÇO / TÍTULO */}
          <div className="flex items-center gap-2 flex-1 min-w-[280px]">
            <span className="font-extrabold uppercase tracking-wider text-muted-foreground text-[11px] shrink-0">Serviço/Título:</span>
            <input
              type="text"
              list="sugestoes-servico"
              value={tituloServico}
              onChange={(e) => setTituloServico(e.target.value.toUpperCase())}
              placeholder="DIGITE O SERVIÇO..."
              className="flex-1 rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-black uppercase shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            />
            <datalist id="sugestoes-servico">
              <option value="GEORREFERENCIAMENTO DE IMÓVEIS RURAIS" />
              <option value="LEVANTAMENTO PLANIMÉTRICO GEORREFERENCIADO" />
              <option value="LEVANTAMENTO PLANIALTIMÉTRICO CADASTRAL" />
              <option value="CERTIFICAÇÃO DE IMÓVEL RURAL (SIGEF)" />
              <option value="DESMEMBRAMENTO DE IMÓVEL RURAL" />
              <option value="REMEMBRAMENTO DE IMÓVEL RURAL" />
              <option value="RETIFICAÇÃO DE ÁREA E PERÍMETRO" />
            </datalist>
          </div>
        </div>

        {/* BARRA DE AÇÕES EM MASSA */}
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl border bg-card text-xs shrink-0 mb-2">
          <span className="font-black text-muted-foreground uppercase tracking-wider text-[10px] mr-1">Ações em Massa:</span>
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-3 rounded-lg text-xs font-extrabold uppercase tracking-wider gap-1.5 bg-background hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/30 transition-all"
            onClick={() => setImportar(pontos.map(() => true))}
          >
            <CheckCircle2 className="size-3.5 text-emerald-500" />
            Importar Todos
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-3 rounded-lg text-xs font-extrabold uppercase tracking-wider gap-1.5 bg-background hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/30 text-rose-600 dark:text-rose-400 transition-all"
            onClick={() => {
              setImportar(pontos.map(() => false));
              setNoPoligono(pontos.map(() => false));
            }}
          >
            <XCircle className="size-3.5" />
            Não Importar Nenhum
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-3 rounded-lg text-xs font-extrabold uppercase tracking-wider gap-1.5 bg-background hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/30 transition-all"
            onClick={() => setNoPoligono(pontos.map(() => true))}
          >
            <Layers className="size-3.5 text-emerald-500" />
            Considerar Todos (No Polígono)
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-3 rounded-lg text-xs font-extrabold uppercase tracking-wider gap-1.5 bg-background hover:bg-amber-500/10 hover:text-amber-500 hover:border-amber-500/30 text-amber-600 dark:text-amber-400 transition-all"
            onClick={() => setNoPoligono(pontos.map(() => false))}
          >
            <Ban className="size-3.5" />
            Ignorar Todos (Fora do Polígono)
          </Button>
        </div>

        {/* ALERTA SE O POLÍGONO ESTIVER CRUZADO (EM "8") */}
        {cruzado && (
          <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 text-xs font-extrabold text-amber-600 dark:text-amber-400 shrink-0 mb-2 shadow-2xs">
            <AlertTriangle className="size-4 shrink-0" />
            A divisa está cruzando consigo mesma (forma de &quot;8&quot;) — a área do imóvel sairá incorreta. Arraste os pontos pela alça para ajustar a ordem do perímetro.
          </div>
        )}

        {/* ÁREA PRINCIPAL DUPLA: TABELA NA ESQUERDA (7 COLS) | MAPA NA DIREITA (5 COLS) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0 overflow-hidden">
          {/* TABELA DE PONTOS */}
          <div className="lg:col-span-7 flex flex-col min-h-0 rounded-xl border bg-card/60 shadow-xs overflow-hidden">
            {/* PAINEL DE PONTO SELECIONADO */}
            {destaque !== null && pontos[destaque] && (
              <div className="p-3 bg-muted/40 border-b flex items-center justify-between gap-3 text-xs shrink-0 select-none animate-in fade-in duration-150">
                <div className="min-w-0">
                  <span className="font-black text-emerald-500 uppercase text-[10px] tracking-wider block">Vértice Selecionado</span>
                  <span className="font-black text-foreground text-sm truncate uppercase">{nomes[destaque] || `PONTO ${destaque + 1}`}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    className={`h-8 font-black uppercase text-[11px] tracking-wider cursor-pointer transition-all ${
                      importar[destaque] && noPoligono[destaque] ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs' : 'bg-background hover:bg-muted text-foreground border'
                    }`}
                    onClick={() => {
                      setImportar(prev => prev.map((v, k) => k === destaque ? true : v));
                      setNoPoligono(prev => prev.map((v, k) => k === destaque ? true : v));
                    }}
                  >
                    No Polígono
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className={`h-8 font-black uppercase text-[11px] tracking-wider cursor-pointer transition-all ${
                      importar[destaque] && !noPoligono[destaque] ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs' : 'bg-background hover:bg-muted text-foreground border'
                    }`}
                    onClick={() => {
                      setImportar(prev => prev.map((v, k) => k === destaque ? true : v));
                      setNoPoligono(prev => prev.map((v, k) => k === destaque ? false : v));
                    }}
                  >
                    Ponto Solto
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className={`h-8 font-black uppercase text-[11px] tracking-wider cursor-pointer transition-all ${
                      !importar[destaque] ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs' : 'bg-background hover:bg-muted text-foreground border'
                    }`}
                    onClick={() => {
                      setImportar(prev => prev.map((v, k) => k === destaque ? false : v));
                      setNoPoligono(prev => prev.map((v, k) => k === destaque ? false : v));
                    }}
                  >
                    Ignorar
                  </Button>
                </div>
              </div>
            )}

            {/* CABEÇALHO DA TABELA */}
            <div className="grid grid-cols-[2.2rem_1fr_22rem] items-center gap-2 border-b bg-muted/80 px-3.5 py-2.5 text-xs font-black uppercase tracking-wider text-muted-foreground shrink-0 select-none">
              <span className="text-center">#</span>
              <span>Ponto / Vértice</span>
              <span className="text-center">Status / Ação na Importação</span>
            </div>

            {/* CORPO DA TABELA COM ROLAGEM */}
            <div className="min-h-0 flex-1 divide-y overflow-y-auto pr-1 scroll-fino">
              {ordem.filter((i) => i < n && pontos[i]).map((i, pos) => (
                <div
                  key={i}
                  draggable
                  onDragStart={() => setArrastando(i)}
                  onDragOver={(e) => { e.preventDefault(); moverPara(i); }}
                  onDragEnd={() => setArrastando(null)}
                  onClick={() => setDestaque(i)}
                  className={`grid cursor-pointer grid-cols-[2.2rem_1fr_22rem] items-center gap-2 px-3.5 py-2 text-sm hover:bg-muted/40 transition-colors ${
                    destaque === i ? 'bg-emerald-500/10 border-l-4 border-l-emerald-500' : ''
                  } ${!importar[i] ? 'opacity-50 grayscale-50' : ''}`}
                >
                  <div className="flex items-center justify-center gap-1">
                    <GripVertical className="size-4 cursor-grab text-muted-foreground/60 hover:text-foreground shrink-0" />
                    <span className="text-[11px] font-black text-muted-foreground/80">{pos + 1}.</span>
                  </div>

                  <span className="flex min-w-0 items-center gap-1.5">
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
                      className="w-full min-w-0 truncate rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-black tracking-wide uppercase hover:border-border focus:border-emerald-500 focus:bg-background focus:outline-none transition-all"
                    />
                  </span>
                  
                  {/* SELETOR DE STATUS EM 3 BOTÕES (NUNCA QUEBRA LINHA) */}
                  <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60 shrink-0 w-full" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className={`whitespace-nowrap flex-1 shrink-0 flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-extrabold uppercase tracking-wide rounded-lg transition-all cursor-pointer ${
                        importar[i] && noPoligono[i]
                          ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-400 font-black'
                          : 'text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10'
                      }`}
                      onClick={() => {
                        setDestaque(i);
                        setImportar((a) => a.map((v, k) => (k === i ? true : v)));
                        setNoPoligono((a) => a.map((v, k) => (k === i ? true : v)));
                      }}
                      title="Importar e incluir no perímetro da divisa"
                    >
                      🟢 No Polígono
                    </button>

                    <button
                      type="button"
                      className={`whitespace-nowrap flex-1 shrink-0 flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-extrabold uppercase tracking-wide rounded-lg transition-all cursor-pointer ${
                        importar[i] && !noPoligono[i]
                          ? 'bg-amber-500 text-white shadow-xs ring-1 ring-amber-400 font-black'
                          : 'text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10'
                      }`}
                      onClick={() => {
                        setDestaque(i);
                        setImportar((a) => a.map((v, k) => (k === i ? true : v)));
                        setNoPoligono((a) => a.map((v, k) => (k === i ? false : v)));
                      }}
                      title="Importar como ponto solto, fora do perímetro"
                    >
                      🟡 Ponto Solto
                    </button>

                    <button
                      type="button"
                      className={`whitespace-nowrap flex-1 shrink-0 flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-extrabold uppercase tracking-wide rounded-lg transition-all cursor-pointer ${
                        !importar[i]
                          ? 'bg-rose-600 text-white shadow-xs ring-1 ring-rose-400 font-black'
                          : 'text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10'
                      }`}
                      onClick={() => {
                        setDestaque(i);
                        setImportar((a) => a.map((v, k) => (k === i ? false : v)));
                        setNoPoligono((a) => a.map((v, k) => (k === i ? false : v)));
                      }}
                      title="Não importar este ponto"
                    >
                      🔴 Ignorar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PAINEL DIREITO: MAPA SATÉLITE */}
          <div className="lg:col-span-5 flex flex-col min-h-0 rounded-xl border bg-card/60 shadow-xs overflow-hidden">
            <div className="flex items-center justify-between border-b bg-muted/80 px-3.5 py-2.5 text-xs font-extrabold text-muted-foreground shrink-0 select-none">
              <span className="flex items-center gap-2">
                <Satellite className="size-4 text-emerald-500" />
                Localização no Satélite (Fuso {zonaSel}{hemisferio})
              </span>
              <span className="text-[11px] font-bold text-muted-foreground">{poligono.length} pontos no perímetro</span>
            </div>

            <div className="min-h-0 flex-1 relative">
              <ErrorBoundary
                key={satRetryKey}
                onError={() => {
                  if (!satAutoRetryFeito.current) {
                    satAutoRetryFeito.current = true;
                    setTimeout(() => setSatRetryKey((k) => k + 1), 1200);
                  }
                }}
                fallback={
                  <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
                    <Satellite className="size-8 opacity-40 text-emerald-500" />
                    <span className="font-extrabold text-foreground">Visualização do satélite indisponível no momento.</span>
                    <span className="text-xs">A lista de vértices ao lado continua ativa. Você pode concluir a importação normalmente.</span>
                    <button
                      type="button"
                      className="mt-2 rounded-xl border bg-background px-4 py-2 text-xs font-black uppercase tracking-wider hover:bg-muted shadow-2xs transition-all"
                      onClick={() => setSatRetryKey((k) => k + 1)}
                    >
                      Tentar Novamente
                    </button>
                  </div>
                }
              >
                <PreviaSatelite poligono={poligono} marcadores={marcadores} destaque={destaqueLL} onSelectMarcador={setDestaque} />
              </ErrorBoundary>
            </div>
          </div>
        </div>

        {/* RODAPÉ E BOTÕES DE AÇÃO */}
        <footer className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t pt-3 mt-2 shrink-0">
          <span className="text-xs font-semibold text-muted-foreground">Pressione <kbd className="px-1.5 py-0.5 rounded-md border bg-muted text-[10px] font-mono font-bold">ESC</kbd> para cancelar</span>
          
          <div className="flex w-full sm:w-auto items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-10 px-4 font-extrabold text-xs uppercase tracking-wider gap-2 rounded-xl border shadow-2xs hover:bg-muted transition-all"
              onClick={() => { onConfirm(false, zonaSel, { ordem, importar, noPoligono, nomes }, tituloServico); onOpenChange(false); }}
            >
              <MapPin className="size-4 text-amber-500" />
              Importar Só Vértices (Sem Perímetro)
            </Button>

            <Button
              type="button"
              className="h-10 px-5 font-black text-xs uppercase tracking-wider gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-950/20 transition-all cursor-pointer"
              onClick={() => { onConfirm(true, zonaSel, { ordem, importar, noPoligono, nomes }, tituloServico); onOpenChange(false); }}
            >
              <Sparkles className="size-4" />
              Gerar Perímetro Automático
            </Button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
