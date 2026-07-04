// Símbolos cartográficos para levantamento PLANIALTIMÉTRICO, no padrão técnico (monocromáticos,
// geométricos, com casing branco para leitura sobre imagem de satélite). Reutilizados no mapa
// (divIcon) e na planta (inline). Sistema interno ~-9..9 com centro em (0,0): é só transladar/
// escalar pro ponto de inserção. A COR do traço vem por parâmetro (preto técnico por padrão).

export const SIMBOLOS: { chave: string; rotulo: string }[] = [
  { chave: 'marco', rotulo: 'Marco / Vértice' },
  { chave: 'rn', rotulo: 'RN (nível)' },
  { chave: 'arvore', rotulo: 'Árvore' },
  { chave: 'poste', rotulo: 'Poste' },
  { chave: 'casa', rotulo: 'Edificação' },
  { chave: 'poco', rotulo: 'Poço' },
  { chave: 'pedra', rotulo: 'Rocha' },
];

/**
 * Desenha um símbolo em DUAS camadas: um "casing" branco largo por baixo (dá contraste em qualquer
 * fundo) e o traço da cor por cima. `traços` recebe (cor, larguraExtra) e devolve o markup dos
 * elementos com essa cor de traço — o casing usa branco com largura maior.
 */
function comCasing(tracos: (stroke: string, extra: number) => string): string {
  return tracos('#ffffff', 1.8) + tracos('currentColor', 0);
}

export function simboloSvgInterno(chave: string, cor = '#111827'): string {
  // Envolve num grupo que fixa a "tinta" (currentColor) na cor pedida — o casing branco fica fixo.
  const g = (markup: string) => `<g color="${cor}">${markup}</g>`;

  switch (chave) {
    // MARCO / VÉRTICE — triângulo com ponto central (símbolo clássico de ponto de controle).
    case 'marco':
      return g(comCasing((s, e) =>
        `<path d="M0,-8 L7,4.5 L-7,4.5 Z" fill="none" stroke="${s}" stroke-width="${1.5 + e}" stroke-linejoin="round"/>` +
        `<circle cx="0" cy="0.7" r="${1.3 + e * 0.5}" fill="${s}"/>`
      ));

    // RN — Referência de Nível: círculo com barra horizontal e ponto (marco altimétrico).
    case 'rn':
      return g(comCasing((s, e) =>
        `<circle cx="0" cy="0" r="6.5" fill="none" stroke="${s}" stroke-width="${1.4 + e}"/>` +
        `<line x1="-6.5" y1="0" x2="6.5" y2="0" stroke="${s}" stroke-width="${1.4 + e}"/>` +
        `<circle cx="0" cy="0" r="${1.4 + e * 0.5}" fill="${s}"/>`
      ));

    // ÁRVORE ISOLADA — copa circular com tronco e ponto de centro (posição exata).
    case 'arvore':
      return g(comCasing((s, e) =>
        `<line x1="0" y1="2.5" x2="0" y2="9" stroke="${s}" stroke-width="${1.3 + e}" stroke-linecap="round"/>` +
        `<circle cx="0" cy="-1.5" r="5.5" fill="none" stroke="${s}" stroke-width="${1.4 + e}"/>` +
        `<circle cx="0" cy="-1.5" r="${1.1 + e * 0.5}" fill="${s}"/>`
      ));

    // ARBUSTO / VEGETAÇÃO (mantido por compatibilidade) — copa em lóbulos.
    case 'arbusto':
      return g(comCasing((s, e) =>
        `<path d="M-6,3 A3,3 0 0 1 -3,-2 A3.2,3.2 0 0 1 3,-2 A3,3 0 0 1 6,3 A3,3 0 0 1 3,5 L-3,5 A3,3 0 0 1 -6,3 Z" fill="none" stroke="${s}" stroke-width="${1.3 + e}" stroke-linejoin="round"/>` +
        `<circle cx="0" cy="1.5" r="${1 + e * 0.5}" fill="${s}"/>`
      ));

    // POSTE — círculo pequeno com ponto e raios diagonais (poste de energia/iluminação).
    case 'poste':
      return g(comCasing((s, e) =>
        `<g stroke="${s}" stroke-width="${1.3 + e}" stroke-linecap="round">` +
        `<line x1="2.4" y1="2.4" x2="6.5" y2="6.5"/><line x1="-2.4" y1="2.4" x2="-6.5" y2="6.5"/>` +
        `<line x1="2.4" y1="-2.4" x2="6.5" y2="-6.5"/><line x1="-2.4" y1="-2.4" x2="-6.5" y2="-6.5"/></g>` +
        `<circle cx="0" cy="0" r="3" fill="none" stroke="${s}" stroke-width="${1.3 + e}"/>` +
        `<circle cx="0" cy="0" r="${1 + e * 0.5}" fill="${s}"/>`
      ));

    // EDIFICAÇÃO / CASA — retângulo (planta baixa) com fundo claro.
    case 'casa':
    case 'edificacao':
      return g(
        `<rect x="-7" y="-5.5" width="14" height="11" fill="#ffffff" fill-opacity="0.9" stroke="#ffffff" stroke-width="3"/>` +
        `<rect x="-7" y="-5.5" width="14" height="11" fill="none" stroke="${cor}" stroke-width="1.4"/>`
      );

    // POÇO / CACIMBA — círculo com cruz de centro.
    case 'poco':
      return g(comCasing((s, e) =>
        `<circle cx="0" cy="0" r="6.5" fill="none" stroke="${s}" stroke-width="${1.4 + e}"/>` +
        `<line x1="-4" y1="0" x2="4" y2="0" stroke="${s}" stroke-width="${1.3 + e}"/>` +
        `<line x1="0" y1="-4" x2="0" y2="4" stroke="${s}" stroke-width="${1.3 + e}"/>`
      ));

    // ROCHA / AFLORAMENTO — polígono angular com uma faceta.
    case 'pedra':
    case 'rocha':
      return g(
        `<path d="M-6.5,5 L-3.5,-4 L2,-6.5 L7,-1.5 L4.5,6 Z" fill="#ffffff" fill-opacity="0.85" stroke="#ffffff" stroke-width="3" stroke-linejoin="round"/>` +
        `<path d="M-6.5,5 L-3.5,-4 L2,-6.5 L7,-1.5 L4.5,6 Z" fill="none" stroke="${cor}" stroke-width="1.4" stroke-linejoin="round"/>` +
        `<path d="M-3.5,-4 L1,0.5 M2,-6.5 L1,0.5 M7,-1.5 L1,0.5" fill="none" stroke="${cor}" stroke-width="0.7" stroke-linejoin="round"/>`
      );

    default:
      return g(comCasing((s, e) =>
        `<circle cx="0" cy="0" r="4.5" fill="none" stroke="${s}" stroke-width="${1.4 + e}"/>` +
        `<circle cx="0" cy="0" r="${1 + e * 0.5}" fill="${s}"/>`
      ));
  }
}
