'use client';

import { useEffect, useMemo, useRef, useState, Fragment } from 'react';
import { Ruler } from 'lucide-react';
import { MapContainer, TileLayer, Polygon, Polyline, Marker, CircleMarker, Rectangle, LayersControl, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { Vertex, ObjetoDesenho, Confrontante, VerticeVizinho, PontoLL } from '@/lib/topo/types';
import { distanciaCota, obterPontosCotaOffset } from '@/lib/topo/objetos';
import { simboloSvgInterno } from '@/lib/topo/simbolos';
import { corDivisa, REPRES_LABEL } from '@/lib/topo/sigefVocab';
import { corPorConfrontante } from '@/lib/topo/coresConfrontante';
import { numBR, azimute, distancia, azimuteDMS } from '@/lib/topo/geometry';
import { casasTela } from '@/lib/store/preferencias';
import { geoParaUtm, utmParaGeo } from '@/lib/topo/coords';
import { aplicarOrto, type ModoOrto } from '@/lib/topo/orto';
import { snapUtm, type SegmentoSnap, type AlvoSnap, type SnapResult } from '@/lib/topo/snap';
import { intersecaoRetasUtm } from '@/lib/topo/editing';

export type ModoEdicao = 'navegar' | 'inserir' | 'apagar' | 'linha' | 'polilinha' | 'tracejado' | 'cota' | 'texto' | 'simbolo' | 'divisa' | 'confrontante' | 'ignorar' | 'considerar' | 'multi' | 'medir' | 'paralela' | 'dividir' | 'trim' | 'extend' | 'retangulo' | 'arco' | 'copiar_base' | 'copiar_destino';

export interface RotuloMapa { id: string; lat: number; lon: number; linhas: string[]; tam?: number; }

interface Props {
  vertices: Vertex[];
  selecionadoId: string | null;
  modo: ModoEdicao;
  mostrarRotulos: boolean;
  bloqueado: boolean;
  referencias?: [number, number][][];
  parcelasCert?: { anel: [number, number][]; info: { titulo: string; linhas: string[] } }[];
  mostrarCert?: boolean;
  opacidadeCert?: number;
  parcelaCertSel?: number | null;
  onSelParcelaCert?: (i: number | null) => void;
  verticesVizinho?: VerticeVizinho[]; // vértices de imóveis vizinhos certificados (desenho + adotar)
  selMulti?: Set<string>;
  objSelMulti?: Set<string>;
  onToggleMulti?: (id: string) => void;
  onToggleMultiObj?: (id: string) => void;
  onBoxSelect?: (ids: string[]) => void;
  onBoxSelectObj?: (ids: string[]) => void;
  onAdotarVertice?: (lat: number, lon: number) => void;
  onDblClick?: (lat: number, lon: number) => void;
  outrasGlebas?: [number, number][][];
  objetos?: ObjetoDesenho[];
  desenhoAtual?: [number, number][];
  rotulos?: RotuloMapa[];
  centroGleba?: { linhas: string[]; lat?: number; lon?: number } | null;
  onMoverCentro?: (lat: number, lon: number) => void;
  mostrarDivisaConf?: boolean;
  onAjustarDivisaConf?: (id: string, az: number, len: number) => void;
  estiloVertice?: 'sigef' | 'convencional';
  objetoSelId?: string | null;
  onMover: (id: string, lat: number, lon: number) => void;
  onSelecionar: (id: string) => void;
  onApagar: (id: string) => void;
  onInserir: (lat: number, lon: number) => void;
  onCliqueDesenho?: (lat: number, lon: number) => void;
  onSelecObjeto?: (id: string | null) => void;
  onContextMenuObjeto?: (id: string, tipo: string, x: number, y: number) => void;
  onMoverPontoObjeto?: (id: string, idx: number, lat: number, lon: number) => void;
  onMoverRotulo?: (id: string, lat: number, lon: number) => void;
  onPintarDivisa?: (id: string) => void;
  onPintarConfrontante?: (id: string) => void;
  onMoverRotuloVertice?: (id: string, lat: number, lon: number) => void;
  centralizarSig?: number;
  conflitos?: { ladoIdx: number; tipo: 'sobreposicao' | 'vao'; distancia: number }[];
  focoLatLng?: [number, number] | null;
  onCancelDesenho?: () => void;
  tamNomes?: number;
  verticesIgnorados?: Vertex[];
  onIgnorarVertice?: (id: string) => void;
  onConsiderarVertice?: (id: string) => void;
  realceId?: string | null;
  onContextMenuVertice?: (v: Vertex, x: number, y: number) => void;
  onContextMenuDivisa?: (v: Vertex, idx: number, x: number, y: number) => void;
  onDblClickVertice?: (v: Vertex, x: number, y: number) => void;
  onContextMenuMapa?: (lat: number, lon: number, x: number, y: number) => void;
  confrontantes?: Confrontante[];
  confrontantePorLado?: Record<number, string>;
  onEditarConfrontante?: (id: string) => void;
  zona?: number;
  hemisferio?: 'N' | 'S';
  /** Trava de ângulo do desenho (CAD): a prévia dinâmica acompanha a mesma trava do clique. */
  orto?: ModoOrto;
  snapAtivo?: boolean;
  segmentoSelecionado?: SegmentoSnap | null;
  onSegmentoSelecionado?: (seg: SegmentoSnap | null) => void;
  offsetDistancia?: number;
  onConfirmarParalela?: (pontos: [PontoLL, PontoLL]) => void;
  copiarPontoBase?: PontoLL | null;
  onConfirmarCopiaBase?: (pt: PontoLL) => void;
  onConfirmarCopiaDestino?: (pt: PontoLL) => void;
  onDividirSegmento?: (idA: string, idB: string) => void;
  linhaLimite?: SegmentoSnap | null;
  onLinhaLimite?: (seg: SegmentoSnap | null) => void;
  onConfirmarTrim?: (objetoId: string, novosPontos: PontoLL[]) => void;
  onConfirmarExtend?: (objetoId: string, novosPontos: PontoLL[]) => void;
  camadasVisiveis?: Record<string, boolean>;
  camadasBloqueadas?: Record<string, boolean>;
  estilosCamadas?: Record<string, { cor: string; espessura: number }>;
}

const ESPERA_FELIZ: [number, number] = [-20.6506, -41.9094];

function valido(v: Vertex): boolean {
  return Number.isFinite(v.lat) && Number.isFinite(v.lon) && Math.abs(v.lat) <= 90 && Math.abs(v.lon) <= 180;
}

// símbolo do vértice por tipo, igual ao da legenda da planta: M = losango, P = círculo, V = triângulo
function iconeVertice(v: Vertex, selecionado: boolean) {
  const cor = v.tipo === 'M' ? '#f59e0b' : v.tipo === 'V' ? '#a855f7' : '#1e3a8a';
  const borda = selecionado ? '#ef4444' : '#ffffff';
  const sw = selecionado ? 2.5 : 1.6;
  let shape: string;
  if (v.tipo === 'M') shape = `<rect x="4" y="4" width="9" height="9" transform="rotate(45 8.5 8.5)" fill="${cor}" stroke="${borda}" stroke-width="${sw}"/>`;
  else if (v.tipo === 'V') shape = `<polygon points="8.5,2 15,15 2,15" fill="${cor}" stroke="${borda}" stroke-width="${sw}"/>`;
  else shape = `<circle cx="8.5" cy="8.5" r="5.5" fill="${cor}" stroke="${borda}" stroke-width="${sw}"/>`;
  return L.divIcon({
    className: 'vertice-icon',
    html: `<svg width="17" height="17" viewBox="0 0 17 17" style="overflow:visible;filter:drop-shadow(0 0 1px rgba(0,0,0,.8))">${shape}</svg>`,
    iconSize: [17, 17], iconAnchor: [8.5, 8.5],
  });
}

// rótulo do vértice: caixinha branca SÓLIDA com texto preto, nítida sobre o mapa; tamanho ajustável
// Posiciona o rótulo do vértice PRA FORA do polígono (direção dirx/diry, x direita / y baixo), a
// uma folga que nunca cobre o ponto. Se dir=(0,0) (rótulo arrastado à mão), fica centrado no ponto.
function iconeNomeVertice(texto: string, tam: number, dirx = 0, diry = 0) {
  const fs = tam && tam > 0 ? tam : 11;
  const txt = (texto || '').replace(/</g, '&lt;');
  const estW = txt.length * fs * 0.62 + 10;
  const estH = fs + 8;
  let ax = estW / 2, ay = estH / 2; // padrão: centrado (rótulo manual)
  if (dirx !== 0 || diry !== 0) {
    const c = 11 + fs * 0.35; // folga além do símbolo do vértice
    const half = (Math.abs(dirx) * estW + Math.abs(diry) * estH) / 2;
    ax = estW / 2 - dirx * (c + half);
    ay = estH / 2 - diry * (c + half);
  }
  return L.divIcon({
    className: 'vertice-nome',
    html: `<div style="font-size:${fs}px;font-weight:700;color:#000;background:#fff;border:1.5px solid #333;border-radius:3px;padding:0 4px;white-space:nowrap;box-shadow:0 0 2px rgba(0,0,0,.5);width:max-content;display:inline-block">${txt}</div>`,
    iconSize: [1, 1], iconAnchor: [ax, ay],
  });
}

// ponta arrastável do tique de troca de confrontante (visível no mapa para poder pegar)
const L_DIVISA_ICON = L.divIcon({
  className: 'ponta-divisa',
  html: '<div style="width:10px;height:10px;border-radius:50%;background:#fff;border:2px solid #475569;box-shadow:0 1px 2px rgba(0,0,0,0.4)"></div>',
  iconSize: [10, 10], iconAnchor: [5, 5],
});

function iconeTexto(o: ObjetoDesenho, sel: boolean, corDefault?: string) {
  const al = o.alinhamento === 'center' ? 'center' : o.alinhamento === 'right' ? 'right' : 'left';
  const corText = o.cor ?? corDefault ?? '#000';
  return L.divIcon({
    className: 'objeto-texto',
    html: `<div style="font-size:${o.tamanho ?? 12}px;color:${corText};background:#fff;border:1px solid #ccc;border-radius:3px;padding:2px 5px;white-space:nowrap;text-align:${al};box-shadow:0 1px 3px rgba(0,0,0,0.3);width:max-content;display:inline-block;${sel ? 'outline:1px dashed #ef4444;' : ''}">${(o.texto ?? '').replace(/</g, '&lt;')}</div>`,
    iconSize: [1, 1], iconAnchor: [0, 8],
  });
}
// rótulo/assinatura do confrontante: bloco branco com texto preto (legível no claro e no escuro),
// multilinha (Nome/CPF/Matrícula…) e uma linha de assinatura embaixo. Movível e redimensionável.
const iconeRotulo = (r: RotuloMapa, fator = 1) => {
  const fs = Math.round((r.tam && r.tam > 0 ? r.tam : 11) * fator);
  const linhas = r.linhas.map((l) => `<div>${(l || '').replace(/</g, '&lt;')}</div>`).join('');
  return L.divIcon({
    className: 'objeto-rotulo',
    html: `<div style="font-size:${fs}px;line-height:1.3;color:#000;background:#fff;border:1.5px solid #222;border-radius:4px;padding:3px 7px;white-space:nowrap;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.5);width:max-content;display:inline-block">${linhas}</div>`,
    iconSize: [1, 1], iconAnchor: [0, 8],
  });
};

// rótulo central da gleba: dados-chave (denominação, proprietário, matrícula, área) no meio do polígono.
// Não captura clique (pointer-events:none) para não atrapalhar a edição embaixo dele.
const iconeCentro = (linhas: string[], fator = 1, arrastavel = false) => {
  const corpo = linhas.map((l, i) => `<div style="font-weight:${i === 0 ? 700 : 600};font-size:${Math.round((i === 0 ? 13 : 11) * fator)}px">${(l || '').replace(/</g, '&lt;')}</div>`).join('');
  // caixa branca sólida e centrada no ponto (legível sobre o satélite). Quando arrastável (modo
  // navegar), captura o clique e mostra o cursor de mover; senão, deixa o clique passar pro mapa.
  const eventos = arrastavel ? 'pointer-events:auto;cursor:move' : 'pointer-events:none';
  return L.divIcon({
    className: 'gleba-centro',
    html: `<div style="transform:translate(-50%,-50%);display:inline-block;${eventos};color:#000;background:#fff;border:1.5px solid #222;border-radius:5px;padding:3px 9px;text-align:center;line-height:1.3;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.5);width:max-content">${corpo}</div>`,
    iconSize: [1, 1], iconAnchor: [0, 0],
  });
};

function AjustarLimites({ vertices, referencias = [] }: { vertices: Vertex[]; referencias?: [number, number][][] }) {
  const map = useMap();
  // Enquadra UMA vez, quando o primeiro polígono ou referências aparecem. NÃO reenquadra a cada edição (ignorar/
  // apagar/inserir vértice) — isso resetava o zoom do usuário. Reenquadrar de propósito = botão
  // "Centralizar" (via centralizarSig) e nos eventos de importação/troca de gleba.
  const jaAjustou = useRef(false);
  useEffect(() => {
    if (jaAjustou.current) return;
    const validos = vertices.filter(valido);
    const refFlat = referencias.flat().map((p) => ({ lat: p[0], lon: p[1] }));
    const pts = validos.length ? validos : refFlat;
    if (pts.length < 2) return;
    try {
      const b = L.latLngBounds(pts.map((v) => [v.lat, v.lon] as [number, number]));
      if (b.isValid()) {
        map.whenReady(() => {
          setTimeout(() => {
            try {
              map.invalidateSize();
              map.fitBounds(b, { padding: [40, 40] });
            } catch { /* sem tamanho */ }
          }, 100);
        });
        jaAjustou.current = true;
      }
    } catch { /* coords inválidas */ }
  }, [vertices, referencias, map]);
  return null;
}

function Centralizar({ sig, vertices }: { sig?: number; vertices: Vertex[] }) {
  const map = useMap();
  useEffect(() => {
    if (!sig) return;
    const validos = vertices.filter(valido);
    if (validos.length < 2) return;
    try {
      const b = L.latLngBounds(validos.map((v) => [v.lat, v.lon] as [number, number]));
      if (!b.isValid()) return;
      // invalidateSize ANTES do fitBounds: se a área do mapa mudou de tamanho (abrir/fechar um
      // painel, trocar de aba, redimensionar a janela), o Leaflet ainda guarda o tamanho antigo e
      // enquadra pela medida errada — dá a impressão de que o Foco não trouxe o desenho pra tela.
      // Rodamos num quadro seguinte pra garantir que o layout já assentou.
      requestAnimationFrame(() => {
        try {
          map.invalidateSize();
          map.fitBounds(b, { padding: [50, 50], maxZoom: 19 });
        } catch { /* sem tamanho */ }
      });
    } catch { /* ignore */ }
  }, [sig]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// Acompanha o nível de zoom para mostrar/ocultar os rótulos dos vértices certificados.
function VerZoom({ onZoom }: { onZoom: (z: number) => void }) {
  const map = useMapEvents({ zoomend() { onZoom(map.getZoom()); } });
  useEffect(() => { onZoom(map.getZoom()); }, [map, onZoom]);
  return null;
}

// Caixa de seleção por arrasto (modo multi): desenha um retângulo e seleciona os vértices dentro.
function CaixaSelecao({ ativo, vertices, objetos = [], onBoxSelect, onBoxSelectObj }: { ativo: boolean; vertices: Vertex[]; objetos?: ObjetoDesenho[]; onBoxSelect?: (ids: string[]) => void; onBoxSelectObj?: (ids: string[]) => void }) {
  const [inicio, setInicio] = useState<L.LatLng | null>(null);
  const [atual, setAtual] = useState<L.LatLng | null>(null);
  const map = useMap();
  // no modo multi, desliga o arrasto do mapa para o arrasto virar caixa de seleção
  useEffect(() => {
    if (!ativo) return;
    map.dragging.disable();
    return () => { map.dragging.enable(); };
  }, [ativo, map]);
  useMapEvents({
    mousedown(e) { if (!ativo) return; setInicio(e.latlng); setAtual(e.latlng); },
    mousemove(e) { if (!ativo || !inicio) return; setAtual(e.latlng); },
    mouseup(e) {
      if (!ativo || !inicio) return;
      const b = L.latLngBounds(inicio, e.latlng);
      // só conta como caixa se arrastou um mínimo (senão é clique simples num vértice)
      const arrastou = inicio.distanceTo(e.latlng) > 3;
      if (arrastou) {
        const dentro = vertices.filter((v) => Number.isFinite(v.lat) && b.contains([v.lat, v.lon])).map((v) => v.id);
        if (dentro.length) onBoxSelect?.(dentro);
        // objetos do desenho (linha, texto, símbolo, cota, retângulo, arco...) com algum ponto na caixa.
        // Curva de nível fica de fora (não é editável).
        const objDentro = objetos.filter((o) => o.curvaNivel == null && o.pontos.some((p) => Number.isFinite(p.lat) && b.contains([p.lat, p.lon]))).map((o) => o.id);
        if (objDentro.length) onBoxSelectObj?.(objDentro);
      }
      setInicio(null); setAtual(null);
    },
  });
  if (!ativo || !inicio || !atual) return null;
  const isWindow = atual.lng >= inicio.lng;
  const color = isWindow ? '#2563eb' : '#22c55e';
  const dashArray = isWindow ? undefined : '5 4';
  return (
    <Rectangle
      bounds={L.latLngBounds(inicio, atual)}
      pathOptions={{
        color,
        weight: 1.5,
        dashArray,
        fillColor: color,
        fillOpacity: 0.15
      }}
    />
  );
}

function CliqueMapa({ modo, onInserir, onCliqueDesenho, onCancelDesenho, onDblClick, onMouseMove, onMouseOut, hoverSnap, zona = 23, hemisferio = 'S', onConfirmarCopiaBase, onConfirmarCopiaDestino }: {
  modo: ModoEdicao;
  onInserir: (lat: number, lon: number) => void;
  onCliqueDesenho?: (lat: number, lon: number) => void;
  onCancelDesenho?: () => void;
  onDblClick?: (lat: number, lon: number) => void;
  onMouseMove?: (latlng: L.LatLng) => void;
  onMouseOut?: () => void;
  hoverSnap?: SnapResult | null;
  zona?: number;
  hemisferio?: 'N' | 'S';
  onConfirmarCopiaBase?: (pt: PontoLL) => void;
  onConfirmarCopiaDestino?: (pt: PontoLL) => void;
}) {
  useMapEvents({
    click(e) {
      let lat = e.latlng.lat;
      let lon = e.latlng.lng;
      let leste = 0, norte = 0;
      if (hoverSnap && hoverSnap.tipo) {
        leste = hoverSnap.leste;
        norte = hoverSnap.norte;
        const g = utmParaGeo(leste, norte, zona, hemisferio);
        lat = g.lat;
        lon = g.lon;
      } else {
        const u = geoParaUtm(lat, lon, zona, hemisferio);
        leste = u.leste;
        norte = u.norte;
      }
      if (modo === 'inserir') onInserir(lat, lon);
      else if ((modo === 'linha' || modo === 'polilinha' || modo === 'tracejado' || modo === 'cota' || modo === 'texto' || modo === 'simbolo' || modo === 'medir' || modo === 'retangulo' || modo === 'arco') && onCliqueDesenho) onCliqueDesenho(lat, lon);
      else if (modo === 'copiar_base') onConfirmarCopiaBase?.({ lat, lon, leste, norte });
      else if (modo === 'copiar_destino') onConfirmarCopiaDestino?.({ lat, lon, leste, norte });
    },
    dblclick(e) {
      // duplo clique abre o editor de texto (não dá zoom — doubleClickZoom desligado)
      onDblClick?.(e.latlng.lat, e.latlng.lng);
    },
    contextmenu(e) {
      if (modo === 'linha' || modo === 'polilinha' || modo === 'tracejado' || modo === 'cota' || modo === 'texto' || modo === 'medir' || modo === 'retangulo' || modo === 'arco') {
        e.originalEvent.preventDefault();
        onCancelDesenho?.();
      }
    },
    mousemove(e) {
      if (['medir', 'copiar_destino'].includes(modo)) onMouseMove?.(e.latlng);
    },
    mouseout() {
      if (['medir', 'copiar_destino'].includes(modo)) onMouseOut?.();
    }
  });
  return null;
}

function FocoMap({ latLng }: { latLng: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (latLng) {
      map.setView(latLng, 18, { animate: true });
    }
  }, [latLng, map]);
  return null;
}

// CURSOR DE CRUZ (CAD): com uma ferramenta ativa, o ponteiro do mapa vira a cruz "+" NATIVA do
interface MarcadoresRotulosProps {
  validos: Vertex[];
  camadasVisiveis: Record<string, boolean>;
  camadasBloqueadas: Record<string, boolean>;
  mostrarRotulos: boolean;
  zoom: number;
  estiloVertice: 'sigef' | 'convencional';
  tamNomes: number;
  fzZoom: number;
  dirsRotulo: [number, number][];
  modo: string;
  onSelecionar: (id: string) => void;
  onMoverRotuloVertice?: (id: string, lat: number, lon: number) => void;
}

function MarcadoresRotulos({
  validos,
  camadasVisiveis,
  camadasBloqueadas,
  mostrarRotulos,
  zoom,
  estiloVertice,
  tamNomes,
  fzZoom,
  dirsRotulo,
  modo,
  onSelecionar,
  onMoverRotuloVertice,
}: MarcadoresRotulosProps) {
  const map = useMap();

  return (
    <>
      {camadasVisiveis.divisas !== false && (mostrarRotulos && (zoom >= 15 || validos.length <= 20)) && validos.map((v, i) => (
        <Marker
          key={`nome${v.id}`}
          position={v.posRotulo ? [v.posRotulo.lat, v.posRotulo.lon] : [v.lat, v.lon]}
          draggable={modo === 'navegar' && !camadasBloqueadas.divisas}
          zIndexOffset={1000}
          icon={iconeNomeVertice(
            estiloVertice === 'convencional' ? `P${i + 1}` : (v.codigoSigef || v.nome),
            Math.round(tamNomes * fzZoom),
            v.posRotulo ? 0 : (dirsRotulo[i]?.[0] ?? 1),
            v.posRotulo ? 0 : (dirsRotulo[i]?.[1] ?? 0),
          )}
          eventHandlers={{
            click() { if (!camadasBloqueadas.divisas) onSelecionar(v.id); },
            dragend(e) {
              const marker = e.target as L.Marker;
              let ll = marker.getLatLng();
              
              if (!v.posRotulo) {
                const dirx = dirsRotulo[i]?.[0] ?? 1;
                const diry = dirsRotulo[i]?.[1] ?? 0;
                if (dirx !== 0 || diry !== 0) {
                  const fs = Math.round(tamNomes * fzZoom) || 11;
                  const txt = (estiloVertice === 'convencional' ? `P${i + 1}` : (v.codigoSigef || v.nome)) || '';
                  const estW = txt.length * fs * 0.62 + 10;
                  const estH = fs + 8;
                  const c = 11 + fs * 0.35;
                  const half = (Math.abs(dirx) * estW + Math.abs(diry) * estH) / 2;
                  
                  const ax = -dirx * (c + half);
                  const ay = -diry * (c + half);
                  
                  const pt = map.latLngToContainerPoint(ll);
                  const ptNovo = L.point(pt.x + ax, pt.y + ay);
                  ll = map.containerPointToLatLng(ptNovo);
                }
              }
              
              onMoverRotuloVertice?.(v.id, ll.lat, ll.lng);
            },
          }}
        />
      ))}
    </>
  );
}

// navegador — deixa claro que o clique vai DESENHAR/EDITAR, não navegar. Usamos a cruz nativa (e
// não um desenho seguindo o mouse) porque o navegador a posiciona EXATAMENTE no ponteiro, sem
// atraso e alinhada mesmo com zoom; o crosshair desenhado à mão ficava fora do lugar. Sobre um
// item clicável, o ponteiro de mãozinha do próprio item continua valendo (o CSS do item vence).
function CursorMapa({ ativo }: { ativo: boolean }) {
  const map = useMap();

  useEffect(() => {
    const el = map.getContainer();
    el.style.cursor = ativo ? 'crosshair' : '';
    return () => { el.style.cursor = ''; };
  }, [ativo, map]);

  return null;
}

// MEDIDA DINÂMICA (CAD): enquanto se desenha, o trecho até o cursor aparece como linha elástica
// com a distância e o azimute ao vivo, respeitando a trava ORTO/POLAR. Componente separado de
// propósito: o mousemove só re-renderiza este pedacinho, não o mapa inteiro (que é pesado).
function MedidaDinamica({ base, orto, zona, hemisferio }: { base: [number, number]; orto: ModoOrto; zona: number; hemisferio: 'N' | 'S' }) {
  const [pos, setPos] = useState<L.LatLng | null>(null);
  useMapEvents({ mousemove: (e) => setPos(e.latlng), mouseout: () => setPos(null) });
  if (!pos) return null;
  const a = geoParaUtm(base[0], base[1], zona, hemisferio);
  let b = geoParaUtm(pos.lat, pos.lng, zona, hemisferio);
  if (orto !== 'off') b = { ...b, ...aplicarOrto({ leste: a.leste, norte: a.norte }, { leste: b.leste, norte: b.norte }, orto === '90' ? 90 : 15) };
  const d = distancia({ e: a.leste, n: a.norte }, { e: b.leste, n: b.norte });
  if (!Number.isFinite(d) || d < 0.01) return null;
  const az = azimute({ e: a.leste, n: a.norte }, { e: b.leste, n: b.norte });
  const g = utmParaGeo(b.leste, b.norte, zona, hemisferio);
  return (
    <>
      <Polyline positions={[base, [g.lat, g.lon]]} pathOptions={{ color: '#2563eb', weight: 1, dashArray: '2 4', opacity: 0.9 }} interactive={false} />
      <Marker position={[g.lat, g.lon]} interactive={false} icon={L.divIcon({
        className: 'medida-dinamica',
        html: `<div style="font-size:10px;font-weight:600;color:#1e3a8a;background:#fff;border:1px solid #1e3a8a;border-radius:3px;padding:0 3px;white-space:nowrap;width:max-content;display:inline-block;box-shadow:0 1px 2px rgba(0,0,0,.3)">${numBR(d)} m &nbsp;az ${azimuteDMS(az)}</div>`,
        iconSize: [1, 1], iconAnchor: [-12, 26],
      })} />
    </>
  );
}

interface SnapIndicatorProps {
  snapAtivo: boolean;
  alvos: AlvoSnap[];
  segmentos: SegmentoSnap[];
  pontoOrigem: AlvoSnap | null;
  zona?: number;
  hemisferio?: 'N' | 'S';
  onSnapChange?: (res: SnapResult | null) => void;
}

function SnapIndicator({ snapAtivo, alvos, segmentos, pontoOrigem, zona, hemisferio, onSnapChange }: SnapIndicatorProps) {
  const [snapRes, setSnapRes] = useState<SnapResult | null>(null);
  const z = zona ?? 23;
  const h = hemisferio ?? 'S';

  useMapEvents({
    mousemove(e) {
      if (!snapAtivo) {
        if (snapRes) { setSnapRes(null); onSnapChange?.(null); }
        return;
      }
      const { lat, lng } = e.latlng;
      const u = geoParaUtm(lat, lng, z, h);
      
      const s = snapUtm(u.leste, u.norte, alvos, {
        tolVerticeM: 10,
        segmentos,
        pontoOrigem
      });

      if (s.tipo) {
        setSnapRes(s);
        onSnapChange?.(s);
      } else {
        if (snapRes) { setSnapRes(null); onSnapChange?.(null); }
      }
    },
    mouseout() {
      setSnapRes(null);
      onSnapChange?.(null);
    }
  });

  if (!snapRes || !snapRes.tipo) return null;

  const g = utmParaGeo(snapRes.leste, snapRes.norte, z, h);

  let shape = '';
  let color = '#22c55e'; // verde
  const size = 16;
  const anchor = [8, 8];

  if (snapRes.tipo === 'vertice') {
    shape = `<rect x="2" y="2" width="12" height="12" fill="none" stroke="${color}" stroke-width="2"/>`;
  } else if (snapRes.tipo === 'meio') {
    shape = `<polygon points="8,2 15,14 1,14" fill="none" stroke="${color}" stroke-width="2"/>`;
  } else if (snapRes.tipo === 'intersecao') {
    shape = `<path d="M2,2 L14,14 M14,2 L2,14" fill="none" stroke="${color}" stroke-width="2"/>`;
  } else if (snapRes.tipo === 'perpendicular') {
    color = '#2563eb'; // azul
    shape = `<path d="M2,14 L2,2 L14,2" fill="none" stroke="${color}" stroke-width="2"/>`;
  } else if (snapRes.tipo === 'extensao') {
    color = '#e11d48'; // vermelho
    shape = `<circle cx="8" cy="8" r="5" fill="none" stroke="${color}" stroke-dasharray="2 2" stroke-width="2"/>`;
  } else {
    return null;
  }

  let auxPolyline = null;
  if (snapRes.pontosAuxUTM && snapRes.pontosAuxUTM.length >= 2) {
    const ptsGeo = snapRes.pontosAuxUTM.map(p => {
      const gPt = utmParaGeo(p.leste, p.norte, z, h);
      return [gPt.lat, gPt.lon] as [number, number];
    });
    auxPolyline = (
      <Polyline
        positions={ptsGeo}
        pathOptions={{ color, weight: 1.2, dashArray: '3 4', opacity: 0.8 }}
        interactive={false}
      />
    );
  }

  return (
    <>
      {auxPolyline}
      <Marker
        position={[g.lat, g.lon]}
        interactive={false}
        icon={L.divIcon({
          className: 'snap-indicator-icon',
          html: `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="overflow:visible;filter:drop-shadow(0 0 1px rgba(0,0,0,.6))">${shape}</svg>`,
          iconSize: [size, size],
          iconAnchor: anchor as [number, number]
        })}
      />
    </>
  );
}

interface SegmentoProximo {
  segmento: SegmentoSnap;
  distancia: number;
}

function encontrarSegmentoProximo(cursor: { leste: number; norte: number }, segmentos: SegmentoSnap[]): SegmentoProximo | null {
  if (segmentos.length === 0) return null;
  let best: SegmentoSnap | null = null;
  let bestD = Infinity;

  for (const seg of segmentos) {
    const dx = seg.b.leste - seg.a.leste;
    const dy = seg.b.norte - seg.a.norte;
    const lenSq = dx * dx + dy * dy;
    if (lenSq > 1e-6) {
      let t = ((cursor.leste - seg.a.leste) * dx + (cursor.norte - seg.a.norte) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t)); // limitar ao segmento
      const px = seg.a.leste + t * dx;
      const py = seg.a.norte + t * dy;
      const dist = Math.hypot(cursor.leste - px, cursor.norte - py);
      if (dist < bestD) {
        bestD = dist;
        best = seg;
      }
    }
  }

  if (best) {
    return { segmento: best, distancia: bestD };
  }
  return null;
}

interface ParalelaControllerProps {
  modo: ModoEdicao;
  segmentos: SegmentoSnap[];
  zona: number;
  hemisferio: 'N' | 'S';
  onSegmentoSelecionado?: (seg: SegmentoSnap | null) => void;
  segmentoSelecionado: SegmentoSnap | null;
  offsetDistancia: number;
  onConfirmarParalela?: (pontos: [PontoLL, PontoLL]) => void;
}

function ParalelaController({ modo, segmentos, zona, hemisferio, onSegmentoSelecionado, segmentoSelecionado, offsetDistancia, onConfirmarParalela }: ParalelaControllerProps) {
  const [hoverSeg, setHoverSeg] = useState<SegmentoSnap | null>(null);
  const [previewPontos, setPreviewPontos] = useState<[number, number][] | null>(null);

  useMapEvents({
    mousemove(e) {
      if (modo !== 'paralela') {
        if (hoverSeg) setHoverSeg(null);
        if (previewPontos) setPreviewPontos(null);
        return;
      }

      const { lat, lng } = e.latlng;
      const cursorUtm = geoParaUtm(lat, lng, zona, hemisferio);

      if (!segmentoSelecionado) {
        const segProx = encontrarSegmentoProximo(cursorUtm, segmentos);
        if (segProx && segProx.distancia < 20) {
          setHoverSeg(segProx.segmento);
        } else {
          setHoverSeg(null);
        }
      } else {
        setHoverSeg(null);
        const seg = segmentoSelecionado;
        const dx = seg.b.leste - seg.a.leste;
        const dy = seg.b.norte - seg.a.norte;
        const len = Math.hypot(dx, dy);
        if (len > 1e-6) {
          const ux = dx / len;
          const uy = dy / len;
          
          const nx = -uy;
          const ny = ux;

          const signedDist = (cursorUtm.leste - seg.a.leste) * nx + (cursorUtm.norte - seg.a.norte) * ny;
          const side = signedDist >= 0 ? 'esquerda' : 'direita';

          const offsetSign = side === 'esquerda' ? 1 : -1;
          const offsetDist = offsetDistancia;

          const pa_e = seg.a.leste + offsetDist * nx * offsetSign;
          const pa_n = seg.a.norte + offsetDist * ny * offsetSign;
          const pb_e = seg.b.leste + offsetDist * nx * offsetSign;
          const pb_n = seg.b.norte + offsetDist * ny * offsetSign;

          const gA = utmParaGeo(pa_e, pa_n, zona, hemisferio);
          const gB = utmParaGeo(pb_e, pb_n, zona, hemisferio);

          setPreviewPontos([[gA.lat, gA.lon], [gB.lat, gB.lon]]);
        }
      }
    },
    click(e) {
      if (modo !== 'paralela') return;

      const { lat, lng } = e.latlng;
      const cursorUtm = geoParaUtm(lat, lng, zona, hemisferio);

      if (!segmentoSelecionado) {
        const segProx = encontrarSegmentoProximo(cursorUtm, segmentos);
        if (segProx && segProx.distancia < 20) {
          onSegmentoSelecionado?.(segProx.segmento);
        }
      } else {
        if (previewPontos && previewPontos.length >= 2) {
          const ptA_geo = previewPontos[0];
          const ptB_geo = previewPontos[1];
          const utmA = geoParaUtm(ptA_geo[0], ptA_geo[1], zona, hemisferio);
          const utmB = geoParaUtm(ptB_geo[0], ptB_geo[1], zona, hemisferio);
          
          const pontoA: PontoLL = { lat: ptA_geo[0], lon: ptA_geo[1], leste: utmA.leste, norte: utmA.norte };
          const pontoB: PontoLL = { lat: ptB_geo[0], lon: ptB_geo[1], leste: utmB.leste, norte: utmB.norte };
          
          onConfirmarParalela?.([pontoA, pontoB]);
        }
      }
    }
  });

  if (modo !== 'paralela') return null;

  let hoverPolyline = null;
  if (hoverSeg && !segmentoSelecionado) {
    const gA = utmParaGeo(hoverSeg.a.leste, hoverSeg.a.norte, zona, hemisferio);
    const gB = utmParaGeo(hoverSeg.b.leste, hoverSeg.b.norte, zona, hemisferio);
    hoverPolyline = (
      <Polyline
        positions={[[gA.lat, gA.lon], [gB.lat, gB.lon]]}
        pathOptions={{ color: '#06b6d4', weight: 6, opacity: 0.8 }}
        interactive={false}
      />
    );
  }

  let selPolyline = null;
  if (segmentoSelecionado) {
    const gA = utmParaGeo(segmentoSelecionado.a.leste, segmentoSelecionado.a.norte, zona, hemisferio);
    const gB = utmParaGeo(segmentoSelecionado.b.leste, segmentoSelecionado.b.norte, zona, hemisferio);
    selPolyline = (
      <Polyline
        positions={[[gA.lat, gA.lon], [gB.lat, gB.lon]]}
        pathOptions={{ color: '#eab308', weight: 4, opacity: 0.9 }}
        interactive={false}
      />
    );
  }

  let previewPolyline = null;
  if (previewPontos && segmentoSelecionado) {
    previewPolyline = (
      <Polyline
        positions={previewPontos}
        pathOptions={{ color: '#2563eb', weight: 2.5, dashArray: '4 4', opacity: 0.9 }}
        interactive={false}
      />
    );
  }

  return (
    <>
      {hoverPolyline}
      {selPolyline}
      {previewPolyline}
    </>
  );
}

interface DividirControllerProps {
  modo: ModoEdicao;
  segmentosAtivo: SegmentoSnap[];
  validos: Vertex[];
  zona: number;
  hemisferio: 'N' | 'S';
  onDividirSegmento?: (idA: string, idB: string) => void;
}

function DividirController({ modo, segmentosAtivo, validos, zona, hemisferio, onDividirSegmento }: DividirControllerProps) {
  const [hoverSeg, setHoverSeg] = useState<SegmentoSnap | null>(null);

  useMapEvents({
    mousemove(e) {
      if (modo !== 'dividir') {
        if (hoverSeg) setHoverSeg(null);
        return;
      }
      const { lat, lng } = e.latlng;
      const cursorUtm = geoParaUtm(lat, lng, zona, hemisferio);
      const segProx = encontrarSegmentoProximo(cursorUtm, segmentosAtivo);
      if (segProx && segProx.distancia < 20) {
        setHoverSeg(segProx.segmento);
      } else {
        setHoverSeg(null);
      }
    },
    click(e) {
      if (modo !== 'dividir') return;
      const { lat, lng } = e.latlng;
      const cursorUtm = geoParaUtm(lat, lng, zona, hemisferio);
      const segProx = encontrarSegmentoProximo(cursorUtm, segmentosAtivo);
      if (segProx && segProx.distancia < 20) {
        const seg = segProx.segmento;
        const vA = validos.find(v => Math.hypot(v.leste - seg.a.leste, v.norte - seg.a.norte) < 0.1);
        const vB = validos.find(v => Math.hypot(v.leste - seg.b.leste, v.norte - seg.b.norte) < 0.1);
        if (vA && vB) {
          onDividirSegmento?.(vA.id, vB.id);
        }
      }
    }
  });

  if (modo !== 'dividir' || !hoverSeg) return null;

  const gA = utmParaGeo(hoverSeg.a.leste, hoverSeg.a.norte, zona, hemisferio);
  const gB = utmParaGeo(hoverSeg.b.leste, hoverSeg.b.norte, zona, hemisferio);

  return (
    <Polyline
      positions={[[gA.lat, gA.lon], [gB.lat, gB.lon]]}
      pathOptions={{ color: '#06b6d4', weight: 6, opacity: 0.8 }}
      interactive={false}
    />
  );
}

interface TrimExtendControllerProps {
  modo: ModoEdicao; // 'trim' | 'extend'
  linhaLimite: SegmentoSnap | null;
  onLinhaLimite?: (seg: SegmentoSnap | null) => void;
  segmentos: SegmentoSnap[];
  objetos: ObjetoDesenho[];
  zona: number;
  hemisferio: 'N' | 'S';
  onConfirmarTrim?: (objetoId: string, novosPontos: PontoLL[]) => void;
  onConfirmarExtend?: (objetoId: string, novosPontos: PontoLL[]) => void;
}

function TrimExtendController({
  modo,
  linhaLimite,
  onLinhaLimite,
  segmentos,
  objetos,
  zona,
  hemisferio,
  onConfirmarTrim,
  onConfirmarExtend
}: TrimExtendControllerProps) {
  const [hoverSeg, setHoverSeg] = useState<SegmentoSnap | null>(null);
  const [previewLine, setPreviewLine] = useState<{
    points: [number, number][];
    color: string;
    dash?: string;
  } | null>(null);
  const [resultPoints, setResultPoints] = useState<PontoLL[] | null>(null);
  const [resultObjetoId, setResultObjetoId] = useState<string | null>(null);

  useMapEvents({
    mousemove(e) {
      if (modo !== 'trim' && modo !== 'extend') {
        setHoverSeg(null);
        setPreviewLine(null);
        return;
      }

      const { lat, lng } = e.latlng;
      const cursorUtm = geoParaUtm(lat, lng, zona, hemisferio);

      // FASE 1: Selecionar a linha limite
      if (!linhaLimite) {
        const segProx = encontrarSegmentoProximo(cursorUtm, segmentos);
        if (segProx && segProx.distancia < 20) {
          setHoverSeg(segProx.segmento);
        } else {
          setHoverSeg(null);
        }
        setPreviewLine(null);
        setResultPoints(null);
        setResultObjetoId(null);
      } else {
        // FASE 2: Realizar Trim ou Extend em uma polilinha
        setHoverSeg(null);
        
        const segsObjeto = segmentos.filter((s) => s.tipoOrigem === 'objeto' && s.objetoId);
        const segProx = encontrarSegmentoProximo(cursorUtm, segsObjeto);

        if (segProx && segProx.distancia < 20 && segProx.segmento.objetoId) {
          const seg = segProx.segmento;
          const o = objetos.find((x) => x.id === seg.objetoId);
          if (o && o.tipo === 'polilinha' && o.pontos.length >= 2) {
            const idx = seg.segmentoIdx ?? 0;

            if (modo === 'trim') {
              const pi = intersecaoRetasUtm(linhaLimite.a, linhaLimite.b, seg.a, seg.b);
              if (pi) {
                const dx = seg.b.leste - seg.a.leste;
                const dy = seg.b.norte - seg.a.norte;
                const lenSq = dx * dx + dy * dy;
                let onSegment = false;
                if (lenSq > 1e-6) {
                  const t = ((pi.leste - seg.a.leste) * dx + (pi.norte - seg.a.norte) * dy) / lenSq;
                  if (t >= -0.05 && t <= 1.05) onSegment = true;
                }

                if (onSegment) {
                  const g = utmParaGeo(pi.leste, pi.norte, zona, hemisferio);
                  const pIntersecao: PontoLL = { lat: g.lat, lon: g.lon, leste: pi.leste, norte: pi.norte };

                  const distParaA = Math.hypot(cursorUtm.leste - seg.a.leste, cursorUtm.norte - seg.a.norte);
                  const distParaB = Math.hypot(cursorUtm.leste - seg.b.leste, cursorUtm.norte - seg.b.norte);

                  let novosPontos: PontoLL[] = [];
                  let pontosRemovidos: [number, number][] = [];

                  if (distParaA < distParaB) {
                    novosPontos = [pIntersecao, ...o.pontos.slice(idx + 1)];
                    pontosRemovidos = [...o.pontos.slice(0, idx + 1).map((p) => [p.lat, p.lon] as [number, number]), [g.lat, g.lon]];
                  } else {
                    novosPontos = [...o.pontos.slice(0, idx + 1), pIntersecao];
                    pontosRemovidos = [[g.lat, g.lon], ...o.pontos.slice(idx + 1).map((p) => [p.lat, p.lon] as [number, number])];
                  }

                  setResultObjetoId(o.id);
                  setResultPoints(novosPontos);
                  setPreviewLine({
                    points: pontosRemovidos,
                    color: '#ef4444',
                    dash: '4 4'
                  });
                } else {
                  setPreviewLine(null);
                  setResultPoints(null);
                  setResultObjetoId(null);
                }
              } else {
                setPreviewLine(null);
                setResultPoints(null);
                setResultObjetoId(null);
              }
            } else if (modo === 'extend') {
              const q0 = o.pontos[0];
              const qk = o.pontos[o.pontos.length - 1];

              const distQ0 = Math.hypot(cursorUtm.leste - q0.leste, cursorUtm.norte - q0.norte);
              const distQk = Math.hypot(cursorUtm.leste - qk.leste, cursorUtm.norte - qk.norte);

              if (distQk < distQ0) {
                const qk1 = o.pontos[o.pontos.length - 2];
                const dx = qk.leste - qk1.leste;
                const dy = qk.norte - qk1.norte;

                const pi = intersecaoRetasUtm(linhaLimite.a, linhaLimite.b, qk1, qk);
                if (pi) {
                  const dot = (pi.leste - qk.leste) * dx + (pi.norte - qk.norte) * dy;
                  if (dot > 0) {
                    const g = utmParaGeo(pi.leste, pi.norte, zona, hemisferio);
                    const pIntersecao: PontoLL = { lat: g.lat, lon: g.lon, leste: pi.leste, norte: pi.norte };

                    setResultObjetoId(o.id);
                    setResultPoints([...o.pontos, pIntersecao]);
                    setPreviewLine({
                      points: [[qk.lat, qk.lon], [g.lat, g.lon]],
                      color: '#2563eb',
                      dash: '4 4'
                    });
                  } else {
                    setPreviewLine(null);
                    setResultPoints(null);
                    setResultObjetoId(null);
                  }
                }
              } else {
                const q1 = o.pontos[1];
                const dx = q0.leste - q1.leste;
                const dy = q0.norte - q1.norte;

                const pi = intersecaoRetasUtm(linhaLimite.a, linhaLimite.b, q1, q0);
                if (pi) {
                  const dot = (pi.leste - q0.leste) * dx + (pi.norte - q0.norte) * dy;
                  if (dot > 0) {
                    const g = utmParaGeo(pi.leste, pi.norte, zona, hemisferio);
                    const pIntersecao: PontoLL = { lat: g.lat, lon: g.lon, leste: pi.leste, norte: pi.norte };

                    setResultObjetoId(o.id);
                    setResultPoints([pIntersecao, ...o.pontos]);
                    setPreviewLine({
                      points: [[q0.lat, q0.lon], [g.lat, g.lon]],
                      color: '#2563eb',
                      dash: '4 4'
                    });
                  } else {
                    setPreviewLine(null);
                    setResultPoints(null);
                    setResultObjetoId(null);
                  }
                }
              }
            }
          }
        } else {
          setPreviewLine(null);
          setResultPoints(null);
          setResultObjetoId(null);
        }
      }
    },
    click(e) {
      if (modo !== 'trim' && modo !== 'extend') return;

      const { lat, lng } = e.latlng;
      const cursorUtm = geoParaUtm(lat, lng, zona, hemisferio);

      if (!linhaLimite) {
        const segProx = encontrarSegmentoProximo(cursorUtm, segmentos);
        if (segProx && segProx.distancia < 20) {
          onLinhaLimite?.(segProx.segmento);
        }
      } else {
        if (resultObjetoId && resultPoints) {
          if (modo === 'trim') {
            onConfirmarTrim?.(resultObjetoId, resultPoints);
          } else {
            onConfirmarExtend?.(resultObjetoId, resultPoints);
          }
          setPreviewLine(null);
          setResultPoints(null);
          setResultObjetoId(null);
        }
      }
    }
  });

  if (modo !== 'trim' && modo !== 'extend') return null;

  let hoverPolyline = null;
  if (hoverSeg && !linhaLimite) {
    const gA = utmParaGeo(hoverSeg.a.leste, hoverSeg.a.norte, zona, hemisferio);
    const gB = utmParaGeo(hoverSeg.b.leste, hoverSeg.b.norte, zona, hemisferio);
    hoverPolyline = (
      <Polyline
        positions={[[gA.lat, gA.lon], [gB.lat, gB.lon]]}
        pathOptions={{ color: '#06b6d4', weight: 6, opacity: 0.8 }}
        interactive={false}
      />
    );
  }

  let limitePolyline = null;
  if (linhaLimite) {
    const gA = utmParaGeo(linhaLimite.a.leste, linhaLimite.a.norte, zona, hemisferio);
    const gB = utmParaGeo(linhaLimite.b.leste, linhaLimite.b.norte, zona, hemisferio);
    limitePolyline = (
      <Polyline
        positions={[[gA.lat, gA.lon], [gB.lat, gB.lon]]}
        pathOptions={{ color: '#eab308', weight: 4, opacity: 0.9 }}
        interactive={false}
      />
    );
  }

  let prevPolyline = null;
  if (previewLine) {
    prevPolyline = (
      <Polyline
        positions={previewLine.points}
        pathOptions={{ color: previewLine.color, weight: 2.5, dashArray: previewLine.dash, opacity: 0.9 }}
        interactive={false}
      />
    );
  }

  return (
    <>
      {hoverPolyline}
      {limitePolyline}
      {prevPolyline}
    </>
  );
}

export default function MapEditor(props: Props) {
  const {
    vertices, selecionadoId, modo, mostrarRotulos, bloqueado, referencias = [], parcelasCert = [], mostrarCert = true, opacidadeCert = 0.06, parcelaCertSel = null, onSelParcelaCert, verticesVizinho = [], selMulti, objSelMulti, onToggleMulti, onToggleMultiObj, onBoxSelect, onBoxSelectObj, onAdotarVertice, onDblClick, outrasGlebas = [],
    objetos = [], desenhoAtual = [], rotulos = [], centroGleba = null, onMoverCentro, mostrarDivisaConf = true, onAjustarDivisaConf, estiloVertice = 'sigef', objetoSelId = null,
    onMover, onSelecionar, onApagar, onInserir, onCliqueDesenho, onSelecObjeto, onContextMenuObjeto, onMoverPontoObjeto, onMoverRotulo, onPintarDivisa, onPintarConfrontante, onMoverRotuloVertice, centralizarSig,
    onEditarConfrontante,
    conflitos = [],
    focoLatLng = null,
    onCancelDesenho,
    tamNomes = 11,
    verticesIgnorados = [],
    onIgnorarVertice, onConsiderarVertice, onDblClickVertice,
    realceId = null,
    confrontantes = [],
    confrontantePorLado = {},
    zona = 23,
    hemisferio = 'S',
    orto = 'off',
    snapAtivo = false,
    segmentoSelecionado = null,
    onSegmentoSelecionado,
    offsetDistancia = 5,
    onConfirmarParalela,
    copiarPontoBase = null,
    onConfirmarCopiaBase,
    onConfirmarCopiaDestino,
    onDividirSegmento,
    linhaLimite = null,
    onLinhaLimite,
    onConfirmarTrim,
    onConfirmarExtend,
    camadasVisiveis = {},
    camadasBloqueadas = {},
    estilosCamadas = {},
  } = props;

  const [zoom, setZoom] = useState(16);
  const [cursorLatLng, setCursorLatLng] = useState<L.LatLng | null>(null);
  const [hoverSnap, setHoverSnap] = useState<SnapResult | null>(null);
  const isDesenho = ['linha', 'polilinha', 'tracejado', 'cota', 'texto', 'simbolo', 'medir', 'retangulo', 'arco'].includes(modo);



  useEffect(() => {
    if (modo !== 'medir') setCursorLatLng(null);
  }, [modo]);

  // rótulos acompanham o zoom nos DOIS sentidos: encolhem ao afastar (não tampam o desenho) e
  // crescem ao aproximar. Antes ficavam travados em 1x ao afastar, e os blocos ficavam enormes.
  const fzZoom = Math.min(2.2, Math.max(0.6, 1 + (zoom - 16) * 0.2));
  const validos = useMemo(() => vertices.filter(valido), [vertices]);
  // Compila todos os alvos de snap de pontos (vértices)
  const todosAlvosSnap = useMemo(() => {
    const alvos: AlvoSnap[] = [];
    // 1) Vertices da gleba ativa
    for (const v of validos) {
      alvos.push({ leste: v.leste, norte: v.norte });
    }
    // 2) Vertices de outras glebas
    if (outrasGlebas) {
      for (const ring of outrasGlebas) {
        for (const pt of ring) {
          const u = geoParaUtm(pt[0], pt[1], zona, hemisferio);
          alvos.push({ leste: u.leste, norte: u.norte });
        }
      }
    }
    // 3) Referências
    if (referencias) {
      for (const ring of referencias) {
        for (const pt of ring) {
          const u = geoParaUtm(pt[0], pt[1], zona, hemisferio);
          alvos.push({ leste: u.leste, norte: u.norte });
        }
      }
    }
    // 4) Vértices vizinhos
    if (verticesVizinho) {
      for (const pt of verticesVizinho) {
        alvos.push({ leste: pt.leste, norte: pt.norte });
      }
    }
    return alvos;
  }, [validos, outrasGlebas, referencias, verticesVizinho, zona, hemisferio]);

  const segmentosAtivo = useMemo(() => {
    const segs: SegmentoSnap[] = [];
    if (validos.length >= 2) {
      for (let i = 0; i < validos.length; i++) {
        const a = validos[i];
        const b = validos[(i + 1) % validos.length];
        segs.push({
          a: { leste: a.leste, norte: a.norte },
          b: { leste: b.leste, norte: b.norte },
          tipoOrigem: 'perimetro'
        });
      }
    }
    return segs;
  }, [validos]);

  // Compila todos os segmentos do mapa em coordenadas UTM para servir de alvo para snaps e paralela.
  const todosSegmentos = useMemo(() => {
    const segs: SegmentoSnap[] = [];
    const z = zona ?? 23;
    const h = hemisferio ?? 'S';

    const paraUtm = (lat: number, lon: number): AlvoSnap => {
      const u = geoParaUtm(lat, lon, z, h);
      return { leste: u.leste, norte: u.norte };
    };

    // 1) Gleba ativa (vertices)
    const activePts = validos;
    if (activePts.length >= 2) {
      for (let i = 0; i < activePts.length; i++) {
        const a = activePts[i];
        const b = activePts[(i + 1) % activePts.length];
        segs.push({
          a: { leste: a.leste, norte: a.norte },
          b: { leste: b.leste, norte: b.norte },
          tipoOrigem: 'perimetro'
        });
      }
    }

    // 2) Outras glebas (outrasGlebas) - cada uma é um array de [lat, lon]
    if (outrasGlebas) {
      for (const ring of outrasGlebas) {
        if (ring.length >= 2) {
          for (let i = 0; i < ring.length; i++) {
            const a = paraUtm(ring[i][0], ring[i][1]);
            const b = paraUtm(ring[(i + 1) % ring.length][0], ring[(i + 1) % ring.length][1]);
            segs.push({ a, b, tipoOrigem: 'referencia' });
          }
        }
      }
    }

    // 3) Referências (referencias) - cada uma é um array de [lat, lon]
    if (referencias) {
      for (const ring of referencias) {
        if (ring.length >= 2) {
          for (let i = 0; i < ring.length; i++) {
            const a = paraUtm(ring[i][0], ring[i][1]);
            const b = paraUtm(ring[(i + 1) % ring.length][0], ring[(i + 1) % ring.length][1]);
            segs.push({ a, b, tipoOrigem: 'referencia' });
          }
        }
      }
    }

    // 4) Objetos de desenho (objetos) - polilinhas e cotas
    if (objetos) {
      for (const o of objetos) {
        if (o.tipo === 'polilinha' && o.pontos.length >= 2) {
          const count = o.preenchido ? o.pontos.length : o.pontos.length - 1;
          for (let i = 0; i < count; i++) {
            const a = o.pontos[i];
            const b = o.pontos[(i + 1) % o.pontos.length];
            segs.push({
              a: { leste: a.leste, norte: a.norte },
              b: { leste: b.leste, norte: b.norte },
              tipoOrigem: 'objeto',
              objetoId: o.id,
              segmentoIdx: i
            });
          }
        } else if (o.tipo === 'cota' && o.pontos.length >= 2) {
          segs.push({
            a: { leste: o.pontos[0].leste, norte: o.pontos[0].norte },
            b: { leste: o.pontos[1].leste, norte: o.pontos[1].norte },
            tipoOrigem: 'objeto',
            objetoId: o.id,
            segmentoIdx: 0
          });
        }
      }
    }

    return segs;
  }, [validos, outrasGlebas, referencias, objetos, zona, hemisferio]);
  const centro = useMemo<[number, number]>(() => (validos.length ? [validos[0].lat, validos[0].lon] : ESPERA_FELIZ), [validos]);
  const anel = validos.map((v) => [v.lat, v.lon] as [number, number]);
  const centroideGleba = useMemo<[number, number] | null>(() => {
    if (validos.length < 3) return null;
    const la = validos.reduce((s, v) => s + v.lat, 0) / validos.length;
    const lo = validos.reduce((s, v) => s + v.lon, 0) / validos.length;
    return [la, lo];
  }, [validos]);
  // direção PRA FORA do polígono em cada vértice (frame de tela: x=lon, y=-lat), pra o rótulo
  // ficar do lado de fora da linha. Bissetriz do ângulo interno invertida, com recuo pro centróide.
  const dirsRotulo = useMemo<[number, number][]>(() => {
    const n = validos.length;
    if (n < 3) return validos.map(() => [1, 0]);
    const cx = validos.reduce((s, v) => s + v.lon, 0) / n;
    const cy = validos.reduce((s, v) => s + (-v.lat), 0) / n;
    return validos.map((v, i) => {
      const cur = { x: v.lon, y: -v.lat };
      const p = validos[(i - 1 + n) % n], q = validos[(i + 1) % n];
      const n1x = p.lon - cur.x, n1y = -p.lat - cur.y, l1 = Math.hypot(n1x, n1y) || 1;
      const n2x = q.lon - cur.x, n2y = -q.lat - cur.y, l2 = Math.hypot(n2x, n2y) || 1;
      let ox = -(n1x / l1 + n2x / l2), oy = -(n1y / l1 + n2y / l2);
      let ol = Math.hypot(ox, oy);
      const cdx = cur.x - cx, cdy = cur.y - cy;
      if (ol < 0.15 || (ox * cdx + oy * cdy) < 0) { ox = cdx; oy = cdy; ol = Math.hypot(ox, oy) || 1; }
      return [ox / ol, oy / ol];
    });
  }, [validos]);

  // maxZoom 24: além do nível nativo das imagens (20) o satélite é só ampliado — fica borrado,
  // mas permite posicionar vértice com muito mais precisão (pedido do dono, 05/07/2026)
  return (
    <MapContainer center={centro} zoom={validos.length ? 16 : 13} maxZoom={28} style={{ height: '100%', width: '100%' }} scrollWheelZoom zoomControl={false} doubleClickZoom={false}>
      <CursorMapa ativo={modo !== 'navegar' && !bloqueado} />
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Híbrido (Google)">
          <TileLayer attribution="Google" url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" maxZoom={28} maxNativeZoom={20} subdomains={['mt0', 'mt1', 'mt2', 'mt3']} />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Satélite (Esri)">
          <TileLayer attribution="Tiles &copy; Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={28} maxNativeZoom={18} />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Ruas (OpenStreetMap)">
          <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={28} maxNativeZoom={19} />
        </LayersControl.BaseLayer>
      </LayersControl>

      <AjustarLimites vertices={validos} referencias={referencias} />
      <Centralizar sig={centralizarSig} vertices={vertices} />
      <VerZoom onZoom={setZoom} />
      <CaixaSelecao ativo={modo === 'multi'} vertices={[...validos, ...verticesIgnorados]} objetos={objetos} onBoxSelect={onBoxSelect} onBoxSelectObj={onBoxSelectObj} />
      <CliqueMapa modo={modo} onInserir={onInserir} onCliqueDesenho={onCliqueDesenho} onCancelDesenho={onCancelDesenho} onDblClick={onDblClick} onMouseMove={setCursorLatLng} onMouseOut={() => setCursorLatLng(null)} hoverSnap={hoverSnap} zona={zona} hemisferio={hemisferio} onConfirmarCopiaBase={onConfirmarCopiaBase} onConfirmarCopiaDestino={onConfirmarCopiaDestino} />
      <FocoMap latLng={focoLatLng} />

      {/* referências certificadas (snap) */}
      {referencias.filter((r) => r.length >= 2).map((r, i) => (
        <Polyline key={`ref${i}`} positions={r.length >= 3 ? [...r, r[0]] : r} pathOptions={{ color: '#06b6d4', weight: 1.5, dashArray: '5 4' }} />
      ))}

      {/* parcelas certificadas do INCRA: clicáveis (destaca + abre painel) + vértices clicáveis (adotar) */}
      {mostrarCert && parcelasCert.filter((p) => p.anel.length >= 3).map((p, i) => {
        const sel = parcelaCertSel === i;
        return (
          <Polygon key={`pc${i}`} positions={p.anel}
            pathOptions={sel
              ? { color: '#facc15', weight: 3, fillColor: '#facc15', fillOpacity: Math.max(opacidadeCert, 0.12) }
              : { color: '#0891b2', weight: 1.4, fillColor: '#06b6d4', fillOpacity: opacidadeCert }}
            eventHandlers={{ click: () => onSelParcelaCert?.(sel ? null : i) }} />
        );
      })}
      {mostrarCert && parcelasCert.flatMap((p, i) => p.anel.map((pt, j) => {
        const sel = parcelaCertSel === i;
        // rótulo do vértice só aparece com zoom (>=17) ou quando a parcela está selecionada
        const verRotulo = sel || zoom >= 17;
        return (
          <CircleMarker key={`pcv${i}-${j}`} center={pt} radius={sel ? 5 : 4}
            pathOptions={{ color: sel ? '#b45309' : '#0e7490', fillColor: sel ? '#fde047' : '#ffffff', fillOpacity: 1, weight: 1.6 }}
            eventHandlers={{ click: () => { if (isDesenho) onCliqueDesenho?.(pt[0], pt[1]); else onAdotarVertice?.(pt[0], pt[1]); } }}>
            {verRotulo
              ? <Tooltip permanent direction="top" offset={[0, -4]} className="rotulo-cert">{`${j + 1}`}</Tooltip>
              : <Tooltip direction="top" offset={[0, -4]}>Vértice certificado — clique para adotar</Tooltip>}
          </CircleMarker>
        );
      }))}

      {/* vértices de imóveis VIZINHOS já certificados: coordenada oficial + sigma + código. Clicáveis
          para adotar a coordenada num vértice nosso; também são alvo de encaixe ao desenhar. */}
      {verticesVizinho.map((p, i) => {
        const verRotulo = mostrarRotulos || zoom >= 17;
        const detalhe = [
          p.metodo ? `Método ${p.metodo}` : '',
          (p.sigmaX != null || p.sigmaY != null) ? `σ ${numBR(p.sigmaX ?? p.sigmaY ?? 0, 3)} m` : '',
        ].filter(Boolean).join(' · ');
        return (
          <CircleMarker key={`vv${i}`} center={[p.lat, p.lon]} radius={4}
            pathOptions={{ color: '#a21caf', fillColor: '#f0abfc', fillOpacity: 1, weight: 1.6 }}
            eventHandlers={{ click: () => { if (isDesenho) onCliqueDesenho?.(p.lat, p.lon); else onAdotarVertice?.(p.lat, p.lon); } }}>
            {verRotulo
              ? <Tooltip permanent direction="top" offset={[0, -4]} className="rotulo-cert">{p.nome || `V${i + 1}`}</Tooltip>
              : <Tooltip direction="top" offset={[0, -4]}>{`Vizinho certificado ${p.nome}${detalhe ? ` — ${detalhe}` : ''} — clique para adotar`}</Tooltip>}
          </CircleMarker>
        );
      })}

      {/* demais glebas */}
      {outrasGlebas.filter((g) => g.length >= 3).map((g, i) => (
        <Polygon key={`gleba${i}`} positions={g} pathOptions={{ color: '#f97316', weight: 1.5, fillColor: '#f97316', fillOpacity: 0.06, dashArray: '6 4' }} />
      ))}

      {/* polígono ativo */}
      {camadasVisiveis.divisas !== false && (
        anel.length >= 3 ? (
          <Polygon positions={anel} pathOptions={{ color: estilosCamadas.divisas?.cor ?? '#facc15', weight: estilosCamadas.divisas?.espessura ?? 2, fillColor: estilosCamadas.divisas?.cor ?? '#facc15', fillOpacity: 0.12 }} />
        ) : anel.length === 2 ? (
          <Polyline positions={anel} pathOptions={{ color: estilosCamadas.divisas?.cor ?? '#facc15', weight: estilosCamadas.divisas?.espessura ?? 2 }} />
        ) : null
      )}

      {/* cor de apoio das divisas — deslocada pra FORA do polígono, deixando o traçado livre
          pra cor do confrontante (que fica sobre a linha) não se sobreporem */}
      {camadasVisiveis.divisas !== false && validos.length >= 2 && (() => {
        const cLat = validos.reduce((s, p) => s + p.lat, 0) / validos.length;
        const cLon = validos.reduce((s, p) => s + p.lon, 0) / validos.length;
        const lats = validos.map((p) => p.lat), lons = validos.map((p) => p.lon);
        const maxDim = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lons) - Math.min(...lons)) || 0.0005;
        const off = maxDim * 0.012;
        return validos.map((v, i) => {
          const cor = v.representacao === 'linha-ideal'
            ? (modo === 'divisa' ? '#ffffff' : null)
            : corDivisa(v.representacao);
          if (!cor) return null;
          const prox = validos[(i + 1) % validos.length];
          if (!prox || (validos.length < 3 && i === validos.length - 1)) return null;
          let nx = -(prox.lat - v.lat), ny = prox.lon - v.lon;
          const len = Math.hypot(nx, ny) || 1; nx /= len; ny /= len;
          const mLat = (v.lat + prox.lat) / 2, mLon = (v.lon + prox.lon) / 2;
          if ((mLon - cLon) * nx + (mLat - cLat) * ny < 0) { nx = -nx; ny = -ny; }
          const a: [number, number] = [v.lat + ny * off, v.lon + nx * off];
          const b: [number, number] = [prox.lat + ny * off, prox.lon + nx * off];
          return (
            <Polyline key={`div${v.id}-${v.representacao}`} positions={[a, b]} pathOptions={{ color: cor, weight: estilosCamadas.divisas?.espessura ? estilosCamadas.divisas.espessura * 2.5 : (zoom >= 18 ? 7 : 5), opacity: 0.8 }}>
              <Tooltip sticky direction="top" opacity={0.9}><span style={{ color: cor }}>Divisa: {REPRES_LABEL[v.representacao || ''] || v.representacao}</span></Tooltip>
            </Polyline>
          );
        });
      })()}

      {/* Roteamento visual de confrontantes aplicados sobre os segmentos */}
      {camadasVisiveis.divisas !== false && confrontantePorLado && confrontantes && validos.map((v, i) => {
        if (validos.length < 2) return null;
        const prox = validos[(i + 1) % validos.length];
        if (!prox || (validos.length < 3 && i === validos.length - 1)) return null;
        
        const idxOriginal = vertices.findIndex((x) => x.id === v.id);
        if (idxOriginal === -1) return null;
        
        const confId = confrontantePorLado[idxOriginal];
        if (!confId) return null;
        const conf = confrontantes.find((c) => c.id === confId);
        if (!conf) return null;

        const a: [number, number] = [v.lat, v.lon];
        const b: [number, number] = [prox.lat, prox.lon];
        const corConf = corPorConfrontante(conf.id);

        return (
          <Polyline
            key={`conf-seg-${v.id}`}
            positions={[a, b]}
            pathOptions={{ color: corConf, weight: estilosCamadas.divisas?.espessura ?? 4, opacity: 0.85, dashArray: '4 8' }}
          >
            <Tooltip sticky direction="top" opacity={0.9}>
              <span className="font-bold" style={{ color: corConf }}>Confrontante: {conf.nome || '(sem nome)'}</span>
            </Tooltip>
          </Polyline>
        );
      })}

      {/* Realce de conflitos (sobreposição/vãos) */}
      {conflitos.map((conf) => {
        const v = validos[conf.ladoIdx];
        if (!v) return null;
        const a: [number, number] = [v.lat, v.lon];
        const prox = validos[(conf.ladoIdx + 1) % validos.length];
        if (!prox) return null;
        const cor = conf.tipo === 'sobreposicao' ? '#ec4899' : '#06b6d4';
        return (
          <Polyline 
            key={`conf-${conf.ladoIdx}`} 
            positions={[a, [prox.lat, prox.lon]]} 
            pathOptions={{ color: cor, weight: 10, opacity: 0.9 }} 
          />
        );
      })}

      {/* objetos de desenho */}
      {objetos.map((o) => {
        let camadaKey = 'polilinhas';
        if (o.tipo === 'polilinha') {
          camadaKey = o.carTema ? 'ambientais' : 'polilinhas';
        } else if (o.tipo === 'texto') {
          camadaKey = 'textos';
        } else if (o.tipo === 'cota') {
          camadaKey = 'cotas';
        } else if (o.tipo === 'simbolo') {
          camadaKey = 'simbolos';
        }

        const visivel = camadasVisiveis[camadaKey] !== false;
        const bloqueada = camadasBloqueadas[camadaKey] === true;
        const estiloCamada = estilosCamadas[camadaKey];

        if (!visivel) return null;

        const pos = o.pontos.map((p) => [p.lat, p.lon] as [number, number]);
        const sel = o.id === objetoSelId;
        const multiSel = !!objSelMulti && objSelMulti.has(o.id); // marcado na caixa de seleção em lote

        if (o.tipo === 'polilinha') {
          const estilo = o.estiloLinha ?? (o.tracejado ? 'tracejado' : 'solido');
          const dashArray = estilo === 'tracejado' ? '8 6' : estilo === 'pontilhado' ? '2 4' : undefined;
          // Curva de nível com cor AUTOMÁTICA fica BRANCA no mapa (fundo de satélite escuro) — mais legível.
          const corAutoCurva = o.curvaNivel != null && (o.cor == null || o.cor === 'auto');
          const comum = {
            color: multiSel ? '#f59e0b' : (corAutoCurva ? '#ffffff' : (o.cor ?? estiloCamada?.cor ?? '#2563eb')),
            weight: (o.espessura ?? estiloCamada?.espessura ?? 1.5) + (sel ? 1 : 0) + (multiSel ? 1.5 : 0),
            dashArray
          };
          const fechado = o.preenchido && pos.length >= 3;
          let fillColor = o.corPreenchimento ?? o.cor ?? estiloCamada?.cor ?? '#2563eb';
          let fillOpacity = 0.4;
          if (fechado && o.achura && o.achura !== 'nenhuma') {
            fillColor = `url(#pat-${o.id})`;
            fillOpacity = 0.95;
          }
          return (
            <Fragment key={o.id}>
              {o.curvaNivel != null
                // Curva de nível: só DESENHO, não é editável (nada de selecionar/arrastar pontos).
                ? <Polyline positions={pos} pathOptions={comum} interactive={false} />
                : fechado
                ? <Polygon positions={pos} pathOptions={{ ...comum, fillColor, fillOpacity }} eventHandlers={{ click: () => { if (!bloqueada) { if (modo === 'multi') onToggleMultiObj?.(o.id); else onSelecObjeto?.(o.id); } }, contextmenu: (e) => { if (!bloqueada) onContextMenuObjeto?.(o.id, o.tipo, e.originalEvent.clientX, e.originalEvent.clientY); } }} />
                : (
                  <>
                    <Polyline positions={pos} pathOptions={{ color: '#000', opacity: 0, weight: 16 }} eventHandlers={{ click: () => { if (!bloqueada) { if (modo === 'multi') onToggleMultiObj?.(o.id); else onSelecObjeto?.(o.id); } }, contextmenu: (e) => { if (!bloqueada) onContextMenuObjeto?.(o.id, o.tipo, e.originalEvent.clientX, e.originalEvent.clientY); } }} />
                    <Polyline positions={pos} pathOptions={comum} eventHandlers={{ click: () => { if (!bloqueada) { if (modo === 'multi') onToggleMultiObj?.(o.id); else onSelecObjeto?.(o.id); } }, contextmenu: (e) => { if (!bloqueada) onContextMenuObjeto?.(o.id, o.tipo, e.originalEvent.clientX, e.originalEvent.clientY); } }} />
                  </>
                )}
              {sel && !bloqueada && pos.map((p, idx) => (
                <CircleMarker key={`c${idx}`} center={p} radius={5} pathOptions={{ color: '#ef4444', fillColor: '#fff', fillOpacity: 1 }} />
              ))}
              {sel && !bloqueada && pos.map((p, idx) => (
                <Marker key={`h${idx}`} position={p} draggable opacity={0}
                  eventHandlers={{
                    dragend: (e) => { const ll = (e.target as L.Marker).getLatLng(); onMoverPontoObjeto?.(o.id, idx, ll.lat, ll.lng); }
                  }} />
              ))}
            </Fragment>
          );
        }
        if (o.tipo === 'cota') {
          const p0 = o.pontos[0];
          const p1 = o.pontos[1];
          const utmA = {
            leste: p0.leste ?? geoParaUtm(p0.lat, p0.lon, zona, hemisferio).leste,
            norte: p0.norte ?? geoParaUtm(p0.lat, p0.lon, zona, hemisferio).norte,
          };
          const utmB = {
            leste: p1.leste ?? geoParaUtm(p1.lat, p1.lon, zona, hemisferio).leste,
            norte: p1.norte ?? geoParaUtm(p1.lat, p1.lon, zona, hemisferio).norte,
          };
          const { alOffset, blOffset } = obterPontosCotaOffset(utmA, utmB);
          const g0 = utmParaGeo(alOffset.leste, alOffset.norte, zona, hemisferio);
          const g1 = utmParaGeo(blOffset.leste, blOffset.norte, zona, hemisferio);

          const posOffset: [number, number][] = [[g0.lat, g0.lon], [g1.lat, g1.lon]];
          const mid: [number, number] = [(g0.lat + g1.lat) / 2, (g0.lon + g1.lon) / 2];

          const corCota = o.cor ?? estiloCamada?.cor ?? '#b91c1c';
          const espessuraCota = o.espessura ?? estiloCamada?.espessura ?? 1.2;

          return (
            <Fragment key={o.id}>
              <Polyline positions={[[p0.lat, p0.lon], [g0.lat, g0.lon]]} pathOptions={{ color: corCota, weight: 0.8, dashArray: '2 3' }} />
              <Polyline positions={[[p1.lat, p1.lon], [g1.lat, g1.lon]]} pathOptions={{ color: corCota, weight: 0.8, dashArray: '2 3' }} />
              <Polyline positions={posOffset} pathOptions={{ color: '#000', opacity: 0, weight: 16 }} eventHandlers={{ click: () => { if (!bloqueada) { if (modo === 'multi') onToggleMultiObj?.(o.id); else onSelecObjeto?.(o.id); } }, contextmenu: (e) => { if (!bloqueada) onContextMenuObjeto?.(o.id, o.tipo, e.originalEvent.clientX, e.originalEvent.clientY); } }} />
              <Polyline positions={posOffset} pathOptions={{ color: corCota, weight: espessuraCota + (sel ? 0.8 : 0) }} eventHandlers={{ click: () => { if (!bloqueada) { if (modo === 'multi') onToggleMultiObj?.(o.id); else onSelecObjeto?.(o.id); } }, contextmenu: (e) => { if (!bloqueada) onContextMenuObjeto?.(o.id, o.tipo, e.originalEvent.clientX, e.originalEvent.clientY); } }} />
              <Marker position={mid} icon={L.divIcon({ className: 'cota-label', html: `<div style="font-size:10px;color:${corCota};background:#fff;padding:0 2px;border:1px solid ${corCota};border-radius:2px;width:max-content;display:inline-block">${numBR(distanciaCota(o))} m</div>`, iconSize: [1, 1], iconAnchor: [0, 8] })}
                eventHandlers={{ click: () => { if (!bloqueada) { if (modo === 'multi') onToggleMultiObj?.(o.id); else onSelecObjeto?.(o.id); } }, contextmenu: (e) => { if (!bloqueada) onContextMenuObjeto?.(o.id, o.tipo, e.originalEvent.clientX, e.originalEvent.clientY); } }} />
              {sel && !bloqueada && pos.map((p, idx) => (
                <Marker key={`hc${idx}`} position={p} draggable opacity={0}
                  eventHandlers={{
                    dragend: (e) => { const ll = (e.target as L.Marker).getLatLng(); onMoverPontoObjeto?.(o.id, idx, ll.lat, ll.lng); }
                  }} />
              ))}
            </Fragment>
          );
        }
        if (o.tipo === 'simbolo') {
          const tam = o.tamanho ?? 30;
          const html = `<svg viewBox="-14 -14 28 28" width="${tam}" height="${tam}" style="overflow:visible;filter:drop-shadow(0 1px 1px rgba(0,0,0,.4))">${simboloSvgInterno(o.simbolo ?? '')}</svg>`;
          return (
            <Marker key={o.id} position={[o.pontos[0].lat, o.pontos[0].lon]} draggable={modo === 'navegar' && !bloqueada}
              icon={L.divIcon({ className: 'simbolo-obj', html, iconSize: [tam, tam], iconAnchor: [tam / 2, tam / 2] })}
              eventHandlers={{
                click: () => { if (!bloqueada) { if (modo === 'multi') onToggleMultiObj?.(o.id); else onSelecObjeto?.(o.id); } },
                contextmenu: (e) => { if (!bloqueada) onContextMenuObjeto?.(o.id, o.tipo, e.originalEvent.clientX, e.originalEvent.clientY); },
                dragend: (e) => { const ll = (e.target as L.Marker).getLatLng(); onMoverPontoObjeto?.(o.id, 0, ll.lat, ll.lng); }
              }} />
          );
        }
        // texto
        return (
          <Marker key={o.id} position={[o.pontos[0].lat, o.pontos[0].lon]} draggable={modo === 'navegar' && !bloqueada} icon={iconeTexto(o, sel, estiloCamada?.cor)}
            eventHandlers={{
              click: () => { if (!bloqueada) { if (modo === 'multi') onToggleMultiObj?.(o.id); else onSelecObjeto?.(o.id); } },
              contextmenu: (e) => { if (!bloqueada) onContextMenuObjeto?.(o.id, o.tipo, e.originalEvent.clientX, e.originalEvent.clientY); },
              dragend: (e) => { const ll = (e.target as L.Marker).getLatLng(); onMoverPontoObjeto?.(o.id, 0, ll.lat, ll.lng); }
            }} />
        );
      })}

      {/* desenho em andamento */}
      {desenhoAtual.length >= 2 && <Polyline positions={desenhoAtual} pathOptions={{ color: '#2563eb', weight: 1.5, dashArray: '4 3' }} />}
      {desenhoAtual.map((p, i) => <CircleMarker key={`da${i}`} center={p} radius={3} pathOptions={{ color: '#2563eb', fillColor: '#fff', fillOpacity: 1 }} />)}
      {/* linha elástica com distância/azimute ao vivo, do último ponto até o cursor */}
      {['linha', 'polilinha', 'tracejado', 'cota', 'medir'].includes(modo) && desenhoAtual.length >= 1 && (
        <MedidaDinamica base={desenhoAtual[desenhoAtual.length - 1]} orto={orto} zona={zona} hemisferio={hemisferio} />
      )}

      {/* dados-chave no centro da gleba (arrastável no modo navegar) */}
      {centroGleba && centroGleba.linhas.length > 0 && (() => {
        const pos: [number, number] | null = (Number.isFinite(centroGleba.lat) && Number.isFinite(centroGleba.lon))
          ? [centroGleba.lat as number, centroGleba.lon as number] : centroideGleba;
        if (!pos) return null;
        const arrastavel = modo === 'navegar' && !!onMoverCentro;
        return (
          <Marker position={pos} draggable={arrastavel} interactive={arrastavel}
            icon={iconeCentro(centroGleba.linhas, fzZoom, arrastavel)}
            eventHandlers={arrastavel ? { dragend(e) { const ll = (e.target as L.Marker).getLatLng(); onMoverCentro?.(ll.lat, ll.lng); } } : undefined} />
        );
      })()}

      {/* rótulos de confrontante (arrastáveis) */}
      {camadasVisiveis.divisas !== false && rotulos.map((r) => (
        <Marker key={r.id} position={[r.lat, r.lon]} draggable={modo === 'navegar' && !camadasBloqueadas.divisas} icon={iconeRotulo(r, fzZoom)}
          eventHandlers={{
            click: () => { if (!camadasBloqueadas.divisas) onEditarConfrontante?.(r.id); },
            dragend: (e) => { const ll = (e.target as L.Marker).getLatLng(); onMoverRotulo?.(r.id, ll.lat, ll.lng); }
          }} />
      ))}

      {/* anel de destaque dos vértices multi-selecionados (modo "triângulo") */}
      {camadasVisiveis.divisas !== false && modo === 'multi' && selMulti && [...validos, ...verticesIgnorados].filter((v) => selMulti.has(v.id)).map((v) => (
        <CircleMarker key={`ms${v.id}`} center={[v.lat, v.lon]} radius={9}
          pathOptions={{ color: '#f59e0b', weight: 2.5, fillColor: '#fde047', fillOpacity: 0.5 }} />
      ))}

      {/* vértices */}
      {camadasVisiveis.divisas !== false && validos.map((v) => (
        <Marker
          key={v.id}
          position={[v.lat, v.lon]}
          draggable={modo === 'navegar' && !bloqueado && !camadasBloqueadas.divisas}
          zIndexOffset={500}
          icon={iconeVertice(v, v.id === selecionadoId || v.id === realceId)}
          eventHandlers={{
            click() {
              if (camadasBloqueadas.divisas) return;
              if (isDesenho) onCliqueDesenho?.(v.lat, v.lon);
              else if (modo === 'apagar') onApagar(v.id);
              else if (modo === 'divisa') onPintarDivisa?.(v.id);
              else if (modo === 'confrontante') onPintarConfrontante?.(v.id);
              else if (modo === 'ignorar') onIgnorarVertice?.(v.id);
              else if (modo === 'multi') onToggleMulti?.(v.id);
              else if (modo === 'copiar_base') onConfirmarCopiaBase?.({ lat: v.lat, lon: v.lon, leste: v.leste, norte: v.norte });
              else if (modo === 'copiar_destino') onConfirmarCopiaDestino?.({ lat: v.lat, lon: v.lon, leste: v.leste, norte: v.norte });
              else onSelecionar(v.id);
            },
            dragend(e) { const ll = (e.target as L.Marker).getLatLng(); onMover(v.id, ll.lat, ll.lng); },
            dblclick(e) { L.DomEvent.stopPropagation(e); onDblClickVertice?.(v, e.originalEvent.clientX, e.originalEvent.clientY); },
          }}
        />
      ))}

      {/* TIQUE DE TROCA DE CONFRONTANTE nos marcos M (sincronizado com a planta via divisaConfAz) */}
      {camadasVisiveis.divisas !== false && mostrarDivisaConf && validos.length >= 3 && (() => {
        const cLat = validos.reduce((s, v) => s + v.lat, 0) / validos.length;
        const cLon = validos.reduce((s, v) => s + v.lon, 0) / validos.length;
        const mLat = 111320, mLon = 111320 * Math.cos((cLat * Math.PI) / 180);
        const lats = validos.map((v) => v.lat), lons = validos.map((v) => v.lon);
        const wM = (Math.max(...lons) - Math.min(...lons)) * mLon, hM = (Math.max(...lats) - Math.min(...lats)) * mLat;
        const L = Math.min(160, Math.max(20, Math.hypot(wM, hM) * 0.16)); // metros (dobro do tamanho, mais visível)
        const arrastavel = modo === 'navegar' && !!onAjustarDivisaConf && !camadasBloqueadas.divisas;
        return validos.filter((v) => v.tipo === 'M').map((v) => {
          let az = v.divisaConfAz;
          if (az == null) { const dN = (v.lat - cLat) * mLat, dE = (v.lon - cLon) * mLon; let a = (Math.atan2(dE, dN) * 180) / Math.PI; if (a < 0) a += 360; az = a; }
          const a = (az * Math.PI) / 180;
          const eLat = v.lat + (L * Math.cos(a)) / mLat;
          const eLon = v.lon + (L * Math.sin(a)) / mLon;
          return (
            <Fragment key={`dc${v.id}`}>
              {/* halo escuro + linha branca grossa: bem visível sobre satélite ou mapa claro */}
              <Polyline positions={[[v.lat, v.lon], [eLat, eLon]]} pathOptions={{ color: '#0f172a', weight: 6, opacity: 0.65 }} />
              <Polyline positions={[[v.lat, v.lon], [eLat, eLon]]} pathOptions={{ color: '#ffffff', weight: 3 }} />
              {arrastavel && (
                <Marker position={[eLat, eLon]} draggable
                  icon={L_DIVISA_ICON}
                  eventHandlers={{ dragend(e) { const ll = (e.target as L.Marker).getLatLng(); const dN = (ll.lat - v.lat) * mLat, dE = (ll.lng - v.lon) * mLon; let na = (Math.atan2(dE, dN) * 180) / Math.PI; if (na < 0) na += 360; onAjustarDivisaConf?.(v.id, +na.toFixed(1), v.divisaConfLen ?? 150); } }} />
              )}
            </Fragment>
          );
        });
      })()}

      {/* vértices IGNORADOS: pontos brancos com borda preta, super visíveis; no modo "considerar", clicar reinsere */}
      {camadasVisiveis.divisas !== false && verticesIgnorados.filter(valido).map((v) => (
        <CircleMarker key={`ign${v.id}`} center={[v.lat, v.lon]} radius={5.5}
          pathOptions={{ color: '#000000', fillColor: '#ffffff', fillOpacity: 1.0, weight: 1.8 }}
          eventHandlers={{
            click() {
              if (modo === 'multi') {
                onToggleMulti?.(v.id);
              } else if (modo === 'considerar' && !camadasBloqueadas.divisas) {
                onConsiderarVertice?.(v.id);
              }
            }
          }} />
      ))}

      {/* Linhas-guia dos rótulos dos vértices que foram movidos manualmente para evitar confusão */}
      {camadasVisiveis.divisas !== false && (mostrarRotulos && (zoom >= 15 || validos.length <= 20)) && validos.map((v) => {
        if (!v.posRotulo) return null;
        return (
          <Polyline
            key={`guia${v.id}`}
            positions={[[v.lat, v.lon], [v.posRotulo.lat, v.posRotulo.lon]]}
            pathOptions={{ color: '#64748b', weight: 1.2, dashArray: '4 4', interactive: false }}
          />
        );
      })}

      {/* rótulos dos vértices (caixinha branca; arrastáveis com a ferramenta mover/F5; ocultação adaptativa para evitar poluição visual) */}
      <MarcadoresRotulos
        validos={validos}
        camadasVisiveis={camadasVisiveis}
        camadasBloqueadas={camadasBloqueadas}
        mostrarRotulos={mostrarRotulos}
        zoom={zoom}
        estiloVertice={estiloVertice}
        tamNomes={tamNomes}
        fzZoom={fzZoom}
        dirsRotulo={dirsRotulo}
        modo={modo}
        onSelecionar={onSelecionar}
        onMoverRotuloVertice={onMoverRotuloVertice}
      />

      {/* Régua / Medições no Mapa */}
      {modo === 'medir' && (() => {
        const segmentOverlays = [];
        let distanciaTotal = 0;

        for (let i = 0; i < desenhoAtual.length - 1; i++) {
          const ptA = desenhoAtual[i];
          const ptB = desenhoAtual[i + 1];
          const mid: [number, number] = [(ptA[0] + ptB[0]) / 2, (ptA[1] + ptB[1]) / 2];

          const utmA = geoParaUtm(ptA[0], ptA[1], zona, hemisferio);
          const utmB = geoParaUtm(ptB[0], ptB[1], zona, hemisferio);
          const distSeg = distancia({ e: utmA.leste, n: utmA.norte }, { e: utmB.leste, n: utmB.norte });
          const azSeg = azimute({ e: utmA.leste, n: utmA.norte }, { e: utmB.leste, n: utmB.norte });

          distanciaTotal += distSeg;

          segmentOverlays.push(
            <Marker key={`ruler-seg-${i}`} position={mid} interactive={false}
              icon={L.divIcon({ className: 'bg-transparent border-0', html: '', iconSize: [1, 1] })}>
              <Tooltip permanent direction="center" className="no-print font-bold text-[10px] bg-background/90 text-foreground border border-blue-500 px-1.5 py-0.5 rounded-sm shadow whitespace-nowrap">
                <span>{numBR(distSeg, 2)}m | {azimuteDMS(azSeg)}</span>
              </Tooltip>
            </Marker>
          );
        }

        let cursorOverlay = null;
        if (desenhoAtual.length > 0 && cursorLatLng) {
          const lastPt = desenhoAtual[desenhoAtual.length - 1];
          const ptCursor = [cursorLatLng.lat, cursorLatLng.lng] as [number, number];
          const midCursor: [number, number] = [(lastPt[0] + ptCursor[0]) / 2, (lastPt[1] + ptCursor[1]) / 2];

          const utmLast = geoParaUtm(lastPt[0], lastPt[1], zona, hemisferio);
          const utmCursor = geoParaUtm(ptCursor[0], ptCursor[1], zona, hemisferio);
          const distCursor = distancia({ e: utmLast.leste, n: utmLast.norte }, { e: utmCursor.leste, n: utmCursor.norte });
          const azCursor = azimute({ e: utmLast.leste, n: utmLast.norte }, { e: utmCursor.leste, n: utmCursor.norte });

          cursorOverlay = (
            <>
              <Polyline positions={[lastPt, ptCursor]} pathOptions={{ color: '#f59e0b', weight: 1.5, dashArray: '3 3' }} />
              <Marker position={midCursor} interactive={false}
                icon={L.divIcon({ className: 'bg-transparent border-0', html: '', iconSize: [1, 1] })}>
                <Tooltip permanent direction="center" className="no-print font-medium text-[10px] bg-amber-500/90 text-white border border-amber-600 px-1.5 py-0.5 rounded-sm shadow whitespace-nowrap">
                  <span>{numBR(distCursor, 2)}m | {azimuteDMS(azCursor)}</span>
                </Tooltip>
              </Marker>
            </>
          );
        }

        return (
          <>
            {segmentOverlays}
            {cursorOverlay}
          </>
        );
      })()}

      {/* Painel da Régua de Medição */}
      {modo === 'medir' && (() => {
        let totalDist = 0;
        for (let i = 0; i < desenhoAtual.length - 1; i++) {
          const ptA = desenhoAtual[i];
          const ptB = desenhoAtual[i + 1];
          const utmA = geoParaUtm(ptA[0], ptA[1], zona, hemisferio);
          const utmB = geoParaUtm(ptB[0], ptB[1], zona, hemisferio);
          totalDist += distancia({ e: utmA.leste, n: utmA.norte }, { e: utmB.leste, n: utmB.norte });
        }

        return (
          <div className="absolute bottom-6 left-2 z-[1000] w-64 rounded-xl border border-blue-500/30 bg-background/95 p-3 text-xs shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between border-b pb-1.5 mb-2">
              <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <Ruler className="size-4" /> Régua de Medição
              </span>
              <button type="button" onClick={onCancelDesenho} className="font-bold hover:text-red-500 text-muted-foreground uppercase text-[10px]">
                Limpar
              </button>
            </div>
            
            <div className="space-y-1.5">
              <div className="flex justify-between items-baseline">
                <span className="text-muted-foreground">Distância Total:</span>
                <span className="text-base font-bold font-mono">{numBR(totalDist, casasTela(2))} m</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pontos marcados:</span>
                <span className="font-bold font-mono">{desenhoAtual.length}</span>
              </div>
              
              <div className="my-1.5 h-px bg-border/60" />
              
              <p className="text-[10px] leading-snug text-muted-foreground">
                <strong>Como usar:</strong> Clique em pontos do mapa para medir distâncias e azimutes. Use o clique com botão direito ou pressione <strong>Esc</strong> para desfazer o último ponto ou fechar.
              </p>
            </div>
          </div>
        );
      })()}

      {/* Legenda de cores dos confrontantes (só os já aplicados em algum lado) */}
      {confrontantePorLado && confrontantes && (() => {
        const usados = new Set(Object.values(confrontantePorLado));
        const lista = confrontantes.filter((c) => usados.has(c.id));
        if (!lista.length) return null;
        return (
          <div
            className="absolute bottom-6 right-2 z-[1000] max-h-40 max-w-56 overflow-y-auto rounded-sm border bg-background/90 px-2 py-1.5 text-[11px] shadow backdrop-blur"
            onWheel={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 font-semibold text-muted-foreground">Confrontantes</div>
            {lista.map((c) => (
              <div key={c.id} className="flex items-center gap-1.5 py-0.5">
                <span className="inline-block h-0 w-5 shrink-0 border-t-[3px] border-dashed" style={{ borderColor: corPorConfrontante(c.id) }} />
                <span className="truncate">{c.nome || '(sem nome)'}</span>
              </div>
            ))}
          </div>
        );
      })()}

      {snapAtivo && isDesenho && (
        <SnapIndicator
          snapAtivo={snapAtivo}
          alvos={todosAlvosSnap}
          segmentos={todosSegmentos}
          pontoOrigem={desenhoAtual.length > 0 ? (() => {
            const p = desenhoAtual[desenhoAtual.length - 1];
            const u = geoParaUtm(p[0], p[1], zona, hemisferio);
            return { leste: u.leste, norte: u.norte };
          })() : null}
          zona={zona}
          hemisferio={hemisferio}
          onSnapChange={setHoverSnap}
        />
      )}

      {modo === 'paralela' && (
        <ParalelaController
          modo={modo}
          segmentos={todosSegmentos}
          zona={zona}
          hemisferio={hemisferio}
          segmentoSelecionado={segmentoSelecionado}
          onSegmentoSelecionado={onSegmentoSelecionado}
          offsetDistancia={offsetDistancia}
          onConfirmarParalela={onConfirmarParalela}
        />
      )}

      {modo === 'copiar_destino' && copiarPontoBase && cursorLatLng && selMulti && (() => {
        const targetPts = validos.filter((v) => selMulti.has(v.id));
        if (targetPts.length === 0) return null;
        const cursorUtm = geoParaUtm(cursorLatLng.lat, cursorLatLng.lng, zona, hemisferio);
        const dL = cursorUtm.leste - copiarPontoBase.leste;
        const dN = cursorUtm.norte - copiarPontoBase.norte;
        const previewPts = targetPts.map((v) => {
          const l = v.leste + dL;
          const n = v.norte + dN;
          const g = utmParaGeo(l, n, zona, hemisferio);
          return [g.lat, g.lon] as [number, number];
        });
        const refLine = [[copiarPontoBase.lat, copiarPontoBase.lon], [cursorLatLng.lat, cursorLatLng.lng]] as [number, number][];
        return (
          <>
            <Polyline positions={refLine} pathOptions={{ color: '#ef4444', weight: 1.5, dashArray: '3 3' }} interactive={false} />
            <Polyline positions={previewPts} pathOptions={{ color: '#2563eb', weight: 2, dashArray: '4 4' }} interactive={false} />
            {previewPts.map((p, idx) => (
              <CircleMarker key={`cp${idx}`} center={p} radius={4} pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.8 }} interactive={false} />
            ))}
          </>
        );
      })()}

      {modo === 'dividir' && (
        <DividirController
          modo={modo}
          segmentosAtivo={segmentosAtivo}
          validos={validos}
          zona={zona}
          hemisferio={hemisferio}
          onDividirSegmento={onDividirSegmento}
        />
      )}

      {(modo === 'trim' || modo === 'extend') && (
        <TrimExtendController
          modo={modo}
          linhaLimite={linhaLimite}
          onLinhaLimite={onLinhaLimite}
          segmentos={todosSegmentos}
          objetos={objetos}
          zona={zona}
          hemisferio={hemisferio}
          onConfirmarTrim={onConfirmarTrim}
          onConfirmarExtend={onConfirmarExtend}
        />
      )}
    </MapContainer>
  );
}
