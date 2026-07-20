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

function hexParaRgb(hex?: string): { r: number; g: number; b: number } {
  if (!hex || typeof hex !== 'string') return { r: 14, g: 138, b: 86 }; // Verde Esmeralda Marca #0e8a56
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return { r, g, b };
  } else if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return { r, g, b };
  }
  return { r: 14, g: 138, b: 86 };
}

function obterDimensoesBase64(dataUrl: string): { w: number; h: number } | null {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  try {
    const base64Str = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    const binary = atob(base64Str);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);

    // PNG signature (0x89 0x50 0x4E 0x47)
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      const view = new DataView(bytes.buffer);
      const w = view.getUint32(16, false);
      const h = view.getUint32(20, false);
      if (w > 0 && h > 0) return { w, h };
    }

    // JPEG signature (0xFF 0xD8)
    if (bytes[0] === 0xff && bytes[1] === 0xd8) {
      let offset = 2;
      while (offset < len - 8) {
        if (bytes[offset] !== 0xff) break;
        const marker = bytes[offset + 1];
        if (marker === 0xc0 || marker === 0xc2) {
          const view = new DataView(bytes.buffer);
          const h = view.getUint16(offset + 5, false);
          const w = view.getUint16(offset + 7, false);
          if (w > 0 && h > 0) return { w, h };
        }
        const length = (bytes[offset + 2] << 8) + bytes[offset + 3];
        offset += 2 + length;
      }
    }
  } catch (e) {
    console.warn("Erro ao obter dimensões da imagem base64:", e);
  }
  return null;
}

/** Aplica o papel timbrado executivo com as cores personalizadas do escritório/logo. */
function aplicarPapelTimbrado(doc: jsPDF, esc?: EscritorioData) {
  const larg = doc.internal.pageSize.getWidth();
  const alt = doc.internal.pageSize.getHeight();

  const primary = hexParaRgb(esc?.corPrimaria);
  const secondary = hexParaRgb(esc?.corSecundaria || '#f59e0b');

  // Faixa de topo executiva em 2 tons elegantes com a cor da marca da empresa
  doc.setFillColor(primary.r, primary.g, primary.b);
  doc.rect(0, 0, larg, 3.5, 'F');
  doc.setFillColor(secondary.r, secondary.g, secondary.b);
  doc.rect(0, 3.5, larg, 1.2, 'F');

  // Moldura perimetral sutil de papel timbrado com suavidade proporcional à cor primária
  const borderR = Math.min(245, primary.r + 190);
  const borderG = Math.min(245, primary.g + 190);
  const borderB = Math.min(245, primary.b + 190);
  doc.setDrawColor(borderR, borderG, borderB);
  doc.setLineWidth(0.35);
  doc.rect(8, 8, larg - 16, alt - 16);

  // Rodapé de segurança do papel timbrado
  doc.setDrawColor(Math.min(230, primary.r + 160), Math.min(230, primary.g + 160), Math.min(230, primary.b + 160));
  doc.setLineWidth(0.25);
  doc.line(18, alt - 12, larg - 18, alt - 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const nomeEmpresa = esc?.nome ? `${esc.nome} • ` : '';
  doc.text(`${nomeEmpresa}Documento gerado pelo Souza-CAD • Sistema Profissional de Georreferenciamento`, larg / 2, alt - 7, { align: 'center' });
  doc.setTextColor(0, 0, 0);
}

function cabecalhoEscritorio(doc: jsPDF, esc: EscritorioData, margem: number, larg: number): number {
  aplicarPapelTimbrado(doc, esc);
  let y = margem + 3;
  if (esc.logoDataUrl) {
    try {
      const logoOtimizada = otimizarImagemBase64(esc.logoDataUrl) || esc.logoDataUrl;
      const fmt = logoOtimizada.includes('image/png') ? 'PNG' : 'JPEG';
      let w = 36;
      let h = 15;
      const dim = obterDimensoesBase64(logoOtimizada);
      if (dim && dim.w > 0 && dim.h > 0) {
        const ratio = dim.w / dim.h;
        if (ratio > 36 / 15) {
          w = 36;
          h = 36 / ratio;
        } else {
          h = 15;
          w = 15 * ratio;
        }
      }
      doc.addImage(logoOtimizada, fmt, larg / 2 - w / 2, y, w, h, undefined, 'FAST');
      y += h + 3;
    } catch (err) {
      console.warn("Erro ao renderizar logo no PDF:", err);
    }
  }

  const primary = hexParaRgb(esc?.corPrimaria);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
  doc.setTextColor(primary.r, primary.g, primary.b);
  doc.text(esc.nome || 'Escritório', larg / 2, y + 4, { align: 'center' });

  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);

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

  doc.setDrawColor(primary.r, primary.g, primary.b);
  doc.setLineWidth(0.4);
  doc.line(margem, y + 1, larg - margem, y + 1);
  doc.setTextColor(0, 0, 0);
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

/** Otimiza e reduz imagens base64 pesadas antes de gravar no PDF */
function otimizarImagemBase64(dataUrl?: string, maxDim = 600, qualidade = 0.82): string {
  if (!dataUrl || typeof dataUrl !== 'string') return '';
  if (dataUrl.length < 40000) return dataUrl;
  if (typeof window === 'undefined' || typeof document === 'undefined') return dataUrl;
  try {
    const img = new Image();
    img.src = dataUrl;
    if (!img.complete || !img.naturalWidth) return dataUrl;

    let w = img.naturalWidth;
    let h = img.naturalHeight;
    if (w <= maxDim && h <= maxDim && dataUrl.length < 100000) return dataUrl;

    if (w > maxDim || h > maxDim) {
      if (w > h) {
        h = Math.round((h * maxDim) / w);
        w = maxDim;
      } else {
        w = Math.round((w * maxDim) / h);
        h = maxDim;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, w, h);

    const isPng = dataUrl.includes('image/png');
    if (isPng) {
      const pngRes = canvas.toDataURL('image/png');
      if (pngRes.length > 0 && pngRes.length < dataUrl.length) return pngRes;
    }
    const jpgRes = canvas.toDataURL('image/jpeg', qualidade);
    return jpgRes.length < dataUrl.length ? jpgRes : dataUrl;
  } catch (e) {
    console.warn("Erro ao otimizar imagem para PDF:", e);
    return dataUrl;
  }
}

/** Adiciona imagem de assinatura PNG sem achatar ou distorcer sua proporção de aspecto (max 48mm x 18mm). */
function adicionarAssinaturaSemAchatamento(doc: jsPDF, dataUrl: string, xCentral: number, yLinha: number, maxW: number = 48, maxH: number = 18) {
  try {
    const assOtimizada = otimizarImagemBase64(dataUrl, 600, 0.82) || dataUrl;
    const fmt = assOtimizada.includes('image/png') ? 'PNG' : 'JPEG';
    let w = maxW;
    let h = maxH;
    const dim = obterDimensoesBase64(assOtimizada);
    if (dim && dim.w > 0 && dim.h > 0) {
      const ratio = dim.w / dim.h;
      if (ratio > maxW / maxH) {
        w = maxW;
        h = maxW / ratio;
      } else {
        h = maxH;
        w = maxH * ratio;
      }
    }
    // Desenha centralizado sobre a linha de assinatura sem achatar
    doc.addImage(assOtimizada, fmt, xCentral - w / 2, yLinha - h - 0.5, w, h, undefined, 'FAST');
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
