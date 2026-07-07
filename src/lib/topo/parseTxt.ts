import type { RawPoint, ImportTxtConfig, CampoTxt } from './types';

/** Converte o separador escolhido em algo que o split entende. */
function separadorRegex(sep: ImportTxtConfig['separador']): RegExp {
  if (sep === 'tab') return /\t/;
  if (sep === 'espaco') return /\s+/;
  if (sep === ',') return /,/;
  return /;/;
}

function numero(s: string | undefined, decimal: '.' | ','): number {
  if (s == null) return NaN;
  let t = s.trim();
  if (decimal === ',') {
    // Só trata pontos como milhar QUANDO existe mesmo uma vírgula decimal na célula. Sem isso,
    // uma coordenada como "300000.25" (ponto decimal) viraria "30000025" e o vértice iria parar a
    // quilômetros do lugar. Notação científica ("1.5e6") também fica preservada.
    if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  } else {
    // Se o decimal configurado for ponto, mas a célula contiver vírgula E não contiver pontos,
    // é quase certeza que é um decimal no padrão BR (ex.: "123,45"). Corrigimos para evitar truncamento silencioso.
    if (t.includes(',') && !t.includes('.')) t = t.replace(',', '.');
  }
  return parseFloat(t);
}

/**
 * Lê o TXT do GNSS. Sem configuração, usa o formato observado (separado por ";"):
 *   Nome;Código;Norte(N);Leste(E);Elevação;ErroY;ErroX;ErroVert;Info...
 * Com configuração (definida em Ajustes a partir de um exemplo), respeita o separador,
 * o decimal e a QUAL campo cada coluna corresponde.
 *
 * Regras de classificação:
 *  - Pontos cujo Nome começa com "B_" ou "PPP" são base/apoio -> não entram no perímetro.
 *  - Pontos com STATUS:SINGLE no campo de info são referências de baixa precisão -> fora.
 */
export function parseTxt(conteudo: string, config?: ImportTxtConfig | null): RawPoint[] {
  if (config && config.colunas && config.colunas.length) return parseTxtComConfig(conteudo, config);

  const linhas = conteudo.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (linhas.length === 0) return [];

  // Detecta cabeçalho: uma linha de DADO tem número tanto no Norte (col 2) quanto no Leste (col 3).
  // Se qualquer um dos dois não for número, é cabeçalho. (Antes olhava só a col 2, e podia engolir
  // um vértice ou injetar o cabeçalho como ponto.)
  const primeira = linhas[0].split(';');
  const temCabecalho = !(isFinite(parseFloat(primeira[2])) && isFinite(parseFloat(primeira[3])));
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

    // Colunas de erro do formato observado: ErroY;ErroX;ErroVert (cols 5,6,7). O erro que vem
    // PRIMEIRO é o do Norte (Y) e o segundo o do Leste (X). Sem ler isso, a planilha SIGEF saía
    // com precisão fixa (0,00) em vez da medida em campo.
    const sigmaY = parseFloat(f[5]); // erro do Norte (Y)
    const sigmaX = parseFloat(f[6]); // erro do Leste (X)
    const sigmaZ = parseFloat(f[7]); // erro vertical

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
      ...(isFinite(sigmaX) ? { sigmaX } : {}),
      ...(isFinite(sigmaY) ? { sigmaY } : {}),
      ...(isFinite(sigmaZ) ? { sigmaZ } : {}),
    });
  }
  return pontos;
}

/** Caminho guiado pela configuração do usuário (mapeamento coluna -> campo). */
function parseTxtComConfig(conteudo: string, cfg: ImportTxtConfig): RawPoint[] {
  const re = separadorRegex(cfg.separador);
  const linhas = conteudo.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (linhas.length === 0) return [];
  const corpo = cfg.temCabecalho ? linhas.slice(1) : linhas;

  const indiceDe = (campo: CampoTxt) => cfg.colunas.indexOf(campo);
  const iNome = indiceDe('nome');
  const iCodigo = indiceDe('codigo');
  const iNorte = indiceDe('norte');
  const iLeste = indiceDe('leste');
  const iElev = indiceDe('elevacao');
  const iSx = indiceDe('sigmaX');
  const iSy = indiceDe('sigmaY');
  const iSz = indiceDe('sigmaZ');
  const iMet = indiceDe('metodo');

  const pontos: RawPoint[] = [];
  for (const linha of corpo) {
    const f = linha.split(re);
    const norte = numero(f[iNorte], cfg.decimal);
    const leste = numero(f[iLeste], cfg.decimal);
    if (!isFinite(norte) || !isFinite(leste)) continue;

    const nome = (iNome >= 0 ? f[iNome] ?? '' : '').trim();
    const codigo = (iCodigo >= 0 ? f[iCodigo] ?? '' : '').trim();
    const elevacao = numero(f[iElev], cfg.decimal);
    const sigmaX = iSx >= 0 ? numero(f[iSx], cfg.decimal) : NaN;
    const sigmaY = iSy >= 0 ? numero(f[iSy], cfg.decimal) : NaN;
    const sigmaZ = iSz >= 0 ? numero(f[iSz], cfg.decimal) : NaN;
    const metodo = iMet >= 0 ? (f[iMet] ?? '').trim() : '';

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
      ...(isFinite(sigmaX) ? { sigmaX } : {}),
      ...(isFinite(sigmaY) ? { sigmaY } : {}),
      ...(isFinite(sigmaZ) ? { sigmaZ } : {}),
      ...(metodo ? { metodo } : {}),
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
