// Snap (atração) para auxiliar a edição com precisão, no plano UTM (metros).
// Prioridade: encaixa num vértice existente (dentro da tolerância); senão, na grade.

export interface AlvoSnap { leste: number; norte: number; }
export interface SnapResult { leste: number; norte: number; tipo: 'vertice' | 'grade' | null; }

export function snapUtm(
  leste: number,
  norte: number,
  alvos: AlvoSnap[],
  opts: { tolVerticeM?: number; gradeIntervalo?: number; tolGradeM?: number } = {}
): SnapResult {
  const tolV = opts.tolVerticeM ?? 2;
  // 1) vértice mais próximo dentro da tolerância
  let best: AlvoSnap | null = null;
  let bestD = tolV;
  for (const a of alvos) {
    const d = Math.hypot(leste - a.leste, norte - a.norte);
    if (d < bestD) { bestD = d; best = a; }
  }
  if (best) return { leste: best.leste, norte: best.norte, tipo: 'vertice' };

  // 2) grade
  const g = opts.gradeIntervalo ?? 0;
  if (g > 0) {
    const gl = Math.round(leste / g) * g;
    const gn = Math.round(norte / g) * g;
    const tolG = opts.tolGradeM ?? g * 0.12;
    if (Math.hypot(leste - gl, norte - gn) < tolG) return { leste: gl, norte: gn, tipo: 'grade' };
  }
  return { leste, norte, tipo: null };
}
