'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';

interface Marcador { idx: number; lat: number; lon: number; ativo?: boolean; noPoligono?: boolean; rotulo?: string }

function Enquadrar({ pts, destaque }: { pts: [number, number][]; destaque: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        map.invalidateSize();
        if (destaque) { map.panTo(destaque); return; }
        if (pts.length >= 2) {
          const b = L.latLngBounds(pts);
          if (b.isValid()) map.fitBounds(b, { padding: [30, 30], maxZoom: 19 });
        }
      } catch { /* ignore */ }
    }, 150);
    return () => clearTimeout(t);
  }, [pts, destaque, map]);
  return null;
}

/** Mini-mapa de satélite com o perímetro/pontos importados por cima — confirma localização e fuso. */
export default function PreviaSatelite({ poligono, marcadores, destaque }: { poligono: [number, number][]; marcadores: Marcador[]; destaque: [number, number] | null }) {
  const validos = marcadores.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lon) && Math.abs(m.lat) <= 90 && Math.abs(m.lon) <= 180);
  const centro: [number, number] = destaque ?? (validos.length ? [validos[0].lat, validos[0].lon] : [-20.6506, -41.9094]);
  const todos: [number, number][] = validos.map((m) => [m.lat, m.lon]);
  return (
    <MapContainer center={centro} zoom={15} maxZoom={22} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
      <TileLayer attribution="Google" url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" maxZoom={22} maxNativeZoom={20} subdomains={['mt0', 'mt1', 'mt2', 'mt3']} />
      {poligono.length >= 3 && (
        <Polygon
          key={`poly-${poligono.map(p => `${p[0].toFixed(6)},${p[1].toFixed(6)}`).join('|')}`}
          positions={poligono}
          pathOptions={{ color: '#3b82f6', weight: 2, fillColor: '#3b82f6', fillOpacity: 0.12 }}
        />
      )}
      {poligono.length === 2 && (
        <Polyline
          key={`line-${poligono.map(p => `${p[0].toFixed(6)},${p[1].toFixed(6)}`).join('|')}`}
          positions={poligono}
          pathOptions={{ color: '#3b82f6', weight: 2, dashArray: '4 4' }}
        />
      )}
      {validos.map((m) => {
        const cor = m.ativo ? '#f59e0b' : m.noPoligono ? '#1d4ed8' : '#9ca3af';
        return (
          <CircleMarker
            key={`marker-${m.idx}-${m.noPoligono}-${m.ativo}-${m.lat.toFixed(6)}-${m.lon.toFixed(6)}`}
            center={[m.lat, m.lon]}
            radius={m.ativo ? 7 : 4}
            pathOptions={{ color: cor, fillColor: m.ativo ? '#fde047' : '#fff', fillOpacity: 1, weight: m.ativo ? 3 : 1.5 }}
          >
            {m.ativo && m.rotulo && <Tooltip permanent direction="top" offset={[0, -6]}>{m.rotulo}</Tooltip>}
          </CircleMarker>
        );
      })}
      <Enquadrar pts={todos} destaque={destaque} />
    </MapContainer>
  );
}
