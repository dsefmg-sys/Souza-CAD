import JSZip from 'jszip';
import type { ImovelData, TecnicoData, Confrontante, ResultadoCalculo, Vertex, ImovelCad } from '../topo/types';
import { grausParaDMS } from '../topo/coords';
import { numBR, formatMatricula } from '../topo/geometry';
import { escaparXml } from './sanitizar';
import { obterTipoLimiteEfetivo } from '../topo/sigefVocab';
import { iniciarDoNorteHorario } from '../topo/vertices';

// Preenche o template oficial do SIGEF (ODS) sem recriar abas/validações:
//  - regenera as linhas de vértice da aba "perimetro_1";
//  - substitui os valores de texto da aba "identificacao".
// O template vem de public/templates/sigef.ods (cópia do modelo do dono).

// além das entidades XML, remove caracteres de controle invisíveis (proibidos no XML 1.0 —
// corrompem a planilha se vierem colados de outro programa junto com o texto)
const esc = escaparXml;

export function removerAcentos(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[çÇ]/g, (m) => (m === 'ç' ? 'c' : 'C'));
}

export function obterNomeConfrontanteFormatado(conf: Confrontante | undefined, imoveisCadastrados?: ImovelCad[]): string {
  if (!conf) return '';
  if (conf.matricula && imoveisCadastrados) {
    const cnsLimpo = (conf.cns || '').replace(/\D/g, '');
    const match = imoveisCadastrados.find((i) => {
      const matMatch = i.matricula === conf.matricula;
      const iCnsLimpo = (i.cns || '').replace(/\D/g, '');
      const cnsMatch = !cnsLimpo || !iCnsLimpo || iCnsLimpo === cnsLimpo;
      return matMatch && cnsMatch;
    });
    if (match && match.denominacao && match.denominacao.trim()) {
      return match.denominacao.trim();
    }
  }
  return conf.nome || '';
}

const TRAILING_FILLER =
  '<table:table-cell table:style-name="ce26" table:number-columns-repeated="1010"/>' +
  '<table:table-cell table:style-name="Default"/><table:table-cell/>';

function celStr(style: string, texto: string): string {
  return `<table:table-cell table:style-name="${style}" office:value-type="string" calcext:value-type="string"><text:p>${esc(removerAcentos(texto))}</text:p></table:table-cell>`;
}
function celFloat(style: string, valor: number, texto: string): string {
  return `<table:table-cell table:style-name="${style}" office:value-type="float" office:value="${valor}" calcext:value-type="float"><text:p>${esc(removerAcentos(texto))}</text:p></table:table-cell>`;
}



// Sigma lido do TXT (precisão do vértice); se não veio, usa o padrão do template.
function sigmaBR(s: number | undefined, padrao: string): string {
  return (typeof s === 'number' && Number.isFinite(s)) ? numBR(Number(s.toFixed(2))) : padrao;
}

function linhaVertice(
  v: Vertex,
  conf: Confrontante | undefined,
  tec: TecnicoData,
  cnsImovel: string,
  imoveisCadastrados?: ImovelCad[]
): string {
  const eLong = grausParaDMS(v.lon, { estilo: 'sigef', eixo: 'lon', casas: 3 });
  const nLat = grausParaDMS(v.lat, { estilo: 'sigef', eixo: 'lat', casas: 3 });
  const mat = conf?.matricula ? formatMatricula(conf.matricula) : '';
  const cns = mat ? (conf?.cns || cnsImovel || '').trim() : '';
  // altitude pode vir vazia/NaN de importação só-geográfica — sem isso o .toFixed derrubaria o ODS inteiro
  const elev = Number.isFinite(v.elevacao) ? v.elevacao : 0;
  const cels =
    celStr('ce40', v.codigoSigef) +
    celStr('ce40', eLong) +
    celStr('ce40', sigmaBR(v.sigmaX, '0,00')) +
    celStr('ce40', nLat) +
    celStr('ce40', sigmaBR(v.sigmaY, '0,00')) +
    celFloat('ce40', Number(elev.toFixed(2)), numBR(elev)) +
    celStr('ce40', sigmaBR(v.sigmaZ, '0,01')) +
    celStr('ce40', v.metodo || tec.metodoPosicionamento || 'PG6') +
    // ce40 é o estilo de célula de dado presente no template (o antigo ce93 não existe no modelo
    // em branco; manter referência válida evita estilo pendente)
    celStr('ce40', obterTipoLimiteEfetivo(v, tec.tipoLimite)) +
    celStr('ce40', cns) +
    celStr('ce40', mat) +
    celStr('ce40', obterNomeConfrontanteFormatado(conf, imoveisCadastrados));
  return `<table:table-row table:style-name="ro2">${cels}${TRAILING_FILLER}</table:table-row>`;
}

