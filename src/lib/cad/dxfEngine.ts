// Motor de edição de desenho 2D (linhas, polilinhas, círculos, arcos, textos, pontos) — genérico,
// sem nenhuma dependência de React, de UI ou deste app. Pode ser copiado inteiro para qualquer
// outro projeto: é geometria pura (tipos + funções). A casca visual (botões, modal) fica de fora
// de propósito, para cada app montar a interface do jeito que quiser.
//
// Este arquivo cobre o "motor": criar/mover entidades e gerar/ler DXF. A leitura de DXF fica em
// dxf.ts (io), que também é independente de UI.

import type { DxfEntidades } from '../io/dxf';

export type Pt = { x: number; y: number };

// `layer` é opcional para não quebrar entidades antigas/importadas sem camada — trate ausência
// como a camada padrão '0' (função `camadaDe`).
export type Ent =
  | { id: number; t: 'line'; a: Pt; b: Pt; layer?: string }
  | { id: number; t: 'poly'; pts: Pt[]; fechada: boolean; layer?: string }
  | { id: number; t: 'circle'; c: Pt; r: number; layer?: string }
  | { id: number; t: 'arc'; c: Pt; r: number; a0: number; a1: number; layer?: string }
  | { id: number; t: 'text'; pos: Pt; texto: string; altura: number; layer?: string }
  | { id: number; t: 'point'; p: Pt; layer?: string };

/** Nome da camada de uma entidade (padrão '0' quando ausente). */
export function camadaDe(e: Ent): string { return e.layer ?? '0'; }

export interface Camada { nome: string; cor: string; visivel: boolean; travada: boolean; }
/** Lista inicial de camadas de um documento novo: só a camada padrão '0'. */
export function camadasPadrao(): Camada[] { return [{ nome: '0', cor: '#0f172a', visivel: true, travada: false }]; }

let _seq = 1;
/** Gera um id único e crescente para novas entidades nesta sessão de edição. */
export function novoId(): number { return _seq++; }

/** Pontos de referência de uma entidade (para enquadrar, medir distância e "pegar" no clique). */
export function pontosDe(e: Ent): Pt[] {
  switch (e.t) {
    case 'line': return [e.a, e.b];
    case 'poly': return e.pts;
    case 'circle': return [{ x: e.c.x - e.r, y: e.c.y - e.r }, { x: e.c.x + e.r, y: e.c.y + e.r }];
    case 'arc': return [{ x: e.c.x - e.r, y: e.c.y - e.r }, { x: e.c.x + e.r, y: e.c.y + e.r }];
    case 'text': return [e.pos];
    case 'point': return [e.p];
  }
}

/** Translada uma entidade por (dx, dy). */
export function moverEnt(e: Ent, dx: number, dy: number): Ent {
  const m = (p: Pt): Pt => ({ x: p.x + dx, y: p.y + dy });
  switch (e.t) {
    case 'line': return { ...e, a: m(e.a), b: m(e.b) };
    case 'poly': return { ...e, pts: e.pts.map(m) };
    case 'circle': return { ...e, c: m(e.c) };
    case 'arc': return { ...e, c: m(e.c) };
    case 'text': return { ...e, pos: m(e.pos) };
    case 'point': return { ...e, p: m(e.p) };
  }
}

/** Centro de referência de uma entidade para girar/escalar (centroide dos seus pontos notáveis). */
export function pivoDe(e: Ent): Pt {
  const ps = pontosDe(e);
  return { x: ps.reduce((s, p) => s + p.x, 0) / ps.length, y: ps.reduce((s, p) => s + p.y, 0) / ps.length };
}

function rotarPt(p: Pt, c: Pt, rad: number): Pt {
  const dx = p.x - c.x, dy = p.y - c.y;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos };
}
/** Gira uma entidade em torno de `centro` por `anguloGrausVal` graus (sentido anti-horário). */
export function girarEnt(e: Ent, centro: Pt, anguloGrausVal: number): Ent {
  const rad = (anguloGrausVal * Math.PI) / 180;
  const r = (p: Pt) => rotarPt(p, centro, rad);
  switch (e.t) {
    case 'line': return { ...e, a: r(e.a), b: r(e.b) };
    case 'poly': return { ...e, pts: e.pts.map(r) };
    case 'circle': return { ...e, c: r(e.c) };
    case 'arc': return { ...e, c: r(e.c), a0: (e.a0 + anguloGrausVal + 360) % 360, a1: (e.a1 + anguloGrausVal + 360) % 360 };
    case 'text': return { ...e, pos: r(e.pos) }; // gira a posição; o ângulo de escrita do texto em si fica de fora (básico)
    case 'point': return { ...e, p: r(e.p) };
  }
}

