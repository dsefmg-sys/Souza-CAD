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

export async function gerarSituacao(aneis: PontoGeo[][], opts: { alvoPx?: number; padding?: number; aspecto?: number; orcamentoChars?: number } = {}): Promise<string | null> {
  const rings = aneis.filter((a) => a.length >= 3);
  const pts = rings.flat();
  if (typeof document === 'undefined' || pts.length < 3) return null;
  const alvoPx = opts.alvoPx ?? 1024;     // resolução-alvo (nitidez)
  const pad = opts.padding ?? 1.1;       // folga ao redor do imóvel (enquadramento)
  const aspecto = opts.aspecto ?? 232 / 168; // mesma proporção do quadro na planta (sem cortar)

  let minLat = Math.min(...pts.map((p) => p.lat));
  let maxLat = Math.max(...pts.map((p) => p.lat));
  let minLon = Math.min(...pts.map((p) => p.lon));
  let maxLon = Math.max(...pts.map((p) => p.lon));
  // centro e meias-extensões com folga
  const cLat = (minLat + maxLat) / 2, cLon = (minLon + maxLon) / 2;
  const latRad = (cLat * Math.PI) / 180;
  let halfLon = ((maxLon - minLon) / 2) * (1 + pad) || 0.0008;
  let halfLat = ((maxLat - minLat) / 2) * (1 + pad) || 0.0008;
  // ajusta para a proporção do quadro (em metros aprox.: 1° lon ~ cos(lat)·1° lat)
  const wM = halfLon * Math.cos(latRad), hM = halfLat;
  if (wM / hM < aspecto) halfLon = (aspecto * hM) / Math.cos(latRad); else halfLat = (wM / aspecto);
  minLon = cLon - halfLon; maxLon = cLon + halfLon;
  minLat = cLat - halfLat; maxLat = cLat + halfLat;

  const z = escolherZoom(maxLon - minLon, alvoPx);
  const pxMin = lonToGlobalPx(minLon, z), pxMax = lonToGlobalPx(maxLon, z);
  const pyMin = latToGlobalPx(maxLat, z), pyMax = latToGlobalPx(minLat, z); // lat maior = py menor
  const w = Math.min(2000, Math.ceil(pxMax - pxMin));
  const h = Math.min(2000, Math.ceil(pyMax - pyMin));
  if (w < 8 || h < 8) return null;

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#dfe7ef'; ctx.fillRect(0, 0, w, h);

  const tx0 = Math.floor(pxMin / TILE), tx1 = Math.floor(pxMax / TILE);
  const ty0 = Math.floor(pyMin / TILE), ty1 = Math.floor(pyMax / TILE);
  const nTiles = Math.max(0, (tx1 - tx0 + 1) * (ty1 - ty0 + 1));
  if (nTiles === 0 || nTiles > 160) return null; // proteção

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
  // Exige a MAIORIA dos tiles (não só "pelo menos 1") — com rede instável/CORS parcial, é comum
  // só uma fração pequena carregar; antes disso já "passava" e salvava uma imagem quase toda no
  // fundo cinza-claro de preenchimento (ctx.fillStyle acima), sem avisar ninguém. Isso é o que o
  // dono via como "só um fundo claro" (10/07/2026) — o app achava que tinha dado certo.
  if (carregados < nTiles * 0.6) return null;

  // contorno de cada gleba em BRANCO com linha forte (halo escuro + leve preenchimento) e os
  // vértices marcados — mostra ao cartório, com nitidez, onde o imóvel está.
  const esc = w / 1000; // espessuras proporcionais à resolução
  rings.forEach((anel) => {
    const xy = anel.map((p) => [lonToGlobalPx(p.lon, z) - pxMin, latToGlobalPx(p.lat, z) - pyMin] as const);
    const traco = () => { ctx.beginPath(); xy.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y))); ctx.closePath(); };
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    traco(); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();
    traco(); ctx.strokeStyle = 'rgba(0,0,0,0.65)'; ctx.lineWidth = 11 * esc; ctx.stroke();   // halo
    traco(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5.2 * esc; ctx.stroke();          // branco forte
    // vértices
    xy.forEach(([x, y]) => {
      ctx.beginPath(); ctx.arc(x, y, 5.2 * esc, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.lineWidth = 1.5 * esc; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.stroke();
    });
  });

  // Reduz a qualidade JPEG progressivamente até caber no orçamento (padrão 700.000 caracteres —
  // o mesmo limite que page.tsx usava pra decidir se salvava no projeto). Antes, uma imagem grande
  // demais era gerada normalmente e só DEPOIS descartada em silêncio na hora de salvar (o dono via
  // a situação bonita na hora, mas ela sumia — virava "Situação Indisponível" — ao reabrir o
  // projeto). Gerar já dentro do orçamento evita esse descarte silencioso.
  const orcamentoChars = opts.orcamentoChars ?? 700_000;
  try {
    for (const qualidade of [0.9, 0.75, 0.6, 0.45, 0.3]) {
      const url = canvas.toDataURL('image/jpeg', qualidade);
      if (url.length <= orcamentoChars) return url;
    }
    return null; // nem na qualidade mínima coube — melhor sem situação do que salvar truncada
  } catch { return null; } // canvas tainted (CORS) — sai sem situação
}
