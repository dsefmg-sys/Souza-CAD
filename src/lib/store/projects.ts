import type { Projeto } from '../topo/types';
import { db, novoId } from './db';

export async function salvarProjeto(p: Projeto): Promise<void> {
  const d = await db();
  await d.put('projetos', { ...p, atualizadoEm: Date.now() });
}

export async function listarProjetos(): Promise<Projeto[]> {
  const d = await db();
  const todos = await d.getAll('projetos');
  return todos.sort((a, b) => b.atualizadoEm - a.atualizadoEm);
}

export async function carregarProjeto(id: string): Promise<Projeto | undefined> {
  const d = await db();
  return d.get('projetos', id);
}

export async function excluirProjeto(id: string): Promise<void> {
  const d = await db();
  await d.delete('projetos', id);
}

export { novoId };
