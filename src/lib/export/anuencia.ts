import { Document, Paragraph, TextRun, AlignmentType, PageBreak, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import type { ImovelData, TecnicoData, Confrontante, Vertex } from '../topo/types';
import { numBR } from '../topo/geometry';
import { rotulosProfissional } from '../topo/profissional';
import { REPRES_LABEL } from '../topo/sigefVocab';
import { rotuloPapelProprietario } from './papelProprietario';
import { sanitizarProfundo } from './sanitizar';
import { carregarModelos, preencherModelo } from '../store/modelos';

export interface AnuenciaInput {
  imovel: ImovelData;
  tecnico: TecnicoData;
  confrontante: Confrontante;
  verticesCompartilhados: { de: Vertex; para: Vertex; distancia: number }[];
  comarca?: string;
  dataExtenso?: string;
  /** Quando true, anexa a relação de vértices do trecho anuído, com código e coordenadas E/N. */
  incluirVerticesLista?: boolean;
}

/** Monta os parágrafos de UMA carta de anuência. Isolado pra ser reaproveitado tanto na carta
 *  individual quanto no documento único com todas as cartas (uma por confrontante). */
function montarParagrafosAnuencia(input: AnuenciaInput): (Paragraph | Table)[] {
  const { imovel, tecnico, confrontante, verticesCompartilhados, comarca, dataExtenso, incluirVerticesLista } = sanitizarProfundo(input);

  const local = comarca || imovel.municipio || '________';
  const data = dataExtenso || '___ de __________________ de 20___';

  const rotuloRT = rotulosProfissional(tecnico);

  const paragraphs: (Paragraph | Table)[] = [];

  const addP = (text: string, bold = false, align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.JUSTIFIED, spaceAfter = 120, size = 22) => {
    paragraphs.push(new Paragraph({
      alignment: align,
      spacing: { after: spaceAfter },
      children: [new TextRun({ text, bold, size })],
    }));
  };

  const addVazio = (spaceBefore = 180) => {
    paragraphs.push(new Paragraph({ spacing: { before: spaceBefore } }));
  };

  // Título
  addP('DECLARAÇÃO DE RESPEITO DE LIMITES', true, AlignmentType.CENTER, 40, 24);
  addP('(CARTA DE ANUÊNCIA)', true, AlignmentType.CENTER, 240, 24);

  // Qualificação do Confrontante
  const conjugeTxt = confrontante.conjugeNome
    ? `, casado(a) sob o regime de bens com ${confrontante.conjugeNome}, inscrito(a) no CPF sob o nº ${confrontante.conjugeCpf || '___________'}`
    : '';

  const inventarianteTxt = confrontante.inventarianteNome
    ? `, neste ato representado(a) pelo(a) inventariante ${confrontante.inventarianteNome}, inscrito(a) no CPF sob o nº ${confrontante.inventarianteCpf || '___________'}`
    : '';

  const condicaoTxt = confrontante.condicao === 'posseiro'
    ? 'possuidor(a) e detentor(a) dos direitos possessórios'
    : confrontante.condicao === 'espolio'
      ? 'espólio proprietário'
      : confrontante.condicao === 'condomino'
        ? 'condômino(a) / coproprietário(a)'
        : confrontante.condicao === 'usufrutuario'
          ? 'usufrutuário(a)'
          : 'proprietário(a)';

  let qualConfrontante = `Eu, ${confrontante.nome}, `;
  if (confrontante.cpf) qualConfrontante += `inscrito(a) no CPF sob o nº ${confrontante.cpf}, `;
  qualConfrontante += `na qualidade de ${condicaoTxt} do imóvel confrontante `;
  if (confrontante.matricula) qualConfrontante += `registrado sob a Matrícula nº ${confrontante.matricula} (CNS: ${confrontante.cns || '________'}) `;
  qualConfrontante += `${conjugeTxt}${inventarianteTxt}, `;

  paragraphs.push(new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 180 },
    children: [
      new TextRun({ text: qualConfrontante, size: 22 }),
      new TextRun({ text: ' DECLARO ', bold: true, size: 22 }),
      new TextRun({
        text: `para os devidos fins de direito e perante o Cartório de Registro de Imóveis competente, que conheço e concordo plenamente com os limites perimetrais e divisas comuns estabelecidos no levantamento topográfico georreferenciado do imóvel rural denominado `,
        size: 22
      }),
      new TextRun({ text: imovel.denominacao || '________________', bold: true, size: 22 }),
      new TextRun({ text: imovel.regimeTerra === 'posse' ? `, sob a posse de ` : `, de propriedade de `, size: 22 }),
      new TextRun({
        text: imovel.tipoPessoa === 'Espólio' && imovel.inventarianteNome
          ? `Espólio de ${imovel.proprietario}, representado por seu inventariante ${imovel.inventarianteNome}`
          : (imovel.proprietario || '________________'),
        bold: true,
        size: 22
      }),
      new TextRun({ text: `, executado sob a responsabilidade técnica do profissional `, size: 22 }),
      new TextRun({ text: tecnico.nome || '________________', bold: true, size: 22 }),
      new TextRun({ text: `, credenciado junto ao INCRA sob o código `, size: 22 }),
      new TextRun({ text: tecnico.credenciamentoIncra || '________', bold: true, size: 22 }),
      new TextRun({ text: `.`, size: 22 }),
    ]
  }));

  // Descrição do Trecho de Divisa Compartilhado
  addP('TRECHO COMPARTILHADO E ANUÍDO:', true, AlignmentType.LEFT, 80, 20);

  if (verticesCompartilhados.length === 0) {
    addP('Não foram encontrados trechos associados a este confrontante no perímetro ativo.', false, AlignmentType.JUSTIFIED, 180, 22);
  } else {
    verticesCompartilhados.forEach((trecho) => {
      const deCod = trecho.de.codigoSigef || trecho.de.nome;
      const paraCod = trecho.para.codigoSigef || trecho.para.nome;
      const dist = numBR(trecho.distancia, 2);
      
      paragraphs.push(new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 100 },
        children: [
          new TextRun({ text: `Segmento `, size: 22 }),
          new TextRun({ text: `${deCod} `, bold: true, size: 22 }),
          new TextRun({ text: `a `, size: 22 }),
          new TextRun({ text: `${paraCod}`, bold: true, size: 22 }),
          new TextRun({ text: `: extensão de `, size: 22 }),
          new TextRun({ text: `${dist} m`, bold: true, size: 22 }),
          new TextRun({ text: `, definido por `, size: 22 }),
          new TextRun({ text: (REPRES_LABEL[trecho.de.representacao || 'linha-ideal'] || 'linha ideal').toLowerCase(), italics: true, size: 22 }),
          new TextRun({ text: `.`, size: 22 }),
        ]
      }));
    });
  }

  // Relação de vértices (opcional): lista os vértices do trecho anuído com código e coordenadas,
  // sem repetir, pra a carta ficar autossuficiente pra conferência.
  if (incluirVerticesLista && verticesCompartilhados.length > 0) {
    addVazio(80);
    addP('RELAÇÃO DE VÉRTICES DO TRECHO ANUÍDO:', true, AlignmentType.LEFT, 80, 20);

    const vistos = new Set<string>();
    const uniqueVertices: Vertex[] = [];
    const coletarVertice = (v: Vertex) => {
      const cod = v.codigoSigef || v.nome || v.id;
      if (!cod || vistos.has(cod)) return;
      vistos.add(cod);
      uniqueVertices.push(v);
    };
    verticesCompartilhados.forEach((t) => {
      coletarVertice(t.de);
      coletarVertice(t.para);
    });

    if (uniqueVertices.length > 0) {
      const tableRows: TableRow[] = [];

      // Header Row
      tableRows.push(new TableRow({
        children: [
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            shading: { fill: "F2F2F2" },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 80, after: 80 },
              children: [new TextRun({ text: "Vértice", bold: true, size: 20 })]
            })]
          }),
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            shading: { fill: "F2F2F2" },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 80, after: 80 },
              children: [new TextRun({ text: "Coordenada Este (E)", bold: true, size: 20 })]
            })]
          }),
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            shading: { fill: "F2F2F2" },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 80, after: 80 },
              children: [new TextRun({ text: "Coordenada Norte (N)", bold: true, size: 20 })]
            })]
          })
        ]
      }));

      // Data Rows
      uniqueVertices.forEach((v) => {
        const cod = v.codigoSigef || v.nome || v.id;
        tableRows.push(new TableRow({
          children: [
            new TableCell({
              width: { size: 40, type: WidthType.PERCENTAGE },
              children: [new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 60, after: 60 },
                children: [new TextRun({ text: cod, bold: true, size: 20 })]
              })]
            }),
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              children: [new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 60, after: 60 },
                children: [new TextRun({ text: `${numBR(v.leste, 3)} m`, size: 20 })]
              })]
            }),
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              children: [new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 60, after: 60 },
                children: [new TextRun({ text: `${numBR(v.norte, 3)} m`, size: 20 })]
              })]
            })
          ]
        }));
      });

      const borders = {
        top: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
        left: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
        right: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "EAEAEA" },
        insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "EAEAEA" }
      };

      const table = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: borders,
        rows: tableRows
      });

      paragraphs.push(table);
    }
  }

  addVazio(120);

  const fecho = preencherModelo(carregarModelos().anuenciaFecho, {
    denominacao: imovel.denominacao || '', proprietario: imovel.proprietario || '',
    tecnico: tecnico.nome || '', municipio: imovel.municipio || '', comarca: comarca || imovel.municipio || '',
  });
  addP(fecho, false, AlignmentType.JUSTIFIED, 180, 22);

  addP(`${local}, ${data}.`, false, AlignmentType.RIGHT, 360, 22);

  addVazio(360);

  // Linhas de Assinatura
  const addAssinatura = (nome: string, rotulo: string) => {
    paragraphs.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      // Duas linhas a mais de respiro acima da linha de assinatura, pra sobrar espaço pra firma.
      spacing: { before: 680, after: 20 },
      keepNext: true,
      keepLines: true,
      children: [
        new TextRun({ text: '________________________________________', size: 22 }),
      ]
    }));
    paragraphs.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 20 },
      keepNext: true,
      keepLines: true,
      children: [
        new TextRun({ text: nome, bold: true, size: 22 }),
      ]
    }));
    paragraphs.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      keepNext: true,
      keepLines: true,
      children: [
        new TextRun({ text: rotulo, size: 20 }),
      ]
    }));
  };

  // Assinatura do Confrontante
  addAssinatura(confrontante.nome, `Confrontante (${condicaoTxt})`);

  // Cônjuge se houver
  if (confrontante.conjugeNome) {
    addAssinatura(confrontante.conjugeNome, 'Cônjuge do Confrontante');
  }

  // Usufruto: o nu-proprietário assina junto (se informado).
  if (confrontante.condicao === 'usufrutuario' && confrontante.nuProprietarioNome?.trim()) {
    addAssinatura(confrontante.nuProprietarioNome, 'Nu-proprietário(a) do imóvel confrontante');
  }

  // Proprietário do Imóvel (requerente) + demais titulares, se houver.
  const rotuloAssinaturaRequerente = imovel.regimeTerra === 'posse' ? 'Possuidor(a) Requerente' : `Proprietário Requerente${rotuloPapelProprietario(imovel.papelProprietario) !== 'Proprietário(a)' ? ` (${rotuloPapelProprietario(imovel.papelProprietario)})` : ''}`;
  if (imovel.tipoPessoa === 'Espólio') {
    addAssinatura(`Espólio de ${imovel.proprietario}`, `Representado pelo Inventariante: ${imovel.inventarianteNome || 'DADO AUSENTE'}`);
  } else {
    addAssinatura(imovel.proprietario || '_______________________', rotuloAssinaturaRequerente);
  }
  for (const parte of imovel.proprietariosAdicionais ?? []) {
    if (parte.nome?.trim()) addAssinatura(parte.nome, `Titular do imóvel (${rotuloPapelProprietario(parte.papel)})`);
  }

  // Responsável Técnico
  addAssinatura(tecnico.nome || '_______________________', `${tecnico.formacao || 'Responsável Técnico'} - ${rotuloRT.registro}: ${tecnico.cft || '________'}`);

  return paragraphs;
}

/** Uma carta de anuência (um confrontante) — um documento .docx. */
export function gerarAnuenciaDocumento(input: AnuenciaInput): Document {
  return new Document({
    sections: [{
      properties: {},
      children: montarParagrafosAnuencia(input),
    }],
  });
}

/**
 * TODAS as cartas num único documento .docx: uma carta por confrontante, cada uma começando
 * numa página nova. Assim o usuário baixa tudo de uma vez, já separado pra imprimir e colher
 * as assinaturas. A ordem segue a lista recebida.
 */
export function gerarAnuenciaLoteDocumento(inputs: AnuenciaInput[]): Document {
  const children: (Paragraph | Table)[] = [];
  inputs.forEach((input, i) => {
    if (i > 0) {
      // Quebra de página antes de cada carta seguinte, pra cada confrontante ter a sua folha.
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }
    children.push(...montarParagrafosAnuencia(input));
  });
  return new Document({
    sections: [{
      properties: {},
      children: children.length ? children : [new Paragraph({})],
    }],
  });
}
