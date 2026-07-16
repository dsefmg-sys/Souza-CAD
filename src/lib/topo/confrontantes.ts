import type { Vertex, Confrontante } from './types';

/** Um trecho do perímetro entre dois marcos de divisa, com os lados que o compõem. */
export interface Trecho {
  indice: number;
  ladoIndices: number[]; // índices de lados (vértice i -> i+1)
  verticeInicialOrdem: number;
  verticeFinalOrdem: number;
  nomePalpite: string;   // nome do confrontante deduzido das etiquetas "DIVISA A X B"
}

/** Extrai os dois nomes de uma etiqueta "DIVISA <A> X <B>". */
export function partesDaDivisa(codigo: string): string[] {
  const semDivisa = codigo.replace(/divisa/i, '').trim();
  return semDivisa
    .split(/\s+x\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

function toTitleCase(str: string): string {
  const particulas = new Set(['de', 'da', 'do', 'dos', 'das', 'e']);
  return str
    .toLowerCase()
    .split(/\s+/)
    .map((word, idx) => {
      if (particulas.has(word) && idx > 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Nome do confrontante entre duas etiquetas de divisa.
 *
 * Em "DIVISA A X B" e "DIVISA B X C" os dois vértices dividem A/B e B/C. O confrontante do
 * trecho entre eles é o nome que aparece do MESMO LADO nos dois códigos (o "B", que está
 * em a[1] e b[0] — o lado que muda entre as duas etiquetas é o confrontante do trecho).
 *
 * Algoritmo: pra cada posição (0, 1), se os tokens das duas etiquetas batem, esse é o
 * confrontante. Preferência por posições correspondentes (a[0]==b[0] ou a[1]==b[1]) em vez
 * de match em qualquer posição (que era o bug antigo — pegava "A" em "DIVISA A X B" + "DIVISA
 * B X A" como se A fosse o confrontante, mas na verdade o trecho está entre A e B nos dois
 * lados do polígono).
 */
function nomeComum(labelA: string, labelB: string): string {
  const a = partesDaDivisa(labelA);
  const b = partesDaDivisa(labelB);
  // Itera nas posições (0 e 1) e prioriza o match na MESMA posição. A primeira que bater
  // vence — isso captura a semântica do "lado que muda entre as duas etiquetas".
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== undefined && b[i] !== undefined && a[i].toUpperCase() === b[i].toUpperCase()) {
      return toTitleCase(a[i]);
    }
  }
  // Fallback: match em qualquer posição (caso degenerado onde tokens mudaram de ordem).
  for (const x of a) {
    for (const y of b) {
      if (x.toUpperCase() === y.toUpperCase()) return toTitleCase(x);
    }
  }
  // Sem nome em comum, o confrontante do trecho é AMBÍGUO. Deixar em branco força a revisão
  // manual — melhor que chutar a[0] e cravar um nome possivelmente errado num documento legal.
  return '';
}

/**
 * Divide o anel em trechos bounded por marcos de divisa (vértices tipo M).
 * Cada lado i vai do vértice i ao (i+1)%n. Um trecho começa num marco de divisa e
 * inclui todos os lados até o próximo marco de divisa.
 */
export function segmentarPorDivisa(vertices: Vertex[]): Trecho[] {
  const n = vertices.length;
  if (n < 2) return [];
  const divisaOrdens = vertices.filter((v) => v.isDivisa).map((v) => v.ordem);

  // Sem marcos de divisa: um único trecho cobrindo todos os lados.
  if (divisaOrdens.length === 0) {
    return [{
      indice: 0,
      ladoIndices: Array.from({ length: n }, (_, i) => i),
      verticeInicialOrdem: 0,
      verticeFinalOrdem: n - 1,
      nomePalpite: '',
    }];
  }

  const trechos: Trecho[] = [];
  const inicios = [...divisaOrdens].sort((a, b) => a - b);
  for (let k = 0; k < inicios.length; k++) {
    const start = inicios[k];
    const nextDivisa = inicios[(k + 1) % inicios.length];
    const ladoIndices: number[] = [];
    let i = start;
    // anda do marco atual até o próximo marco (sem incluí-lo como início)
    do {
      ladoIndices.push(i);
      i = (i + 1) % n;
    } while (i !== nextDivisa && ladoIndices.length <= n);
    trechos.push({
      indice: k,
      ladoIndices,
      verticeInicialOrdem: start,
      verticeFinalOrdem: nextDivisa,
      nomePalpite: nomeComum(vertices[start].codigoCampo, vertices[nextDivisa].codigoCampo),
    });
  }
  return trechos;
}

/** Cria confrontantes-padrão (um por trecho) e o mapa lado->confrontante. */
export function montarConfrontantes(vertices: Vertex[]): {
  confrontantes: Confrontante[];
  confrontantePorLado: Record<number, string>;
} {
  const trechos = segmentarPorDivisa(vertices);
  const confrontantes: Confrontante[] = [];
  const confrontantePorLado: Record<number, string> = {};
  trechos.forEach((t, i) => {
    const id = `c_${i}`;
    confrontantes.push({
      id,
      nome: t.nomePalpite,
      cpf: '',
      matricula: '',
      cns: '',
    });
    for (const lado of t.ladoIndices) confrontantePorLado[lado] = id;
  });
  return { confrontantes, confrontantePorLado };
}
