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

/** Escolhe o zoom para o bbox caber em ~alvoPx pixels (limitado a max 17 para evitar tiles 404 em regiões com cobertura restrita). */
function escolherZoom(spanLon: number, alvoPx: number): number {
  for (let z = 17; z >= 8; z--) {
    const px = (spanLon / 360) * Math.pow(2, z) * TILE;
    if (px <= alvoPx) return z;
  }
  return 8;
}

export type AnelSituacao = PontoGeo[] | { pts: PontoGeo[]; tipoGleba?: string };

export async function gerarSituacao(aneis: AnelSituacao[], opts: { alvoPx?: number; padding?: number; aspecto?: number; orcamentoChars?: number } = {}): Promise<string | null> {
  const normRings = aneis.map((a) => Array.isArray(a) ? { pts: a, tipoGleba: 'principal' } : a).filter((r) => r.pts && r.pts.length >= 3);
  const pts = normRings.flatMap((r) => r.pts);
  if (typeof document === 'undefined' || pts.length < 3) return null;
  const alvoPx = opts.alvoPx ?? 1024;     // resolução-alvo (nitidez)
  const pad = opts.padding ?? 1.25;       // folga ao redor do imóvel (enquadramento)
  const aspecto = opts.aspecto ?? 232 / 168; // mesma proporção do quadro na planta (sem cortar)

  let minLat = Math.min(...pts.map((p) => p.lat));
  let maxLat = Math.max(...pts.map((p) => p.lat));
  let minLon = Math.min(...pts.map((p) => p.lon));
  let maxLon = Math.max(...pts.map((p) => p.lon));

  // centro e meias-extensões com folga.
  // IMPORTANTE: Para lotes pequenos (ex.: 100m² - 500m²), estabelece uma meia-extensão mínima de ~0.0015° (~150m-200m)
  // para garantir que a planta de situação mostre arruamento e contexto da vizinhança.
  const cLat = (minLat + maxLat) / 2, cLon = (minLon + maxLon) / 2;
  const latRad = (cLat * Math.PI) / 180;

  const MIN_HALF_SPAN = 0.0015; // ~150-200m de raio mínimo de contexto
  let halfLon = Math.max(((maxLon - minLon) / 2) * (1 + pad), MIN_HALF_SPAN);
  let halfLat = Math.max(((maxLat - minLat) / 2) * (1 + pad), MIN_HALF_SPAN);

  // ajusta para a proporção do quadro (em metros aprox.: 1° lon ~ cos(lat)·1° lat)
  const wM = halfLon * Math.cos(latRad), hM = halfLat;
  if (wM / hM < aspecto) halfLon = (aspecto * hM) / Math.cos(latRad); else halfLat = (wM / aspecto);
  minLon = cLon - halfLon; maxLon = cLon + halfLon;
  minLat = cLat - halfLat; maxLat = cLat + halfLat;

  const zoomInicial = escolherZoom(maxLon - minLon, alvoPx);

  // Tenta o zoom ideal e faz fallback para níveis menores (z-1, z-2...) caso os tiles no nível z falhem (404/CORS)
  for (let z = zoomInicial; z >= 12; z--) {
    const pxMin = lonToGlobalPx(minLon, z), pxMax = lonToGlobalPx(maxLon, z);
    const pyMin = latToGlobalPx(maxLat, z), pyMax = latToGlobalPx(minLat, z); // lat maior = py menor
    const w = Math.min(2000, Math.ceil(pxMax - pxMin));
    const h = Math.min(2000, Math.ceil(pyMax - pyMin));
    if (w < 8 || h < 8) continue;

    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    ctx.fillStyle = '#dfe7ef'; ctx.fillRect(0, 0, w, h);

    const tx0 = Math.floor(pxMin / TILE), tx1 = Math.floor(pxMax / TILE);
    const ty0 = Math.floor(pyMin / TILE), ty1 = Math.floor(pyMax / TILE);
    const nTiles = Math.max(0, (tx1 - tx0 + 1) * (ty1 - ty0 + 1));
    if (nTiles === 0 || nTiles > 160) continue;

    let carregados = 0;
    const cargas: Promise<void>[] = [];
    for (let tx = tx0; tx <= tx1; tx++) {
      for (let ty = ty0; ty <= ty1; ty++) {
        cargas.push(carregarTile(URL_ESRI(z, tx, ty)).then((img) => {
          if (img) { ctx.drawImage(img, tx * TILE - pxMin, ty * TILE - pyMin); carregados++; }
        }));
      }
    }
    await Promise.all(cargas);

    // Se menos de 50% dos tiles foram carregados (servidor sem alta resolução nessa coordenada), tenta zoom menor
    if (carregados < Math.max(1, nTiles * 0.5)) continue;

    // contorno de cada gleba em BRANCO com linha forte (halo escuro + leve preenchimento) e os
    // vértices marcados — mostra ao cartório, com nitidez, onde o imóvel está.
    // Glebas auxiliares são desenhadas com linha mais fina que as ativas.
    const esc = w / 1000;
    normRings.forEach((ring) => {
      const isAuxiliar = ring.tipoGleba === 'auxiliar';
      const lineW = isAuxiliar ? 2.6 * esc : 5.2 * esc;
      const haloW = isAuxiliar ? 6 * esc : 11 * esc;
      const dotR = isAuxiliar ? 3.2 * esc : 5.2 * esc;

      const xy = ring.pts.map((p) => [lonToGlobalPx(p.lon, z) - pxMin, latToGlobalPx(p.lat, z) - pyMin] as const);
      const traco = () => { ctx.beginPath(); xy.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y))); ctx.closePath(); };
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      traco(); ctx.fillStyle = isAuxiliar ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.14)'; ctx.fill();
      traco(); ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = haloW; ctx.stroke();   // halo
      traco(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = lineW; ctx.stroke();          // branco forte
      // vértices
      xy.forEach(([x, y]) => {
        ctx.beginPath(); ctx.arc(x, y, dotR, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff'; ctx.fill();
        ctx.lineWidth = 1.2 * esc; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.stroke();
      });
    });

    const orcamentoChars = opts.orcamentoChars ?? 700_000;
    try {
      for (const qualidade of [0.9, 0.75, 0.6, 0.45, 0.3]) {
        const url = canvas.toDataURL('image/jpeg', qualidade);
        if (url.length <= orcamentoChars) return url;
      }
    } catch { continue; }
  }

  return null;
}
