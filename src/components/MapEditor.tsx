'use client';

import { useEffect, useMemo, useRef, useState, Fragment } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, Marker, CircleMarker, Rectangle, LayersControl, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { Vertex, ObjetoDesenho } from '@/lib/topo/types';
import { distanciaCota } from '@/lib/topo/objetos';
import { corDivisa } from '@/lib/topo/sigefVocab';
import { numBR } from '@/lib/topo/geometry';

export type ModoEdicao = 'navegar' | 'inserir' | 'apagar' | 'linha' | 'polilinha' | 'cota' | 'texto' | 'divisa' | 'confrontante' | 'ignorar' | 'considerar' | 'multi';

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
  objetoSelId?: string | null;
  onMover: (id: string, lat: number, lon: number) => void;
  onSelecionar: (id: string) => void;
  onApagar: (id: string) => void;
  onInserir: (lat: number, lon: number) => void;
  onCliqueDesenho?: (lat: number, lon: number) => void;
  onSelecObjeto?: (id: string | null) => void;
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
}

const ESPERA_FELIZ: [number, number] = [-20.6506, -41.9094];

function valido(v: Vertex): boolean {
  return Number.isFinite(v.lat) && Number.isFinite(v.lon) && Math.abs(v.lat) <= 90 && Math.abs(v.lon) <= 180;
}

