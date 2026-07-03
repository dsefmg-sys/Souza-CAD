import type { ObjetoDesenho, PontoLL } from './types';

let _seq = 0;
export function novoObjetoId(): string {
  _seq += 1;
  return `o_${Date.now().toString(36)}_${_seq}`;
}

export function novaPolilinha(pontos: PontoLL[], opts: { cor?: string; espessura?: number; preenchido?: boolean; tracejado?: boolean } = {}): ObjetoDesenho {
  return { id: novoObjetoId(), tipo: 'polilinha', pontos, cor: opts.cor ?? '#2563eb', espessura: opts.espessura ?? 1.5, preenchido: opts.preenchido, tracejado: opts.tracejado };
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
