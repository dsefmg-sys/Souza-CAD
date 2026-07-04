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
  'metrica.modelosDocs',      // textos editáveis das peças
  'metrica.titulosPlanta',    // títulos personalizados da planta
  'metrica.precosServico',    // tabela de preços por serviço
  'metrica.padroesProjeto',   // padrões de novos projetos
  'metrica.reciboSeq',        // contador de recibo
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

// ----- Backup só das CONFIGURAÇÕES (JSON leve): assinatura, escritório, modelos de texto,
// títulos, preços, padrões e preferências. Serve pra levar os ajustes de uma máquina pra outra
// sem carregar os projetos junto. Não inclui o modelo SIGEF binário nem o banco de pontos. -----

/** Baixa um JSON só com as configurações do app (inclui os modelos de texto das peças). */
export function exportarConfiguracoesJson(): void {
  if (typeof window === 'undefined') return;
  const dados = { tipo: 'metrica-configuracoes', versao: 1, exportadoEm: new Date().toISOString(), config: coletarConfiguracoes() };
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `configuracoes-souza-cad-${dataParaArquivo()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/**
 * Restaura as configurações a partir de um arquivo exportado por `exportarConfiguracoesJson`.
 * Sobrescreve só as chaves de configuração conhecidas (não mexe em projeto nem no banco de pontos).
 * Devolve quantas chaves foram restauradas.
 */
export async function importarConfiguracoesJson(file: File): Promise<number> {
  if (typeof window === 'undefined') return 0;
  const texto = await file.text();
  const parsed = JSON.parse(texto) as { tipo?: string; config?: Record<string, unknown> };
  const config = parsed?.config;
  if (!config || typeof config !== 'object') {
    throw new Error('Arquivo de configurações inválido.');
  }
  let restauradas = 0;
  for (const chave of CHAVES_CONFIG) {
    if (chave in config) {
      try { localStorage.setItem(chave, JSON.stringify(config[chave])); restauradas++; }
      catch { /* uma chave problemática não derruba a restauração */ }
    }
  }
  return restauradas;
}
