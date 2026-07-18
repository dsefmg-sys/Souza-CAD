'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RotateCcw, Download, Navigation, Wand2, RefreshCw } from 'lucide-react';
import { type Vertex, type ObjetoDesenho, type ImovelData } from '@/lib/topo/types';
import { triangularDelaunay, pontoNoPoligono, type Ponto3D } from '@/lib/topo/curvasNivel';
import { exportarKML } from '@/lib/export/kml';

// Rampa de cor por altitude (hipsométrica), terrosa, que lê bem sobre o fundo verde-escuro:
// baixo = verde, subindo por bege e marrom, topo = quase branco. t entra normalizado em [0,1].
const RAMPA_RELEVO: { t: number; rgb: [number, number, number] }[] = [
  { t: 0.0, rgb: [46, 89, 64] },    // verde escuro (partes baixas)
  { t: 0.3, rgb: [90, 138, 79] },   // verde
  { t: 0.55, rgb: [201, 178, 106] },// bege / capim seco
  { t: 0.78, rgb: [166, 118, 76] }, // marrom (encostas altas)
  { t: 1.0, rgb: [236, 233, 224] }, // quase branco (picos)
];

function corHipsometrica(t: number): [number, number, number] {
  const c = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0));
  for (let i = 1; i < RAMPA_RELEVO.length; i++) {
    const a = RAMPA_RELEVO[i - 1], b = RAMPA_RELEVO[i];
    if (c <= b.t) {
      const f = (c - a.t) / (b.t - a.t || 1);
      return [
        Math.round(a.rgb[0] + (b.rgb[0] - a.rgb[0]) * f),
        Math.round(a.rgb[1] + (b.rgb[1] - a.rgb[1]) * f),
        Math.round(a.rgb[2] + (b.rgb[2] - a.rgb[2]) * f),
      ];
    }
  }
  return RAMPA_RELEVO[RAMPA_RELEVO.length - 1].rgb;
}

interface Map3DViewerProps {
  vertices: Vertex[];
  objetos: ObjetoDesenho[];
  /** Nuvem de pontos com altitude (vértices + grade altimétrica) para montar a superfície do relevo. */
  pontos3D: Ponto3D[];
  /** Quantos vértices estão sem altitude (cota 0). */
  verticesSemCota?: number;
  /** Dispara o cálculo/interpolação das altitudes que faltam (feito no lado do editor). */
  onCompletarAltitudes?: () => void;
  zona: number;
  hemisferio: 'N' | 'S';
  imovel: ImovelData;
  onVoltar2D: () => void;
}

