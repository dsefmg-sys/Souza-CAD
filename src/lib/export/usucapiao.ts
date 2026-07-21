import { jsPDF } from 'jspdf';
import { ImovelData, EscritorioData, TecnicoData } from '../topo/types';
import { aplicarPapelTimbrado, cabecalhoEscritorio, statusFicticio } from './financeiro';

export interface DadosUsucapiao {
  tempoPosse: string;
  origemPosse: string;
  tipoUsucapiao: string;
  detalhesPosse: string;
  anuenteVizinhos: boolean;
}

export function gerarPdfLaudoUsucapiao(
  imovel: ImovelData,
  esc: EscritorioData | null,
  tecnico: TecnicoData,
  dados: DadosUsucapiao
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
  doc.setTextColor(79, 70, 229); // Roxo/Indigo
  doc.text('LAUDO TÉCNICO DE USUCAPIÃO EXTRAJUDICIAL', larg / 2, y, { align: 'center' });
  
  doc.setDrawColor(79, 70, 229);
  doc.setLineWidth(0.5);
  doc.line(margem, y + 2, larg - margem, y + 2);
  y += 10;

  // Informações da Posse
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('1. DADOS E HISTÓRICO DA POSSE', margem, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`Modalidade de Usucapião Pretendida: ${dados.tipoUsucapiao || 'Usucapião Extrajudicial Ordinária'}`, margem + 5, y);
  y += 5;
  doc.text(`Tempo de Posse Declarado: ${dados.tempoPosse || '15 anos'}`, margem + 5, y);
  y += 5;
  doc.text(`Origem da Posse: ${dados.origemPosse || 'Cessão de Direitos Possessórios / Ocupação Mansa'}`, margem + 5, y);
  y += 5;
  doc.text(`Anuência dos Confrontantes: ${dados.anuenteVizinhos ? 'Sim, vizinhos assinaram termos de divisa' : 'Pendente de coleta'}`, margem + 5, y);
  y += 7;

  // Descrição do Imóvel e Limites
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. DESCRIÇÃO FÍSICA E PERIMÉTRICA DO IMÓVEL', margem, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`Nome da Gleba/Área: ${imovel.denominacao || 'Área de Posse Fictícia'}`, margem + 5, y);
  y += 5;
  doc.text(`Área Georreferenciada: ${imovel.areaHa ? imovel.areaHa.toFixed(4) : '0.0000'} ha (${imovel.areaM2 ? imovel.areaM2.toFixed(2) : '0.00'} m²)`, margem + 5, y);
  y += 5;
  doc.text(`Localização: ${imovel.municipio || 'Não cadastrado'}-${imovel.uf || ''}`, margem + 5, y);
  y += 7;

  // Justificativa Técnica
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('3. DIAGNÓSTICO TÉCNICO E CONFRONTAÇÕES', margem, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const splitDetalhes = doc.splitTextToSize(
    dados.detalhesPosse || 'O imóvel possui limites perfeitamente definidos por cercas consolidadas há mais de uma década. O levantamento topográfico planialtimétrico cadastrou os marcos divisórios sem qualquer sobreposição de áreas com imóveis limítrofes certificados no SIGEF/INCRA, atestando a posse mansa, pacífica e sem contestação de terceiros.',
    largUtil - 10
  );
  doc.text(splitDetalhes, margem + 5, y);
  y += splitDetalhes.length * 4.5 + 15;

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
  doc.text(`${tecnico.conselho || 'CREA'}: ${tecnico.cft || ''} / Laudo de Posse Consolidada`, larg / 2, y, { align: 'center' });

  return doc;
}

export function gerarPdfAtaPosse(
  imovel: ImovelData,
  esc: EscritorioData | null,
  tecnico: TecnicoData,
  dados: DadosUsucapiao
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
  doc.setFontSize(13);
  doc.setTextColor(79, 70, 229);
  doc.text('ATA DE DECLARAÇÃO DE POSSE MANSA E PACÍFICA', larg / 2, y, { align: 'center' });
  
  doc.setDrawColor(79, 70, 229);
  doc.setLineWidth(0.5);
  doc.line(margem, y + 2, larg - margem, y + 2);
  y += 12;

  // Texto da ata
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  
  const proprietario = imovel.proprietario || 'Nome do Requerente/Possuidor';
  const cpf = imovel.cpfProprietario || '___.___.___-__';
  const estadoCivil = imovel.proprietarioEstadoCivil || '___';
  const nacionalidade = imovel.proprietarioNacionalidade || 'brasileiro(a)';
  
  const paragrafo1 = `Pelo presente instrumento técnico de instrução processual, o requerente ${proprietario.toUpperCase()}, nacionalidade ${nacionalidade}, estado civil ${estadoCivil}, inscrito sob o CPF de número ${cpf}, declara sob as penas das leis vigentes e para fins de instrução de Usucapião Extrajudicial conforme Art. 216-A da Lei de Registros Públicos (LRP), que exerce posse mansa, pacífica, contínua e incontestada sobre o imóvel rural/urbano denominado "${imovel.denominacao || 'Gleba de Posse'}", com área de ${imovel.areaHa ? imovel.areaHa.toFixed(4) : '0.0000'} ha, situado no município de ${imovel.municipio || 'Não cadastrado'}-${imovel.uf || ''}.`;
  
  const splitP1 = doc.splitTextToSize(paragrafo1, largUtil);
  doc.text(splitP1, margem, y);
  y += splitP1.length * 5 + 6;

  const paragrafo2 = `Declara ainda que a referida posse data de ${dados.tempoPosse || '15 anos'}, tendo sido adquirida através de ${dados.origemPosse || 'Direitos Possessórios'}, mantendo no local moradia habitual e/ou exploração econômica produtiva de forma exclusiva e transparente, sem qualquer oposição de confrontantes ou terceiros interessados durante todo este interregno temporal.`;
  
  const splitP2 = doc.splitTextToSize(paragrafo2, largUtil);
  doc.text(splitP2, margem, y);
  y += splitP2.length * 5 + 15;

  doc.text('Local e data: _________________________, ____ de ______________ de 2026.', margem, y);
  y += 25;

  // Linhas para assinatura do requerente
  doc.setDrawColor(150, 150, 150);
  doc.line(margem + 10, y, larg - margem - 10, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(proprietario.toUpperCase(), larg / 2, y, { align: 'center' });
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Declarante / Requerente da Usucapião', larg / 2, y, { align: 'center' });

  return doc;
}
