import { Document, Paragraph, TextRun, AlignmentType, PageBreak, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import type { ImovelData, TecnicoData, Confrontante, Vertex } from '../topo/types';
import { numBR } from '../topo/geometry';
import { rotulosProfissional } from '../topo/profissional';
import { REPRES_LABEL } from '../topo/sigefVocab';
import { rotuloPapelProprietario } from './papelProprietario';
import { sanitizarProfundo } from './sanitizar';
import { obterComarca } from '../topo/municipios';

export interface CrlInput {
  imovel: ImovelData;
  tecnico: TecnicoData;
  confrontante: Confrontante;
  verticesCompartilhados: { de: Vertex; para: Vertex; distancia: number }[];
  comarca?: string;
  dataExtenso?: string;
  /** Quando true (padrão no SIGEF), anexa a tabela de vértices do trecho percorrido. */
  incluirTabelaVertices?: boolean;
}

/**
 * Monta os parágrafos de UMA Carta de Reconhecimento de Limites (CRL) no padrão SIGEF/INCRA.
 */
function montarParagrafosCRL(input: CrlInput): (Paragraph | Table)[] {
  const { imovel, tecnico, confrontante, verticesCompartilhados, comarca, dataExtenso, incluirTabelaVertices = true } = sanitizarProfundo(input);
  const comarcaEfetiva = comarca || obterComarca(imovel);
  const local = comarcaEfetiva || imovel.municipio || 'DADO AUSENTE';
  const data = dataExtenso || 'DADO AUSENTE';

  const rotuloRT = rotulosProfissional(tecnico);

  const paragraphs: (Paragraph | Table)[] = [];

  const addP = (
    text: string,
    bold = false,
    align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.JUSTIFIED,
    spaceAfter = 120,
    size = 22
  ) => {
    paragraphs.push(
      new Paragraph({
        alignment: align,
        spacing: { after: spaceAfter },
        children: [new TextRun({ text, bold, size })],
      })
    );
  };

  const addVazio = (spaceBefore = 180) => {
    paragraphs.push(new Paragraph({ spacing: { before: spaceBefore } }));
  };

  // 1. TÍTULO OFICIAL CRL / INCRA
  addP('CARTA DE RECONHECIMENTO DE LIMITES - CRL', true, AlignmentType.CENTER, 40, 24);
  addP('(GEORREFERENCIAMENTO DE IMÓVEL RURAL - PADRÃO SIGEF/INCRA)', true, AlignmentType.CENTER, 240, 20);

  // 2. QUALIFICAÇÃO DO CONFRONTANTE (DECLARANTE)
  const isCnpj = confrontante.cpf && confrontante.cpf.replace(/\D/g, '').length > 11;
  const docLabel = isCnpj ? 'CNPJ' : 'CPF';

  const estadoCivilTxt = confrontante.estadoCivil ? `, estado civil ${confrontante.estadoCivil}` : '';
  const conjugeTxt = confrontante.conjugeNome
    ? `, casado(a) com ${confrontante.conjugeNome}, inscrito(a) no CPF sob o nº ${confrontante.conjugeCpf || 'DADO AUSENTE'}`
    : '';

  const matConfTxt = confrontante.matricula ? `matriculado sob o nº ${confrontante.matricula}` : 'posse sem matrícula registrada';

  const condicaoTxt =
    confrontante.condicao === 'posseiro'
      ? 'possuidor(a) e detentor(a) dos direitos possessórios'
      : confrontante.condicao === 'espolio'
        ? 'espólio proprietário'
        : confrontante.condicao === 'condomino'
          ? 'condômino(a) / coproprietário(a)'
          : confrontante.condicao === 'usufrutuario'
            ? 'usufrutuário(a)'
            : 'proprietário(a)';

  const textoConfrontante =
    `1. QUALIFICAÇÃO DO CONFRONTANTE (LINDEIRO):\n` +
    `Eu, ${confrontante.nome || 'DADO AUSENTE'}, ` +
    `${isCnpj ? 'Pessoa Jurídica' : 'Pessoa Física'}, inscrito(a) no ${docLabel} sob o nº ${confrontante.cpf || 'DADO AUSENTE'}` +
    `${estadoCivilTxt}${conjugeTxt}, ` +
    `na qualidade de ${condicaoTxt} do imóvel confrontante, ${matConfTxt}.`;

  addP(textoConfrontante, false, AlignmentType.JUSTIFIED, 160, 22);

  // 3. QUALIFICAÇÃO DO REQUERENTE E DO IMÓVEL GEORREFERENCIADO
  const papelProp = rotuloPapelProprietario(imovel.papelProprietario);
  const propNome = imovel.proprietario || imovel.posseiro || 'DADO AUSENTE';
  const propCpf = imovel.cpfProprietario || 'DADO AUSENTE';
  const codigoIncraTxt = imovel.codigoImovelIncra ? ` (Código INCRA: ${imovel.codigoImovelIncra})` : '';

  const textoImovelRequerente =
    `2. IMÓVEL OBJETO DO GEORREFERENCIAMENTO:\n` +
    `Denominação: "${imovel.denominacao || 'DADO AUSENTE'}"${codigoIncraTxt}, situado no município de ${imovel.municipio || 'DADO AUSENTE'}/${imovel.uf || 'UF'}, ` +
    `de propriedade/posse de ${propNome}, inscrito(a) no CPF/CNPJ sob o nº ${propCpf}, na condição de ${papelProp}.`;

  addP(textoImovelRequerente, false, AlignmentType.JUSTIFIED, 160, 22);

  // 4. RESPONSÁVEL TÉCNICO E CREDENCIAMENTO INCRA
  const rtNome = tecnico.nome || 'DADO AUSENTE';
  const rtReg = tecnico.cft || 'DADO AUSENTE';
  const rtCred = tecnico.credenciamentoIncra ? ` / Credenciamento INCRA: ${tecnico.credenciamentoIncra}` : '';
  const rtArt = tecnico.art ? ` (${rotuloRT.termo} nº ${tecnico.art})` : '';

  const textoRT =
    `3. RESPONSÁVEL TÉCNICO CREDENCIADO:\n` +
    `Trabalhos técnicos realizados pelo(a) ${tecnico.formacao || 'Responsável Técnico'} ${rtNome}, ` +
    `registro profissional ${rotuloRT.registro}: ${rtReg}${rtCred}${rtArt}.`;

  addP(textoRT, false, AlignmentType.JUSTIFIED, 200, 22);

  // 5. TEXTO FORMAL DE RECONHECIMENTO E ANUÊNCIA DE LIMITES
  let trechoVertTxt = '';
  if (verticesCompartilhados.length > 0) {
    const vInicio = verticesCompartilhados[0].de.codigoSigef || verticesCompartilhados[0].de.nome || 'VÉRTICE INICIAL';
    const vFim = verticesCompartilhados[verticesCompartilhados.length - 1].para.codigoSigef || verticesCompartilhados[verticesCompartilhados.length - 1].para.nome || 'VÉRTICE FINAL';
    trechoVertTxt = ` referente ao trecho perimétrico delimitado entre o vértice ${vInicio} e o vértice ${vFim}`;
  }

  const textoReconhecimento =
    `DECLARAÇÃO FORMAL DE RECONHECIMENTO DE LIMITES:\n\n` +
    `Pelo presente instrumento privado, DECLARO expressamente, para os devidos fins de direito e perante o Instituto Nacional de Colonização e Reforma Agrária - INCRA e o Sistema de Gestão Fundiária - SIGEF, em conformidade com a Lei nº 10.267/2001 e as Normas Técnicas para Georreferenciamento de Imóveis Rurais, que RECONHEÇO e ANUO integralmente com a locação dos limites de divisas do imóvel acima qualificado${trechoVertTxt}.\n\n` +
    `Declaro ainda que o referido perímetro respeita escrupulosamente os limites fáticos, cercas e divisas históricas consolidadas em campo, não havendo qualquer tipo de litígio, controvérsia, invasão ou sobreposição territorial sobre a referida extensão confrontante.`;

  addP(textoReconhecimento, false, AlignmentType.JUSTIFIED, 200, 22);

  // 6. TABELA DE VÉRTICES DO TRECHO CONFRONTADO
  if (incluirTabelaVertices && verticesCompartilhados.length > 0) {
    addP('RELAÇÃO DE VÉRTICES E COORDENADAS DO TRECHO CONFRONTADO:', true, AlignmentType.LEFT, 100, 20);

    const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };
    const borderStyle = { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' };
    const tableBorders = { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle, insideHorizontal: borderStyle, insideVertical: borderStyle };

    const rows: TableRow[] = [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({ width: { size: 18, type: WidthType.PERCENTAGE }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: 'Vértice', bold: true, size: 18 })] })] }),
          new TableCell({ width: { size: 12, type: WidthType.PERCENTAGE }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: 'Tipo', bold: true, size: 18 })] })] }),
          new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: 'Este (E) m', bold: true, size: 18 })] })] }),
          new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: 'Norte (N) m', bold: true, size: 18 })] })] }),
          new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: 'Dist. (m)', bold: true, size: 18 })] })] }),
        ],
      }),
    ];

    verticesCompartilhados.forEach((seg) => {
      const cod = seg.de.codigoSigef || seg.de.nome || '-';
      const tipo = seg.de.tipo || 'M';
      const e = Number.isFinite(seg.de.leste) ? numBR(seg.de.leste, 3) : '-';
      const n = Number.isFinite(seg.de.norte) ? numBR(seg.de.norte, 3) : '-';
      const dist = Number.isFinite(seg.distancia) ? numBR(seg.distancia, 2) : '-';

      rows.push(
        new TableRow({
          children: [
            new TableCell({ margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: cod, size: 18 })] })] }),
            new TableCell({ margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: tipo, size: 18 })] })] }),
            new TableCell({ margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: e, size: 18 })] })] }),
            new TableCell({ margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: n, size: 18 })] })] }),
            new TableCell({ margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: dist, size: 18 })] })] }),
          ],
        })
      );
    });

    paragraphs.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: tableBorders, rows }));
    addVazio(140);
  }

  // 7. DATA E LOCAL DA ASSINATURA
  addP(`${local}, ${data}.`, false, AlignmentType.RIGHT, 300, 22);

  // 8. CAMPOS DE ASSINATURA
  addVazio(240);

  // Assinatura do Confrontante (Declarante)
  const descrProp = confrontante.condicao === 'posseiro' ? 'Possuidor(a) Confrontante' : 'Proprietário(a) Confrontante';
  addP('________________________________________________________', false, AlignmentType.CENTER, 40, 22);
  addP(confrontante.nome || 'CONFRONTANTE', true, AlignmentType.CENTER, 20, 22);
  addP(`${descrProp} - CPF/CNPJ: ${confrontante.cpf || 'DADO AUSENTE'}`, false, AlignmentType.CENTER, 40, 20);
  addP('(Reconhecer Firma em Cartório)', true, AlignmentType.CENTER, 200, 18);

  // Assinatura do Cônjuge se houver
  if (confrontante.conjugeNome) {
    addVazio(160);
    addP('________________________________________________________', false, AlignmentType.CENTER, 40, 22);
    addP(confrontante.conjugeNome, true, AlignmentType.CENTER, 20, 22);
    addP(`Cônjuge do Confrontante - CPF: ${confrontante.conjugeCpf || 'DADO AUSENTE'}`, false, AlignmentType.CENTER, 40, 20);
    addP('(Reconhecer Firma em Cartório)', true, AlignmentType.CENTER, 200, 18);
  }

  // Assinatura do Proprietário Requerente
  addVazio(160);
  addP('________________________________________________________', false, AlignmentType.CENTER, 40, 22);
  addP(propNome, true, AlignmentType.CENTER, 20, 22);
  addP(`${papelProp} do Imóvel Georreferenciado - CPF: ${propCpf}`, false, AlignmentType.CENTER, 200, 20);

  // Assinatura do Responsável Técnico
  addVazio(160);
  addP('________________________________________________________', false, AlignmentType.CENTER, 40, 22);
  addP(rtNome, true, AlignmentType.CENTER, 20, 22);
  addP(`${tecnico.formacao || 'Responsável Técnico'} - ${rotuloRT.registro}: ${rtReg}`, false, AlignmentType.CENTER, 100, 20);

  return paragraphs;
}

/**
 * Gera um documento Word (.docx) contendo a Carta de Reconhecimento de Limites (CRL) individual.
 */
export function gerarCrlDocumento(input: CrlInput): Document {
  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }, // 1 polegada (2.54cm)
          },
        },
        children: montarParagrafosCRL(input),
      },
    ],
  });
}

/**
 * Gera um documento Word (.docx) único com TODAS as Cartas de Reconhecimento de Limites (CRL),
 * uma por confrontante, separadas por quebra de página.
 */
export function gerarCrlLoteDocumento(inputs: CrlInput[]): Document {
  const children: (Paragraph | Table)[] = [];

  inputs.forEach((input, index) => {
    if (index > 0) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }
    children.push(...montarParagrafosCRL(input));
  });

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        children,
      },
    ],
  });
}
