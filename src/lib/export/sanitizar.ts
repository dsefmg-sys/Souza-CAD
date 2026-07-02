/**
 * Remove caracteres de controle invisiveis (comuns quando se cola texto de Word/PDF/WhatsApp)
 * antes de colocar o texto num documento gerado. Mantem quebra de linha (\n) e tabulacao (\t),
 * que o docx/jsPDF tratam de forma previsivel; remove os demais controles ASCII, zero-width,
 * marcas de direcao de texto (bidi) e BOM - invisiveis que podem corromper o XML do documento.
 */
export function sanitizarTexto(texto: string | undefined | null): string {
  if (!texto) return '';
  return texto
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // controles ASCII (exceto \n e \t)
    .replace(/[​-‏‪-‮⁠﻿]/g, '') // zero-width, bidi, BOM
    .trim();
}

/**
 * Aplica sanitizarTexto recursivamente em toda string dentro de um objeto/array, sem tocar em
 * outros tipos (número, boolean, Date). Usado na entrada dos geradores de documento para blindar
 * qualquer campo de texto livre digitado ou colado pelo usuário, sem precisar sanitizar campo a
 * campo em cada gerador.
 */
export function sanitizarProfundo<T>(valor: T): T {
  if (typeof valor === 'string') return sanitizarTexto(valor) as unknown as T;
  if (Array.isArray(valor)) return valor.map(sanitizarProfundo) as unknown as T;
  if (valor && typeof valor === 'object' && !(valor instanceof Date)) {
    const copia: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(valor as Record<string, unknown>)) copia[k] = sanitizarProfundo(v);
    return copia as T;
  }
  return valor;
}
