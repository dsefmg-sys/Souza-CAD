import { jsPDF } from 'jspdf';
import { ImovelData, EscritorioData, TecnicoData } from '../topo/types';
import { aplicarPapelTimbrado, cabecalhoEscritorio, statusFicticio } from './financeiro';

export interface DadosCredito {
  aptidaoSolo: string;
  culturaPrincipal: string;
  capacidadePastagem: string;
  finalidadeCredito: string;
  cronogramaEtapas: Array<{
    id: string;
    etapa: string;
    mes: number;
    valor: number;
  }>;
}

export function gerarPdfLaudoAptidao(
  imovel: ImovelData,
  esc: EscritorioData | null,
  tecnico: TecnicoData,
  dados: DadosCredito
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
  doc.setTextColor(5, 150, 105); // Emerald 600
  doc.text('LAUDO DE APTIDÃO AGRÍCOLA & SOLO', larg / 2, y, { align: 'center' });
  
  doc.setDrawColor(5, 150, 105);
  doc.setLineWidth(0.5);
  doc.line(margem, y + 2, larg - margem, y + 2);
  y += 10;

  // Seção 1
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('1. DADOS DO IMÓVEL AVALIADO', margem, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`Denominação: ${imovel.denominacao || 'Não informada'}`, margem, y);
  y += 5;
  doc.text(`Localização: ${imovel.municipio || 'Não informada'}`, margem, y);
  y += 5;
  doc.text(`Área Total: ${(imovel.areaHa || 0).toFixed(4)} ha (${((imovel.areaHa || 0) * 10000).toLocaleString('pt-BR')} m²)`, margem, y);
  y += 5;
  doc.text(`Matrícula/Registro: ${imovel.matricula || 'Ausente'}`, margem, y);
  y += 8;

  // Seção 2: Aptidão e Solo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. CARACTERIZAÇÃO DO SOLO & APTIDÃO AGRÍCOLA', margem, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`Aptidão / Classe de Solo: ${dados.aptidaoSolo || 'Não informada'}`, margem, y);
  y += 5;
  doc.text(`Cultura Principal Recomendada: ${dados.culturaPrincipal || 'Não informada'}`, margem, y);
  y += 5;
  doc.text(`Capacidade de Suporte de Pastagens: ${dados.capacidadePastagem || 'Não informada'}`, margem, y);
  y += 5;
  doc.text(`Finalidade do Crédito Solicitado: ${dados.finalidadeCredito || 'Custeio / Investimento'}`, margem, y);
  y += 8;

  // Seção 3: Diagnóstico Técnico
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('3. DIAGNÓSTICO E CONCLUSÃO TÉCNICA', margem, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const diag = `O imóvel rural denominado "${imovel.denominacao || 'Sem nome'}" apresenta solo caracterizado como ${dados.aptidaoSolo || 'Classe de Solo não especificada'}, com aptidão agrícola favorável para a cultura de ${dados.culturaPrincipal || 'cultura não definida'}. Os parâmetros técnicos levantados in loco indicam viabilidade para o recebimento do crédito rural pretendido para ${dados.finalidadeCredito || 'operações de custeio/investimento'}, estando o imóvel em conformidade com as exigências técnicas bancárias locais.`;
  const linhasDiag = doc.splitTextToSize(diag, largUtil);
  doc.text(linhasDiag, margem, y);
  y += (linhasDiag.length * 5) + 12;

  // Assinaturas
  y = Math.max(y, alt - 50);
  doc.setFont('helvetica', 'bold');
  doc.line(margem + 10, y, larg / 2 - 10, y);
  doc.line(larg / 2 + 10, y, larg - margem - 10, y);
  
  doc.setFontSize(8.5);
  doc.text('RESPONSÁVEL TÉCNICO', larg / 4, y + 4, { align: 'center' });
  doc.text(tecnico.nome || 'RT', larg / 4, y + 8, { align: 'center' });
  doc.text(`${tecnico.conselho || 'CFTA'}: ${tecnico.cft || 'Reg. não informado'}`, larg / 4, y + 12, { align: 'center' });

  doc.text('PROPRIETÁRIO / PROPONENTE', (larg * 3) / 4, y + 4, { align: 'center' });
  doc.text(imovel.proprietario || 'Proponente', (larg * 3) / 4, y + 8, { align: 'center' });
  doc.text(`CPF: ${imovel.cpfProprietario || 'Não informado'}`, (larg * 3) / 4, y + 12, { align: 'center' });

  aplicarPapelTimbrado(doc, esc || undefined);
  return doc;
}

export function gerarPdfCronogramaFinanceiro(
  imovel: ImovelData,
  esc: EscritorioData | null,
  tecnico: TecnicoData,
  dados: DadosCredito
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
  doc.setTextColor(5, 150, 105); // Emerald 600
  doc.text('CRONOGRAMA FÍSICO-FINANCEIRO DE CRÉDITO', larg / 2, y, { align: 'center' });
  
  doc.setDrawColor(5, 150, 105);
  doc.setLineWidth(0.5);
  doc.line(margem, y + 2, larg - margem, y + 2);
  y += 10;

  // Informações do Imóvel
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(`Imóvel: ${imovel.denominacao || 'Sem nome'} | Proponente: ${imovel.proprietario || 'Não informado'}`, margem, y);
  y += 8;

  // Tabela de Etapas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  
  // Headers da tabela
  doc.setFillColor(243, 244, 246);
  doc.rect(margem, y, largUtil, 8, 'F');
  doc.text('ETAPA / INVESTIMENTO', margem + 3, y + 5.5);
  doc.text('MÊS', larg - margem - 45, y + 5.5, { align: 'center' });
  doc.text('VALOR ORÇADO', larg - margem - 3, y + 5.5, { align: 'right' });
  doc.setDrawColor(209, 213, 219);
  doc.line(margem, y, larg - margem, y);
  doc.line(margem, y + 8, larg - margem, y + 8);
  y += 8;

  doc.setFont('helvetica', 'normal');
  const etapas = dados.cronogramaEtapas || [];
  let total = 0;

  etapas.forEach((et) => {
    doc.text(et.etapa, margem + 3, y + 5.5);
    doc.text(`Mês ${et.mes}`, larg - margem - 45, y + 5.5, { align: 'center' });
    doc.text(`R$ ${(et.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, larg - margem - 3, y + 5.5, { align: 'right' });
    doc.line(margem, y + 8, larg - margem, y + 8);
    total += et.valor;
    y += 8;
  });

  // Linha de Total
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(236, 253, 245);
  doc.rect(margem, y, largUtil, 8, 'F');
  doc.text('VALOR TOTAL DO PROJETO', margem + 3, y + 5.5);
  doc.text(`R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, larg - margem - 3, y + 5.5, { align: 'right' });
  doc.line(margem, y + 8, larg - margem, y + 8);
  y += 12;

  // Declaração de Aplicação
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  const decl = 'Declaramos que os recursos orçados no cronograma físico-financeiro acima serão aplicados rigorosamente nas etapas de desenvolvimento técnico e produção constantes deste plano, sob responsabilidade do proponente e fiscalização técnica.';
  const linhasDecl = doc.splitTextToSize(decl, largUtil);
  doc.text(linhasDecl, margem, y);
  y += (linhasDecl.length * 4) + 12;

  // Assinaturas
  y = Math.max(y, alt - 50);
  doc.setFont('helvetica', 'bold');
  doc.line(margem + 10, y, larg / 2 - 10, y);
  doc.line(larg / 2 + 10, y, larg - margem - 10, y);
  
  doc.setFontSize(8.5);
  doc.text('RESPONSÁVEL TÉCNICO', larg / 4, y + 4, { align: 'center' });
  doc.text(tecnico.nome || 'RT', larg / 4, y + 8, { align: 'center' });
  doc.text(`${tecnico.conselho || 'CFTA'}: ${tecnico.cft || 'Reg. não informado'}`, larg / 4, y + 12, { align: 'center' });

  doc.text('PROPRIETÁRIO / PROPONENTE', (larg * 3) / 4, y + 4, { align: 'center' });
  doc.text(imovel.proprietario || 'Proponente', (larg * 3) / 4, y + 8, { align: 'center' });
  doc.text(`CPF: ${imovel.cpfProprietario || 'Não informado'}`, (larg * 3) / 4, y + 12, { align: 'center' });

  aplicarPapelTimbrado(doc, esc || undefined);
  return doc;
}
