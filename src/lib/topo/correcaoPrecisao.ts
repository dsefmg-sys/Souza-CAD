import { parseTxt } from './parseTxt';
import { correcoesPrecisaoViaTxt, type CorrecaoPrecisao } from './vertices';
import type { Vertex } from './types';

/**
 * Lê o arquivo TXT/CSV do GNSS escolhido pelo usuário e devolve a lista de correções de
 * precisão sugeridas (cada vértice casado com o ponto do TXT mais próximo até 0,5m por eixo,
 * só atualizando as dimensões em que o TXT traz mais casas decimais).
 *
 * Erros de leitura (arquivo vazio, sem pontos válidos, exception) são devolvidos como
 * `{ ok: false, erro }` em vez de lançar — o chamador só precisa mostrar pro usuário.
 */
export type ResultadoCorrecao =
  | { ok: true; nomeArquivo: string; correcoes: CorrecaoPrecisao[] }
  | { ok: false; erro: string };

export async function lerTxtECalcularCorrecoes(
  arquivo: File,
  vertices: Vertex[]
): Promise<ResultadoCorrecao> {
  try {
    const texto = await arquivo.text();
    const pontosTxt = parseTxt(texto);
    if (pontosTxt.length === 0) {
      return { ok: false, erro: `O arquivo "${arquivo.name}" não contém pontos válidos. Verifique separador (; ou ,) e cabeçalho.` };
    }
    const correcoes = correcoesPrecisaoViaTxt(vertices, pontosTxt);
    return { ok: true, nomeArquivo: arquivo.name, correcoes };
  } catch (err) {
    return { ok: false, erro: `Falha ao ler o arquivo: ${(err as Error).message || 'erro desconhecido'}` };
  }
}