const ROW_RE = /<table:table-row[\s\S]*?<\/table:table-row>/g;

/** Isola o XML de uma aba pelo nome. */
function fatiarTabela(xml: string, nome: string): { antes: string; tabela: string; depois: string } {
  const re = new RegExp(`<table:table [^>]*table:name="${nome}"[\\s\\S]*?</table:table>`);
  const m = xml.match(re);
  if (!m || m.index === undefined) throw new Error(`Aba ${nome} não encontrada no template`);
  return {
    antes: xml.slice(0, m.index),
    tabela: m[0],
    depois: xml.slice(m.index + m[0].length),
  };
}

/**
 * Coloca as linhas de vértice na tabela de perímetro. Funciona com os dois formatos de template:
 *  - template com linhas de EXEMPLO (`-M-`/`-P-`): substitui essas linhas;
 *  - template em BRANCO (sem exemplos, linhas de entrada vazias/comprimidas): insere logo após
 *    o cabeçalho. Em ambos os casos sobram só os vértices reais.
 */
function preencherPerimetroEm(tabela: string, linhas: string[]): string {
  const rows = [...tabela.matchAll(ROW_RE)];
  const headerIdx = rows.findIndex((r) => r[0].includes('E/Long'));
  if (headerIdx < 0) throw new Error('Cabeçalho da tabela de perímetro não encontrado');
  const ehDado = (s: string) => /-[MP]-\d{2,}/.test(s);
  let first = -1, last = -1;
  for (let i = headerIdx + 1; i < rows.length; i++) {
    if (ehDado(rows[i][0])) { if (first < 0) first = i; last = i; }
    else if (first >= 0) break;
  }
  if (first >= 0) {
    // template com exemplos: troca o bloco de exemplo pelos vértices reais
    const startPos = rows[first].index!;
    const endPos = rows[last].index! + rows[last][0].length;
    return tabela.slice(0, startPos) + linhas.join('') + tabela.slice(endPos);
  }
  // template em branco: insere logo após o cabeçalho
  const hEnd = rows[headerIdx].index! + rows[headerIdx][0].length;
  return tabela.slice(0, hEnd) + linhas.join('') + tabela.slice(hEnd);
}

/** Define Denominação e Parcela número na tabela de perímetro. */
function setDenominacaoParcela(tabela: string, denominacao: string, parcela: string): string {
  const rows = [...tabela.matchAll(ROW_RE)];
  let out = tabela;
  // de trás pra frente para preservar índices
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i];
    let novo: string | null = null;
    if (/Denomina[çc]/.test(r[0]) && denominacao) novo = setTextoP(r[0], 1, denominacao);
    else if (/Parcela n[úu]mero/.test(r[0]) && parcela) novo = setTextoP(r[0], 1, parcela);
    if (novo) out = out.slice(0, r.index!) + novo + out.slice(r.index! + r[0].length);
  }
  return out;
}

/** Substitui o N-ésimo <text:p> de uma linha por novo texto. */
function setTextoP(rowStr: string, indice: number, novo: string): string {
  let i = -1;
  return rowStr.replace(/<text:p>([\s\S]*?)<\/text:p>/g, (m) => {
    i++;
    return i === indice ? `<text:p>${esc(removerAcentos(novo))}</text:p>` : m;
  });
}

