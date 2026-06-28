import JSZip from 'jszip';
import type { ImovelData, TecnicoData, Confrontante, ResultadoCalculo, Vertex } from '../topo/types';
import { grausParaDMS } from '../topo/coords';
import { numBR, formatMatricula } from '../topo/geometry';

// Preenche o template oficial do SIGEF (ODS) sem recriar abas/validações:
//  - regenera as linhas de vértice da aba "perimetro_1";
//  - substitui os valores de texto da aba "identificacao".
// O template vem de public/templates/sigef.ods (cópia do modelo do dono).

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const TRAILING_FILLER =
  '<table:table-cell table:style-name="ce26" table:number-columns-repeated="1010"/>' +
  '<table:table-cell table:style-name="Default"/><table:table-cell/>';

function celStr(style: string, texto: string): string {
  return `<table:table-cell table:style-name="${style}" office:value-type="string" calcext:value-type="string"><text:p>${esc(texto)}</text:p></table:table-cell>`;
}
function celFloat(style: string, valor: number, texto: string): string {
  return `<table:table-cell table:style-name="${style}" office:value-type="float" office:value="${valor}" calcext:value-type="float"><text:p>${esc(texto)}</text:p></table:table-cell>`;
}

function descritivoConfrontante(c: Confrontante | undefined): string {
  if (!c) return '';
  if (c.descricaoExtra && c.descricaoExtra.trim()) return c.descricaoExtra.trim();
  const cpf = c.cpf ? ` CPF: ${c.cpf}` : '';
  return `${c.nome}${cpf}`;
}

function linhaVertice(
  v: Vertex,
  conf: Confrontante | undefined,
  tec: TecnicoData,
  cnsImovel: string
): string {
  const eLong = grausParaDMS(v.lon, { estilo: 'sigef', eixo: 'lon', casas: 3 });
  const nLat = grausParaDMS(v.lat, { estilo: 'sigef', eixo: 'lat', casas: 3 });
  const cns = (conf?.cns || cnsImovel || '').trim();
  const mat = conf?.matricula ? `Matrícula: ${formatMatricula(conf.matricula)} ` : '';
  const cels =
    celStr('ce40', v.codigoSigef) +
    celStr('ce40', eLong) +
    celStr('ce40', '0,00') +
    celStr('ce40', nLat) +
    celStr('ce40', '0,00') +
    celFloat('ce40', Number(v.elevacao.toFixed(2)), numBR(v.elevacao)) +
    celStr('ce40', '0,01') +
    celStr('ce40', v.metodo || tec.metodoPosicionamento || 'PG6') +
    celStr('ce93', v.tipoLimite || tec.tipoLimite || 'LA6') +
    celStr('ce93', cns) +
    celStr('ce93', mat) +
    celStr('ce93', descritivoConfrontante(conf));
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

/** Substitui as linhas de vértice DENTRO de uma string de tabela de perímetro. */
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
  if (first < 0) throw new Error('Linhas de vértice do template não encontradas');
  const startPos = rows[first].index!;
  const endPos = rows[last].index! + rows[last][0].length;
  return tabela.slice(0, startPos) + linhas.join('') + tabela.slice(endPos);
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

/** Substitui as linhas de vértice da aba perimetro_1 (caso de gleba única). */
function injetarPerimetro(xml: string, linhas: string[]): string {
  const { antes, tabela, depois } = fatiarTabela(xml, 'perimetro_1');
  return antes + preencherPerimetroEm(tabela, linhas) + depois;
}

/** Substitui o N-ésimo <text:p> de uma linha por novo texto. */
function setTextoP(rowStr: string, indice: number, novo: string): string {
  let i = -1;
  return rowStr.replace(/<text:p>([\s\S]*?)<\/text:p>/g, (m) => {
    i++;
    return i === indice ? `<text:p>${esc(novo)}</text:p>` : m;
  });
}

/** Substitui os valores da aba identificacao (estrutural por índice de linha). */
function injetarIdentificacao(xml: string, imovel: ImovelData): string {
  const { antes, tabela, depois } = fatiarTabela(xml, 'identificacao');
  const rows = [...tabela.matchAll(ROW_RE)];
  // mapeia índice de linha -> (índice do text:p de valor, novo valor)
  const edits: Record<number, [number, string]> = {
    5: [1, imovel.proprietario],        // Nome:
    6: [1, imovel.cpfProprietario],     // CPF:
    9: [1, imovel.denominacao],         // Denominação:
    12: [1, imovel.codigoImovelIncra],  // Código do Imóvel (SNCR/INCRA):
    13: [1, imovel.cns],                // Código do cartório (CNS):
    14: [1, imovel.matricula],          // Matrícula:
  };
  let novaTabela = tabela;
  // aplica de trás pra frente para preservar índices
  const idxs = Object.keys(edits).map(Number).sort((a, b) => b - a);
  for (const ri of idxs) {
    if (!rows[ri]) continue;
    const [pIdx, valor] = edits[ri];
    if (!valor) continue;
    const novaRow = setTextoP(rows[ri][0], pIdx, valor);
    novaTabela = novaTabela.slice(0, rows[ri].index!) + novaRow + novaTabela.slice(rows[ri].index! + rows[ri][0].length);
  }
  // município (linha 16): dois valores, ambos = município
  if (rows[16] && imovel.municipio) {
    let r = rows[16][0];
    r = setTextoP(r, 0, imovel.municipio);
    r = setTextoP(r, 1, imovel.municipio);
    novaTabela = novaTabela.slice(0, rows[16].index!) + r + novaTabela.slice(rows[16].index! + rows[16][0].length);
  }
  return antes + novaTabela + depois;
}

export interface DadosSigef {
  res: ResultadoCalculo;
  imovel: ImovelData;
  tecnico: TecnicoData;
  confrontantes: Confrontante[];
  confrontantePorLado: Record<number, string>;
}

/** Uma gleba para a planilha: dados de cálculo + identificação da parcela. */
export interface GlebaSigef {
  res: ResultadoCalculo;
  confrontantes: Confrontante[];
  confrontantePorLado: Record<number, string>;
  denominacao: string;
  parcela: string;
}

function linhasDaGleba(g: GlebaSigef, tecnico: TecnicoData, cnsImovel: string): string[] {
  const sem = g.res.vertices.filter((v) => !v.codigoSigef).length;
  if (sem > 0) throw new Error(`${sem} vértice(s) sem código. Renumere os vértices antes de gerar a planilha.`);
  const mapaC = new Map(g.confrontantes.map((c) => [c.id, c]));
  return g.res.vertices.map((v, i) => {
    const cid = g.confrontantePorLado[i] ?? null;
    return linhaVertice(v, cid ? mapaC.get(cid) : undefined, tecnico, cnsImovel);
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
    denominacao: 'Parcela 1', parcela: '001',
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
    let nome = `SIGEF - ${(imovel.denominacao || 'imovel')} - ${g.denominacao}`.replace(/[\\/:*?"<>|]/g, '_');
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
