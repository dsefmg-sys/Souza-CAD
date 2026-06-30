'use client';

import { useRef, useState, useEffect, type PointerEvent as ReactPointerEvent } from 'react';
import type { Vertex, ImovelData, TecnicoData, EscritorioData, ResultadoCalculo, Confrontante, PlantaConfig, PessoaQualificada, PontoLL } from '@/lib/topo/types';
import { numBR, formatMatricula } from '@/lib/topo/geometry';
import { valoresEfetivos } from '@/lib/topo/conferencia';
import { grausParaDMS, convergenciaMeridiana, meridianoCentral, geoParaUtm, utmParaGeo } from '@/lib/topo/coords';
import { distanciaCota } from '@/lib/topo/objetos';
import { REPRES_LABEL, corDivisa } from '@/lib/topo/sigefVocab';
import type { ObjetoDesenho } from '@/lib/topo/types';

interface Props {
  vertices: Vertex[];
  res: ResultadoCalculo;
  imovel: ImovelData;
  tecnico: TecnicoData;
  escritorio: EscritorioData;
  confrontantes: Confrontante[];
  confrontantePorLado: Record<number, string>;
  zona: number;
  hemisferio: 'N' | 'S';
  glebaNome?: string;
  dataExtenso?: string;
  situacaoUrl?: string;
  outrasGlebas?: { nome: string; pts: { leste: number; norte: number }[] }[];
  objetos?: ObjetoDesenho[];
  config?: PlantaConfig;
  requerente?: PessoaQualificada;
  transmitente?: PessoaQualificada;
  // --- edição na própria planta (opcional; quando ausente, a planta é só visual) ---
  editavel?: boolean;
  modo?: string;
  objetoSelId?: string | null;
  desenhoAtual?: PontoLL[];
  onCliquePlanta?: (lat: number, lon: number) => void;
  onSelecObjeto?: (id: string | null) => void;
  onMoverPontoObjeto?: (id: string, idx: number, lat: number, lon: number) => void;
  onMoverRotuloConf?: (id: string, lat: number, lon: number) => void;
  onMoverRotuloVertice?: (id: string, lat: number, lon: number) => void;
  onEditarConfrontante?: (id: string) => void;                     // duplo clique no rótulo: editar nome/matrícula
  onTamRotuloConf?: (id: string, delta: number) => void;           // ajusta o tamanho da fonte do rótulo
  onAjustarDivisaConf?: (id: string, az: number, len: number) => void; // arrastar a ponta do tique de troca
  onTextoEditar?: (id: string, atual: string) => void;            // clique duplo: editar conteúdo
  onTextoMenu?: (id: string, atual: string, x: number, y: number) => void; // clique direito: formatar
  onMoverFolha?: (dx: number, dy: number) => void;                // arrastar o vazio: reposiciona a folha
  onTextoMover?: (id: string, dx: number, dy: number) => void;     // arrastar o texto: salva o offset
  folhaTravada?: boolean;
  editandoTextoId?: string | null;
  onSetEditandoTextoId?: (id: string | null) => void;
}

/** Ajuste salvo de um texto (conteúdo/escala/negrito/deslocamento). */
export type TextoOverride = { texto?: string; escala?: number; negrito?: boolean; dx?: number; dy?: number };

const LAUDO_PADRAO = 'LAUDO TÉCNICO: Atesto, sob as penas da lei, que efetuei pessoalmente o levantamento da área e que os valores dos azimutes, distâncias e dados de identificação dos confrontantes são os apresentados nesta planta e no memorial que a acompanha.';
const CONFRONT_PADRAO = 'Concordamos com as medidas apresentadas nesta planta e no memorial anexo, no tocante aos espaços em que o referido imóvel faz confrontação com o imóvel de nossa propriedade (§10 do art. 213 da LRP).';

// A3 paisagem @96dpi: 420x297mm
const W = 1587;
const H = 1123;
const CARW = 470;            // largura da coluna de carimbo (direita)
const STRIP = 210;           // altura da faixa inferior (observações/convenções/etc.)
const DRAW = { x0: 95, y0: 26, x1: W - CARW - 26, y1: H - STRIP - 26 };

/** Linhas do rótulo do confrontante na planta, conforme a condition (proprietário/posseiro/espólio). */
function rotuloConfrontanteLinhas(c: Confrontante): string[] {
  const cond = c.condicao ?? 'proprietario';
  const linhas: string[] = [];
  if (cond === 'espolio') {
    linhas.push(/esp[óo]lio/i.test(c.nome) ? c.nome : `Espólio de ${c.nome}`);
    if (c.inventarianteNome) linhas.push(`Inventariante: ${c.inventarianteNome}`);
    if (c.matricula) linhas.push(`Matrícula nº ${formatMatricula(c.matricula)}`);
    return linhas;
  }
  linhas.push(`Nome: ${c.nome}`);
  linhas.push(`CPF: ${c.cpf || '—'}`);
  if (cond === 'posseiro') linhas.push('Possuidor(a)');
  else {
    if (c.matricula) linhas.push(`Matrícula nº ${formatMatricula(c.matricula)}`);
  }
  if (c.conjugeNome) linhas.push(`Cônjuge: ${c.conjugeNome}`);
  return linhas;
}

// Texto editável da planta: aplica override (conteúdo/escala/negrito/posição) e, no modo edição,
// permite clique duplo (editar conteúdo em linha), clique direito (menu de formato) e arrastar para reposicionar.
function Ted(props: {
  id: string; x: number; y: number; base: string; size: number;
  bold?: boolean; anchor?: 'start' | 'middle' | 'end'; fill?: string; slice?: number;
  ov?: TextoOverride; ed?: boolean;
  onEditar?: (id: string, atual: string) => void;
  onMenu?: (id: string, atual: string, x: number, y: number) => void;
  onDragStart?: (id: string, e: ReactPointerEvent) => void;
  halo?: boolean;
  editando?: boolean;
  onTerminarEditar?: (id: string, novoTexto: string) => void;
  onStartEdit?: (id: string) => void;
}) {
  const { id, x, y, base, size, bold, anchor = 'start', fill = '#000', slice, ov, ed, onMenu, onDragStart, halo = false, editando = false, onTerminarEditar, onStartEdit } = props;
  const conteudo = ov?.texto ?? base;
  const texto = slice ? conteudo.slice(0, slice) : conteudo;
  const fz = +(size * (ov?.escala ?? 1)).toFixed(2);
  const peso = (ov?.negrito ?? bold) ? 'bold' : 'normal';

  const [val, setVal] = useState(conteudo);
  useEffect(() => { setVal(conteudo); }, [conteudo, editando]);

  const posX = x + (ov?.dx ?? 0);
  const posY = y + (ov?.dy ?? 0);

  if (editando) {
    const inputW = Math.max(120, fz * val.length * 0.65);
    const inputH = fz * 1.5;
    const offX = anchor === 'middle' ? -inputW / 2 : anchor === 'end' ? -inputW : 0;
    const offY = -fz * 1.15;
    return (
      <foreignObject x={posX + offX} y={posY + offY} width={inputW} height={inputH} style={{ overflow: 'visible' }}>
        <input
          autoFocus
          className="w-full h-full border border-blue-500 bg-white text-black outline-none px-1 shadow-md rounded"
          style={{ fontSize: `${fz}px`, fontWeight: peso, textAlign: anchor === 'middle' ? 'center' : anchor === 'end' ? 'right' : 'left', fontFamily: 'Arial, sans-serif' }}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => onTerminarEditar?.(id, val)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onTerminarEditar?.(id, val);
            } else if (e.key === 'Escape') {
              e.preventDefault();
              onTerminarEditar?.(id, conteudo);
            }
          }}
        />
      </foreignObject>
    );
  }

  return (
    <g style={ed ? { cursor: 'move' } : undefined}
       onDoubleClick={ed ? (e) => { e.stopPropagation(); onStartEdit?.(id); } : undefined}
       onContextMenu={ed ? (e) => { e.preventDefault(); e.stopPropagation(); onMenu?.(id, conteudo, e.clientX, e.clientY); } : undefined}
       onPointerDown={ed ? (e) => { e.stopPropagation(); onDragStart?.(id, e); } : undefined}>
      {halo && (
        <text x={posX} y={posY} fontSize={fz} fontWeight={peso} textAnchor={anchor} fill="#fff" stroke="#fff" strokeWidth={2.6} strokeLinejoin="round">
          {texto}
        </text>
      )}
      <text x={posX} y={posY} fontSize={fz} fontWeight={peso} textAnchor={anchor} fill={fill}>
        {texto}
      </text>
    </g>
  );
}

function intervaloGrade(extent: number): number {
  const alvo = extent / 6;
  const pot = Math.pow(10, Math.floor(Math.log10(alvo)));
  for (const m of [1, 2, 5, 10]) if (pot * m >= alvo) return pot * m;
  return pot * 10;
}

