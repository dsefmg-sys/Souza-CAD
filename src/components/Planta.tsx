'use client';

import { useRef, useState, useEffect, type PointerEvent as ReactPointerEvent } from 'react';
import type { Vertex, ImovelData, TecnicoData, EscritorioData, ResultadoCalculo, Confrontante, PlantaConfig, PessoaQualificada, PontoLL } from '@/lib/topo/types';
import { numBR, formatMatricula, azimuteDMS } from '@/lib/topo/geometry';
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
  resumoGlebas?: { nome: string; areaHa: number; perimetro: number }[]; // quadro de áreas
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
  onExcluirObjeto?: (id: string) => void;                          // soltar item de desenho FORA da folha: exclui
  onMoverRotuloConf?: (id: string, lat: number, lon: number) => void;
  onRemoverSituacao?: () => void;      // clicar na imagem da situação mostra um X; o X chama isto
  onMoverRotuloVertice?: (id: string, lat: number, lon: number) => void;
  onEditarConfrontante?: (id: string) => void;                     // duplo clique no rótulo: editar nome/matrícula
  onTamRotuloConf?: (id: string, delta: number) => void;           // ajusta o tamanho da fonte do rótulo
  onAjustarDivisaConf?: (id: string, az: number, len: number) => void; // arrastar a ponta do tique de troca
  onTextoEditar?: (id: string, atual: string, larguraChars?: number) => void;            // clique duplo: editar conteúdo
  onTextoMenu?: (id: string, atual: string, x: number, y: number) => void; // clique direito: formatar
  onMoverFolha?: (dx: number, dy: number) => void;                // arrastar o vazio: reposiciona a folha
  onTextoMover?: (id: string, dx: number, dy: number) => void;     // arrastar o texto: salva o offset
  onConfigPatch?: (patch: Partial<PlantaConfig>) => void;          // muda config da planta (cor/linha do polígono) a partir da seleção
  onAlternarTipoVertice?: (id: string) => void;                    // clicar num vértice na planta: cicla o tipo (M/P/V)
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

      {isSelected && (() => {
        // contorno dourado ao redor do texto selecionado (deixa claro o que está selecionado)
        const bx = anchor === 'middle' ? posX - textW / 2 : anchor === 'end' ? posX - textW : posX;
        return <rect x={bx - 3} y={posY - fz} width={textW + 6} height={fz + 4} rx={2} fill="none" stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 2" style={{ pointerEvents: 'none' }} />;
      })()}
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
  zona, hemisferio, glebaNome, dataExtenso, situacaoUrl, outrasGlebas = [], resumoGlebas = [], objetos = [], config = {},
  requerente, transmitente,
  editavel = false, modo = 'navegar', objetoSelId = null, desenhoAtual = [],
  onCliquePlanta, onSelecObjeto, onMoverPontoObjeto, onExcluirObjeto, onMoverRotuloConf, onMoverRotuloVertice, onRemoverSituacao,
  onEditarConfrontante, onTamRotuloConf, onAjustarDivisaConf,
  onTextoEditar, onTextoMenu, onMoverFolha, onTextoMover, onConfigPatch, onAlternarTipoVertice, folhaTravada = true,
  editandoTextoId, onSetEditandoTextoId, onTextoStartEdit, onTextoPatch,
}: Props) {
  // hooks antes de qualquer retorno condicional
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<null | { kind: 'objPonto' | 'rotConf' | 'rotVert' | 'folha' | 'ted' | 'divisaConf'; id: string; idx?: number; dx?: number; dy?: number; vx?: number; vy?: number }>(null);
  const folhaLast = useRef<{ x: number; y: number } | null>(null);
  // Arraste suave: em vez de atualizar o estado a cada micro-movimento do mouse (que redesenha o
  // SVG inteiro e trava), juntamos as atualizações e aplicamos no máximo uma por quadro de tela.
  const dragRaf = useRef<number | null>(null);
  const dragPending = useRef<{ dx: number; dy: number; guias?: { x?: number; y?: number; cor: string }[] } | null>(null);

  // Estados locais para seleção e edição em linha (in-place)
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [situacaoSel, setSituacaoSel] = useState(false); // clicou na imagem da situação → mostra o X de excluir
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
    absX?: number; // centro absoluto do elemento no início do arraste (para snap às referências)
    absY?: number;
  } | null>(null);
  // guias de alinhamento coloridas mostradas durante o arraste de um elemento
  const [guias, setGuias] = useState<{ x?: number; y?: number; cor: string }[]>([]);
  // seleção múltipla (Ctrl/Cmd+clique) de elementos 'ted' pra mover vários juntos
  const [multiSel, setMultiSel] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!editavel) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMultiSel(new Set()); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editavel]);

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

  // posição do rótulo de cada vértice: FORA do polígono (não cobre a linha), a uma folga do
  // vértice (não cobre o ponto) e, adiante, empurrado pra não colar em outro rótulo/vértice.
  const fzRot = Math.max(6, fonteRot - 0.5);
  const ptsScr = vertices.map((v) => ({ x: sx(v.leste), y: sy(v.norte) }));
  const nV = ptsScr.length;
  const offBase = Math.max(14, fzRot * 1.7); // folga do vértice, proporcional à fonte
  const initialRotuloVert = vertices.map((v, i) => {
    const vx = ptsScr[i].x, vy = ptsScr[i].y;
    if (v.posRotulo) { const u = geoParaUtm(v.posRotulo.lat, v.posRotulo.lon, zona, hemisferio); return { v, i, x: sx(u.leste), y: sy(u.norte), hasPos: true }; }
    // direção pra FORA = oposto da bissetriz do ângulo interno (média das duas arestas)
    const prev = ptsScr[(i - 1 + nV) % nV], next = ptsScr[(i + 1) % nV];
    const n1x = prev.x - vx, n1y = prev.y - vy, l1 = Math.hypot(n1x, n1y) || 1;
    const n2x = next.x - vx, n2y = next.y - vy, l2 = Math.hypot(n2x, n2y) || 1;
    let ox = -(n1x / l1 + n2x / l2), oy = -(n1y / l1 + n2y / l2);
    let ol = Math.hypot(ox, oy);
    // degenerado (quase reto) ou apontando pra dentro → usa a direção a partir do centróide
    const cdx = vx - cx, cdy = vy - cy;
    if (ol < 0.15 || (ox * cdx + oy * cdy) < 0) { ox = cdx; oy = cdy; ol = Math.hypot(ox, oy) || 1; }
    ox /= ol; oy /= ol;
    return { v, i, x: vx + ox * offBase, y: vy + oy * offBase, hasPos: false };
  });

  // Afasta rótulos que se sobrepõem entre si E que caem em cima de qualquer vértice.
  const minLbl = fzRot * 3.6;   // separação mínima entre dois rótulos
  const minVtx = offBase - 1;   // distância mínima de um rótulo a qualquer vértice
  for (let step = 0; step < 24; step++) {
    for (let i = 0; i < initialRotuloVert.length; i++) {
      const r1 = initialRotuloVert[i];
      if (r1.hasPos) continue;
      // repulsão de outros rótulos
      for (let j = 0; j < initialRotuloVert.length; j++) {
        if (j === i) continue;
        const r2 = initialRotuloVert[j];
        const dx = r1.x - r2.x, dy = r1.y - r2.y;
        const dist = Math.hypot(dx, dy);
        if (dist < minLbl) {
          const f = (minLbl - dist) * 0.5;
          const ux = (dx || (i - j) * 0.01) / (dist || 1), uy = dy / (dist || 1);
          r1.x += ux * f; r1.y += uy * f;
        }
      }
      // repulsão de todos os vértices (não cobrir ponto nem cair sobre vizinho)
      for (let k = 0; k < nV; k++) {
        const dx = r1.x - ptsScr[k].x, dy = r1.y - ptsScr[k].y;
        const dist = Math.hypot(dx, dy);
        if (dist < minVtx) {
          const f = (minVtx - dist) * 0.5;
          const ux = (dx || 0.01) / (dist || 1), uy = dy / (dist || 1);
          r1.x += ux * f; r1.y += uy * f;
        }
      }
      r1.x = clampX(r1.x); r1.y = clampY(r1.y);
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
    // arrastando um item da seleção múltipla: os OUTROS selecionados acompanham o mesmo delta
    if (dragTemp && dragTemp.kind === 'ted' && multiSel.has(id) && multiSel.has(dragTemp.id)) {
      return { ...base, dx: (base.dx ?? 0) + dragTemp.dx, dy: (base.dy ?? 0) + dragTemp.dy };
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
        // Ctrl/Cmd+clique: adiciona/remove da seleção múltipla (não arrasta ainda)
        if (e.ctrlKey || e.metaKey) {
          setMultiSel((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
          return;
        }
        // clique simples num item fora da seleção múltipla limpa a seleção
        if (multiSel.size && !multiSel.has(id)) setMultiSel(new Set());
        const ov = textosOv[id];
        dragRef.current = { kind: 'ted', id, dx: ov?.dx ?? 0, dy: ov?.dy ?? 0 };
        // centro absoluto do elemento (para alinhar às referências do desenho)
        let absX: number | undefined, absY: number | undefined;
        try {
          const el = document.getElementById(id) as unknown as SVGGraphicsElement | null;
          const bb = el?.getBBox();
          if (bb) { absX = bb.x + bb.width / 2; absY = bb.y + bb.height / 2; }
        } catch { /* getBBox pode falhar em elemento vazio */ }
        setDragTemp({ kind: 'ted', id, dx: 0, dy: 0, baseX: ov?.dx ?? 0, baseY: ov?.dy ?? 0, absX, absY });
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
      const guias: { x?: number; y?: number; cor: string }[] = [];

      if (d.kind === 'ted' && dragTemp.absX != null && dragTemp.absY != null) {
        const SNAP = 6, MARG = 24;
        const xs = anel.map((p) => p.x), ys = anel.map((p) => p.y);
        const pMinX = Math.min(...xs), pMaxX = Math.max(...xs), pCx = xs.reduce((a, b) => a + b, 0) / xs.length;
        const pMinY = Math.min(...ys), pMaxY = Math.max(...ys), pCy = ys.reduce((a, b) => a + b, 0) / ys.length;
        // referências: margem (azul claro), centro do desenho (azul escuro), bordas do polígono
        // (amarelo), centro do polígono (laranja)
        const refX = [
          { pos: DRAW.x0 + MARG, cor: '#38bdf8' }, { pos: DRAW.x1 - MARG, cor: '#38bdf8' },
          { pos: (DRAW.x0 + DRAW.x1) / 2, cor: '#1d4ed8' },
          { pos: pMinX, cor: '#eab308' }, { pos: pMaxX, cor: '#eab308' },
          { pos: pCx, cor: '#f97316' },
        ];
        const refY = [
          { pos: DRAW.y0 + MARG, cor: '#38bdf8' }, { pos: DRAW.y1 - MARG, cor: '#38bdf8' },
          { pos: (DRAW.y0 + DRAW.y1) / 2, cor: '#1d4ed8' },
          { pos: pMinY, cor: '#eab308' }, { pos: pMaxY, cor: '#eab308' },
          { pos: pCy, cor: '#f97316' },
        ];
        const curX = dragTemp.absX + dx, curY = dragTemp.absY + dy;
        const hitX = refX.find((r) => Math.abs(curX - r.pos) < SNAP);
        if (hitX) { dx = hitX.pos - dragTemp.absX; guias.push({ x: hitX.pos, cor: hitX.cor }); }
        const hitY = refY.find((r) => Math.abs(curY - r.pos) < SNAP);
        if (hitY) { dy = hitY.pos - dragTemp.absY; guias.push({ y: hitY.pos, cor: hitY.cor }); }
      }

      // coalesce por quadro de tela: no máximo um re-render por frame → arraste suave
      dragPending.current = { dx, dy, guias };
      if (dragRaf.current == null) {
        dragRaf.current = requestAnimationFrame(() => {
          dragRaf.current = null;
          const p = dragPending.current; if (!p) return;
          setDragTemp((prev) => prev ? { ...prev, dx: p.dx, dy: p.dy } : null);
          setGuias(p.guias ?? []);
        });
      }
    }
    if (d.kind === 'objPonto') {
      const g = paraGeo(u);
      onMoverPontoObjeto?.(d.id, d.idx!, g.lat, g.lon);
    }
  }
  function plantaUp(e: ReactPointerEvent) {
    // garante que o último movimento pendente (ainda não aplicado pelo frame) entre no commit final
    if (dragRaf.current != null) { cancelAnimationFrame(dragRaf.current); dragRaf.current = null; }
    const pend = dragPending.current; dragPending.current = null;
    setGuias([]);
    if (dragTemp && dragRef.current) {
      const d = dragRef.current;
      let finalX = dragTemp.baseX + (pend ? pend.dx : dragTemp.dx);
      let finalY = dragTemp.baseY + (pend ? pend.dy : dragTemp.dy);
      if (d.kind === 'ted') {
        // Item de DESENHO (texto/cota/linha que o usuário adicionou) solto com o cursor FORA da
        // folha A3 é EXCLUÍDO. Textos do carimbo e rótulos de vértice/confrontante não são objetos,
        // então ficam protegidos.
        const drop = svgPonto(e);
        const ehObjeto = objetos.some((o) => o.id === dragTemp.id);
        const foraDaFolha = !!drop && (drop.x < 0 || drop.y < 0 || drop.x > W || drop.y > H);
        if (ehObjeto && foraDaFolha && onExcluirObjeto) onExcluirObjeto(dragTemp.id);
        else if (multiSel.has(dragTemp.id) && multiSel.size > 1) {
          // move TODOS os selecionados pelo mesmo delta (cada um a partir do seu offset salvo)
          const delDx = (pend ? pend.dx : dragTemp.dx);
          const delDy = (pend ? pend.dy : dragTemp.dy);
          for (const id of multiSel) {
            const b = textosOv[id] || {};
            onTextoMover?.(id, (b.dx ?? 0) + delDx, (b.dy ?? 0) + delDy);
          }
        } else onTextoMover?.(dragTemp.id, finalX, finalY);
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

  // Rótulos da grade: mantém TODAS as linhas, mas só escreve o NÚMERO quando ele não ficaria
  // colado no número anterior (evita a sobreposição dos valores E/N quando as linhas estão perto).
  const gapGrade = fs(7.5) * 8.5;
  const rotuloGrade = (vals: number[], pos: (n: number) => number, lo: number, hi: number) => {
    const set = new Set<number>();
    let last = -Infinity;
    vals.map((v) => ({ v, p: pos(v) })).filter((o) => o.p >= lo && o.p <= hi).sort((a, b) => a.p - b.p)
      .forEach((o) => { if (o.p - last >= gapGrade) { set.add(o.v); last = o.p; } });
    return set;
  };
  const rotX = rotuloGrade(linhasX, sx, DRAW.x0, DRAW.x1);
  const rotY = rotuloGrade(linhasY, sy, DRAW.y0, DRAW.y1);

  return (
    <svg ref={svgRef} id="planta-svg" viewBox={`0 0 ${W} ${H}`} width="100%" height="100%"
      style={{ display: 'block', background: '#fff', fontFamily: 'Arial, Helvetica, sans-serif', cursor: editavel ? (modo === 'navegar' ? 'move' : 'crosshair') : 'default', touchAction: editavel ? 'none' : undefined }}
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
      {/* linha horizontal separando a área do desenho da faixa inferior (situação/convenções/coordenadas) */}
      <line x1={95} y1={DRAW.y1} x2={W - CARW} y2={DRAW.y1} stroke="#000" strokeWidth={1.2} />

      {/* superfície de captura para edição (transparente; não aparece no PDF) */}
      {editavel && <rect x={DRAW.x0} y={DRAW.y0} width={DRAW.x1 - DRAW.x0} height={DRAW.y1 - DRAW.y0} fill="transparent" style={{ pointerEvents: 'all' }} />}

      {/* ---------- GRADE (números DENTRO do quadro, no topo e na esquerda) ---------- */}
      {verGrade && linhasX.map((x) => {
        const valX = sx(x);
        if (valX < DRAW.x0 || valX > DRAW.x1) return null;
        return (
          <g key={`x${x}`}>
            <line x1={valX} y1={DRAW.y0} x2={valX} y2={DRAW.y1} stroke="#8a94a6" strokeWidth={0.5} strokeDasharray="2 5" />
            {rotX.has(x) && valX >= DRAW.x0 + 48 && valX <= DRAW.x1 - 48 && <text x={valX} y={DRAW.y0 + 13} fontSize={fs(7.5)} textAnchor="middle" fill="#475569" stroke="#ffffff" strokeWidth={2.6} paintOrder="stroke" strokeLinejoin="round">{`E ${numBR(x, 4)}`}</text>}
          </g>
        );
      })}
      {verGrade && linhasY.map((y) => {
        const valY = sy(y);
        if (valY < DRAW.y0 || valY > DRAW.y1) return null;
        return (
          <g key={`y${y}`}>
            <line x1={DRAW.x0} y1={valY} x2={DRAW.x1} y2={valY} stroke="#8a94a6" strokeWidth={0.5} strokeDasharray="2 5" />
            {rotY.has(y) && valY >= DRAW.y0 + 48 && valY <= DRAW.y1 - 48 && <text x={DRAW.x0 + 13} y={valY} fontSize={fs(7.5)} textAnchor="middle" fill="#475569" stroke="#ffffff" strokeWidth={2.6} paintOrder="stroke" strokeLinejoin="round" transform={`rotate(-90 ${DRAW.x0 + 13} ${valY})`}>{`N ${numBR(y, 4)}`}</text>}
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
      <polygon points={pts} fill={config.fillPoligono || '#15803d'} fillOpacity={0.08} stroke={config.corPoligono || '#334155'} strokeWidth={config.larguraPoligono ?? 1.8}
        style={editavel ? { cursor: 'pointer' } : undefined}
        onClick={editavel ? (e) => { e.stopPropagation(); setSelecionadoId(selecionadoId === 'planta.poligono' ? null : 'planta.poligono'); } : undefined} />
      {selecionadoId === 'planta.poligono' && (
        <>
          <polygon points={pts} fill="none" stroke="#3b82f6" strokeWidth={1.2} strokeDasharray="5 3" pointerEvents="none" />
          <g style={{ pointerEvents: 'all' }} transform={`translate(${cx - 76}, ${cy - 70})`}>
            <rect x={-8} y={-12} width={164} height={24} rx={7} fill="#ffffff" fillOpacity={0.97} stroke="#cbd5e1" strokeWidth={0.7} />
            <g onClick={(e) => { e.stopPropagation(); onConfigPatch?.({ larguraPoligono: Math.max(0.5, +(((config.larguraPoligono ?? 1.8) - 0.4)).toFixed(1)) }); }} style={{ cursor: 'pointer' }}>
              <circle cx={4} cy={0} r={7} fill="#f1f5f9" stroke="#94a3b8" strokeWidth={0.6} />
              <text x={4} y={3.5} fontSize={11} fontWeight="bold" textAnchor="middle" fill="#475569" style={{ userSelect: 'none' }}>−</text>
            </g>
            <g onClick={(e) => { e.stopPropagation(); onConfigPatch?.({ larguraPoligono: Math.min(5, +(((config.larguraPoligono ?? 1.8) + 0.4)).toFixed(1)) }); }} style={{ cursor: 'pointer' }}>
              <circle cx={22} cy={0} r={7} fill="#f1f5f9" stroke="#94a3b8" strokeWidth={0.6} />
              <text x={22} y={3.5} fontSize={11} fontWeight="bold" textAnchor="middle" fill="#475569" style={{ userSelect: 'none' }}>+</text>
            </g>
            <line x1={34} y1={-9} x2={34} y2={9} stroke="#e2e8f0" strokeWidth={0.8} />
            {['#15803d', '#1d4ed8', '#d97706', '#475569', '#dc2626'].map((c, i) => (
              <g key={c} onClick={(e) => { e.stopPropagation(); onConfigPatch?.({ fillPoligono: c }); }} style={{ cursor: 'pointer' }}>
                <circle cx={48 + i * 18} cy={0} r={7} fill={c} stroke={(config.fillPoligono || '#15803d') === c ? '#0f172a' : '#ffffff'} strokeWidth={(config.fillPoligono || '#15803d') === c ? 1.5 : 0.8} />
              </g>
            ))}
            <g onClick={(e) => { e.stopPropagation(); setSelecionadoId(null); }} style={{ cursor: 'pointer' }}>
              <circle cx={150} cy={0} r={7} fill="#fee2e2" stroke="#fca5a5" strokeWidth={0.6} />
              <text x={150} y={3} fontSize={9} fontWeight="bold" textAnchor="middle" fill="#991b1b" style={{ userSelect: 'none' }}>×</text>
            </g>
          </g>
        </>
      )}

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
        const ax = a.x + nx * off, ay = a.y + ny * off, bx = b.x + nx * off, by = b.y + ny * off;
        // toda divisa (inclusive cerca) sai como uma BARRA colorida contínua, externa à linha
        return (
          <line key={`div${v.id}`} x1={ax} y1={ay} x2={bx} y2={by}
            stroke={cor} strokeWidth={config.larguraDivisasApoio ?? 3.2} strokeLinecap="round" opacity={0.9} />
        );
      })}

      {/* ---------- QUADRO DE ÁREAS (resumo de todos os polígonos; arrastável) ---------- */}
      {config.mostrarQuadroAreas && resumoGlebas.length > 0 && (() => {
        const idQ = 'planta.quadroAreas';
        const ovQ = getOverride(idQ);
        const bx = DRAW.x0 + 24 + (ovQ.dx ?? 0);
        const by = DRAW.y0 + 24 + (ovQ.dy ?? 0);
        const fz = Math.max(7, fonteRot);
        const lh = fz + 5;
        const wq = 250;
        const linhas = resumoGlebas;
        const totalHa = linhas.reduce((s, g) => s + g.areaHa, 0);
        const totalPer = linhas.reduce((s, g) => s + g.perimetro, 0);
        const hq = (linhas.length + 3.4) * lh;
        const colNome = bx + 8, colArea = bx + wq - 128, colPer = bx + wq - 8;
        return (
          <g style={editavel ? { cursor: 'move' } : undefined}
             onPointerDown={editavel ? (e) => { e.stopPropagation(); tedComum.onDragStart(idQ, e); } : undefined}>
            <rect x={bx} y={by} width={wq} height={hq} rx={4} fill="#ffffff" fillOpacity={0.95} stroke="#475569" strokeWidth={0.8} />
            <rect x={bx} y={by} width={wq} height={lh + 2} rx={4} fill="#475569" />
            <text x={bx + wq / 2} y={by + lh - 2} fontSize={fz} fontWeight="bold" fill="#fff" textAnchor="middle">QUADRO DE ÁREAS</text>
            <text x={colNome} y={by + lh * 2} fontSize={fz - 1} fontWeight="bold" fill="#475569">POLÍGONO</text>
            <text x={colArea} y={by + lh * 2} fontSize={fz - 1} fontWeight="bold" fill="#475569" textAnchor="end">ÁREA (ha)</text>
            <text x={colPer} y={by + lh * 2} fontSize={fz - 1} fontWeight="bold" fill="#475569" textAnchor="end">PERÍM. (m)</text>
            {linhas.map((g, i) => {
              const y = by + lh * (3 + i);
              return (
                <g key={i}>
                  <text x={colNome} y={y} fontSize={fz} fill="#0f172a">{g.nome.slice(0, 22)}</text>
                  <text x={colArea} y={y} fontSize={fz} fill="#0f172a" textAnchor="end">{numBR(g.areaHa, 4)}</text>
                  <text x={colPer} y={y} fontSize={fz} fill="#0f172a" textAnchor="end">{numBR(g.perimetro)}</text>
                </g>
              );
            })}
            <line x1={bx + 6} y1={by + lh * (3 + linhas.length) - lh + 4} x2={bx + wq - 6} y2={by + lh * (3 + linhas.length) - lh + 4} stroke="#cbd5e1" strokeWidth={0.6} />
            <text x={colNome} y={by + lh * (3.2 + linhas.length)} fontSize={fz} fontWeight="bold" fill="#0f172a">TOTAL{linhas.length > 1 ? ` (${linhas.length})` : ''}</text>
            <text x={colArea} y={by + lh * (3.2 + linhas.length)} fontSize={fz} fontWeight="bold" fill="#0f172a" textAnchor="end">{numBR(totalHa, 4)}</text>
            <text x={colPer} y={by + lh * (3.2 + linhas.length)} fontSize={fz} fontWeight="bold" fill="#0f172a" textAnchor="end">{numBR(totalPer)}</text>
          </g>
        );
      })()}

      {/* ---------- ROTEIRO PERIMÉTRICO (tabela vértice→vértice; arrastável) ---------- */}
      {config.mostrarRoteiro && res.lados.length > 0 && (() => {
        const idR = 'planta.roteiro';
        const ovR = getOverride(idR);
        const comConf = config.roteiroComConfrontante !== false;
        const nomeConf = (cid: string | null) => (cid ? (confrontantes.find((c) => c.id === cid)?.nome || '—') : '—');
        const fz = Math.max(6.5, fonteRot - 1);
        const lh = fz + 4;
        const wr = comConf ? 300 : 200;
        const bx = DRAW.x0 + 24 + (ovR.dx ?? 0);
        const by = DRAW.y1 - 24 - (res.lados.length + 2.5) * lh + (ovR.dy ?? 0);
        const cV = bx + 8, cAz = bx + 70, cDist = bx + (comConf ? 150 : 192), cConf = bx + wr - 8;
        const hr = (res.lados.length + 2.4) * lh;
        return (
          <g style={editavel ? { cursor: 'move' } : undefined}
             onPointerDown={editavel ? (e) => { e.stopPropagation(); tedComum.onDragStart(idR, e); } : undefined}>
            <rect x={bx} y={by} width={wr} height={hr} rx={4} fill="#ffffff" fillOpacity={0.95} stroke="#475569" strokeWidth={0.8} />
            <rect x={bx} y={by} width={wr} height={lh + 2} rx={4} fill="#475569" />
            <text x={bx + wr / 2} y={by + lh - 2} fontSize={fz} fontWeight="bold" fill="#fff" textAnchor="middle">ROTEIRO PERIMÉTRICO</text>
            <text x={cV} y={by + lh * 2} fontSize={fz - 1} fontWeight="bold" fill="#475569">VÉRTICE</text>
            <text x={cAz} y={by + lh * 2} fontSize={fz - 1} fontWeight="bold" fill="#475569">AZIMUTE</text>
            <text x={cDist} y={by + lh * 2} fontSize={fz - 1} fontWeight="bold" fill="#475569" textAnchor="end">DIST (m)</text>
            {comConf && <text x={cConf} y={by + lh * 2} fontSize={fz - 1} fontWeight="bold" fill="#475569" textAnchor="end">CONFRONTANTE</text>}
            {res.lados.map((l, i) => {
              const y = by + lh * (3 + i);
              return (
                <g key={i}>
                  <text x={cV} y={y} fontSize={fz} fill="#0f172a">{l.de.codigoSigef || l.de.nome}</text>
                  <text x={cAz} y={y} fontSize={fz} fill="#0f172a">{azimuteDMS(l.azimute)}</text>
                  <text x={cDist} y={y} fontSize={fz} fill="#0f172a" textAnchor="end">{numBR(l.distancia)}</text>
                  {comConf && <text x={cConf} y={y} fontSize={fz} fill="#0f172a" textAnchor="end">{nomeConf(l.confrontanteId).slice(0, 20)}</text>}
                </g>
              );
            })}
          </g>
        );
      })()}

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

      {/* confrontantes (rótulo + linha de assinatura). Layout: matrícula no topo, depois a LINHA de
          assinatura SOBRE o nome do confrontante; quando há cônjuge, uma SEGUNDA linha de assinatura
          sobre o nome do cônjuge (não mais as duas linhas juntas no topo). */}
      {rotulosConf.map((r, i) => {
        if (!r.c || !r.c.nome) return null;
        const c = r.c;
        const fz = c.tamRotulo && c.tamRotulo > 0 ? +(c.tamRotulo * escTxt).toFixed(2) : fonteRot;
        const todas = rotuloConfrontanteLinhas(c);
        // cônjuge só conta se a função realmente anexou as 2 linhas dele (não acontece em espólio)
        const temConjLinhas = !!c.conjugeNome && todas.length >= 2 && /^C[ôo]njuge:/i.test(todas[todas.length - 2]);
        const conjLines = temConjLinhas ? todas.slice(-2) : [];
        const principalAll = temConjLinhas ? todas.slice(0, -2) : todas;
        const matLine = principalAll.find((l) => /^Matr[íi]cula/i.test(l)) ?? null;
        const principalSemMat = principalAll.filter((l) => l !== matLine);

        const half = Math.max(86, fz * 9);
        const boxW = half * 2 + 16;
        const lineH = fz + 3;
        const signRoom = Math.max(40, fz * 4); // espaço acima de cada linha para a firma; cresce com a fonte pra nunca sobrepor texto vizinho
        const nText = (matLine ? 1 : 0) + principalSemMat.length + conjLines.length;
        const nSig = temConjLinhas ? 2 : 1;
        const boxH = nText * lineH + nSig * (signRoom + 6) + 14;

        const isDragging = dragTemp && dragTemp.kind === 'rotConf' && dragTemp.id === c.id;
        const px = isDragging ? r.x + dragTemp.dx : r.x;
        const py = isDragging ? r.y + dragTemp.dy : r.y;
        const top = py - boxH / 2;

        // posiciona cada elemento (texto ou linha de assinatura) de cima para baixo
        const placed: { kind: 'text' | 'sig'; t?: string; y: number }[] = [];
        let cur = top + 7;
        if (matLine) { cur += lineH; placed.push({ kind: 'text', t: matLine, y: cur - 2 }); }
        cur += signRoom; placed.push({ kind: 'sig', y: cur }); cur += 6;
        principalSemMat.forEach((t) => { cur += lineH; placed.push({ kind: 'text', t, y: cur - 2 }); });
        if (temConjLinhas) {
          cur += signRoom; placed.push({ kind: 'sig', y: cur }); cur += 6;
          conjLines.forEach((t) => { cur += lineH; placed.push({ kind: 'text', t, y: cur - 2 }); });
        }

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
            <rect x={px - half - 8} y={top} width={boxW} height={boxH} fill="#ffffff" fillOpacity={0.92} stroke="#cbd5e1" strokeWidth={0.7} rx={4} ry={4} />
            {placed.map((p, k) => p.kind === 'sig'
              ? <line key={k} x1={px - half} y1={p.y} x2={px + half} y2={p.y} stroke="#475569" strokeWidth={0.7} />
              : <text key={k} x={px} y={p.y} fontSize={fz} textAnchor="middle" fill="#0f172a">{p.t}</text>
            )}
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
      {rotuloVert.map(({ v, i, x, y }) => {
        const vx = sx(v.leste), vy = sy(v.norte);
        const vsel = editavel && selecionadoId === `vsel.${v.id}`;
        return (
          <g key={v.id}>
            {vsel && <circle cx={vx} cy={vy} r={9} fill="none" stroke="#3b82f6" strokeWidth={0.9} strokeDasharray="3 2" />}
            <g style={editavel ? { cursor: 'pointer' } : undefined}
               onClick={editavel ? (e) => { e.stopPropagation(); setSelecionadoId(selecionadoId === `vsel.${v.id}` ? null : `vsel.${v.id}`); } : undefined}>
              {editavel && <circle cx={vx} cy={vy} r={8} fill="transparent" />}
              <SimboloVertice tipo={v.tipo} cx={vx} cy={vy} r={v.tipo === 'M' ? 3.6 : v.tipo === 'V' ? 3 : 2.6} />
            </g>
            {(() => {
              // linha-guia tracejada ligando o rótulo ao seu vértice (deixa claro de quem é o nome).
              // Conecta no lado do rótulo (esquerdo OU direito) mais próximo do vértice — o texto é
              // ancorado à esquerda (x), então o canto direito fica em x + largura do texto.
              const ovR = getOverride(`vert.${v.id}`);
              const lxr = x + (ovR.dx ?? 0), lyr = y + (ovR.dy ?? 0);
              const rot = nomeVertice(v, i);
              const fzr = Math.max(6, fonteRot - 0.5) * (ovR.escala ?? 1);
              const w = Math.max(fzr, rot.length * fzr * 0.6);
              const leftX = lxr, rightX = lxr + w;
              const midY = lyr - fzr * 0.35; // meio vertical do texto (baseline fica em lyr)
              const alvoX = Math.abs(vx - leftX) <= Math.abs(vx - rightX) ? leftX : rightX;
              const dGuia = Math.hypot(alvoX - vx, midY - vy);
              if (dGuia < 12) return null;
              const ux = (alvoX - vx) / dGuia, uy = (midY - vy) / dGuia;
              return <line x1={vx + ux * 5} y1={vy + uy * 5} x2={alvoX - ux * 3} y2={midY - uy * 3} stroke="#64748b" strokeWidth={0.55} strokeDasharray="2.5 2.5" />;
            })()}
            <Ted x={x} y={y} base={nomeVertice(v, i)} size={Math.max(6, fonteRot - 0.5)} fill="#000" {...tProps(`vert.${v.id}`)} halo />
            {vsel && (
              <g style={{ pointerEvents: 'all' }} transform={`translate(${vx}, ${vy - 24})`}>
                <rect x={-34} y={-11} width={68} height={22} rx={6} fill="#ffffff" fillOpacity={0.97} stroke="#cbd5e1" strokeWidth={0.7} />
                <g onClick={(e) => { e.stopPropagation(); onAlternarTipoVertice?.(v.id); }} style={{ cursor: 'pointer' }}>
                  <rect x={-30} y={-7} width={40} height={14} rx={3} fill="#f1f5f9" stroke="#94a3b8" strokeWidth={0.5} />
                  <text x={-10} y={2.5} fontSize={8} fontWeight="bold" textAnchor="middle" fill="#334155" style={{ userSelect: 'none' }}>Tipo: {v.tipo} ⟳</text>
                </g>
                <g onClick={(e) => { e.stopPropagation(); setSelecionadoId(null); }} style={{ cursor: 'pointer' }}>
                  <circle cx={24} cy={0} r={7} fill="#fee2e2" stroke="#fca5a5" strokeWidth={0.6} />
                  <text x={24} y={3} fontSize={9} fontWeight="bold" textAnchor="middle" fill="#991b1b" style={{ userSelect: 'none' }}>×</text>
                </g>
              </g>
            )}
          </g>
        );
      })}

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
                  fill="#000000"
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

      {/* O diagrama técnico de convergência (NV/NQ/NM) agora vive DENTRO da seção
          "Informações de Coordenadas" (FaixaInferior), seu lugar natural. */}

      {/* ---------- FAIXA INFERIOR (SITUAÇÃO, CONVENÇÕES, INFOS COORDENADAS) ---------- */}
      <FaixaInferior
        imovel={imovel} res={res} ef={ef} tecnico={tecnico} zona={zona} hemisferio={hemisferio}
        vref={vref} conv={conv} decl={decl} represUsadas={represUsadas} fatorK={fatorK}
        verConv={verConv} verNortes={verNortes} escala={escTxt} situacaoUrl={situacaoUrl} verSituacao={verSituacao}
        coordEditavel={editavel} coordGetOv={getOverride}
        onCoordItemDown={(id, e) => { e.stopPropagation(); tedComum.onDragStart(id, e); }}
        situacaoSel={situacaoSel} onSituacaoClick={() => setSituacaoSel((s) => !s)}
        onRemoverSituacao={() => { setSituacaoSel(false); onRemoverSituacao?.(); }}
      />

      {/* ---------- CARIMBO (coluna direita - reformulada) ---------- */}
      <CarimboA3
        imovel={imovel} ef={ef} tecnico={tecnico} escritorio={escritorio} glebaNome={glebaNome}
        escalaDenom={escalaDenom} dataExtenso={dataExtenso}
        titulo={(config.titulo || 'Levantamento Planimétrico Georreferenciado').toUpperCase()} folha={config.folha || 'Única'}
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
      />      {editavel && guias.map((g, i) => (
        <g key={i}>
          {g.x != null && <line x1={g.x} y1={DRAW.y0} x2={g.x} y2={DRAW.y1} stroke={g.cor} strokeWidth={0.9} strokeDasharray="5 3" />}
          {g.y != null && <line x1={DRAW.x0} y1={g.y} x2={DRAW.x1} y2={g.y} stroke={g.cor} strokeWidth={0.9} strokeDasharray="5 3" />}
        </g>
      ))}
      {editavel && multiSel.size > 0 && (
        <g>
          <rect x={DRAW.x0 + 6} y={DRAW.y0 + 6} width={224} height={18} rx={4} fill="#1d4ed8" fillOpacity={0.9} />
          <text x={DRAW.x0 + 12} y={DRAW.y0 + 18.5} fontSize={10} fill="#fff">{multiSel.size} selecionado(s) — arraste p/ mover juntos · Esc limpa</text>
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
  coordEditavel?: boolean; coordGetOv?: (id: string) => TextoOverride; onCoordItemDown?: (id: string, e: ReactPointerEvent) => void;
  situacaoSel?: boolean; onSituacaoClick?: () => void; onRemoverSituacao?: () => void;
}) {
  const { imovel, ef, zona, hemisferio, vref, conv, decl, represUsadas, fatorK, verConv, verNortes, escala, situacaoUrl, verSituacao, coordEditavel, coordGetOv, onCoordItemDown, situacaoSel, onSituacaoClick, onRemoverSituacao } = props;
  const fs = (n: number) => +(n * escala).toFixed(2);
  const y0 = 897;           // Alinhado dentro da faixa inferior com margem de 10px em relação a DRAW.y1 (887)
  const hBox = 190;         // Altura de 190px garante que termina exatamente em 1087 (10px antes da margem inferior 1097)

  const lon = grausParaDMS(vref.lon, { estilo: 'memorial', casas: 3 });
  const lat = grausParaDMS(vref.lat, { estilo: 'memorial', casas: 3 });

  // Posições X das 3 caixas — margem de 10px da borda esquerda (não colar na moldura) e
  // espaçamento padronizado de 12px entre caixas; termina 10px antes da divisória do carimbo (1117)
  const w1 = 244;
  const w2 = 200;
  const w3 = 534;

  const x1 = DRAW.x0 + 10; // 105
  const x2 = x1 + w1 + 12; // 361
  const x3 = x2 + w2 + 12; // 573

  return (
    <g>
      {/* --- BOX 1: SITUAÇÃO --- */}
      <g>
        <rect x={x1} y={y0} width={w1} height={hBox} rx={6} ry={6} fill="none" stroke="#475569" strokeWidth={0.8} />
        <rect x={x1} y={y0} width={w1} height={24} rx={6} ry={6} fill="#475569" />
        <rect x={x1} y={y0 + 18} width={w1} height={6} fill="#475569" />
        <text x={x1 + w1 / 2} y={y0 + 16} fontSize={fs(9.5)} fontWeight="bold" fill="#fff" textAnchor="middle">SITUAÇÃO</text>
        {situacaoUrl && verSituacao ? (
          <g>
            <image href={situacaoUrl} x={x1 + 6} y={y0 + 30} width={w1 - 12} height={hBox - 36} preserveAspectRatio="xMidYMid slice"
              style={coordEditavel ? { cursor: 'pointer' } : undefined}
              onClick={coordEditavel && onSituacaoClick ? (e) => { e.stopPropagation(); onSituacaoClick(); } : undefined} />
            {coordEditavel && situacaoSel && (
              <g style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); if (window.confirm('Remover a planta de situação?')) onRemoverSituacao?.(); }}>
                <circle cx={x1 + w1 - 14} cy={y0 + 38} r={8} fill="#fee2e2" stroke="#dc2626" strokeWidth={1} />
                <text x={x1 + w1 - 14} y={y0 + 41.5} fontSize={11} fontWeight="bold" textAnchor="middle" fill="#dc2626" style={{ userSelect: 'none' }}>×</text>
              </g>
            )}
          </g>
        ) : (
          <g>
            <rect x={x1 + 6} y={y0 + 30} width={w1 - 12} height={hBox - 36} fill="#f8fafc" stroke="#e2e8f0" strokeWidth={0.6} />
            <text x={x1 + w1 / 2} y={y0 + 30 + (hBox - 36) / 2 + 3} fontSize={fs(9)} fill="#94a3b8" textAnchor="middle">Situação Indisponível</text>
          </g>
        )}
      </g>

      {/* --- BOX 2: CONVENÇÕES --- */}
      {verConv && (() => {
        // Vértice tipo V (virtual) só entra na legenda se existir algum no desenho.
        const temV = props.res.vertices.some((v) => v.tipo === 'V');
        const verts: { tipo: 'M' | 'P' | 'V'; r: number }[] = [
          { tipo: 'M', r: 3.6 }, { tipo: 'P', r: 2.6 },
          ...(temV ? [{ tipo: 'V' as const, r: 3 }] : []),
        ];
        const divs = ['linha-ideal', ...represUsadas.filter((r) => r !== 'linha-ideal')];
        // divisas em DUAS colunas quando não caberiam confortavelmente numa só (textos curtos:
        // cerca, córrego, estrada... cabem lado a lado). Vértices sempre em coluna única (texto maior).
        const duasColunas = verts.length + divs.length > 6;
        const nDivLin = duasColunas ? Math.ceil(divs.length / 2) : divs.length;
        const totalLin = verts.length + 0.4 + nDivLin; // 0.4 = respiro entre seções
        // espaçamento adaptável pra nunca estourar a caixa
        const lh = Math.min(22, Math.max(12.5, (hBox - 52) / totalLin));
        const colW = (w2 - 24) / 2;
        return (
          <g>
            <rect x={x2} y={y0} width={w2} height={hBox} rx={6} ry={6} fill="none" stroke="#475569" strokeWidth={0.8} />
            <rect x={x2} y={y0} width={w2} height={24} rx={6} ry={6} fill="#475569" />
            <rect x={x2} y={y0 + 18} width={w2} height={6} fill="#475569" />
            <text x={x2 + w2 / 2} y={y0 + 16} fontSize={fs(9.5)} fontWeight="bold" fill="#fff" textAnchor="middle">CONVENÇÕES</text>

            <g transform={`translate(${x2 + 14}, ${y0 + 40})`} fontSize={fs(8.5)} fill="#0f172a">
              {verts.map((v, i) => (
                <g key={v.tipo} transform={`translate(0, ${i * lh})`}>
                  <SimboloVertice tipo={v.tipo} cx={5} cy={5} r={v.r} />
                  <text x={18} y={8}>Vértice tipo {v.tipo}</text>
                </g>
              ))}
              {divs.map((d, i) => {
                const col = duasColunas ? i % 2 : 0;
                const lin = duasColunas ? Math.floor(i / 2) : i;
                const y = (verts.length + 0.4 + lin) * lh;
                return (
                  <g key={d} transform={`translate(${col * colW}, ${y})`}>
                    <SimboloDivisa tipo={d} x={0} y={5} />
                    <text x={16} y={8}>{REPRES_LABEL[d] || d}</text>
                  </g>
                );
              })}
            </g>
          </g>
        );
      })()}

      {/* --- BOX 3: INFORMAÇÕES DE COORDENADAS (quadro fixo; os BLOCOS internos é que se arrastam) --- */}
      <g>
        <rect x={x3} y={y0} width={w3} height={hBox} rx={6} ry={6} fill="none" stroke="#475569" strokeWidth={0.8} />
        <rect x={x3} y={y0} width={w3} height={24} rx={6} ry={6} fill="#475569" />
        <rect x={x3} y={y0 + 18} width={w3} height={6} fill="#475569" />
        <text x={x3 + w3 / 2} y={y0 + 16} fontSize={fs(9.5)} fontWeight="bold" fill="#fff" textAnchor="middle">INFORMAÇÕES DE COORDENADAS</text>

        {(() => {
          // cada bloco interno vira um grupo arrastável com seu próprio deslocamento salvo
          const bloco = (id: string, children: React.ReactNode) => {
            const ov = coordGetOv?.(id) || {};
            return (
              <g transform={`translate(${ov.dx ?? 0}, ${ov.dy ?? 0})`}
                 style={coordEditavel ? { cursor: 'move' } : undefined}
                 onPointerDown={coordEditavel && onCoordItemDown ? (e) => onCoordItemDown(id, e) : undefined}>
                {children}
              </g>
            );
          };
          return (
            <>
              {/* Projeção (texto à esquerda) */}
              {bloco('coord.projecao', (
                <g fill="#0f172a">
                  <rect x={x3 + 8} y={y0 + 36} width={220} height={68} fill="transparent" />
                  <text x={x3 + 12} y={y0 + 48} fontSize={fs(8.5)} fontWeight="bold">Projeção Universal Transversa</text>
                  <text x={x3 + 12} y={y0 + 63} fontSize={fs(8.5)} fontWeight="bold">de Mercator (UTM)</text>
                  <text x={x3 + 12} y={y0 + 80} fontSize={fs(8.5)}>SGR (Ref.): <tspan fontWeight="bold">SIRGAS2000</tspan></text>
                  <text x={x3 + 12} y={y0 + 96} fontSize={fs(8.5)}>Fuso <tspan fontWeight="bold">{zona}{hemisferio}</tspan> / MC <tspan fontWeight="bold">{Math.abs(meridianoCentral(zona))}° {meridianoCentral(zona) < 0 ? 'W' : 'E'}</tspan></text>
                </g>
              ))}

              {/* Diagrama técnico de convergência (NV/NQ/NM); valores exatos na coluna ao lado */}
              {verNortes && bloco('coord.diagrama', (
                <g>
                  {/* área transparente de captura: sem ela, só as linhas finas do diagrama pegavam o
                      arraste, e era quase impossível "pegar" o bloco */}
                  <rect x={x3 + 28} y={y0 + 100} width={180} height={94} fill="transparent" />
                  <Nortes cx={x3 + 75} cy={y0 + 148} conv={conv} decl={decl} fs={fs} />
                  {/* rótulo à direita do diagrama, alinhado ao centro vertical dele */}
                  <text x={x3 + 128} y={y0 + 145} fontSize={fs(7.5)} fontWeight="bold" fill="#475569">Diagrama de</text>
                  <text x={x3 + 128} y={y0 + 156} fontSize={fs(7.5)} fontWeight="bold" fill="#475569">Convergência</text>
                </g>
              ))}

              {/* Valores do vértice de referência (coluna direita) */}
              {bloco('coord.valores', (
                <g transform="translate(260, 0)" fill="#0f172a">
                  <rect x={x3 + 8} y={y0 + 36} width={w3 - 268} height={140} fill="transparent" />
                  <text x={x3 + 12} y={y0 + 48} fontSize={fs(9)} fontWeight="bold">Vértice de referência: {vref.codigoSigef || vref.nome}</text>
                  {[
                    ['Latitude:', lat],
                    ['Longitude:', lon],
                    ['Conv. meridiana (CM):', grausParaDMS(conv, { casas: 2, estilo: 'memorial' })],
                    ['Declinação magnética:', grausParaDMS(decl, { casas: 2, estilo: 'memorial' })],
                    ['Fator de escala (K):', fatorK.toFixed(9)],
                  ].map(([label, val], idx) => (
                    <text key={idx} x={x3 + 12} y={y0 + 68 + idx * 19} fontSize={fs(8.5)}>
                      <tspan fontWeight="bold" fill="#475569">{label} </tspan> {val}
                    </text>
                  ))}
                </g>
              ))}
            </>
          );
        })()}
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

  // Cabeçalho escuro (tarja #475569 + título branco) idêntico aos quadros de baixo da planta
  // (Situação/Convenções/Informações de Coordenadas). Se receber um id, o título fica editável.
  const Cab = (y: number, label: string, id?: string, size = 8.5) => (
    <g>
      <rect x={lx} y={y} width={wBox} height={24} rx={6} ry={6} fill="#475569" />
      <rect x={lx} y={y + 18} width={wBox} height={6} fill="#475569" />
      {id
        ? T(id, label, { x: cxc, y: y + 16, size: fs(size), bold: true, anchor: 'middle', fill: '#fff' })
        : <text x={cxc} y={y + 16} fontSize={fs(size)} fontWeight="bold" fill="#fff" textAnchor="middle">{label}</text>}
    </g>
  );

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
      ['PERÍMETRO:', `${numBR(ef.perimetro)} m`],
      ['ÁREA:', `${numBR(ef.areaHa * 10000)} m²`],
    );
  } else {
    campos.push(
      ['PERÍMETRO:', `${numBR(ef.perimetro)} m`],
      ['ÁREA:', `${numBR(ef.areaHa, 4)} ha`],
    );
  }
  campos.push(
    ['DATA:', dataExtenso || '—'],
    // folha e escala juntas numa linha só (ambas curtas)
    ['FOLHA / ESCALA:', `${folha} · 1/${escalaDenom}`],
  );

  // título principal: quebra em até 2 linhas (calculado aqui pra o cabeçalho e os campos se alinharem)
  const tituloTxt = (ed?.textos['carimbo.titulo']?.texto ?? titulo).toUpperCase();
  const maxChTitulo = Math.max(12, Math.floor((wBox - 18) / (fs(12) * 0.62)));
  const tituloLinhas = (() => {
    const pal = tituloTxt.split(' ');
    // título curto (ou de 1 palavra) fica numa linha; título longo é dividido em DUAS linhas
    // equilibradas — para ganhar destaque no cabeçalho, mesmo quando caberia numa linha só.
    if (pal.length < 2 || (tituloTxt.length <= 22 && tituloTxt.length <= maxChTitulo)) return [tituloTxt];
    // ponto de corte na palavra que deixa as duas linhas mais parecidas em comprimento
    let melhor = 1, menorDif = Infinity;
    for (let k = 1; k < pal.length; k++) {
      const a = pal.slice(0, k).join(' ').length, b = pal.slice(k).join(' ').length;
      const dif = Math.abs(a - b);
      if (dif < menorDif) { menorDif = dif; melhor = k; }
    }
    return [pal.slice(0, melhor).join(' '), pal.slice(melhor).join(' ')];
  })();
  const hCabTitulo = tituloLinhas.length > 1 ? 44 : 24;
  const campoStart = hCabTitulo + 20; // início dos campos, com folga do cabeçalho
  const gap = Math.min(27, Math.floor((264 - campoStart - 10) / Math.max(1, campos.length - 1)));

  // Coordenadas verticais do carimbo. O antigo box de TÍTULO saiu: o título virou o CABEÇALHO da
  // seção de Dados (que já traz o nome do imóvel), liberando ~84px que foram redistribuídos para
  // dar mais FOLGA às assinaturas (proprietários e responsável técnico).
  //   y=32  : Dados do imóvel        (h=264) → 296   (cabeçalho = título do levantamento + Folha)
  //   y=306 : Declaração proprietários (h=230) → 536
  //   y=546 : Laudo técnico          (h=230) → 776   (mesma altura da declaração — espaços iguais)
  //   y=786 : Declaração confrontantes (h=110) → 896
  //   y=906 : Escritório             (h=185) → 1091
  const Y_DADOS       = 32;
  const Y_PROP        = 306;
  const H_PROP        = 230;
  const Y_LAUDO       = 546;
  const Y_CONF        = 786;
  const Y_ESC         = 906;
  const H_LAUDO       = 230;
  const H_ESC         = 185;
  // caixas iguais e barras na MESMA altura relativa: o Laudo tem 3 linhas abaixo da barra e o
  // Proprietário 2, mas o espaço de FIRMA (acima da barra) fica igual nos dois.
  const Y_ASSINA_PROP = Y_PROP  + 150;
  const Y_ASSINA_RT   = Y_LAUDO + 150;

  // Assinatura num intervalo livre (xa..xb): linha + nome + detalhes (o rótulo "Assinatura do..."
  // foi removido — era redundante com o cabeçalho da seção e só ocupava espaço). Bloco móvel e coeso.
  const assina = (xa: number, xb: number, yLine: number, nome: string, detalhes: string[] = [], keyPrefix: string) => {
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
        <text x={m} y={yLine + 14} fontSize={fs(9)} fontWeight="bold" fill="#000" textAnchor="middle">{nome}</text>
        {det.map((d, k) => (
          <text key={k} x={m} y={yLine + 27 + k * 11.5} fontSize={fs(7)} fill="#222" textAnchor="middle">{d}</text>
        ))}
      </g>
    );
  };

  return (
    <g>
      {/* Linha separadora vertical principal */}
      <line x1={x0} y1={26} x2={x0} y2={H - 26} stroke="#000" strokeWidth={1.2} />

      {/* O título do levantamento agora é o cabeçalho da seção de Dados (abaixo); a Folha vira um
          rótulo discreto no canto desse mesmo cabeçalho. Não há mais box de título separado. */}

      {/* ── BOX 3: DADOS DO IMÓVEL ────────────────────────────────────────── */}
      <g>
        <rect x={lx} y={Y_DADOS} width={wBox} height={264} rx={6} ry={6} fill="none" stroke="#475569" strokeWidth={0.8} />
        {/* título principal da planta: fonte maior pra destaque; quebra em até 2 linhas quando é longo.
            Duplo clique edita direto na planta (ou escolha um modelo no painel de Planta). */}
        {(() => {
          const idT = 'carimbo.titulo';
          const editando = ed?.editandoId === idT;
          const duas = tituloLinhas.length > 1;
          return (
            <g>
              <rect x={lx} y={Y_DADOS} width={wBox} height={hCabTitulo} rx={6} ry={6} fill="#475569" />
              <rect x={lx} y={Y_DADOS + hCabTitulo - 6} width={wBox} height={6} fill="#475569" />
              {editando ? (
                T(idT, tituloTxt, { x: cxc, y: Y_DADOS + 16, size: fs(10.5), bold: true, anchor: 'middle', fill: '#fff' })
              ) : (
                <g style={ed?.ativo ? { cursor: 'text' } : undefined}
                   onDoubleClick={ed?.ativo ? (e) => { e.stopPropagation(); ed.onStartEdit?.(idT); } : undefined}>
                  {tituloLinhas.map((ln, k) => (
                    <text key={k} x={cxc} y={Y_DADOS + (duas ? 15 + k * 18 : 16)} fontSize={fs(10.5)} fontWeight="bold" fill="#fff" textAnchor="middle">{ln}</text>
                  ))}
                </g>
              )}
            </g>
          );
        })()}
        {campos.map(([k, v], i) => {
          const y = Y_DADOS + campoStart + i * gap;
          return (
            <g key={k}>
              {/* rótulo E valor editáveis por duplo clique (o valor reflete os dados; editar aqui é
                  um ajuste manual do texto da planta, guardado como override) */}
              {T(`rotulo.${i}`, k, { x: lx + 12, y, size: fs(9), bold: true, fill: '#1f2937' })}
              {T(`dado.${i}`, v, { x: lx + 148, y, size: fs(10), bold: true, fill: '#000', slice: 40 })}
            </g>
          );
        })}
      </g>

      {/* ── CARD A: DECLARAÇÃO DO(S) PROPRIETÁRIO(S) ──────────────────────── */}
      <g>
        <rect x={lx} y={Y_PROP} width={wBox} height={H_PROP} rx={6} ry={6} fill="none" stroke="#475569" strokeWidth={0.8} />
        {Cab(Y_PROP, 'DECLARAÇÃO DO(S) PROPRIETÁRIO(S)', 'carimbo.tituloProp')}

        {(() => {
          const idProp = 'carimbo.declProprietario';
          const ovProp = ed?.textos[idProp] || {};
          const txtProp = ovProp.texto || `Atestamos, sob as penas da lei, serem verdadeiras todas as informações apresentadas nesta planta e no memorial anexo, e que indicamos em campo, de forma expressa, as divisas, limites e confrontações consideradas verdadeiras.`;
          const pxProp = cxc + (ovProp.dx ?? 0);
          const pyProp = (Y_PROP + 32) + (ovProp.dy ?? 0);

          if (ed?.editandoId === idProp) {
            const curWidth = Math.max(160, (ovProp.larguraChars ?? 66) * fs(9) * 0.45);
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
                    const ch = Math.round(w / (fs(9) * 0.45));
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
              <TextoQuebrado x={pxProp} y={pyProp} fontSize={fs(9)} larguraChars={ovProp.larguraChars ?? 66} textAnchor="middle" texto={txtProp} />
            </g>
          );
        })()}

        {assina(lx + 90, rx - 90, Y_ASSINA_PROP, imovel.proprietario, [`CPF: ${imovel.cpfProprietario || '—'}`], 'proprietario')}
      </g>

      {/* ── CARD B: LAUDO TÉCNICO / RESPONSÁVEL TÉCNICO ───────────────────── */}
      <g>
        <rect x={lx} y={Y_LAUDO} width={wBox} height={H_LAUDO} rx={6} ry={6} fill="none" stroke="#475569" strokeWidth={0.8} />
        {Cab(Y_LAUDO, 'LAUDO TÉCNICO', 'carimbo.tituloLaudo')}

        {(() => {
          const idLaudo = 'carimbo.laudoTécnico';
          const ovLaudo = ed?.textos[idLaudo] || {};
          const txtLaudo = ovLaudo.texto || textoLaudo;
          const pxLaudo = cxc + (ovLaudo.dx ?? 0);
          const pyLaudo = (Y_LAUDO + 32) + (ovLaudo.dy ?? 0);

          if (ed?.editandoId === idLaudo) {
            const curWidth = Math.max(160, (ovLaudo.larguraChars ?? 66) * fs(9) * 0.45);
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
                    const ch = Math.round(w / (fs(9) * 0.45));
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
              <TextoQuebrado x={pxLaudo} y={pyLaudo} fontSize={fs(9)} larguraChars={ovLaudo.larguraChars ?? 66} textAnchor="middle" texto={txtLaudo} />
            </g>
          );
        })()}

        {assina(lx + 90, rx - 90, Y_ASSINA_RT, tecnico.nome, [tecnico.formacao || '', `CFT: ${tecnico.cft || '—'}  ·  INCRA: ${tecnico.credenciamentoIncra || '—'}`], 'responsavel')}
      </g>

      {/* ── CARD C: DECLARAÇÃO DOS CONFRONTANTES ──────────────────────────── */}
      <g>
        <rect x={lx} y={Y_CONF} width={wBox} height={110} rx={6} ry={6} fill="none" stroke="#475569" strokeWidth={0.8} />
        {Cab(Y_CONF, 'DECLARAÇÃO DOS CONFRONTANTES', 'carimbo.tituloConf')}

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
        <rect x={lx} y={Y_ESC} width={wBox} height={H_ESC} rx={4} ry={4} fill="none" stroke="#000" strokeWidth={0.8} />
        {temLogo ? (() => {
          // Logo REDIMENSIONÁVEL (botão direito aumenta/diminui; escala guardada no override 'esc.logo').
          const logoEsc = ed?.textos['esc.logo']?.escala ?? 1;
          const logoW = (wBox - 24) * logoEsc;
          const logoH = 110 * logoEsc;
          const logoSel = !!ed?.ativo && ed?.selecionadoId === 'esc.logo';
          const ajustarLogo = (d: number) => ed?.onTextoPatch?.('esc.logo', { escala: Math.max(0.4, Math.min(2.5, +(logoEsc + d).toFixed(2))) });
          // Os contatos viram UM bloco de texto só (editável/arrastável), que acompanha a base do logo.
          const idBloco = 'esc.bloco';
          const ovB = ed?.textos[idBloco] || {};
          const txtB = ovB.texto || `${escritorio.ramo}\n${escritorio.endereco}\nTel./WhatsApp: ${escritorio.telefone}`;
          const fzB = fs(8.5) * (ovB.escala ?? 1);
          const pxB = cxc + (ovB.dx ?? 0);
          const pyB = (Y_ESC + 10 + logoH + 20) + (ovB.dy ?? 0);
          return (
            <g>
              {logoSel && <rect x={cxc - logoW / 2 - 2} y={Y_ESC + 8} width={logoW + 4} height={logoH + 4} fill="none" stroke="#3b82f6" strokeWidth={0.8} strokeDasharray="3 2" />}
              <image href={escritorio.logoDataUrl} x={cxc - logoW / 2} y={Y_ESC + 10} width={logoW} height={logoH} preserveAspectRatio="xMidYMid meet"
                style={ed?.ativo ? { cursor: 'pointer' } : undefined}
                onClick={ed?.ativo ? (e) => { e.stopPropagation(); ed.onSelect?.(ed.selecionadoId === 'esc.logo' ? null : 'esc.logo'); } : undefined}
                onContextMenu={ed?.ativo ? (e) => { e.preventDefault(); e.stopPropagation(); ajustarLogo(0.1); } : undefined} />
              {logoSel && (
                <g style={{ pointerEvents: 'all' }}>
                  <g onClick={(e) => { e.stopPropagation(); ajustarLogo(-0.1); }} style={{ cursor: 'pointer' }}>
                    <circle cx={rx - 30} cy={Y_ESC + 12} r={7} fill="#ffffff" fillOpacity={0.95} stroke="#94a3b8" strokeWidth={0.6} />
                    <text x={rx - 30} y={Y_ESC + 15.5} fontSize={11} fontWeight="bold" textAnchor="middle" fill="#475569" style={{ userSelect: 'none' }}>−</text>
                  </g>
                  <g onClick={(e) => { e.stopPropagation(); ajustarLogo(0.1); }} style={{ cursor: 'pointer' }}>
                    <circle cx={rx - 13} cy={Y_ESC + 12} r={7} fill="#ffffff" fillOpacity={0.95} stroke="#94a3b8" strokeWidth={0.6} />
                    <text x={rx - 13} y={Y_ESC + 15.5} fontSize={11} fontWeight="bold" textAnchor="middle" fill="#475569" style={{ userSelect: 'none' }}>+</text>
                  </g>
                </g>
              )}
              {ed?.editandoId === idBloco ? (
                <foreignObject x={pxB - 110} y={pyB - 14} width={220} height={70} style={{ overflow: 'visible' }}>
                  <textarea autoFocus className="w-full h-full border border-blue-500 bg-white text-black outline-none p-1 shadow-md rounded text-[9px]" style={{ resize: 'both', overflow: 'auto' }}
                    value={txtB} onChange={(e) => ed.onEditar?.(idBloco, e.target.value)} onBlur={() => ed.onTerminarEditar?.(idBloco, txtB)} />
                </foreignObject>
              ) : (
                <g style={ed?.ativo ? { cursor: 'move' } : undefined}
                   onDoubleClick={ed?.ativo ? (e) => { e.stopPropagation(); ed.onStartEdit?.(idBloco); } : undefined}
                   onContextMenu={ed?.ativo ? (e) => { e.preventDefault(); e.stopPropagation(); ed.onMenu?.(idBloco, txtB, e.clientX, e.clientY); } : undefined}
                   onPointerDown={ed?.ativo ? (e) => { e.stopPropagation(); ed.onDragStart?.(idBloco, e); } : undefined}>
                  {txtB.split('\n').map((l, k) => (
                    <text key={k} x={pxB} y={pyB + k * (fzB + 3)} fontSize={fzB} textAnchor="middle" fill="#0f172a">{l}</text>
                  ))}
                </g>
              )}
            </g>
          );
        })() : (
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
  const cor = tipo === 'M' ? '#f59e0b' : tipo === 'V' ? '#a855f7' : '#1e3a8a';
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
  return <line x1={x} y1={y} x2={x + w} y2={y} stroke="#334155" strokeWidth={1.2} />; // linha ideal
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
