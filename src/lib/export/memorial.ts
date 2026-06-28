import {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle,
} from 'docx';
import type { ImovelData, TecnicoData, Confrontante, ResultadoCalculo, Vertex } from '../topo/types';
import { grausParaDMS } from '../topo/coords';
import { azimuteDMS, numBR, numBRmilhar, formatMatricula } from '../topo/geometry';
import { valoresEfetivos } from '../topo/conferencia';

function coordTexto(v: Vertex): string {
  const lon = grausParaDMS(v.lon, { estilo: 'memorial', casas: 3 });
  const lat = grausParaDMS(v.lat, { estilo: 'memorial', casas: 3 });
  return `Longitude: ${lon}, Latitude: ${lat} e Altitude: ${numBRmilhar(v.elevacao)} m`;
}

/** Descrição do confrontante como aparece no memorial. */
export function descreverConfrontante(c: Confrontante | undefined): string {
  if (!c) return 'confrontante não informado';
  if (c.descricaoExtra && c.descricaoExtra.trim()) return c.descricaoExtra.trim();
  const partes: string[] = [];
  if (c.cpf) partes.push(`CPF nº ${c.cpf}`);
  if (c.matricula) partes.push(`Matrícula nº ${formatMatricula(c.matricula)}`);
  const sufixo = partes.length ? ` (${partes.join(', ')})` : '';
  return `${c.nome}${sufixo}`;
}

/**
 * Monta o texto corrido da "DESCRIÇÃO DO PERÍMETRO" no padrão do modelo do dono:
 * começa num vértice, segue por linha ideal agrupando os lados por confrontante,
 * fecha no vértice inicial.
 */
export function construirNarrativa(
  res: ResultadoCalculo,
  confrontantes: Confrontante[],
  confrontantePorLado: Record<number, string>
): string {
  const { vertices, lados } = res;
  if (vertices.length < 3) return '';
  const mapaC = new Map(confrontantes.map((c) => [c.id, c]));
  const v0 = vertices[0];

  let txt = `Inicia-se a descrição deste perímetro no vértice ${v0.codigoSigef}, de coordenadas (${coordTexto(v0)}); `;

  // agrupa lados consecutivos por (confrontante + tipo de divisa). Uma nova "passada" começa
  // quando muda o confrontante OU o tipo de linha (cerca, córrego, linha ideal...).
  type Run = { confrontanteId: string | null; representacao: string; ladoIdx: number[] };
  const runs: Run[] = [];
  lados.forEach((l, i) => {
    const cid = confrontantePorLado[i] ?? l.confrontanteId ?? null;
    const rep = l.de.representacao || 'linha-ideal';
    const ultima = runs[runs.length - 1];
    if (ultima && ultima.confrontanteId === cid && ultima.representacao === rep) ultima.ladoIdx.push(i);
    else runs.push({ confrontanteId: cid, representacao: rep, ladoIdx: [i] });
  });

  const totalLados = lados.length;
  let confAnterior: string | null = null;
  runs.forEach((run, rIdx) => {
    const c = run.confrontanteId ? mapaC.get(run.confrontanteId) : undefined;
    const mesmoConf = run.confrontanteId != null && run.confrontanteId === confAnterior;
    const confTxt = mesmoConf ? 'ainda confrontando com o mesmo' : `confrontando com ${descreverConfrontante(c)}`;
    const item = (i: number) => {
      const l = lados[i];
      const az = azimuteDMS(l.azimute), d = numBR(l.distancia);
      if (i === totalLados - 1) return `${az} e ${d} m até o vértice ${l.para.codigoSigef}, ponto inicial da descrição deste perímetro`;
      return `${az} e ${d} m até o vértice ${l.para.codigoSigef} (${coordTexto(l.para)})`;
    };

    if (run.ladoIdx.length === 1) {
      const i = run.ladoIdx[0];
      const l = lados[i];
      const az = azimuteDMS(l.azimute), d = numBR(l.distancia);
      const destino = i === totalLados - 1
        ? `o vértice ${l.para.codigoSigef}, ponto inicial da descrição deste perímetro`
        : `o vértice ${l.para.codigoSigef} (${coordTexto(l.para)})`;
      txt += `deste, segue por ${seguePor(run.representacao)}, ${confTxt}, com azimute de ${az} e distância de ${d} m até ${destino}`;
    } else {
      const itens = run.ladoIdx.map(item);
      const ultimoIdxLado = run.ladoIdx[run.ladoIdx.length - 1];
      const conector = ultimoIdxLado === totalLados - 1 ? 'e finalmente ' : 'e ';
      const bloco = itens.slice(0, -1).join('; ') + '; ' + conector + itens[itens.length - 1];
      txt += `deste, segue por ${seguePor(run.representacao)}, ${confTxt}, com os seguintes azimutes e distâncias: ${bloco}`;
    }
    confAnterior = run.confrontanteId;
    if (rIdx < runs.length - 1) txt += '; ';
  });

  txt += '.';
  return txt;
}

