// Cálculo da Área SGL (Sistema Geodésico Local), padrão INCRA/SIGEF.
//
// Por que não usar a área direto do UTM? Porque o UTM distorce: longe do meridiano central
// a escala cresce e a área "incha". O SIGEF certifica a área num plano topocêntrico local
// (tangente à Terra na origem do polígono). É isso que reproduzimos aqui:
//   geográfica (lat,lon,h) -> geocêntrico (X,Y,Z) -> plano local ENU -> área por Gauss.
//
// Validado com os dados reais (Fazenda Ventania): 3,6444 ha e 809,85 m, batendo com o modelo.

const GRS80_A = 6378137.0;
const GRS80_F = 1 / 298.257222101;
const GRS80_E2 = 2 * GRS80_F - GRS80_F * GRS80_F;

export interface LatLonH { lat: number; lon: number; h: number; }
export interface PlanoXY { e: number; n: number; }

function geodeticToECEF(latDeg: number, lonDeg: number, h: number) {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const sinp = Math.sin(lat);
  const cosp = Math.cos(lat);
  const N = GRS80_A / Math.sqrt(1 - GRS80_E2 * sinp * sinp);
  return {
    X: (N + h) * cosp * Math.cos(lon),
    Y: (N + h) * cosp * Math.sin(lon),
    Z: (N * (1 - GRS80_E2) + h) * sinp,
  };
}

/**
 * Projeta os vértices geográficos no plano topocêntrico local (E,N) com origem no primeiro
 * vértice. Retorna as coordenadas planas, na mesma ordem de entrada.
 */
export function projetarPlanoLocal(pts: LatLonH[]): PlanoXY[] {
  if (pts.length === 0) return [];
  const o = pts[0];
  const oEcef = geodeticToECEF(o.lat, o.lon, o.h);
  const lat = (o.lat * Math.PI) / 180;
  const lon = (o.lon * Math.PI) / 180;
  const sinp = Math.sin(lat), cosp = Math.cos(lat);
  const sinl = Math.sin(lon), cosl = Math.cos(lon);
  return pts.map((p) => {
    const ecef = geodeticToECEF(p.lat, p.lon, p.h);
    const dx = ecef.X - oEcef.X;
    const dy = ecef.Y - oEcef.Y;
    const dz = ecef.Z - oEcef.Z;
    const e = -sinl * dx + cosl * dy;
    const n = -sinp * cosl * dx - sinp * sinl * dy + cosp * dz;
    return { e, n };
  });
}

/** Área (m²) por fórmula de Gauss (shoelace) sobre o anel fechado. */
export function areaPlano(plano: PlanoXY[]): number {
  let a2 = 0;
  for (let i = 0; i < plano.length; i++) {
    const a = plano[i];
    const b = plano[(i + 1) % plano.length];
    a2 += a.e * b.n - b.e * a.n;
  }
  return Math.abs(a2) / 2;
}

/** Perímetro (m) somando as distâncias dos lados no plano local. */
export function perimetroPlano(plano: PlanoXY[]): number {
  let p = 0;
  for (let i = 0; i < plano.length; i++) {
    const a = plano[i];
    const b = plano[(i + 1) % plano.length];
    p += Math.hypot(b.e - a.e, b.n - a.n);
  }
  return p;
}

export interface AreaSglResult { plano: PlanoXY[]; areaM2: number; areaHa: number; perimetro: number; }

export function calcularAreaSgl(pts: LatLonH[]): AreaSglResult {
  const plano = projetarPlanoLocal(pts);
  const areaM2 = areaPlano(plano);
  return { plano, areaM2, areaHa: areaM2 / 10000, perimetro: perimetroPlano(plano) };
}