export default function Planta({
  vertices, res, imovel, tecnico, escritorio, confrontantes, confrontantePorLado,
  zona, hemisferio, glebaNome, dataExtenso, situacaoUrl, outrasGlebas = [], objetos = [], config = {},
  requerente, transmitente,
  editavel = false, modo = 'navegar', objetoSelId = null, desenhoAtual = [],
  onCliquePlanta, onSelecObjeto, onMoverPontoObjeto, onMoverRotuloConf, onMoverRotuloVertice,
  onEditarConfrontante, onTamRotuloConf, onAjustarDivisaConf,
  onTextoEditar, onTextoMenu, onMoverFolha, onTextoMover, folhaTravada = true,
  editandoTextoId, onSetEditandoTextoId,
}: Props) {
  // hooks antes de qualquer retorno condicional
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<null | { kind: 'objPonto' | 'rotConf' | 'rotVert' | 'folha' | 'ted' | 'divisaConf'; id: string; idx?: number; dx?: number; dy?: number; vx?: number; vy?: number }>(null);
  const folhaLast = useRef<{ x: number; y: number } | null>(null);

  // Estados locais para edição em linha (in-place)
  const [localEditandoId, setLocalEditandoId] = useState<string | null>(null);
  const editandoId = editandoTextoId !== undefined ? editandoTextoId : localEditandoId;
  const setEditandoId = onSetEditandoTextoId !== undefined ? onSetEditandoTextoId : setLocalEditandoId;

  // Estado para arrasto fluído/suave (evita recálculos geográficos pesados em tempo real)
  const [dragTemp, setDragTemp] = useState<{
    kind: 'rotConf' | 'rotVert' | 'ted' | 'divisaConf';
    id: string;
    dx: number;
    dy: number;
    baseX: number;
    baseY: number;
  } | null>(null);

  if (vertices.length < 3) {
    return <div className="p-8 text-sm text-muted-foreground">Importe pontos para gerar a planta.</div>;
  }

  const verGrade = config.mostrarGrade !== false;
  const verNortes = config.mostrarNortes !== false;
  const verConv = config.mostrarConvencoes !== false;
  const verEscalaG = config.mostrarEscalaGrafica !== false;
  const verDivisaConf = config.mostrarDivisaConf !== false;
  const verSituacao = config.mostrarSituacao !== false;
  const escTxt = config.escalaTextos && config.escalaTextos > 0 ? config.escalaTextos : 1.5;
  const fs = (n: number) => +(n * escTxt).toFixed(2); // escala global de todos os textos
  const fonteRot = fs(config.fonteRotulos ?? 10);
  const textosOv = config.textos ?? {};
  const ef = valoresEfetivos(res, imovel);
  const mapaC = new Map(confrontantes.map((c) => [c.id, c]));

  // ---- transform UTM -> tela (escala múltipla de 250) ----
  const outrasPts = outrasGlebas.flatMap((g) => g.pts);
  const xs = [...vertices.map((v) => v.leste), ...outrasPts.map((p) => p.leste)];
  const ys = [...vertices.map((v) => v.norte), ...outrasPts.map((p) => p.norte)];
  let minX = Math.min(...xs), maxX = Math.max(...xs);
  let minY = Math.min(...ys), maxY = Math.max(...ys);
  const padX = (maxX - minX) * 0.15 || 10;
  const padY = (maxY - minY) * 0.15 || 10;
  minX -= padX; maxX += padX; minY -= padY; maxY += padY;
  const areaW = DRAW.x1 - DRAW.x0;
  const areaH = DRAW.y1 - DRAW.y0;
  const escalaFit = Math.min(areaW / (maxX - minX), areaH / (maxY - minY));
  const denomNatural = 1 / (escalaFit * 0.0002645);
  const TABELA = [250, 500, 750, 1000, 1500, 2000, 2500, 4000, 5000, 7500, 10000, 15000, 20000, 25000, 50000, 100000];
  const escalaDenom = (config.escalaManual && config.escalaManual > 0)
    ? config.escalaManual
    : (TABELA.find((d) => d >= denomNatural) ?? Math.ceil(denomNatural / 10000) * 10000);
  const escala = 1 / (escalaDenom * 0.0002645);
  const desW = (maxX - minX) * escala, desH = (maxY - minY) * escala;
  // deslocamento manual da folha (o polígono é georreferenciado e não se move; a prancha sim)
  const offX = DRAW.x0 + (areaW - desW) / 2 + (config.offsetX ?? 0);
  const offY = DRAW.y0 + (areaH - desH) / 2 + (config.offsetY ?? 0);
  const sx = (e: number) => offX + (e - minX) * escala;
  const sy = (n: number) => offY + (maxY - n) * escala;

  const intervalo = intervaloGrade(Math.max(maxX - minX, maxY - minY));
  const linhasX: number[] = [];
  for (let x = Math.ceil(minX / intervalo) * intervalo; x <= maxX; x += intervalo) linhasX.push(x);
  const linhasY: number[] = [];
  for (let y = Math.ceil(minY / intervalo) * intervalo; y <= maxY; y += intervalo) linhasY.push(y);

  const anel = vertices.map((v) => ({ x: sx(v.leste), y: sy(v.norte) }));
  const pts = anel.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // centro do rótulo do imóvel: usa a posição ajustada no MAPA (config.centroInfoPos), se houver —
  // assim a edição no mapa reflete na planta; senão, centróide do polígono.
  let cx = anel.reduce((s, p) => s + p.x, 0) / anel.length;
  let cy = anel.reduce((s, p) => s + p.y, 0) / anel.length;
  if (config.centroInfoPos) {
    const u = geoParaUtm(config.centroInfoPos.lat, config.centroInfoPos.lon, zona, hemisferio);
    cx = sx(u.leste); cy = sy(u.norte);
  }

  // ---- confrontantes por trecho: posição do rótulo (fora do polígono) ----
  const trechos = new Map<string, number[]>();
  for (let i = 0; i < vertices.length; i++) {
    const cid = confrontantePorLado[i];
    if (!cid) continue;
    if (!trechos.has(cid)) trechos.set(cid, []);
    trechos.get(cid)!.push(i);
  }
  const clampX = (x: number) => Math.max(DRAW.x0 + 75, Math.min(DRAW.x1 - 75, x));
  const clampY = (y: number) => Math.max(DRAW.y0 + 22, Math.min(DRAW.y1 - 24, y));
  const rotulosConf = [...trechos.entries()].map(([cid, idxs]) => {
    const c = mapaC.get(cid);
    if (c?.posRotulo) {
      const u = geoParaUtm(c.posRotulo.lat, c.posRotulo.lon, zona, hemisferio);
      return { c, x: clampX(sx(u.leste)), y: clampY(sy(u.norte)) };
    }
    const meio = idxs[Math.floor(idxs.length / 2)];
    const a = anel[meio], b = anel[(meio + 1) % anel.length];
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    let dx = mx - cx, dy = my - cy;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    return { c, x: clampX(mx + dx * 60), y: clampY(my + dy * 60) };
  });

  // posição do rótulo de cada vértice (honra posRotulo arrastado; senão, deslocado do ponto)
  const rotuloVert = vertices.map((v, i) => {
    if (v.posRotulo) { const u = geoParaUtm(v.posRotulo.lat, v.posRotulo.lon, zona, hemisferio); return { v, i, x: sx(u.leste), y: sy(u.norte) }; }
    return { v, i, x: sx(v.leste) + 5, y: sy(v.norte) - 4 };
  });
  // rótulo exibido do vértice: código SIGEF (padrão) ou P1, P2, P3… (topografia convencional)
  const nomeVertice = (v: Vertex, i: number) => (config.estiloVertice === 'convencional' ? `P${i + 1}` : (v.codigoSigef || 'S/N'));

  const getOverride = (id: string) => {
    const base = textosOv[id] || {};
    if (dragTemp && dragTemp.id === id) {
      if (id.startsWith('vert.')) {
        return { ...base, dx: dragTemp.dx, dy: dragTemp.dy };
      }
      return { ...base, dx: dragTemp.baseX + dragTemp.dx, dy: dragTemp.baseY + dragTemp.dy };
    }
    return base;
  };

  const terminarEdicao = (id: string, novoTexto: string) => {
    setEditandoId(null);
    onTextoEditar?.(id, novoTexto);
  };

  const tedComum = {
    ed: editavel,
    onMenu: onTextoMenu,
    onStartEdit: (id: string) => setEditandoId(id),
    onTerminarEditar: terminarEdicao,
    onDragStart: (id: string, e: ReactPointerEvent) => {
      const u = svgPonto(e); if (!u) return;
      if (id.startsWith('vert.')) {
        const vId = id.slice(5);
        dragRef.current = { kind: 'rotVert', id: vId };
        const rv = rotuloVert.find((x) => x.v.id === vId);
        if (rv) setDragTemp({ kind: 'rotVert', id: vId, dx: 0, dy: 0, baseX: rv.x, baseY: rv.y });
      } else {
        const ov = textosOv[id];
        dragRef.current = { kind: 'ted', id, dx: ov?.dx ?? 0, dy: ov?.dy ?? 0 };
        setDragTemp({ kind: 'ted', id, dx: 0, dy: 0, baseX: ov?.dx ?? 0, baseY: ov?.dy ?? 0 });
      }
      folhaLast.current = u;
      captura(e);
    }
  };

  const tProps = (id: string) => ({
    ...tedComum,
    id,
    ov: getOverride(id),
    editando: editandoId === id,
  });

  // ---- EDIÇÃO NA PLANTA: converte pixel do SVG -> terreno e arrasta itens ----
  function svgPonto(e: ReactPointerEvent): { x: number; y: number } | null {
    const svg = svgRef.current; const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
    const u = p.matrixTransform(ctm.inverse());
    return { x: u.x, y: u.y };
  }
  function paraGeo(u: { x: number; y: number }) {
    const leste = minX + (u.x - offX) / escala;
    const norte = maxY - (u.y - offY) / escala;
    return utmParaGeo(leste, norte, zona, hemisferio);
  }
  function plantaDown(e: ReactPointerEvent) {
    if (!editavel) return;
    if (e.button !== 0) return; // botão do meio/direito não arrasta itens (meio = pan, tratado fora)
    const u = svgPonto(e); if (!u) return;
    // modos de desenho: o clique cria/continua o objeto (só dentro da área de desenho, nunca no carimbo)
    if (modo === 'linha' || modo === 'polilinha' || modo === 'cota' || modo === 'texto') {
      if (u.x < DRAW.x0 || u.x > DRAW.x1 || u.y < DRAW.y0 || u.y > DRAW.y1) return;
      const g = paraGeo(u); onCliquePlanta?.(g.lat, g.lon); return;
    }
    // navegar: arrastar item mais próximo (prioridade: ponto de objeto)
    for (const o of objetos) {
      for (let i = 0; i < o.pontos.length; i++) {
        if (Math.hypot(sx(o.pontos[i].leste) - u.x, sy(o.pontos[i].norte) - u.y) < 7) {
          dragRef.current = { kind: 'objPonto', id: o.id, idx: i }; onSelecObjeto?.(o.id); captura(e); return;
        }
      }
    }
    // clique/arrasto no vazio: desseleciona e permite reposicionar a FOLHA inteira (se destravada)
    onSelecObjeto?.(null);
    if (!folhaTravada) {
      dragRef.current = { kind: 'folha', id: '' };
      folhaLast.current = u;
      captura(e);
    }
  }
  function plantaMove(e: ReactPointerEvent) {
    if (!editavel || !dragRef.current) return;
    const u = svgPonto(e); if (!u) return;
    const d = dragRef.current;
    if (d.kind === 'folha') {
      if (folhaLast.current) onMoverFolha?.(u.x - folhaLast.current.x, u.y - folhaLast.current.y);
      folhaLast.current = u;
      return;
    }
    if (folhaLast.current && dragTemp) {
      const dx = u.x - folhaLast.current.x;
      const dy = u.y - folhaLast.current.y;
      setDragTemp((prev) => prev ? { ...prev, dx, dy } : null);
    }
    if (d.kind === 'objPonto') {
      const g = paraGeo(u);
      onMoverPontoObjeto?.(d.id, d.idx!, g.lat, g.lon);
    }
  }
  function plantaUp(e: ReactPointerEvent) {
    if (dragTemp && dragRef.current) {
      const d = dragRef.current;
      let finalX = dragTemp.baseX + dragTemp.dx;
      let finalY = dragTemp.baseY + dragTemp.dy;
      if (d.kind === 'ted') {
        onTextoMover?.(dragTemp.id, finalX, finalY);
      } else if (d.kind === 'divisaConf' && d.vx != null && d.vy != null) {
        // a ponta não pode sair do quadro do desenho
        finalX = Math.max(DRAW.x0, Math.min(DRAW.x1, finalX));
        finalY = Math.max(DRAW.y0, Math.min(DRAW.y1, finalY));
        // converte a ponta arrastada em azimute (0=topo, horário) + comprimento em px de prancha
        const ddx = finalX - d.vx, ddy = finalY - d.vy;
        let az = (Math.atan2(ddx, -ddy) * 180) / Math.PI; if (az < 0) az += 360;
        const len = Math.min(400, Math.max(15, Math.hypot(ddx, ddy)));
        onAjustarDivisaConf?.(dragTemp.id, +az.toFixed(1), +len.toFixed(0));
      } else {
        const g = paraGeo({ x: finalX, y: finalY });
        if (d.kind === 'rotConf') onMoverRotuloConf?.(dragTemp.id, g.lat, g.lon);
        else if (d.kind === 'rotVert') onMoverRotuloVertice?.(dragTemp.id, g.lat, g.lon);
      }
    }
    dragRef.current = null;
    folhaLast.current = null;
    setDragTemp(null);
    try { svgRef.current?.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  }
  function captura(e: ReactPointerEvent) { try { svgRef.current?.setPointerCapture(e.pointerId); } catch { /* ignore */ } }

  // pré-visualização do desenho em andamento (linha/polilinha/cota)
  const desenhoPts = desenhoAtual.map((p) => { const u = geoParaUtm(p.lat, p.lon, zona, hemisferio); return { x: sx(u.leste), y: sy(u.norte) }; });

  // ---- cálculo de nortes e coordenadas ----
  const vref = vertices[0];
  const conv = convergenciaMeridiana(vref.lat, vref.lon, zona);
  const decl = imovel.declinacaoMagnetica ?? 0;
  const dLamb = ((vref.lon - meridianoCentral(zona)) * Math.PI) / 180;
  const phiRef = (vref.lat * Math.PI) / 180;
  const fatorK = 0.9996 * (1 + Math.pow(dLamb * Math.cos(phiRef), 2) / 2);
  const represUsadas = Array.from(new Set(vertices.map((v) => v.representacao || 'linha-ideal')));

  return (
    <svg ref={svgRef} id="planta-svg" viewBox={`0 0 ${W} ${H}`} width="100%"
      style={{ background: '#fff', fontFamily: 'Arial, Helvetica, sans-serif', cursor: editavel ? (modo === 'navegar' ? 'move' : 'crosshair') : 'default', touchAction: editavel ? 'none' : undefined }}
      onPointerDown={editavel ? plantaDown : undefined} onPointerMove={editavel ? plantaMove : undefined} onPointerUp={editavel ? plantaUp : undefined}
      xmlns="http://www.w3.org/2000/svg">
      {/* Moldura externa (Margem NBR: esquerda=25mm/95px, outras=7mm/26px) */}
      <rect x={0} y={0} width={W} height={H} fill="#fff" />
      <rect x={95} y={26} width={W - 95 - 26} height={H - 26 - 26} fill="none" stroke="#000" strokeWidth={1.5} />

      {/* Linhas de guia/marcas de dobra A3 para caber em pasta A4 (130mm e 235mm) */}
      <g stroke="#9ca3af" strokeWidth={0.8} strokeDasharray="3 3">
        <line x1={491} y1={0} x2={491} y2={26} />
        <line x1={491} y1={H - 26} x2={491} y2={H} />
        <line x1={888} y1={0} x2={888} y2={26} />
        <line x1={888} y1={H - 26} x2={888} y2={H} />
      </g>
      {/* superfície de captura para edição (transparente; não aparece no PDF) */}
      {editavel && <rect x={DRAW.x0} y={DRAW.y0} width={DRAW.x1 - DRAW.x0} height={DRAW.y1 - DRAW.y0} fill="transparent" style={{ pointerEvents: 'all' }} />}

      {/* ---------- GRADE (números DENTRO do quadro, no topo e na esquerda) ---------- */}
      {verGrade && linhasX.map((x) => (
        <g key={`x${x}`}>
          <line x1={sx(x)} y1={DRAW.y0} x2={sx(x)} y2={DRAW.y1} stroke="#8a94a6" strokeWidth={0.5} strokeDasharray="2 5" />
          <text x={sx(x)} y={DRAW.y0 + 13} fontSize={fs(8.5)} fontWeight="bold" textAnchor="middle" fill="#1f2937" stroke="#ffffff" strokeWidth={2.6} paintOrder="stroke" strokeLinejoin="round">{`E ${numBR(x, 4)}`}</text>
        </g>
      ))}
      {verGrade && linhasY.map((y) => (
        <g key={`y${y}`}>
          <line x1={DRAW.x0} y1={sy(y)} x2={DRAW.x1} y2={sy(y)} stroke="#8a94a6" strokeWidth={0.5} strokeDasharray="2 5" />
          <text x={DRAW.x0 + 13} y={sy(y)} fontSize={fs(8.5)} fontWeight="bold" textAnchor="middle" fill="#1f2937" stroke="#ffffff" strokeWidth={2.6} paintOrder="stroke" strokeLinejoin="round" transform={`rotate(-90 ${DRAW.x0 + 13} ${sy(y)})`}>{`N ${numBR(y, 4)}`}</text>
        </g>
      ))}

      {/* demais glebas do imóvel (contorno + nome) */}
      {outrasGlebas.map((g, i) => {
        if (g.pts.length < 3) return null;
        const pp = g.pts.map((p) => `${sx(p.leste).toFixed(1)},${sy(p.norte).toFixed(1)}`).join(' ');
        const ccx = g.pts.reduce((s, p) => s + sx(p.leste), 0) / g.pts.length;
        const ccy = g.pts.reduce((s, p) => s + sy(p.norte), 0) / g.pts.length;
        const ogCor = config.corOutrasGlebas || '#c2410c';
        const ogFill = config.corOutrasGlebas || '#f97316';
        return (
          <g key={`og${i}`}>
            <polygon points={pp} fill={ogFill} fillOpacity={0.06} stroke={ogCor} strokeWidth={config.larguraOutrasGlebas ?? 1.2} strokeDasharray="6 4" />
            <text x={ccx} y={ccy} fontSize={fs(10)} fontWeight="bold" textAnchor="middle" fill={ogCor}>{g.nome}</text>
          </g>
        );
      })}

      {/* ---------- POLÍGONO (gleba ativa) ---------- */}
      <polygon points={pts} fill={config.fillPoligono || '#fde68a'} fillOpacity={0.18} stroke={config.corPoligono || '#7c2d12'} strokeWidth={config.larguraPoligono ?? 1.8} />

      {/* ---------- LINHAS DE APOIO DAS DIVISAS ---------- */}
      {vertices.map((v, i) => {
        const cor = corDivisa(v.representacao);
        if (!cor) return null;
        const a = anel[i], b = anel[(i + 1) % anel.length];
        if (!a || !b) return null;
        let nx = -(b.y - a.y), ny = b.x - a.x;
        const len = Math.hypot(nx, ny) || 1; nx /= len; ny /= len;
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        if ((mx - cx) * nx + (my - cy) * ny < 0) { nx = -nx; ny = -ny; }
        const off = 3.2;
        return (
          <line key={`div${v.id}`} x1={a.x + nx * off} y1={a.y + ny * off} x2={b.x + nx * off} y2={b.y + ny * off}
            stroke={cor} strokeWidth={config.larguraDivisasApoio ?? 3.2} strokeLinecap="round" opacity={0.9} />
        );
      })}

      {/* ---------- OBJETOS DE DESENHO ---------- */}
      {objetos.map((o) => {
        const sp = o.pontos.map((p) => ({ x: sx(p.leste), y: sy(p.norte) }));
        if (o.tipo === 'texto' && sp[0]) {
          const anchor = o.alinhamento === 'center' ? 'middle' : o.alinhamento === 'right' ? 'end' : 'start';
          return (
            <Ted key={o.id} x={sp[0].x} y={sp[0].y} base={o.texto || ''} size={(o.tamanho ?? 12) * 0.8} fill={o.cor ?? '#000'} anchor={anchor} {...tProps(o.id)} halo />
          );
        }
        if (o.tipo === 'cota' && sp.length >= 2) {
          const mx = (sp[0].x + sp[1].x) / 2, my = (sp[0].y + sp[1].y) / 2;
          return (
            <g key={o.id}>
              <line x1={sp[0].x} y1={sp[0].y} x2={sp[1].x} y2={sp[1].y} stroke={o.cor ?? '#b91c1c'} strokeWidth={0.8} />
              <text x={mx} y={my - 3} fontSize={8} textAnchor="middle" fill={o.cor ?? '#b91c1c'}>{numBR(distanciaCota(o))} m</text>
            </g>
          );
        }
        if (o.tipo === 'polilinha' && sp.length >= 2) {
          const pp = sp.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
          return o.preenchido && sp.length >= 3
            ? <polygon key={o.id} points={pp} fill={o.cor ?? '#2563eb'} fillOpacity={0.4} stroke={o.cor ?? '#2563eb'} strokeWidth={o.espessura ?? 1.2} />
            : <polyline key={o.id} points={pp} fill="none" stroke={o.cor ?? '#2563eb'} strokeWidth={o.espessura ?? 1.2} />;
        }
        return null;
      })}

      {/* confrontantes (rótulo + linha de assinatura) */}
      {rotulosConf.map((r, i) => {
        if (!r.c || !r.c.nome) return null;
        const c = r.c;
        const linhas = rotuloConfrontanteLinhas(c);
        const fz = c.tamRotulo && c.tamRotulo > 0 ? +(c.tamRotulo * escTxt).toFixed(2) : fonteRot;
        // linha de assinatura: mínimo ~4 cm no papel A3 (~3,78 px/mm) para caber uma assinatura
        const half = Math.max(76, fz * 8);
        const boxW = half * 2 + 16;
        const boxH = 20 + linhas.length * (fz + 1.5);
        const isDragging = dragTemp && dragTemp.kind === 'rotConf' && dragTemp.id === c.id;
        const px = isDragging ? r.x + dragTemp.dx : r.x;
        const py = isDragging ? r.y + dragTemp.dy : r.y;
        return (
          <g key={i}
            style={editavel ? { cursor: 'move' } : undefined}
            onDoubleClick={editavel ? (e) => { e.stopPropagation(); onEditarConfrontante?.(c.id); } : undefined}
            onContextMenu={editavel && onTamRotuloConf ? (e) => { e.preventDefault(); e.stopPropagation(); const maior = window.confirm('Aumentar o tamanho deste rótulo?\n\nOK = aumentar · Cancelar = diminuir'); onTamRotuloConf(c.id, maior ? 1 : -1); } : undefined}
            onPointerDown={editavel ? (e) => {
              e.stopPropagation();
              const u = svgPonto(e); if (!u) return;
              dragRef.current = { kind: 'rotConf', id: c.id };
              setDragTemp({ kind: 'rotConf', id: c.id, dx: 0, dy: 0, baseX: r.x, baseY: r.y });
              folhaLast.current = u;
              captura(e);
            } : undefined}>
            <rect x={px - half - 8} y={py - 22} width={boxW} height={boxH} fill="#ffffff" fillOpacity={0.92} stroke="#dddddd" strokeWidth={0.6} rx={3} ry={3} />
            <line x1={px - half} y1={py - 13} x2={px + half} y2={py - 13} stroke="#000" strokeWidth={0.6} />
            {linhas.map((t, k) => (
              <text key={k} x={px} y={py - 2 + k * (fz + 1.5)} fontSize={fz} textAnchor="middle" fill="#000">{t}</text>
            ))}
          </g>
        );
      })}

      {/* TIQUE DE TROCA DE CONFRONTANTE: linha tracejada saindo de cada marco M para fora do polígono */}
      {verDivisaConf && (() => {
        const vsv = vertices.filter((v) => Number.isFinite(v.leste) && Number.isFinite(v.norte));
        if (vsv.length < 3) return null;
        const ccx = vsv.reduce((s, v) => s + sx(v.leste), 0) / vsv.length;
        const ccy = vsv.reduce((s, v) => s + sy(v.norte), 0) / vsv.length;
        return vsv.filter((v) => v.tipo === 'M').map((v) => {
          const vx = sx(v.leste), vy = sy(v.norte);
          // azimute: salvo, senão "pra fora" (vértice − centróide)
          let az = v.divisaConfAz;
          if (az == null) { let a = (Math.atan2(vx - ccx, -(vy - ccy)) * 180) / Math.PI; if (a < 0) a += 360; az = a; }
          const len = v.divisaConfLen ?? 150; // ~4 cm na prancha A3
          const arrastando = dragTemp?.kind === 'divisaConf' && dragTemp.id === v.id;
          const a = (az * Math.PI) / 180;
          // a ponta NÃO pode sair do quadro do desenho (clamp em DRAW)
          const cl = (val: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, val));
          const ex = cl(arrastando ? dragTemp.baseX + dragTemp.dx : vx + Math.sin(a) * len, DRAW.x0, DRAW.x1);
          const ey = cl(arrastando ? dragTemp.baseY + dragTemp.dy : vy - Math.cos(a) * len, DRAW.y0, DRAW.y1);
          return (
            <g key={`dc${v.id}`}>
              <line x1={vx} y1={vy} x2={ex} y2={ey} stroke="#475569" strokeWidth={0.6} strokeDasharray="4 3" />
              {editavel && (
                <circle cx={ex} cy={ey} r={7} fill="transparent" style={{ cursor: 'move' }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    const u = svgPonto(e); if (!u) return;
                    dragRef.current = { kind: 'divisaConf', id: v.id, vx, vy };
                    setDragTemp({ kind: 'divisaConf', id: v.id, dx: 0, dy: 0, baseX: ex, baseY: ey });
                    folhaLast.current = u;
                    captura(e);
                  }} />
              )}
            </g>
          );
        });
      })()}

      {/* vértices + códigos (rótulo na posição arrastada, se houver; editável) */}
      {rotuloVert.map(({ v, i, x, y }) => (
        <g key={v.id}>
          <SimboloVertice tipo={v.tipo} cx={sx(v.leste)} cy={sy(v.norte)} r={v.tipo === 'M' ? 3.6 : v.tipo === 'V' ? 3 : 2.6} />
          <Ted x={x} y={y} base={nomeVertice(v, i)} size={Math.max(6, fonteRot - 0.5)} fill="#000" {...tProps(`vert.${v.id}`)} halo />
        </g>
      ))}

      {/* edição: prévia do desenho em andamento + realce dos pontos do objeto selecionado */}
      {editavel && desenhoPts.length > 0 && (
        <polyline points={desenhoPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} fill="none" stroke="#2563eb" strokeWidth={1.2} strokeDasharray="4 3" />
      )}
      {editavel && objetoSelId && objetos.filter((o) => o.id === objetoSelId).flatMap((o) =>
        o.pontos.map((p, i) => <circle key={`h${o.id}-${i}`} cx={sx(p.leste)} cy={sy(p.norte)} r={3.5} fill="#2563eb" stroke="#fff" strokeWidth={1} />)
      )}

      {/* texto central com dados da gleba */}
      <g>
        {[
          glebaNome || imovel.denominacao || 'Imóvel',
          imovel.matricula ? `Matrícula nº ${formatMatricula(imovel.matricula)}` : '',
          imovel.proprietario ? `Prop.: ${imovel.proprietario}` : '',
          `Área: ${numBR(ef.areaHa, 4)} ha`,
        ].filter(Boolean).map((t, i) => (
          <Ted key={i} x={cx} y={cy + i * 14} base={t} size={fs(i === 0 ? 13 : 11)} bold={i === 0} anchor="middle" fill="#1c1917" {...tProps(`centro.${i}`)} />
        ))}
      </g>

      {/* ---------- BARRA DE ESCALA GRÁFICA (moderna) ---------- */}
      {verEscalaG && (() => {
        const nices = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];
        const barM = nices.find((n) => n * escala >= 130) ?? 5000;
        const barPx = barM * escala;
        const seg = barPx / 4;
        const h = 7; // altura da barra
        const bx = DRAW.x0 + 22, by = DRAW.y1 - 40;
        return (
          <g transform={`translate(${bx}, ${by})`}>
            {/* cartão de fundo */}
            <rect x={-12} y={-20} width={barPx + 46} height={48} fill="#ffffff" fillOpacity={0.92} stroke="#cbd5e1" strokeWidth={0.7} rx={5} ry={5} />
            <text x={0} y={-9} fontSize={fs(7)} fontWeight="bold" letterSpacing="0.5" fill="#0f172a">ESCALA  1:{escalaDenom}</text>
            {/* segmentos alternados com moldura única */}
            {[0, 1, 2, 3].map((k) => (
              <rect key={k} x={k * seg} y={0} width={seg} height={h} fill={k % 2 ? '#ffffff' : '#0f172a'} />
            ))}
            <rect x={0} y={0} width={barPx} height={h} fill="none" stroke="#0f172a" strokeWidth={0.8} />
            {/* marcas e rótulos em metros */}
            {[0, 1, 2, 3, 4].map((k) => (
              <g key={k}>
                <line x1={k * seg} y1={h} x2={k * seg} y2={h + 3} stroke="#0f172a" strokeWidth={0.6} />
                <text x={k * seg} y={h + 12} fontSize={fs(6.5)} fontWeight="bold" textAnchor="middle" fill="#334155">{Math.round((barM * k) / 4)}</text>
              </g>
            ))}
            <text x={barPx + 11} y={h - 1} fontSize={fs(7)} fontWeight="bold" fill="#334155">m</text>
          </g>
        );
      })()}

      {/* Rosa dos Ventos com indicações de Norte no canto superior direito do desenho */}
      {verNortes && <RosaDosVentos cx={DRAW.x1 - 72} cy={DRAW.y0 + 74} conv={conv} decl={decl} fs={fs} />}

      {/* ---------- FAIXA INFERIOR (SITUAÇÃO, CONVENÇÕES, INFOS COORDENADAS) ---------- */}
      <FaixaInferior
        imovel={imovel} res={res} ef={ef} tecnico={tecnico} zona={zona} hemisferio={hemisferio}
        vref={vref} conv={conv} decl={decl} represUsadas={represUsadas} fatorK={fatorK}
        verConv={verConv} verNortes={verNortes} escala={escTxt} situacaoUrl={situacaoUrl} verSituacao={verSituacao}
      />

      {/* ---------- CARIMBO (coluna direita - reformulada) ---------- */}
      <CarimboA3
        imovel={imovel} ef={ef} tecnico={tecnico} escritorio={escritorio} glebaNome={glebaNome}
        escalaDenom={escalaDenom} dataExtenso={dataExtenso}
        titulo={config.titulo || 'Levantamento Planimétrico Georreferenciado'} folha={config.folha || 'Única'}
        textoLaudo={config.textoLaudo || LAUDO_PADRAO} textoConfront={config.textoConfrontantes || CONFRONT_PADRAO} escala={escTxt}
        requerente={requerente} transmitente={transmitente}
        ed={{
          ativo: editavel,
          textos: textosOv,
          onEditar: onTextoEditar,
          onMenu: onTextoMenu,
          editandoId,
          onStartEdit: (id) => setEditandoId(id),
          onTerminarEditar: terminarEdicao,
        }}
      />
    </svg>
  );
}

