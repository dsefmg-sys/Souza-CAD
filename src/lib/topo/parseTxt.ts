import type { RawPoint } from './types';

/**
 * Lê o TXT do GNSS. Formato observado (separado por ";"):
 *   Nome;Código;Norte(N);Leste(E);Elevação;ErroY;ErroX;ErroVert;Info...
 * A primeira linha é o cabeçalho de colunas.
 *
 * Regras de classificação:
 *  - Pontos cujo Nome começa com "B_" ou "PPP" são base/apoio -> não entram no perímetro.
 *  - Pontos com STATUS:SINGLE no campo de info são referências de baixa precisão -> fora.
 */
export function parseTxt(conteudo: string): RawPoint[] {
  const linhas = conteudo.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (linhas.length === 0) return [];

  // Detecta se a primeira linha é cabeçalho (não tem números nas colunas N/E).
  const primeira = linhas[0].split(';');
  const temCabecalho = !isFinite(parseFloat(primeira[2]));
  const corpo = temCabecalho ? linhas.slice(1) : linhas;

  const pontos: RawPoint[] = [];
  for (const linha of corpo) {
    const f = linha.split(';');
    if (f.length < 5) continue;
    const nome = (f[0] ?? '').trim();
    const codigo = (f[1] ?? '').trim();
    const norte = parseFloat(f[2]);
    const leste = parseFloat(f[3]);
    const elevacao = parseFloat(f[4]);
    if (!isFinite(norte) || !isFinite(leste)) continue;

    const statusMatch = linha.match(/STATUS:([A-Z]+)/i);
    const status = statusMatch ? statusMatch[1].toUpperCase() : '';
    const isBase = /^B[_-]/i.test(nome) || /^PPP/i.test(nome) || /^BASE/i.test(nome);
    const isSingle = status === 'SINGLE';

    pontos.push({
      nome,
      codigo,
      norte,
      leste,
      elevacao: isFinite(elevacao) ? elevacao : 0,
      status,
      isBase,
      isSingle,
    });
  }
  return pontos;
}

/** Os pontos que de fato formam a poligonal (exclui base e single). */
export function pontosDePerimetro(pontos: RawPoint[]): RawPoint[] {
  return pontos.filter((p) => !p.isBase && !p.isSingle);
}

/**
 * Heurística de divisa: o campo "Código" indica um canto de divisa quando contém a palavra
 * "DIVISA" (ex.: "DIVISA JOSE CLAUDIO X LOBATO"). Esses viram marcos (M); os demais, pontos (P).
 */
export function ehDivisa(codigo: string): boolean {
  return /divisa/i.test(codigo);
}
