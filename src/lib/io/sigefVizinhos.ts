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

// Busca uma tag (ignorando namespace e maiúsculas) dentro de um TRECHO de texto já isolado, com uma
// varredura de conteúdo LIMITADA ("não passa de um `<`") — sem referência cruzada, sem "varra até
// achar a tag de fechamento em qualquer lugar do resto do documento". É esse limite que evita o
// travamento: o pior caso é sempre proporcional ao tamanho do TRECHO, nunca do arquivo inteiro.
function achaTag(trecho: string, ...nomes: string[]): string {
  for (const nome of nomes) {
    const m = new RegExp(`<(?:[a-zA-Z0-9_-]+:)?${nome}\\b[^>]*>\\s*([^<]*)`, 'i').exec(trecho);
    const val = m ? m[1].trim() : '';
    if (val) return val.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  }
  return '';
}

/**
 * Lê um GML/XML de certificação do SIGEF contendo os vértices com atributos completos
 * (código do vértice, coordenadas de latitude/longitude, altitude, tipo, método e limite).
 *
 * Divide o texto em blocos por ocorrência de tag de ABERTURA de vértice (mesmo truque seguro que
 * `parseGmlParcelas` já usava com `.split('<gml:featureMember>')`) — em vez de caçar, com referência
 * cruzada, a tag de FECHAMENTO específica em qualquer lugar do resto do documento. Um GML completo
 * (Método 2 do SIGEF) pode ter várias centenas de vértices; a versão anterior, com essa referência
 * cruzada recompilada a cada nó, travava a aba em arquivos grandes — corte simples é sempre linear.
 */
export interface VerticeSigefGml {
  lat: number;
  lon: number;
  altitude: number;
  id: string;
  nome: string;
  codigoSigef?: string;
  tipo: 'M' | 'P' | 'V';
  metodo?: string;
  limite?: string;
  sigmaH?: number;
  sigmaV?: number;
}

export function parseVerticesSigefGml(xmlText: string): VerticeSigefGml[] {
  const vertices: VerticeSigefGml[] = [];

  // Alguns exportadores embrulham cada <geo:Vértice> (com acento — a tag de verdade) dentro de um
  // container <sigef:vertice> (sem acento, plural/genérico) — por isso tenta primeiro achar a tag
  // COM acento; só cai pra sem acento se o arquivo não tiver nenhuma (senão contaria a mesma tag em
  // dobro, uma vez pelo container e outra pela tag de dentro).
  const comAcento = xmlText.split(/<(?:[a-zA-Z0-9_-]+:)?Vértice\b[^>]*>/i).slice(1);
  const blocos = comAcento.length ? comAcento : xmlText.split(/<(?:[a-zA-Z0-9_-]+:)?vertice\b[^>]*>/i).slice(1);
  const totalNos = blocos.length;

  let idx = 1;
  for (const bloco of blocos) {
    const codigo = achaTag(bloco, 'codigo', 'nome', 'id');
    const latitudeStr = achaTag(bloco, 'latitude', 'lat');
    const longitudeStr = achaTag(bloco, 'longitude', 'lon', 'long');
    const altitudeStr = achaTag(bloco, 'altitude', 'elevacao', 'alt', 'h');
    const tipoStr = achaTag(bloco, 'tipo');
    const metodoStr = achaTag(bloco, 'metodo', 'metodo_posicionamento');
    const limiteStr = achaTag(bloco, 'limite', 'tipo_limite');
    const sigmaHStr = achaTag(bloco, 'sigma', 'sigmaH', 'longitudeSigma', 'latitudeSigma');
    const sigmaVStr = achaTag(bloco, 'sigmaV', 'altitudeSigma');

    const lat = parseFloat(latitudeStr.replace(',', '.'));
    const lon = parseFloat(longitudeStr.replace(',', '.'));

    // Guarda de faixa: `parseFloat` lê só o prefixo numérico da string, então uma tag com formato
    // inesperado (typo, corrupção de copy-paste) pode gerar um número finito mas ABSURDO. Descarta
    // igual ao caso "não conseguiu ler" — entra na diferença entre `.length` e `.totalNos` que quem
    // chama já usa pra avisar de perda.
    if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      let elev = parseFloat(altitudeStr.replace(',', '.'));
      if (!Number.isFinite(elev)) {
        elev = 0;
      }
      const sigmaH = parseFloat(sigmaHStr.replace(',', '.'));
      const sigmaV = parseFloat(sigmaVStr.replace(',', '.'));

      // Heurística de tipo (M = Marco, P = Ponto, V = Virtual)
      let tipo: 'M' | 'P' | 'V' = 'P';
      const upperTipo = tipoStr.toUpperCase();
      if (upperTipo === 'M' || upperTipo === 'MARCO') {
        tipo = 'M';
      } else if (upperTipo === 'V' || upperTipo === 'VIRTUAL') {
        tipo = 'V';
      } else if (upperTipo === 'P' || upperTipo === 'PONTO') {
        tipo = 'P';
      } else if (codigo) {
        // tenta deduzir do código, ex: COIN-M-0017 ou COIN_M_0017
        const parts = codigo.split(/[-_]/);
        if (parts.includes('M')) tipo = 'M';
        else if (parts.includes('V')) tipo = 'V';
        else if (parts.includes('P')) tipo = 'P';
      }

      vertices.push({
        lat,
        lon,
        altitude: elev,
        id: codigo || `P${idx}`,
        nome: codigo || `P${idx}`,
        codigoSigef: codigo || undefined,
        tipo,
        metodo: metodoStr || undefined,
        limite: limiteStr || undefined,
        sigmaH: Number.isFinite(sigmaH) ? sigmaH : undefined,
        sigmaV: Number.isFinite(sigmaV) ? sigmaV : undefined
      });
      idx++;
    }
  }

  // Anexa a contagem total de nós encontrados (inclusive os descartados) como propriedade extra do
  // array — não quebra quem usa `vertices` como array normal (.length, [i], .map...), só permite
  // detectar perda silenciosa comparando `.length` com `.totalNos`.
  (vertices as unknown as { totalNos: number }).totalNos = totalNos;
  return vertices;
}

/**
 * Extrai os dados da propriedade (denominação, detentor/proprietário, código e município)
 * de um arquivo GML/XML do SIGEF.
 */
export function parsePropriedadeSigefGml(xmlText: string): {
  denominacao?: string;
  detentor?: string;
  codigoImovel?: string;
  municipio?: string;
  matricula?: string;
} {
  const tagValue = (...tags: string[]): string | undefined => achaTag(xmlText, ...tags) || undefined;

  return {
    denominacao: tagValue('nome_area', 'nomeImovel', 'denominacao', 'imovel', 'nome_imovel'),
    detentor: tagValue('detentor', 'proprietario', 'proprietário', 'titular', 'nome_detentor', 'nome_deten', 'proprietar', 'nome'),
    codigoImovel: tagValue('codigo_imovel', 'codigoImovel', 'cod_imovel', 'codigo_imo', 'codigo'),
    municipio: tagValue('municipio', 'codigo_municipio', 'nome_municipio', 'municipio_codigo', 'nome_munic'),
    matricula: tagValue('matricula', 'num_matric', 'matricula_', 'registro_matricula'),
  };
}