// ---------------- Faixa inferior reformulada com caixas fechadas ----------------
function FaixaInferior(props: {
  imovel: ImovelData; res: ResultadoCalculo; ef: ReturnType<typeof valoresEfetivos>; tecnico: TecnicoData;
  zona: number; hemisferio: 'N' | 'S'; vref: Vertex; conv: number; decl: number; represUsadas: string[]; fatorK: number;
  verConv: boolean; verNortes: boolean; escala: number; situacaoUrl?: string; verSituacao: boolean;
}) {
  const { imovel, ef, zona, hemisferio, vref, conv, decl, represUsadas, fatorK, verConv, verNortes, escala, situacaoUrl, verSituacao } = props;
  const fs = (n: number) => +(n * escala).toFixed(2);
  const y0 = H - STRIP - 12; // 901px
  const hBox = STRIP;       // 210px

  const lon = grausParaDMS(vref.lon, { estilo: 'memorial', casas: 3 });
  const lat = grausParaDMS(vref.lat, { estilo: 'memorial', casas: 3 });

  // Posições X das 3 caixas
  const w1 = 244;
  const w2 = 200;
  const w3 = DRAW.x1 - (DRAW.x0 + w1 + 12 + w2 + 12); // Restante: 613px
  
  const x1 = DRAW.x0; // 24
  const x2 = x1 + w1 + 12; // 280
  const x3 = x2 + w2 + 12; // 492

  return (
    <g>
      {/* --- BOX 1: SITUAÇÃO --- */}
      <g>
        <rect x={x1} y={y0} width={w1} height={hBox} rx={4} ry={4} fill="none" stroke="#000" strokeWidth={0.8} />
        <rect x={x1} y={y0} width={w1} height={18} fill="#009739" rx={2} ry={2} />
        <text x={x1 + w1 / 2} y={y0 + 13} fontSize={fs(9)} fontWeight="bold" fill="#fff" textAnchor="middle">Situação</text>
        {situacaoUrl && verSituacao ? (
          <image href={situacaoUrl} x={x1 + 6} y={y0 + 24} width={w1 - 12} height={hBox - 30} preserveAspectRatio="xMidYMid slice" />
        ) : (
          <g>
            <rect x={x1 + 6} y={y0 + 24} width={w1 - 12} height={hBox - 30} fill="#f3f4f6" stroke="#d1d5db" strokeWidth={0.5} />
            <text x={x1 + w1 / 2} y={y0 + hBox / 2 + 10} fontSize={fs(8)} fill="#6b7280" textAnchor="middle">Situação Indisponível</text>
          </g>
        )}
      </g>

      {/* --- BOX 2: CONVENÇÕES --- */}
      {verConv && (
        <g>
          <rect x={x2} y={y0} width={w2} height={hBox} rx={4} ry={4} fill="none" stroke="#000" strokeWidth={0.8} />
          <text x={x2 + w2 / 2} y={y0 + 17} fontSize={fs(9)} fontWeight="bold" textAnchor="middle">CONVENÇÕES</text>
          
          <g>
            <SimboloVertice tipo="M" cx={x2 + 18} cy={y0 + 35} r={3.6} />
            <text x={x2 + 28} y={y0 + 38} fontSize={fs(8)}>Vértices Tipo M</text>
            
            <SimboloVertice tipo="P" cx={x2 + 18} cy={y0 + 51} r={2.6} />
            <text x={x2 + 28} y={y0 + 54} fontSize={fs(8)}>Vértices Tipo P</text>
            
            <SimboloVertice tipo="V" cx={x2 + 18} cy={y0 + 67} r={3} />
            <text x={x2 + 28} y={y0 + 70} fontSize={fs(8)}>Vértices Tipo V (virtual)</text>

            <SimboloDivisa tipo="linha-ideal" x={x2 + 12} y={y0 + 83} />
            <text x={x2 + 28} y={y0 + 86} fontSize={fs(8)}>Linha ideal</text>

            {represUsadas.filter((r) => r !== 'linha-ideal').slice(0, 7).map((r, i) => (
              <g key={r}>
                <SimboloDivisa tipo={r} x={x2 + 12} y={y0 + 99 + i * 16} />
                <text x={x2 + 28} y={y0 + 102 + i * 16} fontSize={fs(8)}>{REPRES_LABEL[r] || r}</text>
              </g>
            ))}
          </g>
        </g>
      )}

      {/* --- BOX 3: INFORMAÇÕES DE COORDENADAS --- */}
      <g>
        <rect x={x3} y={y0} width={w3} height={hBox} rx={4} ry={4} fill="none" stroke="#000" strokeWidth={0.8} />
        <text x={x3 + w3 / 2} y={y0 + 17} fontSize={fs(9)} fontWeight="bold" textAnchor="middle">Informações de Coordenadas</text>

        {/* Lado Esquerdo do Box 3 (Projeção e Diagrama) */}
        <g>
          <text x={x3 + 12} y={y0 + 35} fontSize={fs(7)} fontWeight="bold">PROJEÇÃO UNIVERSAL TRANSVERSA</text>
          <text x={x3 + 12} y={y0 + 46} fontSize={fs(7)} fontWeight="bold">DE MERCATOR (UTM)</text>
          <text x={x3 + 12} y={y0 + 60} fontSize={fs(7)} fontWeight="bold">SGR (Sistema de Referência): SIRGAS2000</text>
          <text x={x3 + 12} y={y0 + 73} fontSize={fs(7)}>Fuso {zona}{hemisferio} / MC {Math.abs(meridianoCentral(zona))}° {meridianoCentral(zona) < 0 ? 'W' : 'E'}</text>
          {verNortes && <Nortes cx={x3 + 60} cy={y0 + 140} conv={conv} decl={decl} fs={fs} />}
        </g>

        {/* Lado Direito do Box 3 (Valores do Vértice de Referência) */}
        <g transform="translate(300, 0)">
          <text x={x3 + 12} y={y0 + 38} fontSize={fs(8)} fontWeight="bold">Vértice de referência: {vref.codigoSigef || vref.nome}</text>
          {[
            ['Latitude:', lat],
            ['Longitude:', lon],
            ['Conv. meridiana (CM):', grausParaDMS(conv, { casas: 6, estilo: 'memorial' })],
            ['Declinação magnética:', grausParaDMS(decl, { casas: 6, estilo: 'memorial' })],
            ['Variação anual:', imovel.variacaoAnual != null ? `${numBR(imovel.variacaoAnual, 1)}'/ano` : '—'],
            ['Fator de escala (K):', fatorK.toFixed(9)],
          ].map(([label, val], idx) => (
            <text key={idx} x={x3 + 12} y={y0 + 56 + idx * 16} fontSize={fs(8)}>
              <tspan fontWeight="bold">{label} </tspan> {val}
            </text>
          ))}
        </g>
      </g>
    </g>
  );
}

