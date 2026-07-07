// Confrontantes certificados do SIGEF: a partir de parcelas certificadas (GeoJSON do INCRA/SIGEF,
// importadas pelo "Ref. SIGEF"), descobre quais fazem fronteira com o nosso imóvel e as transforma
// em confrontantes automaticamente.
//
// Por que assim, e não consultando o INCRA direto: os serviços públicos do INCRA não expõem uma
// consulta por bounding box estável e liberam CORS para o navegador. O fluxo robusto é o usuário
// baixar/exportar as parcelas da região (shapefile → GeoJSON no QGIS, ou direto do SIGEF) e o app
// casar os vizinhos. Toda a lógica abaixo é pura e testável.

import type { Confrontante } from '../topo/types';
import { geoParaUtm } from '../topo/coords';

export interface PontoLatLon { lat: number; lon: number }

export interface ParcelaSigef {
  codigoImovel?: string;
  denominacao?: string;
  detentor?: string;
  municipio?: string;
  matricula?: string;
  anel: PontoLatLon[]; // anel exterior em lat/lon
}

/** Primeiro valor não-vazio dentre várias chaves possíveis (nomes truncados de shapefile variam). */
function prop(props: Record<string, unknown>, chaves: string[]): string | undefined {
  const lower = new Map(Object.entries(props).map(([k, v]) => [k.toLowerCase(), v]));
  for (const c of chaves) {
    const v = lower.get(c.toLowerCase());
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return undefined;
}

/** Extrai o anel exterior (lat/lon) de uma geometria Polygon/MultiPolygon do GeoJSON. */
function anelExterior(geom: { type?: string; coordinates?: unknown }): PontoLatLon[] | null {
  if (!geom || !geom.coordinates) return null;
  const toRing = (ring: unknown): PontoLatLon[] | null => {
    if (!Array.isArray(ring)) return null;
    const pts = ring
      .map((c) => (Array.isArray(c) && c.length >= 2 ? { lat: Number(c[1]), lon: Number(c[0]) } : null))
      .filter((p): p is PontoLatLon => !!p && Number.isFinite(p.lat) && Number.isFinite(p.lon));
    return pts.length >= 3 ? pts : null;
  };
  if (geom.type === 'Polygon') {
    const polys = geom.coordinates as unknown[];
    return toRing(polys[0]);
  }
  if (geom.type === 'MultiPolygon') {
    const multi = geom.coordinates as unknown[];
    return toRing((multi[0] as unknown[])?.[0]);
  }
  return null;
}

/** Lê um GeoJSON de parcelas certificadas e devolve as parcelas com atributos + anel. */
export function parseParcelasSigef(geojsonText: string): ParcelaSigef[] {
  let gj: { features?: unknown[] };
  try { gj = JSON.parse(geojsonText); } catch { return []; }
  const feats = Array.isArray(gj.features) ? gj.features : [];
  const out: ParcelaSigef[] = [];
  for (const f of feats as { properties?: Record<string, unknown>; geometry?: { type?: string; coordinates?: unknown } }[]) {
    const anel = anelExterior(f.geometry ?? {});
    if (!anel) continue;
    const p = f.properties ?? {};
    out.push({
      codigoImovel: prop(p, ['codigo_imo', 'cod_imovel', 'codigo', 'codigo_imovel', 'cod_imo']),
      denominacao: prop(p, ['nome_area', 'denominaca', 'denominacao', 'imovel', 'nome_imove']),
      detentor: prop(p, ['detentor', 'nome_deten', 'proprietar', 'nome', 'titular']),
      municipio: prop(p, ['municipio', 'municipio_', 'nome_munic']),
      matricula: prop(p, ['matricula', 'num_matric', 'matricula_']),
      anel,
    });
  }
  return out;
}

/**
 * Lê o GML2 do WFS do INCRA (MapServer) e devolve as parcelas com atributos + anel exterior.
 * O serviço entrega coordenadas como "lon,lat lon,lat ..." (pares separados por espaço; vírgula
 * entre lon e lat). Não expõe o nome do detentor (privacidade) — usamos a denominação/área.
 */
export function parseGmlParcelas(gml: string): ParcelaSigef[] {
  const out: ParcelaSigef[] = [];
  const membros = gml.split('<gml:featureMember>').slice(1);
  for (const m of membros) {
    const anelM = m.match(/<gml:outerBoundaryIs>\s*<gml:LinearRing>\s*<gml:coordinates>([^<]+)<\/gml:coordinates>/);
    if (!anelM) continue;
    const anel = anelM[1].trim().split(/\s+/).map((par) => {
      const [lon, lat] = par.split(',').map(Number);
      return { lat, lon };
    }).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
    if (anel.length < 3) continue;
    const campo = (tag: string): string | undefined => {
      const mm = m.match(new RegExp(`<ms:${tag}>([^<]*)</ms:${tag}>`));
      const v = mm ? mm[1].trim() : '';
      return v ? v.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>') : undefined;
    };
    out.push({
      codigoImovel: campo('codigo_imovel'),
      denominacao: campo('nome_area'),
      detentor: undefined,
      municipio: campo('codigo_municipio'),
      matricula: campo('registro_matricula'),
      anel,
    });
  }
  return out;
}

// ---- adjacência em metros (equirretangular ao redor de uma latitude de referência) ----
function paraMetros(p: PontoLatLon, lat0: number): { x: number; y: number } {
  const k = Math.cos((lat0 * Math.PI) / 180);
  return { x: p.lon * 111320 * k, y: p.lat * 110540 };
}
function distPontoSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
/** Menor distância (m) entre dois anéis (fronteira a fronteira). */
function distanciaAneis(a: PontoLatLon[], b: PontoLatLon[], lat0: number): number {
  const A = a.map((p) => paraMetros(p, lat0));
  const B = b.map((p) => paraMetros(p, lat0));
  let min = Infinity;
  // pontos de A contra segmentos de B
  for (const pa of A) for (let i = 0; i < B.length; i++) {
    const c = B[i], d = B[(i + 1) % B.length];
    min = Math.min(min, distPontoSeg(pa.x, pa.y, c.x, c.y, d.x, d.y));
    if (min === 0) return 0;
  }
  // pontos de B contra segmentos de A (pega o caso de A ter vértices esparsos)
  for (const pb of B) for (let i = 0; i < A.length; i++) {
    const c = A[i], d = A[(i + 1) % A.length];
    min = Math.min(min, distPontoSeg(pb.x, pb.y, c.x, c.y, d.x, d.y));
  }
  return min;
}

/** Centro (em metros) de um anel. */
function centroideM(anel: PontoLatLon[], lat0: number): { x: number; y: number } {
  let sx = 0, sy = 0;
  for (const p of anel) { const m = paraMetros(p, lat0); sx += m.x; sy += m.y; }
  return { x: sx / anel.length, y: sy / anel.length };
}
/** Área (m², valor absoluto) de um anel por Gauss no plano equirretangular. */
function areaM(anel: PontoLatLon[], lat0: number): number {
  const P = anel.map((p) => paraMetros(p, lat0));
  let a2 = 0;
  for (let i = 0; i < P.length; i++) { const c = P[i], d = P[(i + 1) % P.length]; a2 += c.x * d.y - d.x * c.y; }
  return Math.abs(a2) / 2;
}
/**
 * É a MESMA parcela (a própria, quando o imóvel já é certificado e vem no retorno do INCRA)?
 * Não dá pra usar distância de borda: um vizinho que ENCOSTA na divisa também tem distância ~0.
 * O que distingue é a identidade — centro praticamente no mesmo lugar E área quase igual.
 */
function mesmaParcela(a: PontoLatLon[], b: PontoLatLon[], lat0: number): boolean {
  const ca = centroideM(a, lat0), cb = centroideM(b, lat0);
  if (Math.hypot(ca.x - cb.x, ca.y - cb.y) > 2) return false; // centros afastados = parcelas diferentes
  const aa = areaM(a, lat0), ab = areaM(b, lat0);
  return aa > 0 && Math.abs(aa - ab) / aa < 0.05; // áreas batem (até 5%) = é a própria
}

/**
 * Parcelas que fazem FRONTEIRA com o nosso imóvel: a distância entre as bordas é menor que `tolM`
 * (coincidência de divisa, considerando precisão de GNSS). Ignora a própria parcela, se vier junto.
 */
export function parcelasVizinhas(meuAnel: PontoLatLon[], parcelas: ParcelaSigef[], tolM = 15): ParcelaSigef[] {
  if (meuAnel.length < 3) return [];
  const lat0 = meuAnel.reduce((s, p) => s + p.lat, 0) / meuAnel.length;
  return parcelas.filter((par) => {
    if (par.anel.length < 3) return false;
    if (mesmaParcela(meuAnel, par.anel, lat0)) return false; // é a própria parcela, não confrontante
    const d = distanciaAneis(meuAnel, par.anel, lat0);
    return d <= tolM; // encosta (até tolM) = vizinho de divisa
  });
}

/**
 * Converte os anéis das parcelas para o formato de referência (lat/lon + Leste/Norte no fuso do
 * trabalho), prontos para DESENHAR ao lado do imóvel e servir de alvo de snap (encaixe das divisas).
 */
export function parcelasParaReferencias(
  parcelas: ParcelaSigef[], zona: number, hemisferio: 'N' | 'S'
): { lat: number; lon: number; leste: number; norte: number }[][] {
  return parcelas
    .filter((p) => p.anel.length >= 3)
    .map((p) => p.anel.map((q) => {
      const u = geoParaUtm(q.lat, q.lon, zona, hemisferio);
      return { lat: q.lat, lon: q.lon, leste: u.leste, norte: u.norte };
    }));
}

/** Cria confrontantes a partir das parcelas vizinhas (nome = detentor; descrição = código). */
export function confrontantesDeVizinhas(parcelas: ParcelaSigef[]): Confrontante[] {
  return parcelas.map((p, i) => ({
    id: `cv_${i}_${(p.codigoImovel || p.detentor || 'sigef').replace(/\s+/g, '').slice(0, 16)}`,
    nome: p.detentor || p.denominacao || 'Confrontante certificado',
    cpf: '',
    matricula: p.matricula || '',
    cns: '',
    descricaoExtra: p.codigoImovel ? `Imóvel certificado SIGEF (código ${p.codigoImovel})` : undefined,
  }));
}
