// Cálculo de VÉRTICE VIRTUAL (tipo V do SIGEF): o canto que o agrimensor não consegue ocupar
// fisicamente (meio de um rio, dentro de uma benfeitoria, ponta de barranco) e determina por
// medida indireta. Duas formas clássicas, ambas puras e testáveis (sem React, sem UTM aqui —
// trabalham no plano E/N já projetado; a conversão pra lat/lon fica na casca visual).

/** Um ponto no plano projetado (UTM): Este (E) e Norte (N), em metros. */
export interface PontoEN {
  leste: number;
  norte: number;
}

/**
 * AFASTAMENTO (offset): a partir de um ponto base ocupado, caminha `distancia` metros na direção
 * do `azimuteGraus` (0 = Norte, sentido horário, como todo azimute topográfico). É o método mais
 * comum de vértice virtual: mede-se do marco acessível para o canto inacessível.
 *
 * E' = E + d·sen(az)   N' = N + d·cos(az)
 */
export function porAfastamento(base: PontoEN, azimuteGraus: number, distancia: number): PontoEN {
  const az = (azimuteGraus * Math.PI) / 180;
  return {
    leste: base.leste + distancia * Math.sin(az),
    norte: base.norte + distancia * Math.cos(az),
  };
}

/**
 * INTERSEÇÃO DE ALINHAMENTOS (método PT8): o vértice fica no cruzamento de duas retas, cada uma
 * definida por dois pontos medidos (reta A→B e reta C→D). Resolve o cruzamento no plano.
 * Retorna `null` quando as retas são paralelas ou coincidentes (não há um único ponto de cruzamento).
 */
export function porInterseccao(a: PontoEN, b: PontoEN, c: PontoEN, d: PontoEN): PontoEN | null {
  const x1 = a.leste, y1 = a.norte;
  const x2 = b.leste, y2 = b.norte;
  const x3 = c.leste, y3 = c.norte;
  const x4 = d.leste, y4 = d.norte;
  const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(den) < 1e-9) return null; // retas paralelas ou coincidentes
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
  return {
    leste: x1 + t * (x2 - x1),
    norte: y1 + t * (y2 - y1),
  };
}
