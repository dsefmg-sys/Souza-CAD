interface PontoUtm {
  leste: number;
  norte: number;
}

/**
 * Divide um segmento AB em N partes iguais.
 * Retorna os N-1 pontos intermediários.
 */
export function dividirSegmentoUtm(a: PontoUtm, b: PontoUtm, n: number): PontoUtm[] {
  if (n < 2) return [];
  const pontos: PontoUtm[] = [];
  for (let i = 1; i < n; i++) {
    const t = i / n;
    pontos.push({
      leste: a.leste + t * (b.leste - a.leste),
      norte: a.norte + t * (b.norte - a.norte)
    });
  }
  return pontos;
}

/**
 * Calcula o ponto de interseção entre duas retas infinitas AB e CD.
 * Retorna null se forem paralelas.
 */
export function intersecaoRetasUtm(a: PontoUtm, b: PontoUtm, c: PontoUtm, d: PontoUtm): PontoUtm | null {
  const det = (b.leste - a.leste) * (d.norte - c.norte) - (b.norte - a.norte) * (d.leste - c.leste);
  if (Math.abs(det) < 1e-6) return null; // paralelas

  const t = ((c.leste - a.leste) * (d.norte - c.norte) - (c.norte - a.norte) * (d.leste - c.leste)) / det;
  return {
    leste: a.leste + t * (b.leste - a.leste),
    norte: a.norte + t * (b.norte - a.norte)
  };
}

/**
 * Translada um conjunto de pontos por um delta.
 */
export function transladarPontosUtm(pontos: PontoUtm[], dLeste: number, dNorte: number): PontoUtm[] {
  return pontos.map(p => ({
    leste: p.leste + dLeste,
    norte: p.norte + dNorte
  }));
}
