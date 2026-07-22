import { Document, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx';
import { ImovelData, Gleba, TecnicoData } from '../topo/types';

export function gerarContratoLoteDocx(
  imovel: ImovelData,
  lote: Gleba,
  tecnico: TecnicoData
): Document {
  // Dados Comprador
  const compradorNome = (lote.compradorNome || '___').toUpperCase();
  const compradorCpf = lote.compradorCpf || '___';
  const compradorRg = lote.compradorRg || '___';
  const compradorEstadoCivil = lote.compradorEstadoCivil || '___';
  const compradorProfissao = lote.compradorProfissao || '___';
  const compradorEndereco = lote.compradorEndereco || '___';

  // Dados Vendedor (Proprietário do Imóvel Principal)
  const vendedorNome = (imovel.proprietario || '___').toUpperCase();
  const vendedorCpf = imovel.cpfProprietario || '___';
  const vendedorEstadoCivil = imovel.proprietarioEstadoCivil || '___';
  const vendedorProfissao = imovel.proprietarioProfissao || '___';
  const vendedorEndereco = imovel.proprietarioEndereco || '___';

  const temProf = (p?: string) => !!(p && p.trim() && p !== '___' && p !== '—' && p !== 'DADO AUSENTE');
  const profVendedorText = temProf(vendedorProfissao) ? `, profissão ${vendedorProfissao}` : '';
  const profCompradorText = temProf(compradorProfissao) ? `, profissão ${compradorProfissao}` : '';

  // Dados Lote
  const loteDenom = lote.denominacao || '___';
  
  // Calcular área planar da gleba
  const pts = lote.vertices || [];
  let areaM2 = 0;
  if (pts.length > 2) {
    let soma = 0;
    for (let i = 0; i < pts.length; i++) {
      const curr = pts[i];
      const next = pts[(i + 1) % pts.length];
      soma += (curr.leste * next.norte - next.leste * curr.norte);
    }
    areaM2 = Math.abs(soma / 2);
  }
  const areaTexto = areaM2 > 0 ? `${areaM2.toFixed(2)} m²` : '___ m²';

  // Preço e Financiamento
  const preco = lote.precoVenda || 0;
  const sinal = lote.sinalEntrada || 0;
  const parcelasQtd = lote.parcelasQtd || 1;
  const juros = lote.jurosMensais || 0;
  const sistema = lote.sistemaAmortizacao || 'price';

  const saldoFinanciar = Math.max(0, preco - sinal);
  let textoPagamento = '';

  if (saldoFinanciar === 0) {
    textoPagamento = `integralmente à vista, pelo valor total de R$ ${preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`;
  } else {
    // Calcular parcelas
    let valorParcelaTexto = '';
    if (juros === 0) {
      const valorP = saldoFinanciar / parcelasQtd;
      valorParcelaTexto = `${parcelasQtd} parcelas mensais e consecutivas de R$ ${valorP.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} sem juros`;
    } else {
      const taxa = juros / 100;
      if (sistema === 'price') {
        // Tabela Price: PMT = PV * (i * (1+i)^n) / ((1+i)^n - 1)
        const pmt = saldoFinanciar * (taxa * Math.pow(1 + taxa, parcelasQtd)) / (Math.pow(1 + taxa, parcelasQtd) - 1);
        valorParcelaTexto = `${parcelasQtd} parcelas mensais e consecutivas de R$ ${pmt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (Tabela Price, taxa de ${juros}% a.m.)`;
      } else {
        // SAC: Amortização constante, parcelas decrescentes
        const amort = saldoFinanciar / parcelasQtd;
        const pmt1 = amort + (saldoFinanciar * taxa);
        const pmtLast = amort + (amort * taxa);
        valorParcelaTexto = `${parcelasQtd} parcelas mensais decrescentes, sendo a primeira de R$ ${pmt1.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} e a última de R$ ${pmtLast.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (Sistema SAC, taxa de ${juros}% a.m.)`;
      }
    }

    textoPagamento = `com sinal/entrada de R$ ${sinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} e o saldo remanescente de R$ ${saldoFinanciar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} financiado em ${valorParcelaTexto}.`;
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: 'INSTRUMENTO PARTICULAR DE PROMESSA DE COMPRA E VENDA DE LOTE',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({ text: 'VENDEDOR(A): ', bold: true }),
              new TextRun({ text: `${vendedorNome}, inscrito sob o CPF nº ${vendedorCpf}, estado civil ${vendedorEstadoCivil}${profVendedorText}, residente e domiciliado em ${vendedorEndereco}.` })
            ]
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({ text: 'COMPRADOR(A): ', bold: true }),
              new TextRun({ text: `${compradorNome}, inscrito sob o CPF nº ${compradorCpf}, RG nº ${compradorRg}, estado civil ${compradorEstadoCivil}${profCompradorText}, residente e domiciliado em ${compradorEndereco}.` })
            ]
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({ text: 'CLÁUSULA PRIMEIRA - DO OBJETO: ', bold: true }),
              new TextRun({ text: `O objeto do presente contrato é o lote denominado "${loteDenom}", com área total de ${areaTexto}, resultante do projeto de desmembramento do imóvel rural/urbano denominado "${imovel.denominacao || '___'}", situado no município de ${imovel.municipio || '___'}, devidamente desenhado e levantado pelo responsável técnico ${tecnico.nome || '___'}, registrado sob o conselho ${tecnico.conselho || '___'} nº ${tecnico.cft || '___'}.` })
            ]
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({ text: 'CLÁUSULA SEGUNDA - DO PREÇO E CONDIÇÕES DE PAGAMENTO: ', bold: true }),
              new TextRun({ text: `Pela compra e venda do lote descrito na cláusula anterior, as partes ajustam o preço certo e avençado de R$ ${preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, a ser pago pelo COMPRADOR da seguinte forma: ${textoPagamento}` })
            ]
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({ text: 'CLÁUSULA TERCEIRA - DA IMISSÃO NA POSSE: ', bold: true }),
              new TextRun({ text: 'O COMPRADOR será imitido na posse precária do imóvel a partir da assinatura do presente instrumento, assumindo todos os tributos, taxas e obrigações reais que incidirem sobre o referido lote a partir desta data.' })
            ]
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({ text: 'CLÁUSULA QUARTA - DA OUTORGA DA ESCRITURA: ', bold: true }),
              new TextRun({ text: 'A escritura pública de compra e venda definitiva será outorgada ao COMPRADOR após a quitação integral do preço ajustado neste instrumento e a devida aprovação técnica do desmembramento perante os órgãos municipais e cartório de registro.' })
            ]
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            text: 'E, por estarem assim justos e contratados, assinam o presente em 2 (duas) vias de igual teor e forma na presença de duas testemunhas.',
            alignment: AlignmentType.JUSTIFIED
          }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: '' }),
          new Paragraph({
            text: 'Local e Data: ________________________, ____ de ______________ de 2026.',
            alignment: AlignmentType.RIGHT
          }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: '' }),
          new Paragraph({
            text: '_____________________________________                  _____________________________________',
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({
            text: 'VENDEDOR(A)                                                 COMPRADOR(A)',
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: '' }),
          new Paragraph({
            text: 'Testemunha 1: ________________________                  Testemunha 2: ________________________',
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({
            text: 'CPF:                                                                     CPF:',
            alignment: AlignmentType.CENTER
          })
        ]
      }
    ]
  });

  return doc;
}
