'use client';

import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MUNICIPIOS } from '@/lib/topo/municipios';
import type { PerfilUso } from '@/lib/store/perfilUso';
import { MapPin, Users, Crown, Shield, CheckCircle2, AlertTriangle } from 'lucide-react';

// Corrigir ícones default do Leaflet em ambiente Next.js
const createCustomIcon = (color: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="32" height="32" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3" fill="#ffffff"/></svg>`;
  return L.divIcon({
    html: svg,
    className: 'custom-leaflet-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const iconPago = createCustomIcon('#10b981'); // Emerald
const iconAtrasado = createCustomIcon('#ef4444'); // Red
const iconIsento = createCustomIcon('#3b82f6'); // Blue

interface Props {
  perfis: PerfilUso[];
}

interface ClientePonto {
  perfil: PerfilUso;
  lat: number;
  lon: number;
  origem: 'GPS' | 'Município' | 'Estimado';
}

export default function MapaClientesSaaS({ perfis }: Props) {
  const pontos = useMemo<ClientePonto[]>(() => {
    return perfis.map((p, idx) => {
      // 1. GPS direto
      if (p.lat && p.lon && Number.isFinite(p.lat) && Number.isFinite(p.lon)) {
        return { perfil: p, lat: p.lat, lon: p.lon, origem: 'GPS' };
      }

      // 2. Tentar município
      const muniKey = (p.municipio || '').trim().toLowerCase();
      if (muniKey && MUNICIPIOS[muniKey]) {
        const m = MUNICIPIOS[muniKey];
        return { perfil: p, lat: m.lat + (idx % 5) * 0.005, lon: m.lon + (idx % 3) * 0.005, origem: 'Município' };
      }

      // 3. Fallback regional (Região de Espera Feliz-MG / Brasil)
      const baseLat = -20.6506 + (idx * 0.04) % 1.5;
      const baseLon = -41.9094 + (idx * 0.06) % 1.5;
      return { perfil: p, lat: baseLat, lon: baseLon, origem: 'Estimado' };
    });
  }, [perfis]);

  const centro: [number, number] = pontos.length > 0
    ? [pontos[0].lat, pontos[0].lon]
    : [-20.6506, -41.9094];

  return (
    <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-amber-400">
          <MapPin className="size-4 text-emerald-400" />
          <span>Mapa Geolocalizado de Clientes ({pontos.length})</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-extrabold uppercase text-zinc-400">
          <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-500" /> Adimplente</span>
          <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-red-500" /> Pendente</span>
          <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-blue-500" /> Isento</span>
        </div>
      </div>

      <div className="h-[420px] w-full rounded-xl overflow-hidden border border-zinc-800 relative shadow-inner">
        <MapContainer center={centro} zoom={6} className="h-full w-full z-0">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {pontos.map((pt, i) => {
            const status = pt.perfil.statusPagamento || 'atrasado';
            const icone = status === 'pago' ? iconPago : status === 'isento' ? iconIsento : iconAtrasado;
            const nome = pt.perfil.rtNome || pt.perfil.empresaNome || pt.perfil.email || `Cliente #${i + 1}`;

            return (
              <Marker key={pt.perfil.uid || i} position={[pt.lat, pt.lon]} icon={icone}>
                <Popup className="cliente-popup">
                  <div className="p-2 text-zinc-900 font-sans min-w-[200px]">
                    <div className="font-extrabold text-sm border-b pb-1 mb-1 text-slate-900 flex items-center justify-between">
                      <span>{nome}</span>
                      <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-black text-white ${status === 'pago' ? 'bg-emerald-600' : status === 'isento' ? 'bg-blue-600' : 'bg-red-600'}`}>
                        {status}
                      </span>
                    </div>
                    {pt.perfil.empresaNome && (
                      <div className="text-xs text-slate-700 font-semibold mb-0.5">
                        Empresa: {pt.perfil.empresaNome}
                      </div>
                    )}
                    {pt.perfil.email && (
                      <div className="text-xs text-slate-600 mb-0.5">
                        E-mail: <strong className="text-slate-800">{pt.perfil.email}</strong>
                      </div>
                    )}
                    {pt.perfil.municipio && (
                      <div className="text-xs text-slate-600 mb-0.5">
                        Cidade: <strong className="text-slate-800">{pt.perfil.municipio}</strong>
                      </div>
                    )}
                    <div className="text-[10px] text-slate-500 mt-1 flex justify-between pt-1 border-t">
                      <span>Projetos: <strong>{pt.perfil.totalProjetos || 0}</strong></span>
                      <span>Origem: <strong>{pt.origem}</strong></span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
