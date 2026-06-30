'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, Download, MousePointer2, PenTool, Type, Trash2, Maximize } from 'lucide-react';
import { importarDxf } from '@/lib/io/dxf';

// Editor de DXF GENÉRICO e ISOLADO (ex.: projeto elétrico). Não toca no projeto de agrimensura.
// Visualiza linhas, polilinhas, círculos, arcos, textos e pontos; permite mover/apagar/adicionar
// linha e texto; exporta o DXF editado (R12 ASCII).

type Pt = { x: number; y: number };
type Ent =
  | { id: number; t: 'line'; a: Pt; b: Pt }
  | { id: number; t: 'poly'; pts: Pt[]; fechada: boolean }
  | { id: number; t: 'circle'; c: Pt; r: number }
  | { id: number; t: 'arc'; c: Pt; r: number; a0: number; a1: number }
  | { id: number; t: 'text'; pos: Pt; texto: string; altura: number }
  | { id: number; t: 'point'; p: Pt };

const VW = 1100, VH = 720, PAD = 30;

let _seq = 1;
const nid = () => _seq++;

function dxfParaEnts(d: ReturnType<typeof importarDxf>): Ent[] {
  const e: Ent[] = [];
  d.linhas.forEach((l) => e.push({ id: nid(), t: 'line', a: l.a, b: l.b }));
  d.polilinhas.forEach((p) => e.push({ id: nid(), t: 'poly', pts: p.pontos, fechada: p.fechada }));
  d.circulos.forEach((c) => e.push({ id: nid(), t: 'circle', c: c.c, r: c.r }));
  d.arcos.forEach((a) => e.push({ id: nid(), t: 'arc', c: a.c, r: a.r, a0: a.a0, a1: a.a1 }));
  d.textos.forEach((t) => e.push({ id: nid(), t: 'text', pos: t.pos, texto: t.texto, altura: t.altura ?? 0 }));
  d.pontos.forEach((p) => e.push({ id: nid(), t: 'point', p }));
  return e;
}

function pontosDe(e: Ent): Pt[] {
  switch (e.t) {
    case 'line': return [e.a, e.b];
    case 'poly': return e.pts;
    case 'circle': return [{ x: e.c.x - e.r, y: e.c.y - e.r }, { x: e.c.x + e.r, y: e.c.y + e.r }];
    case 'arc': return [{ x: e.c.x - e.r, y: e.c.y - e.r }, { x: e.c.x + e.r, y: e.c.y + e.r }];
    case 'text': return [e.pos];
    case 'point': return [e.p];
  }
}

