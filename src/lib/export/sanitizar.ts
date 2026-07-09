/**
 * Deixa o texto SEGURO para ir num XML (docx/ods/kml). Além de tirar os invisíveis colados de
 * Word/PDF/WhatsApp, remove TODO caractere que o XML 1.0 proíbe — surrogates soltos (metade de um
 * par UTF-16 sem a outra), não-caracteres (U+FFFE/U+FFFF) e controles. Esses, mesmo escapados,
 * corrompem o arquivo e fazem o Word acusar "problema no conteúdo" ao abrir. Mantém \n e \t.
 */
export function sanitizarTexto(texto: string | undefined | null): string {
  if (!texto) return '';
  // 1) percorre a string preservando pares de surrogate válidos (emojis etc.) e descartando os
  //    soltos e os não-caracteres — que quebram o XML.
  let limpo = '';
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const n = texto.charCodeAt(i + 1);
      if (n >= 0xdc00 && n <= 0xdfff) { limpo += texto[i] + texto[i + 1]; i++; } // par válido
      // surrogate alto solto → descarta
    } else if (c >= 0xdc00 && c <= 0xdfff) {
      // surrogate baixo solto → descarta
    } else if (c === 0xfffe || c === 0xffff) {
      // não-caractere → descarta
    } else {
      limpo += texto[i];
    }
  }
  // 2) tira controles ASCII (menos \n e \t), zero-width, marcas bidi e BOM
  return limpo
     
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/[​-‏‪-‮⁠﻿]/g, '')
    .trim();
}

/**
 * Sanitiza E escapa um texto para uso dentro de XML (GPX, KML, ODS…): remove os caracteres de
 * controle (proibidos no XML 1.0) e converte &, <, > e aspas nas entidades corretas. Sem isso,
 * um nome como "Sítio Barro & Água" corrompe o arquivo gerado.
 */
export function escaparXml(texto: string | undefined | null): string {
  return sanitizarTexto(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
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
