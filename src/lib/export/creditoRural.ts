import { jsPDF } from 'jspdf';
import { ImovelData, EscritorioData, TecnicoData } from '../topo/types';
import { aplicarPapelTimbrado, cabecalhoEscritorio, statusFicticio } from './financeiro';

export interface ItemFinanciado {
  id: string;
  descricao: string;
  categoria: string;
  unidade?: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

export interface DadosCredito {
  aptidaoSolo: string;
  culturaPrincipal: string;
  capacidadePastagem: string;
  finalidadeCredito: string;
  linhaCredito?: string;
  agenteFinanceiro?: string;
  parceiroCorrespondente?: string;
  conselhoRt?: string;
  tituloProfissionalRt?: string;
  garantiaProposta?: string;
  taxaJurosAnual?: number;
  carenciaMeses?: number;
  prazoAnos?: number;
  enquadramentoPrograma?: 'pronaf' | 'pronamp' | 'demais';
  possuiCafDap?: boolean;
  rendaBrutaAnual?: number;
  solicitarProagro?: boolean;
  zarcAtendido?: boolean;
  aliquotaProagro?: number;
  cronogramaEtapas: Array<{
    id: string;
    etapa: string;
    mes: number;
    valor: number;
  }>;
  itensFinanciados?: ItemFinanciado[];
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
  doc.text(`${dados.conselhoRt || tecnico.conselho || 'CFTA'}: ${tecnico.cft || 'Reg. não informado'}`, larg / 4, y + 12, { align: 'center' });

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
  doc.text(`${dados.conselhoRt || tecnico.conselho || 'CFTA'}: ${tecnico.cft || 'Reg. não informado'}`, larg / 4, y + 12, { align: 'center' });

  doc.text('PROPRIETÁRIO / PROPONENTE', (larg * 3) / 4, y + 4, { align: 'center' });
  doc.text(imovel.proprietario || 'Proponente', (larg * 3) / 4, y + 8, { align: 'center' });
  doc.text(`CPF: ${imovel.cpfProprietario || 'Não informado'}`, (larg * 3) / 4, y + 12, { align: 'center' });

