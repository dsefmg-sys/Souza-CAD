// Fusos UTM que cobrem cada UF do Brasil. Usado pra SUGERIR os fusos permitidos na hora de
// cadastrar a empresa (a UF de atuação diz quais fusos fazem sentido), ajustável depois.
// Fonte: longitude dos extremos de cada UF (fusos 18 a 25 cobrem o Brasil inteiro).
export const FUSOS_POR_UF: Record<string, number[]> = {
  AC: [18, 19], AM: [19, 20, 21], RR: [20, 21], RO: [20, 21], PA: [21, 22, 23],
  AP: [22], MT: [20, 21, 22], MS: [21, 22], TO: [22, 23], MA: [22, 23, 24],
  PI: [23, 24], CE: [24], RN: [24, 25], PB: [24, 25], PE: [24, 25], AL: [24, 25],
  SE: [24], BA: [23, 24], GO: [22, 23], DF: [23], MG: [22, 23, 24], ES: [24],
  RJ: [23, 24], SP: [22, 23], PR: [21, 22], SC: [22], RS: [21, 22],
};

/** Fusos sugeridos pra uma lista de UFs de atuação (união, ordenada, sem repetição). */
export function fusosDasUfs(ufs: string[]): number[] {
  const out = new Set<number>();
  for (const uf of ufs) for (const f of FUSOS_POR_UF[uf.trim().toUpperCase()] ?? []) out.add(f);
  return [...out].sort((a, b) => a - b);
}