// símbolo do vértice por tipo, igual ao da legenda da planta: M = losango, P = círculo, V = triângulo
function iconeVertice(v: Vertex, selecionado: boolean) {
  const cor = v.tipo === 'M' ? '#f59e0b' : v.tipo === 'V' ? '#a855f7' : '#22c55e';
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
function iconeNomeVertice(texto: string, alterna: boolean, tam: number) {
  const fs = tam && tam > 0 ? tam : 11;
  return L.divIcon({
    className: 'vertice-nome',
    html: `<div style="font-size:${fs}px;font-weight:700;color:#000;background:#fff;border:1.5px solid #333;border-radius:3px;padding:0 4px;white-space:nowrap;box-shadow:0 0 2px rgba(0,0,0,.5);width:max-content;display:inline-block">${(texto || '').replace(/</g, '&lt;')}</div>`,
    iconSize: [1, 1], iconAnchor: [-8, alterna ? tam * 2 : -2],
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
const iconeRotulo = (r: RotuloMapa) => {
  const fs = r.tam && r.tam > 0 ? r.tam : 11;
  const linhas = r.linhas.map((l) => `<div>${(l || '').replace(/</g, '&lt;')}</div>`).join('');
  return L.divIcon({
    className: 'objeto-rotulo',
    html: `<div style="font-size:${fs}px;line-height:1.3;color:#000;background:#fff;border:1.5px solid #222;border-radius:4px;padding:3px 7px;white-space:nowrap;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.5);width:max-content;display:inline-block">${linhas}<div style="border-top:1px solid #000;margin-top:8px;padding-top:1px;font-size:${Math.max(8, fs - 2)}px;color:#333">Assinatura</div></div>`,
    iconSize: [1, 1], iconAnchor: [0, 8],
  });
};

// rótulo central da gleba: dados-chave (denominação, proprietário, matrícula, área) no meio do polígono.
// Não captura clique (pointer-events:none) para não atrapalhar a edição embaixo dele.
const iconeCentro = (linhas: string[]) => {
  const corpo = linhas.map((l, i) => `<div style="font-weight:${i === 0 ? 700 : 600};font-size:${i === 0 ? 13 : 11}px">${(l || '').replace(/</g, '&lt;')}</div>`).join('');
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

function CliqueMapa({ modo, onInserir, onCliqueDesenho, onCancelDesenho, onDblClick }: {
  modo: ModoEdicao;
  onInserir: (lat: number, lon: number) => void;
  onCliqueDesenho?: (lat: number, lon: number) => void;
  onCancelDesenho?: () => void;
  onDblClick?: (lat: number, lon: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (modo === 'inserir') onInserir(e.latlng.lat, e.latlng.lng);
      else if ((modo === 'linha' || modo === 'polilinha' || modo === 'cota' || modo === 'texto') && onCliqueDesenho) onCliqueDesenho(e.latlng.lat, e.latlng.lng);
    },
    dblclick(e) {
      // duplo clique abre o editor de texto (não dá zoom — doubleClickZoom desligado)
      onDblClick?.(e.latlng.lat, e.latlng.lng);
    },
    contextmenu(e) {
      if (modo === 'linha' || modo === 'polilinha' || modo === 'cota' || modo === 'texto') {
        e.originalEvent.preventDefault();
        onCancelDesenho?.();
      }
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
    vertices, selecionadoId, modo, mostrarRotulos, bloqueado, referencias = [], parcelasCert = [], mostrarCert = true, opacidadeCert = 0.06, parcelaCertSel = null, onSelParcelaCert, selMulti, onToggleMulti, onBoxSelect, onAdotarVertice, onDblClick, outrasGlebas = [],
    objetos = [], desenhoAtual = [], rotulos = [], centroGleba = null, onMoverCentro, mostrarDivisaConf = true, onAjustarDivisaConf, objetoSelId = null,
    onMover, onSelecionar, onApagar, onInserir, onCliqueDesenho, onSelecObjeto, onMoverPontoObjeto, onMoverRotulo, onPintarDivisa, onPintarConfrontante, onMoverRotuloVertice, centralizarSig,
    conflitos = [],
    focoLatLng = null,
    onCancelDesenho,
    tamNomes = 11,
    verticesIgnorados = [],
    onIgnorarVertice, onConsiderarVertice,
    realceId = null,
  } = props;

  const [zoom, setZoom] = useState(16);
  const validos = useMemo(() => vertices.filter(valido), [vertices]);
  const centro = useMemo<[number, number]>(() => (validos.length ? [validos[0].lat, validos[0].lon] : ESPERA_FELIZ), [validos]);
  const anel = validos.map((v) => [v.lat, v.lon] as [number, number]);
  const centroideGleba = useMemo<[number, number] | null>(() => {
    if (validos.length < 3) return null;
    const la = validos.reduce((s, v) => s + v.lat, 0) / validos.length;
    const lo = validos.reduce((s, v) => s + v.lon, 0) / validos.length;
    return [la, lo];
  }, [validos]);

  return (
    <MapContainer center={centro} zoom={validos.length ? 16 : 13} maxZoom={22} style={{ height: '100%', width: '100%' }} scrollWheelZoom zoomControl={false} doubleClickZoom={false}>
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Híbrido (Google)">
          <TileLayer attribution="Google" url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" maxZoom={22} maxNativeZoom={20} subdomains={['mt0', 'mt1', 'mt2', 'mt3']} />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Satélite (Esri)">
          <TileLayer attribution="Tiles &copy; Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={22} maxNativeZoom={18} />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Ruas (OpenStreetMap)">
          <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
        </LayersControl.BaseLayer>
      </LayersControl>

      <AjustarLimites vertices={validos} referencias={referencias} />
      <Centralizar sig={centralizarSig} vertices={vertices} />
      <VerZoom onZoom={setZoom} />
      <CaixaSelecao ativo={modo === 'multi'} vertices={validos} onBoxSelect={onBoxSelect} />
      <CliqueMapa modo={modo} onInserir={onInserir} onCliqueDesenho={onCliqueDesenho} onCancelDesenho={onCancelDesenho} onDblClick={onDblClick} />
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
            eventHandlers={{ click: () => onAdotarVertice?.(pt[0], pt[1]) }}>
            {verRotulo
              ? <Tooltip permanent direction="top" offset={[0, -4]} className="rotulo-cert">{`${j + 1}`}</Tooltip>
              : <Tooltip direction="top" offset={[0, -4]}>Vértice certificado — clique para adotar</Tooltip>}
          </CircleMarker>
        );
      }))}

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

      {/* cor de apoio das divisas (sobre cada lado, conforme a representação do vértice) */}
      {validos.map((v, i) => {
        const cor = corDivisa(v.representacao);
        if (!cor || validos.length < 2) return null;
        const a: [number, number] = [v.lat, v.lon];
        const prox = validos[(i + 1) % validos.length];
        if (!prox || (validos.length < 3 && i === validos.length - 1)) return null;
        return <Polyline key={`div${v.id}`} positions={[a, [prox.lat, prox.lon]]} pathOptions={{ color: cor, weight: 6, opacity: 0.65 }} />;
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
          const comum = { color: o.cor ?? '#2563eb', weight: (o.espessura ?? 1.5) + (sel ? 1 : 0) };
          const fechado = o.preenchido && pos.length >= 3;
          return (
            <Fragment key={o.id}>
              {fechado
                ? <Polygon positions={pos} pathOptions={{ ...comum, fillColor: o.cor ?? '#2563eb', fillOpacity: 0.4 }} eventHandlers={{ click: () => onSelecObjeto?.(o.id) }} />
                : <Polyline positions={pos} pathOptions={comum} eventHandlers={{ click: () => onSelecObjeto?.(o.id) }} />}
              {sel && pos.map((p, idx) => (
                <CircleMarker key={`c${idx}`} center={p} radius={5} pathOptions={{ color: '#ef4444', fillColor: '#fff', fillOpacity: 1 }} />
              ))}
              {sel && pos.map((p, idx) => (
                <Marker key={`h${idx}`} position={p} draggable opacity={0}
                  eventHandlers={{
                    drag: (e) => { const ll = (e.target as L.Marker).getLatLng(); onMoverPontoObjeto?.(o.id, idx, ll.lat, ll.lng); },
                    dragend: (e) => { const ll = (e.target as L.Marker).getLatLng(); onMoverPontoObjeto?.(o.id, idx, ll.lat, ll.lng); }
                  }} />
              ))}
            </Fragment>
          );
        }
        if (o.tipo === 'cota') {
          const mid: [number, number] = [(o.pontos[0].lat + o.pontos[1].lat) / 2, (o.pontos[0].lon + o.pontos[1].lon) / 2];
          return (
            <Fragment key={o.id}>
              <Polyline positions={pos} pathOptions={{ color: o.cor ?? '#b91c1c', weight: 1 + (sel ? 1 : 0) }} eventHandlers={{ click: () => onSelecObjeto?.(o.id) }} />
              <Marker position={mid} icon={L.divIcon({ className: 'cota-label', html: `<div style="font-size:10px;color:#b91c1c;background:#fff;padding:0 2px;border:1px solid #b91c1c;border-radius:2px;width:max-content;display:inline-block">${numBR(distanciaCota(o))} m</div>`, iconSize: [1, 1], iconAnchor: [0, 8] })} />
              {sel && pos.map((p, idx) => (
                <Marker key={`hc${idx}`} position={p} draggable opacity={0}
                  eventHandlers={{
                    drag: (e) => { const ll = (e.target as L.Marker).getLatLng(); onMoverPontoObjeto?.(o.id, idx, ll.lat, ll.lng); },
                    dragend: (e) => { const ll = (e.target as L.Marker).getLatLng(); onMoverPontoObjeto?.(o.id, idx, ll.lat, ll.lng); }
                  }} />
              ))}
            </Fragment>
          );
        }
        // texto
        return (
          <Marker key={o.id} position={[o.pontos[0].lat, o.pontos[0].lon]} draggable icon={iconeTexto(o, sel)}
            eventHandlers={{
              click: () => onSelecObjeto?.(o.id),
              drag: (e) => { const ll = (e.target as L.Marker).getLatLng(); onMoverPontoObjeto?.(o.id, 0, ll.lat, ll.lng); },
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
            icon={iconeCentro(centroGleba.linhas)}
            eventHandlers={arrastavel ? { dragend(e) { const ll = (e.target as L.Marker).getLatLng(); onMoverCentro?.(ll.lat, ll.lng); } } : undefined} />
        );
      })()}

      {/* rótulos de confrontante (arrastáveis) */}
      {rotulos.map((r) => (
        <Marker key={r.id} position={[r.lat, r.lon]} draggable icon={iconeRotulo(r)}
          eventHandlers={{
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
              if (modo === 'apagar') onApagar(v.id);
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
        const L = Math.min(80, Math.max(10, Math.hypot(wM, hM) * 0.08)); // metros
        const arrastavel = modo === 'navegar' && !!onAjustarDivisaConf;
        return validos.filter((v) => v.tipo === 'M').map((v) => {
          let az = v.divisaConfAz;
          if (az == null) { const dN = (v.lat - cLat) * mLat, dE = (v.lon - cLon) * mLon; let a = (Math.atan2(dE, dN) * 180) / Math.PI; if (a < 0) a += 360; az = a; }
          const a = (az * Math.PI) / 180;
          const eLat = v.lat + (L * Math.cos(a)) / mLat;
          const eLon = v.lon + (L * Math.sin(a)) / mLon;
          return (
            <Fragment key={`dc${v.id}`}>
              <Polyline positions={[[v.lat, v.lon], [eLat, eLon]]} pathOptions={{ color: '#475569', weight: 1, dashArray: '4 3' }} />
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

      {/* rótulos dos vértices (caixinha branca; arrastáveis com a ferramenta mover/F5) */}
      {mostrarRotulos && validos.map((v, i) => (
        <Marker
          key={`nome${v.id}`}
          position={v.posRotulo ? [v.posRotulo.lat, v.posRotulo.lon] : [v.lat, v.lon]}
          draggable={modo === 'navegar'}
          icon={iconeNomeVertice(v.codigoSigef || v.nome, i % 2 === 1, tamNomes)}
          eventHandlers={{
            click() { onSelecionar(v.id); },
            dragend(e) { const ll = (e.target as L.Marker).getLatLng(); onMoverRotuloVertice?.(v.id, ll.lat, ll.lng); },
          }}
        />
      ))}
    </MapContainer>
  );
}
