'use client';

import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, Marker, Tooltip, LayersControl, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { Vertex } from '@/lib/topo/types';

export type ModoEdicao = 'navegar' | 'inserir' | 'apagar';

interface Props {
  vertices: Vertex[];
  selecionadoId: string | null;
  modo: ModoEdicao;
  mostrarRotulos: boolean;
  referencias?: [number, number][][];
  onMover: (id: string, lat: number, lon: number) => void;
  onSelecionar: (id: string) => void;
  onApagar: (id: string) => void;
  onInserir: (lat: number, lon: number) => void;
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
    iconSize: [tam, tam],
    iconAnchor: [tam / 2, tam / 2],
  });
}

function AjustarLimites({ vertices }: { vertices: Vertex[] }) {
  const map = useMap();
  const ultimoN = useRef(0);
  useEffect(() => {
    const validos = vertices.filter(valido);
    if (validos.length >= 2 && validos.length !== ultimoN.current) {
      try {
        const b = L.latLngBounds(validos.map((v) => [v.lat, v.lon] as [number, number]));
        if (b.isValid()) {
          map.whenReady(() => { try { map.fitBounds(b, { padding: [40, 40] }); } catch { /* mapa ainda sem tamanho */ } });
          ultimoN.current = validos.length;
        }
      } catch { /* coords inválidas: ignora */ }
    }
  }, [vertices, map]);
  return null;
}

function CliqueMapa({ modo, onInserir }: { modo: ModoEdicao; onInserir: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      if (modo === 'inserir') onInserir(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapEditor({ vertices, selecionadoId, modo, mostrarRotulos, referencias = [], onMover, onSelecionar, onApagar, onInserir }: Props) {
  const validos = useMemo(() => vertices.filter(valido), [vertices]);
  const centro = useMemo<[number, number]>(() => {
    if (validos.length) return [validos[0].lat, validos[0].lon];
    return ESPERA_FELIZ;
  }, [validos]);

  const anel = validos.map((v) => [v.lat, v.lon] as [number, number]);

  return (
    <MapContainer center={centro} zoom={validos.length ? 16 : 13} maxZoom={22} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Satélite (Esri)">
          <TileLayer
            attribution="Tiles &copy; Esri"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={22}
            maxNativeZoom={19}
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Híbrido (Google)">
          <TileLayer attribution="Google" url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" maxZoom={22} maxNativeZoom={21} subdomains={['mt0', 'mt1', 'mt2', 'mt3']} />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Ruas (OpenStreetMap)">
          <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
        </LayersControl.BaseLayer>
      </LayersControl>

      <AjustarLimites vertices={validos} />
      <CliqueMapa modo={modo} onInserir={onInserir} />

      {/* parcelas certificadas de referência (snap) */}
      {referencias.filter((r) => r.length >= 2).map((r, i) => (
        <Polyline key={`ref${i}`} positions={r.length >= 3 ? [...r, r[0]] : r} pathOptions={{ color: '#06b6d4', weight: 1.5, dashArray: '5 4' }} />
      ))}

      {anel.length >= 3 ? (
        <Polygon positions={anel} pathOptions={{ color: '#facc15', weight: 2, fillColor: '#facc15', fillOpacity: 0.12 }} />
      ) : anel.length === 2 ? (
        <Polyline positions={anel} pathOptions={{ color: '#facc15', weight: 2 }} />
      ) : null}

      {validos.map((v) => (
        <Marker
          key={v.id}
          position={[v.lat, v.lon]}
          draggable={modo === 'navegar'}
          icon={iconeVertice(v, v.id === selecionadoId)}
          eventHandlers={{
            click() {
              if (modo === 'apagar') onApagar(v.id);
              else onSelecionar(v.id);
            },
            dragend(e) {
              const ll = (e.target as L.Marker).getLatLng();
              onMover(v.id, ll.lat, ll.lng);
            },
          }}
        >
          {mostrarRotulos && (
            <Tooltip permanent direction="top" offset={[0, -8]} className="vertice-label">
              {v.codigoSigef || v.nome}
            </Tooltip>
          )}
        </Marker>
      ))}
    </MapContainer>
  );
}
