import { jsPDF } from 'jspdf';
import { ImovelData, EscritorioData, TecnicoData } from '../topo/types';
import { aplicarPapelTimbrado, cabecalhoEscritorio, statusFicticio } from './financeiro';

export interface DadosJuridico {
  foroComarca: string;
  advogadoNome: string;
  advogadoOab: string;
  qualificacaoFatos: string;
  direitoFundamento: string;
  confrontanteNome?: string;
  confrontanteQualificacao?: string;
}

export function gerarPdfPeticaoUsucapiao(
  imovel: ImovelData,
  esc: EscritorioData | null,
  tecnico: TecnicoData,
  dados: DadosJuridico
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const larg = doc.internal.pageSize.getWidth();
  const alt = doc.internal.pageSize.getHeight();
  const margem = 20;
  const largUtil = larg - 2 * margem;

  let y = cabecalhoEscritorio(doc, esc, margem, larg);
  y = statusFicticio(doc, imovel, larg, y);

  // Qualificação do Advogado / Foro
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`AO JUÍZO DA VARA CÍVEL DA COMARCA DE ${dados.foroComarca?.toUpperCase() || '___-___'}`, margem, y);
  y += 12;

  // Título da petição
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('AÇÃO DE USUCAPIÃO EXTRAORDINÁRIA', larg / 2, y, { align: 'center' });
  y += 8;

  // Fatos
  doc.setFontSize(10);
  doc.text('I. DOS FATOS E DO IMÓVEL', margem, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const proprietario = imovel.proprietario || '___';
  const cpf = imovel.cpfProprietario || '___';
  const denom = imovel.denominacao || '___';
  const municipio = imovel.municipio || '___';

  const fatosTexto = dados.qualificacaoFatos || `O(A) Requerente ${proprietario.toUpperCase()}, inscrito sob o CPF ${cpf}, exerce posse mansa, pacífica, contínua e com animus domini, há mais de 15 anos, sobre o imóvel denominado "${denom}", situado no município de ${municipio}. O imóvel possui levantamento topográfico e memorial descritivo assinado pelo responsável técnico ${tecnico.nome || '___'}, com área total georreferenciada de ${imovel.areaHa ? imovel.areaHa.toFixed(4) : '0.0000'} ha. Os confrontantes foram identificados e não apresentam contestação à referida delimitação perimétrica.`;

  const splitFatos = doc.splitTextToSize(fatosTexto, largUtil);
  doc.text(splitFatos, margem, y);
  y += splitFatos.length * 4.5 + 8;

  // Direito
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('II. DO DIREITO', margem, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const direitoTexto = dados.direitoFundamento || `A pretensão do Requerente encontra amparo legal no artigo 1.238 do Código Civil Brasileiro, que estabelece a aquisição da propriedade imóvel por aquele que exercer posse mansa e pacífica pelo prazo de 15 anos, independentemente de justo título e boa-fé. Resta preenchido todo o arcabouço probatório-técnico com as peças geodésicas anexas.`;
  
  const splitDireito = doc.splitTextToSize(direitoTexto, largUtil);
  doc.text(splitDireito, margem, y);
  y += splitDireito.length * 4.5 + 8;

  // Pedidos
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('III. DOS PEDIDOS', margem, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const pedidos = [
    '1. A citação dos confrontantes nos termos do Código de Processo Civil;',
    '2. A intimação dos representantes da Fazenda Pública da União, Estado e Município;',
    '3. A procedência do pedido para declarar o domínio do Requerente sobre o imóvel descrito, servindo a sentença para abertura de matrícula no Cartório de Registro de Imóveis competente.'
  ];

  pedidos.forEach(p => {
    doc.text(p, margem + 3, y);
    y += 5;
  });
  y += 10;

  // Fechamento
  doc.text('Dá-se à causa o valor do imóvel cadastrado.', margem, y);
  y += 12;
  doc.text('Pede Deferimento.', margem, y);
  y += 15;

  doc.setFont('helvetica', 'bold');
  doc.text(dados.advogadoNome || 'Nome do Advogado', larg / 2, y, { align: 'center' });
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.text(`OAB/${dados.advogadoOab || '___-___'}`, larg / 2, y, { align: 'center' });

  return doc;
}

export function gerarPdfNotificacaoExtrajudicial(
  imovel: ImovelData,
  esc: EscritorioData | null,
  tecnico: TecnicoData,
  dados: DadosJuridico
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
  doc.setTextColor(220, 38, 38); // Vermelho executivo
  doc.text('NOTIFICAÇÃO EXTRAJUDICIAL DE ANUÊNCIA DE DIVISA', larg / 2, y, { align: 'center' });
  
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(0.5);
  doc.line(margem, y + 2, larg - margem, y + 2);
  y += 10;

  // Notificado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`NOTIFICADO(A): ${dados.confrontanteNome?.toUpperCase() || '___'}`, margem, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`Endereço/Qualificação: ${dados.confrontanteQualificacao || 'Confrontante do imóvel de posse'}`, margem, y);
  y += 10;

  // Corpo da Notificação
  doc.setFontSize(10);
  const proprietario = imovel.proprietario || '___';
  const texto = `Prezado(a) Senhor(a),\n\nNa qualidade de proprietário/possuidor confrontante da área rural/urbana denominada "${imovel.denominacao || '___'}", de posse de ${proprietario.toUpperCase()}, servimo-nos da presente para NOTIFICÁ-LO(A) a comparecer ou manifestar-se no prazo de 15 (quinze) dias sobre os limites e confrontações levantados por agrimensura profissional.\n\nA ausência de manifestação ou a concordância expressa ensejará a presunção de aceitação da divisa demarcada por cerca/muro consolidado, nos termos da Lei de Registros Públicos. As peças técnicas (Planta e Memorial) encontram-se disponíveis para assinatura e conferência técnica.\n\nContamos com sua colaboração para a regularização imobiliária pacífica das divisas.`;

  const splitTexto = doc.splitTextToSize(texto, largUtil);
  doc.text(splitTexto, margem, y);
  y += splitTexto.length * 5 + 25;

  doc.text('Assinatura do Notificante / Advogado:', margem, y);
  y += 20;

  doc.line(margem, y, margem + 80, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(dados.advogadoNome || proprietario, margem, y);

  return doc;
}

/** Gerador de Parecer Técnico-Jurídico em Word (.docx) */
export async function gerarDocxParecerJuridico(
  imovel: ImovelData,
  esc: EscritorioData | null,
  tecnico: TecnicoData,
  dados: DadosJuridico
): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, AlignmentType } = await import('docx');
  const proprietario = (imovel.proprietario || 'Requerente').toUpperCase();

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'PARECER TÉCNICO-JURÍDICO DE REGULARIZAÇÃO IMOBILIÁRIA', bold: true, size: 26, color: '1E293B' }),
          ],
        }),
        new Paragraph({ text: '' }),
        new Paragraph({
          children: [
            new TextRun({ text: 'FORO / COMARCA DE COMPETÊNCIA: ', bold: true }),
            new TextRun({ text: dados.foroComarca?.toUpperCase() || 'NÃO ESPECIFICADO' }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'INTERESSADO / REQUERENTE: ', bold: true }),
            new TextRun({ text: `${proprietario} (CPF: ${imovel.cpfProprietario || '___'})` }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'IMÓVEL OBJETO DA ANÁLISE: ', bold: true }),
            new TextRun({ text: `${imovel.denominacao || 'Área sem denominação'} (${imovel.areaHa ? imovel.areaHa.toFixed(4) : '0.0000'} ha)` }),
          ],
        }),
        new Paragraph({ text: '' }),
        new Paragraph({
          children: [
            new TextRun({ text: 'I. DOS FATOS E SITUAÇÃO DE POSSE', bold: true, size: 22 }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: dados.qualificacaoFatos || `O Requerente ${proprietario} possui a posse mansa, pacífica, contínua e ininterrupta do imóvel rural/urbano denominado "${imovel.denominacao || 'Área de Posse'}", situado no município de ${imovel.municipio || 'Não cadastrado'}-${imovel.uf || ''}, respaldado por levantamento geodésico georreferenciado executado pelo profissional ${tecnico.nome || 'Responsável Técnico'}.`
            }),
          ],
        }),
        new Paragraph({ text: '' }),
        new Paragraph({
          children: [
            new TextRun({ text: 'II. FUNDAMENTAÇÃO JURÍDICA & ANÁLISE CARTORÁRIA', bold: true, size: 22 }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: dados.direitoFundamento || `A situação enquadra-se nos ditames do Artigo 1.238 e seguintes do Código Civil Brasileiro e no Artigo 216-A da Lei de Registros Públicos (Lei nº 6.015/1973), apresentando viabilidade para regularização via procedimento extrajudicial diretamente perante o Cartório de Registro de Imóveis competente.`
            }),
          ],
        }),
        new Paragraph({ text: '' }),
        new Paragraph({
          children: [
            new TextRun({ text: 'III. CONCLUSÃO E ADVERTÊNCIAS TÉCNICAS', bold: true, size: 22 }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'Aconselha-se o prosseguimento com a notificação extrajudicial ou coleta de anuências diretas dos confrontantes limítrofes cadastrados, instruindo o requerimento com planta, memorial descritivo assinado e ART/TRT devidamente quitada.'
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
            new TextRun({ text: dados.advogadoNome || 'Nome do Advogado / Consultor Jurídico', bold: true }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: `OAB/${dados.advogadoOab || '___-___'} / Consultor Imobiliário` }),
          ],
        }),
      ],
    }],
  });

  return await Packer.toBlob(doc);
}
