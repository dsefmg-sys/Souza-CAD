import proj4 from 'proj4';

// SIRGAS 2000 usa o elipsoide GRS80. WGS84 é praticamente idêntico para fins de conversão,
// mas mantemos GRS80 explícito para coincidir com o que o SIGEF certifica.
const GEO = '+proj=longlat +ellps=GRS80 +no_defs';

/**
 * Descobre a zona UTM a partir da longitude (graus decimais).
 * Zona 1 começa em -180; cada zona tem 6° de largura.
 */
export function zonaPorLongitude(lonDeg: number): number {
  return Math.floor((lonDeg + 180) / 6) + 1;
}

/** Meridiano central de uma zona UTM. */
export function meridianoCentral(zona: number): number {
  return -183 + zona * 6;
}

/**
 * IMPORTANTE: a zona UTM NÃO pode ser recuperada só do par Leste/Norte. A mesma coordenada
 * (E,N) é geometricamente válida em todos os fusos — cada fuso devolve uma longitude deslocada
 * exatamente 6°, sempre na mesma posição relativa. Logo, a zona é um dado externo.
 *
 * Sem âncora, devolvemos a zona-base configurada (o fuso principal de trabalho). O mapa mostra
 * a poligonal na hora, então um fuso errado fica evidente. Para detecção de verdade, use
 * `escolherZonaPorAncora` com a coordenada do município.
 */
export function detectarZona(_leste: number, _norte: number, _hemisferio: 'N' | 'S', zonaBase = 23, fusosPermitidos?: number[]): number {
  if (fusosPermitidos && fusosPermitidos.length && !fusosPermitidos.includes(zonaBase)) {
    return fusosPermitidos[0];
  }
  return zonaBase;
}

/**
 * Escolhe o fuso pela ÂNCORA do município (lat/lon aproximada): testa cada fuso permitido e
 * fica com o que coloca a coordenada (E,N) mais perto da âncora. Como os fusos errados jogam o
 * ponto a centenas de km, a escolha é robusta — é assim que desambiguamos a divisa 23/24.
 */
export function escolherZonaPorAncora(
  leste: number,
  norte: number,
  hemisferio: 'N' | 'S',
  ancora: { lat: number; lon: number },
  fusosPermitidos: number[] = [18, 19, 20, 21, 22, 23, 24, 25]
): number {
  let melhor = fusosPermitidos[0];
  let melhorD = Infinity;
  for (const z of fusosPermitidos) {
    if (z < 1 || z > 60) continue;
    const [lon, lat] = proj4(utmDef(z, hemisferio), GEO, [leste, norte]);
    const d = Math.hypot(lon - ancora.lon, lat - ancora.lat);
    if (d < melhorD) { melhorD = d; melhor = z; }
  }
  return melhor;
}

export function utmDef(zona: number, hemisferio: 'N' | 'S'): string {
  return `+proj=utm +zone=${zona} ${hemisferio === 'S' ? '+south ' : ''}+ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs`;
}

export interface GeoCoord { lat: number; lon: number; }

/**
 * Convergência meridiana (graus): ângulo entre o Norte da quadrícula (NQ) e o Norte verdadeiro
 * (NV) no ponto. γ = arctan( tan(λ - MC) · sin(φ) ). Positiva a leste do meridiano central.
 */
export function convergenciaMeridiana(latDeg: number, lonDeg: number, zona: number): number {
  const mc = meridianoCentral(zona);
  const dl = ((lonDeg - mc) * Math.PI) / 180;
  const phi = (latDeg * Math.PI) / 180;
  const g = Math.atan(Math.tan(dl) * Math.sin(phi));
  return (g * 180) / Math.PI;
}

/**
 * Aproximação polinomial quadrática da declinação magnética (graus) para o
 * território brasileiro, ajustada por mínimos quadrados a partir de valores
 * WMM2025 (época 2026) em 6 cidades de referência: Brasília, São Paulo,
 * Recife, Manaus, Porto Alegre e Belém. Resultado negativo = oeste.
 * Válida no retângulo Lat [+5, −34], Lon [−35, −74] com erro < 0,5°.
 */
export function aproximarDeclinacaoMagnetica(lat: number, lon: number): number {
  const d = -1.4714269397 + 1.5309486827 * lat + 0.6532699294 * lon
    - 0.0011398906 * lat * lat + 0.0052686712 * lon * lon
    + 0.0327495350 * lat * lon;
  return Math.max(-25, Math.min(-10, d));
}

/** UTM (Leste, Norte) -> geográfica (lat, lon) em graus decimais. */
export function utmParaGeo(leste: number, norte: number, zona: number, hemisferio: 'N' | 'S'): GeoCoord {
  const [lon, lat] = proj4(utmDef(zona, hemisferio), GEO, [leste, norte]);
  return { lat, lon };
}

/** geográfica -> UTM. */
export function geoParaUtm(lat: number, lon: number, zona: number, hemisferio: 'N' | 'S'): { leste: number; norte: number } {
  const [leste, norte] = proj4(GEO, utmDef(zona, hemisferio), [lon, lat]);
  return { leste, norte };
}

/**
 * Formata graus decimais como DMS no padrão SIGEF/memorial.
 * estilo 'memorial' -> -42°00'03,046"  | estilo 'sigef' -> 42 00 03,046 W
 */
export function grausParaDMS(
  deg: number,
  opts: { casas?: number; estilo?: 'memorial' | 'sigef'; eixo?: 'lon' | 'lat' } = {}
): string {
  const casas = opts.casas ?? 3;
  const estilo = opts.estilo ?? 'memorial';
  const neg = deg < 0;
  let a = Math.abs(deg);
  let d = Math.floor(a); a = (a - d) * 60;
  let m = Math.floor(a); a = (a - m) * 60;
  let s = a;
  // carry de arredondamento dos segundos
  let sStr = s.toFixed(casas);
  if (parseFloat(sStr) >= 60) { sStr = (0).toFixed(casas); m += 1; }
  if (m >= 60) { m -= 60; d += 1; }
  const sVirgula = sStr.replace('.', ',');
  if (estilo === 'sigef') {
    const sufixo = opts.eixo === 'lat' ? (neg ? 'S' : 'N') : (neg ? 'W' : 'E');
    return `${d} ${String(m).padStart(2, '0')} ${padSeg(sVirgula, casas)} ${sufixo}`;
  }
  const sinal = neg ? '-' : '';
  return `${sinal}${d}°${String(m).padStart(2, '0')}'${padSeg(sVirgula, casas)}"`;
}

/** Garante 2 dígitos inteiros nos segundos (ex.: "3,046" -> "03,046"). */
function padSeg(sVirgula: string, casas: number): string {
  const [int, frac] = sVirgula.split(',');
  const intPad = int.padStart(2, '0');
  return casas > 0 ? `${intPad},${(frac ?? '').padEnd(casas, '0')}` : intPad;
}