/** Como o memorial descreve a linha que "segue por", conforme o tipo de divisa. */
function seguePor(representacao: string): string {
  switch (representacao) {
    case 'cerca': return 'cerca';
    case 'muro': return 'muro';
    case 'vala': return 'vala';
    case 'estrada': return 'estrada';
    case 'corrego':
    case 'rio':
    case 'acude': return 'corpo de água';
    default: return 'linha ideal';
  }
}

const INFO_TECNICAS =
  'As coordenadas dos vértices descritos neste memorial foram determinadas por meio de ' +
  'levantamento topográfico georreferenciado ao Sistema Geodésico Brasileiro, adotando-se o ' +
  'datum SIRGAS2000, mediante utilização de tecnologia GNSS de dupla frequência, com ' +
  'equipamentos compatíveis com a precisão exigida pelas normas técnicas vigentes. O ' +
  'levantamento foi executado a partir de base geodésica determinada por métodos de ' +
  'posicionamento por satélite, sendo os demais vértices obtidos por técnicas de ' +
  'posicionamento relativo, assegurando coerência geométrica, confiabilidade dos dados e ' +
  'compatibilidade com os padrões adotados pelo Incra para fins de certificação, quando ' +
  'aplicável. As distâncias, perímetro e área do imóvel foram calculados a partir das ' +
  'coordenadas dos vértices levantados, em sistema de referência adequado ao levantamento realizado.';

const OBSERVACOES =
  'OBSERVAÇÕES: 1. O presente memorial descritivo reflete fielmente a situação física e ' +
  'geométrica do imóvel na data do levantamento, destinando-se à individualização de área ' +
  'para fins de regularização registral, sem prejuízo de eventual complementação ou ' +
  'adequação técnica caso venha a ser exigida certificação junto aos órgãos competentes. ' +
  '2. A planta anexa é parte integrante deste memorial descritivo.';

function p(text: string, opts: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; size?: number } = {}) {
  return new Paragraph({
    alignment: opts.align ?? AlignmentType.JUSTIFIED,
    spacing: { after: 120 },
    children: [new TextRun({ text, bold: opts.bold, size: opts.size ?? 22 })],
  });
}

function linhaInfo(rotulo: string, valor: string) {
  return new Paragraph({
    spacing: { after: 40 },
    children: [
      new TextRun({ text: `${rotulo} `, bold: true, size: 22 }),
      new TextRun({ text: valor, size: 22 }),
    ],
  });
}

function assinatura(linhas: string[], boldPrimeira = false) {
  const filhos = [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 360 }, children: [new TextRun({ text: '________________________________________', size: 22 })] }),
  ];
  linhas.forEach((l, i) =>
    filhos.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 }, children: [new TextRun({ text: l, bold: boldPrimeira && i === 0, size: 22 })] }))
  );
  return filhos;
}

export interface MemorialInput {
  res: ResultadoCalculo;
  imovel: ImovelData;
  tecnico: TecnicoData;
  confrontantes: Confrontante[];
  confrontantePorLado: Record<number, string>;
  dataExtenso?: string; // ex.: "Sábado, 20 de Dezembro de 2025"
}

