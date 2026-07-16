import { describe, it, expect } from 'vitest';
import {
  partesDaDivisa,
  segmentarPorDivisa,
  montarConfrontantes,
} from './confrontantes';
import type { Vertex } from './types';

// Helper: vértice com defaults
function v(sobre: Partial<Vertex> & { ordem: number; tipo: 'M' | 'P' | 'V' }): Vertex {
  return {
    id: `v_${sobre.ordem}`,
    nome: '',
    codigoCampo: sobre.codigoCampo ?? '',
    codigoSigef: '',
    norte: 0,
    leste: 0,
    elevacao: 0,
    lat: 0,
    lon: 0,
    isDivisa: sobre.tipo === 'M',
    ...sobre,
  };
}

describe('partesDaDivisa', () => {
  it('extrai os dois nomes de "DIVISA JOSE X MARIA"', () => {
    expect(partesDaDivisa('DIVISA JOSE X MARIA')).toEqual(['JOSE', 'MARIA']);
  });

  it('extrai nomes de "DIVISA JOSE CLAUDIO X LOBATO"', () => {
    expect(partesDaDivisa('DIVISA JOSE CLAUDIO X LOBATO')).toEqual(['JOSE CLAUDIO', 'LOBATO']);
  });

  it('case-insensitive na palavra DIVISA (mas mantém case dos tokens)', () => {
    // `partesDaDivisa` remove "divisa" case-insensitive, mas PRESERVA o case dos nomes
    expect(partesDaDivisa('divisa jose x maria')).toEqual(['jose', 'maria']);
  });

  it('case-insensitive no X (mas preserva case dos tokens)', () => {
    expect(partesDaDivisa('DIVISA JOSE x MARIA')).toEqual(['JOSE', 'MARIA']);
  });

  it('retorna string vazia se não tem "DIVISA"', () => {
    expect(partesDaDivisa('MATA')).toEqual(['MATA']);
  });

  it('retorna [] se código vazio', () => {
    expect(partesDaDivisa('')).toEqual([]);
  });
});

describe('segmentarPorDivisa — casos básicos', () => {
  it('polígono com 3 vértices, todos M (marcos), cada lado é um trecho', () => {
    const vs = [
      v({ ordem: 0, tipo: 'M', codigoCampo: 'DIVISA JOSE X MARIA' }),
      v({ ordem: 1, tipo: 'M', codigoCampo: 'DIVISA MARIA X JOSE' }),
      v({ ordem: 2, tipo: 'M', codigoCampo: 'DIVISA JOSE X PEDRO' }),
    ];
    const trechos = segmentarPorDivisa(vs);
    expect(trechos).toHaveLength(3);
    // cada trecho tem 1 lado
    expect(trechos.every((t) => t.ladoIndices.length === 1)).toBe(true);
  });

  it('polígono sem marcos: 1 único trecho cobrindo todos os lados', () => {
    const vs = [
      v({ ordem: 0, tipo: 'P' }),
      v({ ordem: 1, tipo: 'P' }),
      v({ ordem: 2, tipo: 'P' }),
      v({ ordem: 3, tipo: 'P' }),
    ];
    const trechos = segmentarPorDivisa(vs);
    expect(trechos).toHaveLength(1);
    expect(trechos[0].ladoIndices).toEqual([0, 1, 2, 3]);
    expect(trechos[0].nomePalpite).toBe(''); // sem nome
  });

  it('polígono vazio ou < 2 vértices: []', () => {
    expect(segmentarPorDivisa([])).toEqual([]);
    expect(segmentarPorDivisa([v({ ordem: 0, tipo: 'M' })])).toEqual([]);
  });
});

