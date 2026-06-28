import type { Vertex, Contadores, PontoRegistro, TecnicoData, TipoVertice } from './types';

// Lógica pura do banco de pontos (sem IndexedDB), para ser testável.
// Regra de ouro: um número de vértice, uma vez consumido por um credenciado, NUNCA se repete.

export function semente(prefixo: string, tec: Pick<TecnicoData, 'contadorMarco' | 'contadorPonto' | 'contadorVirtual'>): Contadores {
  return {
    prefixo,
    M: Math.max(1, tec.contadorMarco || 1),
    P: Math.max(1, tec.contadorPonto || 1),
    V: Math.max(1, tec.contadorVirtual || 1),
  };
}

function codigo(prefixo: string, tipo: TipoVertice, n: number): string {
  return `${prefixo}-${tipo}-${String(n).padStart(4, '0')}`;
}

/**
 * Atribuição PROVISÓRIA: reescreve os códigos de TODOS os vértices na ordem atual, a partir
 * de uma cópia dos contadores (não consome o banco). Usada na pré-visualização e no botão
 * "Renumerar". Não mexe nos contadores persistidos.
 */
export function atribuirProvisorio(vertices: Vertex[], contadores: Contadores): Vertex[] {
  const c = { ...contadores };
  // números já ocupados por vértices REGISTRADOS na própria lista — os provisórios devem PULAR
  // esses números, senão um provisório poderia receber o mesmo código de um já registrado.
  const usados: Record<string, Set<number>> = { M: new Set(), P: new Set(), V: new Set() };
  for (const v of vertices) {
    if (v.registrado && v.codigoSigef) {
      const m = v.codigoSigef.match(/-([MPV])-(\d+)\s*$/);
      if (m) usados[m[1]].add(parseInt(m[2], 10));
    }
  }
  const proximo = (tipo: 'M' | 'P' | 'V'): number => {
    while (usados[tipo].has(c[tipo])) c[tipo]++;
    return c[tipo]++;
  };
  return vertices.map((v, i) => {
    // vértices já registrados mantêm o código E a marca de registrado.
    if (v.registrado && v.codigoSigef) return { ...v, ordem: i, registrado: true };
    const n = proximo(v.tipo);
    return { ...v, ordem: i, codigoSigef: codigo(contadores.prefixo, v.tipo, n), registrado: v.registrado };
  });
}

/**
 * Atribuição DEFINITIVA: consome o banco apenas para os vértices ainda não registrados.
 * Vértices já registrados mantêm o código. Retorna os vértices atualizados, os novos
 * contadores e os registros de ponto a persistir.
 */
export function atribuirDefinitivo(
  vertices: Vertex[],
  contadores: Contadores,
  imovelId: string | undefined,
  zonaUtm: number,
  hemisferio: 'N' | 'S',
  agora: number
): { vertices: Vertex[]; contadores: Contadores; pontos: PontoRegistro[] } {
  const c = { ...contadores };
  const pontos: PontoRegistro[] = [];
  const out = vertices.map((v, i) => {
    if (v.registrado && v.codigoSigef) return { ...v, ordem: i };
    const n = c[v.tipo]++;
    const cod = codigo(contadores.prefixo, v.tipo, n);
    pontos.push({
      codigo: cod, prefixo: contadores.prefixo, tipo: v.tipo, numero: n,
      leste: v.leste, norte: v.norte, lat: v.lat, lon: v.lon, elevacao: v.elevacao,
      zonaUtm, hemisferio, imovelId, criadoEm: agora,
    });
    return { ...v, ordem: i, codigoSigef: cod, registrado: true };
  });
  return { vertices: out, contadores: c, pontos };
}
