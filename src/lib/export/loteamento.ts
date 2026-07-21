import { jsPDF } from 'jspdf';
import { ImovelData, EscritorioData, TecnicoData } from '../topo/types';
import { aplicarPapelTimbrado, cabecalhoEscritorio, statusFicticio } from './financeiro';

export interface DadosLoteamento {
  numeroLotes: string;
  areaVerde: string;
  areaRuas: string;
  volCorte: string;
  volAterro: string;
  infraAgua: boolean;
  infraEsgoto: boolean;
  infraLuz: boolean;
  infraDrenagem: boolean;
}

export function gerarPdfMemorialLoteamento(
  imovel: ImovelData,
  esc: EscritorioData | null,
  tecnico: TecnicoData,
  dados: DadosLoteamento
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
  doc.setTextColor(13, 148, 136); // Teal 600
  doc.text('MEMORIAL DESCRITIVO DE LOTEAMENTO', larg / 2, y, { align: 'center' });
  
  doc.setDrawColor(13, 148, 136);
  doc.setLineWidth(0.5);
  doc.line(margem, y + 2, larg - margem, y + 2);
  y += 10;

  // Informações Gerais
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('1. DADOS DO IMÓVEL ORIGINÁRIO (GLEBA MÃE)', margem, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`Propriedade Originária: ${imovel.denominacao || 'Sem denominação'}`, margem + 5, y);
  y += 5;
  doc.text(`Município/UF: ${imovel.municipio || 'Não cadastrado'}-${imovel.uf || ''}`, margem + 5, y);
  y += 5;
  doc.text(`Área Total Georreferenciada: ${imovel.areaHa ? imovel.areaHa.toFixed(4) : '0.0000'} ha (${imovel.areaM2 ? imovel.areaM2.toFixed(2) : '0.00'} m²)`, margem + 5, y);
  y += 7;

  // Quadro de Áreas do Loteamento
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. QUADRO DE DISTRIBUIÇÃO DE ÁREAS E QUANTITATIVOS', margem, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`Número de Lotes Projetados: ${dados.numeroLotes || '0'} unidades`, margem + 5, y);
  y += 5;
  doc.text(`Área Destinada a Vias Públicas (Ruas/Avenidas): ${dados.areaRuas || '0,00'} m²`, margem + 5, y);
  y += 5;
  doc.text(`Área Destinada a Áreas Verdes / Sistema de Recreação: ${dados.areaVerde || '0,00'} m²`, margem + 5, y);
  y += 7;

  // Normas urbanísticas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('3. DIRETRIZES URBANÍSTICAS E AMBIENTAIS', margem, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const textoDiretrizes = `O projeto de loteamento atende plenamente às exigências da Lei Federal nº 6.766/1979 e às diretrizes municipais. As áreas verdes e institucionais foram demarcadas de modo a preservar as feições fisiográficas e a vegetação nativa do imóvel, mantendo a conformidade com as restrições ambientais locais de preservação permanente.`;
  const splitDir = doc.splitTextToSize(textoDiretrizes, largUtil);
  doc.text(splitDir, margem + 5, y);
  y += splitDir.length * 4.5 + 20;

  // Assinaturas
  if (y > alt - 40) {
    doc.addPage();
    y = cabecalhoEscritorio(doc, esc, margem, larg) + 15;
  }
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);
  doc.line(larg / 2 - 40, y, larg / 2 + 40, y);
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.text(tecnico ? (tecnico.nome || 'Nome do Técnico') : 'Responsável Técnico', larg / 2, y, { align: 'center' });
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`${tecnico.conselho || 'CREA'}: ${tecnico.cft || ''} / Autor do Projeto de Loteamento`, larg / 2, y, { align: 'center' });

  return doc;
}

export function gerarPdfLaudoInfraestrutura(
  imovel: ImovelData,
  esc: EscritorioData | null,
  tecnico: TecnicoData,
  dados: DadosLoteamento
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
  doc.setTextColor(13, 148, 136);
  doc.text('LAUDO DE INFRAESTRUTURA E MOVIMENTAÇÃO DE TERRA', larg / 2, y, { align: 'center' });
  
  doc.setDrawColor(13, 148, 136);
  doc.setLineWidth(0.5);
  doc.line(margem, y + 2, larg - margem, y + 2);
  y += 10;

  // Terraplenagem
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('1. CÁLCULO DE MOVIMENTAÇÃO DE TERRA (VOLUMES)', margem, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`Volume Estimado de Corte: ${dados.volCorte || '0,00'} m³`, margem + 5, y);
  y += 5;
  doc.text(`Volume Estimado de Aterro: ${dados.volAterro || '0,00'} m³`, margem + 5, y);
  y += 5;
  const corteVal = parseFloat(dados.volCorte.replace(/\./g, '').replace(/,/g, '.')) || 0;
  const aterroVal = parseFloat(dados.volAterro.replace(/\./g, '').replace(/,/g, '.')) || 0;
  const saldo = corteVal - aterroVal;
  doc.text(`Saldo de Volume (Corte - Aterro): ${saldo.toLocaleString('pt-BR')} m³ (${saldo >= 0 ? 'Sobras para Bota-fora' : 'Necessidade de Empréstimo'})`, margem + 5, y);
  y += 7;

  // Infraestrutura Básica Declarada
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. ESPECIFICAÇÕES DE INFRAESTRUTURA BÁSICA PROJETADA', margem, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`• Rede de Abastecimento de Água Potável: ${dados.infraAgua ? 'SIM' : 'NÃO'}`, margem + 5, y);
  y += 5;
  doc.text(`• Rede de Esgotamento Sanitário: ${dados.infraEsgoto ? 'SIM' : 'NÃO'}`, margem + 5, y);
  y += 5;
  doc.text(`• Rede de Distribuição de Energia Elétrica e Iluminação: ${dados.infraLuz ? 'SIM' : 'NÃO'}`, margem + 5, y);
  y += 5;
  doc.text(`• Sistema de Escoamento de Águas Pluviais (Drenagem): ${dados.infraDrenagem ? 'SIM' : 'NÃO'}`, margem + 5, y);
  y += 10;

  // Laudo técnico declarativo
  const laudoTexto = `Declaramos, para os fins regulamentares junto aos órgãos municipais e ambientais, que o projeto de infraestrutura do empreendimento contempla as redes especificadas acima, atendendo aos limites técnicos de vazão, escoamento de águas e controle erosivo adequados ao perfil topográfico levantado.`;
  const splitLaudo = doc.splitTextToSize(laudoTexto, largUtil);
  doc.text(splitLaudo, margem, y);
  y += splitLaudo.length * 4.5 + 20;

  // Assinatura
  if (y > alt - 40) {
    doc.addPage();
    y = cabecalhoEscritorio(doc, esc, margem, larg) + 15;
  }
  doc.setDrawColor(150, 150, 150);
  doc.line(larg / 2 - 40, y, larg / 2 + 40, y);
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.text(tecnico ? (tecnico.nome || 'Nome do Técnico') : 'Responsável Técnico', larg / 2, y, { align: 'center' });
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`${tecnico.conselho || 'CREA'}: ${tecnico.cft || ''} / Engenheiro Responsável`, larg / 2, y, { align: 'center' });

  return doc;
}
