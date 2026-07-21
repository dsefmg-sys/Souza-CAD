import { jsPDF } from 'jspdf';
import { ImovelData, EscritorioData, TecnicoData } from '../topo/types';
import { aplicarPapelTimbrado, cabecalhoEscritorio, statusFicticio } from './financeiro';

export interface DadosLTCA {
  vegetacao: string;
  conservacao: string;
  corposAgua: string;
  appEstimada: string;
  fauna: string;
  diagnostico: string;
}

export interface DadosFinanciamento {
  instituicao: string;
  linhaCredito: string;
  atividade: string;
  valor: string;
  cronograma: string;
}

export interface DadosPRADA {
  declividade: string;
  recomposicao: boolean;
  acoes: string;
}

export function gerarPdfLTCA(
  imovel: ImovelData,
  esc: EscritorioData | null,
  tecnico: TecnicoData,
  dados: DadosLTCA
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const larg = doc.internal.pageSize.getWidth();
  const alt = doc.internal.pageSize.getHeight();
  const margem = 20;
  const largUtil = larg - 2 * margem;

  let y = cabecalhoEscritorio(doc, esc, margem, larg);
  y = statusFicticio(doc, imovel, larg, y);

  // Título do Laudo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(21, 128, 61); // Verde floresta
  doc.text('LAUDO TÉCNICO DE CARACTERIZAÇÃO AMBIENTAL (LTCA)', larg / 2, y, { align: 'center' });
  
  doc.setDrawColor(21, 128, 61);
  doc.setLineWidth(0.5);
  doc.line(margem, y + 2, larg - margem, y + 2);
  y += 10;

  // Seção 1: Dados do Imóvel
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('1. DADOS DE IDENTIFICAÇÃO DO IMÓVEL', margem, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const infoImovel = [
    `Denominação: ${imovel.denominacao || 'Não informado'}`,
    `Município/UF: ${imovel.municipio || 'Não informado'}-${imovel.uf || ''}`,
    `Área Total: ${imovel.areaHa ? imovel.areaHa.toFixed(4) : '0.0000'} ha`,
    `Matrícula: ${imovel.matricula || 'Não informado'}`,
    `Código INCRA/SNCR: ${imovel.codigoImovelIncra || 'Não informado'}`
  ];

  infoImovel.forEach(txt => {
    doc.text(txt, margem + 5, y);
    y += 4.5;
  });
  y += 4;

  // Seção 2: Caracterização da Flora e Cobertura Vegetal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('2. COBERTURA VEGETAL E FLORA', margem, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`Vegetação Predominante: ${dados.vegetacao || 'Mata Nativa / Cerrado'}`, margem + 5, y);
  y += 5;
  doc.text(`Estado de Conservação: ${dados.conservacao || 'Preservado'}`, margem + 5, y);
  y += 5;
  
  doc.text('Descrição da Flora / Fitofisionomia:', margem + 5, y);
  y += 4.5;
  doc.setFont('helvetica', 'italic');
  const splitFlora = doc.splitTextToSize(
    'A área avaliada apresenta fitofisionomia típica, com ocorrência de espécies arbóreas nativas de médio a grande porte, estrato arbustivo denso e boa regeneração natural no sub-bosque.',
    largUtil - 10
  );
  doc.text(splitFlora, margem + 5, y);
  y += splitFlora.length * 4.5 + 4;

  // Seção 3: Recursos Hídricos e Áreas de Preservação Permanente (APP)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('3. RECURSOS HÍDRICOS E ÁREAS DE PRESERVAÇÃO', margem, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`Corpos d'água / Drenagem: ${dados.corposAgua || 'Presença de córrego de pequeno porte'}`, margem + 5, y);
  y += 5;
  doc.text(`Área de APP Estimada: ${dados.appEstimada || '0.00'} ha`, margem + 5, y);
  y += 6;

  // Seção 4: Fauna Silvestre Observada
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('4. FAUNA SILVESTRE OBSERVADA', margem, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const splitFauna = doc.splitTextToSize(dados.fauna || 'Avifauna diversa, pequenos mamíferos e répteis típicos do ecossistema local.', largUtil - 10);
  doc.text(splitFauna, margem + 5, y);
  y += splitFauna.length * 4.5 + 6;

  // Page break se necessário
  if (y > alt - 80) {
    doc.addPage();
    y = cabecalhoEscritorio(doc, esc, margem, larg);
  }

  // Seção 5: Parecer e Diagnóstico Ambiental
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('5. PARECER E DIAGNÓSTICO AMBIENTAL', margem, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const splitDiag = doc.splitTextToSize(dados.diagnostico || 'Com base na vistoria de campo realizada, conclui-se que o imóvel rural apresenta conformidade parcial com o Código Florestal Brasileiro (Lei nº 12.651/2012). Recomenda-se a preservação contínua das APPs e a averbação da Reserva Legal.', largUtil - 10);
  doc.text(splitDiag, margem + 5, y);
  y += splitDiag.length * 4.5 + 15;

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
  doc.text(`${tecnico.conselho || 'CREA'}: ${tecnico.cft || ''} / ART ou TRT vinculada`, larg / 2, y, { align: 'center' });

  return doc;
}

export function gerarPdfFinanciamento(
  imovel: ImovelData,
  esc: EscritorioData | null,
  tecnico: TecnicoData,
  dados: DadosFinanciamento
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
  doc.setTextColor(30, 58, 138); // Azul escuro
  doc.text('PROJETO TÉCNICO PARA FINANCIAMENTO AGROPECUÁRIO', larg / 2, y, { align: 'center' });
  
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.5);
  doc.line(margem, y + 2, larg - margem, y + 2);
  y += 10;

  // Identificação do Crédito
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('1. DADOS DA OPERAÇÃO DE CRÉDITO', margem, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`Instituição Financeira: ${dados.instituicao || 'Banco do Brasil'}`, margem + 5, y);
  y += 5;
  doc.text(`Linha de Crédito: ${dados.linhaCredito || 'ABC+ (Agricultura de Baixo Carbono)'}`, margem + 5, y);
  y += 5;
  doc.text(`Valor Solicitado: R$ ${dados.valor || '0,00'}`, margem + 5, y);
  y += 7;

  // Identificação da Atividade
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. ATIVIDADE E FINALIDADE PROPOSTA', margem, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`Atividade Principal: ${dados.atividade || 'Implantação de Lavoura / Pastagem Ecológica'}`, margem + 5, y);
  y += 5;

  doc.text('Justificativa Técnica e Finalidade:', margem + 5, y);
  y += 4.5;
  const splitAtiv = doc.splitTextToSize(
    'O recurso será integralmente aplicado na aquisição de insumos agrícolas modernos, correção de solo com calcário e fosfatagem, e implantação de cercas divisórias para rotação de pastagens, promovendo melhor rendimento e preservação.',
    largUtil - 10
  );
  doc.setFont('helvetica', 'italic');
  doc.text(splitAtiv, margem + 5, y);
  doc.setFont('helvetica', 'normal');
  y += splitAtiv.length * 4.5 + 6;

  // Cronograma de Investimentos
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('3. CRONOGRAMA DE APLICAÇÃO DOS RECURSOS', margem, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const splitCrono = doc.splitTextToSize(dados.cronograma || 'Mês 1-2: Preparo de solo e calagem.\nMês 3-4: Adubação de plantio e semeadura.\nMês 5-12: Tratos culturais e monitoramento.', largUtil - 10);
  doc.text(splitCrono, margem + 5, y);
  y += splitCrono.length * 4.5 + 15;

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
  doc.text(`${tecnico.conselho || 'CREA'}: ${tecnico.cft || ''} / ART-TRT de Crédito Agrícola`, larg / 2, y, { align: 'center' });

  return doc;
}

export function gerarPdfPRADA(
  imovel: ImovelData,
  esc: EscritorioData | null,
  tecnico: TecnicoData,
  dados: DadosPRADA
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
  doc.setTextColor(22, 101, 52); // Verde escuro
  doc.text('PLANO DE RECUPERAÇÃO DE ÁREAS DEGRADADAS (PRADA)', larg / 2, y, { align: 'center' });
  
  doc.setDrawColor(22, 101, 52);
  doc.setLineWidth(0.5);
  doc.line(margem, y + 2, larg - margem, y + 2);
  y += 10;

  // Diagnóstico
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('1. DIAGNÓSTICO GEOGRÁFICO E AMBIENTAL', margem, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`Declividade Média Estimada: ${dados.declividade || '12%'}`, margem + 5, y);
  y += 5;
  doc.text(`Recomposição Florestal Requerida: ${dados.recomposicao ? 'Sim' : 'Não'}`, margem + 5, y);
  y += 7;

  // Ações de Recuperação
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. AÇÕES DE RECOMPOSIÇÃO E CONTROLE', margem, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const splitAcoes = doc.splitTextToSize(
    dados.acoes || '1. Isolamento/cercamento das Áreas de Preservação Permanente (APP) com fios de arame liso para evitar entrada de gado.\n2. Plantio consorciado de espécies nativas regionais pioneiras e não-pioneiras em espaçamento 3x2m.\n3. Implantação de bacias de retenção e curvas de nível para controle de enxurradas e prevenção de processos erosivos.',
    largUtil - 10
  );
  doc.text(splitAcoes, margem + 5, y);
  y += splitAcoes.length * 4.5 + 15;

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
  doc.text(`${tecnico.conselho || 'CREA'}: ${tecnico.cft || ''} / PRADA Executivo`, larg / 2, y, { align: 'center' });

  return doc;
}