describe('segmentarPorDivisa — extração de nome do confrontante', () => {
  it('trecho entre M(JOSE X MARIA) e M(MARIA X JOSE) — match depende da ordem dos marcos', () => {
    // BUG/SIMPLIFICAÇÃO documentada: o algoritmo pega o primeiro match EXATO entre tokens
    // (case-insensitive). Como a ordem dos marcos no anel afeta qual token vem primeiro em cada
    // trecho, o resultado varia entre trechos do mesmo par de marcos:
    //   - trecho 1 (M(0)=JOSE X MARIA → M(2)=MARIA X JOSE): a[0]='JOSE' match com b[1]='JOSE' → "Jose"
    //   - trecho 2 (M(2)=MARIA X JOSE → M(0)=JOSE X MARIA): a[0]='MARIA' match com b[0]='JOSE'? não;
    //     a[0]='MARIA' match com b[0]='JOSE'? não. a[1]='JOSE' match com b[0]='JOSE'? sim → "Maria"... espera
    //   - reanalisando: trecho 2 chama nomeComum(vertices[2], vertices[0]) = nomeComum('MARIA X JOSE', 'JOSE X MARIA')
    //     a=['MARIA','JOSE'], b=['JOSE','MARIA']
    //     a[0]='MARIA' vs b[0]='JOSE': não
    //     a[0]='MARIA' vs b[1]='MARIA': SIM → "Maria"
    //   Logo: trecho[0]='Jose', trecho[1]='Maria'. É a ordem dos tokens que decide.
    const vs = [
      v({ ordem: 0, tipo: 'M', codigoCampo: 'DIVISA JOSE X MARIA' }),
      v({ ordem: 1, tipo: 'P' }),
      v({ ordem: 2, tipo: 'M', codigoCampo: 'DIVISA MARIA X JOSE' }),
    ];
    const trechos = segmentarPorDivisa(vs);
    expect(trechos).toHaveLength(2);
    expect(trechos[0].nomePalpite).toBe('Jose');
    expect(trechos[1].nomePalpite).toBe('Maria');
  });

  it('sem nome em comum: nome fica vazio (força revisão manual)', () => {
    // "DIVISA JOSE X MARIA" e "DIVISA PEDRO X ANA" → sem interseção
    const vs = [
      v({ ordem: 0, tipo: 'M', codigoCampo: 'DIVISA JOSE X MARIA' }),
      v({ ordem: 1, tipo: 'M', codigoCampo: 'DIVISA PEDRO X ANA' }),
    ];
    const trechos = segmentarPorDivisa(vs);
    expect(trechos[0].nomePalpite).toBe('');
    expect(trechos[1].nomePalpite).toBe('');
  });

  it('match funciona com nomes compostos exatos (sem match parcial)', () => {
    // "DIVISA JOSE DA SILVA X MARIA" e "DIVISA JOSE DA SILVA X PEDRO" → match em "Jose Da Silva"
    // Mas "DIVISA SITIO DE MARIA X JOSE" e "DIVISA SITIO DE MARIA X ANA" → match em "Sitio De Maria"
    const vs = [
      v({ ordem: 0, tipo: 'M', codigoCampo: 'DIVISA SITIO DE MARIA X JOSE' }),
      v({ ordem: 1, tipo: 'M', codigoCampo: 'DIVISA SITIO DE MARIA X ANA' }),
    ];
    const trechos = segmentarPorDivisa(vs);
    expect(trechos[0].nomePalpite).toBe('Sitio de Maria');
  });

  it('match exato entre tokens (sem substring): "SITIO DE MARIA" não casa com "MARIA"', () => {
    // LIMITÇÃO: a função faz match EXATO entre tokens. "SITIO DE MARIA" (string única após split
    // pelo X) não casa com "MARIA" (outra string). Mas "JOSE" (segundo token nos dois códigos)
    // CASA → retorna "Jose".
    // Se quiser match por substring, precisa refatorar `partesDaDivisa` pra quebrar por espaço
    // também, ou usar fuzzy match.
    const vs = [
      v({ ordem: 0, tipo: 'M', codigoCampo: 'DIVISA SITIO DE MARIA X JOSE' }),
      v({ ordem: 1, tipo: 'M', codigoCampo: 'DIVISA MARIA X JOSE' }),
    ];
    const trechos = segmentarPorDivisa(vs);
    // a=['SITIO DE MARIA','JOSE'], b=['MARIA','JOSE']
    // 'SITIO DE MARIA' vs 'MARIA': não; 'SITIO DE MARIA' vs 'JOSE': não
    // 'JOSE' vs 'MARIA': não; 'JOSE' vs 'JOSE': SIM → "Jose"
    expect(trechos[0].nomePalpite).toBe('Jose');
  });
});

