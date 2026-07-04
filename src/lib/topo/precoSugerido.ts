// Cálculo de PREÇO SUGERIDO do serviço (georreferenciamento e afins). É só uma referência amigável
// para o agrimensor decidir quanto cobrar — não é tabela oficial nem obrigatória. A fórmula é a
// clássica usada de boca em campo: preço = raiz quadrada da área (em hectares) vezes um fator.
//
// O fator sobe conforme a dificuldade do trabalho (acesso, relevo, mato, número de cantos e de
// confrontantes). São seis níveis. O nível mais fácil usa o "fator base" (que a empresa escolhe,
// começando no salário mínimo vigente); os níveis seguintes acrescentam 10% de cada vez, até +50%.
//
// Puro e testável (sem React): a casca visual só formata e mostra.

/** Área mínima considerada no cálculo. Abaixo disso, conta-se como 4 ha (um trabalho pequeno ainda
 *  dá o mesmo deslocamento, papelada e visita — não faz sentido cobrar proporcionalmente menos). */
export const AREA_MINIMA_HA = 4;

/** Quanto cada nível de dificuldade multiplica o fator base. Nível 1 (mais fácil) = base cheio;
 *  cada nível seguinte soma 10%, até o nível 6 que cobra 50% a mais. Bate com a tabela de campo
 *  (fator base 1000 → 1000, 1100, 1200, 1300, 1400, 1500). */
export const MULTIPLICADORES_DIFICULDADE = [1, 1.1, 1.2, 1.3, 1.4, 1.5] as const;

/** Rótulos curtos e explicação de cada nível, para o agrimensor se situar sem chutar. */
export const NIVEIS_DIFICULDADE: { titulo: string; descricao: string }[] = [
  { titulo: 'Muito fácil', descricao: 'Acesso bom, relevo plano, poucos cantos e confrontantes.' },
  { titulo: 'Fácil', descricao: 'Pequenas dificuldades de acesso ou de campo.' },
  { titulo: 'Médio', descricao: 'Algum trecho de acesso ruim, mais cantos ou mais vizinhos.' },
  { titulo: 'Trabalhoso', descricao: 'Relevo ou vegetação atrapalham parte do levantamento.' },
  { titulo: 'Difícil', descricao: 'Acesso ruim, muitos confrontantes, perímetro recortado.' },
  { titulo: 'Muito difícil', descricao: 'Mata fechada, brejo, rio, muitos cantos — trabalho pesado.' },
];

/** Fator de um nível (0 a 5) a partir do fator base escolhido pela empresa. */
export function fatorDoNivel(fatorBase: number, nivel: number): number {
  const m = MULTIPLICADORES_DIFICULDADE[nivel] ?? 1;
  return fatorBase * m;
}

/** Área efetiva usada no cálculo: nunca menor que o mínimo. */
export function areaEfetiva(areaHa: number): number {
  const a = Number.isFinite(areaHa) ? areaHa : 0;
  return Math.max(a, AREA_MINIMA_HA);
}

/**
 * Preço sugerido, em reais (arredondado para o real cheio). Para uma área e um nível de
 * dificuldade (0 = mais fácil, 5 = mais difícil), dado o fator base da empresa.
 *
 * preço = √(área efetiva) × fator do nível
 */
export function precoSugerido(areaHa: number, fatorBase: number, nivel: number): number {
  const preco = Math.sqrt(areaEfetiva(areaHa)) * fatorDoNivel(fatorBase, nivel);
  return Math.round(preco);
}

/** Os seis preços (um por nível) para uma mesma área. Útil para a coluna do celular. */
export function precosPorDificuldade(areaHa: number, fatorBase: number): number[] {
  return MULTIPLICADORES_DIFICULDADE.map((_, nivel) => precoSugerido(areaHa, fatorBase, nivel));
}

/** Aplica um desconto percentual a um preço já calculado (arredondando para o real cheio). Serve
 *  para o agrimensor iniciante oferecer um valor abaixo da tabela e conquistar os primeiros clientes,
 *  sem ter que recalcular nada — o desconto vale para a tabela toda de uma vez. */
export function comDesconto(preco: number, descontoPct: number): number {
  const d = Number.isFinite(descontoPct) ? Math.min(Math.max(descontoPct, 0), 100) : 0;
  return Math.round(preco * (1 - d / 100));
}

/** Áreas (em ha) que compõem a tabela completa impressa — mesma escada da tabela de campo. */
export const AREAS_TABELA: number[] = [
  4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  25, 30, 35, 40, 50, 60, 70, 80, 90, 100,
];

/** A tabela completa: para cada área, os seis preços por dificuldade. */
export function tabelaCompleta(fatorBase: number): { areaHa: number; precos: number[] }[] {
  return AREAS_TABELA.map((areaHa) => ({ areaHa, precos: precosPorDificuldade(areaHa, fatorBase) }));
}