/** Escala (aumenta/diminui) uma entidade em torno de `centro` por um fator (uniforme). */
export function escalarEnt(e: Ent, centro: Pt, fator: number): Ent {
  const s = (p: Pt): Pt => ({ x: centro.x + (p.x - centro.x) * fator, y: centro.y + (p.y - centro.y) * fator });
  const k = Math.abs(fator);
  switch (e.t) {
    case 'line': return { ...e, a: s(e.a), b: s(e.b) };
    case 'poly': return { ...e, pts: e.pts.map(s) };
    case 'circle': return { ...e, c: s(e.c), r: e.r * k };
    case 'arc': return { ...e, c: s(e.c), r: e.r * k };
    case 'text': return { ...e, pos: s(e.pos), altura: e.altura * k };
    case 'point': return { ...e, p: s(e.p) };
  }
}

function espelharPt(p: Pt, a: Pt, b: Pt): Pt {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy || 1;
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  const projx = a.x + t * dx, projy = a.y + t * dy;
  return { x: 2 * projx - p.x, y: 2 * projy - p.y };
}
/** Espelha (reflete) uma entidade pelo eixo definido pela reta que passa por `a` e `b`. */
export function espelharEnt(e: Ent, a: Pt, b: Pt): Ent {
  const m = (p: Pt) => espelharPt(p, a, b);
  switch (e.t) {
    case 'line': return { ...e, a: m(e.a), b: m(e.b) };
    case 'poly': return { ...e, pts: e.pts.map(m) };
    case 'circle': return { ...e, c: m(e.c) };
    case 'arc': {
      const c2 = m(e.c);
      const rad0 = (e.a0 * Math.PI) / 180, rad1 = (e.a1 * Math.PI) / 180;
      const p0 = m({ x: e.c.x + e.r * Math.cos(rad0), y: e.c.y + e.r * Math.sin(rad0) });
      const p1 = m({ x: e.c.x + e.r * Math.cos(rad1), y: e.c.y + e.r * Math.sin(rad1) });
      // o espelhamento inverte o sentido do arco: início e fim trocam de lugar
      return { ...e, c: c2, a0: anguloGraus(c2, p1), a1: anguloGraus(c2, p0) };
    }
    case 'text': return { ...e, pos: m(e.pos) };
    case 'point': return { ...e, p: m(e.p) };
  }
}

/** Duplica uma entidade com um novo id, deslocada por (dx, dy) — para "Copiar". */
export function copiarEnt(e: Ent, dx: number, dy: number): Ent {
  return { ...moverEnt(e, dx, dy), id: novoId() };
}

/** Gera o corpo ENTITIES de um DXF (R12 ASCII) a partir da lista de entidades editadas. */
export function gerarDxf(ents: Ent[]): string {
  const corpo: string[] = [];
  const E = (tipo: string, layer: string, linhas: (string | number)[]) => corpo.push('0', tipo, '8', layer, ...linhas.map(String));
  for (const e of ents) {
    const lay = camadaDe(e);
    if (e.t === 'line') E('LINE', lay, ['10', e.a.x.toFixed(3), '20', e.a.y.toFixed(3), '11', e.b.x.toFixed(3), '21', e.b.y.toFixed(3)]);
    else if (e.t === 'poly') { const p: (string | number)[] = ['90', e.pts.length, '70', e.fechada ? 1 : 0]; e.pts.forEach((q) => p.push('10', q.x.toFixed(3), '20', q.y.toFixed(3))); E('LWPOLYLINE', lay, p); }
    else if (e.t === 'circle') E('CIRCLE', lay, ['10', e.c.x.toFixed(3), '20', e.c.y.toFixed(3), '40', e.r.toFixed(3)]);
    else if (e.t === 'arc') E('ARC', lay, ['10', e.c.x.toFixed(3), '20', e.c.y.toFixed(3), '40', e.r.toFixed(3), '50', e.a0.toFixed(3), '51', e.a1.toFixed(3)]);
    else if (e.t === 'text') E('TEXT', lay, ['10', e.pos.x.toFixed(3), '20', e.pos.y.toFixed(3), '40', (e.altura || 2).toFixed(3), '1', e.texto]);
    else if (e.t === 'point') E('POINT', lay, ['10', e.p.x.toFixed(3), '20', e.p.y.toFixed(3)]);
  }
  return ['0', 'SECTION', '2', 'ENTITIES', ...corpo, '0', 'ENDSEC', '0', 'EOF'].join('\n');
}

/** Distância entre dois pontos. */
export function dist(a: Pt, b: Pt): number { return Math.hypot(a.x - b.x, a.y - b.y); }

/** Ângulo em graus (0..360) do vetor centro->ponto, medido a partir do eixo X. */
export function anguloGraus(c: Pt, p: Pt): number {
  let a = (Math.atan2(p.y - c.y, p.x - c.x) * 180) / Math.PI;
  if (a < 0) a += 360;
  return a;
}

/** Constrói uma polilinha (aberta ou fechada) a partir dos pontos clicados. */
export function criarPolilinha(pts: Pt[], fechada: boolean): Ent {
  return { id: novoId(), t: 'poly', pts, fechada };
}

