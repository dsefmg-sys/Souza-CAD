import type { ObjetoDesenho, PontoLL } from './types';

let _seq = 0;
export function novoObjetoId(): string {
  _seq += 1;
  return `o_${Date.now().toString(36)}_${_seq}`;
}

export function novaPolilinha(pontos: PontoLL[], opts: { cor?: string; espessura?: number; preenchido?: boolean; tracejado?: boolean } = {}): ObjetoDesenho {
  return { id: novoObjetoId(), tipo: 'polilinha', pontos, cor: opts.cor ?? '#2563eb', espessura: opts.espessura ?? 1.5, preenchido: opts.preenchido, tracejado: opts.tracejado };
}

/** Cor sépia/marrom clássica de carta topográfica para as curvas de nível. */
export const COR_CURVA_NIVEL = '#8a5a2b';
/** Sentinela de cor AUTOMÁTICA da curva: cada tela decide (branca no mapa escuro, cinza na planta branca). */
export const COR_CURVA_AUTO = 'auto';

/** Cria uma polilinha marcada como CURVA DE NÍVEL na altitude `nivel`. Mestra (a cada Nª) mais grossa.
 * Cor e espessura vêm da engrenagem de ajustes; sem opções, cai no padrão de carta topográfica. */
export function novaCurvaNivel(pontos: PontoLL[], nivel: number, mestra: boolean, opts: { cor?: string; espessura?: number } = {}): ObjetoDesenho {
  return {
    id: novoObjetoId(), tipo: 'polilinha', pontos, curvaNivel: nivel,
    cor: opts.cor ?? COR_CURVA_NIVEL, espessura: opts.espessura ?? (mestra ? 1.2 : 0.5),
  };
}

export function novoTexto(pt: PontoLL, texto: string, opts: { tamanho?: number; alinhamento?: 'left' | 'center' | 'right'; cor?: string } = {}): ObjetoDesenho {
  return { id: novoObjetoId(), tipo: 'texto', pontos: [pt], texto, tamanho: opts.tamanho ?? 12, alinhamento: opts.alinhamento ?? 'left', cor: opts.cor ?? '#000000' };
}

export function novoSimbolo(pt: PontoLL, simbolo: string): ObjetoDesenho {
  return { id: novoObjetoId(), tipo: 'simbolo', pontos: [pt], simbolo };
}

export function novaCota(a: PontoLL, b: PontoLL, opts: { cor?: string } = {}): ObjetoDesenho {
  return { id: novoObjetoId(), tipo: 'cota', pontos: [a, b], cor: opts.cor ?? '#b91c1c', espessura: 1 };
}

/** Distância (m) de uma cota (no plano UTM). */
export function distanciaCota(o: ObjetoDesenho): number {
  if (o.tipo !== 'cota' || o.pontos.length < 2) return 0;
  const [a, b] = o.pontos;
  return Math.hypot(b.leste - a.leste, b.norte - a.norte);
}

/** Área (ha) de uma polilinha fechada, pela fórmula do agrimensor (shoelace) no plano UTM. */
export function areaPoligonoObjeto(o: ObjetoDesenho): number {
  if (o.tipo !== 'polilinha' || o.pontos.length < 3) return 0;
  let a = 0;
  for (let i = 0; i < o.pontos.length; i++) {
    const p = o.pontos[i], q = o.pontos[(i + 1) % o.pontos.length];
    a += p.leste * q.norte - q.leste * p.norte;
  }
  return Math.abs(a / 2) / 10000; // m² → ha
}

/** Camadas ambientais do CAR: rótulo e cor de cada tema. */
export const CAR_TEMAS: { chave: NonNullable<ObjetoDesenho['carTema']>; rotulo: string; cor: string }[] = [
  { chave: 'app', rotulo: 'APP', cor: '#0ea5e9' },
  { chave: 'reservaLegal', rotulo: 'Reserva legal', cor: '#16a34a' },
  { chave: 'vegetacao', rotulo: 'Vegetação nativa', cor: '#4d7c0f' },
  { chave: 'usoConsolidado', rotulo: 'Uso consolidado', cor: '#d97706' },
];

/** Comprimento total de uma polilinha (m). */
export function comprimentoPolilinha(o: ObjetoDesenho): number {
  let t = 0;
  for (let i = 0; i + 1 < o.pontos.length; i++) {
    t += Math.hypot(o.pontos[i + 1].leste - o.pontos[i].leste, o.pontos[i + 1].norte - o.pontos[i].norte);
  }
  return t;
}

/** Calcula o offset paralelo de uma linha de cota à direita do segmento percorrido de A para B. */
export function obterPontosCotaOffset(
  a: { leste: number; norte: number },
  b: { leste: number; norte: number }
) {
  const dx = b.leste - a.leste;
  const dy = b.norte - a.norte;
  const len = Math.hypot(dx, dy);
  if (len === 0) return { alOffset: a, blOffset: b, d: 0 };

  // Vetor normal unitário apontando para a direita da direção do segmento AB:
  const ux = dx / len;
  const uy = dy / len;
  const nx = uy;
  const ny = -ux;

  // Distância de offset proporcional ao comprimento do segmento, com limites para áreas urbanas e rurais:
  const d = Math.max(3, Math.min(15, len * 0.08));

  const alOffset = { leste: a.leste + nx * d, norte: a.norte + ny * d };
  const blOffset = { leste: b.leste + nx * d, norte: b.norte + ny * d };

  return { alOffset, blOffset, d };
}

