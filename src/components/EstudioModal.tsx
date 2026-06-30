'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, Type, Square, Circle, Trash2, Download, ArrowUp, ArrowDown, AlignCenterHorizontal, AlignCenterVertical, Palette } from 'lucide-react';

// ESTÚDIO isolado (mini-Canva): tela com formato escolhido, elementos de imagem/texto/forma,
// mover/redimensionar/alinhar/camadas e exportar PNG. Não toca no projeto de agrimensura.

type Base = { id: number; x: number; y: number; w: number; h: number };
type El =
  | (Base & { t: 'img'; src: string })
  | (Base & { t: 'text'; texto: string; size: number; cor: string; bold: boolean })
  | (Base & { t: 'rect'; fill: string; radius: number })
  | (Base & { t: 'ellipse'; fill: string });

const FORMATOS: { nome: string; w: number; h: number }[] = [
  { nome: 'Quadrado 1080×1080', w: 1080, h: 1080 },
  { nome: 'Paisagem 1920×1080', w: 1920, h: 1080 },
  { nome: 'Retrato 1080×1920', w: 1080, h: 1920 },
  { nome: 'Story 1080×1920', w: 1080, h: 1920 },
];

let _seq = 1;
const nid = () => _seq++;

export default function EstudioModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [fmt, setFmt] = useState({ w: 1080, h: 1080 });
  const [bg, setBg] = useState('#ffffff');
  const [els, setEls] = useState<El[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [box, setBox] = useState({ w: 800, h: 600 });
  const [procFundo, setProcFundo] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const palcoRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; sx: number; sy: number; ox: number; oy: number; modo: 'mover' | 'resize'; ow: number; oh: number } | null>(null);

  const escala = Math.min(box.w / fmt.w, box.h / fmt.h, 1) || 0.1;

  useEffect(() => { if (!open) { setEls([]); setSel(null); } }, [open]);
  useEffect(() => {
    if (!open) return;
    const medir = () => { const r = areaRef.current?.getBoundingClientRect(); if (r) setBox({ w: r.width - 24, h: r.height - 24 }); };
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [open]);

  const selEl = els.find((e) => e.id === sel) || null;
  const patch = (id: number, p: Partial<El>) => setEls((es) => es.map((e) => (e.id === id ? ({ ...e, ...p } as El) : e)));

  function addImg(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      const img = new window.Image();
      img.onload = () => {
        const max = Math.min(fmt.w, fmt.h) * 0.6;
        const r = Math.min(max / img.width, max / img.height, 1);
        const w = img.width * r, h = img.height * r;
        const id = nid();
        setEls((es) => [...es, { id, t: 'img', src, x: (fmt.w - w) / 2, y: (fmt.h - h) / 2, w, h }]);
        setSel(id);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }
  function addTexto() { const id = nid(); setEls((es) => [...es, { id, t: 'text', x: fmt.w / 2 - 200, y: fmt.h / 2 - 30, w: 400, h: 60, texto: 'Texto', size: 60, cor: '#111111', bold: true }]); setSel(id); }
  function addForma(t: 'rect' | 'ellipse') { const id = nid(); const s = Math.min(fmt.w, fmt.h) * 0.3; setEls((es) => [...es, { id, t, x: (fmt.w - s) / 2, y: (fmt.h - s) / 2, w: s, h: s, fill: t === 'rect' ? '#2563eb' : '#16a34a', radius: 0 } as El]); setSel(id); }

  function down(e: React.PointerEvent, id: number, modo: 'mover' | 'resize') {
    e.stopPropagation();
    setSel(id);
    const el = els.find((x) => x.id === id); if (!el) return;
    drag.current = { id, sx: e.clientX, sy: e.clientY, ox: el.x, oy: el.y, ow: el.w, oh: el.h, modo };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent) {
    if (!drag.current) return;
    const d = drag.current;
    const dx = (e.clientX - d.sx) / escala, dy = (e.clientY - d.sy) / escala;
    if (d.modo === 'mover') patch(d.id, { x: d.ox + dx, y: d.oy + dy } as Partial<El>);
    else patch(d.id, { w: Math.max(20, d.ow + dx), h: Math.max(20, d.oh + dy) } as Partial<El>);
  }
  function up() { drag.current = null; }

  async function removerFundo() {
    const e = selEl; if (!e || e.t !== 'img') return;
    setProcFundo(true);
    try {
      const { removeBackground } = await import('@imgly/background-removal');
      const blob = await removeBackground(e.src);
      const url = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(blob); });
      patch(e.id, { src: url } as Partial<El>);
    } catch (err) { alert('Não consegui remover o fundo: ' + ((err as Error).message || 'erro')); }
    finally { setProcFundo(false); }
  }

  function apagar() { if (sel != null) { setEls((es) => es.filter((e) => e.id !== sel)); setSel(null); } }
  function camada(dir: number) {
    if (sel == null) return;
    setEls((es) => { const i = es.findIndex((e) => e.id === sel); if (i < 0) return es; const j = i + dir; if (j < 0 || j >= es.length) return es; const c = [...es]; [c[i], c[j]] = [c[j], c[i]]; return c; });
  }
  function centrar(eixo: 'h' | 'v') { if (!selEl) return; if (eixo === 'h') patch(selEl.id, { x: (fmt.w - selEl.w) / 2 } as Partial<El>); else patch(selEl.id, { y: (fmt.h - selEl.h) / 2 } as Partial<El>); }

  useEffect(() => {
    function k(e: KeyboardEvent) { const t = e.target as HTMLElement; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return; if ((e.key === 'Delete' || e.key === 'Backspace') && sel != null) { e.preventDefault(); apagar(); } }
    if (open) window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sel]);

  async function exportar() {
    const el = palcoRef.current; if (!el) return;
    setSel(null);
    await new Promise((r) => setTimeout(r, 50));
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(el, { backgroundColor: bg, width: fmt.w, height: fmt.h, scale: 1, useCORS: true });
    const a = document.createElement('a'); a.href = canvas.toDataURL('image/png'); a.download = `estudio ${fmt.w}x${fmt.h}.png`; a.click();
  }

  function renderEl(e: El) {
    const on = e.id === sel;
    const comum: React.CSSProperties = { position: 'absolute', left: e.x, top: e.y, width: e.w, height: e.h, cursor: 'move', outline: on ? '2px solid #2563eb' : 'none' };
    const handle = on && (
      <div onPointerDown={(ev) => down(ev, e.id, 'resize')} style={{ position: 'absolute', right: -7, bottom: -7, width: 14, height: 14, background: '#2563eb', border: '2px solid #fff', borderRadius: 3, cursor: 'nwse-resize' }} />
    );
    if (e.t === 'img') return <div key={e.id} style={comum} onPointerDown={(ev) => down(ev, e.id, 'mover')}><img src={e.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'fill', pointerEvents: 'none' }} draggable={false} />{handle}</div>;
    if (e.t === 'rect') return <div key={e.id} style={{ ...comum, background: e.fill, borderRadius: e.radius }} onPointerDown={(ev) => down(ev, e.id, 'mover')}>{handle}</div>;
    if (e.t === 'ellipse') return <div key={e.id} style={{ ...comum, background: e.fill, borderRadius: '50%' }} onPointerDown={(ev) => down(ev, e.id, 'mover')}>{handle}</div>;
    return (
      <div key={e.id} style={{ ...comum, display: 'flex', alignItems: 'center', justifyContent: 'center', color: e.cor, fontSize: e.size, fontWeight: e.bold ? 700 : 400, textAlign: 'center', lineHeight: 1.1, fontFamily: 'Arial, Helvetica, sans-serif', overflow: 'visible' }}
        onPointerDown={(ev) => down(ev, e.id, 'mover')}
        onDoubleClick={() => { const t = window.prompt('Texto:', e.texto); if (t != null) patch(e.id, { texto: t } as Partial<El>); }}>
        {e.texto}{handle}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[94vh] w-[96vw] max-w-[96vw] flex-col p-3">
        <DialogHeader className="border-b pb-2">
          <DialogTitle className="flex items-center gap-2 text-base font-bold"><ImageIcon className="size-5 text-primary" /> Estúdio (edição de imagem — isolado do projeto)</DialogTitle>
        </DialogHeader>

        {/* barra de ferramentas */}
        <div className="flex flex-wrap items-center gap-1.5 py-2 text-xs">
          <span className="font-semibold">Formato:</span>
          <select className="h-8 rounded border bg-background px-2 text-sm" value={`${fmt.w}x${fmt.h}`} onChange={(e) => { const f = FORMATOS.find((x) => `${x.w}x${x.h}` === e.target.value); if (f) setFmt({ w: f.w, h: f.h }); }}>
            {FORMATOS.map((f) => <option key={f.nome} value={`${f.w}x${f.h}`}>{f.nome}</option>)}
            <option value={`${fmt.w}x${fmt.h}`}>Personalizado</option>
          </select>
          <input type="number" className="h-8 w-20 rounded border bg-background px-2 text-sm" value={fmt.w} onChange={(e) => setFmt((f) => ({ ...f, w: Math.max(50, Number(e.target.value) || 50) }))} title="Largura (px)" />
          <span>×</span>
          <input type="number" className="h-8 w-20 rounded border bg-background px-2 text-sm" value={fmt.h} onChange={(e) => setFmt((f) => ({ ...f, h: Math.max(50, Number(e.target.value) || 50) }))} title="Altura (px)" />
          <label className="ml-1 flex items-center gap-1" title="Cor de fundo"><Palette className="size-4" /><input type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="h-7 w-7 cursor-pointer rounded border" /></label>
          <div className="mx-1 h-6 w-px bg-border" />
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) addImg(f); e.currentTarget.value = ''; }} />
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}><ImageIcon className="size-4" /> Imagem</Button>
          <Button size="sm" variant="outline" onClick={addTexto}><Type className="size-4" /> Texto</Button>
          <Button size="sm" variant="outline" onClick={() => addForma('rect')}><Square className="size-4" /> Retângulo</Button>
          <Button size="sm" variant="outline" onClick={() => addForma('ellipse')}><Circle className="size-4" /> Elipse</Button>
          <div className="mx-1 h-6 w-px bg-border" />
          <Button size="sm" variant="outline" disabled={sel == null} onClick={() => centrar('h')} title="Centralizar na horizontal"><AlignCenterVertical className="size-4" /></Button>
          <Button size="sm" variant="outline" disabled={sel == null} onClick={() => centrar('v')} title="Centralizar na vertical"><AlignCenterHorizontal className="size-4" /></Button>
          <Button size="sm" variant="outline" disabled={sel == null} onClick={() => camada(1)} title="Trazer para frente"><ArrowUp className="size-4" /></Button>
          <Button size="sm" variant="outline" disabled={sel == null} onClick={() => camada(-1)} title="Enviar para trás"><ArrowDown className="size-4" /></Button>
          <Button size="sm" variant="outline" disabled={sel == null} onClick={apagar} title="Apagar (Delete)"><Trash2 className="size-4" /></Button>
          <Button size="sm" className="ml-auto" onClick={exportar}><Download className="size-4" /> Baixar PNG</Button>
        </div>

        {/* propriedades da imagem selecionada */}
        {selEl?.t === 'img' && (
          <div className="flex flex-wrap items-center gap-2 border-y py-1.5 text-xs">
            <span className="font-semibold">Imagem:</span>
            <Button size="sm" variant="outline" className="h-7" disabled={procFundo} onClick={removerFundo}>{procFundo ? 'Removendo fundo…' : 'Remover fundo'}</Button>
            <span className="text-muted-foreground">Roda no navegador, sem custo. A primeira vez baixa o modelo (alguns segundos).</span>
          </div>
        )}

        {/* propriedades do texto selecionado */}
        {selEl?.t === 'text' && (
          <div className="flex flex-wrap items-center gap-2 border-y py-1.5 text-xs">
            <span className="font-semibold">Texto:</span>
            <input className="h-7 w-64 rounded border bg-background px-2 text-sm" value={selEl.texto} onChange={(e) => patch(selEl.id, { texto: e.target.value } as Partial<El>)} />
            <span>Tam.</span><input type="number" className="h-7 w-16 rounded border bg-background px-2 text-sm" value={selEl.size} onChange={(e) => patch(selEl.id, { size: Math.max(6, Number(e.target.value) || 6) } as Partial<El>)} />
            <input type="color" value={selEl.cor} onChange={(e) => patch(selEl.id, { cor: e.target.value } as Partial<El>)} className="h-7 w-7 cursor-pointer rounded border" />
            <Button size="sm" variant={selEl.bold ? 'default' : 'outline'} className="h-7 px-2" onClick={() => patch(selEl.id, { bold: !selEl.bold } as Partial<El>)}>Negrito</Button>
          </div>
        )}

        {/* área de trabalho */}
        <div ref={areaRef} className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg bg-neutral-200 p-3 dark:bg-neutral-800" onPointerMove={move} onPointerUp={up} onPointerDown={() => setSel(null)}>
          <div style={{ width: fmt.w * escala, height: fmt.h * escala }}>
            <div ref={palcoRef} onPointerDown={(e) => e.stopPropagation()}
              style={{ position: 'relative', width: fmt.w, height: fmt.h, background: bg, transform: `scale(${escala})`, transformOrigin: 'top left', boxShadow: '0 2px 12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
              {els.map(renderEl)}
            </div>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">Clique pra selecionar · arraste pra mover · alça azul redimensiona · duplo clique no texto edita · Delete apaga. Remover fundo e biblioteca de elementos vêm nas próximas etapas.</p>
      </DialogContent>
    </Dialog>
  );
}
