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
  onTextoEditar?: (id: string, atual: string, larguraChars?: number) => void;            // clique duplo: editar conteúdo
  onTextoMenu?: (id: string, atual: string, x: number, y: number) => void; // clique direito: formatar
  onMoverFolha?: (dx: number, dy: number) => void;                // arrastar o vazio: reposiciona a folha
  onTextoMover?: (id: string, dx: number, dy: number) => void;     // arrastar o texto: salva o offset
  folhaTravada?: boolean;
  editandoTextoId?: string | null;
  onSetEditandoTextoId?: (id: string | null) => void;
  onTextoStartEdit?: () => void;
  onTextoPatch?: (id: string, patch: { escala?: number; texto?: string; negrito?: boolean; dx?: number; dy?: number; larguraChars?: number }) => void;
}

/** Ajuste salvo de um texto (conteúdo/escala/negrito/deslocamento). */
export type TextoOverride = { texto?: string; escala?: number; negrito?: boolean; dx?: number; dy?: number; larguraChars?: number };

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
  if (cond === 'posseiro') {
    linhas.push('Possuidor(a)');
  } else {
    if (c.matricula) linhas.push(`Matrícula nº ${formatMatricula(c.matricula)}`);
  }
  if (c.conjugeNome) {
    linhas.push(`Cônjuge: ${c.conjugeNome}`);
    linhas.push(`CPF Cônjuge: ${c.conjugeCpf || '—'}`);
  }
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
  selecionadoId?: string | null;
  onSelect?: (id: string | null) => void;
  onTextoPatch?: (id: string, patch: { escala?: number }) => void;
}) {
  const { id, x, y, base, size, bold, anchor = 'start', fill = '#000', slice, ov, ed, onMenu, onDragStart, halo = false, editando = false, onTerminarEditar, onStartEdit, selecionadoId, onSelect, onTextoPatch } = props;
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

  const isSelected = ed && selecionadoId === id;
  const textW = fz * (texto?.length || 1) * 0.55;
  const endX = anchor === 'middle' ? posX + textW / 2 : anchor === 'end' ? posX : posX + textW;

  return (
    <g style={ed ? { cursor: 'move' } : undefined}
       onClick={ed ? (e) => { e.stopPropagation(); onSelect?.(id); } : undefined}
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

      {isSelected && (
        <g style={{ pointerEvents: 'all' }}>
          {/* Botão de Diminuir (-) */}
          <g onClick={(e) => {
            e.stopPropagation();
            const esc = ov?.escala ?? 1;
            onTextoPatch?.(id, { escala: Math.max(0.4, +(esc - 0.1).toFixed(2)) });
          }}>
            <circle cx={endX + 25} cy={posY - 3} r={7} fill="#f1f5f9" fillOpacity={0.9} stroke="#94a3b8" strokeWidth={0.5} style={{ cursor: 'pointer' }} />
            <text x={endX + 25} y={posY - 0.5} fontSize={9} fontWeight="bold" textAnchor="middle" fill="#475569" style={{ pointerEvents: 'none', userSelect: 'none' }}>-</text>
          </g>
          {/* Botão de Aumentar (+) */}
          <g onClick={(e) => {
            e.stopPropagation();
            const esc = ov?.escala ?? 1;
            onTextoPatch?.(id, { escala: Math.min(4.0, +(esc + 0.1).toFixed(2)) });
          }}>
            <circle cx={endX + 41} cy={posY - 3} r={7} fill="#f1f5f9" fillOpacity={0.9} stroke="#94a3b8" strokeWidth={0.5} style={{ cursor: 'pointer' }} />
            <text x={endX + 41} y={posY - 0.5} fontSize={8} fontWeight="bold" textAnchor="middle" fill="#475569" style={{ pointerEvents: 'none', userSelect: 'none' }}>+</text>
          </g>
          {/* Botão de Fechar (x) */}
          <g onClick={(e) => {
            e.stopPropagation();
            onSelect?.(null);
          }}>
            <circle cx={endX + 57} cy={posY - 3} r={7} fill="#fee2e2" fillOpacity={0.9} stroke="#fca5a5" strokeWidth={0.5} style={{ cursor: 'pointer' }} />
            <text x={endX + 57} y={posY - 0.5} fontSize={7} fontWeight="bold" textAnchor="middle" fill="#991b1b" style={{ pointerEvents: 'none', userSelect: 'none' }}>x</text>
          </g>
        </g>
      )}
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
  editandoTextoId, onSetEditandoTextoId, onTextoStartEdit, onTextoPatch,
}: Props) {
  // hooks antes de qualquer retorno condicional
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<null | { kind: 'objPonto' | 'rotConf' | 'rotVert' | 'folha' | 'ted' | 'divisaConf'; id: string; idx?: number; dx?: number; dy?: number; vx?: number; vy?: number }>(null);
  const folhaLast = useRef<{ x: number; y: number } | null>(null);

  // Estados locais para seleção e edição em linha (in-place)
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [localEditandoId, setLocalEditandoId] = useState<string | null>(null);
  const editandoId = editandoTextoId !== undefined ? editandoTextoId : localEditandoId;
  const setEditandoId = (id: string | null) => {
    if (onSetEditandoTextoId !== undefined) {
      onSetEditandoTextoId(id);
    } else {
      setLocalEditandoId(id);
    }
    if (id) onTextoStartEdit?.();
  };
  const [guiaAlinhamento, setGuiaAlinhamento] = useState<{ x?: number; y?: number } | null>(null);

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

  const eMin = minX + (DRAW.x0 - 200 - offX) / escala;
  const eMax = minX + (DRAW.x1 + 200 - offX) / escala;
  const nMin = maxY - (DRAW.y1 + 200 - offY) / escala;
  const nMax = maxY - (DRAW.y0 - 200 - offY) / escala;

  const intervalo = intervaloGrade(Math.max(maxX - minX, maxY - minY));
  const linhasX: number[] = [];
  for (let x = Math.ceil(eMin / intervalo) * intervalo; x <= eMax; x += intervalo) linhasX.push(x);
  const linhasY: number[] = [];
  for (let y = Math.ceil(nMin / intervalo) * intervalo; y <= nMax; y += intervalo) linhasY.push(y);

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
    let dist = 85;
    if (dy > 0.1) dist += 35 * dy;
    if (Math.abs(dx) > 0.4) dist += 30 * Math.abs(dx);
    return { c, x: clampX(mx + dx * dist), y: clampY(my + dy * dist) };
  });

  // posição do rótulo de cada vértice (honra posRotulo arrastado; senão, deslocado do ponto)
  const initialRotuloVert = vertices.map((v, i) => {
    const vx = sx(v.leste), vy = sy(v.norte);
    if (v.posRotulo) { const u = geoParaUtm(v.posRotulo.lat, v.posRotulo.lon, zona, hemisferio); return { v, i, x: sx(u.leste), y: sy(u.norte), hasPos: true }; }
    let dx = vx - cx, dy = vy - cy;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    return { v, i, x: vx + dx * 11, y: vy + dy * 11 - 2, hasPos: false };
  });

  // Resolve overlaps between vertex labels (repulsion directly on coordinates)
  const fzRot = Math.max(6, fonteRot - 0.5);
  for (let step = 0; step < 15; step++) {
    for (let i = 0; i < initialRotuloVert.length; i++) {
      for (let j = i + 1; j < initialRotuloVert.length; j++) {
        const r1 = initialRotuloVert[i], r2 = initialRotuloVert[j];
        if (r1.hasPos || r2.hasPos) continue;
        
        const dist = Math.hypot(r2.x - r1.x, r2.y - r1.y);
        const minDist = fzRot * 3.4; // approx 28-32px to ensure clear separation
        if (dist < minDist) {
          let pushX = r2.x - r1.x, pushY = r2.y - r1.y;
          let pushLen = Math.hypot(pushX, pushY) || 1;
          pushX /= pushLen; pushY /= pushLen;
          
          const force = (minDist - dist) * 0.45;
          r1.x -= pushX * force;
          r1.y -= pushY * force;
          r2.x += pushX * force;
          r2.y += pushY * force;
        }
      }
    }
  }

  const rotuloVert = initialRotuloVert.map((r) => ({ v: r.v, i: r.i, x: r.x, y: r.y }));
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

  const terminarEdicao = (id: string, novoTexto: string, larguraChars?: number) => {
    setEditandoId(null);
    onTextoEditar?.(id, novoTexto, larguraChars);
  };

  const tedComum = {
    ed: editavel,
    onMenu: onTextoMenu,
    onStartEdit: (id: string) => setEditandoId(id),
    onTerminarEditar: terminarEdicao,
    selecionadoId,
    onSelect: setSelecionadoId,
    onTextoPatch,
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
      let dx = u.x - folhaLast.current.x;
      let dy = u.y - folhaLast.current.y;
      let guiaX: number | undefined = undefined;
      let guiaY: number | undefined = undefined;

      if (d.kind === 'ted') {
        const SNAP = 6;
        const finalDx = dragTemp.baseX + dx;
        const finalDy = dragTemp.baseY + dy;

        // Snap X (alinhamento original / centro)
        if (Math.abs(finalDx) < SNAP) {
          dx = -dragTemp.baseX;
          const el = document.getElementById(dragTemp.id);
          if (el) {
            const bx = el.getAttribute('x');
            if (bx) guiaX = +bx;
          }
        }
        // Snap Y (alinhamento original)
        if (Math.abs(finalDy) < SNAP) {
          dy = -dragTemp.baseY;
          const el = document.getElementById(dragTemp.id);
          if (el) {
            const by = el.getAttribute('y');
            if (by) guiaY = +by;
          }
        }
      }

      setDragTemp((prev) => prev ? { ...prev, dx, dy } : null);
      setGuiaAlinhamento(guiaX != null || guiaY != null ? { x: guiaX, y: guiaY } : null);
    }
    if (d.kind === 'objPonto') {
      const g = paraGeo(u);
      onMoverPontoObjeto?.(d.id, d.idx!, g.lat, g.lon);
    }
  }
  function plantaUp(e: ReactPointerEvent) {
    setGuiaAlinhamento(null);
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
      {verGrade && linhasX.map((x) => {
        const valX = sx(x);
        if (valX < DRAW.x0 || valX > DRAW.x1) return null;
        return (
          <g key={`x${x}`}>
            <line x1={valX} y1={DRAW.y0} x2={valX} y2={DRAW.y1} stroke="#8a94a6" strokeWidth={0.5} strokeDasharray="2 5" />
            <text x={valX} y={DRAW.y0 + 13} fontSize={fs(7.5)} textAnchor="middle" fill="#475569" stroke="#ffffff" strokeWidth={2.6} paintOrder="stroke" strokeLinejoin="round">{`E ${numBR(x, 4)}`}</text>
          </g>
        );
      })}
      {verGrade && linhasY.map((y) => {
        const valY = sy(y);
        if (valY < DRAW.y0 || valY > DRAW.y1) return null;
        return (
          <g key={`y${y}`}>
            <line x1={DRAW.x0} y1={valY} x2={DRAW.x1} y2={valY} stroke="#8a94a6" strokeWidth={0.5} strokeDasharray="2 5" />
            <text x={DRAW.x0 + 13} y={valY} fontSize={fs(7.5)} textAnchor="middle" fill="#475569" stroke="#ffffff" strokeWidth={2.6} paintOrder="stroke" strokeLinejoin="round" transform={`rotate(-90 ${DRAW.x0 + 13} ${valY})`}>{`N ${numBR(y, 4)}`}</text>
          </g>
        );
      })}

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
        const temConjuge = !!c.conjugeNome;
        const half = Math.max(86, fz * 9);
        const boxW = half * 2 + 16;
        const boxH = (temConjuge ? 74 : 46) + linhas.length * (fz + 2.5);
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
            <rect x={px - half - 8} y={py - (temConjuge ? 70 : 42)} width={boxW} height={boxH} fill="#ffffff" fillOpacity={0.92} stroke="#cbd5e1" strokeWidth={0.7} rx={4} ry={4} />
            <line x1={px - half} y1={py - 14} x2={px + half} y2={py - 14} stroke="#475569" strokeWidth={0.7} />
            {temConjuge && (
              <line x1={px - half} y1={py - 42} x2={px + half} y2={py - 42} stroke="#475569" strokeWidth={0.7} />
            )}
            {linhas.map((t, k) => (
              <text key={k} x={px} y={py + 4 + k * (fz + 2.5)} fontSize={fz} textAnchor="middle" fill="#0f172a">{t}</text>
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

      {/* texto central com dados da gleba (como bloco único arrastável) */}
      {(() => {
        const idCentro = 'planta.centroInfo';
        const ov = textosOv[idCentro] || {};
        const px = cx + (ov.dx ?? 0);
        const py = cy + (ov.dy ?? 0);
        const esc = ov.escala ?? 1;
        const neg = ov.negrito ?? false;

        const linhas = [
          glebaNome || imovel.denominacao || 'Imóvel',
          imovel.matricula ? `Matrícula nº ${formatMatricula(imovel.matricula)}` : '',
          imovel.proprietario ? `Prop.: ${imovel.proprietario}` : '',
          `Área: ${numBR(ef.areaHa, 4)} ha`,
        ].filter(Boolean);

        const fora = !pontoNoPoligono({ x: px, y: py }, anel);

        return (
          <g>
            {fora && (
              <line x1={px} y1={py} x2={cx} y2={cy} stroke="#475569" strokeWidth={0.8} strokeDasharray="3 3" />
            )}
            <g
              style={editavel ? { cursor: 'move' } : undefined}
              onContextMenu={editavel ? (e) => { e.preventDefault(); e.stopPropagation(); onTextoMenu?.(idCentro, linhas[0], e.clientX, e.clientY); } : undefined}
              onPointerDown={editavel ? (e) => {
                e.stopPropagation();
                const u = svgPonto(e); if (!u) return;
                dragRef.current = { kind: 'ted', id: idCentro, dx: ov.dx ?? 0, dy: ov.dy ?? 0 };
                setDragTemp({ kind: 'ted', id: idCentro, dx: 0, dy: 0, baseX: ov.dx ?? 0, baseY: ov.dy ?? 0 });
                folhaLast.current = u;
                captura(e);
              } : undefined}
            >
              {/* Cartão invisível por trás para facilitar o clique/arraste */}
              <rect x={px - 90 * esc} y={py - 16 * esc} width={180 * esc} height={22 * linhas.length * esc + 8 * esc} fill="transparent" />
              {linhas.map((t, i) => (
                <Ted
                  key={i}
                  id={`${idCentro}.${i}`}
                  x={px}
                  y={py + i * 22 * esc}
                  base={t}
                  size={fs(i === 0 ? 13 : 11) * esc}
                  bold={i === 0 || neg}
                  anchor="middle"
                  fill="#1c1917"
                  halo
                  ed={false} // Não editável diretamente por duplo clique para evitar conflitos com arrasto
                />
              ))}
            </g>
          </g>
        );
      })()}

      {/* ---------- BARRA DE ESCALA GRÁFICA (moderna) ---------- */}
      {verEscalaG && (() => {
        const idEscala = 'planta.escalaGrafica';
        const ovEscala = textosOv[idEscala] || {};
        const offset = getOverride(idEscala);
        const nices = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];
        const barM = nices.find((n) => n * escala >= 130) ?? 5000;
        const barPx = barM * escala;
        const seg = barPx / 4;
        const h = 7; // altura da barra
        const bx = (DRAW.x0 + 22) + (offset.dx ?? 0);
        const by = (DRAW.y1 - 40) + (offset.dy ?? 0);
        return (
          <g
            id={idEscala}
            x={DRAW.x0 + 22}
            y={DRAW.y1 - 40}
            transform={`translate(${bx}, ${by})`}
            style={editavel ? { cursor: 'move' } : undefined}
            onPointerDown={editavel ? (e) => {
              e.stopPropagation();
              const u = svgPonto(e); if (!u) return;
              dragRef.current = { kind: 'ted', id: idEscala, dx: ovEscala.dx ?? 0, dy: ovEscala.dy ?? 0 };
              setDragTemp({ kind: 'ted', id: idEscala, dx: 0, dy: 0, baseX: ovEscala.dx ?? 0, baseY: ovEscala.dy ?? 0 });
              folhaLast.current = u;
              captura(e);
            } : undefined}
          >
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

      {/* Rosa dos Ventos - Móvel */}
      {verNortes && (() => {
        const idRosa = 'planta.rosaDosVentos';
        const ovRosa = textosOv[idRosa] || {};
        const offsetRosa = getOverride(idRosa);
        const rcx = (DRAW.x1 - 72) + (offsetRosa.dx ?? 0);
        const rcy = (DRAW.y0 + 74) + (offsetRosa.dy ?? 0);
        return (
          <g
            key="rosa-dos-ventos-g"
            id={idRosa}
            x={DRAW.x1 - 72}
            y={DRAW.y0 + 74}
            style={editavel ? { cursor: 'move' } : undefined}
            onPointerDown={editavel ? (e) => {
              e.stopPropagation();
              const u = svgPonto(e); if (!u) return;
              dragRef.current = { kind: 'ted', id: idRosa, dx: ovRosa.dx ?? 0, dy: ovRosa.dy ?? 0 };
              setDragTemp({ kind: 'ted', id: idRosa, dx: 0, dy: 0, baseX: ovRosa.dx ?? 0, baseY: ovRosa.dy ?? 0 });
              folhaLast.current = u;
              captura(e);
            } : undefined}
          >
            <RosaDosVentos cx={rcx} cy={rcy} fs={fs} />
          </g>
        );
      })()}

      {/* Diagrama Técnico de Norte (Convergência) - Móvel (posicionado no rodapé por padrão) */}
      {verNortes && (() => {
        const idDiag = 'planta.diagramaNortes';
        const ovDiag = textosOv[idDiag] || {};
        const offsetDiag = getOverride(idDiag);
        const x3 = DRAW.x0 + 20, y0 = 897;
        const dcx = (x3 + 76) + (offsetDiag.dx ?? 0);
        const dcy = (y0 + 138) + (offsetDiag.dy ?? 0);
        return (
          <g
            key="diagrama-nortes-g"
            id={idDiag}
            x={x3 + 76}
            y={y0 + 138}
            style={editavel ? { cursor: 'move' } : undefined}
            onPointerDown={editavel ? (e) => {
              e.stopPropagation();
              const u = svgPonto(e); if (!u) return;
              dragRef.current = { kind: 'ted', id: idDiag, dx: ovDiag.dx ?? 0, dy: ovDiag.dy ?? 0 };
              setDragTemp({ kind: 'ted', id: idDiag, dx: 0, dy: 0, baseX: ovDiag.dx ?? 0, baseY: ovDiag.dy ?? 0 });
              folhaLast.current = u;
              captura(e);
            } : undefined}
          >
            <Nortes cx={dcx} cy={dcy} conv={conv} decl={decl} fs={fs} />
          </g>
        );
      })()}

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
          textos: new Proxy(textosOv, { get: (target, prop) => typeof prop === 'string' ? getOverride(prop) : undefined }),
          onEditar: onTextoEditar,
          onMenu: onTextoMenu,
          editandoId,
          onStartEdit: (id) => setEditandoId(id),
          onTerminarEditar: terminarEdicao,
          onDragStart: tedComum.onDragStart,
          selecionadoId,
          onSelect: setSelecionadoId,
          onTextoPatch: tedComum.onTextoPatch,
        }}
      />      {editavel && guiaAlinhamento && (
        <g>
          {guiaAlinhamento.x != null && (
            <line x1={guiaAlinhamento.x} y1={0} x2={guiaAlinhamento.x} y2={H} stroke="#ef4444" strokeWidth={0.8} strokeDasharray="4 2" />
          )}
          {guiaAlinhamento.y != null && (
            <line x1={0} y1={guiaAlinhamento.y} x2={W} y2={guiaAlinhamento.y} stroke="#ef4444" strokeWidth={0.8} strokeDasharray="4 2" />
          )}
        </g>
      )}
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
  const y0 = 897;           // Alinhado dentro da faixa inferior com margem de 10px em relação a DRAW.y1 (887)
  const hBox = 190;         // Altura de 190px garante que termina exatamente em 1087 (10px antes da margem inferior 1097)

  const lon = grausParaDMS(vref.lon, { estilo: 'memorial', casas: 3 });
  const lat = grausParaDMS(vref.lat, { estilo: 'memorial', casas: 3 });

  // Posições X das 3 caixas
  const w1 = 244;
  const w2 = 200;
  const w3 = 544; // Box 3 esticada para terminar em 1107 (10px antes da linha divisória vertical principal 1117)
  
  const x1 = DRAW.x0; // 95
  const x2 = x1 + w1 + 12; // 351
  const x3 = x2 + w2 + 12; // 563

  return (
    <g>
      {/* --- BOX 1: SITUAÇÃO --- */}
      <g>
        <rect x={x1} y={y0} width={w1} height={hBox} rx={6} ry={6} fill="none" stroke="#475569" strokeWidth={0.8} />
        <rect x={x1} y={y0} width={w1} height={24} rx={6} ry={6} fill="#475569" />
        <rect x={x1} y={y0 + 18} width={w1} height={6} fill="#475569" />
        <text x={x1 + w1 / 2} y={y0 + 16} fontSize={fs(9.5)} fontWeight="bold" fill="#fff" textAnchor="middle">SITUAÇÃO</text>
        {situacaoUrl && verSituacao ? (
          <image href={situacaoUrl} x={x1 + 6} y={y0 + 30} width={w1 - 12} height={hBox - 36} preserveAspectRatio="xMidYMid slice" />
        ) : (
          <g>
            <rect x={x1 + 6} y={y0 + 30} width={w1 - 12} height={hBox - 36} fill="#f8fafc" stroke="#e2e8f0" strokeWidth={0.6} />
            <text x={x1 + w1 / 2} y={y0 + 30 + (hBox - 36) / 2 + 3} fontSize={fs(9)} fill="#94a3b8" textAnchor="middle">Situação Indisponível</text>
          </g>
        )}
      </g>

      {/* --- BOX 2: CONVENÇÕES --- */}
      {verConv && (
        <g>
          <rect x={x2} y={y0} width={w2} height={hBox} rx={6} ry={6} fill="none" stroke="#475569" strokeWidth={0.8} />
          <rect x={x2} y={y0} width={w2} height={24} rx={6} ry={6} fill="#475569" />
          <rect x={x2} y={y0 + 18} width={w2} height={6} fill="#475569" />
          <text x={x2 + w2 / 2} y={y0 + 16} fontSize={fs(9.5)} fontWeight="bold" fill="#fff" textAnchor="middle">CONVENÇÕES</text>
          
          <g transform={`translate(${x2 + 15}, ${y0 + 42})`} fontSize={fs(9)} fill="#0f172a">
            <g transform="translate(0, 0)">
              <SimboloVertice tipo="M" cx={5} cy={5} r={3.6} />
              <text x={18} y={8}>Vértices Tipo M</text>
            </g>
            
            <g transform="translate(0, 24)">
              <SimboloVertice tipo="P" cx={5} cy={5} r={2.6} />
              <text x={18} y={8}>Vértices Tipo P</text>
            </g>
            
            <g transform="translate(0, 48)">
              <SimboloVertice tipo="V" cx={5} cy={5} r={3} />
              <text x={18} y={8}>Vértices Tipo V (virtual)</text>
            </g>

            <g transform="translate(0, 72)">
              <SimboloDivisa tipo="linha-ideal" x={0} y={5} />
              <text x={18} y={8}>Linha ideal</text>
            </g>

            {represUsadas.filter((r) => r !== 'linha-ideal').slice(0, 3).map((r, i) => (
              <g key={r} transform={`translate(0, ${96 + i * 24})`}>
                <SimboloDivisa tipo={r} x={0} y={5} />
                <text x={18} y={8}>{REPRES_LABEL[r] || r}</text>
              </g>
            ))}
          </g>
        </g>
      )}

      {/* --- BOX 3: INFORMAÇÕES DE COORDENADAS --- */}
      <g>
        <rect x={x3} y={y0} width={w3} height={hBox} rx={6} ry={6} fill="none" stroke="#475569" strokeWidth={0.8} />
        <rect x={x3} y={y0} width={w3} height={24} rx={6} ry={6} fill="#475569" />
        <rect x={x3} y={y0 + 18} width={w3} height={6} fill="#475569" />
        <text x={x3 + w3 / 2} y={y0 + 16} fontSize={fs(9.5)} fontWeight="bold" fill="#fff" textAnchor="middle">INFORMAÇÕES DE COORDENADAS</text>

        {/* Lado Esquerdo do Box 3 (Projeção e Diagrama) */}
        <g fill="#0f172a">
          <text x={x3 + 12} y={y0 + 40} fontSize={fs(8.5)} fontWeight="bold">Projeção Universal Transversa</text>
          <text x={x3 + 12} y={y0 + 52} fontSize={fs(8.5)} fontWeight="bold">de Mercator (UTM)</text>
          <text x={x3 + 12} y={y0 + 72} fontSize={fs(8.5)}>SGR (Ref.): <tspan fontWeight="bold">SIRGAS2000</tspan></text>
          <text x={x3 + 12} y={y0 + 88} fontSize={fs(8.5)}>Fuso <tspan fontWeight="bold">{zona}{hemisferio}</tspan> / MC <tspan fontWeight="bold">{Math.abs(meridianoCentral(zona))}° {meridianoCentral(zona) < 0 ? 'W' : 'E'}</tspan></text>

        </g>

        {/* Lado Direito do Box 3 (Valores do Vértice de Referência) */}
        <g transform="translate(260, 0)" fill="#0f172a">
          <text x={x3 + 12} y={y0 + 40} fontSize={fs(9)} fontWeight="bold">Vértice de referência: {vref.codigoSigef || vref.nome}</text>
          {[
            ['Latitude:', lat],
            ['Longitude:', lon],
            ['Conv. meridiana (CM):', grausParaDMS(conv, { casas: 2, estilo: 'memorial' })],
            ['Declinação magnética:', grausParaDMS(decl, { casas: 2, estilo: 'memorial' })],
            ['Variação anual:', imovel.variacaoAnual != null ? `${numBR(imovel.variacaoAnual, 1)}'/ano` : '—'],
            ['Fator de escala (K):', fatorK.toFixed(9)],
          ].map(([label, val], idx) => (
            <text key={idx} x={x3 + 12} y={y0 + 60 + idx * 19} fontSize={fs(8.5)}>
              <tspan fontWeight="bold" fill="#475569">{label} </tspan> {val}
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
  const L = 34; // Compacto para evitar colisões
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
    onTerminarEditar?: (id: string, novoTexto: string, larguraChars?: number) => void;
    onDragStart?: (id: string, e: ReactPointerEvent) => void;
    selecionadoId?: string | null;
    onSelect?: (id: string | null) => void;
    onTextoPatch?: (id: string, patch: { escala?: number }) => void;
  };
}) {
  const { imovel, ef, tecnico, escritorio, glebaNome, escalaDenom, dataExtenso, titulo, folha, textoLaudo, textoConfront, escala, ed } = props;
  const fs = (n: number) => +(n * escala).toFixed(2);
  // texto editável do carimbo (atalho para o helper Ted, já ligado ao modo edição)
  const T = (id: string, base: string, o: { x: number; y: number; size: number; bold?: boolean; anchor?: 'start' | 'middle' | 'end'; fill?: string; slice?: number }) => (
    <Ted id={id} base={base} x={o.x} y={o.y} size={o.size} bold={o.bold} anchor={o.anchor} fill={o.fill} slice={o.slice}
      ov={ed?.textos[id]} ed={ed?.ativo} onEditar={ed?.onEditar} onMenu={ed?.onMenu}
      editando={ed?.editandoId === id} onStartEdit={ed?.onStartEdit} onTerminarEditar={ed?.onTerminarEditar}
      onDragStart={ed?.onDragStart} selecionadoId={ed?.selecionadoId} onSelect={ed?.onSelect} onTextoPatch={ed?.onTextoPatch} />
  );
  const x0 = W - CARW; // 1117
  const padX = 10;
  const lx = x0 + padX; // 1127
  const rx = W - 26 - 10;  // 1551 (10px antes da margem direita externa 1561)
  const wBox = rx - lx; // 424
  const cxc = lx + wBox / 2; // 1339
  const temLogo = !!escritorio.logoDataUrl;

  // Lista dos dados do imóvel a serem desenhados na Box de Dados
  const campos: [string, string][] = [
    [imovel.tipoImovel === 'urbano' ? 'LOTE/IMÓVEL:' : 'PROPRIEDADE:', glebaNome || imovel.denominacao || '—'],
    ['PROPRIETÁRIO(A):', imovel.proprietario || '—'],
  ];
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

  const gap = Math.min(27, Math.floor(220 / (campos.length - 1))); // Ajustado para hBox menor (264px)

  // Coordenadas verticais do carimbo — grade otimizada e sem sobreposições:
  //   y=32  : BOX Título/Folha  (h=74)   → base=106
  //   y=116 : BOX Dados         (h=264)  → base=380
  //   y=390 : CARD Proprietários (h=165)  → base=555
  //          texto declaração: y=408..465
  //          linha assinatura: y=495
  //          nome:             y=518
  //          detalhes:         y=531
  //   y=565 : CARD Laudo         (h=180)  → base=745
  //          texto laudo:      y=583..635
  //          linha RT:         y=680
  //          nome:             y=703
  //          detalhes 0:       y=716
  //          detalhes 1:       y=727.5
  //   y=755 : CARD Confrontantes (h=110)  → base=865
  //          texto:            y=773..835
  //   y=875 : CARD Escritório    (h=212)  → base=1087 (10px antes do final)
  const Y_TITULO      = 32;
  const Y_DADOS       = 116;
  const Y_PROP        = 390;
  const Y_LAUDO       = 565;
  const Y_CONF        = 755;
  const Y_ESC         = 875;
  const Y_ASSINA_PROP = Y_PROP  + 105; // 495
  const Y_ASSINA_RT   = Y_LAUDO + 115; // 680

  // Assinatura num intervalo livre (xa..xb): linha + rótulo abaixo + nome + detalhes, com fontes maiores e mais espaçadas (bloco móvel e coeso)
  const assina = (xa: number, xb: number, yLine: number, label: string, nome: string, detalhes: string[] = [], keyPrefix: string) => {
    const idAssina = `carimbo.assina.${keyPrefix}`;
    const ov = ed?.textos[idAssina] || {};
    const dx = ov.dx ?? 0;
    const dy = ov.dy ?? 0;
    const m = (xa + xb) / 2;
    const det = detalhes.filter(Boolean);
    return (
      <g
        id={idAssina}
        x={m}
        y={yLine}
        transform={`translate(${dx}, ${dy})`}
        style={ed?.ativo ? { cursor: 'move' } : undefined}
        onPointerDown={ed?.ativo ? (e) => {
          e.stopPropagation();
          ed.onDragStart?.(idAssina, e);
        } : undefined}
      >
        <line x1={xa} y1={yLine} x2={xb} y2={yLine} stroke="#000" strokeWidth={0.6} />
        <text x={m} y={yLine + 10} fontSize={fs(7.5)} fill="#555" textAnchor="middle">{label}</text>
        <text x={m} y={yLine + 23} fontSize={fs(9)} fontWeight="bold" fill="#000" textAnchor="middle">{nome}</text>
        {det.map((d, k) => (
          <text key={k} x={m} y={yLine + 36 + k * 11.5} fontSize={fs(7)} fill="#222" textAnchor="middle">{d}</text>
        ))}
      </g>
    );
  };

  return (
    <g>
      {/* Linha separadora vertical principal */}
      <line x1={x0} y1={26} x2={x0} y2={H - 26} stroke="#000" strokeWidth={1.2} />

      {/* ── BOX 1: TÍTULO ─────────────────────────────────────────────────── */}
      <g>
        <rect x={lx} y={Y_TITULO} width={wBox - 72} height={74} rx={4} ry={4} fill="none" stroke="#000" strokeWidth={0.8} />
        <text x={lx + 10} y={Y_TITULO + 16} fontSize={fs(8)} fontWeight="bold" fill="#4b5563">Título:</text>
        {T('carimbo.titulo', titulo, { x: lx + (wBox - 72) / 2, y: Y_TITULO + 46, size: fs(9.5), bold: true, anchor: 'middle', fill: '#000' })}
      </g>

      {/* ── BOX 2: FOLHA ──────────────────────────────────────────────────── */}
      <g>
        <rect x={rx - 62} y={Y_TITULO} width={62} height={74} rx={4} ry={4} fill="none" stroke="#000" strokeWidth={0.8} />
        <text x={rx - 54} y={Y_TITULO + 16} fontSize={fs(8)} fill="#4b5563">Folha:</text>
        {T('carimbo.folha', folha, { x: rx - 31, y: Y_TITULO + 46, size: fs(10), bold: true, anchor: 'middle', fill: '#000' })}
      </g>

      {/* ── BOX 3: DADOS DO IMÓVEL ────────────────────────────────────────── */}
      <g>
        <rect x={lx} y={Y_DADOS} width={wBox} height={264} rx={4} ry={4} fill="none" stroke="#000" strokeWidth={0.8} />
        {campos.map(([k, v], i) => {
          const y = Y_DADOS + 24 + i * gap;
          return (
            <g key={k}>
              <text x={lx + 12} y={y} fontSize={fs(9)} fontWeight="bold" fill="#1f2937">{k}</text>
              {T(`dado.${i}`, v, { x: lx + 148, y, size: fs(10), bold: true, fill: '#000', slice: 40 })}
            </g>
          );
        })}
      </g>

      {/* ── CARD A: DECLARAÇÃO DO(S) PROPRIETÁRIO(S) ──────────────────────── */}
      <g>
        <rect x={lx} y={Y_PROP} width={wBox} height={165} rx={4} ry={4} fill="none" stroke="#000" strokeWidth={0.8} />
        {T('carimbo.tituloProp', 'DECLARAÇÃO DO(S) PROPRIETÁRIO(S)', { x: cxc, y: Y_PROP + 16, size: fs(8.5), bold: true, anchor: 'middle' })}

        {(() => {
          const idProp = 'carimbo.declProprietario';
          const ovProp = ed?.textos[idProp] || {};
          const txtProp = ovProp.texto || `Atestamos, sob as penas da lei, serem verdadeiras todas as informações apresentadas nesta planta e no memorial anexo, e que indicamos em campo, de forma expressa, as divisas, limites e confrontações consideradas verdadeiras.`;
          const pxProp = cxc + (ovProp.dx ?? 0);
          const pyProp = (Y_PROP + 32) + (ovProp.dy ?? 0);

          if (ed?.editandoId === idProp) {
            const curWidth = Math.max(160, (ovProp.larguraChars ?? 80) * fs(7.5) * 0.45);
            return (
              <foreignObject x={pxProp - curWidth / 2 - 6} y={pyProp - 15} width={curWidth + 12} height={70} style={{ overflow: 'visible' }}>
                <textarea
                  autoFocus
                  className="w-full h-full border border-blue-500 bg-white text-black outline-none p-1 shadow-md rounded text-[9px]"
                  style={{ resize: 'both', overflow: 'auto' }}
                  value={txtProp}
                  onChange={(e) => ed.onEditar?.(idProp, e.target.value)}
                  onBlur={(e) => {
                    const w = e.currentTarget.clientWidth;
                    const ch = Math.round(w / (fs(7.5) * 0.45));
                    ed.onTerminarEditar?.(idProp, txtProp, ch);
                  }}
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
              <TextoQuebrado x={pxProp} y={pyProp} fontSize={fs(7.5)} larguraChars={ovProp.larguraChars ?? 80} textAnchor="middle" texto={txtProp} />
            </g>
          );
        })()}

        {assina(lx + 90, rx - 90, Y_ASSINA_PROP, 'Assinatura do(s) Proprietário(s)', imovel.proprietario, [`CPF: ${imovel.cpfProprietario || '—'}`], 'proprietario')}
      </g>

      {/* ── CARD B: LAUDO TÉCNICO / RESPONSÁVEL TÉCNICO ───────────────────── */}
      <g>
        <rect x={lx} y={Y_LAUDO} width={wBox} height={180} rx={4} ry={4} fill="none" stroke="#000" strokeWidth={0.8} />
        {T('carimbo.tituloLaudo', 'LAUDO TÉCNICO', { x: cxc, y: Y_LAUDO + 16, size: fs(8.5), bold: true, anchor: 'middle' })}

        {(() => {
          const idLaudo = 'carimbo.laudoTécnico';
          const ovLaudo = ed?.textos[idLaudo] || {};
          const txtLaudo = ovLaudo.texto || textoLaudo;
          const pxLaudo = cxc + (ovLaudo.dx ?? 0);
          const pyLaudo = (Y_LAUDO + 32) + (ovLaudo.dy ?? 0);

          if (ed?.editandoId === idLaudo) {
            const curWidth = Math.max(160, (ovLaudo.larguraChars ?? 80) * fs(7.5) * 0.45);
            return (
              <foreignObject x={pxLaudo - curWidth / 2 - 6} y={pyLaudo - 15} width={curWidth + 12} height={70} style={{ overflow: 'visible' }}>
                <textarea
                  autoFocus
                  className="w-full h-full border border-blue-500 bg-white text-black outline-none p-1 shadow-md rounded text-[9px]"
                  style={{ resize: 'both', overflow: 'auto' }}
                  value={txtLaudo}
                  onChange={(e) => ed.onEditar?.(idLaudo, e.target.value)}
                  onBlur={(e) => {
                    const w = e.currentTarget.clientWidth;
                    const ch = Math.round(w / (fs(7.5) * 0.45));
                    ed.onTerminarEditar?.(idLaudo, txtLaudo, ch);
                  }}
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
              <TextoQuebrado x={pxLaudo} y={pyLaudo} fontSize={fs(7.5)} larguraChars={ovLaudo.larguraChars ?? 80} textAnchor="middle" texto={txtLaudo} />
            </g>
          );
        })()}

        {assina(lx + 90, rx - 90, Y_ASSINA_RT, 'Assinatura do Responsável Técnico', tecnico.nome, [tecnico.formacao || '', `CFT: ${tecnico.cft || '—'}  ·  INCRA: ${tecnico.credenciamentoIncra || '—'}`], 'responsavel')}
      </g>

      {/* ── CARD C: DECLARAÇÃO DOS CONFRONTANTES ──────────────────────────── */}
      <g>
        <rect x={lx} y={Y_CONF} width={wBox} height={110} rx={4} ry={4} fill="none" stroke="#000" strokeWidth={0.8} />
        {T('carimbo.tituloConf', 'DECLARAÇÃO DOS CONFRONTANTES', { x: cxc, y: Y_CONF + 16, size: fs(8.5), bold: true, anchor: 'middle' })}

        {(() => {
          const idConf = 'carimbo.declConfrontantes';
          const ovConf = ed?.textos[idConf] || {};
          const txtConf = ovConf.texto || textoConfront;
          const pxConf = cxc + (ovConf.dx ?? 0);
          const pyConf = (Y_CONF + 32) + (ovConf.dy ?? 0);

          if (ed?.editandoId === idConf) {
            const curWidth = Math.max(160, (ovConf.larguraChars ?? 74) * fs(8) * 0.45);
            return (
              <foreignObject x={pxConf - curWidth / 2 - 6} y={pyConf - 15} width={curWidth + 12} height={70} style={{ overflow: 'visible' }}>
                <textarea
                  autoFocus
                  className="w-full h-full border border-blue-500 bg-white text-black outline-none p-1 shadow-md rounded text-[9px]"
                  style={{ resize: 'both', overflow: 'auto' }}
                  value={txtConf}
                  onChange={(e) => ed.onEditar?.(idConf, e.target.value)}
                  onBlur={(e) => {
                    const w = e.currentTarget.clientWidth;
                    const ch = Math.round(w / (fs(8) * 0.45));
                    ed.onTerminarEditar?.(idConf, txtConf, ch);
                  }}
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
              <TextoQuebrado x={pxConf} y={pyConf} fontSize={fs(8)} larguraChars={ovConf.larguraChars ?? 74} textAnchor="middle" texto={txtConf} />
            </g>
          );
        })()}
      </g>

      {/* ── CARD D: CARIMBO DO ESCRITÓRIO ─────────────────────────────────── */}
      <g>
        <rect x={lx} y={Y_ESC} width={wBox} height={212} rx={4} ry={4} fill="none" stroke="#000" strokeWidth={0.8} />
        {temLogo ? (
          <g>
            {/* logo maior; o NOME não aparece (o próprio logo já identifica a empresa) */}
            <image href={escritorio.logoDataUrl} x={lx + 12} y={Y_ESC + 10} width={wBox - 24} height={110} preserveAspectRatio="xMidYMid meet" />
            {T('esc.ramo',    escritorio.ramo,                        { x: cxc, y: Y_ESC + 136, size: fs(8.5), anchor: 'middle' })}
            {T('esc.endereco', escritorio.endereco,                   { x: cxc, y: Y_ESC + 152, size: fs(8.5), anchor: 'middle', slice: 64 })}
            {T('esc.tel',    `Tel./WhatsApp: ${escritorio.telefone}`, { x: cxc, y: Y_ESC + 168, size: fs(8.5), anchor: 'middle' })}
          </g>
        ) : (
          <g>
            {T('esc.nome',    escritorio.nome,                        { x: cxc, y: Y_ESC + 50, size: fs(12),  bold: true, anchor: 'middle' })}
            {T('esc.ramo',    escritorio.ramo,                        { x: cxc, y: Y_ESC + 80, size: fs(8.5), anchor: 'middle' })}
            {T('esc.endereco', escritorio.endereco,                   { x: cxc, y: Y_ESC + 102, size: fs(8.5), anchor: 'middle' })}
            {T('esc.tel',    `Tel./WhatsApp: ${escritorio.telefone}`, { x: cxc, y: Y_ESC + 124, size: fs(8.5), anchor: 'middle' })}
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
function TextoQuebrado({ x, y, fontSize, larguraChars, texto, textAnchor = 'start', lineHeight = 1.45 }: { x: number; y: number; fontSize: number; larguraChars: number; texto: string; textAnchor?: 'start' | 'middle' | 'end'; lineHeight?: number }) {
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
        <tspan key={i} x={x} dy={i === 0 ? 0 : fontSize * lineHeight} textAnchor={textAnchor}>{l}</tspan>
      ))}
    </text>
  );
}

// Verifica se um ponto plano (x, y) está dentro do anel de vértices (ray casting)
function pontoNoPoligono(p: { x: number; y: number }, vs: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i].x, yi = vs[i].y;
    const xj = vs[j].x, yj = vs[j].y;
    const intersect = ((yi > p.y) !== (yj > p.y))
        && (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
