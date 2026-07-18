'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RotateCcw, Download, Navigation, Wand2, RefreshCw, Camera, X, Map, Layers, Shovel, Pickaxe } from 'lucide-react';
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

function interpolarCor(a: [number, number, number], b: [number, number, number], f: number): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}

function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}

function recortaCanvasVisivel(canvas: HTMLCanvasElement, padding = 16): string {
  try {
    if (!canvas.width || !canvas.height) return canvas.toDataURL('image/png');
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return canvas.toDataURL('image/png');

    tempCtx.drawImage(canvas, 0, 0);
    const imgData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
    let encontrouPixel = false;

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const alpha = data[(y * canvas.width + x) * 4 + 3];
        if (alpha > 10) {
          encontrouPixel = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (!encontrouPixel || minX >= maxX || minY >= maxY) {
      return canvas.toDataURL('image/png');
    }

    const cropX = Math.max(0, minX - padding);
    const cropY = Math.max(0, minY - padding);
    const cropW = Math.min(canvas.width - cropX, (maxX - minX) + padding * 2);
    const cropH = Math.min(canvas.height - cropY, (maxY - minY) + padding * 2);

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropW;
    croppedCanvas.height = cropH;
    const croppedCtx = croppedCanvas.getContext('2d');
    if (!croppedCtx) return canvas.toDataURL('image/png');

    croppedCtx.drawImage(tempCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    return croppedCanvas.toDataURL('image/png');
  } catch (err) {
    console.error('Erro ao recortar canvas visível:', err);
    return canvas.toDataURL('image/png');
  }
}

function corHipsometrica(t: number): [number, number, number] {
  const c = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0));
  for (let i = 1; i < RAMPA_RELEVO.length; i++) {
    const a = RAMPA_RELEVO[i - 1], b = RAMPA_RELEVO[i];
    if (c <= b.t) {
      const f = (c - a.t) / (b.t - a.t || 1);
      return interpolarCor(a.rgb, b.rgb, f);
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
  onCapture?: (dataUrl: string, meta?: { volCorte?: number; volAterro?: number; zRef?: number }) => void;
  gradeAltimetrica?: { lat: number; lon: number; leste: number; norte: number; elevacao: number }[];
}

export default function Map3DViewer({
  vertices,
  objetos,
  pontos3D,
  verticesSemCota = 0,
  onCompletarAltitudes,
  imovel,
  onVoltar2D,
  onCapture,
  gradeAltimetrica = []
}: Map3DViewerProps) {
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
  // Por padrão DESATIVADO para não causar confusão ao entrar na view 3D.
  const [autoGirar, setAutoGirar] = useState(false);
  const autoGirarRef = useRef(false);

  // Dialog de configuração antes de inserir o print do MDR na planta
  const [captureDialogAberto, setCaptureDialogAberto] = useState(false);
  const [captureIncluirTerraplanagem, setCaptureIncluirTerraplanagem] = useState(true);
  useEffect(() => { autoGirarRef.current = autoGirar; }, [autoGirar]);
  const ultimaInteracao = useRef(0);
  const marcarInteracao = () => { ultimaInteracao.current = performance.now(); };

  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, startYaw: 0, startPitch: 0 });
  // Pinça de dois dedos (zoom no toque): distância e zoom no início do gesto.
  const pinchRef = useRef({ active: false, startDist: 0, startZoom: 1 });

  // Configurações visuais adicionais
  const [mostrarParedes, setMostrarParedes] = useState(false); // desativada por padrão conforme pedido do usuário
  const [mostrarTin, setMostrarTin] = useState(true); // wireframe ativo por padrão para visualizar a malha
  const [destacarErros, setDestacarErros] = useState(true); // ativada por padrão para ajudar a encontrar erros de cota zero
  const [mostrarLabels3D, setMostrarLabels3D] = useState(true);
  const [mostrarCurvas3D, setMostrarCurvas3D] = useState(true); // Exibição de curvas de nível no 3D
  const [mostrarAltitudesCurvas, setMostrarAltitudesCurvas] = useState(true); // Exibir cotas de nível (valores de altitude)
  const [mostrarCurvasNoCapture, setMostrarCurvasNoCapture] = useState(true); // inclui curvas de nível no print MDR
  const [mostrarAltitudesNoCapture, setMostrarAltitudesNoCapture] = useState(true); // inclui valores de altitude no print MDR
  const [modoEnquadramentoCapture, setModoEnquadramentoCapture] = useState<'camera' | 'imovel_completo'>('camera');
  const [captureRecortarBordas, setCaptureRecortarBordas] = useState(true); // recortar margens transparentes por padrão

  // Estados de cálculo de terraplenagem (volume de corte/aterro)
  const [calcVolumeAtivo, setCalcVolumeAtivo] = useState(false);
  const [zRefMode, setZRefMode] = useState<'alto' | 'baixo' | 'manual'>('baixo');
  const [zRefManual, setZRefManual] = useState<string>('');
  const [fatorEmpolamento, setFatorEmpolamento] = useState<number>(1.4);
  const [vtxAtivos, setVtxAtivos] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const act: Record<string, boolean> = {};
    vertices.forEach((v) => { act[v.id] = true; });
    setVtxAtivos(act);
  }, [vertices]);

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

  // Altitudes de referência para o cálculo de volumes
  const vtxComAltitude = vertices.filter((v) => Number.isFinite(v.elevacao) && v.elevacao !== 0 && vtxAtivos[v.id] !== false);
  const maxElev = vtxComAltitude.length > 0 ? Math.max(...vtxComAltitude.map((v) => v.elevacao)) : 0;
  const minElev = vtxComAltitude.length > 0 ? Math.min(...vtxComAltitude.map((v) => v.elevacao)) : 0;

  const zRef = (() => {
    if (zRefMode === 'alto') return maxElev;
    if (zRefMode === 'baixo') return minElev;
    const manualVal = parseFloat(zRefManual);
    return Number.isFinite(manualVal) ? manualVal : minElev;
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

  // Lógica matemática avançada e exata de cubagem por prismas triangulares
  const volumes = useMemo(() => {
    if (!calcVolumeAtivo || superficie.tris.length === 0) return { corte: 0, aterro: 0, area: 0 };

    let totalCorte = 0;
    let totalAterro = 0;
    let totalArea = 0;

    const { pts, tris } = superficie;

    for (const t of tris) {
      const p1 = pts[t[0]];
      const p2 = pts[t[1]];
      const p3 = pts[t[2]];

      // Área do triângulo projetado em 2D
      const area = 0.5 * Math.abs(p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y));
      if (area < 1e-5) continue;

      totalArea += area;

      const h1 = p1.z - zRef;
      const h2 = p2.z - zRef;
      const h3 = p3.z - zRef;

      // Ordena as cotas relativas: h_min <= h_mid <= h_max
      const hs = [h1, h2, h3].sort((a, b) => a - b);
      const [h_min, h_mid, h_max] = hs;

      const vNet = area * (h1 + h2 + h3) / 3;

      if (h_min >= 0) {
        // Todo acima da referência: corte puro
        totalCorte += vNet;
      } else if (h_max <= 0) {
        // Todo abaixo da referência: aterro puro
        totalAterro += -vNet;
      } else if (h_mid < 0) {
        // Dois negativos, um positivo: o corte é uma pirâmide triangular acima da referência
        const vCorte = area * (h_max * h_max * h_max) / (3 * (h_max - h_min) * (h_max - h_mid));
        const vAterro = vCorte - vNet;
        totalCorte += vCorte;
        totalAterro += vAterro;
      } else {
        // Um negativo, dois positivos: o aterro é uma pirâmide triangular abaixo da referência
        const vAterro = area * (-h_min * h_min * h_min) / (3 * (h_min - h_max) * (h_min - h_mid));
        const vCorte = vNet + vAterro;
        totalCorte += vCorte;
        totalAterro += vAterro;
      }
    }

    return { corte: totalCorte, aterro: totalAterro, area: totalArea };
  }, [calcVolumeAtivo, superficie, zRef]);

  // Ref para indicar que o próximo frame deve renderizar sem fundo (captura transparente)
  const captureModeRef = useRef(false);

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

      if (!captureModeRef.current) {
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
      }

      if (finitePts.length === 0) return;

      // Matriz de projeção 3D para 2D
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const cosP = Math.cos(pitch);
      const sinP = Math.sin(pitch);

      // Calcula o enquadramento ao tamanho do imóvel na rotação atual (Yaw e Pitch)
      let minRx = Infinity, maxRx = -Infinity;
      let minRz = Infinity, maxRz = -Infinity;
      finitePts.forEach((v) => {
        const x = v.leste - stats.avgX;
        const y = v.norte - stats.avgY;
        const z = ((v.elevacao || 0) - stats.avgZ) * exagero;

        const x1 = x * cosY - y * sinY;
        const y1 = x * sinY + y * cosY;
        const z1 = z;

        const x2 = x1;
        const y2 = y1 * cosP + z1 * sinP;
        const z2 = y1 * sinP - z1 * cosP;

        const dist = stats.maxDist * 1.5;
        const pers = dist / (dist + z2 > 0.1 ? dist + z2 : 0.1);

        const px = x2 * pers;
        const py = y2 * pers;

        if (px < minRx) minRx = px;
        if (px > maxRx) maxRx = px;
        if (py < minRz) minRz = py;
        if (py > maxRz) maxRz = py;
      });

      const spanX = maxRx - minRx || 10;
      const spanY = maxRz - minRz || 10;

      // Enquadra o tamanho do imóvel em 80% da tela do canvas
      const baseScale = Math.min((w * 0.8) / spanX, (h * 0.8) / spanY);
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
          
          let rgbColor: [number, number, number];
          if (calcVolumeAtivo) {
            const hAvg = (A.z + B.z + C.z) / 3 - zRef;
            if (hAvg > 0) {
              // Vermelho/Rosa para Corte
              const factor = Math.min(1, hAvg / (superficie.maxZ - zRef || 1));
              rgbColor = [
                Math.round(239 - (239 - 180) * factor),
                Math.round(68 - (68 - 30) * factor),
                Math.round(68 - (68 - 30) * factor),
              ];
            } else {
              // Azul/Ciano para Aterro
              const factor = Math.min(1, -hAvg / (zRef - superficie.minZ || 1));
              rgbColor = [
                Math.round(59 - (59 - 30) * factor),
                Math.round(130 - (130 - 80) * factor),
                Math.round(246 - (246 - 200) * factor),
              ];
            }
          } else {
            const zMed = (A.z + B.z + C.z) / 3;
            const t01 = dz > 1e-6 ? (zMed - minZ) / dz : 0.5;
            rgbColor = corHipsometrica(t01);
          }
          
          faces.push({ pts: [pA, pB, pC], depth: (pA.depth + pB.depth + pC.depth) / 3, cor: `rgb(${Math.round(rgbColor[0] * fator)},${Math.round(rgbColor[1] * fator)},${Math.round(rgbColor[2] * fator)})` });
        }

        // Paredes laterais do perímetro
        if (mostrarParedes && finitePts.length >= 3) {
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
          ctx.strokeStyle = mostrarTin ? 'rgba(255, 255, 255, 0.15)' : f.cor; // destaca a malha TIN se habilitado
          ctx.lineWidth = 0.75;
          ctx.stroke();
        });
      }

      // 1. Curvas de nível DRAPEJADAS no relevo
      const desenharCurvas = captureModeRef.current ? mostrarCurvasNoCapture : mostrarCurvas3D;
      const desenharAltitudes = captureModeRef.current ? mostrarAltitudesNoCapture : mostrarAltitudesCurvas;

      if (desenharCurvas) {
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

            if (desenharAltitudes && obj.curvaNivel !== undefined && obj.pontos.length >= 2) {
              const pMid = obj.pontos[Math.floor(obj.pontos.length / 2)];
              const projMid = project(pMid.leste, pMid.norte, obj.curvaNivel);
              ctx.save();
              ctx.font = 'bold 9.5px monospace';
              ctx.fillStyle = '#fde68a';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.shadowColor = 'rgba(0,0,0,0.85)';
              ctx.shadowBlur = 4;
              ctx.fillText(`${obj.curvaNivel.toFixed(1)}m`, projMid.x, projMid.y);
              ctx.restore();
            }
          });
          ctx.globalAlpha = 1;
        }
      }

      // 2. Base tracejada e cortinado vertical: só como FALLBACK quando não há superfície sólida.
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

      // 2b. Plano de Referência 3D (Terraplenagem)
      if (calcVolumeAtivo) {
        const planoProjetado = finitePts.map((v) => project(v.leste, v.norte, zRef));
        ctx.beginPath();
        planoProjetado.forEach((proj, idx) => {
          if (idx === 0) ctx.moveTo(proj.x, proj.y);
          else ctx.lineTo(proj.x, proj.y);
        });
        ctx.closePath();
        ctx.fillStyle = 'rgba(59, 130, 246, 0.2)'; // azul translúcido
        ctx.fill();
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.65)';
        ctx.lineWidth = 2.0;
        ctx.setLineDash([6, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
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

      // 4. Desenha os vértices em 3D (Marcadores circulares)
      projetados.forEach((proj, idx) => {
        const v = finitePts[idx];
        const temErroElev = !v.elevacao || v.elevacao === 0 || !Number.isFinite(v.elevacao);
        const destacar = destacarErros && temErroElev;
        const r = destacar ? 7 : 5;

        // Marcador circular com brilho
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, r, 0, 2 * Math.PI);
        ctx.fillStyle = destacar ? '#ef4444' : '#ffffff';
        ctx.fill();
        ctx.strokeStyle = destacar ? '#991b1b' : '#059669';
        ctx.lineWidth = destacar ? 2.5 : 1.5;
        ctx.stroke();
      });

      // 4a. Rótulos inteligentes auto-organizados (com prevenção de sobreposição e placas de alta legibilidade)
      if (mostrarLabels3D && finitePts.length > 0) {
        const nVtx = finitePts.length;
        type LabelPill = {
          idx: number;
          projX: number;
          projY: number;
          boxX: number;
          boxY: number;
          boxW: number;
          boxH: number;
          name: string;
          altText: string;
          isCalc: boolean;
          isErro: boolean;
          dirX: number;
          dirY: number;
        };

        const pills: LabelPill[] = [];
        ctx.font = 'bold 9.5px sans-serif';

        for (let i = 0; i < nVtx; i++) {
          const v = finitePts[i];
          const proj = projetados[i];
          const temErroElev = !v.elevacao || v.elevacao === 0 || !Number.isFinite(v.elevacao);
          const destacar = destacarErros && temErroElev;
          const calc = !!v.elevacaoInterpolada;

          const name = `${v.codigoSigef || v.nome || `V${v.ordem}`}`;
          let altText = '';
          if (destacar) {
            altText = 'Cota Zero!';
          } else if (hasZ && v.elevacao) {
            altText = `${calc ? '~' : ''}${v.elevacao.toFixed(1)}m`;
          }

          // Vetor normal externo 2D do polígono para empurrar o rótulo para FORA do imóvel
          const prev = finitePts[(i - 1 + nVtx) % nVtx];
          const next = finitePts[(i + 1) % nVtx];

          const tx = next.leste - prev.leste;
          const ty = next.norte - prev.norte;
          let nx = -ty;
          let ny = tx;

          const cx = v.leste - stats.avgX;
          const cy = v.norte - stats.avgY;
          if (nx * cx + ny * cy < 0) {
            nx = -nx;
            ny = -ny;
          }

          const nLen = Math.hypot(nx, ny) || 1;
          nx /= nLen;
          ny /= nLen;

          // Projeta o vetor normal no espaço de tela para obter direção 2D
          const projOut = project(v.leste + nx * 8, v.norte + ny * 8, v.elevacao || 0);
          let sDx = projOut.x - proj.x;
          let sDy = projOut.y - proj.y;
          let sLen = Math.hypot(sDx, sDy);

          if (sLen < 0.1) {
            sDx = 1;
            sDy = -1;
            sLen = Math.hypot(1, -1);
          }
          const dirX = sDx / sLen;
          const dirY = sDy / sLen;

          // Dimensões da placa de rótulo
          const wName = ctx.measureText(name).width;
          const wAlt = altText ? ctx.measureText(altText).width : 0;
          const boxW = Math.max(wName, wAlt) + 14;
          const boxH = altText ? 24 : 14;

          const distOffset = 22;
          let boxX = proj.x + dirX * distOffset;
          let boxY = proj.y + dirY * distOffset;

          // Alinhamento inteligente do centro da placa
          if (dirX < -0.2) boxX -= boxW;
          else if (dirX <= 0.2) boxX -= boxW / 2;

          if (dirY < -0.2) boxY -= boxH;
          else if (dirY <= 0.2) boxY -= boxH / 2;

          pills.push({
            idx: i,
            projX: proj.x,
            projY: proj.y,
            boxX,
            boxY,
            boxW,
            boxH,
            name,
            altText,
            isCalc: calc,
            isErro: destacar,
            dirX,
            dirY,
          });
        }

        // Passagem de desobstrução (Staggering para vértices muito próximos)
        for (let i = 0; i < pills.length; i++) {
          for (let j = i + 1; j < pills.length; j++) {
            const p1 = pills[i];
            const p2 = pills[j];

            const ovX = (p1.boxW + p2.boxW) / 2 + 4 - Math.abs((p1.boxX + p1.boxW / 2) - (p2.boxX + p2.boxW / 2));
            const ovY = (p1.boxH + p2.boxH) / 2 + 4 - Math.abs((p1.boxY + p1.boxH / 2) - (p2.boxY + p2.boxH / 2));

            if (ovX > 0 && ovY > 0) {
              const shift = ovY + 3;
              if (p2.dirY >= 0) p2.boxY += shift;
              else p2.boxY -= shift;
            }
          }
        }

        // Renderização dos rótulos (Linha de chamada + Placa escura de alto contraste)
        pills.forEach((p) => {
          const boxCX = p.boxX + p.boxW / 2;
          const boxCY = p.boxY + p.boxH / 2;
          const distChamada = Math.hypot(boxCX - p.projX, boxCY - p.projY);

          // Linha de chamada se o rótulo foi deslocado do ponto
          if (distChamada > 16) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(p.projX, p.projY);
            ctx.lineTo(boxCX, boxCY);
            ctx.strokeStyle = p.isErro ? 'rgba(239, 68, 68, 0.7)' : 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.stroke();
            ctx.restore();
          }

          // Placa escura de fundo com brilho/borda colorida
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
          ctx.shadowBlur = 6;

          drawRoundRect(ctx, p.boxX, p.boxY, p.boxW, p.boxH, 4);
          ctx.fillStyle = captureModeRef.current ? 'rgba(8, 20, 15, 0.95)' : 'rgba(6, 18, 14, 0.90)';
          ctx.fill();

          ctx.strokeStyle = p.isErro ? '#ef4444' : p.isCalc ? '#f59e0b' : '#10b981';
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.restore();

          // Textos do rótulo
          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          if (p.altText) {
            // Nome do Vértice em Branco Brilhante
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9.5px sans-serif';
            ctx.fillText(p.name, boxCX, p.boxY + 7);

            // Altitude em Menta/Amarelo de alto contraste
            ctx.font = 'bold 9px monospace';
            ctx.fillStyle = p.isErro ? '#fca5a5' : p.isCalc ? '#fde047' : '#6ee7b7';
            ctx.fillText(p.altText, boxCX, p.boxY + 17);
          } else {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9.5px sans-serif';
            ctx.fillText(p.name, boxCX, p.boxY + p.boxH / 2);
          }
          ctx.restore();
        });
      }

      // 4b. Desenha os pontos da grade altimétrica em 3D
      if (gradeAltimetrica && gradeAltimetrica.length > 0) {
        gradeAltimetrica.forEach((g) => {
          const proj = project(g.leste, g.norte, g.elevacao);
          
          // Desenha bolinha amarela pequena
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, 3.5, 0, 2 * Math.PI);
          ctx.fillStyle = '#facc15';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.0;
          ctx.stroke();

          // Placa de altitude para pontos de grade
          if (mostrarLabels3D) {
            const altText = `${g.elevacao.toFixed(1)}m`;
            ctx.save();
            ctx.font = 'bold 8.5px monospace';
            const tw = ctx.measureText(altText).width + 8;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            drawRoundRect(ctx, proj.x + 5, proj.y - 7, tw, 14, 3);
            ctx.fill();
            ctx.strokeStyle = 'rgba(250, 204, 21, 0.7)';
            ctx.lineWidth = 1.0;
            ctx.stroke();
            ctx.fillStyle = '#fde68a';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(altText, proj.x + 5 + tw / 2, proj.y);
            ctx.restore();
          }
        });
      }

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
  }, [vertices, objetos, exagero, stats, hasZ, finitePts, superficie, temSuperficie, mostrarParedes, mostrarTin, destacarErros, calcVolumeAtivo, zRef, fatorEmpolamento, mostrarLabels3D, gradeAltimetrica]);

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

      {/* Painel de Terraplenagem (Canto Esquerdo) */}
      {calcVolumeAtivo && (
        <div className="absolute top-4 left-4 bottom-16 w-80 bg-background/95 backdrop-blur border border-border/80 shadow-2xl rounded-2xl p-4 flex flex-col gap-4 overflow-y-auto text-xs text-muted-foreground z-50 animate-in fade-in slide-in-from-left duration-200">
          <div className="flex items-center justify-between border-b pb-2">
            <span className="font-extrabold text-foreground uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              Cálculo de Terraplenagem
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-[9px]"
              onClick={() => setCalcVolumeAtivo(false)}
            >
              Fechar
            </Button>
          </div>

          {/* Cota de Referência / Altitude Planejada */}
          <div className="space-y-2">
            <span className="font-bold text-foreground block text-[9px] uppercase">Cota de Referência (Platô)</span>
            <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-muted/45 border">
              <button
                type="button"
                className={`py-1 rounded text-[9px] font-bold transition-all ${zRefMode === 'baixo' ? 'bg-primary text-primary-foreground shadow-xs' : 'hover:bg-muted'}`}
                onClick={() => setZRefMode('baixo')}
              >
                Mínimo
              </button>
              <button
                type="button"
                className={`py-1 rounded text-[9px] font-bold transition-all ${zRefMode === 'alto' ? 'bg-primary text-primary-foreground shadow-xs' : 'hover:bg-muted'}`}
                onClick={() => setZRefMode('alto')}
              >
                Máximo
              </button>
              <button
                type="button"
                className={`py-1 rounded text-[9px] font-bold transition-all ${zRefMode === 'manual' ? 'bg-primary text-primary-foreground shadow-xs' : 'hover:bg-muted'}`}
                onClick={() => {
                  setZRefMode('manual');
                  if (!zRefManual) setZRefManual(minElev.toFixed(2));
                }}
              >
                Manual
              </button>
            </div>

            {zRefMode === 'manual' ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="number"
                  step="0.01"
                  value={zRefManual}
                  onChange={(e) => setZRefManual(e.target.value)}
                  className="h-7 flex-1 rounded border border-input bg-background px-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none font-semibold text-foreground"
                  placeholder="Ex: 820.50"
                />
                <span className="text-[10px] font-bold text-foreground">m</span>
              </div>
            ) : (
              <div className="p-1.5 rounded bg-muted/30 text-[10px] font-mono text-foreground flex justify-between">
                <span>Cota do Platô:</span>
                <span className="font-bold">{zRef.toFixed(2)} m</span>
              </div>
            )}
          </div>

          {/* Fator de Empolamento */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="font-bold text-foreground block text-[9px] uppercase">Fator de Empolamento</span>
              <span className="font-mono font-bold text-foreground">{fatorEmpolamento.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="2.0"
              step="0.05"
              value={fatorEmpolamento}
              onChange={(e) => setFatorEmpolamento(Number(e.target.value))}
              className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <p className="text-[9px] text-muted-foreground/80 leading-relaxed">
              Média brasileira para solo comum solto é de 1.30 a 1.50x. Indica a expansão volumétrica da terra escavada para fins de transporte.
            </p>
          </div>

          {/* Seleção de Vértices Influentes */}
          <div className="space-y-2 flex-grow flex flex-col min-h-0">
            <span className="font-bold text-foreground block text-[9px] uppercase">Vértices da Referência</span>
            <div className="border rounded-lg overflow-hidden flex flex-col flex-grow min-h-[100px] bg-muted/10">
              <div className="divide-y overflow-y-auto max-h-[180px]">
                {vertices.map((v) => {
                  const label = v.codigoSigef || v.nome || `V${v.ordem}`;
                  const ativo = vtxAtivos[v.id] !== false;
                  return (
                    <label key={v.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/40 cursor-pointer text-[10px]">
                      <input
                        type="checkbox"
                        checked={ativo}
                        onChange={(e) => setVtxAtivos((prev) => ({ ...prev, [v.id]: e.target.checked }))}
                        className="rounded border-muted text-primary focus:ring-primary size-3.5"
                      />
                      <span className="font-semibold text-foreground flex-1 truncate">{label}</span>
                      {v.elevacao ? (
                        <span className="font-mono text-muted-foreground">{v.elevacao.toFixed(1)}m</span>
                      ) : (
                        <span className="text-red-500 font-bold text-[8px] uppercase">cota 0</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Resultados de Cubagem */}
          <div className="space-y-2 border-t pt-3 mt-auto bg-background">
            <span className="font-bold text-foreground block text-[9px] uppercase">Resultados</span>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center rounded-md bg-muted/20 p-2 border border-border/30">
                <span>Área Planificada:</span>
                <span className="font-bold text-foreground text-[10px]">{volumes.area.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} m²</span>
              </div>
              <div className="flex justify-between items-center rounded-md bg-red-500/5 p-2 border border-red-500/10">
                <span className="text-red-600 dark:text-red-400 font-semibold">Volume de Corte:</span>
                <div className="text-right">
                  <div className="font-bold text-red-600 dark:text-red-400 text-[11px]">{volumes.corte.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} m³</div>
                  <div className="text-[9px] text-red-500/70 font-mono">({(volumes.corte * fatorEmpolamento).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} m³ Solto)</div>
                </div>
              </div>
              <div className="flex justify-between items-center rounded-md bg-blue-500/5 p-2 border border-blue-500/10">
                <span className="text-blue-600 dark:text-blue-400 font-semibold">Volume de Aterro:</span>
                <div className="text-right">
                  <div className="font-bold text-blue-600 dark:text-blue-400 text-[11px]">{volumes.aterro.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} m³</div>
                  <div className="text-[9px] text-blue-500/70 font-mono">(Solo Compactado)</div>
                </div>
              </div>
              <div className={`flex justify-between items-center rounded-md p-2 border ${volumes.corte - volumes.aterro >= 0 ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/5 border-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
                <span className="font-bold">Balanço Líquido:</span>
                <span className="font-bold text-[10px]">
                  {Math.abs(volumes.corte - volumes.aterro).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} m³
                  {volumes.corte - volumes.aterro >= 0 ? ' (Sobra)' : ' (Falta)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controles de overlay superior direito */}
      <div className="absolute top-4 right-4 flex flex-col gap-2.5 p-3 rounded-xl bg-background/90 backdrop-blur border border-border/80 shadow-lg max-w-xs text-xs text-muted-foreground z-40">
        <span className="font-extrabold text-foreground uppercase tracking-wider text-[10px] block border-b pb-1">Controles do Relevo 3D</span>
        
        <div className="space-y-1">
          <p>• Arraste (ou um dedo) para girar</p>
          <p>• Rolagem ou pinça para zoom</p>
        </div>

        {/* Presets de Câmera */}
        <div className="space-y-1 pt-1.5 border-t border-border/60">
          <span className="font-bold text-[9px] uppercase tracking-wider text-muted-foreground block">Ângulos de Câmera</span>
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => { yawRef.current = 0; pitchRef.current = 0.05; zoomRef.current = 1.0; marcarInteracao(); }}
              className="h-6 rounded bg-muted/60 hover:bg-muted text-[9px] font-bold text-foreground transition-colors border border-border/50"
              title="Visão Geral Superior (Planta 3D)"
            >
              Superior
            </button>
            <button
              type="button"
              onClick={() => { yawRef.current = -0.7; pitchRef.current = 0.75; zoomRef.current = 1.0; marcarInteracao(); }}
              className="h-6 rounded bg-muted/60 hover:bg-muted text-[9px] font-bold text-foreground transition-colors border border-border/50"
              title="Visão Isométrica 3D"
            >
              Isométrica
            </button>
            <button
              type="button"
              onClick={() => { yawRef.current = 0; pitchRef.current = 1.45; zoomRef.current = 1.0; marcarInteracao(); }}
              className="h-6 rounded bg-muted/60 hover:bg-muted text-[9px] font-bold text-foreground transition-colors border border-border/50"
              title="Visão de Perfil do Relevo"
            >
              Perfil
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => { setAutoGirar((a) => !a); marcarInteracao(); }}
          className={`flex items-center justify-center gap-1.5 h-7 rounded-lg text-[10px] font-bold transition-colors border ${autoGirar ? 'bg-emerald-600 text-white border-transparent' : 'text-muted-foreground border-border/60 hover:bg-muted/60'}`}
          title="Gira o modelo sozinho quando você não está mexendo"
        >
          <RefreshCw className={`size-3 ${autoGirar ? 'animate-spin [animation-duration:3s]' : ''}`} /> Rotação Automática
        </button>

        <button
          type="button"
          onClick={() => { setCalcVolumeAtivo((v) => !v); marcarInteracao(); }}
          className={`flex items-center justify-center gap-1.5 h-7 rounded-lg text-[10px] font-bold transition-colors border ${calcVolumeAtivo ? 'bg-blue-600 text-white border-transparent' : 'text-blue-500 border-blue-500/30 hover:bg-blue-500/10'}`}
          title="Ativa o cálculo e visualização de volumes de terraplenagem"
        >
          <Shovel className="size-3" /> Terraplenagem (Cubagem)
        </button>

        {onCapture && (
          <>
            <button
              type="button"
              onClick={() => setCaptureDialogAberto(true)}
              className="flex items-center justify-center gap-1.5 h-7 rounded-lg text-[10px] font-bold transition-colors border text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
              title="Captura o estado atual do modelo 3D e insere como um quadro móvel na planta"
            >
              <Camera className="size-3" /> Inserir Print na Planta
            </button>

            {/* Dialog de configuração do capture MDR */}
            {captureDialogAberto && (
              <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150" onClick={() => setCaptureDialogAberto(false)}>
                <div className="bg-background border border-border rounded-2xl shadow-2xl p-5 w-84 space-y-4 animate-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-sm text-foreground">Inserir Modelo 3D na Planta</h3>
                    <button type="button" onClick={() => setCaptureDialogAberto(false)} className="text-muted-foreground hover:text-foreground rounded-full p-1"><X className="size-4" /></button>
                  </div>

                  <p className="text-[11px] text-muted-foreground">A captura do modelo 3D será gerada com fundo transparente e inserida como imagem móvel na prancha.</p>

                  <div className="space-y-2.5 rounded-xl bg-muted/30 p-3">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Enquadramento da Captura</span>
                      <select
                        value={modoEnquadramentoCapture}
                        onChange={(e) => setModoEnquadramentoCapture(e.target.value as 'camera' | 'imovel_completo')}
                        className="h-8 w-full rounded border bg-background px-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                      >
                        <option value="camera">Manter Ângulo Atual da Câmera (Recomendado)</option>
                        <option value="imovel_completo">Visão Geral Superior (Planta 3D)</option>
                      </select>
                    </div>

                    <label className="flex items-center justify-between gap-2 cursor-pointer text-[11px] font-medium border-t border-border/30 pt-2">
                      <span>Ajustar largura/altura ao imóvel (sem vazios)</span>
                      <input type="checkbox" checked={captureRecortarBordas} onChange={(e) => setCaptureRecortarBordas(e.target.checked)} className="size-3.5 accent-primary" />
                    </label>

                    <label className="flex items-center justify-between gap-2 cursor-pointer text-[11px] font-medium border-t border-border/30 pt-2">
                      <span>Incluir curvas de nível</span>
                      <input type="checkbox" checked={mostrarCurvasNoCapture} onChange={(e) => setMostrarCurvasNoCapture(e.target.checked)} className="size-3.5 accent-primary" />
                    </label>

                    {mostrarCurvasNoCapture && (
                      <label className="flex items-center justify-between gap-2 cursor-pointer text-[11px] font-medium pl-2">
                        <span className="text-muted-foreground">Exibir altitudes nas curvas</span>
                        <input type="checkbox" checked={mostrarAltitudesNoCapture} onChange={(e) => setMostrarAltitudesNoCapture(e.target.checked)} className="size-3.5 accent-primary" />
                      </label>
                    )}

                    {calcVolumeAtivo && (volumes.corte + volumes.aterro) > 0 && (
                      <label className="flex items-center justify-between gap-2 cursor-pointer text-[11px] font-medium border-t border-border/30 pt-2">
                        <span>Incluir dados de terraplanagem</span>
                        <input type="checkbox" checked={captureIncluirTerraplanagem} onChange={(e) => setCaptureIncluirTerraplanagem(e.target.checked)} className="size-3.5 accent-primary" />
                      </label>
                    )}
                  </div>

                  {calcVolumeAtivo && captureIncluirTerraplanagem && (volumes.corte + volumes.aterro) > 0 && (
                    <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-2.5 text-[10px] space-y-0.5">
                      <div className="flex justify-between"><span className="text-red-500 font-bold">✂ Corte</span><span className="font-mono">{(volumes.corte * fatorEmpolamento).toFixed(1)} m³</span></div>
                      <div className="flex justify-between"><span className="text-blue-500 font-bold">⬇ Aterro</span><span className="font-mono">{volumes.aterro.toFixed(1)} m³</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Platô</span><span className="font-mono">{zRef.toFixed(2)} m</span></div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button type="button" onClick={() => setCaptureDialogAberto(false)}
                      className="flex-1 h-8 rounded-lg border text-[11px] font-bold hover:bg-muted transition-colors">
                      Cancelar
                    </button>
                    <button type="button"
                      onClick={() => {
                        const canvas = canvasRef.current;
                        if (!canvas) return;

                        const yawOld = yawRef.current;
                        const pitchOld = pitchRef.current;
                        const zoomOld = zoomRef.current;

                        if (modoEnquadramentoCapture === 'imovel_completo') {
                          yawRef.current = 0;
                          pitchRef.current = 0.85;
                          zoomRef.current = 0.95;
                        }

                        captureModeRef.current = true;
                        marcarInteracao();

                        requestAnimationFrame(() => {
                          requestAnimationFrame(() => {
                            const dataUrl = captureRecortarBordas ? recortaCanvasVisivel(canvas) : canvas.toDataURL('image/png');
                            captureModeRef.current = false;
                            yawRef.current = yawOld;
                            pitchRef.current = pitchOld;
                            zoomRef.current = zoomOld;
                            marcarInteracao();

                            const meta = (calcVolumeAtivo && captureIncluirTerraplanagem && (volumes.corte + volumes.aterro) > 0)
                              ? { volCorte: +(volumes.corte * fatorEmpolamento).toFixed(2), volAterro: +volumes.aterro.toFixed(2), zRef: +zRef.toFixed(2) }
                              : undefined;
                            onCapture!(dataUrl, meta);
                            setCaptureDialogAberto(false);
                          });
                        });
                      }}
                      className="flex-1 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-colors flex items-center justify-center gap-1.5">
                      <Camera className="size-3.5" /> Capturar e Inserir
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Visualização & Diagnósticos */}
        <div className="space-y-1.5 pt-2 border-t border-border/60">
          <span className="font-bold text-[9px] uppercase tracking-wider text-muted-foreground">Exibição & Diagnóstico</span>
          <div className="space-y-1.5">
            <label className="flex items-center justify-between gap-2 cursor-pointer text-xs">
              <span>Paredes Laterais</span>
              <input
                type="checkbox"
                checked={mostrarParedes}
                onChange={(e) => setMostrarParedes(e.target.checked)}
                className="rounded border-muted text-primary focus:ring-primary size-3.5"
              />
            </label>
            <label className="flex items-center justify-between gap-2 cursor-pointer text-xs">
              <span>Malha TIN (Wireframe)</span>
              <input
                type="checkbox"
                checked={mostrarTin}
                onChange={(e) => setMostrarTin(e.target.checked)}
                className="rounded border-muted text-primary focus:ring-primary size-3.5"
              />
            </label>
            <label className="flex items-center justify-between gap-2 cursor-pointer text-xs">
              <span>Curvas de Nível 3D</span>
              <input
                type="checkbox"
                checked={mostrarCurvas3D}
                onChange={(e) => setMostrarCurvas3D(e.target.checked)}
                className="rounded border-muted text-primary focus:ring-primary size-3.5"
              />
            </label>
            {mostrarCurvas3D && (
              <label className="flex items-center justify-between gap-2 cursor-pointer text-xs pl-2">
                <span className="text-muted-foreground">Mostrar Altitudes nas Curvas</span>
                <input
                  type="checkbox"
                  checked={mostrarAltitudesCurvas}
                  onChange={(e) => setMostrarAltitudesCurvas(e.target.checked)}
                  className="rounded border-muted text-primary focus:ring-primary size-3.5"
                />
              </label>
            )}
            <label className="flex items-center justify-between gap-2 cursor-pointer text-xs" title="Destaca vértices que estão com altitude zero no desenho">
              <span>Destacar Cota Zero</span>
              <input
                type="checkbox"
                checked={destacarErros}
                onChange={(e) => setDestacarErros(e.target.checked)}
                className="rounded border-muted text-primary focus:ring-primary size-3.5"
              />
            </label>
            <label className="flex items-center justify-between gap-2 cursor-pointer text-xs" title="Mostra os rótulos de nome e cota dos vértices no modelo 3D">
              <span>Mostrar Rótulos</span>
              <input
                type="checkbox"
                checked={mostrarLabels3D}
                onChange={(e) => setMostrarLabels3D(e.target.checked)}
                className="rounded border-muted text-primary focus:ring-primary size-3.5"
              />
            </label>
          </div>
        </div>

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
      {temEscalaZ && !calcVolumeAtivo && (
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

      {/* Legenda de terraplenagem quando ativo */}
      {calcVolumeAtivo && (
        <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 p-2.5 rounded-xl bg-background/90 backdrop-blur border border-border/80 shadow-lg text-[9px]">
          <span className="font-extrabold text-foreground uppercase tracking-wider leading-none mb-1">Legenda Relevo</span>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-500 border border-red-600/35" />
            <span className="text-muted-foreground font-semibold">Corte (Solo Acima do Platô)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-500 border border-blue-600/35" />
            <span className="text-muted-foreground font-semibold">Aterro (Solo Abaixo do Platô)</span>
          </div>
        </div>
      )}

      {/* Botão de voltar no canto inferior esquerdo */}
      <div className="absolute bottom-14 left-4 z-[2500] flex gap-2">
        <Button
          size="sm"
          className="h-9 px-4 gap-1.5 font-bold shadow-md bg-[#10b981] hover:bg-[#059669] text-white"
          onClick={onVoltar2D}
          title="Voltar ao modo Mapa 2D"
        >
          <Map className="size-4" /> 2D
        </Button>
      </div>
    </div>
  );
}
