import type { Vertex, Contadores, PontoRegistro, TecnicoData } from '../topo/types';
import { db } from './db';
import { semente, atribuirDefinitivo } from '../topo/registroCore';

export async function lerContadores(prefixo: string, tec: TecnicoData): Promise<Contadores> {
  const d = await db();
  const c = await d.get('contadores', prefixo);
  return c ?? semente(prefixo, tec);
}

/**
 * Registra (consome) os pontos ainda não registrados de um conjunto de vértices.
 * Lê o contador autoritativo no momento do commit, grava contador + pontos numa transação,
 * e devolve os vértices com os códigos definitivos. Garante numeração que nunca se repete.
 */
export async function registrarPontos(
  vertices: Vertex[],
  prefixo: string,
  imovelId: string | undefined,
  zonaUtm: number,
  hemisferio: 'N' | 'S',
  tec: TecnicoData
): Promise<{ vertices: Vertex[]; pontos: PontoRegistro[] }> {
  const d = await db();
  const tx = d.transaction(['contadores', 'pontos'], 'readwrite');
  const atual = (await tx.objectStore('contadores').get(prefixo)) ?? semente(prefixo, tec);
  const r = atribuirDefinitivo(vertices, atual, imovelId, zonaUtm, hemisferio, Date.now());
  await tx.objectStore('contadores').put(r.contadores);
  for (const p of r.pontos) await tx.objectStore('pontos').put(p);
  await tx.done;
  return { vertices: r.vertices, pontos: r.pontos };
}

export async function codigoEmUso(codigo: string): Promise<boolean> {
  const d = await db();
  return (await d.get('pontos', codigo)) !== undefined;
}

export async function pontosDoImovel(imovelId: string): Promise<PontoRegistro[]> {
  const d = await db();
  return d.getAllFromIndex('pontos', 'por-imovel', imovelId);
}

export async function totalPontosRegistrados(): Promise<number> {
  const d = await db();
  return d.count('pontos');
}

/** Ajuste manual dos contadores (Configurações), respeitando o que já foi usado. */
export async function definirContadores(c: Contadores): Promise<void> {
  const d = await db();
  await d.put('contadores', c);
}