/** Constrói um retângulo (polilinha fechada de 4 vértices) a partir de dois cantos opostos. */
export function criarRetangulo(a: Pt, b: Pt): Ent {
  const pts: Pt[] = [{ x: a.x, y: a.y }, { x: b.x, y: a.y }, { x: b.x, y: b.y }, { x: a.x, y: b.y }];
  return { id: novoId(), t: 'poly', pts, fechada: true };
}

/** Constrói um círculo a partir do centro e de um ponto na borda (define o raio). */
export function criarCirculo(centro: Pt, borda: Pt): Ent {
  return { id: novoId(), t: 'circle', c: centro, r: dist(centro, borda) };
}

/** Constrói um arco a partir do centro, um ponto de início (raio+ângulo inicial) e um ponto de fim (ângulo final). */
export function criarArco(centro: Pt, inicio: Pt, fim: Pt): Ent {
  const r = dist(centro, inicio);
  return { id: novoId(), t: 'arc', c: centro, r, a0: anguloGraus(centro, inicio), a1: anguloGraus(centro, fim) };
}

// ---- snap aos pontos notáveis (extremidade, meio, centro) ----
// Interseção entre entidades fica de fora de propósito: exige um motor de geometria mais pesado
// (linha×linha, linha×arco, arco×arco) e não é o básico essencial pedido — extremidade/meio/centro
// já resolve a maior parte da precisão do dia a dia.

export type TipoSnap = 'extremidade' | 'meio' | 'centro';
export interface PontoSnap { p: Pt; tipo: TipoSnap; }

function meio(a: Pt, b: Pt): Pt { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }

/** Pontos notáveis de UMA entidade (extremidades, meios de segmento, centros). */
export function pontosSnapDe(e: Ent): PontoSnap[] {
  switch (e.t) {
    case 'line': return [
      { p: e.a, tipo: 'extremidade' }, { p: e.b, tipo: 'extremidade' },
      { p: meio(e.a, e.b), tipo: 'meio' },
    ];
    case 'poly': {
      const out: PontoSnap[] = e.pts.map((p) => ({ p, tipo: 'extremidade' as const }));
      for (let i = 0; i + 1 < e.pts.length; i++) out.push({ p: meio(e.pts[i], e.pts[i + 1]), tipo: 'meio' });
      if (e.fechada && e.pts.length > 1) out.push({ p: meio(e.pts[e.pts.length - 1], e.pts[0]), tipo: 'meio' });
      return out;
    }
    case 'circle': return [{ p: e.c, tipo: 'centro' }];
    case 'arc': {
      const a0 = (e.a0 * Math.PI) / 180, a1 = (e.a1 * Math.PI) / 180;
      return [
        { p: e.c, tipo: 'centro' },
        { p: { x: e.c.x + e.r * Math.cos(a0), y: e.c.y + e.r * Math.sin(a0) }, tipo: 'extremidade' },
        { p: { x: e.c.x + e.r * Math.cos(a1), y: e.c.y + e.r * Math.sin(a1) }, tipo: 'extremidade' },
      ];
    }
    case 'text': return [{ p: e.pos, tipo: 'extremidade' }];
    case 'point': return [{ p: e.p, tipo: 'extremidade' }];
  }
}

/** Todos os pontos notáveis do desenho (candidatos de snap). */
export function todosPontosSnap(ents: Ent[]): PontoSnap[] {
  return ents.flatMap(pontosSnapDe);
}

/** Candidato mais próximo de `alvo` dentro da tolerância (mesma unidade de `alvo`), ou null. */
export function encontrarSnap(alvo: Pt, candidatos: PontoSnap[], tolerancia: number): PontoSnap | null {
  let melhor: PontoSnap | null = null;
  let melhorD = tolerancia;
  for (const c of candidatos) {
    const d = dist(alvo, c.p);
    if (d < melhorD) { melhorD = d; melhor = c; }
  }
  return melhor;
}

/** Converte as entidades lidas de um arquivo DXF (dxf.ts) para o modelo editável deste motor. */
export function dxfParaEnts(d: DxfEntidades): Ent[] {
  const e: Ent[] = [];
  d.linhas.forEach((l) => e.push({ id: novoId(), t: 'line', a: l.a, b: l.b }));
  d.polilinhas.forEach((p) => e.push({ id: novoId(), t: 'poly', pts: p.pontos, fechada: p.fechada }));
  d.circulos.forEach((c) => e.push({ id: novoId(), t: 'circle', c: c.c, r: c.r }));
  d.arcos.forEach((a) => e.push({ id: novoId(), t: 'arc', c: a.c, r: a.r, a0: a.a0, a1: a.a1 }));
  d.textos.forEach((t) => e.push({ id: novoId(), t: 'text', pos: t.pos, texto: t.texto, altura: t.altura ?? 0 }));
  d.pontos.forEach((p) => e.push({ id: novoId(), t: 'point', p }));
  return e;
}
