// Estimativa de altitude (cota Z) para pontos que não foram medidos, a partir dos pontos que TÊM cota.
// Usa a MESMA malha de triângulos (TIN, Delaunay) das curvas de nível: se o ponto-alvo cai dentro de
// um triângulo de pontos conhecidos, a cota é interpolada linearmente pelos pesos baricêntricos (é a
// superfície do terreno naquele triângulo); se cai FORA do fecho dos pontos conhecidos, cai no
// método de vizinhança — média ponderada pelo inverso do quadrado da distância (IDW).
// Trabalha no plano projetado (Leste/Norte, em metros). Não conhece nada de UI nem de estado do app.

import { triangularDelaunay, type Ponto2D, type Ponto3D } from './curvasNivel';

/** Pesos baricêntricos de p no triângulo (a,b,c). null se o triângulo é degenerado. */
function baricentrico(p: Ponto2D, a: Ponto2D, b: Ponto2D, c: Ponto2D): { u: number; v: number; w: number } | null {
  const v0x = b.x - a.x, v0y = b.y - a.y;
  const v1x = c.x - a.x, v1y = c.y - a.y;
  const v2x = p.x - a.x, v2y = p.y - a.y;
  const den = v0x * v1y - v1x * v0y;
  if (Math.abs(den) < 1e-12) return null; // triângulo colinear
  const v = (v2x * v1y - v1x * v2y) / den; // peso de b
  const w = (v0x * v2y - v2x * v0y) / den; // peso de c
  const u = 1 - v - w;                      // peso de a
  return { u, v, w };
}

/** Média ponderada pelo inverso do quadrado da distância (IDW). Se o alvo coincide com um conhecido,
 *  devolve a cota dele. null se não há conhecidos. */
function idw(alvo: Ponto2D, conhecidos: Ponto3D[]): number | null {
  let num = 0, den = 0;
  for (const k of conhecidos) {
    const d2 = (k.x - alvo.x) ** 2 + (k.y - alvo.y) ** 2;
    if (d2 < 1e-9) return k.z; // coincide com um ponto medido
    const peso = 1 / d2;
    num += peso * k.z;
    den += peso;
  }
  return den > 0 ? num / den : null;
}

/**
 * Estima a cota Z de cada ponto em `alvos` a partir de `conhecidos` (pontos com x,y,z medidos).
 * Devolve um array alinhado a `alvos`: número estimado, ou null quando não há base para estimar.
 */
export function estimarAltitudes(conhecidos: Ponto3D[], alvos: Ponto2D[]): (number | null)[] {
  const cs = conhecidos.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z));
  if (cs.length === 0) return alvos.map(() => null);

  // Deduplicação espacial por coordenadas planas (com tolerância de 1mm = 0.001) para evitar triângulos de área zero
  const dedup: Ponto3D[] = [];
  for (const p of cs) {
    const duplicate = dedup.some(
      (d) => Math.hypot(d.x - p.x, d.y - p.y) < 0.001
    );
    if (!duplicate) {
      dedup.push(p);
    }
  }

  // menos de 3 pontos não formam malha — só dá pra vizinhança (IDW)
  if (dedup.length < 3) return alvos.map((t) => idw(t, dedup));

  const tris = triangularDelaunay(dedup);
  return alvos.map((t) => {
    for (const tri of tris) {
      const A = dedup[tri[0]], B = dedup[tri[1]], C = dedup[tri[2]];
      const wgt = baricentrico(t, A, B, C);
      // dentro do triângulo: todos os pesos >= 0 (com folga numérica)
      if (wgt && wgt.u >= -1e-9 && wgt.v >= -1e-9 && wgt.w >= -1e-9) {
        return wgt.u * A.z + wgt.v * B.z + wgt.w * C.z;
      }
    }
    return idw(t, dedup); // fora do fecho dos pontos medidos
  });
}
