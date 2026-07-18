import type { PlanoXY } from './sgl';

/** Azimute (graus decimais 0..360, a partir do Norte, sentido horário) de A para B. */
export function azimute(a: PlanoXY, b: PlanoXY): number {
  let t = (Math.atan2(b.e - a.e, b.n - a.n) * 180) / Math.PI;
  if (t < 0) t += 360;
  return t;
}

/** Distância plana (m) entre A e B. */
export function distancia(a: PlanoXY, b: PlanoXY): number {
  return Math.hypot(b.e - a.e, b.n - a.n);
}

/**
 * Formata azimute em graus e minutos no padrão do memorial (ex.: 154°38').
 * Trata o carry quando o arredondamento do minuto chega a 60.
 */
export function azimuteDMS(deg: number): string {
  if (!Number.isFinite(deg)) return `0°00'00"`;
  let a = deg % 360;
  if (a < 0) a += 360;
  let d = Math.floor(a);
  const rest = (a - d) * 60;
  let m = Math.floor(rest);
  let s = Math.round((rest - m) * 60);
  if (s >= 60) { s -= 60; m += 1; }
  if (m >= 60) { m -= 60; d += 1; }
  if (d >= 360) d -= 360;
  return `${d}°${String(m).padStart(2, '0')}'${String(s).padStart(2, '0')}"`;
}

/** Formata número com vírgula decimal (padrão BR). */
export function numBR(v: number | null | undefined, casas = 2): string {
  const val = Number.isFinite(v) ? (v as number) : 0;
  return val.toFixed(casas).replace('.', ',');
}

/** Formata número com ponto de milhar e vírgula decimal (ex.: 1004.08 -> "1.004,08"). */
export function numBRmilhar(v: number | null | undefined, casas = 2): string {
  const val = Number.isFinite(v) ? (v as number) : 0;
  const [int, frac] = val.toFixed(casas).split('.');
  const intGrp = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return casas > 0 ? `${intGrp},${frac}` : intGrp;
}

/** Formata uma matrícula numérica com ponto de milhar (ex.: "5476" -> "5.476"). */
export function formatMatricula(m: string): string {
  const so = (m ?? '').trim();
  if (/^\d+$/.test(so)) return so.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return so;
}