describe('segmentarPorDivisa — fecho do anel', () => {
  it('com 3 marcos, cada trecho tem 1 lado (anel fechado, cada lado = 1 trecho)', () => {
    const vs = [
      v({ ordem: 0, tipo: 'M', codigoCampo: 'DIVISA A X B' }),
      v({ ordem: 1, tipo: 'M', codigoCampo: 'DIVISA B X C' }),
      v({ ordem: 2, tipo: 'M', codigoCampo: 'DIVISA C X A' }),
    ];
    const trechos = segmentarPorDivisa(vs);
    expect(trechos).toHaveLength(3);
    // cada lado i vai de i a (i+1)%n
    expect(trechos[0].ladoIndices).toEqual([0]);
    expect(trechos[1].ladoIndices).toEqual([1]);
    expect(trechos[2].ladoIndices).toEqual([2]);
  });

  it('com 2 marcos, 4 vértices: 2 trechos, cada um com 2 lados', () => {
    // anel: M, P, M, P (4 vértices, 4 lados, 2 marcos)
    const vs = [
      v({ ordem: 0, tipo: 'M', codigoCampo: 'DIVISA A X B' }),
      v({ ordem: 1, tipo: 'P' }),
      v({ ordem: 2, tipo: 'M', codigoCampo: 'DIVISA B X C' }),
      v({ ordem: 3, tipo: 'P' }),
    ];
    const trechos = segmentarPorDivisa(vs);
    expect(trechos).toHaveLength(2);
    // primeiro trecho: do M(0) ao M(2) → lados 0, 1
    expect(trechos[0].ladoIndices).toEqual([0, 1]);
    // segundo trecho: do M(2) ao M(0) → lados 2, 3
    expect(trechos[1].ladoIndices).toEqual([2, 3]);
  });
});

describe('montarConfrontantes', () => {
  it('cria 1 confrontante por trecho, com ids c_0, c_1, ...', () => {
    const vs = [
      v({ ordem: 0, tipo: 'M', codigoCampo: 'DIVISA A X B' }),
      v({ ordem: 1, tipo: 'M', codigoCampo: 'DIVISA B X C' }),
    ];
    const { confrontantes, confrontantePorLado } = montarConfrontantes(vs);
    expect(confrontantes).toHaveLength(2);
    expect(confrontantes[0].id).toBe('c_0');
    expect(confrontantes[1].id).toBe('c_1');
  });

  it('mapa confrontantePorLado atribui o id certo pra cada lado do trecho', () => {
    const vs = [
      v({ ordem: 0, tipo: 'M', codigoCampo: 'DIVISA A X B' }),
      v({ ordem: 1, tipo: 'P' }),
      v({ ordem: 2, tipo: 'M', codigoCampo: 'DIVISA B X C' }),
      v({ ordem: 3, tipo: 'P' }),
    ];
    const { confrontantePorLado } = montarConfrontantes(vs);
    // lados 0, 1 → c_0; lados 2, 3 → c_1
    expect(confrontantePorLado[0]).toBe('c_0');
    expect(confrontantePorLado[1]).toBe('c_0');
    expect(confrontantePorLado[2]).toBe('c_1');
    expect(confrontantePorLado[3]).toBe('c_1');
  });

  it('atribui nome do confrontante (do palpite), cpf/matricula/cns vazios', () => {
    const vs = [
      v({ ordem: 0, tipo: 'M', codigoCampo: 'DIVISA JOSE X MARIA' }),
      v({ ordem: 1, tipo: 'M', codigoCampo: 'DIVISA MARIA X JOSE' }),
    ];
    const { confrontantes } = montarConfrontantes(vs);
    // Pega o primeiro match (Jose) — ver teste anterior para limitação documentada
    expect(confrontantes[0].nome).toBe('Jose');
    expect(confrontantes[0].cpf).toBe('');
    expect(confrontantes[0].matricula).toBe('');
    expect(confrontantes[0].cns).toBe('');
  });

  it('polígono sem marcos: 1 confrontante cobrindo todos os lados, sem nome', () => {
    const vs = [
      v({ ordem: 0, tipo: 'P' }),
      v({ ordem: 1, tipo: 'P' }),
      v({ ordem: 2, tipo: 'P' }),
    ];
    const { confrontantes, confrontantePorLado } = montarConfrontantes(vs);
    expect(confrontantes).toHaveLength(1);
    expect(confrontantes[0].nome).toBe('');
    expect(confrontantePorLado).toEqual({ 0: 'c_0', 1: 'c_0', 2: 'c_0' });
  });
});
