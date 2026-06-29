import { describe, it, expect } from 'vitest';
import { iniciarDoNorteHorario } from './vertices';
import type { Vertex } from './types';

// vértice mínimo só com o que a função usa (leste/norte) + campos obrigatórios
function v(nome: string, leste: number, norte: number): Vertex {
  return {
    id: nome, ordem: 0, nome, codigoCampo: '', norte, leste, elevacao: 0,
    lat: norte / 100000, lon: leste / 100000, tipo: 'M', codigoSigef: nome, isDivisa: true,
  };
}

describe('iniciarDoNorteHorario', () => {
  it('começa no vértice mais ao norte e segue no sentido horário', () => {
    // quadrado, informado em sentido anti-horário começando pelo canto SW
    const sw = v('SW', 0, 0), se = v('SE', 10, 0), ne = v('NE', 10, 10), nw = v('NW', 0, 10);
    const fora = iniciarDoNorteHorario([sw, se, ne, nw]);
    // primeiro é um dos vértices ao norte (maior N=10); empate resolvido para o mais a oeste (NW)
    expect(fora[0].id).toBe('NW');
    // sentido horário: área assinada (E=x, N=y) deve ser negativa
    let area2 = 0;
    for (let i = 0; i < fora.length; i++) {
      const a = fora[i], b = fora[(i + 1) % fora.length];
      area2 += a.leste * b.norte - b.leste * a.norte;
    }
    expect(area2).toBeLessThan(0);
    // mantém os 4 vértices
    expect(fora.map((x) => x.id).sort()).toEqual(['NE', 'NW', 'SE', 'SW']);
  });

  it('já horário começando ao sul: rotaciona para o norte mantendo o sentido', () => {
    // sentido horário: SW, NW, NE, SE
    const sw = v('SW', 0, 0), nw = v('NW', 0, 10), ne = v('NE', 10, 10), se = v('SE', 10, 0);
    const fora = iniciarDoNorteHorario([sw, nw, ne, se]);
    expect(fora[0].id).toBe('NW'); // mais ao norte e mais a oeste
    let area2 = 0;
    for (let i = 0; i < fora.length; i++) {
      const a = fora[i], b = fora[(i + 1) % fora.length];
      area2 += a.leste * b.norte - b.leste * a.norte;
    }
    expect(area2).toBeLessThan(0);
  });
});
