'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';

function Enquadrar({ anel }: { anel: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        map.invalidateSize();
        if (anel.length >= 3) {
          const b = L.latLngBounds(anel);
          if (b.isValid()) map.fitBounds(b, { padding: [30, 30], maxZoom: 19 });
        }
      } catch { /* ignore */ }
    }, 150);
    return () => clearTimeout(t);
  }, [anel, map]);
  return null;
}

/** Mini-mapa de satélite com o perímetro importado por cima — confirma a localização/fuso. */
export default function PreviaSatelite({ anel }: { anel: [number, number][] }) {
  const valido = anel.filter(([la, lo]) => Number.isFinite(la) && Number.isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180);
  const centro: [number, number] = valido.length ? valido[0] : [-20.6506, -41.9094];
  return (
    <MapContainer center={centro} zoom={15} maxZoom={22} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
      <TileLayer attribution="Google" url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" maxZoom={22} maxNativeZoom={20} subdomains={['mt0', 'mt1', 'mt2', 'mt3']} />
      {valido.length >= 3 && <Polygon positions={valido} pathOptions={{ color: '#3b82f6', weight: 2, fillColor: '#3b82f6', fillOpacity: 0.15 }} />}
      {valido.map((p, i) => <CircleMarker key={i} center={p} radius={3} pathOptions={{ color: '#1d4ed8', fillColor: '#fff', fillOpacity: 1, weight: 1.5 }} />)}
      <Enquadrar anel={valido} />
    </MapContainer>
  );
}
