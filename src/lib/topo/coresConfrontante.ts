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

/** Cor estável para um confrontante, a partir do seu id (mesmo id sempre gera a mesma cor). */
export function corPorConfrontante(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  const idx = Math.abs(hash) % PALETA_CONFRONTANTE.length;
  return PALETA_CONFRONTANTE[idx];
}
