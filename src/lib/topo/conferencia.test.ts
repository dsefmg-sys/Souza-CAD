import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseTxt, pontosDePerimetro } from './parseTxt';
import { montarVertices } from './vertices';
import { calcular } from './calcular';
import { detectarZona } from './coords';
import { segmentosCruzam, temAutoIntersecao, conferir, valoresEfetivos } from './conferencia';
import type { ImovelData, Vertex } from './types';

const TXT = readFileSync(resolve(__dirname, '__fixtures__/ventania.txt'), 'latin1');
const tec = { credenciamentoIncra: 'COIN', contadorMarco: 17, contadorPonto: 55 };

function montar() {
  const perim = pontosDePerimetro(parseTxt(TXT));
  const zona = detectarZona(perim[0].leste, perim[0].norte, 'S');
  return montarVertices(perim, zona, 'S', tec);
}

const imovelBase: ImovelData = {
  denominacao: 'X', matricula: '1', cns: '', codigoImovelIncra: '', proprietario: '',
  cpfProprietario: '', tipoPessoa: 'Física', municipio: '', local: '',
  naturezaServico: 'Particular', situacao: 'Imóvel Registrado', naturezaArea: 'Particular',
};

describe('geometria de conferência', () => {
  it('detecta cruzamento de segmentos', () => {
    expect(segmentosCruzam({ x: 0, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }, { x: 2, y: 0 })).toBe(true);
    expect(segmentosCruzam({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 })).toBe(false);
  });
  it('polígono real da Ventania não se auto-intercepta', () => {
    expect(temAutoIntersecao(montar())).toBe(false);
  });
  it('um "laço" (bowtie) é detectado como auto-interseção', () => {
    const mk = (leste: number, norte: number): Vertex => ({
      id: String(Math.random()), ordem: 0, nome: '', codigoCampo: '', norte, leste,
      elevacao: 0, lat: 0, lon: 0, tipo: 'P', codigoSigef: '', isDivisa: false,
    });
    // quadrado com dois vértices trocados -> gravata-borboleta
    const bowtie = [mk(0, 0), mk(10, 10), mk(10, 0), mk(0, 10)];
    expect(temAutoIntersecao(bowtie)).toBe(true);
  });
});

describe('conferir', () => {
  it('a Ventania passa sem erros', () => {
    const vs = montar();
    const res = calcular(vs);
    const probs = conferir(vs, res, imovelBase);
    expect(probs.some((p) => p.nivel === 'erro')).toBe(false);
  });
  it('mostra a diferença para o SIGEF quando informada', () => {
    const vs = montar();
    const res = calcular(vs);
    const probs = conferir(vs, res, { ...imovelBase, areaSigefHa: 3.6443 });
    expect(probs.some((p) => /Diferença para o SIGEF/.test(p.msg))).toBe(true);
  });

  it('avisa dados do imóvel faltando e confrontante incompleto', () => {
    const vs = montar();
    const res = calcular(vs);
    const semProp = { ...imovelBase, proprietario: '', municipio: '' };
    const conf = [{ id: 'c1', nome: 'Fulano', cpf: '', matricula: '', cns: '' }];
    const probs = conferir(vs, res, semProp, conf);
    expect(probs.some((p) => /Faltam dados do imóvel/.test(p.msg))).toBe(true);
    expect(probs.some((p) => /Fulano: falta/.test(p.msg))).toBe(true);
  });
});

describe('valoresEfetivos', () => {
  it('usa os valores do SIGEF quando marcado', () => {
    const vs = montar();
    const res = calcular(vs);
    const ef = valoresEfetivos(res, { ...imovelBase, areaSigefHa: 3.6443, perimetroSigef: 809.84, usarValoresSigef: true });
    expect(ef.fonte).toBe('SIGEF');
    expect(ef.areaHa).toBe(3.6443);
    expect(ef.perimetro).toBe(809.84);
  });
  it('usa os calculados quando não marcado', () => {
    const vs = montar();
    const res = calcular(vs);
    const ef = valoresEfetivos(res, { ...imovelBase, areaSigefHa: 3.6443, usarValoresSigef: false });
    expect(ef.fonte).toBe('calculado');
  });

  it('fonte = misto quando só a área vem do SIGEF (perímetro calculado)', () => {
    const vs = montar();
    const res = calcular(vs);
    const ef = valoresEfetivos(res, { ...imovelBase, areaSigefHa: 3.6443, usarValoresSigef: true });
    expect(ef.fonte).toBe('misto');
    expect(ef.fonteArea).toBe('SIGEF');
    expect(ef.fontePerimetro).toBe('calculado');
    expect(ef.areaHa).toBe(3.6443);
    expect(ef.perimetro).toBeCloseTo(res.perimetro, 5); // perímetro continua o calculado
  });
});

describe('geradores recusam vértice sem código', () => {
  it('conferir trata vértice sem código como erro', () => {
    const vs = montar().map((v, i) => (i === 0 ? { ...v, codigoSigef: '' } : v));
    const res = calcular(vs);
    const probs = conferir(vs, res, imovelBase);
    expect(probs.some((p) => p.nivel === 'erro' && /sem código/.test(p.msg))).toBe(true);
  });
});

describe('validação de precisão de sigmas', () => {
  it('detecta sigma horizontal alto para limite artificial', () => {
    const vs = montar().map((v, i) => (i === 0 ? { ...v, sigmaX: 0.15, sigmaY: 0.05, tipoLimite: 'LA1' } : v));
    const res = calcular(vs);
    const probs = conferir(vs, res, imovelBase);
    expect(probs.some((p) => p.campo === 'precisão' && /limite Artificial/.test(p.msg))).toBe(true);
  });

  it('não alerta se sigma horizontal estiver no limite para limite natural', () => {
    const vs = montar().map((v, i) => (i === 0 ? { ...v, sigmaX: 1.5, sigmaY: 1.2, tipoLimite: 'LN1' } : v));
    const res = calcular(vs);
    const probs = conferir(vs, res, imovelBase);
    expect(probs.some((p) => p.campo === 'precisão')).toBe(false);
  });

  it('detecta sigma vertical alto para limite artificial', () => {
    const vs = montar().map((v, i) => (i === 0 ? { ...v, sigmaZ: 0.45, tipoLimite: 'LA2' } : v));
    const res = calcular(vs);
    const probs = conferir(vs, res, imovelBase);
    expect(probs.some((p) => p.campo === 'precisão Z' && /precisão vertical/.test(p.msg))).toBe(true);
  });
});
