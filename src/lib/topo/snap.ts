// Snap (atração) para auxiliar a edição com precisão, no plano UTM (metros).
// Prioridade: encaixa num vértice existente (dentro da tolerância); senão, na grade.

export interface AlvoSnap { leste: number; norte: number; }
export interface SegmentoSnap {
  a: AlvoSnap;
  b: AlvoSnap;
  objetoId?: string;
  segmentoIdx?: number;
  tipoOrigem?: 'perimetro' | 'referencia' | 'objeto';
}

export type TipoSnap = 'vertice' | 'meio' | 'intersecao' | 'perpendicular' | 'extensao' | 'grade' | null;

export interface SnapResult {
  leste: number;
  norte: number;
  tipo: TipoSnap;
  segmentoRef?: SegmentoSnap;
  pontosAuxUTM?: AlvoSnap[];
}

export function snapUtm(
  leste: number,
  norte: number,
  alvos: AlvoSnap[] = [],
  opts: {
    tolVerticeM?: number;
    gradeIntervalo?: number;
    tolGradeM?: number;
    segmentos?: SegmentoSnap[];
    pontoOrigem?: AlvoSnap | null;
  } = {}
): SnapResult {
  const tolV = opts.tolVerticeM ?? 2;
  const segmentos = opts.segmentos ?? [];
  const pontoOrigem = opts.pontoOrigem ?? null;

  // 1) vértice mais próximo dentro da tolerância
  let bestVertice: AlvoSnap | null = null;
  let bestVerticeD = tolV;
  for (const a of alvos) {
    const d = Math.hypot(leste - a.leste, norte - a.norte);
    // Usamos `<=` (e não `<`) pra incluir o caso de borda: distância EXATAMENTE igual à
    // tolerância também deve snapar. Antes, era `<` e a borda caía — fail silencioso em
    // casos limítrofes. Coberto pelo teste 'alvo exatamente NA tolerância (2m) snap'.
    if (d <= bestVerticeD) {
      bestVerticeD = d;
      bestVertice = a;
    }
  }
  if (bestVertice) {
    return { leste: bestVertice.leste, norte: bestVertice.norte, tipo: 'vertice' };
  }

  // Se snaps avançados estiverem ativos (ou seja, se tivermos segmentos), vamos testar outras prioridades
  if (segmentos.length > 0) {
    // 2) Interseções entre todos os segmentos
    let bestIntersecao: AlvoSnap | null = null;
    let bestIntersecaoD = tolV;
    for (let i = 0; i < segmentos.length; i++) {
      for (let j = i + 1; j < segmentos.length; j++) {
        const s1 = segmentos[i];
        const s2 = segmentos[j];
        
        const x1 = s1.a.leste, y1 = s1.a.norte;
        const x2 = s1.b.leste, y2 = s1.b.norte;
        const x3 = s2.a.leste, y3 = s2.a.norte;
        const x4 = s2.b.leste, y4 = s2.b.norte;
        
        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (Math.abs(denom) > 1e-6) {
          const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
          const u = ((x1 - x3) * (y1 - y2) - (y1 - y3) * (x1 - x2)) / denom;
          
          if (t >= -0.001 && t <= 1.001 && u >= -0.001 && u <= 1.001) {
            const ix = x1 + t * (x2 - x1);
            const iy = y1 + t * (y2 - y1);
            const dist = Math.hypot(leste - ix, norte - iy);
            if (dist < bestIntersecaoD) {
              bestIntersecaoD = dist;
              bestIntersecao = { leste: ix, norte: iy };
            }
          }
        }
      }
    }
    if (bestIntersecao) {
      return { leste: bestIntersecao.leste, norte: bestIntersecao.norte, tipo: 'intersecao' };
    }

    // 3) Meio de Segmento (Midpoint)
    let bestMeio: AlvoSnap | null = null;
    let bestMeioD = tolV;
    let bestMeioSeg: SegmentoSnap | undefined;
    for (const seg of segmentos) {
      const dx = seg.b.leste - seg.a.leste;
      const dy = seg.b.norte - seg.a.norte;
      const lenSq = dx * dx + dy * dy;
      // Segmento degenerado (a === b): o "meio" seria o próprio ponto, o que gera snap
      // espúrio quando o clique coincide. Mesma proteção que já existia em "perpendicular"
      // e "extensão". Coberto pelo teste 'segmento degenerado tem o "meio" igual ao próprio
      // ponto — edge case'.
      if (lenSq < 1e-6) continue;
      const mx = (seg.a.leste + seg.b.leste) / 2;
      const my = (seg.a.norte + seg.b.norte) / 2;
      const dist = Math.hypot(leste - mx, norte - my);
      if (dist < bestMeioD) {
        bestMeioD = dist;
        bestMeio = { leste: mx, norte: my };
        bestMeioSeg = seg;
      }
    }
    if (bestMeio) {
      return { leste: bestMeio.leste, norte: bestMeio.norte, tipo: 'meio', segmentoRef: bestMeioSeg };
    }

    // 4) Pé da Perpendicular (se tivermos pontoOrigem)
    if (pontoOrigem) {
      let bestPerp: AlvoSnap | null = null;
      let bestPerpD = tolV;
      let bestPerpSeg: SegmentoSnap | undefined;
      for (const seg of segmentos) {
        const dx = seg.b.leste - seg.a.leste;
        const dy = seg.b.norte - seg.a.norte;
        const lenSq = dx * dx + dy * dy;
        if (lenSq > 1e-6) {
          const t = ((pontoOrigem.leste - seg.a.leste) * dx + (pontoOrigem.norte - seg.a.norte) * dy) / lenSq;
          if (t >= 0 && t <= 1) {
            const px = seg.a.leste + t * dx;
            const py = seg.a.norte + t * dy;
            const dist = Math.hypot(leste - px, norte - py);
            if (dist < bestPerpD) {
              bestPerpD = dist;
              bestPerp = { leste: px, norte: py };
              bestPerpSeg = seg;
            }
          }
        }
      }
      if (bestPerp) {
        return {
          leste: bestPerp.leste,
          norte: bestPerp.norte,
          tipo: 'perpendicular',
          segmentoRef: bestPerpSeg,
          pontosAuxUTM: [pontoOrigem, bestPerp]
        };
      }
    }

    // 5) Extensão de Alinhamento
    let bestExt: AlvoSnap | null = null;
    let bestExtD = tolV;
    let bestExtSeg: SegmentoSnap | undefined;
    let bestExtPontoExtremidade: AlvoSnap | undefined;
    for (const seg of segmentos) {
      const dx = seg.b.leste - seg.a.leste;
      const dy = seg.b.norte - seg.a.norte;
      const lenSq = dx * dx + dy * dy;
      if (lenSq > 1e-6) {
        const t = ((leste - seg.a.leste) * dx + (norte - seg.a.norte) * dy) / lenSq;
        if (t < 0 || t > 1) {
          const px = seg.a.leste + t * dx;
          const py = seg.a.norte + t * dy;
          const distMouseDaLinha = Math.hypot(leste - px, norte - py);
          if (distMouseDaLinha < bestExtD) {
            const extremidade = t < 0 ? seg.a : seg.b;
            const distDaExtremidade = Math.hypot(px - extremidade.leste, py - extremidade.norte);
            if (distDaExtremidade <= 50) {
              bestExtD = distMouseDaLinha;
              bestExt = { leste: px, norte: py };
              bestExtSeg = seg;
              bestExtPontoExtremidade = extremidade;
            }
          }
        }
      }
    }
    if (bestExt && bestExtPontoExtremidade) {
      return {
        leste: bestExt.leste,
        norte: bestExt.norte,
        tipo: 'extensao',
        segmentoRef: bestExtSeg,
        pontosAuxUTM: [bestExtPontoExtremidade, bestExt]
      };
    }
  }

  // 6) grade (menor prioridade)
  const g = opts.gradeIntervalo ?? 0;
  if (g > 0) {
    const gl = Math.round(leste / g) * g;
    const gn = Math.round(norte / g) * g;
    const tolG = opts.tolGradeM ?? g * 0.12;
    if (Math.hypot(leste - gl, norte - gn) < tolG) {
      return { leste: gl, norte: gn, tipo: 'grade' };
    }
  }

  return { leste, norte, tipo: null };
}