export default function Map3DViewer({ vertices, objetos, pontos3D, verticesSemCota = 0, onCompletarAltitudes, imovel, onVoltar2D }: Map3DViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Câmera em REFS (não em state): o laço de desenho lê direto a cada quadro, então girar/arrastar/zoom
  // e a rotação automática são suaves e NÃO disparam re-render do React a cada frame.
  const yawRef = useRef(-0.5);   // rotação horizontal
  const pitchRef = useRef(0.8);  // inclinação vertical
  const zoomRef = useRef(1.0);
  // Escala vertical: por padrão FIEL (1:1, mostra o imóvel como ele é). O botão "Realce" liga um
  // destaque fixo e discreto pra enxergar o relevo em terreno plano — sem cursor de números.
  const [realce, setRealce] = useState(false);
  const FATOR_REALCE = 3.0;
  const exagero = realce ? FATOR_REALCE : 1.0;

  // Girar sozinho quando ninguém mexe. `autoGirar` (state) controla o botão; `autoGirarRef` é lido pelo
  // laço sem reiniciá-lo. `ultimaInteracao` marca quando o usuário mexeu pela última vez (pra pausar).
  const [autoGirar, setAutoGirar] = useState(true);
  const autoGirarRef = useRef(true);
  useEffect(() => { autoGirarRef.current = autoGirar; }, [autoGirar]);
  const ultimaInteracao = useRef(0);
  const marcarInteracao = () => { ultimaInteracao.current = performance.now(); };

  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, startYaw: 0, startPitch: 0 });
  // Pinça de dois dedos (zoom no toque): distância e zoom no início do gesto.
  const pinchRef = useRef({ active: false, startDist: 0, startZoom: 1 });

  // Centralização e escala automática
  const finitePts = vertices.filter((v) => Number.isFinite(v.leste) && Number.isFinite(v.norte));
  const hasZ = finitePts.some((v) => (v.elevacao || 0) !== 0);

  const stats = (() => {
    if (finitePts.length === 0) return { avgX: 0, avgY: 0, avgZ: 0, maxDist: 100 };
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    let sumX = 0, sumY = 0, sumZ = 0;

    finitePts.forEach((v) => {
      sumX += v.leste;
      sumY += v.norte;
      sumZ += v.elevacao || 0;
      if (v.leste < minX) minX = v.leste;
      if (v.leste > maxX) maxX = v.leste;
      if (v.norte < minY) minY = v.norte;
      if (v.norte > maxY) maxY = v.norte;
      if ((v.elevacao || 0) < minZ) minZ = v.elevacao || 0;
      if ((v.elevacao || 0) > maxZ) maxZ = v.elevacao || 0;
    });

    const avgX = sumX / finitePts.length;
    const avgY = sumY / finitePts.length;
    const avgZ = sumZ / finitePts.length;

    const dx = maxX - minX;
    const dy = maxY - minY;
    const maxDist = Math.max(Math.sqrt(dx * dx + dy * dy), 10);

    return { avgX, avgY, avgZ, maxDist };
  })();

  // Superfície do relevo (malha TIN). Reaproveita a MESMA triangulação de Delaunay que as curvas de
  // nível usam. Triangula a nuvem de pontos com altitude, recorta ao perímetro do imóvel (triângulo
  // entra só se o centro cai dentro) e guarda o intervalo de altitude para a escala de cores.
  // Memoriza por conteúdo dos pontos: o pai não re-renderiza durante a interação (yaw/pitch/zoom são
  // estado interno), então isto só recalcula ao entrar no 3D ou mudar o levantamento.
  const superficie = useMemo(() => {
    const pts = pontos3D.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z));
    if (pts.length < 3) return { pts, tris: [] as [number, number, number][], minZ: 0, maxZ: 0 };

    const trisTodos = triangularDelaunay(pts);
    const poly = vertices
      .filter((v) => Number.isFinite(v.leste) && Number.isFinite(v.norte))
      .map((v) => ({ x: v.leste, y: v.norte }));
    const tris = poly.length >= 3
      ? trisTodos.filter((t) => {
          const cx = (pts[t[0]].x + pts[t[1]].x + pts[t[2]].x) / 3;
          const cy = (pts[t[0]].y + pts[t[1]].y + pts[t[2]].y) / 3;
          return pontoNoPoligono(cx, cy, poly);
        })
      : trisTodos;

    let minZ = Infinity, maxZ = -Infinity;
    for (const p of pts) { if (p.z < minZ) minZ = p.z; if (p.z > maxZ) maxZ = p.z; }
    return { pts, tris, minZ, maxZ };
     
  }, [pontos3D, vertices]);

  const temSuperficie = superficie.tris.length > 0;

  // Render do Loop 3D via Canvas 2D adaptado com Projeção Ortográfica / Perspectiva Simples
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;

    const draw = () => {
      if (!canvas || !ctx) return;
      // Câmera atual, lida das refs a cada quadro.
      const yaw = yawRef.current;
      const pitch = pitchRef.current;
      const zoom = zoomRef.current;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Fundo escuro profissional com grid discreto
      ctx.fillStyle = '#060f0a';
      ctx.fillRect(0, 0, w, h);

      // Desenha grade de fundo
      ctx.strokeStyle = '#102e1c';
      ctx.lineWidth = 0.5;
      const step = 40;
      for (let x = 0; x < w; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      if (finitePts.length === 0) return;

      // Matriz de projeção 3D para 2D
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const cosP = Math.cos(pitch);
      const sinP = Math.sin(pitch);

      const baseScale = (Math.min(w, h) * 0.45) / stats.maxDist;
      const finalScale = baseScale * zoom;

      const project = (leste: number, norte: number, elev: number) => {
        // Centraliza
        const x = leste - stats.avgX;
        const y = norte - stats.avgY;
        const z = ((elev || 0) - stats.avgZ) * exagero;

        // Rotação horizontal (Yaw)
        const x1 = x * cosY - y * sinY;
        const y1 = x * sinY + y * cosY;
        const z1 = z;

        // Rotação vertical (Pitch)
        const x2 = x1;
        // Inversão corrigida: altitudes mais altas devem subir no canvas (-y no canvas 2D, logo +y2)
        // e ter menor profundidade (ficam mais próximas do observador)
        const y2 = y1 * cosP + z1 * sinP;
        const z2 = y1 * sinP - z1 * cosP;

        // Perspectiva simples
        const dist = stats.maxDist * 1.5;
        const pers = dist / (dist + z2 > 0.1 ? dist + z2 : 0.1);

        const screenX = w / 2 + x2 * finalScale * pers;
        const screenY = h / 2 - y2 * finalScale * pers;

        return { x: screenX, y: screenY, depth: z2 };
      };

      // 0. MAQUETE SÓLIDA: a superfície do relevo (malha TIN) + as PAREDES laterais do perímetro descendo
      //    até uma base, pra parecer um objeto físico pousado na mesa. Triângulos da superfície e
      //    quadriláteros das paredes entram na MESMA lista e são pintados de trás pra frente (painter),
      //    então a oclusão sai correta entre relevo e paredes.
      if (temSuperficie) {
        const { pts, tris, minZ, maxZ } = superficie;
        const dz = maxZ - minZ;
        // Sol alto vindo do noroeste (azimute 315°, altitude 45°). Vetor apontando para a luz, no espaço
        // do modelo (x=leste, y=norte, z=cima).
        const Lx = -0.5, Ly = 0.5, Lz = 0.7071;
        const ambiente = 0.4; // piso de luz pra sombra não ficar preta

        type Face = { pts: { x: number; y: number }[]; depth: number; cor: string };
        const faces: Face[] = [];

        // Triângulos da superfície: cor por altitude + sombra de sol.
        for (const t of tris) {
          const A = pts[t[0]], B = pts[t[1]], C = pts[t[2]];
          const pA = project(A.x, A.y, A.z), pB = project(B.x, B.y, B.z), pC = project(C.x, C.y, C.z);
          // Normal no espaço do modelo (coords centradas, z esticado pelo exagero) para o sombreamento.
          const ax = A.x - stats.avgX, ay = A.y - stats.avgY, az = (A.z - stats.avgZ) * exagero;
          const bx = B.x - stats.avgX, by = B.y - stats.avgY, bz = (B.z - stats.avgZ) * exagero;
          const cx = C.x - stats.avgX, cy = C.y - stats.avgY, cz = (C.z - stats.avgZ) * exagero;
          const e1x = bx - ax, e1y = by - ay, e1z = bz - az;
          const e2x = cx - ax, e2y = cy - ay, e2z = cz - az;
          let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
          if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; } // face voltada pra cima
          const nlen = Math.hypot(nx, ny, nz) || 1;
          const fator = ambiente + (1 - ambiente) * Math.max(0, (nx * Lx + ny * Ly + nz * Lz) / nlen);
          const zMed = (A.z + B.z + C.z) / 3;
          const t01 = dz > 1e-6 ? (zMed - minZ) / dz : 0.5;
          const [r, g, b] = corHipsometrica(t01);
          faces.push({ pts: [pA, pB, pC], depth: (pA.depth + pB.depth + pC.depth) / 3, cor: `rgb(${Math.round(r * fator)},${Math.round(g * fator)},${Math.round(b * fator)})` });
        }

        // Paredes laterais do perímetro: cada aresta vira um quadrilátero do topo (altitude real do
        // vértice) até a base do bloco (piso comum, abaixo do ponto mais baixo). Cor de terra/barranco
        // com sombra pela orientação da parede.
        if (finitePts.length >= 3) {
          const pisoZ = minZ - stats.maxDist * 0.12; // base proporcional ao tamanho do imóvel
          const n = finitePts.length;
          for (let i = 0; i < n; i++) {
            const A = finitePts[i], B = finitePts[(i + 1) % n];
            const topA = project(A.leste, A.norte, A.elevacao || 0);
            const topB = project(B.leste, B.norte, B.elevacao || 0);
            const botA = project(A.leste, A.norte, pisoZ);
            const botB = project(B.leste, B.norte, pisoZ);
            // Normal horizontal da parede, apontando pra FORA (longe do centro).
            const ex = B.leste - A.leste, ey = B.norte - A.norte;
            let nx = ey, ny = -ex; // perpendicular à aresta
            const midx = (A.leste + B.leste) / 2 - stats.avgX, midy = (A.norte + B.norte) / 2 - stats.avgY;
            if (nx * midx + ny * midy < 0) { nx = -nx; ny = -ny; }
            const nlen = Math.hypot(nx, ny) || 1;
            const fator = ambiente + (1 - ambiente) * Math.max(0, (nx * Lx + ny * Ly) / nlen); // parede vertical → nz=0
            const [r, g, b] = [122, 94, 66];
            faces.push({
              pts: [topA, topB, botB, botA],
              depth: (topA.depth + topB.depth + botA.depth + botB.depth) / 4,
              cor: `rgb(${Math.round(r * fator)},${Math.round(g * fator)},${Math.round(b * fator)})`,
            });
          }
        }

        // Pintor: do mais distante (maior profundidade) para o mais próximo, pra oclusão sair correta.
        faces.sort((f1, f2) => f2.depth - f1.depth);
        faces.forEach((f) => {
          ctx.beginPath();
          f.pts.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
          ctx.closePath();
          ctx.fillStyle = f.cor;
          ctx.fill();
          ctx.strokeStyle = f.cor; // fecha a fresta de antialias entre faces vizinhas
          ctx.lineWidth = 0.75;
          ctx.stroke();
        });
      }

      // 1. Curvas de nível DRAPEJADAS no relevo: cada curva é desenhada na SUA altitude real (o `nivel`),
      //    então já assenta colada na superfície 3D, como as isolinhas de uma carta topográfica sobre a
      //    maquete. Sobre o relevo sólido usa a cor/espessura reais da curva; sem relevo, fica discreta.
      const curvasNivel = objetos.filter((o) => o.tipo === 'polilinha' && o.curvaNivel !== undefined);
      if (curvasNivel.length > 0) {
        ctx.lineJoin = 'round';
        curvasNivel.forEach((obj) => {
          if (obj.pontos.length < 2) return;
          ctx.beginPath();
          obj.pontos.forEach((p, idx) => {
            const proj = project(p.leste, p.norte, obj.curvaNivel || 0);
            if (idx === 0) ctx.moveTo(proj.x, proj.y);
            else ctx.lineTo(proj.x, proj.y);
          });
          if (temSuperficie) {
            ctx.strokeStyle = obj.cor || '#8a6d3b';
            ctx.globalAlpha = 0.85;
            ctx.lineWidth = Math.max(0.7, (obj.espessura ?? 0.6) * 1.4);
          } else {
            ctx.strokeStyle = 'rgba(135, 169, 146, 0.35)';
            ctx.globalAlpha = 1;
            ctx.lineWidth = 1;
          }
          ctx.stroke();
        });
        ctx.globalAlpha = 1;
      }

      // 2. Base tracejada e cortinado vertical: só como FALLBACK quando não há superfície sólida.
      //    Com a maquete preenchida por baixo, esses fios viram ruído, então os pulamos.
      if (!temSuperficie) {
        // Base (projeção 2D de referência no chão)
        ctx.beginPath();
        finitePts.forEach((v, idx) => {
          const proj = project(v.leste, v.norte, stats.avgZ - stats.maxDist * 0.1);
          if (idx === 0) ctx.moveTo(proj.x, proj.y);
          else ctx.lineTo(proj.x, proj.y);
        });
        ctx.closePath();
        ctx.strokeStyle = '#1e3a27';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Linhas verticais projetando os vértices do chão para a altitude real (efeito 3D topográfico)
      if (hasZ && !temSuperficie) {
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.25)';
        ctx.lineWidth = 0.5;
        finitePts.forEach((v) => {
          const chao = project(v.leste, v.norte, stats.avgZ - stats.maxDist * 0.1);
          const real = project(v.leste, v.norte, v.elevacao || 0);
          ctx.beginPath();
          ctx.moveTo(chao.x, chao.y);
          ctx.lineTo(real.x, real.y);
          ctx.stroke();
        });
      }

      // 3. Desenha o polígono principal em 3D
      const projetados = finitePts.map((v) => project(v.leste, v.norte, v.elevacao || 0));

      ctx.beginPath();
      projetados.forEach((proj, idx) => {
        if (idx === 0) ctx.moveTo(proj.x, proj.y);
        else ctx.lineTo(proj.x, proj.y);
      });
      ctx.closePath();
      ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
      ctx.fill();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // 4. Desenha os vértices em 3D
      projetados.forEach((proj, idx) => {
        const v = finitePts[idx];
        const r = 5;

        // Marcador circular com brilho
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, r, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#059669';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Rótulos de nome e cota z
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px sans-serif';
        const label = `${v.codigoSigef || v.nome || `V${v.ordem}`}`;
        ctx.fillText(label, proj.x + 8, proj.y - 2);

        if (hasZ && v.elevacao) {
          // "~" antes da cota = altitude CALCULADA (interpolada), não medida; cor âmbar pra destacar.
          const calc = v.elevacaoInterpolada;
          ctx.fillStyle = calc ? '#d9a441' : '#87a992';
          ctx.font = '8px monospace';
          ctx.fillText(`${calc ? '~' : ''}${v.elevacao.toFixed(1)}m`, proj.x + 8, proj.y + 7);
        }
      });

      // 5. Bússola 3D no canto superior esquerdo
      const compassProj = (x: number, y: number, z: number) => {
        const x1 = x * cosY - y * sinY;
        const y1 = x * sinY + y * cosY;
        const x2 = x1;
        const y2 = y1 * cosP - z * sinP;
        return { x: 50 + x2 * 25, y: 50 - y2 * 25 };
      };
      
      const norte = compassProj(0, 1, 0);
      const leste = compassProj(1, 0, 0);

      ctx.beginPath(); ctx.moveTo(50, 50); ctx.lineTo(norte.x, norte.y);
      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#ef4444'; ctx.font = 'bold 9px sans-serif'; ctx.fillText('N', norte.x - 3, norte.y - 4);

      ctx.beginPath(); ctx.moveTo(50, 50); ctx.lineTo(leste.x, leste.y);
      ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#3b82f6'; ctx.font = 'bold 9px sans-serif'; ctx.fillText('L', leste.x + 4, leste.y + 3);
    };

    const OCIOSO_MS = 2500; // tempo parado até voltar a girar sozinho
    const VEL_GIRO = 0.0022; // radianos por quadro (bem devagar)
    const loop = () => {
      // Gira sozinho só quando: ligado, ninguém arrastando, e passou o tempo ocioso desde a última mexida.
      if (autoGirarRef.current && !dragRef.current.isDragging && !pinchRef.current.active
          && performance.now() - ultimaInteracao.current > OCIOSO_MS) {
        yawRef.current += VEL_GIRO;
      }
      draw();
      animFrame = requestAnimationFrame(loop);
    };

    loop();

    return () => cancelAnimationFrame(animFrame);
  }, [vertices, objetos, exagero, stats, hasZ, finitePts, superficie, temSuperficie]);

  // Redimensionamento automático do canvas
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas || !canvas.parentElement) return;
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const aplicarPitch = (v: number) => Math.max(0.1, Math.min(Math.PI / 2 - 0.05, v));
  const aplicarZoom = (v: number) => Math.max(0.3, Math.min(5.0, v));

  // Handlers de Mouse para drag
  const handleMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { isDragging: true, startX: e.clientX, startY: e.clientY, startYaw: yawRef.current, startPitch: pitchRef.current };
    marcarInteracao();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current.isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    yawRef.current = dragRef.current.startYaw + dx * 0.007;
    pitchRef.current = aplicarPitch(dragRef.current.startPitch + dy * 0.007);
    marcarInteracao();
  };

  const handleMouseUp = () => {
    dragRef.current.isDragging = false;
    marcarInteracao();
  };

  const handleWheel = (e: React.WheelEvent) => {
    zoomRef.current = aplicarZoom(zoomRef.current - e.deltaY * 0.001);
    marcarInteracao();
  };

  // Handlers de TOQUE: um dedo gira a câmera; dois dedos dão zoom (pinça).
  const distToques = (t: React.TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  const handleTouchStart = (e: React.TouchEvent) => {
    marcarInteracao();
    if (e.touches.length === 1) {
      dragRef.current = { isDragging: true, startX: e.touches[0].clientX, startY: e.touches[0].clientY, startYaw: yawRef.current, startPitch: pitchRef.current };
      pinchRef.current.active = false;
    } else if (e.touches.length === 2) {
      dragRef.current.isDragging = false;
      pinchRef.current = { active: true, startDist: distToques(e.touches) || 1, startZoom: zoomRef.current };
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    marcarInteracao();
    if (pinchRef.current.active && e.touches.length === 2) {
      e.preventDefault();
      const f = distToques(e.touches) / pinchRef.current.startDist;
      zoomRef.current = aplicarZoom(pinchRef.current.startZoom * f);
    } else if (dragRef.current.isDragging && e.touches.length === 1) {
      e.preventDefault();
      const dx = e.touches[0].clientX - dragRef.current.startX;
      const dy = e.touches[0].clientY - dragRef.current.startY;
      yawRef.current = dragRef.current.startYaw + dx * 0.007;
      pitchRef.current = aplicarPitch(dragRef.current.startPitch + dy * 0.007);
    }
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    marcarInteracao();
    if (e.touches.length === 0) { dragRef.current.isDragging = false; pinchRef.current.active = false; }
  };

  // Exportador de KML para visualizar no Google Earth
  const handleBaixarKml = () => {
    exportarKML(vertices, imovel);
  };

  // Legenda de altitude: só faz sentido quando há superfície com variação de cota.
  const temEscalaZ = temSuperficie && superficie.maxZ - superficie.minZ > 0.01;
  const zMed = (superficie.minZ + superficie.maxZ) / 2;
  // Barra de cores igual à rampa hipsométrica do relevo, de baixo (cota mínima) para cima (máxima).
  const gradienteLegenda = `linear-gradient(to top, ${RAMPA_RELEVO
    .map((s) => `rgb(${s.rgb[0]},${s.rgb[1]},${s.rgb[2]}) ${Math.round(s.t * 100)}%`)
    .join(', ')})`;

  return (
    <div className="relative w-full h-full min-h-[400px] flex-grow flex flex-col rounded-xl border border-border overflow-hidden select-none">
      {/* Canvas principal */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="w-full h-full flex-grow cursor-grab active:cursor-grabbing touch-none"
      />

      {/* Controles de overlay superior direito */}
      <div className="absolute top-4 right-4 flex flex-col gap-2.5 p-3 rounded-xl bg-background/90 backdrop-blur border border-border/80 shadow-lg max-w-xs text-xs text-muted-foreground">
        <span className="font-extrabold text-foreground uppercase tracking-wider text-[10px] block">Modelo de Relevo 3D</span>
        <div className="space-y-1">
          <p>• Arraste (ou um dedo) para girar</p>
          <p>• Rolagem do mouse ou pinça para zoom</p>
        </div>

        <button
          type="button"
          onClick={() => { setAutoGirar((a) => !a); marcarInteracao(); }}
          className={`flex items-center justify-center gap-1.5 h-7 rounded-lg text-[10px] font-bold transition-colors border ${autoGirar ? 'bg-emerald-600 text-white border-transparent' : 'text-muted-foreground border-border/60 hover:bg-muted/60'}`}
          title="Gira o modelo sozinho quando você não está mexendo"
        >
          <RefreshCw className={`size-3 ${autoGirar ? 'animate-spin [animation-duration:3s]' : ''}`} /> Girar sozinho: {autoGirar ? 'ligado' : 'desligado'}
        </button>

        {hasZ && (
          <div className="space-y-1.5 pt-2 border-t border-border/60">
            <Label className="text-[10px] font-bold text-[#87a992]">Escala vertical</Label>
            <div className="flex rounded-lg border border-border/60 p-0.5 gap-0.5">
              <button
                type="button"
                onClick={() => setRealce(false)}
                className={`flex-1 h-6 rounded-md text-[10px] font-bold transition-colors ${!realce ? 'bg-emerald-600 text-white' : 'text-muted-foreground hover:bg-muted/60'}`}
                title="Escala verdadeira 1:1 — mostra o imóvel como ele é"
              >
                Real
              </button>
              <button
                type="button"
                onClick={() => setRealce(true)}
                className={`flex-1 h-6 rounded-md text-[10px] font-bold transition-colors ${realce ? 'bg-amber-600 text-white' : 'text-muted-foreground hover:bg-muted/60'}`}
                title="Realça o relevo pra enxergar melhor em terreno plano (não é a escala real)"
              >
                Realce
              </button>
            </div>
          </div>
        )}

        {verticesSemCota > 0 && onCompletarAltitudes && (
          <div className="space-y-1.5 pt-2 border-t border-border/60">
            <p className="text-[10px] leading-snug text-amber-600 dark:text-amber-400">
              {verticesSemCota} vértice(s) sem altitude — o relevo fica incompleto.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-full gap-1.5 text-[10px] font-bold border-amber-600/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/5"
              onClick={onCompletarAltitudes}
              title="Calcula a cota que falta a partir dos pontos que têm altitude (marcada como calculada; reversível)"
            >
              <Wand2 className="size-3" /> Completar altitudes
            </Button>
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t border-border/60">
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-full gap-1.5 text-[10px] font-bold"
            onClick={() => { yawRef.current = -0.5; pitchRef.current = 0.8; zoomRef.current = 1.0; marcarInteracao(); }}
          >
            <RotateCcw className="size-3" /> Resetar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-full gap-1.5 text-[10px] font-bold border-amber-600/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/5"
            onClick={handleBaixarKml}
          >
            <Download className="size-3" /> Baixar KML
          </Button>
        </div>
      </div>

      {/* Legenda de altitude (canto inferior direito) */}
      {temEscalaZ && (
        <div className="absolute bottom-4 right-4 flex items-stretch gap-2 p-2.5 rounded-xl bg-background/90 backdrop-blur border border-border/80 shadow-lg">
          <div className="flex flex-col justify-between items-start">
            <span className="font-extrabold text-foreground uppercase tracking-wider text-[9px] leading-none mb-1.5">Altitude</span>
            <div className="flex gap-2 h-28">
              <div
                className="w-3 rounded-sm border border-border/50"
                style={{ background: gradienteLegenda }}
              />
              <div className="flex flex-col justify-between text-[10px] font-mono text-muted-foreground py-0.5">
                <span>{superficie.maxZ.toFixed(1)} m</span>
                <span>{zMed.toFixed(1)} m</span>
                <span>{superficie.minZ.toFixed(1)} m</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botão de voltar no canto inferior esquerdo */}
      <div className="absolute bottom-4 left-4 flex gap-2">
        <Button
          size="sm"
          className="h-9 px-4 gap-1.5 font-bold shadow-md bg-[#10b981] hover:bg-[#059669] text-white"
          onClick={onVoltar2D}
        >
          <Navigation className="size-3.5 rotate-45" /> Voltar para 2D
        </Button>
      </div>
    </div>
  );
}
