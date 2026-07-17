import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import type { ImovelData, TecnicoData } from '../topo/types';
import { rotulosProfissional } from '../topo/profissional';
import { sanitizarProfundo } from './sanitizar';
import { carregarModelos, preencherModelo } from '../store/modelos';

export interface DeclaracaoInput {
  imovel: ImovelData;
  tecnico: TecnicoData;
  dataExtenso?: string;   // ex.: "5 de junho de 2026"
  permitirIncompleto?: boolean;
}

function varsDeclaracao(imovel: ImovelData, tecnico: TecnicoData, permitirIncompleto?: boolean): Record<string, string> {
  const f = (val?: string) => {
    if (permitirIncompleto && (!val || !val.trim() || val === '—')) return 'DADO AUSENTE';
    return val || '';
  };
  return {
    proprietario: f(imovel.proprietario), cpf: f(imovel.cpfProprietario), denominacao: f(imovel.denominacao),
    matricula: f(imovel.matricula), cns: f(imovel.cns), municipio: f(imovel.municipio), comarca: f(imovel.municipio),
    codigoIncra: f(imovel.codigoImovelIncra), tecnico: f(tecnico.nome), cft: f(tecnico.cft), cidade: f(imovel.municipio || tecnico.cidadeAssinatura),
  };
}

function splitTextRuns(corpo: string): TextRun[] {
  const parts = corpo.split(/(DADO AUSENTE)/g);
  return parts.map((part) => {
    if (part === 'DADO AUSENTE') {
      return new TextRun({ text: part, size: 22, color: 'FF0000', bold: true });
    }
    return new TextRun({ text: part, size: 22 });
  });
}

/** Declaração de posse, assinada pelo possuidor (proprietário do imóvel). */
export async function gerarDeclaracaoPosseDocx(inputBruto: DeclaracaoInput): Promise<Blob> {
  const { imovel, tecnico, dataExtenso, permitirIncompleto } = sanitizarProfundo(inputBruto);
  const corpo = preencherModelo(carregarModelos().declPosse, varsDeclaracao(imovel, tecnico, permitirIncompleto));
  const assinaNome = imovel.proprietario || (permitirIncompleto ? 'DADO AUSENTE' : '');
  return montar('DECLARAÇÃO DE POSSE', corpo, assinaNome, 'Possuidor(a)', imovel, tecnico, dataExtenso, permitirIncompleto);
}

/** Declaração de inexistência de sobreposição, assinada pelo responsável técnico. */
export async function gerarDeclaracaoSobreposicaoDocx(inputBruto: DeclaracaoInput): Promise<Blob> {
  const { imovel, tecnico, dataExtenso, permitirIncompleto } = sanitizarProfundo(inputBruto);
  const corpo = preencherModelo(carregarModelos().declInexistenciaSobreposicao, varsDeclaracao(imovel, tecnico, permitirIncompleto));
  const rot = rotulosProfissional(tecnico);
  const rotulo = `${tecnico.formacao || (permitirIncompleto ? 'DADO AUSENTE' : 'Responsável Técnico')} — ${rot.registro}: ${tecnico.cft || (permitirIncompleto ? 'DADO AUSENTE' : '—')}`;
  const assinaNome = tecnico.nome || (permitirIncompleto ? 'DADO AUSENTE' : '');
  return montar('DECLARAÇÃO DE INEXISTÊNCIA DE SOBREPOSIÇÃO', corpo, assinaNome, rotulo, imovel, tecnico, dataExtenso, permitirIncompleto);
}

/** Declaração de representação de incapaz (menores/interditos). */
export async function gerarDeclaracaoIncapazDocx(inputBruto: DeclaracaoInput & { representado?: string }): Promise<Blob> {
  const { imovel, tecnico, dataExtenso, representado, permitirIncompleto } = sanitizarProfundo(inputBruto);
  const vars = { ...varsDeclaracao(imovel, tecnico, permitirIncompleto), representado: representado || (permitirIncompleto ? 'DADO AUSENTE' : '_______________________') };
  const corpo = preencherModelo(carregarModelos().declIncapaz, vars);
  const assinaNome = imovel.proprietario || (permitirIncompleto ? 'DADO AUSENTE' : '');
  return montar('DECLARAÇÃO DE REPRESENTAÇÃO DE INCAPAZ', corpo, assinaNome, 'Representante Legal', imovel, tecnico, dataExtenso, permitirIncompleto);
}