function moverEnt(e: Ent, dx: number, dy: number): Ent {
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

function gerarDxf(ents: Ent[]): string {
  const corpo: string[] = [];
  const E = (tipo: string, linhas: (string | number)[]) => corpo.push('0', tipo, '8', '0', ...linhas.map(String));
  for (const e of ents) {
    if (e.t === 'line') E('LINE', ['10', e.a.x.toFixed(3), '20', e.a.y.toFixed(3), '11', e.b.x.toFixed(3), '21', e.b.y.toFixed(3)]);
    else if (e.t === 'poly') { const p: (string | number)[] = ['90', e.pts.length, '70', e.fechada ? 1 : 0]; e.pts.forEach((q) => p.push('10', q.x.toFixed(3), '20', q.y.toFixed(3))); E('LWPOLYLINE', p); }
    else if (e.t === 'circle') E('CIRCLE', ['10', e.c.x.toFixed(3), '20', e.c.y.toFixed(3), '40', e.r.toFixed(3)]);
    else if (e.t === 'arc') E('ARC', ['10', e.c.x.toFixed(3), '20', e.c.y.toFixed(3), '40', e.r.toFixed(3), '50', e.a0.toFixed(3), '51', e.a1.toFixed(3)]);
    else if (e.t === 'text') E('TEXT', ['10', e.pos.x.toFixed(3), '20', e.pos.y.toFixed(3), '40', (e.altura || 2).toFixed(3), '1', e.texto]);
    else if (e.t === 'point') E('POINT', ['10', e.p.x.toFixed(3), '20', e.p.y.toFixed(3)]);
  }
  return ['0', 'SECTION', '2', 'ENTITIES', ...corpo, '0', 'ENDSEC', '0', 'EOF'].join('\n');
}

export default function DxfEditorModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [ents, setEnts] = useState<Ent[]>([]);
  const [nome, setNome] = useState('desenho.dxf');
  const [sel, setSel] = useState<number | null>(null);
  const [modo, setModo] = useState<'sel' | 'linha' | 'texto'>('sel');
  const [view, setView] = useState({ s: 1, px: 0, py: 0 }); // escala + pan (em px de tela)
  const fileRef = useRef<HTMLInputElement>(null);
  const drag = useRef<{ tipo: 'pan' | 'ent'; x: number; y: number; id?: number } | null>(null);
  const linhaTmp = useRef<Pt | null>(null);

  // DXF (y para cima) -> tela (y para baixo): tela.x = (x-minX)*s+px ; tela.y = VH-((y-minY)*s)-py
  const limites = useRef({ minX: 0, minY: 0 });
  const T = (p: Pt) => ({ x: (p.x - limites.current.minX) * view.s + view.px, y: VH - (p.y - limites.current.minY) * view.s - view.py });
  const inv = (sx: number, sy: number): Pt => ({ x: (sx - view.px) / view.s + limites.current.minX, y: (VH - sy - view.py) / view.s + limites.current.minY });

  function enquadrar(lista: Ent[]) {
    const ps = lista.flatMap(pontosDe);
    if (!ps.length) { limites.current = { minX: 0, minY: 0 }; setView({ s: 1, px: PAD, py: PAD }); return; }
    const minX = Math.min(...ps.map((p) => p.x)), maxX = Math.max(...ps.map((p) => p.x));
    const minY = Math.min(...ps.map((p) => p.y)), maxY = Math.max(...ps.map((p) => p.y));
    limites.current = { minX, minY };
    const w = maxX - minX || 1, h = maxY - minY || 1;
    const s = Math.min((VW - 2 * PAD) / w, (VH - 2 * PAD) / h);
    setView({ s, px: PAD, py: PAD });
  }

  useEffect(() => { if (!open) { setEnts([]); setSel(null); setModo('sel'); } }, [open]);

  async function abrir(file: File) {
    const txt = await file.text();
    const lista = dxfParaEnts(importarDxf(txt));
    setNome(file.name);
    setEnts(lista);
    setSel(null);
    enquadrar(lista);
  }

  function baixar() {
    const blob = new Blob([gerarDxf(ents)], { type: 'application/dxf' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = nome.replace(/\.dxf$/i, '') + ' (editado).dxf'; a.click();
    URL.revokeObjectURL(a.href);
  }

  // pega a entidade mais próxima de um ponto de tela (para seleção)
  function pegar(sx: number, sy: number): number | null {
    let melhor: number | null = null, dist = 10;
    for (const e of ents) {
      for (const p of pontosDe(e)) { const t = T(p); const d = Math.hypot(t.x - sx, t.y - sy); if (d < dist) { dist = d; melhor = e.id; } }
    }
    return melhor;
  }

  function svgXY(e: React.PointerEvent | React.MouseEvent) {
    const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * VW, y: ((e.clientY - r.top) / r.height) * VH };
  }

  function onDown(e: React.PointerEvent) {
    const { x, y } = svgXY(e);
    if (modo === 'texto') { const t = window.prompt('Texto:'); if (t) { const g = inv(x, y); setEnts((es) => [...es, { id: nid(), t: 'text', pos: g, texto: t, altura: 12 / view.s }]); } return; }
    if (modo === 'linha') {
      const g = inv(x, y);
      if (!linhaTmp.current) { linhaTmp.current = g; }
      else { const a = linhaTmp.current; setEnts((es) => [...es, { id: nid(), t: 'line', a, b: g }]); linhaTmp.current = null; }
      return;
    }
    const id = pegar(x, y);
    setSel(id);
    if (id != null) { drag.current = { tipo: 'ent', x, y, id }; }
    else { drag.current = { tipo: 'pan', x, y }; }
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
  }
  function onMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const { x, y } = svgXY(e);
    const dx = x - drag.current.x, dy = y - drag.current.y;
    if (drag.current.tipo === 'pan') { setView((v) => ({ ...v, px: v.px + dx, py: v.py - dy })); }
    else if (drag.current.id != null) { const gdx = dx / view.s, gdy = -dy / view.s; const id = drag.current.id; setEnts((es) => es.map((en) => (en.id === id ? moverEnt(en, gdx, gdy) : en))); }
    drag.current.x = x; drag.current.y = y;
  }
  function onUp() { drag.current = null; }
  function onWheel(e: React.WheelEvent) { const f = e.deltaY < 0 ? 1.15 : 1 / 1.15; setView((v) => ({ ...v, s: Math.max(0.01, v.s * f) })); }

  function apagar() { if (sel != null) { setEnts((es) => es.filter((e) => e.id !== sel)); setSel(null); } }

  useEffect(() => {
    function k(e: KeyboardEvent) { if ((e.key === 'Delete' || e.key === 'Backspace') && sel != null) { e.preventDefault(); apagar(); } }
    if (open) window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sel]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] w-[94vw] max-w-[94vw] flex-col p-3">
        <DialogHeader className="border-b pb-2">
          <DialogTitle className="flex items-center gap-2 text-base font-bold"><PenTool className="size-5 text-primary" /> Editor de DXF (isolado — não afeta o projeto)</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-1.5 py-2">
          <input ref={fileRef} type="file" accept=".dxf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) abrir(f); e.currentTarget.value = ''; }} />
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}><Upload className="size-4" /> Abrir DXF</Button>
          <div className="mx-1 h-6 w-px bg-border" />
          <Button size="sm" variant={modo === 'sel' ? 'default' : 'outline'} onClick={() => { setModo('sel'); linhaTmp.current = null; }} title="Selecionar e mover"><MousePointer2 className="size-4" /> Selecionar</Button>
          <Button size="sm" variant={modo === 'linha' ? 'default' : 'outline'} onClick={() => { setModo('linha'); }} title="Adicionar linha (2 cliques)"><PenTool className="size-4" /> Linha</Button>
          <Button size="sm" variant={modo === 'texto' ? 'default' : 'outline'} onClick={() => { setModo('texto'); }} title="Adicionar texto"><Type className="size-4" /> Texto</Button>
          <Button size="sm" variant="outline" disabled={sel == null} onClick={apagar} title="Apagar selecionado (Delete)"><Trash2 className="size-4" /> Apagar</Button>
          <Button size="sm" variant="outline" onClick={() => enquadrar(ents)} title="Enquadrar"><Maximize className="size-4" /> Enquadrar</Button>
          <span className="ml-auto text-xs text-muted-foreground">{ents.length} entidade(s) · {nome}</span>
          <Button size="sm" disabled={!ents.length} onClick={baixar}><Download className="size-4" /> Baixar DXF</Button>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-white">
          {ents.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Abra um arquivo DXF para visualizar e editar.</div>
          ) : (
            <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height="100%" style={{ touchAction: 'none', cursor: modo === 'sel' ? 'default' : 'crosshair' }}
              onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onWheel={onWheel}>
              {ents.map((e) => {
                const on = e.id === sel;
                const cor = on ? '#dc2626' : '#0f172a';
                const sw = on ? 1.8 : 0.8;
                if (e.t === 'line') { const a = T(e.a), b = T(e.b); return <line key={e.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={cor} strokeWidth={sw} />; }
                if (e.t === 'poly') { const pp = e.pts.map((p) => { const t = T(p); return `${t.x.toFixed(1)},${t.y.toFixed(1)}`; }).join(' '); return e.fechada ? <polygon key={e.id} points={pp} fill="none" stroke={cor} strokeWidth={sw} /> : <polyline key={e.id} points={pp} fill="none" stroke={cor} strokeWidth={sw} />; }
                if (e.t === 'circle') { const c = T(e.c); return <circle key={e.id} cx={c.x} cy={c.y} r={e.r * view.s} fill="none" stroke={cor} strokeWidth={sw} />; }
                if (e.t === 'arc') {
                  const a0 = (e.a0 * Math.PI) / 180, a1 = (e.a1 * Math.PI) / 180;
                  const p0 = T({ x: e.c.x + e.r * Math.cos(a0), y: e.c.y + e.r * Math.sin(a0) });
                  const p1 = T({ x: e.c.x + e.r * Math.cos(a1), y: e.c.y + e.r * Math.sin(a1) });
                  const rr = e.r * view.s; const grande = ((e.a1 - e.a0 + 360) % 360) > 180 ? 1 : 0;
                  return <path key={e.id} d={`M ${p0.x} ${p0.y} A ${rr} ${rr} 0 ${grande} 0 ${p1.x} ${p1.y}`} fill="none" stroke={cor} strokeWidth={sw} />;
                }
                if (e.t === 'text') { const p = T(e.pos); const fz = Math.max(7, (e.altura || 2) * view.s); return <text key={e.id} x={p.x} y={p.y} fontSize={fz} fill={cor}>{e.texto}</text>; }
                const pt = T(e.p); return <circle key={e.id} cx={pt.x} cy={pt.y} r={on ? 3 : 1.6} fill={cor} />;
              })}
            </svg>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">Arraste o fundo para mover · roda do mouse dá zoom · clique numa entidade para selecionar e arrastar · Delete apaga. Símbolos em BLOCO (INSERT) ainda não são desenhados nesta versão.</p>
      </DialogContent>
    </Dialog>
  );
}
