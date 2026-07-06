// Desenho de precisão estilo CAD (modo Completo): trava de ângulo (ORTO/POLAR) e leitura de
// azimute digitado. Puro (plano E/N já projetado), sem React — testável e reaproveitável.

import type { PontoEN } from './verticeVirtual';

/** Modo da trava de ângulo: desligada, só ângulos retos (90°) ou saltos de 15°. */
export type ModoOrto = 'off' | '90' | '15';

/**
 * Projeta o ponto `alvo` sobre a direção travada mais próxima a partir de `base`:
 * o azimute do trecho é arredondado pro múltiplo de `passoGraus` (90 = ortogonal, 15 = polar)
 * e a DISTÂNCIA até o alvo é preservada (o ponto desliza pro raio travado mais próximo).
 */
export function aplicarOrto(base: PontoEN, alvo: PontoEN, passoGraus: number): PontoEN {
  const dE = alvo.leste - base.leste;
  const dN = alvo.norte - base.norte;
  const d = Math.hypot(dE, dN);
  if (d < 1e-9 || passoGraus <= 0) return alvo;
  let az = (Math.atan2(dE, dN) * 180) / Math.PI; // 0 = Norte, horário
  if (az < 0) az += 360;
  const azTravado = ((Math.round(az / passoGraus) * passoGraus) % 360 + 360) % 360;
  const rad = (azTravado * Math.PI) / 180;
  return { leste: base.leste + d * Math.sin(rad), norte: base.norte + d * Math.cos(rad) };
}

/**
 * Lê um azimute digitado pelo usuário. Aceita:
 *  - decimal: "123.45" ou "123,45"
 *  - graus/minutos/segundos separados por espaço: "45 30 15" (segundos e minutos opcionais)
 *  - com símbolos: 45°30'15", 45º30′15″
 * Retorna graus decimais em [0, 360), ou null quando não dá pra entender.
 */
export function parseAzimute(txt: string): number | null {
  const limpo = (txt || '').replace(/[°º]/g, ' ').replace(/['′]/g, ' ').replace(/["″]/g, ' ').trim();
  if (!limpo) return null;
  const partes = limpo.split(/\s+/).filter(Boolean).map((p) => parseFloat(p.replace(',', '.')));
  if (partes.length === 0 || partes.length > 3 || partes.some((n) => !Number.isFinite(n) || n < 0)) return null;
  const [g, m = 0, s = 0] = partes;
  if (m >= 60 || s >= 60) return null;
  const az = g + m / 60 + s / 3600;
  if (az < 0 || az > 360) return null;
  return az % 360;
}
