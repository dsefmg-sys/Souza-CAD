import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import type { ImovelData, TecnicoData } from '../topo/types';

/** Uma correção a ser feita na errata: onde, o que constava e o que passa a constar. */
export interface CorrecaoErrata {
  onde: string;     // ex.: "Matrícula do confrontante José Cláudio", "Município do imóvel"
  constava: string; // o valor errado
  passa: string;    // o valor correto
}

export interface ErrataInput {
  imovel: ImovelData;
  tecnico: TecnicoData;
  correcoes: CorrecaoErrata[];
  motivo?: string;       // justificativa geral (opcional)
  comarca?: string;      // padrão = município do imóvel
  dataExtenso?: string;  // ex.: "29 de junho de 2026"
}

function titulo(t: string) {
  return new Paragraph({ spacing: { before: 200, after: 80 }, children: [new TextRun({ text: t, bold: true, size: 22 })] });
}
function par(t: string, align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.JUSTIFIED) {
  return new Paragraph({ alignment: align, spacing: { after: 100 }, children: [new TextRun({ text: t, size: 22 })] });
}

export async function gerarErrataDocx(input: ErrataInput): Promise<Blob> {
  const { imovel, tecnico, correcoes } = input;
  const comarca = input.comarca || imovel.municipio || '—';
  const c: Paragraph[] = [];

  c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: 'ERRATA AO MEMORIAL DESCRITIVO / RETIFICAÇÃO DE DADOS', bold: true, size: 24 })] }));
  c.push(par(`Ilustríssimo Senhor(a) Oficial do Cartório de Registro de Imóveis da Comarca de ${comarca},`));

  c.push(titulo('DA IDENTIFICAÇÃO DO IMÓVEL'));
  c.push(par(`Imóvel denominado ${imovel.denominacao || '—'}, situado no município de ${imovel.municipio || '—'}, matrícula nº ${imovel.matricula || '—'}${imovel.codigoImovelIncra ? `, código INCRA (SIGEF) ${imovel.codigoImovelIncra}` : ''}.`));

  c.push(titulo('DAS CORREÇÕES'));
  c.push(par(input.motivo?.trim()
    || 'O responsável técnico abaixo identificado, tendo constatado equívoco(s) material(is) na documentação técnica do imóvel acima, vem, respeitosamente, apresentar a presente ERRATA, a fim de retificar as informações a seguir, sem alteração dos limites, confrontações ou da realidade física levantada:'));

  if (correcoes.length === 0) {
    c.push(par('(nenhuma correção informada)'));
  } else {
    correcoes.forEach((cor, i) => {
      c.push(new Paragraph({ spacing: { before: 80, after: 10 }, children: [new TextRun({ text: `${i + 1}. ${cor.onde || 'Campo'}`, bold: true, size: 22 })] }));
      c.push(new Paragraph({ spacing: { after: 10 }, children: [
        new TextRun({ text: 'Onde se lê: ', bold: true, size: 22 }),
        new TextRun({ text: cor.constava || '—', size: 22 }),
      ] }));
      c.push(new Paragraph({ spacing: { after: 60 }, children: [
        new TextRun({ text: 'Leia-se: ', bold: true, size: 22 }),
        new TextRun({ text: cor.passa || '—', size: 22 }),
      ] }));
    });
  }

  c.push(titulo('DA RESPONSABILIDADE TÉCNICA'));
  c.push(par('O profissional declara, sob as penas da lei, que as correções acima são verdadeiras e que não alteram os limites, a área levantada ou os direitos dos confrontantes, restando o memorial descritivo e a planta retificados conforme aqui consignado.'));

  const data = input.dataExtenso ? `${comarca}, ${input.dataExtenso}.` : `${comarca}, ____ de __________ de ______.`;
  c.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 240, after: 200 }, children: [new TextRun({ text: data, size: 22 })] }));

  c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 300 }, children: [new TextRun({ text: '____________________________________', size: 22 })] }));
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: tecnico.nome, size: 22 })] }));
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${tecnico.formacao || 'Responsável Técnico'} — CFT ${tecnico.cft} — INCRA: ${tecnico.credenciamentoIncra}`, size: 22 })] }));

  const doc = new Document({
    sections: [{ properties: { page: { margin: { top: 1133, bottom: 1133, left: 1133, right: 1133 } } }, children: c }],
  });
  return Packer.toBlob(doc);
}
