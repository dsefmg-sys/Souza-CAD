import { describe, it, expect } from 'vitest';
import { sanitizarTexto, escaparXml } from './sanitizar';
import { gerarGPX } from './gpx';
import { gerarKML } from './kml';
import type { Vertex, ImovelData } from '../topo/types';

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

describe('escaparXml', () => {
  it('escapa &, <, > e aspas', () => {
    expect(escaparXml('Sítio Barro & Água <novo> "aspas"')).toBe('Sítio Barro &amp; Água &lt;novo&gt; &quot;aspas&quot;');
  });

  it('remove caracteres de controle além de escapar', () => {
    expect(escaparXml('A\x00 & B')).toBe('A &amp; B');
  });
});

describe('GPX/KML com texto que precisa de escape', () => {
  const vs = [
    { lat: -20.1, lon: -42.1, leste: 100, norte: 100, elevacao: 600, codigoSigef: 'COIN-M-0001' },
    { lat: -20.2, lon: -42.1, leste: 100, norte: 200, elevacao: 600, codigoSigef: 'COIN-M-0002' },
    { lat: -20.2, lon: -42.2, leste: 200, norte: 200, elevacao: 600, codigoSigef: 'COIN-M-0003' },
  ] as unknown as Vertex[];
  const imv = { denominacao: 'Sítio Barro & Água' } as ImovelData;

  it('GPX não sai com & cru no nome do imóvel', () => {
    const xml = gerarGPX(vs, imv);
    expect(xml).toContain('Sítio Barro &amp; Água');
    expect(xml).not.toContain('Barro & Água');
  });

  it('KML não sai com & cru no nome do imóvel', () => {
    const xml = gerarKML(vs, imv);
    expect(xml).toContain('Sítio Barro &amp; Água');
    expect(xml).not.toMatch(/<name>[^<]*Barro & Água/);
  });
});
