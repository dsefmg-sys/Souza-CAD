'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, Download, FileText, MousePointer2, PenTool, Type, Trash2, Maximize, Waypoints, Square, Circle, Spline, Check, X, Undo2, Redo2, Magnet, Copy, RotateCw, Expand, FlipHorizontal, FlipVertical, Layers, Eye, EyeOff, Lock, LockOpen, Plus } from 'lucide-react';
import { importarDxf } from '@/lib/io/dxf';
import {
  type Pt, type Ent, type Camada, novoId, dxfParaEnts, pontosDe, moverEnt, gerarDxf,
  criarPolilinha, criarRetangulo, criarCirculo, criarArco,
  todosPontosSnap, encontrarSnap, pivoDe, girarEnt, escalarEnt, espelharEnt, copiarEnt,
  camadaDe, camadasPadrao,
} from '@/lib/cad/dxfEngine';
import { gerarPdfDesenho } from '@/lib/cad/dxfPdf';
import { confirmar, avisar, perguntar } from '@/lib/ui/dialogos';

// Editor de DXF GENÉRICO e ISOLADO (ex.: projeto elétrico). Não toca no projeto de agrimensura.
// Esta é a CASCA VISUAL (modal, botões, SVG); a geometria/edição pura vive em lib/cad/dxfEngine.ts
// (zero dependência de React/UI — copiável para outro app junto com dxf.ts).

const VW = 1100, VH = 720, PAD = 30;

type Modo = 'sel' | 'linha' | 'texto' | 'poly' | 'ret' | 'circ' | 'arco';

