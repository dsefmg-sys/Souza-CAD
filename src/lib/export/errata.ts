import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import type { ImovelData, TecnicoData } from '../topo/types';
import { numBR } from '../topo/geometry';
import { sanitizarProfundo } from './sanitizar';

/** Uma correção da errata: onde, o que constava (onde se lê) e o que passa a constar (leia-se). */
export interface CorrecaoErrata {
  onde: string;     // ex.: "Confrontante Flávio Alves"
  constava: string; // ex.: "Matrícula nº 3383"
  passa: string;    // ex.: "Matrícula nº 5.378"
}

export interface ErrataInput {
  imovel: ImovelData;
  tecnico: TecnicoData;
  correcoes: CorrecaoErrata[];
  areaHa: number;
  comarca?: string;        // padrão = município do imóvel
  assunto?: string;        // padrão = retificação de georreferenciamento
  acrescimoRT?: string;    // se preenchido, vira a seção "Acréscimo de Responsabilidade Técnica"
  dataExtenso?: string;    // ex.: "5 de junho de 2026"
}

const ASSUNTO_PADRAO = 'Retificação de dados em processo de Georreferenciamento e Retificação de Área.';

function par(runs: TextRun[], align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.JUSTIFIED, after = 120) {
  return new Paragraph({ alignment: align, spacing: { after }, children: runs });
}
function t(texto: string, opts: { bold?: boolean; size?: number } = {}) {
  return new TextRun({ text: texto, bold: opts.bold, size: opts.size ?? 22 });
}
function secao(n: number, titulo: string) {
  return new Paragraph({ spacing: { before: 160, after: 60 }, children: [new TextRun({ text: `${n}. ${titulo}`, bold: true, size: 22 })] });
}

export async function gerarErrataDocx(inputBruto: ErrataInput): Promise<Blob> {
  const input = sanitizarProfundo(inputBruto);
  const { imovel, tecnico, correcoes, areaHa } = input;
  const comarca = (input.comarca || imovel.municipio || '—').replace(/\s*-\s*MG$/i, '').trim();
  const nomeUpper = (tecnico.nome || '').toUpperCase();
  const denom = imovel.denominacao || '—';
  const area = `${numBR(areaHa, 4)} ha`;
  const local = imovel.local || '';
  const c: Paragraph[] = [];

  // Cabeçalho
  if (imovel.ficticio) {
    c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: '*** DADOS FICTÍCIOS — DOCUMENTO DE DEMONSTRAÇÃO, SEM VALIDADE LEGAL ***', bold: true, size: 20, color: 'B91C1C' })] }));
  }
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 }, children: [new TextRun({ text: 'ERRATA FORMAL DE MEMORIAL DESCRITIVO E PROJETO TÉCNICO', bold: true, size: 24 })] }));
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new TextRun({ text: `AO OFICIAL DE REGISTRO DE IMÓVEIS DA COMARCA DE ${comarca.toUpperCase()} – MG`, bold: true, size: 22 })] }));

  // Referência
  c.push(par([
    t('Ref.: ', { bold: true }),
    t(`Imóvel: ${denom}`),
    t(` | Matrícula: ${imovel.matricula || '—'}`),
    t(` | Proprietário(s): ${imovel.proprietario || '—'}`),
    t(` | Assunto: ${input.assunto || ASSUNTO_PADRAO}`),
  ]));

  // Parágrafo de abertura
  c.push(par([
    t('Eu, '), t(nomeUpper, { bold: true }),
    t(`, Técnico em Agrimensura, inscrito no CFT sob o nº ${tecnico.cft || '—'}, responsável técnico pelos serviços de agrimensura do imóvel rural denominado ${denom}, com área de ${area}${local ? `, localizado no ${local}` : ''}, venho por meio desta apresentar ERRATA FORMAL para retificação de informações constantes na planta e no memorial descritivo anteriormente apresentados.`),
  ]));

  // Seção 1: correções
  let n = 1;
  c.push(secao(n++, 'Retificação de Dados de Confrontantes e Matrículas'));
  c.push(par([t('Para fins de correta averbação e para evitar a necessidade de reconfecção de peças gráficas e novas colheitas de assinaturas, onde constam dados divergentes, leia-se conforme a correção abaixo:')]));
  if (correcoes.length === 0) {
    c.push(par([t('(nenhuma correção informada)')]));
  } else {
    for (const cor of correcoes) {
      c.push(par([
        t(`${cor.onde}: `, { bold: true }),
        t('Onde se lê '), t(cor.constava || '—'),
        t(', leia-se: '), t(cor.passa || '—', { bold: true }), t('.'),
      ], AlignmentType.JUSTIFIED, 60));
    }
  }

  // Seção opcional: acréscimo de responsabilidade técnica
  if (input.acrescimoRT?.trim()) {
    c.push(secao(n++, 'Acréscimo de Informação de Responsabilidade Técnica'));
    c.push(par([t('Fica devidamente registrado e acrescido ao processo o número de registro profissional correspondente: '), t(input.acrescimoRT.trim(), { bold: true })]));
  }

  // Ratificação
  c.push(secao(n++, 'Considerações Finais e Ratificação'));
  c.push(par([t(`Esta errata visa sanar apenas os erros materiais de digitação referentes às matrículas dos confrontantes e à inclusão de registro profissional, mantendo-se inalterados os limites físicos, as coordenadas georreferenciadas (SIRGAS2000), os azimutes e a área total de ${area} do imóvel. Esta peça passa a ser parte integrante da documentação técnica para todos os fins de direito.`)]));

  // Data e assinatura
  const data = input.dataExtenso ? `${comarca} - MG, ${input.dataExtenso}.` : `${comarca} - MG, ____ de __________ de ______.`;
  c.push(new Paragraph({ spacing: { before: 240, after: 320 }, keepNext: true, keepLines: true, children: [t(data)] }));
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, keepLines: true, children: [new TextRun({ text: nomeUpper, bold: true, size: 22 })] }));
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, keepLines: true, children: [t('Técnico em Agrimensura')] }));
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, keepLines: true, children: [t(`CFT ${tecnico.cft || '—'}`)] }));

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Arial' } } } },
    sections: [{ properties: { page: { margin: { top: 1133, bottom: 1133, left: 1133, right: 1133 } } }, children: c }],
  });
  return Packer.toBlob(doc);
}
