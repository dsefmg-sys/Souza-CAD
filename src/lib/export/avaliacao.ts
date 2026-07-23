import { jsPDF } from 'jspdf';
import { ImovelData, EscritorioData, TecnicoData } from '../topo/types';
import { aplicarPapelTimbrado, cabecalhoEscritorio, statusFicticio } from './financeiro';

export interface DadosAvaliacao {
  tipoImovel: 'rural' | 'urbano';
  aptidaoSolo: string;
  conservacaoEdif: string;
  valorUnitario: string; // R$ por ha ou por m²
  benfeitorias: string;
  metodologia: string;
}

export function gerarPdfLaudoAvaliacao(
  imovel: ImovelData,
  esc: EscritorioData | null,
  tecnico: TecnicoData,
  dados: DadosAvaliacao
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const larg = doc.internal.pageSize.getWidth();
  const alt = doc.internal.pageSize.getHeight();
  const margem = 20;
  const largUtil = larg - 2 * margem;

  let y = cabecalhoEscritorio(doc, esc, margem, larg);
  y = statusFicticio(doc, imovel, larg, y);

  // Título
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(5, 150, 105); // Verde esmeralda escuro
  const descTipo = dados.tipoImovel === 'rural' ? 'IMÓVEL RURAL' : 'IMÓVEL URBANO';
  doc.text(`LAUDO TÉCNICO DE AVALIAÇÃO DE ${descTipo}`, larg / 2, y, { align: 'center' });
  
  doc.setDrawColor(5, 150, 105);
  doc.setLineWidth(0.5);
  doc.line(margem, y + 2, larg - margem, y + 2);
  y += 10;

  // Caracterização do Imóvel
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('1. IDENTIFICAÇÃO E ASPECTOS GERAIS', margem, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`Denominação: ${imovel.denominacao || 'Não informado'}`, margem + 5, y);
  y += 5;
  doc.text(`Área Avaliada: ${imovel.areaHa ? imovel.areaHa.toFixed(4) : '0.0000'} ha (${imovel.areaM2 ? imovel.areaM2.toFixed(2) : '0.00'} m²)`, margem + 5, y);
  y += 5;
  doc.text(`Município/UF: ${imovel.municipio || 'Não cadastrado'}-${imovel.uf || ''}`, margem + 5, y);
  y += 7;

  // Aspectos Físicos e Conservação
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. DIAGNÓSTICO DO TERRENO E BENFEITORIAS', margem, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`Aptidão / Qualidade do Solo: ${dados.aptidaoSolo || 'Alta aptidão agrícola com relevo plano'}`, margem + 5, y);
  y += 5;
  doc.text(`Estado de Conservação das Edificações: ${dados.conservacaoEdif || 'Regular'}`, margem + 5, y);
  y += 5;
  
  doc.text('Benfeitorias e Infraestrutura Identificadas:', margem + 5, y);
  y += 4.5;
  const splitBenf = doc.splitTextToSize(
    dados.benfeitorias || 'Cercamento completo em arame liso 5 fios com estacas de eucalipto tratado, curral de manobra com brete e balança, barracão de alvenaria para maquinários de 120m², rede elétrica trifásica e poço semi-artesiano com vazão de 5.000 L/h.',
    largUtil - 10
  );
  doc.setFont('helvetica', 'italic');
  doc.text(splitBenf, margem + 5, y);
  doc.setFont('helvetica', 'normal');
  y += splitBenf.length * 4.5 + 7;

  // Avaliação Financeira
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('3. VALORES E METODOLOGIA APLICADA', margem, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`Metodologia Utilizada: ${dados.metodologia || 'Método Comparativo Direto de Dados de Mercado'}`, margem + 5, y);
  y += 5;

  // Valores Finais
  const areaCalc = dados.tipoImovel === 'rural' ? (imovel.areaHa || 0) : (imovel.areaM2 || 0);
  const unidade = dados.tipoImovel === 'rural' ? 'ha' : 'm²';
  const valUnitNum = parseFloat(dados.valorUnitario.replace(/\./g, '').replace(/,/g, '.')) || 0;
  const valTotal = areaCalc * valUnitNum;
  
  const valUnitStr = valUnitNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const valTotalStr = valTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  doc.text(`Valor Unitário de Referência: ${valUnitStr} por ${unidade}`, margem + 5, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(`VALOR TOTAL ESTIMADO DO IMÓVEL: ${valTotalStr}`, margem + 5, y);
  doc.setFont('helvetica', 'normal');
  y += 15;

  // Assinatura Técnica
  if (y > alt - 40) {
    doc.addPage();
    y = cabecalhoEscritorio(doc, esc, margem, larg) + 15;
  }

  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);
  doc.line(larg / 2 - 40, y, larg / 2 + 40, y);
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(tecnico.nome || 'Nome do Profissional', larg / 2, y, { align: 'center' });
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`${tecnico.conselho || 'CREA'}: ${tecnico.cft || ''} / Engenheiro Agrônomo / Avaliador`, larg / 2, y, { align: 'center' });

  return doc;
}