/**
 * Define o texto da N-ésima célula (0-based, contando elementos <table:table-cell>) de uma linha,
 * CRIANDO o <text:p> quando a célula está vazia (caso do template em branco) e substituindo quando
 * já há conteúdo (caso do template preenchido). Preserva controles de formulário (draw:control) e
 * força tipo string. Robusto para os dois formatos de template SIGEF.
 */
function setCelulaTexto(rowStr: string, ordinal: number, valor: string): string {
  let idx = -1;
  return rowStr.replace(/<table:table-cell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/table:table-cell>)/g, (full, attrs: string, inner: string | undefined) => {
    idx++;
    if (idx !== ordinal) return full;
    const a = attrs
      .replace(/\soffice:value-type="[^"]*"/g, '')
      .replace(/\soffice:value="[^"]*"/g, '')
      .replace(/\scalcext:value-type="[^"]*"/g, '')
      + ' office:value-type="string" calcext:value-type="string"';
    // preserva eventuais controles de formulário já presentes na célula
    const controles = inner ? (inner.match(/<draw:control\b[\s\S]*?\/>/g) || []).join('') : '';
    return `<table:table-cell${a}><text:p>${esc(removerAcentos(valor))}</text:p>${controles}</table:table-cell>`;
  });
}

/** Substitui os valores da aba identificacao (estrutural por índice de linha). */
function injetarIdentificacao(xml: string, imovel: ImovelData): string {
  const { antes, tabela, depois } = fatiarTabela(xml, 'identificacao');
  const rows = [...tabela.matchAll(ROW_RE)];
  // transformação por índice de linha. A célula de valor é a 2ª (ordinal 1); o município ocupa as
  // duas primeiras (ordinais 0 e 1). setCelulaTexto cria o texto quando a célula está vazia.
  const trans: Record<number, (row: string) => string> = {};
  const add = (ri: number, valor: string | undefined, ords: number[] = [1]) => {
    if (valor) trans[ri] = (row) => ords.reduce((r, o) => setCelulaTexto(r, o, valor), row);
  };
  add(5, imovel.proprietario);        // Nome:
  add(6, imovel.cpfProprietario);     // CPF:
  add(9, imovel.ficticio ? `(FICTICIO) ${imovel.denominacao}` : imovel.denominacao); // Denominação:
  add(12, imovel.codigoImovelIncra);  // Código do Imóvel (SNCR/INCRA):
  add(13, imovel.cns);                // Código do cartório (CNS):
  add(14, imovel.matricula);          // Matrícula:
  add(16, imovel.municipio, [0, 1]);  // Município(s): duas células
  let novaTabela = tabela;
  // aplica TODOS de trás pra frente, usando os offsets originais (preencher célula vazia muda o
  // tamanho da linha; processar do maior índice para o menor mantém os offsets válidos).
  for (const ri of Object.keys(trans).map(Number).sort((a, b) => b - a)) {
    if (!rows[ri]) continue;
    const novaRow = trans[ri](rows[ri][0]);
    novaTabela = novaTabela.slice(0, rows[ri].index!) + novaRow + novaTabela.slice(rows[ri].index! + rows[ri][0].length);
  }
  return antes + novaTabela + depois;
}

export interface DadosSigef {
  res: ResultadoCalculo;
  imovel: ImovelData;
  tecnico: TecnicoData;
  confrontantes: Confrontante[];
  confrontantePorLado: Record<number, string>;
  imoveisCadastrados?: ImovelCad[];
}

/** Uma gleba para a planilha: dados de cálculo + identificação da parcela. */
export interface GlebaSigef {
  res: ResultadoCalculo;
  confrontantes: Confrontante[];
  confrontantePorLado: Record<number, string>;
  denominacao: string;
  parcela: string;
  imoveisCadastrados?: ImovelCad[];
}