// ---------------- Nortes modificado ----------------
// ---------------- RosaDosVentos e Nortes ----------------
// Rosa dos ventos BÁSICA: seta de Norte limpa (metade clara/escura) num anel discreto, só a
// letra "N". Sem vermelho, sem excesso de letras.
function RosaDosVentos({ cx, cy, fs }: { cx: number; cy: number; conv?: number; decl?: number; fs: (n: number) => number }) {
  const R = 34;
  return (
    <g>
      <circle cx={cx} cy={cy} r={R} fill="#ffffff" fillOpacity={0.9} stroke="#cbd5e1" strokeWidth={0.7} />
      <circle cx={cx} cy={cy} r={R - 6} fill="none" stroke="#e2e8f0" strokeWidth={0.5} />
      {/* seta Norte: dois triângulos (claro/escuro) do centro até o topo */}
      <polygon points={`${cx},${cy - (R - 4)} ${cx - 6},${cy + 9} ${cx},${cy + 2}`} fill="#1f2937" />
      <polygon points={`${cx},${cy - (R - 4)} ${cx + 6},${cy + 9} ${cx},${cy + 2}`} fill="#94a3b8" />
      {/* haste sul discreta */}
      <line x1={cx} y1={cy + 2} x2={cx} y2={cy + 12} stroke="#94a3b8" strokeWidth={1} />
      <circle cx={cx} cy={cy} r={1.8} fill="#1f2937" />
      <text x={cx} y={cy - R + 1} fontSize={fs(9)} fontWeight="bold" textAnchor="middle" fill="#0f172a">N</text>
    </g>
  );
}

