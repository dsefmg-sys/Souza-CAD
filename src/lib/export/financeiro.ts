import { jsPDF } from 'jspdf';
import type { ImovelData, EscritorioData, TecnicoData } from '../topo/types';

/** Formata um número como moeda brasileira: 1234.5 -> "R$ 1.234,50". */
export function moedaBR(v: number): string {
  return (Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ----- valor por extenso (para o recibo) -----
const UNID = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DEZ = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CEM = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

function ext3(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'cem';
  const c = Math.floor(n / 100), r = n % 100;
  let s = c ? CEM[c] : '';
  if (r) {
    if (s) s += ' e ';
    if (r < 20) s += UNID[r];
    else { const d = Math.floor(r / 10), u = r % 10; s += DEZ[d] + (u ? ' e ' + UNID[u] : ''); }
  }
  return s;
}

/** "1234,50" -> "Mil duzentos e trinta e quatro reais e cinquenta centavos". */
export function extensoReais(v: number): string {
  const inteiro = Math.floor(v);
  const centavos = Math.round((v - inteiro) * 100);
  const milhoes = Math.floor(inteiro / 1_000_000);
  const milhares = Math.floor((inteiro % 1_000_000) / 1000);
  const resto = inteiro % 1000;
  const partes: string[] = [];
  if (milhoes) partes.push(ext3(milhoes) + (milhoes === 1 ? ' milhão' : ' milhões'));
  if (milhares) partes.push(milhares === 1 ? 'mil' : ext3(milhares) + ' mil');
  if (resto) partes.push(ext3(resto));
  let txt = partes.join(' e ') || 'zero';
  txt += inteiro === 1 ? ' real' : ' reais';
  if (centavos) txt += ` e ${ext3(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`;
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

interface BaseArgs {
  imovel: ImovelData;
  escritorio: EscritorioData;
  tecnico: TecnicoData;
  dataExtenso: string;     // ex.: "30 de junho de 2026"
  areaHa: number;
}

function cabecalhoEscritorio(doc: jsPDF, esc: EscritorioData, margem: number, larg: number): number {
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
  doc.text(esc.nome || 'Escritório', larg / 2, margem + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  const linhas = [esc.ramo, esc.endereco, [esc.cnpj && `CNPJ ${esc.cnpj}`, esc.telefone && `Tel./WhatsApp ${esc.telefone}`].filter(Boolean).join('  ·  ')].filter(Boolean) as string[];
  let y = margem + 9;
  linhas.forEach((l) => { doc.text(l, larg / 2, y, { align: 'center' }); y += 4.2; });
  doc.setDrawColor(120); doc.line(margem, y + 1, larg - margem, y + 1);
  return y + 8;
}

/** Recibo de pagamento do serviço, pronto para imprimir/assinar. */
export function gerarReciboPdf(a: BaseArgs & { valor: number; referente?: string; numero?: string }): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const larg = doc.internal.pageSize.getWidth();
  const margem = 18;
  let y = cabecalhoEscritorio(doc, a.escritorio, margem, larg);

  // título + caixa de valor
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
  doc.text('RECIBO', margem, y + 4);
  if (a.numero) { doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.text(`Nº ${a.numero}`, margem, y + 10); }
  doc.setDrawColor(40); doc.setLineWidth(0.4);
  doc.roundedRect(larg - margem - 60, y - 2, 60, 12, 2, 2);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
  doc.text(moedaBR(a.valor), larg - margem - 30, y + 6, { align: 'center' });
  y += 22;

  const refer = a.referente || `serviços de georreferenciamento e certificação do imóvel "${a.imovel.denominacao || '—'}"${a.imovel.matricula ? `, matrícula nº ${a.imovel.matricula}` : ''}, situado em ${a.imovel.municipio || '—'}, com área de ${a.areaHa.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} ha`;
  const corpo = `Recebi(emos) de ${a.imovel.proprietario || '—'}${a.imovel.cpfProprietario ? `, inscrito(a) no CPF sob o nº ${a.imovel.cpfProprietario}` : ''}, a importância de ${moedaBR(a.valor)} (${extensoReais(a.valor)}), referente a ${refer}.`;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
  doc.text(doc.splitTextToSize(corpo, larg - margem * 2), margem, y, { lineHeightFactor: 1.5 });
  y += Math.ceil(doc.splitTextToSize(corpo, larg - margem * 2).length) * 6.6 + 6;
  doc.text('Para clareza, firmo(amos) o presente recibo, dando plena e geral quitação do valor recebido.', margem, y, { maxWidth: larg - margem * 2 });
  y += 16;

  doc.text(`${a.tecnico.cidadeAssinatura || a.imovel.municipio || '—'}, ${a.dataExtenso}.`, margem, y);
  y += 26;
  doc.setLineWidth(0.3); doc.line(larg / 2 - 45, y, larg / 2 + 45, y);
  doc.setFontSize(10);
  doc.text(a.escritorio.nome || a.tecnico.nome || '', larg / 2, y + 5, { align: 'center' });
  const sub = [a.tecnico.nome, a.tecnico.cft && `CFT ${a.tecnico.cft}`].filter(Boolean).join('  ·  ');
  if (sub) doc.text(sub, larg / 2, y + 10, { align: 'center' });

  doc.save(`Recibo - ${a.imovel.denominacao || 'cliente'}.pdf`);
}

/** Contrato de prestação de serviços de georreferenciamento, pronto para ajustar e assinar. */
export function gerarContratoPdf(a: BaseArgs & { valor: number; formaPagamento?: string; prazoDias?: number }): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const larg = doc.internal.pageSize.getWidth();
  const alt = doc.internal.pageSize.getHeight();
  const margem = 18;
  let y = cabecalhoEscritorio(doc, a.escritorio, margem, larg);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
  doc.text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE GEORREFERENCIAMENTO', larg / 2, y, { align: 'center', maxWidth: larg - margem * 2 });
  y += 12;

  const area = a.areaHa.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  const repres = [a.tecnico.nome, a.tecnico.formacao, a.tecnico.cft && `CFT ${a.tecnico.cft}`].filter(Boolean).join(', ');
  const clausulas: [string, string][] = [
    ['CONTRATANTE', `${a.imovel.proprietario || '—'}${a.imovel.cpfProprietario ? `, CPF nº ${a.imovel.cpfProprietario}` : ''}, doravante denominado(a) CONTRATANTE.`],
    ['CONTRATADO', `${a.escritorio.nome || '—'}${a.escritorio.cnpj ? `, CNPJ nº ${a.escritorio.cnpj}` : ''}, neste ato representado por ${repres || '—'}, doravante denominado CONTRATADO.`],
    ['CLÁUSULA 1ª – DO OBJETO', `Prestação de serviços técnicos de georreferenciamento e certificação junto ao SIGEF/INCRA do imóvel "${a.imovel.denominacao || '—'}"${a.imovel.matricula ? `, matrícula nº ${a.imovel.matricula}` : ''}, situado em ${a.imovel.municipio || '—'}, com área aproximada de ${area} ha, incluindo levantamento, memorial descritivo, planta e peças técnicas.`],
    ['CLÁUSULA 2ª – DO VALOR E PAGAMENTO', `Pelos serviços, o CONTRATANTE pagará ao CONTRATADO o valor de ${moedaBR(a.valor)} (${extensoReais(a.valor)}), ${a.formaPagamento || 'na forma combinada entre as partes'}.`],
    ['CLÁUSULA 3ª – DO PRAZO', `O CONTRATADO executará os serviços no prazo de ${a.prazoDias ?? '____'} dias, ressalvadas as etapas que dependam de terceiros (cartório, INCRA, confrontantes) e de condições de campo.`],
    ['CLÁUSULA 4ª – DAS OBRIGAÇÕES', `O CONTRATANTE fornecerá documentos e informações necessárias e indicará as divisas em campo; o CONTRATADO executará os serviços com zelo técnico e responsabilidade profissional.`],
    ['CLÁUSULA 5ª – DO FORO', `Fica eleito o foro da comarca de ${a.tecnico.cidadeAssinatura || a.imovel.municipio || '—'} para dirimir eventuais dúvidas oriundas deste contrato.`],
  ];

  doc.setFontSize(10.5);
  clausulas.forEach(([titulo, texto]) => {
    if (y > alt - 50) { doc.addPage(); y = margem; }
    doc.setFont('helvetica', 'bold'); doc.text(titulo, margem, y); y += 5.5;
    doc.setFont('helvetica', 'normal');
    const linhas = doc.splitTextToSize(texto, larg - margem * 2);
    doc.text(linhas, margem, y, { lineHeightFactor: 1.45 });
    y += linhas.length * 5.3 + 5;
  });

  if (y > alt - 60) { doc.addPage(); y = margem; }
  y += 6;
  doc.text(`${a.tecnico.cidadeAssinatura || a.imovel.municipio || '—'}, ${a.dataExtenso}.`, margem, y);
  y += 24;
  const meio = larg / 2;
  doc.setLineWidth(0.3);
  doc.line(margem, y, margem + 70, y);
  doc.line(larg - margem - 70, y, larg - margem, y);
  doc.setFontSize(9.5);
  doc.text('CONTRATANTE', margem + 35, y + 5, { align: 'center' });
  doc.text(a.imovel.proprietario || '', margem + 35, y + 10, { align: 'center' });
  doc.text('CONTRATADO', larg - margem - 35, y + 5, { align: 'center' });
  doc.text(a.escritorio.nome || '', larg - margem - 35, y + 10, { align: 'center' });
  y += 24;
  doc.line(meio - 70, y, meio - 10, y); doc.text('Testemunha', meio - 40, y + 5, { align: 'center' });
  doc.line(meio + 10, y, meio + 70, y); doc.text('Testemunha', meio + 40, y + 5, { align: 'center' });

  doc.save(`Contrato - ${a.imovel.denominacao || 'cliente'}.pdf`);
}
