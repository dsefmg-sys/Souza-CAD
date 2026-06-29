'use client';

import { useEffect, useMemo, useRef, Fragment } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, Marker, Tooltip, CircleMarker, LayersControl, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { Vertex, ObjetoDesenho } from '@/lib/topo/types';
import { distanciaCota } from '@/lib/topo/objetos';
import { corDivisa } from '@/lib/topo/sigefVocab';
import { numBR } from '@/lib/topo/geometry';

export type ModoEdicao = 'navegar' | 'inserir' | 'apagar' | 'linha' | 'cota' | 'texto' | 'divisa' | 'confrontante';

export interface RotuloMapa { id: string; lat: number; lon: number; texto: string; }

interface Props {
  vertices: Vertex[];
  selecionadoId: string | null;
  modo: ModoEdicao;
  mostrarRotulos: boolean;
  bloqueado: boolean;
  referencias?: [number, number][][];
  outrasGlebas?: [number, number][][];
  objetos?: ObjetoDesenho[];
  desenhoAtual?: [number, number][];
  rotulos?: RotuloMapa[];
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
}

const ESPERA_FELIZ: [number, number] = [-20.6506, -41.9094];

function valido(v: Vertex): boolean {
  return Number.isFinite(v.lat) && Number.isFinite(v.lon) && Math.abs(v.lat) <= 90 && Math.abs(v.lon) <= 180;
}

function iconeVertice(v: Vertex, selecionado: boolean) {
  const cor = v.tipo === 'M' ? '#f59e0b' : v.tipo === 'V' ? '#a855f7' : '#22c55e';
  const borda = selecionado ? '#ef4444' : '#ffffff';
  const tam = v.tipo === 'M' ? 14 : 11;
  return L.divIcon({
    className: 'vertice-icon',
    html: `<div style="width:${tam}px;height:${tam}px;border-radius:50%;background:${cor};border:2px solid ${borda};box-shadow:0 0 2px #000"></div>`,
    iconSize: [tam, tam], iconAnchor: [tam / 2, tam / 2],
  });
}

function iconeTexto(o: ObjetoDesenho, sel: boolean) {
  const al = o.alinhamento === 'center' ? 'center' : o.alinhamento === 'right' ? 'right' : 'left';
  return L.divIcon({
    className: 'objeto-texto',
    html: `<div style="font-size:${o.tamanho ?? 12}px;color:${o.cor ?? '#000'};white-space:nowrap;text-align:${al};text-shadow:0 0 2px #fff,0 0 2px #fff;${sel ? 'outline:1px dashed #ef4444;' : ''}">${(o.texto ?? '').replace(/</g, '&lt;')}</div>`,
    iconSize: [1, 1], iconAnchor: [0, 8],
  });
}
const iconeRotulo = (r: RotuloMapa) => L.divIcon({
  className: 'objeto-rotulo',
  html: `<div style="font-size:10px;color:#000;background:rgba(255,255,255,0.8);border:1px solid #999;border-radius:3px;padding:1px 3px;white-space:nowrap">${r.texto.replace(/</g, '&lt;')}</div>`,
  iconSize: [1, 1], iconAnchor: [0, 8],
});

function AjustarLimites({ vertices }: { vertices: Vertex[] }) {
  const map = useMap();
  const ultimoN = useRef(0);
  useEffect(() => {
    const validos = vertices.filter(valido);
    if (validos.length >= 2 && validos.length !== ultimoN.current) {
      try {
        const b = L.latLngBounds(validos.map((v) => [v.lat, v.lon] as [number, number]));
        if (b.isValid()) {
          map.whenReady(() => { try { map.fitBounds(b, { padding: [40, 40] }); } catch { /* sem tamanho */ } });
          ultimoN.current = validos.length;
        }
      } catch { /* coords inválidas */ }
    }
  }, [vertices, map]);
  return null;
}

