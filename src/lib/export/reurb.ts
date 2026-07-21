import { jsPDF } from 'jspdf';
import { ImovelData, EscritorioData, TecnicoData } from '../topo/types';
import { aplicarPapelTimbrado, cabecalhoEscritorio, statusFicticio } from './financeiro';

export interface DadosReurb {
  modalidadeReurb: 'REURB-S' | 'REURB-E';
  decretoMunicipal: string;
  classificacaoSocial: string;
  infraBasica: string;
  fundamentoReurb: string;
}

export function gerarPdfCRF(
  imovel: ImovelData,
  esc: EscritorioData | null,
  tecnico: TecnicoData,
  dados: DadosReurb
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
  doc.setTextColor(217, 119, 6); // Amarelo/Amber escuro
  doc.text('CERTIDÃO DE REGULARIZAÇÃO FUNDIÁRIA (CRF)', larg / 2, y, { align: 'center' });
  
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.5);
  doc.line(margem, y + 2, larg - margem, y + 2);
  y += 10;

  // Informações da regularização
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('1. DADOS DE ENQUADRAMENTO DA REURB', margem, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`Modalidade de REURB: ${dados.modalidadeReurb || 'REURB-S (Social)'}`, margem + 5, y);
  y += 5;
  doc.text(`Decreto Municipal Autoritativo: ${dados.decretoMunicipal || 'Decreto nº ___/2026'}`, margem + 5, y);
  y += 5;
  doc.text(`Classificação da Ocupação: ${dados.classificacaoSocial || 'Ocupação Consolidade de Baixa Renda'}`, margem + 5, y);
  y += 7;

  // Descrição do lote demarcado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. MEMORIAL E DADOS DO LOTE REGULARIZADO', margem, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`Proprietário/Beneficiário: ${imovel.proprietario || '___'}`, margem + 5, y);
  y += 5;
  doc.text(`Denominação/Lote: ${imovel.denominacao || '___'}`, margem + 5, y);
  y += 5;
  doc.text(`Área do Lote: ${imovel.areaHa ? imovel.areaHa.toFixed(4) : '0.0000'} ha (${imovel.areaM2 ? imovel.areaM2.toFixed(2) : '0.00'} m²)`, margem + 5, y);
  y += 5;
  doc.text(`Localização: ${imovel.local || '___'}`, margem + 5, y);
  y += 7;

  // Fundamento Jurídico
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('3. DECLARAÇÃO E CERTIFICAÇÃO MUNICIPAL', margem, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const textoCrf = `Certificamos, para fins de registro imobiliário conforme a Lei Federal nº 13.465/2017, que o lote acima descrito encontra-se regularizado e aprovado pelo município de ${imovel.municipio || '___'}, preenchendo todos os requisitos urbanísticos e de infraestrutura exigidos, estando apto para abertura de matrícula própria e registro do direito de propriedade em favor do beneficiário indicado.`;
  const splitCrf = doc.splitTextToSize(textoCrf, largUtil);
  doc.text(splitCrf, margem + 5, y);
  y += splitCrf.length * 4.5 + 20;

  // Linhas para assinatura do Município
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);
  doc.line(larg / 2 - 45, y, larg / 2 + 45, y);
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('COMISSÃO MUNICIPAL DE REURB', larg / 2, y, { align: 'center' });
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Representante de Regularização Fundiária', larg / 2, y, { align: 'center' });

  return doc;
}

export function gerarPdfPRF(
  imovel: ImovelData,
  esc: EscritorioData | null,
  tecnico: TecnicoData,
  dados: DadosReurb
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
  doc.setTextColor(217, 119, 6);
  doc.text('PROJETO DE REGULARIZAÇÃO FUNDIÁRIA (PRF)', larg / 2, y, { align: 'center' });
  
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.5);
  doc.line(margem, y + 2, larg - margem, y + 2);
  y += 10;

  // Diagnóstico
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('1. MEMORIAL DESCRITIVO E URBANÍSTICO', margem, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`Imóvel Objeto: ${imovel.denominacao || 'Gleba Consolidada'}`, margem + 5, y);
  y += 5;
  doc.text(`Área Total: ${imovel.areaHa ? imovel.areaHa.toFixed(4) : '0.0000'} ha (${imovel.areaM2 ? imovel.areaM2.toFixed(2) : '0.00'} m²)`, margem + 5, y);
  y += 5;
  doc.text(`Fração/Loteamento: ${imovel.municipio || '___'}`, margem + 5, y);
  y += 7;

  // Infraestrutura Básica
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. MEMORIAL DE INFRAESTRUTURA BÁSICA', margem, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const splitInfra = doc.splitTextToSize(
    dados.infraBasica || 'O projeto atesta a presença de rede de abastecimento de água potável ligada à concessionária local, rede de energia elétrica e iluminação pública consolidada, sistema básico de drenagem pluvial superficial e vias de acesso com pavimentação e condições de tráfego de veículos pesados de coleta e socorro público.',
    largUtil - 10
  );
  doc.text(splitInfra, margem + 5, y);
  y += splitInfra.length * 4.5 + 15;

  // Assinatura Técnica
  if (y > alt - 40) {
    doc.addPage();
    y = cabecalhoEscritorio(doc, esc, margem, larg) + 15;
  }

  doc.setDrawColor(150, 150, 150);
  doc.line(larg / 2 - 40, y, larg / 2 + 40, y);
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(tecnico.nome || 'Nome do Técnico', larg / 2, y, { align: 'center' });
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`${tecnico.conselho || 'CREA'}: ${tecnico.cft || ''} / Responsável Técnico pelo PRF`, larg / 2, y, { align: 'center' });

  return doc;
}
