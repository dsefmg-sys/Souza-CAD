import { db, novoId, type ArquivoProjeto } from './db';

export type { ArquivoProjeto };

/** Lista os arquivos anexos de um projeto (mais recentes primeiro). */
export async function listarArquivos(projetoId: string): Promise<ArquivoProjeto[]> {
  if (!projetoId) return [];
  const d = await db();
  const arr = await d.getAllFromIndex('arquivos', 'por-projeto', projetoId);
  return arr.sort((a, b) => b.criadoEm - a.criadoEm);
}

/** Metadados de organização de um anexo (a quem pertence e que tipo de documento é). */
export interface MetaArquivo {
  rotulo?: string;
  dono?: 'imovel' | 'confrontante';
  confrontanteId?: string;
  tipoDoc?: string;
}

/** Anexa um arquivo ao projeto (guardado localmente no navegador). */
export async function salvarArquivo(projetoId: string, file: File, meta: MetaArquivo = {}): Promise<ArquivoProjeto> {
  const d = await db();
  const rec: ArquivoProjeto = {
    id: novoId('arq'), projetoId, nome: file.name, tipo: file.type || 'application/octet-stream',
    tamanho: file.size, blob: file, criadoEm: Date.now(),
    rotulo: meta.rotulo?.trim() || undefined,
    dono: meta.dono,
    confrontanteId: meta.confrontanteId,
    tipoDoc: meta.tipoDoc?.trim() || undefined,
  };
  await d.put('arquivos', rec);
  return rec;
}

/** Lista os anexos de um DONO específico do projeto (imóvel, ou um confrontante pelo id). */
export async function listarArquivosPorDono(
  projetoId: string,
  dono: 'imovel' | 'confrontante',
  confrontanteId?: string,
): Promise<ArquivoProjeto[]> {
  const todos = await listarArquivos(projetoId);
  if (dono === 'imovel') {
    // "imovel" agrega os do imóvel/proprietário e também os antigos sem dono definido.
    return todos.filter((a) => a.dono === 'imovel' || !a.dono);
  }
  return todos.filter((a) => a.dono === 'confrontante' && a.confrontanteId === confrontanteId);
}

export async function excluirArquivo(id: string): Promise<void> {
  const d = await db();
  await d.delete('arquivos', id);
}
