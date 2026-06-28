import type { Gleba, Projeto, Vertex, Confrontante } from './types';

let _seq = 0;
export function novoGlebaId(): string {
  _seq += 1;
  return `g_${Date.now().toString(36)}_${_seq}`;
}

export function novaGlebaVazia(indice: number): Gleba {
  return {
    id: novoGlebaId(),
    denominacao: `Parcela ${indice}`,
    parcela: String(indice).padStart(3, '0'),
    vertices: [],
    confrontantes: [],
    confrontantePorLado: {},
    objetos: [],
  };
}

export function glebaDe(
  indice: number,
  vertices: Vertex[],
  confrontantes: Confrontante[],
  confrontantePorLado: Record<number, string>,
  denominacao?: string
): Gleba {
  return {
    id: novoGlebaId(),
    denominacao: denominacao || `Parcela ${indice}`,
    parcela: String(indice).padStart(3, '0'),
    vertices,
    confrontantes,
    confrontantePorLado,
    objetos: [],
  };
}

/**
 * Migração: projetos salvos antes do multi-gleba têm vertices/confrontantes no topo. Converte
 * para glebas[0]. Projetos já com glebas passam sem mudança.
 */
export function migrarProjeto(p: Projeto): Projeto {
  if (p.glebas && p.glebas.length > 0) return p;
  const g = glebaDe(1, p.vertices ?? [], p.confrontantes ?? [], p.confrontantePorLado ?? {}, 'Parcela 1');
  return { ...p, glebas: [g] };
}
