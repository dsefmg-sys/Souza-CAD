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

/** Substitui as linhas de vértice da aba perimetro_1. */
function injetarPerimetro(xml: string, linhas: string[]): string {
  const { antes, tabela, depois } = fatiarTabela(xml, 'perimetro_1');
  const rows = [...tabela.matchAll(ROW_RE)];
  const headerIdx = rows.findIndex((r) => r[0].includes('E/Long'));
  if (headerIdx < 0) throw new Error('Cabeçalho da tabela de perímetro não encontrado');

  // linhas de dados = contíguas após o cabeçalho que contêm o padrão de vértice (-M- ou -P-)
  const ehDado = (s: string) => /-[MP]-\d{2,}/.test(s);
  let first = -1, last = -1;
  for (let i = headerIdx + 1; i < rows.length; i++) {
    if (ehDado(rows[i][0])) {
      if (first < 0) first = i;
      last = i;
    } else if (first >= 0) {
      break;
    }
  }
  if (first < 0) throw new Error('Linhas de vértice do template não encontradas');

  const startPos = rows[first].index!;
  const endPos = rows[last].index! + rows[last][0].length;
  const novaTabela = tabela.slice(0, startPos) + linhas.join('') + tabela.slice(endPos);
  return antes + novaTabela + depois;
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

/** Transformação pura do content.xml do template (testável fora do browser). */
export function montarContentXml(xml: string, dados: DadosSigef): string {
  const { res, imovel, tecnico, confrontantes, confrontantePorLado } = dados;
  // Defesa final: nunca gerar a planilha com lacuna de código de vértice.
  const semCodigo = res.vertices.filter((v) => !v.codigoSigef).length;
  if (semCodigo > 0) throw new Error(`${semCodigo} vértice(s) sem código. Renumere os vértices antes de gerar a planilha.`);
  const mapaC = new Map(confrontantes.map((c) => [c.id, c]));
  const linhas = res.vertices.map((v, i) => {
    const cid = confrontantePorLado[i] ?? null;
    return linhaVertice(v, cid ? mapaC.get(cid) : undefined, tecnico, imovel.cns);
  });
  let out = injetarPerimetro(xml, linhas);
  out = injetarIdentificacao(out, imovel);
  return out;
}

export interface SigefInput extends DadosSigef {
  templateBytes: ArrayBuffer | Uint8Array;
}

export async function gerarSigefOds(input: SigefInput): Promise<Blob> {
  const { templateBytes, ...dados } = input;
  const zip = await JSZip.loadAsync(templateBytes);
  const contentFile = zip.file('content.xml');
  if (!contentFile) throw new Error('content.xml ausente no template ODS');
  const xml = await contentFile.async('string');

  zip.file('content.xml', montarContentXml(xml, dados));
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