/** Declaração de representação de espólio (inventariante). */
export async function gerarDeclaracaoEspolioDocx(inputBruto: DeclaracaoInput & { falecido?: string }): Promise<Blob> {
  const { imovel, tecnico, dataExtenso, falecido, permitirIncompleto } = sanitizarProfundo(inputBruto);
  const vars = { ...varsDeclaracao(imovel, tecnico, permitirIncompleto), falecido: falecido || (permitirIncompleto ? 'DADO AUSENTE' : '_______________________') };
  const corpo = preencherModelo(carregarModelos().declEspolio, vars);
  const assinaNome = imovel.proprietario || (permitirIncompleto ? 'DADO AUSENTE' : '');
  return montar('DECLARAÇÃO DE REPRESENTAÇÃO DE ESPÓLIO', corpo, assinaNome, 'Inventariante', imovel, tecnico, dataExtenso, permitirIncompleto);
}

/** Declaração de respeito de limites e ausência de sobreposição (assinada pelo proprietário/possuidor). */
export async function gerarDeclaracaoRespeitoLimitesDocx(inputBruto: DeclaracaoInput): Promise<Blob> {
  const { imovel, tecnico, dataExtenso, permitirIncompleto } = sanitizarProfundo(inputBruto);
  const corpo = preencherModelo(carregarModelos().declRespeitoLimites, varsDeclaracao(imovel, tecnico, permitirIncompleto));
  const assinaNome = imovel.proprietario || (permitirIncompleto ? 'DADO AUSENTE' : '');
  return montar('DECLARAÇÃO DE RESPEITO DE LIMITES E INEXISTÊNCIA DE CONFLITOS', corpo, assinaNome, 'Requerente', imovel, tecnico, dataExtenso, permitirIncompleto);
}

/** Monta o docx de uma declaração simples (título, corpo, data e assinatura). */
async function montar(titulo: string, corpo: string, assinaNome: string, assinaRotulo: string, imovel: ImovelData, tecnico: TecnicoData, dataExtenso?: string, permitirIncompleto?: boolean): Promise<Blob> {
  const c: Paragraph[] = [];
  if (imovel.ficticio) {
    c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: '*** DADOS FICTÍCIOS — DOCUMENTO DE DEMONSTRAÇÃO, SEM VALIDADE LEGAL ***', bold: true, size: 20, color: 'B91C1C' })] }));
  }
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [new TextRun({ text: titulo, bold: true, size: 24 })] }));
  c.push(new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 200 }, children: splitTextRuns(corpo) }));

  const local = imovel.municipio || tecnico.cidadeAssinatura || (permitirIncompleto ? 'DADO AUSENTE' : '—');
  const data = dataExtenso ? `${local}, ${dataExtenso}.` : `${local}, ____ de __________ de ______.`;
  
  const dataRuns = data.includes('DADO AUSENTE')
    ? [new TextRun({ text: data.replace('DADO AUSENTE', ''), size: 22 }), new TextRun({ text: 'DADO AUSENTE', size: 22, color: 'FF0000', bold: true })]
    : [new TextRun({ text: data, size: 22 })];

  c.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 240, after: 320 }, children: dataRuns }));

  c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, keepNext: true, keepLines: true, children: [new TextRun({ text: '________________________________________', size: 22 })] }));
  
  const assinaNomeRuns = assinaNome.includes('DADO AUSENTE')
    ? [new TextRun({ text: 'DADO AUSENTE', bold: true, size: 22, color: 'FF0000' })]
    : [new TextRun({ text: assinaNome || '—', bold: true, size: 22 })];

  const assinaRotuloRuns = assinaRotulo.includes('DADO AUSENTE')
    ? splitTextRuns(assinaRotulo)
    : [new TextRun({ text: assinaRotulo, size: 20 })];

  c.push(new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, keepLines: true, children: assinaNomeRuns }));
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, keepLines: true, children: assinaRotuloRuns }));

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Arial' } } } },
    sections: [{ properties: { page: { margin: { top: 1133, bottom: 1133, left: 1133, right: 1133 } } }, children: c }],
  });
  return Packer.toBlob(doc);
}