// Diagrama de CONVERGÊNCIA (NV/NQ/NM) para o carimbo. Os ângulos reais são minúsculos, então são
// EXAGERADOS visualmente (preservando o sinal) só para leitura — os valores exatos ficam no texto
// ao lado. É um diagrama técnico, diferente da rosa dos ventos (orientação) do desenho.
function Nortes({ cx, cy, conv, decl, fs }: { cx: number; cy: number; conv: number; decl: number; fs: (n: number) => number }) {
  const L = 48; // um pouco maior
  const ponto = (deg: number, len: number) => { const a = (deg * Math.PI) / 180; return [cx + len * Math.sin(a), cy - len * Math.cos(a)] as const; };
  const vq = conv === 0 ? 0 : (conv > 0 ? 1 : -1) * 16;  // quadrícula (ângulo exagerado pra leitura)
  const vm = decl === 0 ? 0 : (decl > 0 ? 1 : -1) * 32;  // magnético
  const [nx, ny] = ponto(0, L);
  const [qx, qy] = ponto(vq, L);
  const [mx, my] = ponto(vm, L);
  // rótulos posicionados ALÉM da ponta de cada linha, todos escuros (sem texto colorido) e fora das linhas
  const [lnx, lny] = ponto(0, L + 11);
  const [lqx, lqy] = ponto(vq, L + 11);
  const [lmx, lmy] = ponto(vm, L + 11);
  const TXT = '#0f172a';
  // só desenha NQ/NM quando o ângulo NÃO é zero (zero = coincide com o NV → evita sobreposição)
  const temNQ = conv !== 0;
  const temNM = decl !== 0;
  return (
    <g>
      {/* linhas (coloridas só pra distinguir; o texto é escuro e fica fora delas) */}
      {temNM && <line x1={cx} y1={cy} x2={mx} y2={my} stroke="#b91c1c" strokeWidth={0.9} strokeDasharray="3 2" />}
      {temNQ && <line x1={cx} y1={cy} x2={qx} y2={qy} stroke="#1d4ed8" strokeWidth={0.9} />}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#0f172a" strokeWidth={1.5} />
      <polygon points={`${nx},${ny - 8} ${nx - 3},${ny} ${nx + 3},${ny}`} fill="#0f172a" />
      <circle cx={cx} cy={cy} r={2.4} fill="#0f172a" />
      {temNM && <text x={lmx} y={lmy + 2} fontSize={fs(6.5)} fontWeight="bold" textAnchor="middle" fill={TXT}>NM</text>}
      {temNQ && <text x={lqx} y={lqy + 2} fontSize={fs(6.5)} fontWeight="bold" textAnchor="middle" fill={TXT}>NQ</text>}
      <text x={lnx} y={lny - 1} fontSize={fs(7)} fontWeight="bold" textAnchor="middle" fill={TXT}>NV</text>
    </g>
  );
}

