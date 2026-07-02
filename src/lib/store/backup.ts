import JSZip from 'jszip';
import { listarProjetos } from './projects';
import { listarArquivos } from './arquivosProjeto';

/**
 * Gera um zip com TODOS os projetos salvos (dados em `projetos.json`) e todos os arquivos
 * anexados de cada um (espelhos, PDFs, fotos…), organizados em `arquivos/<projetoId>/`. Serve
 * como backup manual — reduz o risco de perda com muitos trabalhos em andamento.
 */
// chaves de configuração do app no localStorage que entram no backup (JSON simples; o modelo
// SIGEF binário e o banco de pontos por credenciado ficam de fora de propósito — o modelo é
// re-baixável e o banco de pontos tem numeração que não deve ser restaurada por cima de outra)
const CHAVES_CONFIG = [
  'metrica.tecnico',
  'metrica.escritorio',
  'metrica.plantaPadrao',
  'metrica.importTxt',
  'metrica.importVerticesVizinho',
  'metrica.preferencias',
];

/** Junta as configurações do app (técnico, escritório, planta padrão, preferências…) num JSON. */
function coletarConfiguracoes(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (typeof window === 'undefined') return out;
  for (const chave of CHAVES_CONFIG) {
    try {
      const bruto = localStorage.getItem(chave);
      if (bruto != null) out[chave] = JSON.parse(bruto);
    } catch { /* valor corrompido — não derruba o backup por causa de uma chave */ }
  }
  return out;
}

export async function gerarBackupZip(): Promise<Blob> {
  const projetos = await listarProjetos();
  const zip = new JSZip();

  zip.file('projetos.json', JSON.stringify(projetos, null, 2));
  zip.file('configuracoes.json', JSON.stringify(coletarConfiguracoes(), null, 2));

  for (const p of projetos) {
    const arquivos = await listarArquivos(p.id).catch(() => []);
    if (!arquivos.length) continue;
    const pasta = zip.folder(`arquivos/${p.id}`);
    if (!pasta) continue;
    const metadados = arquivos.map((a) => ({ id: a.id, nome: a.nome, tipo: a.tipo, tamanho: a.tamanho, criadoEm: a.criadoEm, rotulo: a.rotulo }));
    pasta.file('_metadados.json', JSON.stringify(metadados, null, 2));
    for (const a of arquivos) {
      // prefixa com o id pra nunca colidir nome de arquivo dentro da mesma pasta
      pasta.file(`${a.id}_${a.nome}`, a.blob);
    }
  }

  return zip.generateAsync({ type: 'blob' });
}

function dataParaArquivo(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

/** Gera o backup e inicia o download no navegador. */
export async function exportarBackupZip(): Promise<void> {
  const blob = await gerarBackupZip();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `backup-souza-cad-${dataParaArquivo()}.zip`;
  a.click();
  URL.revokeObjectURL(a.href);
}