function CliqueMapa({ modo, onInserir, onCliqueDesenho }: { modo: ModoEdicao; onInserir: (lat: number, lon: number) => void; onCliqueDesenho?: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      if (modo === 'inserir') onInserir(e.latlng.lat, e.latlng.lng);
      else if ((modo === 'linha' || modo === 'cota' || modo === 'texto') && onCliqueDesenho) onCliqueDesenho(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapEditor(props: Props) {
  const {
    vertices, selecionadoId, modo, mostrarRotulos, bloqueado, referencias = [], outrasGlebas = [],
    objetos = [], desenhoAtual = [], rotulos = [], objetoSelId = null,
    onMover, onSelecionar, onApagar, onInserir, onCliqueDesenho, onSelecObjeto, onMoverPontoObjeto, onMoverRotulo, onPintarDivisa, onPintarConfrontante,
  } = props;

  const validos = useMemo(() => vertices.filter(valido), [vertices]);
  const centro = useMemo<[number, number]>(() => (validos.length ? [validos[0].lat, validos[0].lon] : ESPERA_FELIZ), [validos]);
  const anel = validos.map((v) => [v.lat, v.lon] as [number, number]);

  return (
    <MapContainer center={centro} zoom={validos.length ? 16 : 13} maxZoom={22} style={{ height: '100%', width: '100%' }} scrollWheelZoom zoomControl={false}>
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

      <AjustarLimites vertices={validos} />
      <CliqueMapa modo={modo} onInserir={onInserir} onCliqueDesenho={onCliqueDesenho} />

      {/* referências certificadas (snap) */}
      {referencias.filter((r) => r.length >= 2).map((r, i) => (
        <Polyline key={`ref${i}`} positions={r.length >= 3 ? [...r, r[0]] : r} pathOptions={{ color: '#06b6d4', weight: 1.5, dashArray: '5 4' }} />
      ))}

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
                  eventHandlers={{ dragend: (e) => { const ll = (e.target as L.Marker).getLatLng(); onMoverPontoObjeto?.(o.id, idx, ll.lat, ll.lng); } }} />
              ))}
            </Fragment>
          );
        }
        if (o.tipo === 'cota') {
          const mid: [number, number] = [(o.pontos[0].lat + o.pontos[1].lat) / 2, (o.pontos[0].lon + o.pontos[1].lon) / 2];
          return (
            <Fragment key={o.id}>
              <Polyline positions={pos} pathOptions={{ color: o.cor ?? '#b91c1c', weight: 1 + (sel ? 1 : 0) }} eventHandlers={{ click: () => onSelecObjeto?.(o.id) }} />
              <Marker position={mid} icon={L.divIcon({ className: 'cota-label', html: `<div style="font-size:10px;color:#b91c1c;background:#fff;padding:0 2px;border:1px solid #b91c1c;border-radius:2px">${numBR(distanciaCota(o))} m</div>`, iconSize: [1, 1], iconAnchor: [0, 8] })} />
              {sel && pos.map((p, idx) => (
                <Marker key={`hc${idx}`} position={p} draggable opacity={0}
                  eventHandlers={{ dragend: (e) => { const ll = (e.target as L.Marker).getLatLng(); onMoverPontoObjeto?.(o.id, idx, ll.lat, ll.lng); } }} />
              ))}
            </Fragment>
          );
        }
        // texto
        return (
          <Marker key={o.id} position={[o.pontos[0].lat, o.pontos[0].lon]} draggable icon={iconeTexto(o, sel)}
            eventHandlers={{ click: () => onSelecObjeto?.(o.id), dragend: (e) => { const ll = (e.target as L.Marker).getLatLng(); onMoverPontoObjeto?.(o.id, 0, ll.lat, ll.lng); } }} />
        );
      })}

      {/* desenho em andamento */}
      {desenhoAtual.length >= 2 && <Polyline positions={desenhoAtual} pathOptions={{ color: '#2563eb', weight: 1.5, dashArray: '4 3' }} />}
      {desenhoAtual.map((p, i) => <CircleMarker key={`da${i}`} center={p} radius={3} pathOptions={{ color: '#2563eb', fillColor: '#fff', fillOpacity: 1 }} />)}

      {/* rótulos de confrontante (arrastáveis) */}
      {rotulos.map((r) => (
        <Marker key={r.id} position={[r.lat, r.lon]} draggable icon={iconeRotulo(r)}
          eventHandlers={{ dragend: (e) => { const ll = (e.target as L.Marker).getLatLng(); onMoverRotulo?.(r.id, ll.lat, ll.lng); } }} />
      ))}

      {/* vértices */}
      {validos.map((v) => (
        <Marker
          key={v.id}
          position={[v.lat, v.lon]}
          draggable={modo === 'navegar' && !bloqueado}
          icon={iconeVertice(v, v.id === selecionadoId)}
          eventHandlers={{
            click() {
              if (modo === 'apagar') onApagar(v.id);
              else if (modo === 'divisa') onPintarDivisa?.(v.id);
              else if (modo === 'confrontante') onPintarConfrontante?.(v.id);
              else onSelecionar(v.id);
            },
            dragend(e) { const ll = (e.target as L.Marker).getLatLng(); onMover(v.id, ll.lat, ll.lng); },
          }}
        >
          {mostrarRotulos && (
            <Tooltip permanent direction="top" offset={[0, -8]} className="vertice-label">{v.codigoSigef || v.nome}</Tooltip>
          )}
        </Marker>
      ))}
    </MapContainer>
  );
}