// ---------------- CarimboA3 reformulado com bordas e harmonia visual ----------------
function CarimboA3(props: {
  imovel: ImovelData; ef: ReturnType<typeof valoresEfetivos>; tecnico: TecnicoData; escritorio: EscritorioData;
  glebaNome?: string; escalaDenom: number; dataExtenso?: string;
  titulo: string; folha: string; textoLaudo: string; textoConfront: string; escala: number;
  requerente?: PessoaQualificada; transmitente?: PessoaQualificada;
  ed?: {
    ativo: boolean;
    textos: Record<string, TextoOverride>;
    onEditar?: (id: string, atual: string) => void;
    onMenu?: (id: string, atual: string, x: number, y: number) => void;
    editandoId?: string | null;
    onStartEdit?: (id: string) => void;
    onTerminarEditar?: (id: string, novoTexto: string) => void;
    onDragStart?: (id: string, e: ReactPointerEvent) => void;
  };
}) {
  const { imovel, ef, tecnico, escritorio, glebaNome, escalaDenom, dataExtenso, titulo, folha, textoLaudo, textoConfront, escala, ed } = props;
  const fs = (n: number) => +(n * escala).toFixed(2);
  // texto editável do carimbo (atalho para o helper Ted, já ligado ao modo edição)
  const T = (id: string, base: string, o: { x: number; y: number; size: number; bold?: boolean; anchor?: 'start' | 'middle' | 'end'; fill?: string; slice?: number }) => (
    <Ted id={id} base={base} x={o.x} y={o.y} size={o.size} bold={o.bold} anchor={o.anchor} fill={o.fill} slice={o.slice}
      ov={ed?.textos[id]} ed={ed?.ativo} onEditar={ed?.onEditar} onMenu={ed?.onMenu}
      editando={ed?.editandoId === id} onStartEdit={ed?.onStartEdit} onTerminarEditar={ed?.onTerminarEditar} />
  );
  const x0 = W - CARW; // 1117
  const padX = 10;
  const lx = x0 + padX; // 1127
  const rx = W - 18;  // 1569
  const wBox = rx - lx; // 442
  const cxc = lx + wBox / 2; // 1348.5
  const temLogo = !!escritorio.logoDataUrl;

  // Lista dos dados do imóvel a serem desenhados na Box de Dados
  const campos: [string, string][] = [
    [imovel.tipoImovel === 'urbano' ? 'LOTE/IMÓVEL:' : 'PROPRIEDADE:', glebaNome || imovel.denominacao || '—'],
    ['PROPRIETÁRIO(A):', imovel.proprietario || '—'],
  ];
  if (imovel.comprador) {
    campos.push(['COMPRADOR(ES):', imovel.comprador]);
  }
  campos.push(
    ['MUNICÍPIO(S):', imovel.municipio || '—'],
    // TRT do PROJETO (informado no modal TRT) tem prioridade; senão, o ART do técnico
    ['TRT:', imovel.numeroTrt || tecnico.art || '—'],
    ['MAT./TRANSC.:', imovel.matricula || '—'],
  );
  if (imovel.tipoImovel === 'urbano') {
    if (imovel.inscricaoMunicipal) {
      campos.push(['INSCRIÇÃO MUN.:', imovel.inscricaoMunicipal]);
    }
    if (imovel.frenteM != null || imovel.fundosM != null) {
      const dim: string[] = [];
      if (imovel.frenteM != null) dim.push(`Fr: ${numBR(imovel.frenteM)}m`);
      if (imovel.fundosM != null) dim.push(`Fd: ${numBR(imovel.fundosM)}m`);
      campos.push(['DIMENSÕES:', dim.join(' / ')]);
    }
    if (imovel.distanciaEsquinaM != null && imovel.esquinaRua) {
      campos.push(['AMARRAÇÃO:', `A ${numBR(imovel.distanciaEsquinaM)}m da ${imovel.esquinaRua}`]);
    }
    campos.push(
      ['ÁREA TOTAL:', `${numBR(ef.areaHa * 10000)} m²`],
      ['PERÍMETRO (m):', `${numBR(ef.perimetro)} m`],
    );
  } else {
    campos.push(
      ['ÁREA TOTAL (ha):', `${numBR(ef.areaHa, 4)} ha`],
      ['PERÍMETRO (m):', `${numBR(ef.perimetro)} m`],
    );
  }
  campos.push(
    ['DATA:', dataExtenso || '—'],
    ['ESCALA:', `1 / ${escalaDenom}`],
  );

  const gap = Math.min(27, Math.floor(255 / (campos.length - 1)));

  // Assinatura num intervalo livre (xa..xb): linha + papel + nome + detalhes, centrados no meio.
  const assina = (xa: number, xb: number, yLine: number, label: string, nome: string, detalhes: string[] = [], keyPrefix: string) => {
    const m = (xa + xb) / 2;
    const det = detalhes.filter(Boolean);
    return (
      <g>
        <line x1={xa} y1={yLine} x2={xb} y2={yLine} stroke="#000" strokeWidth={0.6} />
        <text x={m} y={yLine - 4} fontSize={fs(6.5)} fill="#555" textAnchor="middle">{label}</text>
        {T(`${keyPrefix}.nome`, nome, { x: m, y: yLine + 11, size: fs(8), bold: true, anchor: 'middle', fill: '#000' })}
        {det.map((d, k) => (
          <g key={k}>
            {T(`${keyPrefix}.detalhe.${k}`, d, { x: m, y: yLine + 21 + k * 9.5, size: fs(6), anchor: 'middle', fill: '#222' })}
          </g>
        ))}
      </g>
    );
  };

  return (
    <g>
      {/* Linha separadora vertical principal */}
      <line x1={x0} y1={26} x2={x0} y2={H - 26} stroke="#000" strokeWidth={1.2} />

      {/* --- BOX 1: TÍTULO --- */}
      <g>
        <rect x={lx} y={32} width={wBox - 72} height={90} rx={4} ry={4} fill="none" stroke="#000" strokeWidth={0.8} />
        <text x={lx + 10} y={50} fontSize={fs(8)} fontWeight="bold" fill="#4b5563">Título:</text>
        {T('carimbo.titulo', titulo, { x: lx + (wBox - 72) / 2, y: 82, size: fs(9.5), bold: true, anchor: 'middle', fill: '#000' })}
      </g>

      {/* --- BOX 2: FOLHA --- */}
      <g>
        <rect x={rx - 62} y={32} width={62} height={90} rx={4} ry={4} fill="none" stroke="#000" strokeWidth={0.8} />
        <text x={rx - 54} y={50} fontSize={fs(8)} fill="#4b5563">Folha:</text>
        {T('carimbo.folha', folha, { x: rx - 31, y: 82, size: fs(10), bold: true, anchor: 'middle', fill: '#000' })}
      </g>

      {/* --- BOX 3: DADOS DO IMÓVEL --- */}
      <g>
        <rect x={lx} y={134} width={wBox} height={290} rx={4} ry={4} fill="none" stroke="#000" strokeWidth={0.8} />
        {campos.map(([k, v], i) => {
          const y = 160 + i * gap;
          return (
            <g key={k}>
              {/* rótulo à esquerda e valor numa coluna fixa, ambos na mesma base */}
              <text x={lx + 12} y={y} fontSize={fs(9)} fontWeight="bold" fill="#1f2937">{k}</text>
              {T(`dado.${i}`, v, { x: lx + 148, y, size: fs(10), bold: true, fill: '#000', slice: 40 })}
            </g>
          );
        })}
      </g>

      {/* --- CARD A: DECLARAÇÃO DO(S) PROPRIETÁRIO(S) (largura cheia) --- */}
      <g>
        <rect x={lx} y={436} width={wBox} height={150} rx={4} ry={4} fill="none" stroke="#000" strokeWidth={0.8} />
        <text x={cxc} y={452} fontSize={fs(8.5)} fontWeight="bold" textAnchor="middle">DECLARAÇÃO DO(S) PROPRIETÁRIO(S)</text>
        
        {(() => {
          const idProp = 'carimbo.declProprietario';
          const ovProp = ed?.textos[idProp] || {};
          const txtProp = ovProp.texto || `Atestamos, sob as penas da lei, serem verdadeiras todas as informações apresentadas nesta planta e no memorial anexo, e que indicamos em campo, de forma expressa, as divisas, limites e confrontações consideradas verdadeiras.`;
          const pxProp = cxc + (ovProp.dx ?? 0);
          const pyProp = 467 + (ovProp.dy ?? 0);

          if (ed?.editandoId === idProp) {
            return (
              <foreignObject x={pxProp - 180} y={pyProp - 15} width={360} height={60} style={{ overflow: 'visible' }}>
                <textarea
                  autoFocus
                  className="w-full h-full border border-blue-500 bg-white text-black outline-none p-1 shadow-md rounded text-[9px]"
                  value={txtProp}
                  onChange={(e) => ed.onEditar?.(idProp, e.target.value)}
                  onBlur={() => ed.onTerminarEditar?.(idProp, txtProp)}
                />
              </foreignObject>
            );
          }

          return (
            <g key={idProp}
               style={ed?.ativo ? { cursor: 'move' } : undefined}
               onDoubleClick={ed?.ativo ? (e) => { e.stopPropagation(); ed.onStartEdit?.(idProp); } : undefined}
               onContextMenu={ed?.ativo ? (e) => { e.preventDefault(); e.stopPropagation(); ed.onMenu?.(idProp, txtProp, e.clientX, e.clientY); } : undefined}
               onPointerDown={ed?.ativo ? (e) => { e.stopPropagation(); ed.onDragStart?.(idProp, e); } : undefined}>
              <TextoQuebrado x={pxProp} y={pyProp} fontSize={fs(7)} larguraChars={84} textAnchor="middle" texto={txtProp} />
            </g>
          );
        })()}
        
        {imovel.comprador
          ? (<g>
              {assina(lx + 16, cxc - 12, 560, 'Transmitente', imovel.proprietario, [`CPF: ${imovel.cpfProprietario || '—'}`], 'proprietario')}
              {assina(cxc + 12, rx - 16, 560, 'Comprador', imovel.comprador, [`CPF: ${imovel.cpfComprador || '—'}`], 'comprador')}
            </g>)
          : assina(lx + 90, rx - 90, 560, 'Assinatura do(s) Proprietário(s)', imovel.proprietario, [`CPF: ${imovel.cpfProprietario || '—'}`], 'proprietario')}
      </g>

      {/* --- CARD B: LAUDO TÉCNICO / RESPONSÁVEL TÉCNICO (largura cheia) --- */}
      <g>
        <rect x={lx} y={598} width={wBox} height={160} rx={4} ry={4} fill="none" stroke="#000" strokeWidth={0.8} />
        <text x={cxc} y={614} fontSize={fs(8.5)} fontWeight="bold" textAnchor="middle">LAUDO TÉCNICO</text>
        
        {(() => {
          const idLaudo = 'carimbo.laudoTécnico';
          const ovLaudo = ed?.textos[idLaudo] || {};
          const txtLaudo = ovLaudo.texto || textoLaudo;
          const pxLaudo = cxc + (ovLaudo.dx ?? 0);
          const pyLaudo = 629 + (ovLaudo.dy ?? 0);

          if (ed?.editandoId === idLaudo) {
            return (
              <foreignObject x={pxLaudo - 180} y={pyLaudo - 15} width={360} height={60} style={{ overflow: 'visible' }}>
                <textarea
                  autoFocus
                  className="w-full h-full border border-blue-500 bg-white text-black outline-none p-1 shadow-md rounded text-[9px]"
                  value={txtLaudo}
                  onChange={(e) => ed.onEditar?.(idLaudo, e.target.value)}
                  onBlur={() => ed.onTerminarEditar?.(idLaudo, txtLaudo)}
                />
              </foreignObject>
            );
          }

          return (
            <g key={idLaudo}
               style={ed?.ativo ? { cursor: 'move' } : undefined}
               onDoubleClick={ed?.ativo ? (e) => { e.stopPropagation(); ed.onStartEdit?.(idLaudo); } : undefined}
               onContextMenu={ed?.ativo ? (e) => { e.preventDefault(); e.stopPropagation(); ed.onMenu?.(idLaudo, txtLaudo, e.clientX, e.clientY); } : undefined}
               onPointerDown={ed?.ativo ? (e) => { e.stopPropagation(); ed.onDragStart?.(idLaudo, e); } : undefined}>
              <TextoQuebrado x={pxLaudo} y={pyLaudo} fontSize={fs(7)} larguraChars={84} textAnchor="middle" texto={txtLaudo} />
            </g>
          );
        })()}
        
        {assina(lx + 90, rx - 90, 712, 'Assinatura do Responsável Técnico', tecnico.nome, [tecnico.formacao || '', `CFT: ${tecnico.cft || '—'}  ·  INCRA: ${tecnico.credenciamentoIncra || '—'}`], 'responsavel')}
      </g>

      {/* --- CARD C: DECLARAÇÃO DOS CONFRONTANTES (largura cheia) --- */}
      <g>
        <rect x={lx} y={770} width={wBox} height={120} rx={4} ry={4} fill="none" stroke="#000" strokeWidth={0.8} />
        <text x={cxc} y={786} fontSize={fs(8.5)} fontWeight="bold" textAnchor="middle">DECLARAÇÃO DOS CONFRONTANTES</text>
        
        {(() => {
          const idConf = 'carimbo.declConfrontantes';
          const ovConf = ed?.textos[idConf] || {};
          const txtConf = ovConf.texto || textoConfront;
          const pxConf = cxc + (ovConf.dx ?? 0);
          const pyConf = 802 + (ovConf.dy ?? 0);

          if (ed?.editandoId === idConf) {
            return (
              <foreignObject x={pxConf - 180} y={pyConf - 15} width={360} height={60} style={{ overflow: 'visible' }}>
                <textarea
                  autoFocus
                  className="w-full h-full border border-blue-500 bg-white text-black outline-none p-1 shadow-md rounded text-[9px]"
                  value={txtConf}
                  onChange={(e) => ed.onEditar?.(idConf, e.target.value)}
                  onBlur={() => ed.onTerminarEditar?.(idConf, txtConf)}
                />
              </foreignObject>
            );
          }

          return (
            <g key={idConf}
               style={ed?.ativo ? { cursor: 'move' } : undefined}
               onDoubleClick={ed?.ativo ? (e) => { e.stopPropagation(); ed.onStartEdit?.(idConf); } : undefined}
               onContextMenu={ed?.ativo ? (e) => { e.preventDefault(); e.stopPropagation(); ed.onMenu?.(idConf, txtConf, e.clientX, e.clientY); } : undefined}
               onPointerDown={ed?.ativo ? (e) => { e.stopPropagation(); ed.onDragStart?.(idConf, e); } : undefined}>
              <TextoQuebrado x={pxConf} y={pyConf} fontSize={fs(8)} larguraChars={70} textAnchor="middle" texto={txtConf} />
            </g>
          );
        })()}
      </g>

      {/* --- CARD D: CARIMBO DO ESCRITÓRIO (largura cheia) --- */}
      <g>
        <rect x={lx} y={902} width={wBox} height={H - 902 - 26} rx={4} ry={4} fill="none" stroke="#000" strokeWidth={0.8} />
        {temLogo ? (
          <g>
            {/* logo maior; o NOME não aparece (o próprio logo já identifica a empresa) */}
            <image href={escritorio.logoDataUrl} x={lx + 12} y={908} width={wBox - 24} height={104} preserveAspectRatio="xMidYMid meet" />
            {T('esc.ramo', escritorio.ramo, { x: cxc, y: 1028, size: fs(8), anchor: 'middle' })}
            {T('esc.cnpj', `CNPJ ${escritorio.cnpj}`, { x: cxc, y: 1042, size: fs(8), anchor: 'middle' })}
            {T('esc.endereco', escritorio.endereco, { x: cxc, y: 1056, size: fs(8), anchor: 'middle', slice: 64 })}
            {T('esc.tel', `Tel./WhatsApp: ${escritorio.telefone}`, { x: cxc, y: 1070, size: fs(8), anchor: 'middle' })}
          </g>
        ) : (
          <g>
            {T('esc.nome', escritorio.nome, { x: cxc, y: 965, size: fs(12), bold: true, anchor: 'middle' })}
            {T('esc.ramo', escritorio.ramo, { x: cxc, y: 987, size: fs(8.5), anchor: 'middle' })}
            {T('esc.cnpj', `CNPJ ${escritorio.cnpj}`, { x: cxc, y: 1005, size: fs(8.5), anchor: 'middle' })}
            {T('esc.endereco', escritorio.endereco, { x: cxc, y: 1023, size: fs(8.5), anchor: 'middle' })}
            {T('esc.tel', `Tel./WhatsApp: ${escritorio.telefone}`, { x: cxc, y: 1041, size: fs(8.5), anchor: 'middle' })}
          </g>
        )}
      </g>
    </g>
  );
}

