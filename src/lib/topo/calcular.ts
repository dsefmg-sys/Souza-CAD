import type { Vertex, Lado, ResultadoCalculo } from './types';
import { calcularAreaSgl, type LatLonH, type PlanoXY } from './sgl';
import { azimute, distancia } from './geometry';

/**
 * Orquestra o cálculo completo a partir dos vértices (já com lat/lon) e do mapa de
 * confrontantes por lado. Produz lados com azimute/distância (no plano SGL), área e perímetro.
 */
export function calcular(
  vertices: Vertex[],
  confrontantePorLado: Record<number, string> = {}
): ResultadoCalculo {
  const pts: LatLonH[] = vertices.map((v) => ({ lat: v.lat, lon: v.lon, h: v.elevacao }));
  const { plano, areaM2, areaHa, perimetro } = calcularAreaSgl(pts);

  const lados: Lado[] = [];
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const a: PlanoXY = plano[i];
    const b: PlanoXY = plano[(i + 1) % n];
    lados.push({
      de: vertices[i],
      para: vertices[(i + 1) % n],
      azimute: azimute(a, b),
      distancia: distancia(a, b),
      confrontanteId: confrontantePorLado[i] ?? null,
    });
  }

  return { vertices, lados, areaM2, areaHa, perimetro };
}
