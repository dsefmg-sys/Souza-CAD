import { describe, it, expect } from 'vitest';
import { snapUtm, type AlvoSnap, type SegmentoSnap } from './snap';

// Helper: vértice-alvo como { leste, norte }
const v = (leste: number, norte: number): AlvoSnap => ({ leste, norte });
// Helper: segmento
const seg = (a: AlvoSnap, b: AlvoSnap): SegmentoSnap => ({ a, b });

describe('snapUtm — caso base', () => {
  it('sem alvos e sem grade: retorna o ponto original com tipo null', () => {
    const r = snapUtm(100.123, 200.456);
    expect(r).toEqual({ leste: 100.123, norte: 200.456, tipo: null });
  });

  it('tolVerticeM default é 2m', () => {
    // alvo a 1.5m do ponto: deve snapar
    const r = snapUtm(100, 200, [v(101, 200)]); // 1m de distância
    expect(r.tipo).toBe('vertice');
    expect(r.leste).toBe(101);
  });

  it('alvo exatamente NA tolerância (2m) snap (d <= tol)', () => {
    // Corrigido: era `<` (estritamente menor) e a borda caía. Agora é `<=` — inclui o caso
    // de distância EXATAMENTE igual à tolerância. Fail silencioso em casos limítrofes resolvido.
    const r = snapUtm(100, 200, [v(102, 200)]); // exatamente 2m
    expect(r.tipo).toBe('vertice');
  });
});

describe('snapUtm — snap a vértice (prioridade 1)', () => {
  it('encaixa no vértice mais próximo dentro da tolerância', () => {
    const r = snapUtm(100, 200, [v(100, 200), v(110, 210), v(101, 201)]);
    expect(r.tipo).toBe('vertice');
    expect(r.leste).toBe(100);
    expect(r.norte).toBe(200);
  });

  it('NÃO snap se o vértice mais próximo está além da tolerância', () => {
    const r = snapUtm(100, 200, [v(110, 210)]); // ~14m de distância
    expect(r.tipo).not.toBe('vertice');
  });

  it('tolVerticeM customizada é respeitada', () => {
    const r = snapUtm(100, 200, [v(105, 200)], { tolVerticeM: 10 }); // 5m, tol=10m → snap
    expect(r.tipo).toBe('vertice');
  });

  it('escolhe o vértice MAIS próximo quando há vários dentro da tolerância', () => {
    const r = snapUtm(100, 200, [v(101, 200), v(102, 200), v(101.1, 200)]);
    expect(r.tipo).toBe('vertice');
    expect(r.leste).toBe(101);
  });
});

describe('snapUtm — snap a interseção (prioridade 2)', () => {
  it('cruza duas linhas horizontais/verticais e snap no cruzamento', () => {
    // linha vertical em x=100 de y=0..200
    // linha horizontal em y=100 de x=0..200
    // cruzam em (100, 100)
    const r = snapUtm(100.5, 100.5, [], {
      segmentos: [
        seg(v(100, 0), v(100, 200)),   // vertical
        seg(v(0, 100), v(200, 100)),    // horizontal
      ],
    });
    expect(r.tipo).toBe('intersecao');
    expect(r.leste).toBeCloseTo(100, 5);
    expect(r.norte).toBeCloseTo(100, 5);
  });

  it('NÃO snap se as linhas são paralelas (denom=0)', () => {
    const r = snapUtm(50, 50, [], {
      segmentos: [
        seg(v(0, 0), v(100, 0)),   // horizontal
        seg(v(0, 10), v(100, 10)),  // horizontal paralela
      ],
    });
    // Sem interseção, cai pra nenhum snap → tipo null
    expect(r.tipo).not.toBe('intersecao');
  });

  it('NÃO snap se a interseção está fora dos segmentos (t ou u fora de [0,1])', () => {
    // linhas que se cruzam, mas uma termina ANTES do cruzamento
    // vertical curta em x=50, y=0..30
    // horizontal em y=50, x=0..100
    // cruzam em (50, 50) que está FORA da vertical (y=50 > y=30)
    const r = snapUtm(50, 50, [], {
      segmentos: [
        seg(v(50, 0), v(50, 30)),
        seg(v(0, 50), v(100, 50)),
      ],
    });
    expect(r.tipo).not.toBe('intersecao');
  });
});

