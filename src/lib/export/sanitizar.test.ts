import { describe, it, expect } from 'vitest';
import { sanitizarTexto } from './sanitizar';

describe('sanitizarTexto', () => {
  it('remove caracteres de controle ASCII mantendo o texto visivel', () => {
    const comControle = 'Fazenda\x00 Ventania\x1F';
    expect(sanitizarTexto(comControle)).toBe('Fazenda Ventania');
  });

  it('remove zero-width space, marcas bidi e BOM colados de outro programa', () => {
    const zeroWidth = '​';
    const bom = '﻿';
    const rtlMark = '‏';
    const comInvisiveis = `${bom}Jos${zeroWidth}é da Silva${rtlMark}`;
    expect(sanitizarTexto(comInvisiveis)).toBe('José da Silva');
  });

  it('mantem quebra de linha e tabulacao', () => {
    expect(sanitizarTexto('linha1\nlinha2\ttab')).toBe('linha1\nlinha2\ttab');
  });

  it('trata undefined/null/vazio como string vazia', () => {
    expect(sanitizarTexto(undefined)).toBe('');
    expect(sanitizarTexto(null)).toBe('');
    expect(sanitizarTexto('')).toBe('');
  });
});
