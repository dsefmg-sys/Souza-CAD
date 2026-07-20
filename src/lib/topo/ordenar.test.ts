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
    let area2 = 0;
    for (let i = 0; i < fora.length; i++) {
      const a = fora[i], b = fora[(i + 1) % fora.length];
      area2 += a.leste * b.norte - b.leste * a.norte;
    }
    expect(area2).toBeLessThan(0);
  });

  it('seleciona COIN-P-0185 como mais ao norte entre 0175 e 0185', () => {
    const v175: Vertex = { id: '0175', ordem: 0, nome: 'COIN-P-0175', codigoCampo: '', norte: 7706500.00, leste: 410000, elevacao: 0, lat: 20.730501111, lon: -41.867584444, tipo: 'P', codigoSigef: 'COIN-P-0175', isDivisa: false };
    const v185: Vertex = { id: '0185', ordem: 1, nome: 'COIN-P-0185', codigoCampo: '', norte: 7706500.90, leste: 410000, elevacao: 0, lat: 20.730493055, lon: -41.868190000, tipo: 'P', codigoSigef: 'COIN-P-0185', isDivisa: false };
    const vDummy: Vertex = { id: 'dummy', ordem: 2, nome: 'DUMMY', codigoCampo: '', norte: 7706000.00, leste: 410100, elevacao: 0, lat: 20.735000000, lon: -41.865000000, tipo: 'P', codigoSigef: 'DUMMY', isDivisa: false };
    
    const res = iniciarDoNorteHorario([v175, v185, vDummy]);
    expect(res[0].nome).toBe('COIN-P-0185');
  });
});