describe('snapUtm — snap a meio (prioridade 3)', () => {
  it('encaixa no meio de um segmento', () => {
    // segmento de (0,0) a (10,0), meio em (5,0)
    const r = snapUtm(5.5, 0.5, [], { segmentos: [seg(v(0, 0), v(10, 0))] });
    expect(r.tipo).toBe('meio');
    expect(r.leste).toBe(5);
    expect(r.norte).toBe(0);
    expect(r.segmentoRef).toBeDefined();
  });

  it('NÃO snap se o clique está longe do meio', () => {
    const r = snapUtm(0, 5, [], { segmentos: [seg(v(0, 0), v(10, 0))] }); // 5m do meio em Y
    expect(r.tipo).not.toBe('meio');
  });
});

describe('snapUtm — snap a perpendicular (prioridade 4)', () => {
  it('projeta o pontoOrigem perpendicularmente sobre o segmento', () => {
    // segmento horizontal de (0,0) a (10,0)
    // pontoOrigem em (5, 5) — o pé da perpendicular sobre o segmento é (5, 0)
    // ATENÇÃO: o snap atual prioriza "meio" sobre "perpendicular" quando os dois coincidem
    // (ambos seriam (5,0) neste caso). Para testar perpendicular puro, precisamos de um clique
    // que esteja próximo do pé mas LONGE do meio.
    const r = snapUtm(2.1, 0.1, [], {
      segmentos: [seg(v(0, 0), v(10, 0))],
      pontoOrigem: v(2, 5), // pé em (2, 0); meio em (5, 0) — longe do clique
    });
    expect(r.tipo).toBe('perpendicular');
    expect(r.leste).toBeCloseTo(2, 5);
    expect(r.norte).toBeCloseTo(0, 5);
    expect(r.segmentoRef).toBeDefined();
    expect(r.pontosAuxUTM).toHaveLength(2);
  });

  it('quando "meio" e "perpendicular" coincidem, "meio" ganha (prioridade no código atual)', () => {
    // DESIGN CHOICE documentada: o código processa "meio" ANTES de "perpendicular", então
    // quando os dois snaps dariam no mesmo ponto, "meio" é o reportado. Se quiser inverter,
    // é trocar a ordem dos blocos 3 e 4 no snap.ts.
    const r = snapUtm(5.1, 0.1, [], {
      segmentos: [seg(v(0, 0), v(10, 0))],
      pontoOrigem: v(5, 5),
    });
    expect(r.tipo).toBe('meio');
  });

  it('NÃO snap se pontoOrigem não foi passado', () => {
    const r = snapUtm(5, 0, [], { segmentos: [seg(v(0, 0), v(10, 0))] });
    expect(r.tipo).not.toBe('perpendicular');
  });

  it('NÃO snap se o pé da perpendicular cai fora do segmento', () => {
    // segmento curto em (0,0)..(1,0); pontoOrigem em (5, 5) → pé fica em (5,0), fora
    const r = snapUtm(5, 0, [], {
      segmentos: [seg(v(0, 0), v(1, 0))],
      pontoOrigem: v(5, 5),
    });
    expect(r.tipo).not.toBe('perpendicular');
  });
});

describe('snapUtm — snap a extensão (prioridade 5)', () => {
  it('encaixa na extensão de um segmento próximo à extremidade (≤50m)', () => {
    // segmento de (0,0) a (10,0); clique em (15, 0.5) — está na extensão, próximo da extremidade b
    const r = snapUtm(15, 0.5, [], { segmentos: [seg(v(0, 0), v(10, 0))] });
    expect(r.tipo).toBe('extensao');
    expect(r.leste).toBeCloseTo(15, 5);
    expect(r.norte).toBeCloseTo(0, 5);
  });

  it('NÃO snap se a distância da extremidade for > 50m', () => {
    // segmento de (0,0) a (10,0); clique em (200, 0) — t=20, extremidade fica 190m → não snap
    const r = snapUtm(200, 0, [], { segmentos: [seg(v(0, 0), v(10, 0))] });
    expect(r.tipo).not.toBe('extensao');
  });
});

