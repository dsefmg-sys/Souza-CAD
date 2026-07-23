'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';

export interface Marcador {
  idx: number;
  lat: number;
  lon: number;
  ativo?: boolean;
  noPoligono?: boolean;
  rotulo?: string;
  codigo?: string;
  descricao?: string;
}

function Enquadrar({ pts, destaque }: { pts: [number, number][]; destaque: [number, number] | null }) {
  const map = useMap();
  const boundsKey = useMemo(() => {
    return pts.map((p) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`).join('|');
  }, [pts]);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        map.invalidateSize();
        if (destaque) {
          map.panTo(destaque);
          return;
        }
        if (pts.length >= 2) {
          const b = L.latLngBounds(pts);
          if (b.isValid()) map.fitBounds(b, { padding: [40, 40], maxZoom: 19 });
        } else if (pts.length === 1) {
          map.setView(pts[0], 17);
        }
      } catch { /* ignore */ }
    }, 100);
    return () => clearTimeout(t);
  }, [boundsKey, destaque, map, pts]);
  return null;
}

/** Mini-mapa de satélite com o perímetro/pontos importados por cima — confirma localização e fuso. */
export default function PreviaSatelite({
  poligono,
  marcadores,
  destaque,
  onSelectMarcador,
}: {
  poligono: [number, number][];
  marcadores: Marcador[];
  destaque: [number, number] | null;
  onSelectMarcador?: (idx: number) => void;
}) {
  const validos = marcadores.filter(
    (m) => Number.isFinite(m.lat) && Number.isFinite(m.lon) && Math.abs(m.lat) <= 90 && Math.abs(m.lon) <= 180
  );
  const centro: [number, number] = destaque ?? (validos.length ? [validos[0].lat, validos[0].lon] : [-20.6506, -41.9094]);
  const todos: [number, number][] = validos.map((m) => [m.lat, m.lon]);

  return (
    <MapContainer center={centro} zoom={15} maxZoom={22} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution="Google"
        url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
        maxZoom={22}
        maxNativeZoom={20}
        subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
      />
      {poligono.length >= 3 && (
        <Polygon
          key={`poly-${poligono.map((p) => `${p[0].toFixed(6)},${p[1].toFixed(6)}`).join('|')}`}
          positions={poligono}
          pathOptions={{ color: '#3b82f6', weight: 2, fillColor: '#3b82f6', fillOpacity: 0.12 }}
        />
      )}
      {poligono.length === 2 && (
        <Polyline
          key={`line-${poligono.map((p) => `${p[0].toFixed(6)},${p[1].toFixed(6)}`).join('|')}`}
          positions={poligono}
          pathOptions={{ color: '#3b82f6', weight: 2, dashArray: '4 4' }}
        />
      )}
      {validos.map((m) => {
        const cor = m.ativo ? '#f59e0b' : m.noPoligono ? '#10b981' : '#f59e0b';
        return (
          <CircleMarker
            key={`marker-${m.idx}-${m.noPoligono}-${m.ativo}-${m.lat.toFixed(6)}-${m.lon.toFixed(6)}`}
            center={[m.lat, m.lon]}
            radius={m.ativo ? 8 : 5}
            pathOptions={{ color: cor, fillColor: m.ativo ? '#fde047' : '#ffffff', fillOpacity: 1, weight: m.ativo ? 3.5 : 2 }}
            eventHandlers={{
              click(e) {
                L.DomEvent.stopPropagation(e);
                onSelectMarcador?.(m.idx);
              },
            }}
          >
            <Tooltip permanent={m.ativo} direction="top" offset={[0, -6]} opacity={0.95}>
              <div className="flex flex-col gap-0.5 p-1 text-xs select-none">
                <div className="font-black text-amber-500 dark:text-amber-400 text-xs tracking-wider border-b pb-0.5 mb-0.5 uppercase">
                  {m.codigo || m.rotulo || `VÉRTICE ${m.idx + 1}`}
                </div>
                {m.rotulo && m.rotulo !== m.codigo && (
                  <div className="font-extrabold text-foreground">
                    <span className="text-muted-foreground text-[10px] uppercase mr-1">Nome:</span>
                    {m.rotulo}
                  </div>
                )}
                {m.codigo && (
                  <div className="font-bold text-foreground">
                    <span className="text-muted-foreground text-[10px] uppercase mr-1">Código:</span>
                    {m.codigo}
                  </div>
                )}
                {m.descricao && (
                  <div className="font-semibold text-muted-foreground text-[11px]">
                    <span className="text-muted-foreground text-[10px] uppercase mr-1">Descrição:</span>
                    {m.descricao}
                  </div>
                )}
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
      <Enquadrar pts={todos} destaque={destaque} />
    </MapContainer>
  );
}
