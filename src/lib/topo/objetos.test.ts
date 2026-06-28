import { describe, it, expect } from 'vitest';
import { novaPolilinha, novoTexto, novaCota, distanciaCota, comprimentoPolilinha } from './objetos';
import type { PontoLL } from './types';

const p = (leste: number, norte: number): PontoLL => ({ lat: 0, lon: 0, leste, norte });

describe('objetos de desenho', () => {
  it('cota mede a distância UTM entre os dois pontos', () => {
    const o = novaCota(p(0, 0), p(3, 4));
    expect(distanciaCota(o)).toBe(5);
  });
  it('comprimento de polilinha soma os trechos', () => {
    const o = novaPolilinha([p(0, 0), p(10, 0), p(10, 10)]);
    expect(comprimentoPolilinha(o)).toBe(20);
  });
  it('texto guarda conteúdo, tamanho e alinhamento padrão', () => {
    const o = novoTexto(p(1, 1), 'oi');
    expect(o.tipo).toBe('texto');
    expect(o.texto).toBe('oi');
    expect(o.tamanho).toBe(12);
    expect(o.alinhamento).toBe('left');
  });
});