// símbolo do vértice por tipo (M = losango, P = círculo, V = triângulo)
function SimboloVertice({ tipo, cx, cy, r }: { tipo: string; cx: number; cy: number; r: number }) {
  const cor = tipo === 'M' ? '#f59e0b' : tipo === 'V' ? '#a855f7' : '#22c55e';
  if (tipo === 'M') {
    const d = r * 1.15;
    return <rect x={cx - d} y={cy - d} width={d * 2} height={d * 2} transform={`rotate(45 ${cx} ${cy})`} fill={cor} stroke="#000" strokeWidth={0.5} />;
  }
  if (tipo === 'V') {
    return <polygon points={`${cx},${cy - r * 1.25} ${cx + r * 1.15},${cy + r} ${cx - r * 1.15},${cy + r}`} fill={cor} stroke="#000" strokeWidth={0.5} />;
  }
  return <circle cx={cx} cy={cy} r={r} fill={cor} stroke="#000" strokeWidth={0.5} />;
}

function SimboloDivisa({ tipo, x, y }: { tipo: string; x: number; y: number }) {
  const w = 12;
  const cor = corDivisa(tipo);
  if (cor) return <line x1={x} y1={y} x2={x + w} y2={y} stroke={cor} strokeWidth={3} strokeLinecap="round" />;
  if (tipo === 'cerca') return <g><line x1={x} y1={y} x2={x + w} y2={y} stroke="#000" strokeWidth={1} />{[0, 4, 8, 12].map((d) => <line key={d} x1={x + d} y1={y - 3} x2={x + d} y2={y + 3} stroke="#000" strokeWidth={0.7} />)}</g>;
  if (tipo === 'estrada') return <g><line x1={x} y1={y - 2} x2={x + w} y2={y - 2} stroke="#000" strokeWidth={0.8} /><line x1={x} y1={y + 2} x2={x + w} y2={y + 2} stroke="#000" strokeWidth={0.8} /></g>;
  if (tipo === 'corrego' || tipo === 'rio') return <path d={`M${x} ${y} q3 -4 6 0 t6 0`} fill="none" stroke="#1d4ed8" strokeWidth={1} />;
  if (tipo === 'acude') return <rect x={x} y={y - 3} width={w} height={6} fill="#93c5fd" stroke="#1d4ed8" strokeWidth={0.6} />;
  if (tipo === 'muro') return <rect x={x} y={y - 2} width={w} height={4} fill="#000" />;
  if (tipo === 'vala') return <line x1={x} y1={y} x2={x + w} y2={y} stroke="#000" strokeWidth={1} strokeDasharray="2 2" />;
  return <line x1={x} y1={y} x2={x + w} y2={y} stroke="#000" strokeWidth={1.2} />; // linha ideal
}

// SVG não quebra texto sozinho; quebramos em linhas por contagem de caracteres (texto nativo)
function TextoQuebrado({ x, y, fontSize, larguraChars, texto, textAnchor = 'start' }: { x: number; y: number; fontSize: number; larguraChars: number; texto: string; textAnchor?: 'start' | 'middle' | 'end' }) {
  const palavras = texto.split(' ');
  const linhas: string[] = [];
  let atual = '';
  for (const p of palavras) {
    if ((atual + ' ' + p).trim().length > larguraChars) { linhas.push(atual.trim()); atual = p; }
    else atual = (atual + ' ' + p).trim();
  }
  if (atual) linhas.push(atual.trim());
  return (
    <text x={x} y={y} fontSize={fontSize} fill="#000" textAnchor={textAnchor}>
      {linhas.map((l, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : fontSize * 1.25} textAnchor={textAnchor}>{l}</tspan>
      ))}
    </text>
  );
}
