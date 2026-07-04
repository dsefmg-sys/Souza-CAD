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

export function simboloSvgInterno(chave: string, cor = '#166534'): string {
  switch (chave) {
    case 'arvore':
      return `<path d="M-1.5,2 L1.5,2 L1,10 L-1,10 Z" fill="#78350f" />` +
             `<path d="M0,-9 C-4.5,-9 -7.5,-6 -7.5,-2.5 C-7.5,1 -4,3.5 0,3.5 C4,3.5 7.5,1 7.5,-2.5 C7.5,-6 4.5,-9 0,-9 Z" fill="${cor}" stroke="#14532d" stroke-width="0.7" />` +
             `<path d="M-1.5,-8 C-4,-8 -5.5,-6 -5.5,-3.5 C-5.5,-1 -3.5,1 0,1 C0,-4 -1.5,-8 -1.5,-8 Z" fill="#22c55e" fill-opacity="0.4" />`;
    case 'arbusto':
      return `<path d="M-5.5,5 C-7.5,5 -8,2.5 -6.5,0.5 C-5,-1.5 -2.5,-2 0,-2 C2.5,-2 5,-1.5 6.5,0.5 C8,2.5 7.5,5 5.5,5 Z" fill="${cor}" stroke="#14532d" stroke-width="0.6" />` +
             `<circle cx="-2.5" cy="2.5" r="3.5" fill="${cor}" />` +
             `<circle cx="2.5" cy="2.5" r="3.5" fill="${cor}" />` +
             `<circle cx="0" cy="0" r="4.2" fill="${cor}" stroke="#14532d" stroke-width="0.5" />` +
             `<circle cx="-1" cy="-1" r="2" fill="#22c55e" fill-opacity="0.3" />`;
    case 'casa':
      return `<path d="M-8,10 L-8,-1 L0,-8 L8,-1 L8,10 Z" fill="#f8fafc" stroke="#334155" stroke-width="1.2" />` +
             `<path d="M-9,-1.5 L0,-9.5 L9,-1.5" fill="none" stroke="#e11d48" stroke-width="1.8" stroke-linecap="round" />` +
             `<rect x="-2" y="4" width="4" height="6" fill="#475569" />` +
             `<rect x="-5" y="1" width="3" height="3" rx="0.5" fill="#94a3b8" />` +
             `<rect x="2" y="1" width="3" height="3" rx="0.5" fill="#94a3b8" />` +
             `<path d="M4,-7 L4,-9 L6,-9 L6,-5.5" fill="#334155" />`;
    case 'poste':
      return `<circle cx="0" cy="0" r="7" fill="none" stroke="#0284c7" stroke-width="1.2" />` +
             `<circle cx="0" cy="0" r="1.5" fill="#0284c7" />` +
             `<line x1="-10" y1="0" x2="10" y2="0" stroke="#0284c7" stroke-width="0.8" />` +
             `<line x1="0" y1="-10" x2="0" y2="10" stroke="#0284c7" stroke-width="0.8" />`;
    case 'pedra':
      return `<path d="M-8,6 L-5,-5 L3,-8 L9,-2 L6,8 L-4,9 Z" fill="#94a3b8" stroke="#475569" stroke-width="1" />` +
             `<path d="M-5,-5 L3,-8 L1,0 L-4,1 Z" fill="#cbd5e1" />` +
             `<path d="M3,-8 L9,-2 L5,2 L1,0 Z" fill="#64748b" />` +
             `<path d="M-8,6 L-4,9 L1,0 L-4,1 Z" fill="#cbd5e1" fill-opacity="0.5" />`;
    default:
      return `<circle cx="0" cy="0" r="6" fill="${cor}" />`;
  }
}
