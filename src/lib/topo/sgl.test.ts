import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseTxt, pontosDePerimetro } from './parseTxt';
import { montarVertices } from './vertices';
import { calcular } from './calcular';
import { detectarZona, grausParaDMS } from './coords';
import { azimuteDMS, numBR } from './geometry';

const TXT = readFileSync(resolve(__dirname, '__fixtures__/ventania.txt'), 'latin1');

const tecnico = { credenciamentoIncra: 'COIN', contadorMarco: 17, contadorPonto: 55 };

function montar() {
  const pontos = parseTxt(TXT);
  const perim = pontosDePerimetro(pontos);
  const zona = detectarZona(perim[0].leste, perim[0].norte, 'S');
  const vertices = montarVertices(perim, zona, 'S', tecnico);
  return { pontos, perim, zona, vertices };
}

describe('parseTxt', () => {
  it('separa base e single do perímetro', () => {
    const pontos = parseTxt(TXT);
    expect(pontos.length).toBe(15);
    const perim = pontosDePerimetro(pontos);
    expect(perim.length).toBe(11); // 11 vértices reais da Fazenda Ventania
    expect(perim.some((p) => /^B_/.test(p.nome))).toBe(false);
    expect(perim.some((p) => /^PPP/.test(p.nome))).toBe(false);
    expect(perim.some((p) => p.status === 'SINGLE')).toBe(false);
  });
});

describe('coords / zona', () => {
  it('detecta UTM 23S', () => {
    const { zona } = montar();
    expect(zona).toBe(23);
  });
});

describe('área SGL e perímetro', () => {
  it('bate com o modelo da Fazenda Ventania (3,6443 ha / 809,84 m)', () => {
    const { vertices } = montar();
    const r = calcular(vertices);
    // tolerância de poucos m² / cm — diferença é só arredondamento do modelo
    expect(Math.abs(r.areaHa - 3.6443)).toBeLessThan(0.001);
    expect(Math.abs(r.perimetro - 809.84)).toBeLessThan(0.1);
  });
});

describe('coordenadas geográficas DMS', () => {
  it('o ponto de divisa José Claudio x Lobato vira COIN-M-0020 com Lon/Lat do modelo', () => {
    const { vertices } = montar();
    const v = vertices.find((x) => /JOSE CLAUDIO X LOBATO/i.test(x.codigoCampo))!;
    expect(v.tipo).toBe('M');
    expect(grausParaDMS(v.lon, { estilo: 'memorial' })).toBe("-42°00'12,399\"");
    expect(grausParaDMS(v.lat, { estilo: 'memorial' })).toBe("-20°35'30,504\"");
  });
});

describe('azimutes e distâncias (conferem com o memorial)', () => {
  it('algum lado tem ~58,57 m e azimute equivalente a 154°38' , () => {
    const { vertices } = montar();
    const r = calcular(vertices);
    // existe o lado de 58,5x m
    const lado = r.lados.find((l) => Math.abs(l.distancia - 58.57) < 0.1)!;
    expect(lado).toBeDefined();
    // o azimute (ou seu reverso) bate com 154°38'
    const az = lado.azimute;
    const rev = (az + 180) % 360;
    const ok = azimuteDMS(az) === "154°38'" || azimuteDMS(rev) === "154°38'";
    expect(ok).toBe(true);
    expect(numBR(lado.distancia)).toMatch(/^58,5/);
  });
});
