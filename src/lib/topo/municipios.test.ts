import { describe, it, expect } from 'vitest';
import { ancoraMunicipio, detectarFusoPorRegiao } from './municipios';
import { geoParaUtm } from './coords';

const FUSOS_BRASIL = [18, 19, 20, 21, 22, 23, 24, 25];

describe('cobertura nacional das âncoras (capitais dos estados)', () => {
  it('reconhece capitais de estados fora da região de trabalho original (MG/ES)', () => {
    expect(ancoraMunicipio('São Paulo-SP')).toBeTruthy();
    expect(ancoraMunicipio('Salvador-BA')).toBeTruthy();
    expect(ancoraMunicipio('Rio Branco-AC')).toBeTruthy();
    expect(ancoraMunicipio('Brasília-DF')).toBeTruthy();
  });

  it('detecta o fuso certo perto de São Paulo-SP (zona 23), longe de MG/ES', () => {
    const { leste, norte } = geoParaUtm(-23.4, -46.5, 23, 'S');
    expect(detectarFusoPorRegiao(leste, norte, 'S', FUSOS_BRASIL).zona).toBe(23);
  });

  it('detecta o fuso certo perto de Salvador-BA (zona 24)', () => {
    const { leste, norte } = geoParaUtm(-12.9, -38.4, 24, 'S');
    expect(detectarFusoPorRegiao(leste, norte, 'S', FUSOS_BRASIL).zona).toBe(24);
  });

  it('detecta o fuso certo perto de Rio Branco-AC (zona 19), bem a oeste', () => {
    const { leste, norte } = geoParaUtm(-9.9, -67.7, 19, 'S');
    expect(detectarFusoPorRegiao(leste, norte, 'S', FUSOS_BRASIL).zona).toBe(19);
  });
});
