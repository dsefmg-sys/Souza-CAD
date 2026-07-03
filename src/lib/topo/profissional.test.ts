import { describe, it, expect } from 'vitest';
import { rotulosProfissional } from './profissional';

describe('rotulosProfissional', () => {
  it('sem conselho definido, trata como técnico (CFT/TRT) — compatibilidade', () => {
    const r = rotulosProfissional(undefined);
    expect(r.conselho).toBe('CFT');
    expect(r.registro).toBe('CFT');
    expect(r.termo).toBe('TRT');
  });

  it('CFT explícito = técnico com TRT', () => {
    const r = rotulosProfissional({ conselho: 'CFT' });
    expect(r.registro).toBe('CFT');
    expect(r.termo).toBe('TRT');
  });

  it('CREA = engenheiro com ART', () => {
    const r = rotulosProfissional({ conselho: 'CREA' });
    expect(r.conselho).toBe('CREA');
    expect(r.registro).toBe('CREA');
    expect(r.termo).toBe('ART');
    expect(r.termoExtenso).toContain('Anotação');
  });
});