export async function gerarMemorialDocx(input: MemorialInput): Promise<Blob> {
  const { res, imovel, tecnico, confrontantes, confrontantePorLado } = input;
  // Defesa final: nunca gerar memorial com lacuna de código de vértice.
  const semCodigo = res.vertices.filter((v) => !v.codigoSigef).length;
  if (semCodigo > 0) throw new Error(`${semCodigo} vértice(s) sem código. Renumere os vértices antes de gerar o memorial.`);
  const narrativa = construirNarrativa(res, confrontantes, confrontantePorLado);

  const children: Paragraph[] = [];

  // Cabeçalho (usa os valores oficiais do SIGEF quando o usuário escolheu reconciliar)
  const ef = valoresEfetivos(res, imovel);
  children.push(linhaInfo('Imóvel:', imovel.denominacao));
  children.push(linhaInfo('Matrícula:', imovel.matricula));
  children.push(linhaInfo('Proprietário(a):', imovel.proprietario));
  children.push(linhaInfo('Área SGL (ha):', `${numBR(ef.areaHa, 4)} ha`));
  children.push(linhaInfo('Local:', imovel.local));
  children.push(linhaInfo('Perímetro (m):', `${numBR(ef.perimetro)} m`));

  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 240, after: 160 }, children: [new TextRun({ text: 'DESCRIÇÃO DO PERÍMETRO', bold: true, size: 24 })] }));
  children.push(p(narrativa));

  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 240, after: 120 }, children: [new TextRun({ text: 'INFORMAÇÕES TÉCNICAS', bold: true, size: 24 })] }));
  children.push(p(INFO_TECNICAS));
  children.push(p(OBSERVACOES));

  // Data e assinatura do técnico
  const data = input.dataExtenso ? `, ${input.dataExtenso}` : '';
  children.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 240, after: 40 }, children: [new TextRun({ text: `${tecnico.cidadeAssinatura}${data}.`, size: 22 })] }));
  assinatura([
    tecnico.nome.toUpperCase(),
    tecnico.formacao,
    `CFT: ${tecnico.cft}`,
    `TRT nº ${tecnico.art}`,
    `Credenciamento INCRA: ${tecnico.credenciamentoIncra}`,
  ], true).forEach((c) => children.push(c));

  // Bloco proprietários
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 360, after: 80 }, children: [new TextRun({ text: 'PROPRIETÁRIOS', bold: true, size: 24 })] }));
  children.push(p('Atestamos, sob as penas da lei, serem verdadeiras todas as informações apresentadas neste memorial e na planta que o acompanha.'));
  assinatura([
    `Nome: ${imovel.proprietario}`,
    `CPF: ${imovel.cpfProprietario}`,
    `Imóvel de Matrícula: ${imovel.matricula}`,
  ]).forEach((c) => children.push(c));

  // Bloco confrontantes
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 360, after: 80 }, children: [new TextRun({ text: 'CONFRONTANTES', bold: true, size: 24 })] }));
  children.push(p('Concordamos com as medidas apresentadas neste memorial e na planta anexa no tocante aos espaços em que o referido imóvel faz confrontação com o imóvel de nossa propriedade. Estamos cientes de que, nos termos do §10 do artigo 213 da LRP, nossa anuência supre a participação do cônjuge e de eventuais outros condôminos titulares de nosso imóvel.'));
  confrontantes.forEach((c) => {
    if (!c.nome) return;
    assinatura([
      `Nome: ${c.nome}`,
      `CPF: ${c.cpf}`,
      `Imóvel de Matrícula: ${formatMatricula(c.matricula)}`,
    ]).forEach((x) => children.push(x));
  });

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 1133, bottom: 1133, left: 1133, right: 1133 } } },
      children,
    }],
  });
  return Packer.toBlob(doc);
}

// suprime "unused" enquanto mantemos imports disponíveis para evoluções da tabela
void Table; void TableRow; void TableCell; void WidthType; void BorderStyle;