/** Gerador de Laudo de Avaliação de Imóvel em Word (.docx) */
export async function gerarDocxAvaliacaoImovel(
  imovel: ImovelData,
  esc: EscritorioData | null,
  tecnico: TecnicoData,
  dados: DadosAvaliacao
): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, AlignmentType } = await import('docx');
  const descTipo = dados.tipoImovel === 'rural' ? 'IMÓVEL RURAL' : 'IMÓVEL URBANO';

  const areaCalc = dados.tipoImovel === 'rural' ? (imovel.areaHa || 0) : (imovel.areaM2 || 0);
  const unidade = dados.tipoImovel === 'rural' ? 'ha' : 'm²';
  const valUnitNum = parseFloat((dados.valorUnitario || '0').replace(/\./g, '').replace(/,/g, '.')) || 0;
  const valTotal = areaCalc * valUnitNum;
  const valUnitStr = valUnitNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const valTotalStr = valTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: `LAUDO TÉCNICO DE AVALIAÇÃO DE ${descTipo}`, bold: true, size: 26, color: '059669' }),
          ],
        }),
        new Paragraph({ text: '' }),
        new Paragraph({
          children: [
            new TextRun({ text: '1. IDENTIFICAÇÃO E ASPECTOS GERAIS', bold: true, size: 22 }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Denominação: ', bold: true }),
            new TextRun({ text: imovel.denominacao || 'Não informado' }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Área Avaliada: ', bold: true }),
            new TextRun({ text: `${imovel.areaHa ? imovel.areaHa.toFixed(4) : '0.0000'} ha (${imovel.areaM2 ? imovel.areaM2.toFixed(2) : '0.00'} m²)` }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Município/UF: ', bold: true }),
            new TextRun({ text: `${imovel.municipio || 'Não cadastrado'}-${imovel.uf || ''}` }),
          ],
        }),
        new Paragraph({ text: '' }),
        new Paragraph({
          children: [
            new TextRun({ text: '2. DIAGNÓSTICO DO TERRENO E BENFEITORIAS', bold: true, size: 22 }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Aptidão / Qualidade do Solo: ', bold: true }),
            new TextRun({ text: dados.aptidaoSolo || 'Alta aptidão agrícola com relevo plano' }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Estado de Conservação das Edificações: ', bold: true }),
            new TextRun({ text: dados.conservacaoEdif || 'Regular' }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Benfeitorias e Infraestrutura: ', bold: true }),
            new TextRun({ text: dados.benfeitorias || 'Cercamento completo, infraestrutura rural/urbana.' }),
          ],
        }),
        new Paragraph({ text: '' }),
        new Paragraph({
          children: [
            new TextRun({ text: '3. VALORES E METODOLOGIA APLICADA', bold: true, size: 22 }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Metodologia Utilizada: ', bold: true }),
            new TextRun({ text: dados.metodologia || 'Método Comparativo Direto de Dados de Mercado (NBR 14653)' }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Valor Unitário de Referência: ', bold: true }),
            new TextRun({ text: `${valUnitStr} por ${unidade}` }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'VALOR TOTAL ESTIMADO DO IMÓVEL: ', bold: true, color: '059669' }),
            new TextRun({ text: valTotalStr, bold: true, size: 24, color: '059669' }),
          ],
        }),
        new Paragraph({ text: '' }),
        new Paragraph({ text: '' }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: '____________________________________________________' }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: tecnico.nome || 'Nome do Profissional', bold: true }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: `${tecnico.conselho || 'CREA'}: ${tecnico.cft || ''} / Engenheiro Agrônomo / Perito Avaliador` }),
          ],
        }),
      ],
    }],
  });

  return await Packer.toBlob(doc);
}
