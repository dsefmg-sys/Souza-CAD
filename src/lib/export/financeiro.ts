import { jsPDF } from 'jspdf';
import type { ImovelData, EscritorioData, TecnicoData } from '../topo/types';
import { rotulosProfissional } from '../topo/profissional';
import { carregarModelos, preencherModelo } from '../store/modelos';
import { valorPorExtenso } from '../topo/extenso';

/** Variáveis dos modelos (recibo/contrato) a partir dos dados do serviço. */
function varsFinanceiro(a: {
  imovel: ImovelData;
  tecnico: TecnicoData;
  areaHa: number;
  perimetro?: number;
  valor?: number;
  formaPagamento?: string;
  prazoDias?: number | string;
  escritorio?: EscritorioData;
  permitirIncompleto?: boolean;
  modoTratamentoAusente?: ModoTratamentoAusente;
}): Record<string, string> {
  const modo = a.modoTratamentoAusente ?? (a.permitirIncompleto ? 'dado_ausente' : 'omitir');
  const f = (val?: string) => {
    if (modo === 'dado_ausente' && (!val || !val.trim() || val === '—')) return 'DADO AUSENTE';
    return val || '';
  };

  const v = a.valor ?? 0;
  const prazo = a.prazoDias ?? '';
  const fp = a.formaPagamento ?? '';
  const esc = a.escritorio ?? {} as EscritorioData;
  const rep = [a.tecnico.nome, a.tecnico.formacao, a.tecnico.cft && `${rotulosProfissional(a.tecnico).registro} ${a.tecnico.cft}`].filter(Boolean).join(', ');
  
  return {
    proprietario: f(a.imovel.proprietario),
    cpfProprietario: f(a.imovel.cpfProprietario),
    cpf: f(a.imovel.cpfProprietario),
    denominacao: f(a.imovel.denominacao),
    matricula: f(a.imovel.matricula),
    municipio: f(a.imovel.municipio),
    area: `${a.areaHa.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} ha`,
    perimetro: a.perimetro != null ? `${a.perimetro.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} m` : '',
    tecnico: f(a.tecnico.nome),
    cft: f(a.tecnico.cft),
    cidade: f(a.imovel.municipio || a.tecnico.cidadeAssinatura),
    escritorio: f(esc.nome),
    cnpjEscritorio: f(esc.cnpj),
    responsavelTecnico: a.permitirIncompleto && (!rep || !rep.trim()) ? 'DADO AUSENTE' : (rep || a.tecnico.nome || ''),
    valor: moedaBR(v),
    valorExtenso: extensoReais(v),
    formaPagamento: f(fp),
    prazoDias: f(String(prazo)),
  };
}