  aplicarPapelTimbrado(doc, esc || undefined);
  return doc;
}

/** Gerador Word (.docx) do Laudo de Aptidão Agrícola */
export async function gerarDocxLaudoAptidao(
  imovel: ImovelData,
  esc: EscritorioData | null,
  tecnico: TecnicoData,
  dados: DadosCredito
): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, AlignmentType } = await import('docx');

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'LAUDO DE APTIDÃO AGRÍCOLA & SOLO', bold: true, size: 28, color: '059669' }),
          ],
        }),
        new Paragraph({ text: '' }),
        new Paragraph({
          children: [
            new TextRun({ text: '1. DADOS DO IMÓVEL AVALIADO', bold: true, size: 22 }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Denominação: ', bold: true }),
            new TextRun({ text: imovel.denominacao || 'Não informada' }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Localização / Município: ', bold: true }),
            new TextRun({ text: `${imovel.municipio || 'Não informada'}-${imovel.uf || ''}` }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Área Total: ', bold: true }),
            new TextRun({ text: `${(imovel.areaHa || 0).toFixed(4)} ha (${((imovel.areaHa || 0) * 10000).toLocaleString('pt-BR')} m²)` }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Matrícula: ', bold: true }),
            new TextRun({ text: imovel.matricula || 'Ausente' }),
          ],
        }),
        new Paragraph({ text: '' }),
        new Paragraph({
          children: [
            new TextRun({ text: '2. CARACTERIZAÇÃO DO SOLO & APTIDÃO AGRÍCOLA', bold: true, size: 22 }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Aptidão / Classe de Solo: ', bold: true }),
            new TextRun({ text: dados.aptidaoSolo || 'Não informada' }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Cultura Principal Recomendada: ', bold: true }),
            new TextRun({ text: dados.culturaPrincipal || 'Não informada' }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Capacidade de Suporte de Pastagens: ', bold: true }),
            new TextRun({ text: dados.capacidadePastagem || 'Não informada' }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Finalidade do Crédito: ', bold: true }),
            new TextRun({ text: dados.finalidadeCredito || 'Custeio / Investimento' }),
          ],
        }),
        new Paragraph({ text: '' }),
        new Paragraph({
          children: [
            new TextRun({ text: '3. DIAGNÓSTICO E CONCLUSÃO TÉCNICA', bold: true, size: 22 }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `O imóvel rural denominado "${imovel.denominacao || 'Sem nome'}" apresenta solo caracterizado como ${dados.aptidaoSolo || 'Classe de Solo não especificada'}, com aptidão agrícola favorável para a cultura de ${dados.culturaPrincipal || 'cultura não definida'}. Os parâmetros técnicos levantados in loco indicam viabilidade para o recebimento do crédito rural pretendido para ${dados.finalidadeCredito || 'operações de custeio/investimento'}, estando o imóvel em conformidade com as exigências técnicas bancárias locais.`
            }),
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
            new TextRun({ text: `${dados.conselhoRt || tecnico.conselho || 'CFTA'}: ${tecnico.cft || ''} / ${dados.tituloProfissionalRt || 'Responsável Técnico'}` }),
          ],
        }),
      ],
    }],
  });

  return await Packer.toBlob(doc);
}

/** Gerador Word (.docx) do Projeto Técnico de Crédito Rural & Carta Consulta */
export async function gerarDocxProjetoCreditoRural(
  imovel: ImovelData,
  esc: EscritorioData | null,
  tecnico: TecnicoData,
  dados: DadosCredito
): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, AlignmentType } = await import('docx');

  const total = (dados.cronogramaEtapas || []).reduce((a, b) => a + (b.valor || 0), 0);

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'PROJETO TÉCNICO DE FINANCIAMENTO RURAL', bold: true, size: 28, color: '059669' }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: `Linha de Crédito: ${dados.linhaCredito || 'PRONAMP / PRONAF'} | Instituição: ${dados.agenteFinanceiro || 'Banco do Brasil'}`, bold: true, size: 20 }),
          ],
        }),
        new Paragraph({ text: '' }),
        new Paragraph({
          children: [
            new TextRun({ text: '1. DADOS DA PROPOSTA & PROPONENTE', bold: true, size: 22 }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Proponente / Beneficiário: ', bold: true }),
            new TextRun({ text: (imovel.proprietario || 'Não informado').toUpperCase() }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'CPF/CNPJ: ', bold: true }),
            new TextRun({ text: imovel.cpfProprietario || '___' }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Propriedade Beneficiada: ', bold: true }),
            new TextRun({ text: `${imovel.denominacao || 'Gleba Rural'} (${(imovel.areaHa || 0).toFixed(4)} ha)` }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Parceiro / Elaborador Técnico: ', bold: true }),
            new TextRun({ text: dados.parceiroCorrespondente || esc?.nome || 'Consultoria Técnica Agrícola' }),
          ],
        }),
        new Paragraph({ text: '' }),
        new Paragraph({
          children: [
            new TextRun({ text: '2. CONDIÇÕES FINANCEIRAS DA OPERAÇÃO', bold: true, size: 22 }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Valor Total Solicitado: ', bold: true }),
            new TextRun({ text: `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Garantia Oferecida: ', bold: true }),
            new TextRun({ text: dados.garantiaProposta || 'Penhor Agrícola / Hipoteca do Imóvel' }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Taxa de Juros Anual: ', bold: true }),
            new TextRun({ text: `${dados.taxaJurosAnual || 7.5}% a.a.` }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Carência Solicitada: ', bold: true }),
            new TextRun({ text: `${dados.carenciaMeses || 12} meses` }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Prazo Total de Pagamento: ', bold: true }),
            new TextRun({ text: `${dados.prazoAnos || 5} anos` }),
          ],
        }),
        new Paragraph({ text: '' }),
        new Paragraph({
          children: [
            new TextRun({ text: '3. JUSTIFICATIVA E IMPACTO PRODUTIVO', bold: true, size: 22 }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `O presente projeto visa a concessão de crédito rural para a finalidade de ${dados.finalidadeCredito || 'modernização das atividades produtivas'}, promovendo o incremento de produtividade da cultura de ${dados.culturaPrincipal || 'produção agrícola'}, a sustentabilidade socioambiental do imóvel e a geração de caixa necessária para o cumprimento integral dos compromissos financeiros.`
            }),
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
            new TextRun({ text: tecnico.nome || 'Responsável Técnico', bold: true }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: `${dados.conselhoRt || tecnico.conselho || 'CFTA'}: ${tecnico.cft || ''} / ${dados.tituloProfissionalRt || 'Técnico em Agropecuária'}` }),
          ],
        }),
      ],
    }],
  });

  return await Packer.toBlob(doc);
}

/** Gerador Word (.docx) do Cronograma Físico-Financeiro */
export async function gerarDocxCronogramaFinanceiro(
  imovel: ImovelData,
  esc: EscritorioData | null,
  tecnico: TecnicoData,
  dados: DadosCredito
): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType } = await import('docx');

  const etapas = dados.cronogramaEtapas || [];
  let total = 0;

  const rows = etapas.map((et, index) => {
    total += Number(et.valor) || 0;
    return new TableRow({
      children: [
        new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, children: [new Paragraph({ text: `#${index + 1}` })] }),
        new TableCell({ width: { size: 55, type: WidthType.PERCENTAGE }, children: [new Paragraph({ text: et.etapa || 'Sem descrição' })] }),
        new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, children: [new Paragraph({ text: `Mês ${et.mes}` })] }),
        new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, children: [new Paragraph({ text: `R$ ${(et.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` })] }),
      ],
    });
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'CRONOGRAMA FÍSICO-FINANCEIRO DE CRÉDITO RURAL', bold: true, size: 26, color: '059669' }),
          ],
        }),
        new Paragraph({ text: '' }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Imóvel: ', bold: true }),
            new TextRun({ text: imovel.denominacao || 'Não informado' }),
            new TextRun({ text: ' | Proponente: ', bold: true }),
            new TextRun({ text: imovel.proprietario || 'Não informado' }),
          ],
        }),
        new Paragraph({ text: '' }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: 'Item', bold: true })] })] }),
                new TableCell({ width: { size: 55, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: 'Etapa / Investimento', bold: true })] })] }),
                new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: 'Período', bold: true })] })] }),
                new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: 'Valor Orçado', bold: true })] })] }),
              ],
            }),
            ...rows,
            new TableRow({
              children: [
                new TableCell({ width: { size: 80, type: WidthType.PERCENTAGE }, columnSpan: 3, children: [new Paragraph({ children: [new TextRun({ text: 'VALOR TOTAL DO CRONOGRAMA', bold: true })] })] }),
                new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, bold: true, color: '059669' })] })] }),
              ],
            }),
          ],
        }),
        new Paragraph({ text: '' }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'Declaramos que os recursos orçados no cronograma físico-financeiro acima serão aplicados rigorosamente nas etapas de desenvolvimento técnico e produção constantes deste plano, sob responsabilidade do proponente e fiscalização técnica.'
            }),
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
            new TextRun({ text: tecnico.nome || 'Responsável Técnico', bold: true }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: `${dados.conselhoRt || tecnico.conselho || 'CFTA'}: ${tecnico.cft || ''} / ${dados.tituloProfissionalRt || 'Técnico em Agropecuária'}` }),
          ],
        }),
      ],
    }],
  });

  return await Packer.toBlob(doc);
}
