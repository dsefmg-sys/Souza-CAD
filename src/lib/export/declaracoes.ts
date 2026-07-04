import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import type { ImovelData, TecnicoData } from '../topo/types';
import { rotulosProfissional } from '../topo/profissional';
import { sanitizarProfundo } from './sanitizar';
import { carregarModelos, preencherModelo } from '../store/modelos';

export interface DeclaracaoInput {
  imovel: ImovelData;
  tecnico: TecnicoData;
  dataExtenso?: string;   // ex.: "5 de junho de 2026"
}

function varsDeclaracao(imovel: ImovelData, tecnico: TecnicoData): Record<string, string> {
  return {
    proprietario: imovel.proprietario || '', cpf: imovel.cpfProprietario || '', denominacao: imovel.denominacao || '',
    matricula: imovel.matricula || '', cns: imovel.cns || '', municipio: imovel.municipio || '', comarca: imovel.municipio || '',
    codigoIncra: imovel.codigoImovelIncra || '', tecnico: tecnico.nome || '', cft: tecnico.cft || '', cidade: tecnico.cidadeAssinatura || '',
  };
}

/** Declaração de posse, assinada pelo possuidor (proprietário do imóvel). */
export async function gerarDeclaracaoPosseDocx(inputBruto: DeclaracaoInput): Promise<Blob> {
  const { imovel, tecnico, dataExtenso } = sanitizarProfundo(inputBruto);
  const corpo = preencherModelo(carregarModelos().declPosse, varsDeclaracao(imovel, tecnico));
  return montar('DECLARAÇÃO DE POSSE', corpo, imovel.proprietario || '', 'Possuidor(a)', imovel, tecnico, dataExtenso);
}

/** Declaração de inexistência de sobreposição, assinada pelo responsável técnico. */
export async function gerarDeclaracaoSobreposicaoDocx(inputBruto: DeclaracaoInput): Promise<Blob> {
  const { imovel, tecnico, dataExtenso } = sanitizarProfundo(inputBruto);
  const corpo = preencherModelo(carregarModelos().declInexistenciaSobreposicao, varsDeclaracao(imovel, tecnico));
  const rot = rotulosProfissional(tecnico);
  const rotulo = `${tecnico.formacao || 'Responsável Técnico'} — ${rot.registro}: ${tecnico.cft || '—'}`;
  return montar('DECLARAÇÃO DE INEXISTÊNCIA DE SOBREPOSIÇÃO', corpo, tecnico.nome || '', rotulo, imovel, tecnico, dataExtenso);
}

/** Monta o docx de uma declaração simples (título, corpo, data e assinatura). */
async function montar(titulo: string, corpo: string, assinaNome: string, assinaRotulo: string, imovel: ImovelData, tecnico: TecnicoData, dataExtenso?: string): Promise<Blob> {
  const c: Paragraph[] = [];
  if (imovel.ficticio) {
    c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: '*** DADOS FICTÍCIOS — DOCUMENTO DE DEMONSTRAÇÃO, SEM VALIDADE LEGAL ***', bold: true, size: 20, color: 'B91C1C' })] }));
  }
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [new TextRun({ text: titulo, bold: true, size: 24 })] }));
  c.push(new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 200 }, children: [new TextRun({ text: corpo, size: 22 })] }));

  const local = tecnico.cidadeAssinatura || imovel.municipio || '—';
  const data = dataExtenso ? `${local}, ${dataExtenso}.` : `${local}, ____ de __________ de ______.`;
  c.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 240, after: 320 }, children: [new TextRun({ text: data, size: 22 })] }));

  c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, keepNext: true, keepLines: true, children: [new TextRun({ text: '________________________________________', size: 22 })] }));
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, keepLines: true, children: [new TextRun({ text: assinaNome || '—', bold: true, size: 22 })] }));
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, keepLines: true, children: [new TextRun({ text: assinaRotulo, size: 20 })] }));

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Arial' } } } },
    sections: [{ properties: { page: { margin: { top: 1133, bottom: 1133, left: 1133, right: 1133 } } }, children: c }],
  });
  return Packer.toBlob(doc);
}
