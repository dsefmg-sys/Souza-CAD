// Símbolos cartográficos simples (árvore, arbusto, casa, poste, pedra) desenhados em SVG,
// reutilizados no mapa (divIcon) e na planta (inline). Coordenadas internas num sistema -12..12
// com centro em (0,0), então é só transladar/escalar pro ponto de inserção.

export const SIMBOLOS: { chave: string; rotulo: string }[] = [
  { chave: 'arvore', rotulo: 'Árvore' },
  { chave: 'arbusto', rotulo: 'Arbusto' },
  { chave: 'casa', rotulo: 'Casa' },
  { chave: 'poste', rotulo: 'Poste' },
  { chave: 'pedra', rotulo: 'Pedra' },
];

/** Markup INTERNO do símbolo (sem <svg>), centrado em (0,0), no sistema -12..12. */
export function simboloSvgInterno(chave: string, cor = '#166534'): string {
  switch (chave) {
    case 'arvore':
      return `<rect x="-1.3" y="2" width="2.6" height="8" fill="#7c4a1e"/><circle cx="0" cy="-3" r="7.5" fill="${cor}" fill-opacity="0.9" stroke="#14532d" stroke-width="0.6"/>`;
    case 'arbusto':
      return `<circle cx="-3.5" cy="3" r="4" fill="${cor}" fill-opacity="0.9"/><circle cx="3.5" cy="3" r="4" fill="${cor}" fill-opacity="0.9"/><circle cx="0" cy="-1" r="5" fill="${cor}" fill-opacity="0.9" stroke="#14532d" stroke-width="0.5"/>`;
    case 'casa':
      return `<path d="M-8,10 L-8,-1 L0,-8 L8,-1 L8,10 Z" fill="#e5e7eb" stroke="#334155" stroke-width="1.4"/><rect x="-2.5" y="3" width="5" height="7" fill="#334155"/>`;
    case 'poste':
      return `<line x1="0" y1="-10" x2="0" y2="10" stroke="#334155" stroke-width="1.6"/><line x1="-5" y1="-8" x2="5" y2="-8" stroke="#334155" stroke-width="1.6"/><circle cx="0" cy="10" r="1.4" fill="#334155"/>`;
    case 'pedra':
      return `<path d="M-8,8 L-5,-3 L2,-7 L8,-1 L6,8 Z" fill="#9ca3af" stroke="#4b5563" stroke-width="1"/>`;
    default:
      return `<circle cx="0" cy="0" r="6" fill="${cor}"/>`;
  }
}
