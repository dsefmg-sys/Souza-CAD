import { describe, it, expect } from 'vitest';
import { analisarSobreposicoes, areaPoligonoEN, areaSobreposicaoEstimada, pontoNoPoligono } from './confrontacaoCheck';
import type { Vertex } from './types';

function v(leste: number, norte: number): Vertex {
  return { leste, norte } as unknown as Vertex;
}

describe('areaPoligonoEN', () => {
  it('calcula a área de um quadrado 100x100 = 10.000 m²', () => {
    const quad = [{ leste: 0, norte: 0 }, { leste: 100, norte: 0 }, { leste: 100, norte: 100 }, { leste: 0, norte: 100 }];
    expect(areaPoligonoEN(quad)).toBeCloseTo(10000, 0);
  });
});

describe('areaSobreposicaoEstimada', () => {
  it('dois quadrados que não se tocam: sobreposição zero', () => {
    const a = [{ leste: 0, norte: 0 }, { leste: 100, norte: 0 }, { leste: 100, norte: 100 }, { leste: 0, norte: 100 }];
    const b = [{ leste: 500, norte: 500 }, { leste: 600, norte: 500 }, { leste: 600, norte: 600 }, { leste: 500, norte: 600 }];
    expect(areaSobreposicaoEstimada(a, b)).toBe(0);
  });

  it('dois quadrados 100x100 deslocados por 50m: sobreposição conhecida de 2.500 m² (25%)', () => {
    // A: (0,0)-(100,100). B: (50,50)-(150,150). Interseção exata: (50,50)-(100,100) = 50x50 = 2500 m².
    const a = [{ leste: 0, norte: 0 }, { leste: 100, norte: 0 }, { leste: 100, norte: 100 }, { leste: 0, norte: 100 }];
    const b = [{ leste: 50, norte: 50 }, { leste: 150, norte: 50 }, { leste: 150, norte: 150 }, { leste: 50, norte: 150 }];
    const overlap = areaSobreposicaoEstimada(a, b);
    // Estimativa por amostragem em grade — tolerância de 3% em torno do valor exato.
    expect(overlap).toBeGreaterThan(2500 * 0.97);
    expect(overlap).toBeLessThan(2500 * 1.03);
  });
});

describe('analisarSobreposicoes', () => {
  it('imóveis bem separados: OK, sem sobreposição', () => {
    const meus: Vertex[] = [v(0, 0), v(100, 0), v(100, 100), v(0, 100)];
    const res = analisarSobreposicoes(meus, [{ nome: 'Vizinho Longe', pts: [{ leste: 1000, norte: 1000 }, { leste: 1100, norte: 1000 }, { leste: 1100, norte: 1100 }, { leste: 1000, norte: 1100 }] }]);
    expect(res).toHaveLength(1);
    expect(res[0].tipo).toBe('OK');
    expect(res[0].temSobreposicao).toBe(false);
  });

  // Reproduz o bug relatado: dois polígonos quase idênticos (a mesma terra, medida duas vezes com
  // pequenas diferenças de precisão) — quase toda a ÁREA se sobrepõe, mas cada vértice individual
  // fica bem em cima da borda do outro (às vezes um pouco dentro, às vezes um pouco fora), então a
  // contagem antiga de "vértices dentro do outro polígono" sub-contava pra quase zero. O relatório
  // tem que continuar detectando isso como PERIGO, com a área real sobreposta no detalhe.
  it('dois polígonos quase idênticos (mesma terra medida 2x): detecta PERIGO com área alta, mesmo com poucos vértices tecnicamente "dentro"', () => {
    // Hexágono ~1 ha perto de Espera Feliz (coordenadas fictícias, plano local em metros)
    const original = [
      { leste: 800000, norte: 7700000 },
      { leste: 800060, norte: 7700010 },
      { leste: 800090, norte: 7700060 },
      { leste: 800070, norte: 7700110 },
      { leste: 800010, norte: 7700100 },
      { leste: 799990, norte: 7700050 },
    ];
    // Mesmo hexágono, cada vértice deslocado por uma diferença de medição pequena (30 a 70 cm),
    // metade "pra dentro", metade "pra fora" — exatamente o padrão de duas medições reais do mesmo
    // perímetro, que é o que faz cada vértice ficar perto demais da borda do outro polígono pra um
    // teste ponto-a-ponto classificar com confiança.
    const remedido = [
      { leste: 800000.4, norte: 7700000.3 },
      { leste: 800059.6, norte: 7700010.5 },
      { leste: 800090.5, norte: 7700059.6 },
      { leste: 800069.5, norte: 7700110.4 },
      { leste: 800010.5, norte: 7700099.6 },
      { leste: 799989.6, norte: 7700050.4 },
    ];
    const meus: Vertex[] = original.map((p) => v(p.leste, p.norte));
    const res = analisarSobreposicoes(meus, [{ nome: 'Parcela Certificada (remedição)', pts: remedido }]);

    expect(res).toHaveLength(1);
    expect(res[0].tipo).toBe('PERIGO');
    expect(res[0].temSobreposicao).toBe(true);
    // A área sobreposta tem que refletir que é QUASE TUDO, não só 1 ou 2 vértices perdidos.
    expect(res[0].percentualDoMeuImovel).toBeGreaterThan(90);

    // Confirma o próprio bug relatado: a contagem ANTIGA de vértices "dentro" do outro polígono é
    // baixa mesmo com a área quase toda sobreposta — é exatamente por isso que a versão anterior,
    // que decidia só por essa contagem, sub-relatava o problema.
    const ptsDentro = meus.filter((pt) => pontoNoPoligono(pt, remedido)).length;
    expect(ptsDentro).toBeLessThan(4); // sub-contagem clássica: poucos vértices "tecnicamente dentro"
  });

  it('linha do vizinho cruza a minha divisa: detecta PERIGO mesmo se a área de sobreposição for pequena', () => {
    const meus: Vertex[] = [v(0, 0), v(100, 0), v(100, 100), v(0, 100)];
    // Um retângulo estreito que atravessa a borda direita do meu imóvel (leste=100) de fora a dentro.
    const vizinho = [{ leste: 90, norte: 40 }, { leste: 110, norte: 40 }, { leste: 110, norte: 60 }, { leste: 90, norte: 60 }];
    const res = analisarSobreposicoes(meus, [{ nome: 'Faixa Estreita', pts: vizinho }]);
    expect(res[0].tipo).toBe('PERIGO');
    expect(res[0].detalhe).toMatch(/cruzam/);
  });
});
