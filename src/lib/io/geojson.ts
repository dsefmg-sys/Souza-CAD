// Importa anéis de polígono de um GeoJSON (parcela certificada do SIGEF exportada do QGIS/Acervo).
// Detecta se as coordenadas são geográficas (lon/lat) ou UTM (Leste/Norte) pela magnitude.

export interface PontoXY { x: number; y: number; }
export interface AneisGeoJson { aneis: PontoXY[][]; geografico: boolean; }

type Pos = [number, number, ...number[]];

function coletarAneis(geom: { type: string; coordinates: unknown }, out: Pos[][]) {
  if (!geom || !geom.type) return;
  if (geom.type === 'Polygon') {
    const c = geom.coordinates as Pos[][];
    if (c[0]) out.push(c[0]); // anel externo
  } else if (geom.type === 'MultiPolygon') {
    const c = geom.coordinates as Pos[][][];
    for (const poly of c) if (poly[0]) out.push(poly[0]);
  } else if (geom.type === 'LineString') {
    out.push(geom.coordinates as Pos[]);
  } else if (geom.type === 'GeometryCollection') {
    for (const g of (geom as unknown as { geometries: { type: string; coordinates: unknown }[] }).geometries) coletarAneis(g, out);
  }
}

export function importarGeoJsonAneis(texto: string): AneisGeoJson {
  const obj = JSON.parse(texto);
  const geoms: Pos[][] = [];
  if (obj.type === 'FeatureCollection') {
    for (const f of obj.features ?? []) if (f.geometry) coletarAneis(f.geometry, geoms);
  } else if (obj.type === 'Feature') {
    if (obj.geometry) coletarAneis(obj.geometry, geoms);
  } else if (obj.type) {
    coletarAneis(obj, geoms);
  }

  // detecta geográfica: todas as coords dentro de lon/lat
  let geografico = true;
  for (const anel of geoms) for (const p of anel) {
    if (Math.abs(p[0]) > 180 || Math.abs(p[1]) > 90) { geografico = false; break; }
  }

  const aneis = geoms
    .map((anel) => anel.map((p) => ({ x: p[0], y: p[1] })))
    .filter((a) => a.length >= 2);
  return { aneis, geografico };
}
