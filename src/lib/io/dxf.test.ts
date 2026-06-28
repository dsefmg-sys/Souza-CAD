import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseTxt, pontosDePerimetro } from '../topo/parseTxt';
import { montarVertices } from '../topo/vertices';
import { detectarZona } from '../topo/coords';
import { exportarDxf, importarDxf, anelDeDxf, type VerticeDxf } from './dxf';

const TXT = readFileSync(resolve(__dirname, '../topo/__fixtures__/ventania.txt'), 'latin1');
const tec = { credenciamentoIncra: 'COIN', contadorMarco: 17, contadorPonto: 55 };

function verts(): VerticeDxf[] {
  const perim = pontosDePerimetro(parseTxt(TXT));
  const zona = detectarZona(perim[0].leste, perim[0].norte, 'S');
  return montarVertices(perim, zona, 'S', tec).map((v) => ({ leste: v.leste, norte: v.norte, codigoSigef: v.codigoSigef, tipo: v.tipo }));
}

describe('DXF georreferenciado', () => {
  it('exporta com SRC anotado e coordenadas UTM em metros', () => {
    const dxf = exportarDxf(verts(), { zona: 23, hemisferio: 'S', titulo: 'Ventania' });
    expect(dxf).toContain('LWPOLYLINE');
    expect(dxf).toContain('SIRGAS2000 / UTM 23S');
    expect(dxf).toContain('$INSUNITS');
    // coordenada UTM real aparece
    expect(dxf).toContain('812375'); // leste do ponto 1, com casas decimais
  });

  it('ida e volta preserva a poligonal (mesmas coordenadas UTM)', () => {
    const vs = verts();
    const dxf = exportarDxf(vs, { zona: 23, hemisferio: 'S' });
    const ent = importarDxf(dxf);
    const anel = anelDeDxf(ent)!;
    expect(anel).toHaveLength(vs.length);
    for (let i = 0; i < vs.length; i++) {
      expect(anel[i].x).toBeCloseTo(vs[i].leste, 2);
      expect(anel[i].y).toBeCloseTo(vs[i].norte, 2);
    }
  });

  it('importa pontos e textos também', () => {
    const dxf = exportarDxf(verts(), { zona: 23, hemisferio: 'S' });
    const ent = importarDxf(dxf);
    expect(ent.pontos.length).toBeGreaterThan(0);
    expect(ent.textos.some((t) => /COIN-/.test(t.texto))).toBe(true);
  });
});