/** Uma linha de conferência do perímetro (os mesmos valores que vão pra planilha SIGEF). */
export interface LinhaConferencia {
  codigo: string; longitude: string; sigmaX: string; latitude: string; sigmaY: string;
  altitude: string; sigmaZ: string; metodo: string; tipoLimite: string; cns: string;
  matricula: string; confrontante: string;
}

/** Monta os dados do perímetro (para conferir na tela ANTES de baixar a planilha .ods). */
export function linhasConferencia(
  res: ResultadoCalculo, confrontantes: Confrontante[], confrontantePorLado: Record<number, string>,
  tec: TecnicoData, cnsImovel: string, imoveisCadastrados?: ImovelCad[]
): LinhaConferencia[] {
  const mapaC = new Map(confrontantes.map((c) => [c.id, c]));
  return res.vertices.map((v, i) => {
    const conf = confrontantePorLado[i] ? mapaC.get(confrontantePorLado[i]) : undefined;
    const mat = conf?.matricula ? formatMatricula(conf.matricula) : '';
    return {
      codigo: v.codigoSigef,
      longitude: grausParaDMS(v.lon, { estilo: 'sigef', eixo: 'lon', casas: 3 }),
      sigmaX: sigmaBR(v.sigmaX, '0,00'),
      latitude: grausParaDMS(v.lat, { estilo: 'sigef', eixo: 'lat', casas: 3 }),
      sigmaY: sigmaBR(v.sigmaY, '0,00'),
      altitude: numBR(Number.isFinite(v.elevacao) ? v.elevacao : 0),
      sigmaZ: sigmaBR(v.sigmaZ, '0,01'),
      metodo: v.metodo || tec.metodoPosicionamento || 'PG6',
      tipoLimite: obterTipoLimiteEfetivo(v, tec.tipoLimite),
      cns: mat ? (conf?.cns || cnsImovel || '').trim() : '',
      matricula: mat,
      confrontante: obterNomeConfrontanteFormatado(conf, imoveisCadastrados),
    };
  });
}

function linhasDaGleba(g: GlebaSigef, tecnico: TecnicoData, cnsImovel: string): string[] {
  const sem = g.res.vertices.filter((v) => !v.codigoSigef).length;
  if (sem > 0) throw new Error(`${sem} vértice(s) sem código. Renumere os vértices antes de gerar a planilha.`);

  // O SIGEF exige que o primeiro vértice seja o mais ao norte e a oeste.
  // Rotaciona os vértices e re-indexa confrontantePorLado para manter correspondência.
  const ordenados = iniciarDoNorteHorario(g.res.vertices);
  const idxOriginal = ordenados.map((v) => g.res.vertices.indexOf(v));
  const cplReindexado: Record<number, string> = {};
  idxOriginal.forEach((origIdx, novoIdx) => {
    const cid = g.confrontantePorLado[origIdx];
    if (cid) cplReindexado[novoIdx] = cid;
  });

  const mapaC = new Map(g.confrontantes.map((c) => [c.id, c]));
  return ordenados.map((v, i) => {
    const cid = cplReindexado[i] ?? null;
    return linhaVertice(v, cid ? mapaC.get(cid) : undefined, tecnico, cnsImovel, g.imoveisCadastrados);
  });
}

/**
 * Multi-gleba: identificação compartilhada + uma aba `perimetro_N` por gleba (clona a aba de
 * perímetro do template, igual ao "adicionar parcela" do SIGEF).
 */
