import { db, novoId, type ArquivoProjeto } from './db';

export type { ArquivoProjeto };

/** Lista os arquivos anexos de um projeto (mais recentes primeiro). */
export async function listarArquivos(projetoId: string): Promise<ArquivoProjeto[]> {
  if (!projetoId) return [];
  const d = await db();
  const arr = await d.getAllFromIndex('arquivos', 'por-projeto', projetoId);
  return arr.sort((a, b) => b.criadoEm - a.criadoEm);
}

/** Anexa um arquivo ao projeto (guardado localmente no navegador). */
export async function salvarArquivo(projetoId: string, file: File, rotulo?: string): Promise<ArquivoProjeto> {
  const d = await db();
  const rec: ArquivoProjeto = {
    id: novoId('arq'), projetoId, nome: file.name, tipo: file.type || 'application/octet-stream',
    tamanho: file.size, blob: file, criadoEm: Date.now(), rotulo: rotulo?.trim() || undefined,
  };
  await d.put('arquivos', rec);
  return rec;
}

export async function excluirArquivo(id: string): Promise<void> {
  const d = await db();
  await d.delete('arquivos', id);
}
