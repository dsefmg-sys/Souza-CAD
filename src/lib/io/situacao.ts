// Planta de situação: compõe um recorte de satélite (Esri World Imagery) com o contorno do
// imóvel desenhado por cima, e devolve uma imagem (data URL) para encaixar na planta.
// Só roda no navegador (usa Image/canvas). Falha graciosa: devolve null se algo não carregar.

export interface PontoGeo { lat: number; lon: number; }

const TILE = 256;
const URL_ESRI = (z: number, x: number, y: number) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;

function lonToGlobalPx(lon: number, z: number): number {
  return ((lon + 180) / 360) * Math.pow(2, z) * TILE;
}
function latToGlobalPx(lat: number, z: number): number {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * Math.pow(2, z) * TILE;
}

function carregarTile(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** Escolhe o zoom para o bbox caber em ~alvoPx pixels. */
function escolherZoom(spanLon: number, alvoPx: number): number {
  for (let z = 19; z >= 8; z--) {
    const px = (spanLon / 360) * Math.pow(2, z) * TILE;
    if (px <= alvoPx) return z;
  }
  return 8;
}

export async function gerarSituacao(pts: PontoGeo[], opts: { alvoPx?: number; padding?: number } = {}): Promise<string | null> {
  if (typeof document === 'undefined' || pts.length < 3) return null;
  const alvoPx = opts.alvoPx ?? 460;
  const pad = opts.padding ?? 0.6;

  let minLat = Math.min(...pts.map((p) => p.lat));
  let maxLat = Math.max(...pts.map((p) => p.lat));
  let minLon = Math.min(...pts.map((p) => p.lon));
  let maxLon = Math.max(...pts.map((p) => p.lon));
  const dLat = (maxLat - minLat) * pad || 0.001;
  const dLon = (maxLon - minLon) * pad || 0.001;
  minLat -= dLat; maxLat += dLat; minLon -= dLon; maxLon += dLon;

  const z = escolherZoom(maxLon - minLon, alvoPx);
  const pxMin = lonToGlobalPx(minLon, z), pxMax = lonToGlobalPx(maxLon, z);
  const pyMin = latToGlobalPx(maxLat, z), pyMax = latToGlobalPx(minLat, z); // lat maior = py menor
  const w = Math.min(1400, Math.ceil(pxMax - pxMin));
  const h = Math.min(1400, Math.ceil(pyMax - pyMin));
  if (w < 8 || h < 8) return null;

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#dfe7ef'; ctx.fillRect(0, 0, w, h);

  const tx0 = Math.floor(pxMin / TILE), tx1 = Math.floor(pxMax / TILE);
  const ty0 = Math.floor(pyMin / TILE), ty1 = Math.floor(pyMax / TILE);
  const nTiles = Math.max(0, (tx1 - tx0 + 1) * (ty1 - ty0 + 1));
  if (nTiles === 0 || nTiles > 80) return null; // proteção

  const cargas: Promise<void>[] = [];
  for (let tx = tx0; tx <= tx1; tx++) {
    for (let ty = ty0; ty <= ty1; ty++) {
      cargas.push(carregarTile(URL_ESRI(z, tx, ty)).then((img) => {
        if (img) ctx.drawImage(img, tx * TILE - pxMin, ty * TILE - pyMin);
      }));
    }
  }
  await Promise.all(cargas);

  // contorno do imóvel
  ctx.beginPath();
  pts.forEach((p, i) => {
    const x = lonToGlobalPx(p.lon, z) - pxMin;
    const y = latToGlobalPx(p.lat, z) - pyMin;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = 'rgba(250,204,21,0.15)'; ctx.fill();

  try { return canvas.toDataURL('image/jpeg', 0.82); }
  catch { return null; } // canvas tainted (CORS) — sai sem situação
}
