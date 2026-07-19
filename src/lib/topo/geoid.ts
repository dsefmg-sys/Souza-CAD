/**
 * Módulo de Ondulação Geoidal MAPGEO (IBGE / EGM2008) para o Souza-CAD.
 * 
 * Permite converter de forma 100% automática entre:
 *  - Altitude Elipsoidal (h) -> Medida diretamente pelo receptor GNSS/GPS RTK (SIRGAS 2000).
 *  - Altitude Ortométrica (H) -> Altitude física em relação ao Nível Médio do Mar (IBGE / SRTM).
 * 
 * Relação Fundamental Geodésica:
 *  h = H + N  =>  H = h - N
 *  onde N é a Ondulação Geoidal em metros (no Brasil N varia tipicamente de -4m a -35m).
 */

export interface PontoGeoideAnchor {
  lat: number;
  lon: number;
  n: number; // Ondulação N em metros
  nome: string;
}

// Estações e pontos de controle MAPGEO / EGM distribuídos por todas as regiões do Brasil
export const ANCORAS_MAPGEO_BRASIL: PontoGeoideAnchor[] = [
  // Região Sul
  { lat: -30.03, lon: -51.23, n: -6.8, nome: 'Porto Alegre - RS' },
  { lat: -27.59, lon: -48.54, n: -5.2, nome: 'Florianópolis - SC' },
  { lat: -25.42, lon: -49.27, n: -4.2, nome: 'Curitiba - PR' },
  { lat: -24.95, lon: -53.46, n: -9.5, nome: 'Cascavel - PR' },

  // Região Sudeste
  { lat: -23.55, lon: -46.63, n: -6.5, nome: 'São Paulo - SP' },
  { lat: -22.90, lon: -43.17, n: -7.2, nome: 'Rio de Janeiro - RJ' },
  { lat: -20.65, lon: -41.90, n: -10.5, nome: 'Espera Feliz / Zona da Mata - MG' },
  { lat: -19.92, lon: -43.94, n: -11.2, nome: 'Belo Horizonte - MG' },
  { lat: -20.32, lon: -40.33, n: -9.1, nome: 'Vitória - ES' },
  { lat: -18.91, lon: -48.27, n: -16.4, nome: 'Uberlândia - MG' },

  // Região Centro-Oeste
  { lat: -15.78, lon: -47.92, n: -18.4, nome: 'Brasília - DF' },
  { lat: -16.68, lon: -49.25, n: -17.5, nome: 'Goiânia - GO' },
  { lat: -15.60, lon: -56.09, n: -15.2, nome: 'Cuiabá - MT' },
  { lat: -20.44, lon: -54.64, n: -12.1, nome: 'Campo Grande - MS' },
  { lat: -11.85, lon: -55.50, n: -19.8, nome: 'Sinop - MT' },

  // Região Nordeste
  { lat: -12.97, lon: -38.50, n: -13.5, nome: 'Salvador - BA' },
  { lat: -9.66, lon: -35.73, n: -11.8, nome: 'Maceió - AL' },
  { lat: -8.05, lon: -34.88, n: -14.8, nome: 'Recife - PE' },
  { lat: -7.11, lon: -34.86, n: -15.1, nome: 'João Pessoa - PB' },
  { lat: -5.79, lon: -35.20, n: -15.9, nome: 'Natal - RN' },
  { lat: -3.73, lon: -38.52, n: -16.2, nome: 'Fortaleza - CE' },
  { lat: -5.09, lon: -42.80, n: -21.4, nome: 'Teresina - PI' },
  { lat: -2.53, lon: -44.30, n: -24.8, nome: 'São Luís - MA' },
  { lat: -12.15, lon: -44.99, n: -19.2, nome: 'Barreiras - BA' },

  // Região Norte
  { lat: -1.45, lon: -48.48, n: -22.5, nome: 'Belém - PA' },
  { lat: -3.10, lon: -60.02, n: -28.4, nome: 'Manaus - AM' },
  { lat: -10.21, lon: -48.33, n: -22.1, nome: 'Palmas - TO' },
  { lat: -8.76, lon: -63.90, n: -24.2, nome: 'Porto Velho - RO' },
  { lat: -9.97, lon: -67.81, n: -26.8, nome: 'Rio Branco - AC' },
  { lat: 0.03, lon: -51.06, n: -21.0, nome: 'Macapá - AP' },
  { lat: 2.82, lon: -60.67, n: -26.5, nome: 'Boa Vista - RR' },
  { lat: -5.38, lon: -49.13, n: -24.5, nome: 'Marabá - PA' },
  { lat: -4.27, lon: -55.99, n: -26.9, nome: 'Itaituba - PA' },
];

/**
 * Calcula a ondulação geoidal N (em metros) para qualquer coordenada geográfica no Brasil
 * usando interpolação espacial IDW (Inverse Distance Weighting) com raio adaptativo.
 * 
 * @param lat Latitude em graus decimais (ex: -20.65)
 * @param lon Longitude em graus decimais (ex: -41.90)
 * @returns Ondulação Geoidal N em metros (ex: -10.5)
 */
export function calcularOndulacaoGeoidalMAPGEO(lat: number, lon: number): number {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return -15.0; // valor médio Brasil fallback

  let somaPesos = 0;
  let somaValores = 0;
  const p = 2.5; // Potência de decaimento da distância

  for (const ancora of ANCORAS_MAPGEO_BRASIL) {
    const dLat = lat - ancora.lat;
    const dLon = lon - ancora.lon;
    const dist2 = dLat * dLat + dLon * dLon;

    // Se o ponto for exatamente uma âncora (distância < 100m)
    if (dist2 < 1e-6) {
      return ancora.n;
    }

    const peso = 1 / Math.pow(dist2, p / 2);
    somaPesos += peso;
    somaValores += peso * ancora.n;
  }

  if (somaPesos === 0) return -15.0;
  const nInterpolado = somaValores / somaPesos;

  // Arredonda para 2 casas decimais (precisão de 1cm)
  return Number(nInterpolado.toFixed(2));
}

/**
 * Converte Altitude Elipsoidal (h) para Altitude Ortométrica / Marítima (H)
 * H = h - N
 */
export function elipsoidalParaOrtometrica(h: number, N: number): number {
  return Number((h - N).toFixed(3));
}

/**
 * Converte Altitude Ortométrica / Marítima (H) para Altitude Elipsoidal (h)
 * h = H + N
 */
export function ortometricaParaElipsoidal(H: number, N: number): number {
  return Number((H + N).toFixed(3));
}
