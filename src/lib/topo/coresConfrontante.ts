// Paleta de cores estáveis por confrontante — cada id sempre cai na mesma cor, para diferenciar
// de relance no mapa quais segmentos pertencem a qual confrontante (antes disso, todo segmento
// atribuído ficava na mesma cor azul, e só dava pra saber quem era passando o mouse em cada um).
const PALETA_CONFRONTANTE = [
  '#2563eb', // azul
  '#dc2626', // vermelho
  '#16a34a', // verde
  '#d97706', // âmbar
  '#7c3aed', // roxo
  '#db2777', // rosa
  '#0891b2', // ciano
  '#65a30d', // lima
  '#ea580c', // laranja
  '#4338ca', // índigo
];

/** Cor estável para um confrontante, a partir do seu id (mesmo id sempre gera a mesma cor), ou a cor customizada. */
export function corPorConfrontante(id: string, c?: { cor?: string } | null): string {
  if (c?.cor) return c.cor;
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  const idx = Math.abs(hash) % PALETA_CONFRONTANTE.length;
  return PALETA_CONFRONTANTE[idx];
}

/** Gera uma cor estável/aleatória para um novo confrontante que não colida com as cores dos existentes. */
export function gerarCorNovaConfrontante(existentes: { cor?: string; id: string }[]): string {
  const coresUsadas = new Set(existentes.map((c) => c.cor || corPorConfrontante(c.id, c)));
  const disponiveis = PALETA_CONFRONTANTE.filter((cor) => !coresUsadas.has(cor));
  if (disponiveis.length > 0) {
    return disponiveis[Math.floor(Math.random() * disponiveis.length)];
  }
  for (let tentativa = 0; tentativa < 20; tentativa++) {
    const hue = Math.floor(Math.random() * 360);
    const hex = hslToHex(hue, 70, 45);
    if (!coresUsadas.has(hex)) return hex;
  }
  return PALETA_CONFRONTANTE[Math.floor(Math.random() * PALETA_CONFRONTANTE.length)];
}

function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