/** Formata um número como moeda brasileira: 1234.5 -> "R$ 1.234,50". */
export function moedaBR(v: number): string {
  return (Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ----- valor por extenso (para o recibo) -----
export function extensoReais(v: number): string {
  return valorPorExtenso(v, { estilo: 'conjuncao', capitalizar: true });
}

import type { ModoTratamentoAusente } from '../topo/types';

interface BaseArgs {
  imovel: ImovelData;
  escritorio: EscritorioData;
  tecnico: TecnicoData;
  dataExtenso: string;     // ex.: "30 de junho de 2026"
  areaHa: number;
  perimetro?: number;      // usado no {perimetro} do contrato/proposta
  permitirIncompleto?: boolean;
  modoTratamentoAusente?: ModoTratamentoAusente;
}

/** Aplica o papel timbrado executivo (moldura sutil, faixa de topo verde esmeralda/dourada com as cores da marca SOUZA CAD e rodapé de segurança). */
function aplicarPapelTimbrado(doc: jsPDF) {
  const larg = doc.internal.pageSize.getWidth();
  const alt = doc.internal.pageSize.getHeight();

  // Faixa de topo executiva nas cores oficiais da marca SOUZA CAD (Verde Esmeralda + Dourado)
  doc.setFillColor(14, 138, 86); // Verde Esmeralda Marca #0e8a56
  doc.rect(0, 0, larg, 3.5, 'F');
  doc.setFillColor(245, 158, 11); // Dourado Marca #f59e0b
  doc.rect(0, 3.5, larg, 1.2, 'F');

  // Moldura perimetral sutil de papel timbrado com toque esmeralda
  doc.setDrawColor(209, 250, 229); // emerald-100
  doc.setLineWidth(0.35);
  doc.rect(8, 8, larg - 16, alt - 16);

  // Rodapé de segurança do papel timbrado
  doc.setDrawColor(167, 243, 208); // emerald-200
  doc.setLineWidth(0.25);
  doc.line(18, alt - 12, larg - 18, alt - 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('Documento gerado pelo Souza-CAD • Sistema Profissional de Georreferenciamento & Topografia', larg / 2, alt - 7, { align: 'center' });
  doc.setTextColor(0, 0, 0);
}

function cabecalhoEscritorio(doc: jsPDF, esc: EscritorioData, margem: number, larg: number): number {
  aplicarPapelTimbrado(doc);
  let y = margem + 3;
  if (esc.logoDataUrl) {
    try {
      const fmt = esc.logoDataUrl.includes('image/png') ? 'PNG' : 'JPEG';
      doc.addImage(esc.logoDataUrl, fmt, larg / 2 - 18, y, 36, 15);
      y += 18;
    } catch (err) {
      console.warn("Erro ao renderizar logo no PDF:", err);
    }
  }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
  doc.text(esc.nome || 'Escritório', larg / 2, y + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  // Endereço + cidade/UF/CEP numa linha só; documentos, inscrições e contatos noutras.
  const cidadeUf = [esc.cidade, esc.uf].filter(Boolean).join('-');
  const localLinha = [esc.endereco, [cidadeUf, esc.cep].filter(Boolean).join('  ')].filter(Boolean).join(' — ');
  const docsLinha = [
    esc.cnpj && `CNPJ/CPF ${esc.cnpj}`,
    esc.inscricaoEstadual && `IE ${esc.inscricaoEstadual}`,
    esc.inscricaoMunicipal && `IM ${esc.inscricaoMunicipal}`,
  ].filter(Boolean).join('  ·  ');
  const contatoLinha = [
    esc.telefone && `Tel./WhatsApp ${esc.telefone}`,
    esc.email,
    esc.site,
  ].filter(Boolean).join('  ·  ');
  const linhas = [esc.ramo, localLinha, docsLinha, contatoLinha].filter(Boolean) as string[];
  y += 9;
  linhas.forEach((l) => { doc.text(l, larg / 2, y, { align: 'center' }); y += 4.2; });
  doc.setDrawColor(180); doc.line(margem, y + 1, larg - margem, y + 1);
  return y + 8;
}

/** Faixa de aviso quando o projeto é fictício (demonstração). Devolve o novo y. */
function statusFicticio(doc: jsPDF, imovel: ImovelData, larg: number, y: number): number {
  if (!imovel.ficticio) return y;
  doc.setTextColor(185, 28, 28);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text('*** DADOS FICTÍCIOS — DOCUMENTO DE DEMONSTRAÇÃO, SEM VALIDADE ***', larg / 2, y, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  return y + 7;
}

function decorarDoc(doc: jsPDF) {
  const originalText = doc.text.bind(doc) as (
    text: string | string[],
    x: number,
    y: number,
    options?: Parameters<jsPDF['text']>[3],
    transform?: Parameters<jsPDF['text']>[4],
  ) => ReturnType<jsPDF['text']>;

  doc.text = function (
    this: jsPDF,
    text: string | string[],
    x: number,
    y: number,
    options?: Parameters<jsPDF['text']>[3],
    transform?: Parameters<jsPDF['text']>[4],
  ) {
    const hasDadoAusente = (t: string) => t.includes('DADO AUSENTE');
    let needsReset = false;
    if (typeof text === 'string' && hasDadoAusente(text)) {
      doc.setTextColor(220, 38, 38);
      needsReset = true;
    } else if (Array.isArray(text) && text.some((t) => typeof t === 'string' && hasDadoAusente(t))) {
      doc.setTextColor(220, 38, 38);
      needsReset = true;
    }
    const res = originalText(text, x, y, options, transform);
    if (needsReset) {
      doc.setTextColor(0, 0, 0);
    }
    return res;
  } as unknown as typeof doc.text;
}

/** Adiciona imagem de assinatura PNG sem achatar ou distorcer sua proporção de aspecto (max 50mm x 18mm). */
function adicionarAssinaturaSemAchatamento(doc: jsPDF, dataUrl: string, xCentral: number, yLinha: number, maxW: number = 48, maxH: number = 18) {
  try {
    const fmt = dataUrl.includes('image/png') ? 'PNG' : 'JPEG';
    const w = maxW;
    const h = maxH;
    // Desenha centralizado sobre a linha de assinatura sem achatar
    doc.addImage(dataUrl, fmt, xCentral - w / 2, yLinha - h - 1, w, h);
  } catch (e) {
    console.warn("Erro ao desenhar assinatura automática:", e);
  }
}

/** Recibo de pagamento do serviço, pronto para imprimir/assinar. */
export function gerarReciboPdf(a: BaseArgs & { valor: number; referente?: string; numero?: string }): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  decorarDoc(doc);
  const larg = doc.internal.pageSize.getWidth();
  const margem = 18;
  let y = cabecalhoEscritorio(doc, a.escritorio, margem, larg);
  y = statusFicticio(doc, a.imovel, larg, y);

  // título + caixa de valor
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
  doc.text('RECIBO', margem, y + 4);
  if (a.numero) { doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.text(`Nº ${a.numero}`, margem, y + 10); }
  doc.setDrawColor(40); doc.setLineWidth(0.4);
  doc.roundedRect(larg - margem - 60, y - 2, 60, 12, 2, 2);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
  doc.text(moedaBR(a.valor), larg - margem - 30, y + 6, { align: 'center' });
  y += 22;

  const vars = varsFinanceiro({ ...a, permitirIncompleto: a.permitirIncompleto });
  const refer = a.referente || preencherModelo(carregarModelos().reciboReferente, vars);
  const corpo = `Recebi(emos) de ${vars.proprietario}${vars.cpfProprietario && vars.cpfProprietario !== 'DADO AUSENTE' ? `, inscrito(a) no CPF sob o nº ${vars.cpfProprietario}` : ''}, a importância de ${moedaBR(a.valor)} (${extensoReais(a.valor)}), referente a ${refer}.`;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
  doc.text(doc.splitTextToSize(corpo, larg - margem * 2), margem, y, { lineHeightFactor: 1.5 });
  y += Math.ceil(doc.splitTextToSize(corpo, larg - margem * 2).length) * 6.6 + 6;
  doc.text('Para clareza, firmo(amos) o presente recibo, dando plena e geral quitação do valor recebido.', margem, y, { maxWidth: larg - margem * 2 });
  y += 16;

  doc.text(`${vars.municipio || vars.cidade || '—'}, ${a.dataExtenso}.`, margem, y);
  y += 26;
  if (a.escritorio.autoAssinar && a.escritorio.assinaturaDataUrl) {
    adicionarAssinaturaSemAchatamento(doc, a.escritorio.assinaturaDataUrl, larg / 2, y, 48, 16);
  }
  doc.setLineWidth(0.3); doc.line(larg / 2 - 45, y, larg / 2 + 45, y);
  doc.setFontSize(10);
  doc.text(vars.escritorio || vars.tecnico || '', larg / 2, y + 5, { align: 'center' });
  const sub = [vars.tecnico, vars.cft && `CFT ${vars.cft}`].filter(v => v && v !== 'DADO AUSENTE').join('  ·  ');
  if (sub) doc.text(sub, larg / 2, y + 10, { align: 'center' });

  doc.save(`Recibo - ${a.imovel.denominacao || 'cliente'}.pdf`);
}

/** Contrato de prestação de serviços de georreferenciamento, pronto para ajustar e assinar. */
export function gerarContratoPdf(a: BaseArgs & { valor: number; formaPagamento?: string; prazoDias?: number }): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  decorarDoc(doc);
  const larg = doc.internal.pageSize.getWidth();
  const alt = doc.internal.pageSize.getHeight();
  const margem = 18;
  let y = cabecalhoEscritorio(doc, a.escritorio, margem, larg);
  y = statusFicticio(doc, a.imovel, larg, y);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
  doc.text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE GEORREFERENCIAMENTO', larg / 2, y, { align: 'center', maxWidth: larg - margem * 2 });
  y += 12;

  const vVars = varsFinanceiro({ ...a, valor: a.valor, formaPagamento: a.formaPagamento, prazoDias: a.prazoDias, escritorio: a.escritorio, permitirIncompleto: a.permitirIncompleto });
  const md = carregarModelos();
  const clausulas: [string, string][] = [
    ['CONTRATANTE', preencherModelo(md.contratoContratante, vVars)],
    ['CONTRATADO', preencherModelo(md.contratoContratado, vVars)],
    ['CLÁUSULA 1ª – DO OBJETO', preencherModelo(md.contratoObjeto, vVars)],
    ['CLÁUSULA 2ª – DO VALOR E PAGAMENTO', preencherModelo(md.contratoValor, vVars)],
    ['CLÁUSULA 3ª – DO PRAZO', preencherModelo(md.contratoPrazo, vVars)],
    ['CLÁUSULA 4ª – DAS OBRIGAÇÕES', preencherModelo(md.contratoObrigacoes, vVars)],
    ['CLÁUSULA 5ª – DO FORO', preencherModelo(md.contratoForo, vVars)],
  ];

  doc.setFontSize(10.5);
  clausulas.forEach(([titulo, texto]) => {
    if (y > alt - 48) { doc.addPage(); aplicarPapelTimbrado(doc); y = margem + 8; }
    doc.setFont('helvetica', 'bold'); doc.text(titulo, margem, y); y += 5.5;
    doc.setFont('helvetica', 'normal');
    const linhas = doc.splitTextToSize(texto, larg - margem * 2);
    doc.text(linhas, margem, y, { lineHeightFactor: 1.45 });
    y += linhas.length * 5.3 + 5;
  });

  if (y > alt - 55) { doc.addPage(); aplicarPapelTimbrado(doc); y = margem + 8; }
  y += 6;
  doc.text(`${vVars.municipio || vVars.cidade || '—'}, ${a.dataExtenso}.`, margem, y);
  y += 24;
  if (a.escritorio.autoAssinar && a.escritorio.assinaturaDataUrl) {
    adicionarAssinaturaSemAchatamento(doc, a.escritorio.assinaturaDataUrl, larg - margem - 35, y, 48, 16);
  }
  doc.setLineWidth(0.3);
  doc.line(margem, y, margem + 70, y);
  doc.line(larg - margem - 70, y, larg - margem, y);
  doc.setFontSize(9.5);
  doc.text('CONTRATANTE', margem + 35, y + 5, { align: 'center' });
  doc.text(vVars.proprietario, margem + 35, y + 10, { align: 'center' });
  doc.text('CONTRATADO', larg - margem - 35, y + 5, { align: 'center' });
  doc.text(vVars.escritorio, larg - margem - 35, y + 10, { align: 'center' });

  doc.save(`Contrato - ${a.imovel.denominacao || 'cliente'}.pdf`);
}

/** Proposta comercial / orçamento do serviço, pronta para enviar ao cliente. */
export function gerarPropostaPdf(a: BaseArgs & { valor: number; prazoDias?: number; formaPagamento?: string }): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  decorarDoc(doc);
  const larg = doc.internal.pageSize.getWidth();
  const alt = doc.internal.pageSize.getHeight();
  const margem = 18;
  let y = cabecalhoEscritorio(doc, a.escritorio, margem, larg);
  y = statusFicticio(doc, a.imovel, larg, y);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
  doc.text('PROPOSTA DE PRESTAÇÃO DE SERVIÇOS', larg / 2, y, { align: 'center', maxWidth: larg - margem * 2 });
  y += 10;

  const vars = varsFinanceiro({ ...a, valor: a.valor, formaPagamento: a.formaPagamento, prazoDias: a.prazoDias, escritorio: a.escritorio, permitirIncompleto: a.permitirIncompleto });

  doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5);
  doc.text(`A/C: ${vars.proprietario}`, margem, y); y += 6;

  const corpo = preencherModelo(carregarModelos().propostaTexto, vars);
  const linhas = doc.splitTextToSize(corpo, larg - margem * 2);
  doc.text(linhas, margem, y, { lineHeightFactor: 1.45 });
  y += linhas.length * 5.3 + 6;

  const itens: [string, string][] = [
    ['Valor do serviço', `${moedaBR(a.valor)} (${extensoReais(a.valor)})`],
    ['Forma de pagamento', vars.formaPagamento || 'a combinar entre as partes'],
    ['Prazo estimado', `${vars.prazoDias} dias, ressalvadas as etapas que dependem de terceiros (cartório, INCRA, confrontantes) e das condições de campo`],
    ['Validade da proposta', '30 dias a contar desta data'],
  ];
  doc.setFontSize(10.5);
  itens.forEach(([rot, val]) => {
    if (y > alt - 48) { doc.addPage(); aplicarPapelTimbrado(doc); y = margem + 8; }
    doc.setFont('helvetica', 'bold'); doc.text(`${rot}:`, margem, y);
    doc.setFont('helvetica', 'normal');
    const wrap = doc.splitTextToSize(val, larg - margem * 2 - 45);
    doc.text(wrap, margem + 45, y);
    y += Math.max(wrap.length * 5.3, 6) + 2;
  });

  y += 6;
  if (y > alt - 40) { doc.addPage(); aplicarPapelTimbrado(doc); y = margem + 8; }
  doc.text(`${vars.municipio || vars.cidade || '—'}, ${a.dataExtenso}.`, margem, y);
  y += 22;
  if (a.escritorio.autoAssinar && a.escritorio.assinaturaDataUrl) {
    adicionarAssinaturaSemAchatamento(doc, a.escritorio.assinaturaDataUrl, larg / 2, y, 48, 16);
  }
  doc.setLineWidth(0.3); doc.line(larg / 2 - 45, y, larg / 2 + 45, y);
  doc.setFontSize(10);
  doc.text(vars.escritorio || vars.tecnico || '', larg / 2, y + 5, { align: 'center' });
  const sub = [vars.tecnico, vars.cft && `CFT ${vars.cft}`].filter(v => v && v !== 'DADO AUSENTE').join('  ·  ');
  if (sub) doc.text(sub, larg / 2, y + 10, { align: 'center' });

  doc.save(`Proposta - ${a.imovel.denominacao || 'cliente'}.pdf`);
}