export default function DxfEditorModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [ents, setEnts] = useState<Ent[]>([]);
  const [nome, setNome] = useState('desenho.dxf');
  const [sel, setSel] = useState<number | null>(null);
  const [modo, setModo] = useState<Modo>('sel');
  const [view, setView] = useState({ s: 1, px: 0, py: 0 }); // escala + pan (em px de tela)
  const [desenho, setDesenho] = useState<Pt[]>([]);   // pontos já clicados do desenho em andamento (coords do desenho)
  const [cursor, setCursor] = useState<Pt | null>(null); // posição atual do mouse (coords do desenho), para a prévia
  const [snapAtivo, setSnapAtivo] = useState(true);
  const [snapAtual, setSnapAtual] = useState<Pt | null>(null); // ponto notável encaixado agora (para o marcador visual)
  const [camadas, setCamadas] = useState<Camada[]>(camadasPadrao());
  const [camadaAtual, setCamadaAtual] = useState('0'); // camada em que novas entidades nascem
  const [painelCamadas, setPainelCamadas] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const drag = useRef<{ tipo: 'pan' | 'ent'; x: number; y: number; id?: number } | null>(null);
  const dragSnapped = useRef(false); // já guardou o "antes" deste arrasto? (snap só na 1ª mexida)

  // ---- desfazer/refazer: pilha de estados anteriores de `ents` (transação = 1 edição completa) ----
  const histRef = useRef<Ent[][]>([]);
  const redoRef = useRef<Ent[][]>([]);
  const [, setHistN] = useState(0); // só para forçar re-render dos botões (refs não disparam render)
  function snap() {
    histRef.current.push(ents);
    if (histRef.current.length > 60) histRef.current.shift();
    redoRef.current = [];
    setHistN((n) => n + 1);
  }
  function desfazer() {
    if (!histRef.current.length) return;
    redoRef.current.push(ents);
    const prev = histRef.current.pop()!;
    setEnts(prev); setSel(null); setHistN((n) => n + 1);
  }
  function refazer() {
    if (!redoRef.current.length) return;
    histRef.current.push(ents);
    const next = redoRef.current.pop()!;
    setEnts(next); setSel(null); setHistN((n) => n + 1);
  }

  function trocarModo(m: Modo) { setModo(m); setDesenho([]); setCursor(null); setSnapAtual(null); }

  // ---- camadas: cor/visibilidade/trava por camada; entidades sem `layer` pertencem à '0' ----
  function camadaObj(nome: string): Camada { return camadas.find((c) => c.nome === nome) ?? camadas[0]; }
  function camadaDeEnt(e: Ent): Camada { return camadaObj(camadaDe(e)); }
  async function novaCamadaPrompt() {
    const nome = await perguntar({ titulo: 'Nova camada', mensagem: 'Nome da nova camada:' });
    if (!nome) return;
    if (camadas.some((c) => c.nome === nome)) { await avisar({ titulo: 'Camada', mensagem: 'Já existe uma camada com esse nome.' }); return; }
    setCamadas((cs) => [...cs, { nome, cor: '#2563eb', visivel: true, travada: false }]);
    setCamadaAtual(nome);
  }
  async function removerCamada(nome: string) {
    if (nome === '0') return;
    if (!(await confirmar({ titulo: 'Remover camada', mensagem: `Remover a camada "${nome}"? As entidades dela voltam para a camada "0".`, okLabel: 'Remover', perigo: true }))) return;
    snap();
    setEnts((es) => es.map((e) => (camadaDe(e) === nome ? { ...e, layer: '0' } : e)));
    setCamadas((cs) => cs.filter((c) => c.nome !== nome));
    if (camadaAtual === nome) setCamadaAtual('0');
  }

  // ---- snap aos pontos notáveis (extremidade/meio/centro) — só nos modos de desenho ----
  const candidatosSnap = useMemo(() => todosPontosSnap(ents), [ents]);
  /** Ponto notável mais perto de `g`, se o snap estiver ativo e dentro da tolerância (~9px de tela). */
  function acharSnap(g: Pt) {
    if (!snapAtivo || modo === 'sel') return null;
    return encontrarSnap(g, candidatosSnap, 9 / view.s);
  }
  /** Resolve o ponto do clique: usa o encaixe notável quando houver um perto. */
  function resolverPonto(g: Pt): Pt { const hit = acharSnap(g); return hit ? hit.p : g; }

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

  useEffect(() => { if (!open) { setEnts([]); setSel(null); setModo('sel'); setDesenho([]); setCursor(null); setSnapAtual(null); setCamadas(camadasPadrao()); setCamadaAtual('0'); setPainelCamadas(false); histRef.current = []; redoRef.current = []; } }, [open]);

  async function abrir(file: File) {
    let lista: Ent[];
    try {
      const txt = await file.text();
      lista = dxfParaEnts(importarDxf(txt));
    } catch {
      await avisar({ titulo: 'Abrir DXF', mensagem: 'Não consegui ler este arquivo como DXF. Verifique se é um .dxf válido (ASCII).' });
      return;
    }
    if (!lista.length) { await avisar({ titulo: 'Abrir DXF', mensagem: 'Nenhuma entidade reconhecida neste DXF (linha, polilinha, círculo, arco, texto ou ponto).' }); return; }
    setNome(file.name);
    setEnts(lista);
    setSel(null);
    setDesenho([]); setCursor(null); setSnapAtual(null);
    const coresCamadas = ['#2563eb', '#dc2626', '#16a34a', '#ea580c', '#0891b2', '#db2777', '#9333ea', '#4b5563', '#eab308'];
    const layersFound = new Set<string>();
    lista.forEach(e => {
      if (e.layer) {
        layersFound.add(e.layer);
      }
    });
    const novasCamadas = [{ nome: '0', cor: '#0f172a', visivel: true, travada: false }];
    let colorIdx = 0;
    layersFound.forEach(name => {
      if (name !== '0' && name.trim() !== '') {
        const cor = coresCamadas[colorIdx % coresCamadas.length];
        novasCamadas.push({ nome: name, cor, visivel: true, travada: false });
        colorIdx++;
      }
    });
    setCamadas(novasCamadas);
    setCamadaAtual('0'); // novo documento: camadas do arquivo preservadas e ativada a padrão '0'
    enquadrar(lista);
    histRef.current = []; redoRef.current = []; setHistN(0); // novo documento: histórico zera
  }

  function baixar() {
    const blob = new Blob([gerarDxf(ents)], { type: 'application/dxf' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = nome.replace(/\.dxf$/i, '') + ' (editado).dxf'; a.click();
    URL.revokeObjectURL(a.href);
  }
  function baixarPdf() { gerarPdfDesenho(ents, camadas, nome); }

  // pega a entidade mais próxima de um ponto de tela (para seleção). Ignora camadas ocultas/travadas.
  function pegar(sx: number, sy: number): number | null {
    let melhor: number | null = null, dist = 10;
    for (const e of ents) {
      const lay = camadaDeEnt(e);
      if (!lay.visivel || lay.travada) continue;
      for (const p of pontosDe(e)) { const t = T(p); const d = Math.hypot(t.x - sx, t.y - sy); if (d < dist) { dist = d; melhor = e.id; } }
    }
    return melhor;
  }

  function svgXY(e: React.PointerEvent | React.MouseEvent) {
    const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * VW, y: ((e.clientY - r.top) / r.height) * VH };
  }

  // Finaliza a polilinha em andamento (aberta ou fechada) e volta ao modo neutro dela.
  function finalizarPoly(fechar: boolean) {
    if (desenho.length >= 2) { snap(); setEnts((es) => [...es, { ...criarPolilinha(desenho, fechar), layer: camadaAtual }]); }
    setDesenho([]); setCursor(null); setSnapAtual(null);
  }

  async function onDown(e: React.PointerEvent) {
    const { x, y } = svgXY(e);
    const g = resolverPonto(inv(x, y));

    if (modo !== 'sel' && desenho.length === 0 && camadaObj(camadaAtual).travada) {
      await avisar({ titulo: 'Camada travada', mensagem: 'A camada atual está travada. Escolha outra camada (painel Camadas) para desenhar.' });
      return;
    }

    if (modo === 'texto') { const t = await perguntar({ titulo: 'Texto' }); if (t) { snap(); setEnts((es) => [...es, { id: novoId(), t: 'text', pos: g, texto: t, altura: 12 / view.s, layer: camadaAtual }]); } return; }

    if (modo === 'linha') {
      if (desenho.length === 0) { setDesenho([g]); return; }
      snap(); setEnts((es) => [...es, { id: novoId(), t: 'line', a: desenho[0], b: g, layer: camadaAtual }]);
      setDesenho([]); setCursor(null); setSnapAtual(null);
      return;
    }
    if (modo === 'poly') {
      // clicar perto do primeiro ponto (com 3+ pontos) fecha o polígono
      if (desenho.length >= 3) {
        const p0 = T(desenho[0]);
        if (Math.hypot(p0.x - x, p0.y - y) < 10) { finalizarPoly(true); return; }
      }
      setDesenho((d) => [...d, g]);
      return;
    }
    if (modo === 'ret') {
      if (desenho.length === 0) { setDesenho([g]); return; }
      snap(); setEnts((es) => [...es, { ...criarRetangulo(desenho[0], g), layer: camadaAtual }]);
      setDesenho([]); setCursor(null); setSnapAtual(null);
      return;
    }
    if (modo === 'circ') {
      if (desenho.length === 0) { setDesenho([g]); return; }
      snap(); setEnts((es) => [...es, { ...criarCirculo(desenho[0], g), layer: camadaAtual }]);
      setDesenho([]); setCursor(null); setSnapAtual(null);
      return;
    }
    if (modo === 'arco') {
      if (desenho.length < 2) { setDesenho((d) => [...d, g]); return; }
      snap(); setEnts((es) => [...es, { ...criarArco(desenho[0], desenho[1], g), layer: camadaAtual }]);
      setDesenho([]); setCursor(null); setSnapAtual(null);
      return;
    }

    const id = pegar(x, y);
    setSel(id);
    if (id != null) { drag.current = { tipo: 'ent', x, y, id }; dragSnapped.current = false; }
    else { drag.current = { tipo: 'pan', x, y }; }
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
  }
  function onMove(e: React.PointerEvent) {
    const { x, y } = svgXY(e);
    if (modo !== 'sel') {
      const g = inv(x, y);
      const hit = acharSnap(g);
      setSnapAtual(hit ? hit.p : null);
      setCursor(hit ? hit.p : g);
    }
    if (!drag.current) return;
    const dx = x - drag.current.x, dy = y - drag.current.y;
    if (drag.current.tipo === 'pan') { setView((v) => ({ ...v, px: v.px + dx, py: v.py - dy })); }
    else if (drag.current.id != null) {
      if (!dragSnapped.current) { snap(); dragSnapped.current = true; } // 1ª mexida do arrasto: guarda o "antes"
      const gdx = dx / view.s, gdy = -dy / view.s; const id = drag.current.id;
      setEnts((es) => es.map((en) => (en.id === id ? moverEnt(en, gdx, gdy) : en)));
    }
    drag.current.x = x; drag.current.y = y;
  }
  function onUp() { drag.current = null; }
  function onWheel(e: React.WheelEvent) { const f = e.deltaY < 0 ? 1.15 : 1 / 1.15; setView((v) => ({ ...v, s: Math.max(0.01, v.s * f) })); }

  function apagar() { if (sel != null) { snap(); setEnts((es) => es.filter((e) => e.id !== sel)); setSel(null); } }

  // ---- Modificar (agem sobre a entidade SELECIONADA): copiar, girar, escalar, espelhar ----
  const entSel = sel != null ? ents.find((e) => e.id === sel) ?? null : null;
  function copiarSel() {
    if (!entSel) return;
    snap();
    const off = 24 / view.s; // desloca a cópia (~24px de tela) para não empilhar em cima do original
    const nova = copiarEnt(entSel, off, -off);
    setEnts((es) => [...es, nova]);
    setSel(nova.id);
  }
  async function girarSel() {
    if (!entSel) return;
    const txt = await perguntar({ titulo: 'Girar', mensagem: 'Girar quantos graus? (positivo = anti-horário)', valorInicial: '90' });
    if (txt == null) return;
    const ang = Number(txt.replace(',', '.'));
    if (!Number.isFinite(ang) || ang === 0) return;
    snap();
    const c = pivoDe(entSel);
    setEnts((es) => es.map((e) => (e.id === sel ? girarEnt(e, c, ang) : e)));
  }
  async function escalarSel() {
    if (!entSel) return;
    const txt = await perguntar({ titulo: 'Escala', mensagem: 'Fator de escala (ex.: 2 dobra o tamanho, 0.5 reduz à metade)', valorInicial: '1.5' });
    if (txt == null) return;
    const k = Number(txt.replace(',', '.'));
    if (!Number.isFinite(k) || k <= 0 || k === 1) return;
    snap();
    const c = pivoDe(entSel);
    setEnts((es) => es.map((e) => (e.id === sel ? escalarEnt(e, c, k) : e)));
  }
  function espelharSel(eixo: 'h' | 'v') {
    if (!entSel) return;
    const c = pivoDe(entSel);
    // eixo 'h' inverte esquerda/direita (reflete pela reta VERTICAL que passa no centro);
    // eixo 'v' inverte cima/baixo (reflete pela reta HORIZONTAL que passa no centro).
    const p2 = eixo === 'h' ? { x: c.x, y: c.y + 1 } : { x: c.x + 1, y: c.y };
    snap();
    setEnts((es) => es.map((e) => (e.id === sel ? espelharEnt(e, c, p2) : e)));
  }

  useEffect(() => {
    function k(e: KeyboardEvent) {
      if (e.key === 'Escape') { setDesenho([]); setCursor(null); setSnapAtual(null); return; }
      if (e.key === 'Enter' && modo === 'poly' && desenho.length >= 2) { finalizarPoly(false); return; }
      if ((e.key === 'Delete' || e.key === 'Backspace') && sel != null && modo === 'sel') { e.preventDefault(); apagar(); return; }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); desfazer(); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) { e.preventDefault(); refazer(); return; }
    }
    if (open) window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sel, modo, desenho, ents]);

  // ---- prévia (ghost) do que está sendo desenhado, seguindo o cursor ----
  function Previa() {
    if (!cursor) return null;
    const c = T(cursor);
    if (modo === 'linha' && desenho.length === 1) { const a = T(desenho[0]); return <line x1={a.x} y1={a.y} x2={c.x} y2={c.y} stroke="#2563eb" strokeWidth={1} strokeDasharray="4 3" />; }
    if (modo === 'poly' && desenho.length >= 1) {
      const pp = [...desenho, cursor].map((p) => { const t = T(p); return `${t.x},${t.y}`; }).join(' ');
      return <polyline points={pp} fill="none" stroke="#2563eb" strokeWidth={1} strokeDasharray="4 3" />;
    }
    if (modo === 'ret' && desenho.length === 1) {
      const a = T(desenho[0]);
      return <rect x={Math.min(a.x, c.x)} y={Math.min(a.y, c.y)} width={Math.abs(c.x - a.x)} height={Math.abs(c.y - a.y)} fill="none" stroke="#2563eb" strokeWidth={1} strokeDasharray="4 3" />;
    }
    if (modo === 'circ' && desenho.length === 1) {
      const a = T(desenho[0]); const r = Math.hypot(c.x - a.x, c.y - a.y);
      return <circle cx={a.x} cy={a.y} r={r} fill="none" stroke="#2563eb" strokeWidth={1} strokeDasharray="4 3" />;
    }
    if (modo === 'arco') {
      if (desenho.length === 1) { const a = T(desenho[0]); return <line x1={a.x} y1={a.y} x2={c.x} y2={c.y} stroke="#2563eb" strokeWidth={1} strokeDasharray="4 3" />; }
      if (desenho.length === 2) {
        const cc = T(desenho[0]); const r = Math.hypot(T(desenho[1]).x - cc.x, T(desenho[1]).y - cc.y);
        return <>
          <circle cx={cc.x} cy={cc.y} r={r} fill="none" stroke="#94a3b8" strokeWidth={0.6} strokeDasharray="2 3" />
          <line x1={cc.x} y1={cc.y} x2={c.x} y2={c.y} stroke="#2563eb" strokeWidth={1} strokeDasharray="4 3" />
        </>;
      }
    }
    return null;
  }

  /** Marcador (quadrado verde) sobre o ponto notável encaixado agora, para o usuário ver o snap acontecendo. */
  function MarcadorSnap() {
    if (!snapAtual) return null;
    const p = T(snapAtual);
    return <rect x={p.x - 5} y={p.y - 5} width={10} height={10} fill="none" stroke="#16a34a" strokeWidth={1.6} />;
  }

  async function handleCloseRequest() {
    if (ents.length > 0 || histRef.current.length > 0) {
      const ok = await confirmar({
        titulo: 'Fechar editor',
        mensagem: 'Você fez alterações no DXF. Deseja realmente fechar o editor e descartar as alterações?',
        okLabel: 'Descartar e fechar',
        perigo: true
      });
      if (!ok) return;
    }
    onOpenChange(false);
  }

  const emDesenho = modo !== 'sel' && modo !== 'texto';
  const dica: Record<Modo, string> = {
    sel: 'Arraste o fundo para mover · roda do mouse dá zoom · clique numa entidade para selecionar e arrastar · Delete apaga.',
    texto: 'Clique no desenho para inserir um texto.',
    linha: 'Clique o ponto inicial e depois o ponto final. Esc cancela.',
    poly: 'Clique cada vértice. Clique perto do 1º ponto para fechar, Enter finaliza aberta, Esc cancela.',
    ret: 'Clique um canto e depois o canto oposto. Esc cancela.',
    circ: 'Clique o centro e depois um ponto da borda (define o raio). Esc cancela.',
    arco: 'Clique o centro, depois o início e depois o fim do arco. Esc cancela.',
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleCloseRequest(); else onOpenChange(val); }}>
      <DialogContent className="flex h-[92vh] w-[94vw] max-w-[94vw] flex-col p-3">
        <DialogHeader className="border-b pb-2">
          <DialogTitle className="flex items-center gap-2 text-base font-bold"><PenTool className="size-5 text-primary" /> Editor de DXF (isolado — não afeta o projeto)</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-1.5 py-2">
          <input ref={fileRef} type="file" accept=".dxf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) abrir(f); e.currentTarget.value = ''; }} />
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}><Upload className="size-4" /> Abrir DXF</Button>
          <div className="mx-1 h-6 w-px bg-border" />
          <Button size="sm" variant={modo === 'sel' ? 'default' : 'outline'} onClick={() => trocarModo('sel')} title="Selecionar e mover"><MousePointer2 className="size-4" /> Selecionar</Button>
          <Button size="sm" variant={modo === 'linha' ? 'default' : 'outline'} onClick={() => trocarModo('linha')} title="Linha (2 cliques)"><PenTool className="size-4" /> Linha</Button>
          <Button size="sm" variant={modo === 'poly' ? 'default' : 'outline'} onClick={() => trocarModo('poly')} title="Polilinha (vários cliques)"><Waypoints className="size-4" /> Polilinha</Button>
          <Button size="sm" variant={modo === 'ret' ? 'default' : 'outline'} onClick={() => trocarModo('ret')} title="Retângulo (2 cantos)"><Square className="size-4" /> Retângulo</Button>
          <Button size="sm" variant={modo === 'circ' ? 'default' : 'outline'} onClick={() => trocarModo('circ')} title="Círculo (centro + raio)"><Circle className="size-4" /> Círculo</Button>
          <Button size="sm" variant={modo === 'arco' ? 'default' : 'outline'} onClick={() => trocarModo('arco')} title="Arco (centro, início, fim)"><Spline className="size-4" /> Arco</Button>
          <Button size="sm" variant={modo === 'texto' ? 'default' : 'outline'} onClick={() => trocarModo('texto')} title="Adicionar texto"><Type className="size-4" /> Texto</Button>
          <div className="mx-1 h-6 w-px bg-border" />
          {modo === 'poly' && desenho.length >= 2 && (
            <>
              <Button size="sm" variant="outline" onClick={() => finalizarPoly(false)} title="Finalizar polilinha aberta (Enter)"><Check className="size-4" /> Finalizar</Button>
              <Button size="sm" variant="ghost" onClick={() => { setDesenho([]); setCursor(null); setSnapAtual(null); }} title="Cancelar (Esc)"><X className="size-4" /></Button>
            </>
          )}
          <Button size="sm" variant="outline" disabled={sel == null} onClick={apagar} title="Apagar selecionado (Delete)"><Trash2 className="size-4" /> Apagar</Button>
          {entSel && (
            <>
              <div className="mx-1 h-6 w-px bg-border" />
              <Button size="sm" variant="outline" onClick={copiarSel} title="Copiar a entidade selecionada"><Copy className="size-4" /></Button>
              <Button size="sm" variant="outline" onClick={girarSel} title="Girar a entidade selecionada (pergunta o ângulo)"><RotateCw className="size-4" /></Button>
              <Button size="sm" variant="outline" onClick={escalarSel} title="Escalar a entidade selecionada (pergunta o fator)"><Expand className="size-4" /></Button>
              <Button size="sm" variant="outline" onClick={() => espelharSel('h')} title="Espelhar esquerda/direita"><FlipHorizontal className="size-4" /></Button>
              <Button size="sm" variant="outline" onClick={() => espelharSel('v')} title="Espelhar cima/baixo"><FlipVertical className="size-4" /></Button>
            </>
          )}
          <div className="mx-1 h-6 w-px bg-border" />
          <Button size="sm" variant="outline" disabled={histRef.current.length === 0} onClick={desfazer} title="Desfazer (Ctrl+Z)"><Undo2 className="size-4" /></Button>
          <Button size="sm" variant="outline" disabled={redoRef.current.length === 0} onClick={refazer} title="Refazer (Ctrl+Y)"><Redo2 className="size-4" /></Button>
          <Button size="sm" variant="outline" onClick={() => enquadrar(ents)} title="Enquadrar"><Maximize className="size-4" /> Enquadrar</Button>
          <Button size="sm" variant="outline" className={snapAtivo ? 'bg-emerald-600 text-white hover:bg-emerald-700' : ''} onClick={() => setSnapAtivo((v) => !v)} title="Snap aos pontos notáveis (extremidade, meio, centro)"><Magnet className="size-4" /></Button>
          <Button size="sm" variant={painelCamadas ? 'default' : 'outline'} onClick={() => setPainelCamadas((v) => !v)} title="Camadas"><Layers className="size-4" /> Camadas</Button>
          <span className="ml-auto text-xs text-muted-foreground">{ents.length} entidade(s) · {nome}</span>
          <Button size="sm" variant="outline" disabled={!ents.length} onClick={baixarPdf} title="Exporta uma folha A4 paisagem, com o desenho enquadrado e centralizado sozinho"><FileText className="size-4" /> PDF A4</Button>
          <Button size="sm" disabled={!ents.length} onClick={baixar}><Download className="size-4" /> Baixar DXF</Button>
        </div>

        {painelCamadas && (
          <div className="flex flex-wrap items-center gap-2 border-y py-2 text-xs">
            <span className="font-semibold">Nova entidade vai para:</span>
            {camadas.map((c) => (
              <div key={c.nome} className={`flex items-center gap-1 rounded-sm border px-1.5 py-1 ${c.nome === camadaAtual ? 'ring-2 ring-primary' : ''}`}>
                <button onClick={() => setCamadaAtual(c.nome)} title="Usar esta camada para novos desenhos" className="font-medium">{c.nome}</button>
                <input type="color" value={c.cor} title="Cor da camada"
                  onChange={(ev) => setCamadas((cs) => cs.map((x) => (x.nome === c.nome ? { ...x, cor: ev.target.value } : x)))}
                  className="size-5 cursor-pointer rounded-sm border-0 p-0" />
                <button onClick={() => setCamadas((cs) => cs.map((x) => (x.nome === c.nome ? { ...x, visivel: !x.visivel } : x)))} title={c.visivel ? 'Ocultar camada' : 'Mostrar camada'}>
                  {c.visivel ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5 text-muted-foreground" />}
                </button>
                <button onClick={() => setCamadas((cs) => cs.map((x) => (x.nome === c.nome ? { ...x, travada: !x.travada } : x)))} title={c.travada ? 'Destravar (voltar a poder editar)' : 'Travar (impede editar/apagar)'}>
                  {c.travada ? <Lock className="size-3.5 text-amber-600" /> : <LockOpen className="size-3.5" />}
                </button>
                {c.nome !== '0' && (
                  <button onClick={() => removerCamada(c.nome)} title="Remover camada (entidades voltam para a '0')"><X className="size-3.5" /></button>
                )}
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={novaCamadaPrompt}><Plus className="size-3.5" /> Nova camada</Button>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-white">
          {ents.length === 0 && !emDesenho ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Abra um arquivo DXF, ou escolha uma ferramenta acima para desenhar do zero.</div>
          ) : (
            <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height="100%" style={{ touchAction: 'none', cursor: modo === 'sel' ? 'default' : 'crosshair' }}
              onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onWheel={onWheel}>
              {ents.filter((e) => camadaDeEnt(e).visivel).map((e) => {
                const on = e.id === sel;
                const cor = on ? '#dc2626' : camadaDeEnt(e).cor;
                const sw = on ? 1.8 : 0.8;
                if (e.t === 'line') { const a = T(e.a), b = T(e.b); return <line key={e.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={cor} strokeWidth={sw} />; }
                if (e.t === 'poly') { const pp = e.pts.map((p) => { const t = T(p); return `${t.x.toFixed(1)},${t.y.toFixed(1)}`; }).join(' '); return e.fechada ? <polygon key={e.id} points={pp} fill="none" stroke={cor} strokeWidth={sw} /> : <polyline key={e.id} points={pp} fill="none" stroke={cor} strokeWidth={sw} />; }
                if (e.t === 'circle') { const c = T(e.c); return <circle key={e.id} cx={c.x} cy={c.y} r={e.r * view.s} fill="none" stroke={cor} strokeWidth={sw} />; }
                if (e.t === 'arc') {
                  const rr = e.r * view.s;
                  const varredura = ((e.a1 - e.a0) % 360 + 360) % 360;
                  // início igual ao fim = volta completa (mesma convenção do PDF) — o path SVG com
                  // pontas coincidentes não desenharia nada
                  if (varredura === 0) { const c = T(e.c); return <circle key={e.id} cx={c.x} cy={c.y} r={rr} fill="none" stroke={cor} strokeWidth={sw} />; }
                  const a0 = (e.a0 * Math.PI) / 180, a1 = (e.a1 * Math.PI) / 180;
                  const p0 = T({ x: e.c.x + e.r * Math.cos(a0), y: e.c.y + e.r * Math.sin(a0) });
                  const p1 = T({ x: e.c.x + e.r * Math.cos(a1), y: e.c.y + e.r * Math.sin(a1) });
                  const grande = varredura > 180 ? 1 : 0;
                  return <path key={e.id} d={`M ${p0.x} ${p0.y} A ${rr} ${rr} 0 ${grande} 0 ${p1.x} ${p1.y}`} fill="none" stroke={cor} strokeWidth={sw} />;
                }
                if (e.t === 'text') { const p = T(e.pos); const fz = Math.max(7, (e.altura || 2) * view.s); return <text key={e.id} x={p.x} y={p.y} fontSize={fz} fill={cor}>{e.texto}</text>; }
                const pt = T(e.p); return <circle key={e.id} cx={pt.x} cy={pt.y} r={on ? 3 : 1.6} fill={cor} />;
              })}
              <Previa />
              <MarcadorSnap />
            </svg>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">{dica[modo]} {snapAtivo ? 'Snap ligado: encaixa em pontas, meios e centros (quadrado verde).' : 'Snap desligado.'} Símbolos em BLOCO (INSERT) ainda não são desenhados nesta versão.</p>
      </DialogContent>
    </Dialog>
  );
}
