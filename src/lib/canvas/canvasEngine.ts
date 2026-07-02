// Motor de um editor de canvas estilo "mini-Canva" (imagem, texto, formas — mover, redimensionar,
// camadas, alinhar) — genérico, sem nenhuma dependência de React, de UI ou deste app. Pode ser
// copiado inteiro para qualquer outro projeto: é só tipos e funções puras sobre uma lista de
// elementos. A casca visual (modal, botões, DOM) fica de fora de propósito.

export type ElBase = { id: number; x: number; y: number; w: number; h: number };
export type El =
  | (ElBase & { t: 'img'; src: string })
  | (ElBase & { t: 'text'; texto: string; size: number; cor: string; bold: boolean })
  | (ElBase & { t: 'rect'; fill: string; radius: number })
  | (ElBase & { t: 'ellipse'; fill: string });

export interface Formato { nome: string; w: number; h: number; }
export const FORMATOS_PADRAO: Formato[] = [
  { nome: 'Quadrado 1080×1080', w: 1080, h: 1080 },
  { nome: 'Paisagem 1920×1080', w: 1920, h: 1080 },
  { nome: 'Retrato 1080×1920', w: 1080, h: 1920 },
  { nome: 'Story 1080×1920', w: 1080, h: 1920 },
];

let _seq = 1;
/** Gera um id único e crescente para novos elementos nesta sessão de edição. */
export function novoId(): number { return _seq++; }

/** Move um elemento pela lista (traz para frente / envia para trás). Sem efeito se já está na ponta. */
export function reordenarCamada(els: El[], id: number, dir: 1 | -1): El[] {
  const i = els.findIndex((e) => e.id === id);
  if (i < 0) return els;
  const j = i + dir;
  if (j < 0 || j >= els.length) return els;
  const c = [...els];
  [c[i], c[j]] = [c[j], c[i]];
  return c;
}

/** Nova posição (x ou y) para centralizar o elemento no formato, no eixo pedido. */
export function centralizarEm(el: ElBase, fmt: { w: number; h: number }, eixo: 'h' | 'v'): number {
  return eixo === 'h' ? (fmt.w - el.w) / 2 : (fmt.h - el.h) / 2;
}

/** Escala de exibição para caber o formato (w×h) numa caixa de tela (boxW×boxH), sem distorcer. */
export function escalaParaCaber(fmt: { w: number; h: number }, box: { w: number; h: number }): number {
  return Math.min(box.w / fmt.w, box.h / fmt.h, 1) || 0.1;
}
