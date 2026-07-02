// Exporta o desenho editado para PDF em folha A4 paisagem, com a escala e o enquadramento
// calculados sozinhos a partir da caixa que envolve o desenho. Fica num arquivo separado de
// dxfEngine.ts para aquele continuar sem NENHUMA dependência externa: este aqui usa o pacote
// `jspdf` (não é React/UI — é só geração de PDF; se copiar esta ferramenta para outro app, instale
// `jspdf` lá também).

import { jsPDF } from 'jspdf';
import type { Ent, Camada, Pt } from './dxfEngine';
import { pontosDe, camadaDe } from './dxfEngine';

const PAGE_W = 297, PAGE_H = 210;   // A4 paisagem, em mm
const USABLE_W = 281, USABLE_H = 194; // área útil (descontada a margem de ~8mm de cada lado)

function hexRgb(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0];
}

/**
 * Gera e baixa um PDF A4 paisagem do desenho (só entidades de camadas VISÍVEIS). A escala é
 * calculada para caber a caixa do desenho na folha: N = max(largura/281, altura/194) × 1.03
 * (a margem de 3% evita que o desenho encoste na borda), e o desenho fica centralizado.
 * OBS.: a escala "1:N" impressa assume que as unidades do desenho já equivalem a milímetros reais
 * (comum em desenhos técnicos/mecânicos); para desenhos em outra unidade, trate-a como aproximada.
 */
export function gerarPdfDesenho(ents: Ent[], camadas: Camada[], nomeArquivo: string): void {
  const cor0 = camadas[0];
  const camadaDoNome = (nome: string) => camadas.find((c) => c.nome === nome) ?? cor0;
  const visiveis = ents.filter((e) => camadaDoNome(camadaDe(e))?.visivel !== false);
  const pts = visiveis.flatMap(pontosDe);
  if (!pts.length) return;

  const minX = Math.min(...pts.map((p) => p.x)), maxX = Math.max(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y)), maxY = Math.max(...pts.map((p) => p.y));
  const largura = maxX - minX || 1, altura = maxY - minY || 1;
  const N = Math.max(largura / USABLE_W, altura / USABLE_H) * 1.03;
  const escala = 1 / N; // mm de papel por unidade de desenho
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;

  // (x,y) do desenho -> mm na página (Y invertido: PDF cresce para baixo, o desenho cresce para cima)
  const P = (p: Pt) => ({ x: PAGE_W / 2 + (p.x - cx) * escala, y: PAGE_H / 2 - (p.y - cy) * escala });

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setLineWidth(0.15);

  for (const e of visiveis) {
    const cam = camadaDoNome(camadaDe(e));
    const [r, g, b] = hexRgb(cam?.cor || '#000000');
    doc.setDrawColor(r, g, b);
    doc.setTextColor(r, g, b);

    if (e.t === 'line') { const a = P(e.a), bb = P(e.b); doc.line(a.x, a.y, bb.x, bb.y); }
    else if (e.t === 'poly') {
      const pp = e.pts.map(P);
      for (let i = 0; i + 1 < pp.length; i++) doc.line(pp[i].x, pp[i].y, pp[i + 1].x, pp[i + 1].y);
      if (e.fechada && pp.length > 1) doc.line(pp[pp.length - 1].x, pp[pp.length - 1].y, pp[0].x, pp[0].y);
    }
    else if (e.t === 'circle') { const c = P(e.c); doc.circle(c.x, c.y, e.r * escala); }
    else if (e.t === 'arc') {
      // aproxima o arco por segmentos retos (sentido anti-horário de a0 até a1, padrão DXF)
      const passos = 48;
      const rad0 = (e.a0 * Math.PI) / 180;
      const varredura = (((e.a1 - e.a0) % 360) + 360) % 360 || 360;
      let prev: { x: number; y: number } | null = null;
      for (let i = 0; i <= passos; i++) {
        const ang = rad0 + ((varredura * Math.PI) / 180) * (i / passos);
        const p = P({ x: e.c.x + e.r * Math.cos(ang), y: e.c.y + e.r * Math.sin(ang) });
        if (prev) doc.line(prev.x, prev.y, p.x, p.y);
        prev = p;
      }
    }
    else if (e.t === 'text') { const p = P(e.pos); doc.setFontSize(Math.max(5, (e.altura || 2) * escala * 2.83)); doc.text(e.texto, p.x, p.y); }
    else if (e.t === 'point') { const p = P(e.p); doc.circle(p.x, p.y, 0.4, 'F'); }
  }

  doc.setDrawColor(0, 0, 0); doc.setTextColor(0, 0, 0); doc.setFontSize(7);
  doc.text(`Escala aprox. 1:${Math.round(N)}`, 6, PAGE_H - 4);
  doc.save(nomeArquivo.replace(/\.dxf$/i, '') + '.pdf');
}
