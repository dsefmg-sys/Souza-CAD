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

function inteiroPorExtenso(n: number): string {
  if (n === 0) return 'zero';
  // separa em grupos de 3
  const grupos: number[] = [];
  let x = n;
  while (x > 0) { grupos.push(x % 1000); x = Math.floor(x / 1000); }
  const partes: string[] = [];
  for (let i = grupos.length - 1; i >= 0; i--) {
    const g = grupos[i];
    if (g === 0) continue;
    const texto = grupo(g);
    const [sing, plur] = ESCALAS[i] || ['', ''];
    if (i === 0) partes.push(texto);
    else if (i === 1) partes.push(g === 1 ? sing : `${texto} ${sing}`); // "mil", "dois mil"
    else partes.push(`${texto} ${g === 1 ? sing : plur}`);
  }
  // junção com vírgulas e "e" final conforme uso comum
  return partes.join(' ').replace(/\s+/g, ' ').trim();
}

/** Valor em reais por extenso, ex.: 1234.5 -> "mil, duzentos e trinta e quatro reais e cinquenta centavos". */
export function valorPorExtenso(valor: number): string {
  const arred = Math.round(valor * 100);
  const reais = Math.floor(arred / 100);
  const centavos = arred % 100;
  const partes: string[] = [];
  if (reais > 0) partes.push(`${inteiroPorExtenso(reais)} ${reais === 1 ? 'real' : 'reais'}`);
  if (centavos > 0) partes.push(`${inteiroPorExtenso(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`);
  if (partes.length === 0) return 'zero real';
  return partes.join(' e ');
}
