'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RotateCcw, Download, Navigation } from 'lucide-react';
import { type Vertex, type ObjetoDesenho, type ImovelData } from '@/lib/topo/types';
import { exportarKML } from '@/lib/export/kml';

interface Map3DViewerProps {
  vertices: Vertex[];
  objetos: ObjetoDesenho[];
  zona: number;
  hemisferio: 'N' | 'S';
  imovel: ImovelData;
  onVoltar2D: () => void;
}

export default function Map3DViewer({ vertices, objetos, zona, hemisferio, imovel, onVoltar2D }: Map3DViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [yaw, setYaw] = useState(-0.5); // rotação horizontal
  const [pitch, setPitch] = useState(0.8); // inclinação vertical
  const [zoom, setZoom] = useState(1.0);
  const [exagero, setExagero] = useState(3.0); // exagero vertical padrão

  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, startYaw: 0, startPitch: 0 });

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

  // Render do Loop 3D via Canvas 2D adaptado com Projeção Ortográfica / Perspectiva Simples
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;

    const draw = () => {
      if (!canvas || !ctx) return;
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
        const y2 = y1 * cosP - z1 * sinP;
        const z2 = y1 * sinP + z1 * cosP;

        // Perspectiva simples
        const dist = stats.maxDist * 1.5;
        const pers = dist / (dist + z2);

        const screenX = w / 2 + x2 * finalScale * pers;
        const screenY = h / 2 - y2 * finalScale * pers;

        return { x: screenX, y: screenY, depth: z2 };
      };

      // 1. Desenha o relevo/grade de curvas de nível adensadas se houver
      const ptsAdensados = objetos.filter((o) => o.tipo === 'polilinha' && o.curvaNivel !== undefined);
      if (ptsAdensados.length > 0) {
        ctx.strokeStyle = 'rgba(135, 169, 146, 0.15)';
        ctx.lineWidth = 1;
        ptsAdensados.forEach((obj) => {
          if (obj.pontos.length < 2) return;
          ctx.beginPath();
          obj.pontos.forEach((p, idx) => {
            const proj = project(p.leste, p.norte, obj.curvaNivel || 0);
            if (idx === 0) ctx.moveTo(proj.x, proj.y);
            else ctx.lineTo(proj.x, proj.y);
          });
          ctx.stroke();
        });
      }

      // 2. Desenha a base (projeção 2D de referência no chão)
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

      // Linhas verticais projetando os vértices do chão para a altitude real (efeito 3D topográfico)
      if (hasZ) {
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
          ctx.fillStyle = '#87a992';
          ctx.font = '8px monospace';
          ctx.fillText(`${v.elevacao.toFixed(1)}m`, proj.x + 8, proj.y + 7);
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

    const loop = () => {
      draw();
      animFrame = requestAnimationFrame(loop);
    };

    loop();

    return () => cancelAnimationFrame(animFrame);
  }, [vertices, objetos, yaw, pitch, zoom, exagero, stats, hasZ, finitePts]);

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

  // Handlers de Mouse para drag
  const handleMouseDown = (e: React.MouseEvent) => {
    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startYaw: yaw,
      startPitch: pitch,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current.isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    setYaw(dragRef.current.startYaw + dx * 0.007);
    setPitch(Math.max(0.1, Math.min(Math.PI / 2 - 0.05, dragRef.current.startPitch + dy * 0.007)));
  };

  const handleMouseUp = () => {
    dragRef.current.isDragging = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    setZoom((z) => Math.max(0.3, Math.min(5.0, z - e.deltaY * 0.001)));
  };

  // Exportador de KML para visualizar no Google Earth
  const handleBaixarKml = () => {
    exportarKML(vertices, imovel);
  };

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
        className="w-full h-full flex-grow cursor-grab active:cursor-grabbing"
      />

      {/* Controles de overlay superior direito */}
      <div className="absolute top-4 right-4 flex flex-col gap-2.5 p-3 rounded-xl bg-background/90 backdrop-blur border border-border/80 shadow-lg max-w-xs text-xs text-muted-foreground">
        <span className="font-extrabold text-foreground uppercase tracking-wider text-[10px] block">Modelo de Relevo 3D</span>
        <div className="space-y-1">
          <p>• Arraste para girar a câmera</p>
          <p>• Use a rolagem do mouse para dar zoom</p>
        </div>

        {hasZ && (
          <div className="space-y-1.5 pt-2 border-t border-border/60">
            <Label className="text-[10px] font-bold text-[#87a992]">Exagero Vertical: {exagero.toFixed(1)}x</Label>
            <input
              type="range"
              min={1.0}
              max={10.0}
              step={0.5}
              value={exagero}
              onChange={(e) => setExagero(Number(e.target.value))}
              className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-amber-600"
            />
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t border-border/60">
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-full gap-1.5 text-[10px] font-bold"
            onClick={() => { setYaw(-0.5); setPitch(0.8); setZoom(1.0); }}
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