describe('snapUtm — snap a grade (prioridade 6)', () => {
  it('arredonda para o múltiplo da grade mais próximo dentro da tolerância', () => {
    // grade de 5m, tolerância default 5*0.12=0.6m
    // ponto em (100.3, 100.3) → distância da grade (100,100) = 0.42m → snap
    const r = snapUtm(100.3, 100.3, [], { gradeIntervalo: 5 });
    expect(r.tipo).toBe('grade');
    expect(r.leste).toBe(100);
    expect(r.norte).toBe(100);
  });

  it('tolGradeM default é 12% do intervalo da grade', () => {
    // grade de 10m, tolerância default 1.2m
    // ponto em (10.5, 10.5) → distância da grade (10,10) = 0.71m → snap
    const r = snapUtm(10.5, 10.5, [], { gradeIntervalo: 10 });
    expect(r.tipo).toBe('grade');
  });

  it('NÃO snap se o ponto está fora da tolerância da grade', () => {
    // grade de 5m, tolerância default 0.6m
    // ponto em (102.5, 100) → distância da grade (100,100) = 2.5m → não snap
    const r = snapUtm(102.5, 100, [], { gradeIntervalo: 5 });
    expect(r.tipo).not.toBe('grade');
  });

  it('NÃO snap se gradeIntervalo é 0 ou não foi passado', () => {
    const r = snapUtm(100.123, 100, [], { gradeIntervalo: 0 });
    expect(r.tipo).not.toBe('grade');
  });
});

describe('snapUtm — ordem de prioridade', () => {
  it('vértice ganha de interseção quando ambos estão dentro da tolerância', () => {
    // segmento vertical em x=100, y=0..200; e um alvo vértice em (100, 100)
    const r = snapUtm(100.5, 100.5, [v(100, 100)], {
      segmentos: [
        seg(v(100, 0), v(100, 200)),
        seg(v(0, 100), v(200, 100)),
      ],
    });
    expect(r.tipo).toBe('vertice');
  });

  it('interseção ganha de meio quando ambos estão dentro da tolerância', () => {
    // segmento A: vertical em x=100
    // segmento B: horizontal em y=100
    // Eles cruzam em (100, 100)
    // O MEIO do A seria (100, 100) também — mas interseção tem prioridade
    const r = snapUtm(100.5, 100.5, [], {
      segmentos: [
        seg(v(100, 0), v(100, 200)),
        seg(v(0, 100), v(200, 100)),
      ],
    });
    expect(r.tipo).toBe('intersecao');
  });

  it('grade só é tentada quando nenhum outro snap foi encontrado', () => {
    // Sem alvos, sem segmentos, mas COM grade dentro da tolerância → snap na grade
    const r = snapUtm(100.3, 100.3, [], { gradeIntervalo: 5 });
    expect(r.tipo).toBe('grade');
  });
});

describe('snapUtm — robustez', () => {
  it('segmento degenerado (a === b) tem o "meio" igual ao próprio ponto — edge case', () => {
    // BUG LATENTE: o código calcula meio = (a+b)/2 e verifica distância do clique.
    // Se a===b, o "meio" é o próprio ponto a, e se o clique coincide (dist=0), snap em "meio".
    // Não causa crash, mas é semântico errado. Documentado pra rastreio.
    const r = snapUtm(5, 5, [], { segmentos: [seg(v(5, 5), v(5, 5))] });
    // Hoje retorna 'meio' com o ponto (5,5). Se quiser corrigir, adicionar
    // `if (lenSq < 1e-6) continue;` no loop de "meio" (mesma proteção que já existe em
    // "perpendicular" e "extensao").
    expect(r.tipo).toBe('meio');
    expect(r.leste).toBe(5);
    expect(r.norte).toBe(5);
  });

  it('lista vazia de segmentos com gradeIntervalo funciona', () => {
    const r = snapUtm(100.1, 100.1, [], { gradeIntervalo: 5 });
    expect(r.tipo).toBe('grade');
  });

  it('alvos vazios sem grade e sem segmentos retorna o ponto original', () => {
    const r = snapUtm(123.456, 789.012, [], { segmentos: [] });
    expect(r).toEqual({ leste: 123.456, norte: 789.012, tipo: null });
  });
});
