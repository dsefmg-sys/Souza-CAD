'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, Type, Square, Circle, Trash2, Download, ArrowUp, ArrowDown, AlignCenterHorizontal, AlignCenterVertical, Palette, Search, Shapes, Images, RefreshCw } from 'lucide-react';
import { type El, FORMATOS_PADRAO as FORMATOS, FONTES_ESTUDIO, novoId as nid, reordenarCamada, centralizarEm, escalaParaCaber } from '@/lib/canvas/canvasEngine';
import { confirmar, avisar, perguntar } from '@/lib/ui/dialogos';

// ESTÚDIO isolado (mini-Canva): tela com formato escolhido, elementos de imagem/texto/forma,
// mover/redimensionar/alinhar/camadas e exportar PNG. Não toca no projeto de agrimensura.
// Esta é a CASCA VISUAL (modal, botões, DOM); os tipos e as funções de camada/alinhamento puras
// vivem em lib/canvas/canvasEngine.ts (zero dependência de React/UI — copiável para outro app).

export default function EstudioModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [fmt, setFmt] = useState({ w: 1080, h: 1080 });
  const [bg, setBg] = useState('#ffffff');
  const [els, setEls] = useState<El[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [box, setBox] = useState({ w: 800, h: 600 });
  const [procFundo, setProcFundo] = useState(false);
  const [painelElem, setPainelElem] = useState(false);
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState<string[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [painelFotos, setPainelFotos] = useState(false);
  const [fotos, setFotos] = useState<string[]>([]);
  const [buscaArte, setBuscaArte] = useState('');
  const [resultadosArte, setResultadosArte] = useState<{ titulo: string; url: string }[]>([]);
  const [buscandoArte, setBuscandoArte] = useState(false);
  const [pexelsKey, setPexelsKey] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const palcoRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; sx: number; sy: number; ox: number; oy: number; modo: 'mover' | 'resize'; ow: number; oh: number } | null>(null);

  const escala = escalaParaCaber(fmt, box);

  // chave Pexels do dono como padrão; pode ser trocada no campo (fica salva no navegador)
  useEffect(() => { if (!open) { setEls([]); setSel(null); } else { setPexelsKey(localStorage.getItem('metrica.pexelsApiKey') || 'uEXpsEUk50vq3Ppp8uyM9gD2ukz8dYV0kuw28LpIDSAjWWieJgkFurF8'); } }, [open]);
  function salvarPexelsKey(v: string) { setPexelsKey(v); localStorage.setItem('metrica.pexelsApiKey', v.trim()); }
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

  // modelos prontos: montam um layout inicial (capa de entrega, carimbo). Substituem o conteúdo atual.
  async function aplicarModelo(nome: string) {
    if (els.length > 0 && !(await confirmar({ titulo: 'Aplicar modelo', mensagem: 'Aplicar o modelo vai substituir o conteúdo atual. Continuar?', okLabel: 'Aplicar' }))) return;
    const W = fmt.w, H = fmt.h;
    if (nome === 'capa') {
      setBg('#0f172a');
      setEls([
        { id: nid(), t: 'rect', x: 0, y: Math.round(H * 0.6), w: W, h: 10, fill: '#22c55e', radius: 0 },
        { id: nid(), t: 'text', x: Math.round(W * 0.08), y: Math.round(H * 0.4), w: Math.round(W * 0.84), h: Math.round(W * 0.09), texto: 'RELATÓRIO DE ENTREGA', size: Math.round(W * 0.06), cor: '#ffffff', bold: true },
        { id: nid(), t: 'text', x: Math.round(W * 0.08), y: Math.round(H * 0.4 + W * 0.08), w: Math.round(W * 0.84), h: Math.round(W * 0.05), texto: 'Georreferenciamento de imóvel rural', size: Math.round(W * 0.03), cor: '#cbd5e1', bold: false },
      ]);
    } else if (nome === 'carimbo') {
      setBg('#ffffff');
      setEls([
        { id: nid(), t: 'rect', x: 20, y: 20, w: W - 40, h: H - 40, fill: '#f1f5f9', radius: 8 },
        { id: nid(), t: 'text', x: 44, y: 44, w: W - 88, h: 64, texto: 'RESPONSÁVEL TÉCNICO', size: Math.round(W * 0.045), cor: '#0f172a', bold: true },
        { id: nid(), t: 'text', x: 44, y: 44 + Math.round(W * 0.06), w: W - 88, h: 48, texto: 'Nome · CFT/CREA · Credenciamento INCRA', size: Math.round(W * 0.028), cor: '#334155', bold: false },
      ]);
    }
    setSel(null);
  }

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
    } catch (err) { await avisar({ titulo: 'Remover fundo', mensagem: 'Não consegui remover o fundo: ' + ((err as Error).message || 'erro') }); }
    finally { setProcFundo(false); }
  }

  // biblioteca de elementos: ícones do Iconify (grátis, sem chave)
  async function buscarElementos() {
    const q = busca.trim(); if (!q) return;
    setBuscando(true);
    try {
      const r = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(q)}&limit=60`);
      const j = await r.json();
      setResultados(Array.isArray(j.icons) ? j.icons : []);
    } catch { setResultados([]); }
    finally { setBuscando(false); }
  }
  async function addIcone(nome: string) {
    try {
      const svg = await fetch(`https://api.iconify.design/${nome}.svg?height=240`).then((r) => r.text());
      const url = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
      const s = Math.min(fmt.w, fmt.h) * 0.25; const id = nid();
      setEls((es) => [...es, { id, t: 'img', src: url, x: (fmt.w - s) / 2, y: (fmt.h - s) / 2, w: s, h: s }]);
      setSel(id);
    } catch { await avisar({ titulo: 'Elemento', mensagem: 'Não consegui carregar este elemento.' }); }
  }

  // banco de fotos: Picsum (picsum.photos), gratuito e sem chave — fotos aleatórias, sem busca por palavra
  function novasFotos() {
    const semente = Date.now();
    setFotos(Array.from({ length: 12 }, (_, i) => `https://picsum.photos/seed/${semente}-${i}/400/300`));
  }
  function addFoto(url: string) {
    const img = new window.Image();
    img.onload = () => {
      const max = Math.min(fmt.w, fmt.h) * 0.7;
      const r = Math.min(max / img.width, max / img.height, 1);
      const w = img.width * r, h = img.height * r;
      const id = nid();
      setEls((es) => [...es, { id, t: 'img', src: url, x: (fmt.w - w) / 2, y: (fmt.h - h) / 2, w, h }]);
      setSel(id);
    };
    img.crossOrigin = 'anonymous';
    img.src = url;
  }

  // busca de obras de arte de domínio público: Art Institute of Chicago (grátis, sem chave)
  async function buscarArtInstitute(q: string): Promise<{ titulo: string; url: string }[]> {
    try {
      const r = await fetch(`https://api.artic.edu/api/v1/artworks/search?q=${encodeURIComponent(q)}&query[term][is_public_domain]=true&fields=id,title,image_id&limit=24`);
      const j = await r.json();
      return (Array.isArray(j.data) ? j.data : [])
        .filter((a: { image_id?: string }) => a.image_id)
        .map((a: { title?: string; image_id: string }) => ({ titulo: a.title || '', url: `https://www.artic.edu/iiif/2/${a.image_id}/full/400,/0/default.jpg` }));
    } catch { return []; }
  }

  // banco de fotos Pexels (fotos e vídeos reais) — precisa de chave grátis gerada em pexels.com/api
  async function buscarPexels(q: string): Promise<{ titulo: string; url: string }[]> {
    if (!pexelsKey.trim()) return [];
    try {
      const r = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=24`, { headers: { Authorization: pexelsKey.trim() } });
      const j = await r.json();
      return (Array.isArray(j.photos) ? j.photos : [])
        .map((p: { alt?: string; src?: { medium?: string } }) => ({ titulo: p.alt || '', url: p.src?.medium || '' }))
        .filter((p: { url: string }) => p.url);
    } catch { return []; }
  }

  // Openverse (WordPress): acervo grande de imagens livres de boa qualidade, sem chave.
  // Uso a miniatura (thumbnail), que vem pelo proxy deles com CORS liberado — importante pra
  // conseguir exportar o PNG depois sem a imagem "sujar" o canvas.
  async function buscarOpenverse(q: string): Promise<{ titulo: string; url: string }[]> {
    try {
      const r = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page_size=24`);
      const j = await r.json();
      return (Array.isArray(j.results) ? j.results : [])
        .map((p: { title?: string; thumbnail?: string; url?: string }) => ({ titulo: p.title || '', url: p.thumbnail || p.url || '' }))
        .filter((p: { url: string }) => p.url);
    } catch { return []; }
  }

  async function buscarArte() {
    const q = buscaArte.trim(); if (!q) return;
    setBuscandoArte(true);
    try {
      // Pexels primeiro (melhor qualidade), depois Openverse (bom e vasto), depois obras de arte
      const [arte, fotosPexels, openv] = await Promise.all([buscarArtInstitute(q), buscarPexels(q), buscarOpenverse(q)]);
      setResultadosArte([...fotosPexels, ...openv, ...arte]);
    } finally { setBuscandoArte(false); }
  }

  function apagar() { if (sel != null) { setEls((es) => es.filter((e) => e.id !== sel)); setSel(null); } }
  function camada(dir: 1 | -1) { if (sel != null) setEls((es) => reordenarCamada(es, sel, dir)); }
  function centrar(eixo: 'h' | 'v') {
    if (!selEl) return;
    const v = centralizarEm(selEl, fmt, eixo);
    patch(selEl.id, (eixo === 'h' ? { x: v } : { y: v }) as Partial<El>);
  }

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
    const comum: React.CSSProperties = { position: 'absolute', left: e.x, top: e.y, width: e.w, height: e.h, cursor: 'move', outline: on ? '2px solid #2563eb' : 'none', transform: e.rot ? `rotate(${e.rot}deg)` : undefined };
    const handle = on && (
      <div onPointerDown={(ev) => down(ev, e.id, 'resize')} style={{ position: 'absolute', right: -7, bottom: -7, width: 14, height: 14, background: '#2563eb', border: '2px solid #fff', borderRadius: 3, cursor: 'nwse-resize' }} />
    );
    if (e.t === 'img') return <div key={e.id} style={comum} onPointerDown={(ev) => down(ev, e.id, 'mover')}><img src={e.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'fill', pointerEvents: 'none' }} draggable={false} />{handle}</div>;
    if (e.t === 'rect') return <div key={e.id} style={{ ...comum, background: e.fill, borderRadius: e.radius }} onPointerDown={(ev) => down(ev, e.id, 'mover')}>{handle}</div>;
    if (e.t === 'ellipse') return <div key={e.id} style={{ ...comum, background: e.fill, borderRadius: '50%' }} onPointerDown={(ev) => down(ev, e.id, 'mover')}>{handle}</div>;
    return (
      <div key={e.id} style={{ ...comum, display: 'flex', alignItems: 'center', justifyContent: 'center', color: e.cor, fontSize: e.size, fontWeight: e.bold ? 700 : 400, textAlign: 'center', lineHeight: 1.1, fontFamily: FONTES_ESTUDIO.find((f) => f.nome === e.fonte)?.css ?? 'Arial, Helvetica, sans-serif', overflow: 'visible' }}
        onPointerDown={(ev) => down(ev, e.id, 'mover')}
        onDoubleClick={async () => { const t = await perguntar({ titulo: 'Texto', valorInicial: e.texto }); if (t != null) patch(e.id, { texto: t } as Partial<El>); }}>
        {e.texto}{handle}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-screen w-screen max-w-none flex-col gap-0 rounded-none border-0 p-3 sm:rounded-none">
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
          <Button size="sm" variant={painelElem ? 'default' : 'outline'} onClick={() => setPainelElem((v) => !v)}><Shapes className="size-4" /> Elementos</Button>
          <Button size="sm" variant={painelFotos ? 'default' : 'outline'} onClick={() => { setPainelFotos((v) => !v); if (!painelFotos && fotos.length === 0) novasFotos(); }}><Images className="size-4" /> Fotos</Button>
          <select className="h-8 rounded border bg-background px-2 text-sm" value="" onChange={(e) => { if (e.target.value) aplicarModelo(e.target.value); e.currentTarget.value = ''; }} title="Modelos prontos (capa, carimbo)">
            <option value="">Modelos…</option>
            <option value="capa">Capa de entrega</option>
            <option value="carimbo">Carimbo simples</option>
          </select>
          <div className="mx-1 h-6 w-px bg-border" />
          <Button size="sm" variant="outline" disabled={sel == null} onClick={() => centrar('h')} title="Centralizar na horizontal"><AlignCenterVertical className="size-4" /></Button>
          <Button size="sm" variant="outline" disabled={sel == null} onClick={() => centrar('v')} title="Centralizar na vertical"><AlignCenterHorizontal className="size-4" /></Button>
          <Button size="sm" variant="outline" disabled={sel == null} onClick={() => camada(1)} title="Trazer para frente"><ArrowUp className="size-4" /></Button>
          <Button size="sm" variant="outline" disabled={sel == null} onClick={() => camada(-1)} title="Enviar para trás"><ArrowDown className="size-4" /></Button>
          <Button size="sm" variant="outline" disabled={sel == null} onClick={apagar} title="Apagar (Delete)"><Trash2 className="size-4" /></Button>
          <Button size="sm" className="ml-auto" onClick={exportar}><Download className="size-4" /> Baixar PNG</Button>
        </div>

        {/* biblioteca de elementos (ícones Iconify, grátis) */}
        {painelElem && (
          <div className="flex flex-col gap-2 border-y py-2">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold">Elementos:</span>
              <input className="h-8 w-64 rounded border bg-background px-2 text-sm" placeholder="Buscar ícone (ex.: casa, sol, raio, seta)" value={busca}
                onChange={(e) => setBusca(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') buscarElementos(); }} />
              <Button size="sm" variant="outline" disabled={buscando} onClick={buscarElementos}><Search className="size-4" /> {buscando ? 'Buscando…' : 'Buscar'}</Button>
              <span className="text-muted-foreground">Ícones gratuitos. Fotos de banco de imagem já estão no botão "Fotos" ao lado.</span>
            </div>
            {resultados.length > 0 && (
              <div className="grid max-h-28 grid-flow-col grid-rows-2 gap-1 overflow-x-auto rounded border bg-muted/20 p-1.5">
                {resultados.map((n) => (
                  <button key={n} type="button" title={n} onClick={() => addIcone(n)} className="flex size-11 shrink-0 items-center justify-center rounded border bg-background hover:bg-muted">
                    <img src={`https://api.iconify.design/${n}.svg?height=28`} alt={n} width={28} height={28} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* banco de fotos: busca por palavra (obras de arte de domínio público) + fotos aleatórias */}
        {painelFotos && (
          <div className="flex flex-col gap-2 border-y py-2">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold">Buscar fotos:</span>
              <input className="h-8 w-64 rounded border bg-background px-2 text-sm" placeholder="Buscar fotos ou obras de arte (ex.: praia, cachorro, montanha)" value={buscaArte}
                onChange={(e) => setBuscaArte(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') buscarArte(); }} />
              <Button size="sm" variant="outline" disabled={buscandoArte} onClick={buscarArte}><Search className="size-4" /> {buscandoArte ? 'Buscando…' : 'Buscar'}</Button>
              <span className="text-muted-foreground">Sempre busca no acervo público do Art Institute of Chicago (grátis, sem chave).</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold">Chave Pexels (opcional):</span>
              <input className="h-7 w-72 rounded border bg-background px-2 text-xs font-mono" placeholder="Cole aqui a chave grátis de pexels.com/api para incluir fotos reais na busca"
                value={pexelsKey} onChange={(e) => salvarPexelsKey(e.target.value)} />
              <span className="text-muted-foreground">Gere grátis em pexels.com/api. Fica salva só neste navegador.</span>
            </div>
            {resultadosArte.length > 0 && (
              <div className="grid grid-flow-col grid-rows-2 gap-1.5 overflow-x-auto rounded border bg-muted/20 p-1.5">
                {resultadosArte.map((a) => (
                  <button key={a.url} type="button" title={a.titulo} onClick={() => addFoto(a.url)} className="size-20 shrink-0 overflow-hidden rounded border bg-background hover:opacity-80">
                    <img src={a.url} alt={a.titulo} className="size-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold">Fotos aleatórias:</span>
              <Button size="sm" variant="outline" onClick={novasFotos}><RefreshCw className="size-4" /> Novas fotos</Button>
              <span className="text-muted-foreground">Picsum, grátis e sem chave.</span>
            </div>
            {fotos.length > 0 && (
              <div className="grid grid-flow-col grid-rows-2 gap-1.5 overflow-x-auto rounded border bg-muted/20 p-1.5">
                {fotos.map((url) => (
                  <button key={url} type="button" title="Adicionar esta foto" onClick={() => addFoto(url)} className="size-20 shrink-0 overflow-hidden rounded border bg-background hover:opacity-80">
                    <img src={url} alt="" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

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
            <span>Fonte</span>
            <select className="h-7 rounded border bg-background px-1 text-sm" value={selEl.fonte ?? 'Arial'} onChange={(e) => patch(selEl.id, { fonte: e.target.value } as Partial<El>)}>
              {FONTES_ESTUDIO.map((f) => <option key={f.nome} value={f.nome}>{f.nome}</option>)}
            </select>
          </div>
        )}

        {/* rotação: vale para qualquer elemento selecionado */}
        {selEl && (
          <div className="flex flex-wrap items-center gap-2 border-b py-1.5 text-xs">
            <span className="font-semibold">Girar</span>
            <input type="range" min={0} max={360} step={1} value={selEl.rot ?? 0} onChange={(e) => patch(selEl.id, { rot: Number(e.target.value) } as Partial<El>)} className="w-40" />
            <input type="number" min={0} max={360} className="h-7 w-16 rounded border bg-background px-2 text-sm" value={selEl.rot ?? 0} onChange={(e) => patch(selEl.id, { rot: ((Number(e.target.value) || 0) % 360 + 360) % 360 } as Partial<El>)} />
            <span className="text-muted-foreground">graus</span>
            {!!selEl.rot && <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => patch(selEl.id, { rot: 0 } as Partial<El>)}>Zerar</Button>}
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