export function montarContentXmlGlebas(xml: string, imovel: ImovelData, tecnico: TecnicoData, glebas: GlebaSigef[]): string {
  if (!glebas.length) throw new Error('Nenhuma gleba para gerar.');
  let out = injetarIdentificacao(xml, imovel);
  const { antes, tabela: template, depois } = fatiarTabela(out, 'perimetro_1');
  const tabelas = glebas.map((g, i) => {
    let t = preencherPerimetroEm(template, linhasDaGleba(g, tecnico, imovel.cns));
    t = setDenominacaoParcela(t, g.denominacao, g.parcela);
    if (i > 0) {
      // troca TODAS as referências à aba (table:name + âncoras dos controles), não só a 1ª.
      t = t.replace(/perimetro_1/g, `perimetro_${i + 1}`);
      // nomes de controle de formulário únicos por gleba (evita controles duplicados entre abas)
      t = t.replace(/control(\d+)"/g, `control$1_g${i + 1}"`);
    }
    return t;
  });
  out = antes + tabelas.join('') + depois;
  return out;
}

/** Transformação pura do content.xml (gleba única). */
export function montarContentXml(xml: string, dados: DadosSigef): string {
  return montarContentXmlGlebas(xml, dados.imovel, dados.tecnico, [{
    res: dados.res, confrontantes: dados.confrontantes, confrontantePorLado: dados.confrontantePorLado,
    denominacao: 'Parcela 1', parcela: '001', imoveisCadastrados: dados.imoveisCadastrados
  }]);
}

export interface SigefInput extends DadosSigef {
  templateBytes: ArrayBuffer | Uint8Array;
  glebas?: GlebaSigef[]; // se presente, gera multi-gleba (uma aba perimetro_N por gleba)
}

/** Preenche o template (identificação + perímetros) e devolve os bytes do .ods. */
async function montarOds(templateBytes: ArrayBuffer | Uint8Array, xmlBuilder: (xml: string) => string): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(templateBytes);
  const cf = zip.file('content.xml');
  if (!cf) throw new Error('content.xml ausente no template ODS');
  zip.file('content.xml', xmlBuilder(await cf.async('string')));
  const mime = zip.file('mimetype');
  if (mime) zip.file('mimetype', await mime.async('string'), { compression: 'STORE' });
  return zip.generateAsync({ type: 'uint8array', mimeType: 'application/vnd.oasis.opendocument.spreadsheet' });
}

/**
 * Gera PLANILHAS SEPARADAS — uma por gleba (cada uma com a identificação + sua própria aba de
 * perímetro) — empacotadas num .zip.
 */
export async function gerarSigefOdsSeparadas(templateBytes: ArrayBuffer | Uint8Array, imovel: ImovelData, tecnico: TecnicoData, glebas: GlebaSigef[]): Promise<Blob> {
  const zipOut = new JSZip();
  const usados = new Set<string>();
  for (const g of glebas) {
    const bytes = await montarOds(templateBytes, (xml) => montarContentXmlGlebas(xml, imovel, tecnico, [g]));
    const nome = removerAcentos(`SIGEF - ${(imovel.denominacao || 'imovel')} - ${g.denominacao}`).replace(/[\\/:*?"<>|]/g, '_');
    let n = nome; let k = 2; while (usados.has(n)) n = `${nome} (${k++})`;
    usados.add(n);
    zipOut.file(`${n}.ods`, bytes);
  }
  return zipOut.generateAsync({ type: 'blob' });
}

export async function gerarSigefOds(input: SigefInput): Promise<Blob> {
  const { templateBytes, glebas, ...dados } = input;
  const zip = await JSZip.loadAsync(templateBytes);
  const contentFile = zip.file('content.xml');
  if (!contentFile) throw new Error('content.xml ausente no template ODS');
  const xml = await contentFile.async('string');

  const novoXml = glebas && glebas.length
    ? montarContentXmlGlebas(xml, dados.imovel, dados.tecnico, glebas)
    : montarContentXml(xml, dados);
  zip.file('content.xml', novoXml);
  // mimetype deve permanecer STORED (sem compressão) — preserva validade do ODF
  const mime = zip.file('mimetype');
  if (mime) {
    const mt = await mime.async('string');
    zip.file('mimetype', mt, { compression: 'STORE' });
  }
  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.oasis.opendocument.spreadsheet',
  });
}
