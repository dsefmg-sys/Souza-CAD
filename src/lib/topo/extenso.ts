// Valor em reais por extenso (pt-BR). Cobre até centenas de bilhões + centavos.

const UNID = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
const DEZ_A_DEZENOVE = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
const ESCALAS: [string, string][] = [
  ['', ''],
  ['mil', 'mil'],
  ['milhão', 'milhões'],
  ['bilhão', 'bilhões'],
];

/** Escreve um grupo de 3 dígitos (0..999). */
function grupo(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'cem';
  const c = Math.floor(n / 100);
  const resto = n % 100;
  const partes: string[] = [];
  if (c) partes.push(CENTENAS[c]);
  if (resto) {
    if (resto < 10) partes.push(UNID[resto]);
    else if (resto < 20) partes.push(DEZ_A_DEZENOVE[resto - 10]);
    else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      partes.push(u ? `${DEZENAS[d]} e ${UNID[u]}` : DEZENAS[d]);
    }
  }
  return partes.join(' e ');
}

function inteiroPorExtenso(n: number, estilo: 'virgula' | 'conjuncao' = 'virgula'): string {
  if (n === 0) return 'zero';
  // separa em grupos de 3
  const grupos: number[] = [];
  let x = n;
  while (x > 0) { grupos.push(x % 1000); x = Math.floor(x / 1000); }
  const itens: { s: string; valor: number }[] = [];
  for (let i = grupos.length - 1; i >= 0; i--) {
    const g = grupos[i];
    if (g === 0) continue;
    const texto = grupo(g);
    const [sing, plur] = ESCALAS[i] || ['', ''];
    let s: string;
    if (i === 0) s = texto;
    else if (i === 1) s = g === 1 ? sing : `${texto} ${sing}`; // "mil", "dois mil"
    else s = `${texto} ${g === 1 ? sing : plur}`;              // "um milhão", "dois milhões"
    itens.push({ s, valor: g });
  }
  if (itens.length === 1) return itens[0].s;
  // junção: conector e separador dependem do estilo
  const ultimo = itens[itens.length - 1];
  const conector = estilo === 'conjuncao' ? ' e ' : (ultimo.valor < 100 || ultimo.valor % 100 === 0 ? ' e ' : ', ');
  const sep = estilo === 'conjuncao' ? ' e ' : ', ';
  return itens.slice(0, -1).map((it) => it.s).join(sep) + conector + ultimo.s;
}

/** "milhão"/"bilhão" exatos pedem "de reais" (ex.: "um milhão de reais"). */
function moedaSufixo(ext: string, plural: string): string {
  return /(milhão|milhões|bilhão|bilhões)$/.test(ext) ? `de ${plural}` : plural;
}

export interface ExtensoOptions {
  estilo?: 'virgula' | 'conjuncao';
  capitalizar?: boolean;
}

/** Valor em reais por extenso, ex.: 1234.5 -> "mil, duzentos e trinta e quatro reais e cinquenta centavos". */
export function valorPorExtenso(valor: number, opts: ExtensoOptions = {}): string {
  const estilo = opts.estilo ?? 'virgula';
  const capitalizar = opts.capitalizar ?? false;

  const arred = Math.round(valor * 100);
  const reais = Math.floor(arred / 100);
  const centavos = arred % 100;
  const partes: string[] = [];
  if (reais > 0) {
    const ext = inteiroPorExtenso(reais, estilo);
    partes.push(`${ext} ${reais === 1 ? moedaSufixo(ext, 'real') : moedaSufixo(ext, 'reais')}`);
  }
  if (centavos > 0) {
    const ext = inteiroPorExtenso(centavos, estilo);
    partes.push(`${ext} ${centavos === 1 ? 'centavo' : 'centavos'}`);
  }
  let out = partes.length === 0 ? 'zero real' : partes.join(' e ');
  if (capitalizar) {
    out = out.charAt(0).toUpperCase() + out.slice(1);
  }
  return out;
}
