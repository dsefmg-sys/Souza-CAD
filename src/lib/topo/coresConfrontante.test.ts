import { describe, it, expect } from 'vitest';
import { corPorConfrontante } from './coresConfrontante';

describe('corPorConfrontante', () => {
  it('é estável: o mesmo id sempre devolve a mesma cor', () => {
    const id = 'confrontante-123';
    expect(corPorConfrontante(id)).toBe(corPorConfrontante(id));
  });

  it('ids diferentes tendem a gerar cores diferentes', () => {
    const cores = new Set(['a', 'b', 'c', 'd', 'e'].map(corPorConfrontante));
    expect(cores.size).toBeGreaterThan(1);
  });

  it('sempre devolve uma cor hexadecimal válida', () => {
    for (const id of ['x', 'y', 'z', '', 'confrontante-abc-999']) {
      expect(corPorConfrontante(id)).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
