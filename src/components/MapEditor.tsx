'use client';

import { useEffect, useMemo, useRef, useState, Fragment } from 'react';
import { Ruler } from 'lucide-react';
import { MapContainer, TileLayer, Polygon, Polyline, Marker, CircleMarker, Rectangle, LayersControl, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { Vertex, ObjetoDesenho, Confrontante, VerticeVizinho } from '@/lib/topo/types';
import { distanciaCota, obterPontosCotaOffset } from '@/lib/topo/objetos';
import { simboloSvgInterno } from '@/lib/topo/simbolos';
import { corDivisa, REPRES_LABEL } from '@/lib/topo/sigefVocab';
import { corPorConfrontante } from '@/lib/topo/coresConfrontante';
import { numBR, azimute, distancia, azimuteDMS } from '@/lib/topo/geometry';
import { casasTela } from '@/lib/store/preferencias';
import { geoParaUtm, utmParaGeo } from '@/lib/topo/coords';

export type ModoEdicao = 'navegar' | 'inserir' | 'apagar' | 'linha' | 'polilinha' | 'tracejado' | 'cota' | 'texto' | 'simbolo' | 'divisa' | 'confrontante' | 'ignorar' | 'considerar' | 'multi' | 'medir';

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
  onToggleMulti?: (id: string) => void;
  onBoxSelect?: (ids: string[]) => void;
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
  onContextMenuMapa?: (lat: number, lon: number, x: number, y: number) => void;
  confrontantes?: Confrontante[];
  confrontantePorLado?: Record<number, string>;
  onEditarConfrontante?: (id: string) => void;
  zona?: number;
  hemisferio?: 'N' | 'S';
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

function iconeTexto(o: ObjetoDesenho, sel: boolean) {
  const al = o.alinhamento === 'center' ? 'center' : o.alinhamento === 'right' ? 'right' : 'left';
  return L.divIcon({
    className: 'objeto-texto',
    html: `<div style="font-size:${o.tamanho ?? 12}px;color:${o.cor ?? '#000'};background:#fff;border:1px solid #ccc;border-radius:3px;padding:2px 5px;white-space:nowrap;text-align:${al};box-shadow:0 1px 3px rgba(0,0,0,0.3);width:max-content;display:inline-block;${sel ? 'outline:1px dashed #ef4444;' : ''}">${(o.texto ?? '').replace(/</g, '&lt;')}</div>`,
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
const iconeCentro = (linhas: string[], fator = 1) => {
  const corpo = linhas.map((l, i) => `<div style="font-weight:${i === 0 ? 700 : 600};font-size:${Math.round((i === 0 ? 13 : 11) * fator)}px">${(l || '').replace(/</g, '&lt;')}</div>`).join('');
  // caixa branca sólida e centrada no ponto (legível sobre o satélite); não captura clique
  return L.divIcon({
    className: 'gleba-centro',
    html: `<div style="transform:translate(-50%,-50%);display:inline-block;pointer-events:none;color:#000;background:#fff;border:1.5px solid #222;border-radius:5px;padding:3px 9px;text-align:center;line-height:1.3;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.5);width:max-content">${corpo}</div>`,
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
      if (b.isValid()) map.fitBounds(b, { padding: [50, 50] });
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
function CaixaSelecao({ ativo, vertices, onBoxSelect }: { ativo: boolean; vertices: Vertex[]; onBoxSelect?: (ids: string[]) => void }) {
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
      }
      setInicio(null); setAtual(null);
    },
  });
  if (!ativo || !inicio || !atual) return null;
  return <Rectangle bounds={L.latLngBounds(inicio, atual)} pathOptions={{ color: '#f59e0b', weight: 1.5, dashArray: '4 3', fillColor: '#f59e0b', fillOpacity: 0.12 }} />;
}

function CliqueMapa({ modo, onInserir, onCliqueDesenho, onCancelDesenho, onDblClick, onMouseMove, onMouseOut }: {
  modo: ModoEdicao;
  onInserir: (lat: number, lon: number) => void;
  onCliqueDesenho?: (lat: number, lon: number) => void;
  onCancelDesenho?: () => void;
  onDblClick?: (lat: number, lon: number) => void;
  onMouseMove?: (latlng: L.LatLng) => void;
  onMouseOut?: () => void;
}) {
  useMapEvents({
    click(e) {
      if (modo === 'inserir') onInserir(e.latlng.lat, e.latlng.lng);
      else if ((modo === 'linha' || modo === 'polilinha' || modo === 'tracejado' || modo === 'cota' || modo === 'texto' || modo === 'simbolo' || modo === 'medir') && onCliqueDesenho) onCliqueDesenho(e.latlng.lat, e.latlng.lng);
    },
    dblclick(e) {
      // duplo clique abre o editor de texto (não dá zoom — doubleClickZoom desligado)
      onDblClick?.(e.latlng.lat, e.latlng.lng);
    },
    contextmenu(e) {
      if (modo === 'linha' || modo === 'polilinha' || modo === 'tracejado' || modo === 'cota' || modo === 'texto' || modo === 'medir') {
        e.originalEvent.preventDefault();
        onCancelDesenho?.();
      }
    },
    mousemove(e) {
      if (modo === 'medir') onMouseMove?.(e.latlng);
    },
    mouseout() {
      if (modo === 'medir') onMouseOut?.();
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

export default function MapEditor(props: Props) {
  const {
    vertices, selecionadoId, modo, mostrarRotulos, bloqueado, referencias = [], parcelasCert = [], mostrarCert = true, opacidadeCert = 0.06, parcelaCertSel = null, onSelParcelaCert, verticesVizinho = [], selMulti, onToggleMulti, onBoxSelect, onAdotarVertice, onDblClick, outrasGlebas = [],
    objetos = [], desenhoAtual = [], rotulos = [], centroGleba = null, onMoverCentro, mostrarDivisaConf = true, onAjustarDivisaConf, estiloVertice = 'sigef', objetoSelId = null,
    onMover, onSelecionar, onApagar, onInserir, onCliqueDesenho, onSelecObjeto, onContextMenuObjeto, onMoverPontoObjeto, onMoverRotulo, onPintarDivisa, onPintarConfrontante, onMoverRotuloVertice, centralizarSig,
    onEditarConfrontante,
    conflitos = [],
    focoLatLng = null,
    onCancelDesenho,
    tamNomes = 11,
    verticesIgnorados = [],
    onIgnorarVertice, onConsiderarVertice,
    realceId = null,
    confrontantes = [],
    confrontantePorLado = {},
    zona = 23,
    hemisferio = 'S',
  } = props;

  const [zoom, setZoom] = useState(16);
  const [cursorLatLng, setCursorLatLng] = useState<L.LatLng | null>(null);
  const isDesenho = ['linha', 'polilinha', 'tracejado', 'cota', 'texto', 'simbolo', 'medir'].includes(modo);



  useEffect(() => {
    if (modo !== 'medir') setCursorLatLng(null);
  }, [modo]);

  // rótulos acompanham o zoom nos DOIS sentidos: encolhem ao afastar (não tampam o desenho) e
  // crescem ao aproximar. Antes ficavam travados em 1x ao afastar, e os blocos ficavam enormes.
  const fzZoom = Math.min(2.2, Math.max(0.6, 1 + (zoom - 16) * 0.2));
  const validos = useMemo(() => vertices.filter(valido), [vertices]);
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
    <MapContainer center={centro} zoom={validos.length ? 16 : 13} maxZoom={26} style={{ height: '100%', width: '100%' }} scrollWheelZoom zoomControl={false} doubleClickZoom={false}>
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Híbrido (Google)">
          <TileLayer attribution="Google" url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" maxZoom={26} maxNativeZoom={20} subdomains={['mt0', 'mt1', 'mt2', 'mt3']} />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Satélite (Esri)">
          <TileLayer attribution="Tiles &copy; Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={26} maxNativeZoom={18} />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Ruas (OpenStreetMap)">
          <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={26} maxNativeZoom={19} />
        </LayersControl.BaseLayer>
      </LayersControl>

      <AjustarLimites vertices={validos} referencias={referencias} />
      <Centralizar sig={centralizarSig} vertices={vertices} />
      <VerZoom onZoom={setZoom} />
      <CaixaSelecao ativo={modo === 'multi'} vertices={validos} onBoxSelect={onBoxSelect} />
      <CliqueMapa modo={modo} onInserir={onInserir} onCliqueDesenho={onCliqueDesenho} onCancelDesenho={onCancelDesenho} onDblClick={onDblClick} onMouseMove={setCursorLatLng} onMouseOut={() => setCursorLatLng(null)} />
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
      {anel.length >= 3 ? (
        <Polygon positions={anel} pathOptions={{ color: '#facc15', weight: 2, fillColor: '#facc15', fillOpacity: 0.12 }} />
      ) : anel.length === 2 ? (
        <Polyline positions={anel} pathOptions={{ color: '#facc15', weight: 2 }} />
      ) : null}

      {/* cor de apoio das divisas — deslocada pra FORA do polígono, deixando o traçado livre
          pra cor do confrontante (que fica sobre a linha) não se sobreporem */}
      {validos.length >= 2 && (() => {
        const cLat = validos.reduce((s, p) => s + p.lat, 0) / validos.length;
        const cLon = validos.reduce((s, p) => s + p.lon, 0) / validos.length;
        // afastamento proporcional ao TAMANHO do polígono (não ao zoom): assim as barras ficam
        // sempre coladas na divisa, seja qual for o enquadramento ao abrir o projeto.
        const lats = validos.map((p) => p.lat), lons = validos.map((p) => p.lon);
        const maxDim = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lons) - Math.min(...lons)) || 0.0005;
        const off = maxDim * 0.012;
        return validos.map((v, i) => {
          // linha ideal sai branca SÓ no modo de pintar divisa (todo lado nasce "linha ideal" por
          // padrão — fora do modo, mostrar branca em tudo poluiria o desenho)
          const cor = v.representacao === 'linha-ideal'
            ? (modo === 'divisa' ? '#ffffff' : null)
            : corDivisa(v.representacao);
          if (!cor) return null;
          const prox = validos[(i + 1) % validos.length];
          if (!prox || (validos.length < 3 && i === validos.length - 1)) return null;
          // normal do segmento apontando pra fora (pro lado oposto ao centróide)
          let nx = -(prox.lat - v.lat), ny = prox.lon - v.lon;
          const len = Math.hypot(nx, ny) || 1; nx /= len; ny /= len;
          const mLat = (v.lat + prox.lat) / 2, mLon = (v.lon + prox.lon) / 2;
          if ((mLon - cLon) * nx + (mLat - cLat) * ny < 0) { nx = -nx; ny = -ny; }
          const a: [number, number] = [v.lat + ny * off, v.lon + nx * off];
          const b: [number, number] = [prox.lat + ny * off, prox.lon + nx * off];
          return (
            <Polyline key={`div${v.id}-${v.representacao}`} positions={[a, b]} pathOptions={{ color: cor, weight: zoom >= 18 ? 7 : 5, opacity: 0.8 }}>
              <Tooltip sticky direction="top" opacity={0.9}><span style={{ color: cor }}>Divisa: {REPRES_LABEL[v.representacao || ''] || v.representacao}</span></Tooltip>
            </Polyline>
          );
        });
      })()}

      {/* Roteamento visual de confrontantes aplicados sobre os segmentos */}
      {confrontantePorLado && confrontantes && validos.map((v, i) => {
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
            pathOptions={{ color: corConf, weight: 4, opacity: 0.85, dashArray: '4 8' }}
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
        const pos = o.pontos.map((p) => [p.lat, p.lon] as [number, number]);
        const sel = o.id === objetoSelId;
        if (o.tipo === 'polilinha') {
          const estilo = o.estiloLinha ?? (o.tracejado ? 'tracejado' : 'solido');
          const dashArray = estilo === 'tracejado' ? '8 6' : estilo === 'pontilhado' ? '2 4' : undefined;
          const comum = {
            color: o.cor ?? '#2563eb',
            weight: (o.espessura ?? 1.5) + (sel ? 1 : 0),
            dashArray
          };
          const fechado = o.preenchido && pos.length >= 3;
          let fillColor = o.corPreenchimento ?? o.cor ?? '#2563eb';
          let fillOpacity = 0.4;
          if (fechado && o.achura && o.achura !== 'nenhuma') {
            fillColor = `url(#pat-${o.id})`;
            fillOpacity = 0.95;
          }
          return (
            <Fragment key={o.id}>
              {fechado
                ? <Polygon positions={pos} pathOptions={{ ...comum, fillColor, fillOpacity }} eventHandlers={{ click: () => onSelecObjeto?.(o.id), contextmenu: (e) => onContextMenuObjeto?.(o.id, o.tipo, e.originalEvent.clientX, e.originalEvent.clientY) }} />
                : (
                  <>
                    {/* linha "fantasma" invisível e grossa: área mínima de clique em pixels de tela,
                        senão linha fina/curta fica impossível de selecionar (feedback 05/07/2026) */}
                    <Polyline positions={pos} pathOptions={{ color: '#000', opacity: 0, weight: 16 }} eventHandlers={{ click: () => onSelecObjeto?.(o.id), contextmenu: (e) => onContextMenuObjeto?.(o.id, o.tipo, e.originalEvent.clientX, e.originalEvent.clientY) }} />
                    <Polyline positions={pos} pathOptions={comum} eventHandlers={{ click: () => onSelecObjeto?.(o.id), contextmenu: (e) => onContextMenuObjeto?.(o.id, o.tipo, e.originalEvent.clientX, e.originalEvent.clientY) }} />
                  </>
                )}
              {sel && pos.map((p, idx) => (
                <CircleMarker key={`c${idx}`} center={p} radius={5} pathOptions={{ color: '#ef4444', fillColor: '#fff', fillOpacity: 1 }} />
              ))}
              {sel && pos.map((p, idx) => (
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

          return (
            <Fragment key={o.id}>
              {/* Linhas de extensão perpendiculares tracejadas */}
              <Polyline positions={[[p0.lat, p0.lon], [g0.lat, g0.lon]]} pathOptions={{ color: o.cor ?? '#b91c1c', weight: 0.8, dashArray: '2 3' }} />
              <Polyline positions={[[p1.lat, p1.lon], [g1.lat, g1.lon]]} pathOptions={{ color: o.cor ?? '#b91c1c', weight: 0.8, dashArray: '2 3' }} />
              {/* Linha de cota paralela (com "fantasma" grosso invisível pra cota curta ser clicável) */}
              <Polyline positions={posOffset} pathOptions={{ color: '#000', opacity: 0, weight: 16 }} eventHandlers={{ click: () => onSelecObjeto?.(o.id), contextmenu: (e) => onContextMenuObjeto?.(o.id, o.tipo, e.originalEvent.clientX, e.originalEvent.clientY) }} />
              <Polyline positions={posOffset} pathOptions={{ color: o.cor ?? '#b91c1c', weight: 1.2 + (sel ? 0.8 : 0) }} eventHandlers={{ click: () => onSelecObjeto?.(o.id), contextmenu: (e) => onContextMenuObjeto?.(o.id, o.tipo, e.originalEvent.clientX, e.originalEvent.clientY) }} />
              {/* o rótulo da medida também seleciona/abre menu — em cota pequena ele é o maior alvo */}
              <Marker position={mid} icon={L.divIcon({ className: 'cota-label', html: `<div style="font-size:10px;color:#b91c1c;background:#fff;padding:0 2px;border:1px solid #b91c1c;border-radius:2px;width:max-content;display:inline-block">${numBR(distanciaCota(o))} m</div>`, iconSize: [1, 1], iconAnchor: [0, 8] })}
                eventHandlers={{ click: () => onSelecObjeto?.(o.id), contextmenu: (e) => onContextMenuObjeto?.(o.id, o.tipo, e.originalEvent.clientX, e.originalEvent.clientY) }} />
              {sel && pos.map((p, idx) => (
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
            <Marker key={o.id} position={[o.pontos[0].lat, o.pontos[0].lon]} draggable
              icon={L.divIcon({ className: 'simbolo-obj', html, iconSize: [tam, tam], iconAnchor: [tam / 2, tam / 2] })}
              eventHandlers={{
                click: () => onSelecObjeto?.(o.id),
                contextmenu: (e) => onContextMenuObjeto?.(o.id, o.tipo, e.originalEvent.clientX, e.originalEvent.clientY),
                dragend: (e) => { const ll = (e.target as L.Marker).getLatLng(); onMoverPontoObjeto?.(o.id, 0, ll.lat, ll.lng); }
              }} />
          );
        }
        // texto
        return (
          <Marker key={o.id} position={[o.pontos[0].lat, o.pontos[0].lon]} draggable icon={iconeTexto(o, sel)}
            eventHandlers={{
              click: () => onSelecObjeto?.(o.id),
              contextmenu: (e) => onContextMenuObjeto?.(o.id, o.tipo, e.originalEvent.clientX, e.originalEvent.clientY),
              dragend: (e) => { const ll = (e.target as L.Marker).getLatLng(); onMoverPontoObjeto?.(o.id, 0, ll.lat, ll.lng); }
            }} />
        );
      })}

      {/* desenho em andamento */}
      {desenhoAtual.length >= 2 && <Polyline positions={desenhoAtual} pathOptions={{ color: '#2563eb', weight: 1.5, dashArray: '4 3' }} />}
      {desenhoAtual.map((p, i) => <CircleMarker key={`da${i}`} center={p} radius={3} pathOptions={{ color: '#2563eb', fillColor: '#fff', fillOpacity: 1 }} />)}

      {/* dados-chave no centro da gleba (arrastável no modo navegar) */}
      {centroGleba && centroGleba.linhas.length > 0 && (() => {
        const pos: [number, number] | null = (Number.isFinite(centroGleba.lat) && Number.isFinite(centroGleba.lon))
          ? [centroGleba.lat as number, centroGleba.lon as number] : centroideGleba;
        if (!pos) return null;
        const arrastavel = modo === 'navegar' && !!onMoverCentro;
        return (
          <Marker position={pos} draggable={arrastavel} interactive={arrastavel}
            icon={iconeCentro(centroGleba.linhas, fzZoom)}
            eventHandlers={arrastavel ? { dragend(e) { const ll = (e.target as L.Marker).getLatLng(); onMoverCentro?.(ll.lat, ll.lng); } } : undefined} />
        );
      })()}

      {/* rótulos de confrontante (arrastáveis) */}
      {rotulos.map((r) => (
        <Marker key={r.id} position={[r.lat, r.lon]} draggable icon={iconeRotulo(r, fzZoom)}
          eventHandlers={{
            click: () => { onEditarConfrontante?.(r.id); },
            dragend: (e) => { const ll = (e.target as L.Marker).getLatLng(); onMoverRotulo?.(r.id, ll.lat, ll.lng); }
          }} />
      ))}

      {/* anel de destaque dos vértices multi-selecionados (modo "triângulo") */}
      {modo === 'multi' && selMulti && validos.filter((v) => selMulti.has(v.id)).map((v) => (
        <CircleMarker key={`ms${v.id}`} center={[v.lat, v.lon]} radius={9}
          pathOptions={{ color: '#f59e0b', weight: 2.5, fillColor: '#fde047', fillOpacity: 0.5 }} />
      ))}

      {/* vértices */}
      {validos.map((v) => (
        <Marker
          key={v.id}
          position={[v.lat, v.lon]}
          draggable={modo === 'navegar' && !bloqueado}
          icon={iconeVertice(v, v.id === selecionadoId || v.id === realceId)}
          eventHandlers={{
            click() {
              if (isDesenho) onCliqueDesenho?.(v.lat, v.lon);
              else if (modo === 'apagar') onApagar(v.id);
              else if (modo === 'divisa') onPintarDivisa?.(v.id);
              else if (modo === 'confrontante') onPintarConfrontante?.(v.id);
              else if (modo === 'ignorar') onIgnorarVertice?.(v.id);
              else if (modo === 'multi') onToggleMulti?.(v.id);
              else onSelecionar(v.id);
            },
            dragend(e) { const ll = (e.target as L.Marker).getLatLng(); onMover(v.id, ll.lat, ll.lng); },
          }}
        />
      ))}

      {/* TIQUE DE TROCA DE CONFRONTANTE nos marcos M (sincronizado com a planta via divisaConfAz) */}
      {mostrarDivisaConf && validos.length >= 3 && (() => {
        const cLat = validos.reduce((s, v) => s + v.lat, 0) / validos.length;
        const cLon = validos.reduce((s, v) => s + v.lon, 0) / validos.length;
        const mLat = 111320, mLon = 111320 * Math.cos((cLat * Math.PI) / 180);
        const lats = validos.map((v) => v.lat), lons = validos.map((v) => v.lon);
        const wM = (Math.max(...lons) - Math.min(...lons)) * mLon, hM = (Math.max(...lats) - Math.min(...lats)) * mLat;
        const L = Math.min(160, Math.max(20, Math.hypot(wM, hM) * 0.16)); // metros (dobro do tamanho, mais visível)
        const arrastavel = modo === 'navegar' && !!onAjustarDivisaConf;
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
      {verticesIgnorados.filter(valido).map((v) => (
        <CircleMarker key={`ign${v.id}`} center={[v.lat, v.lon]} radius={5.5}
          pathOptions={{ color: '#000000', fillColor: '#ffffff', fillOpacity: 1.0, weight: 1.8 }}
          eventHandlers={{ click() { if (modo === 'considerar') onConsiderarVertice?.(v.id); } }} />
      ))}

      {/* rótulos dos vértices (caixinha branca; arrastáveis com a ferramenta mover/F5; ocultação adaptativa para evitar poluição visual) */}
      {(mostrarRotulos && (zoom >= 15 || validos.length <= 20)) && validos.map((v, i) => (
        <Marker
          key={`nome${v.id}`}
          position={v.posRotulo ? [v.posRotulo.lat, v.posRotulo.lon] : [v.lat, v.lon]}
          draggable={modo === 'navegar'}
          icon={iconeNomeVertice(
            estiloVertice === 'convencional' ? `P${i + 1}` : (v.codigoSigef || v.nome),
            Math.round(tamNomes * fzZoom),
            v.posRotulo ? 0 : (dirsRotulo[i]?.[0] ?? 1),
            v.posRotulo ? 0 : (dirsRotulo[i]?.[1] ?? 0),
          )}
          eventHandlers={{
            click() { onSelecionar(v.id); },
            dragend(e) { const ll = (e.target as L.Marker).getLatLng(); onMoverRotuloVertice?.(v.id, ll.lat, ll.lng); },
          }}
        />
      ))}

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
              <Tooltip permanent direction="center" className="no-print font-bold text-[10px] bg-background/90 text-foreground border border-blue-500 px-1.5 py-0.5 rounded shadow whitespace-nowrap">
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
                <Tooltip permanent direction="center" className="no-print font-medium text-[9px] bg-amber-500/90 text-white border border-amber-600 px-1.5 py-0.5 rounded shadow whitespace-nowrap">
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
          <div className="absolute bottom-6 right-2 z-[1000] max-h-40 max-w-56 overflow-y-auto rounded border bg-background/90 px-2 py-1.5 text-[11px] shadow backdrop-blur">
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
    </MapContainer>
  );
}
