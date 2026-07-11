import { describe, it, expect } from 'vitest';
import { ancoraMunicipio, detectarFusoPorRegiao, ufDoMunicipio, formatarNome } from './municipios';
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

describe('formatação e divisão de nomes de municípios', () => {
  it('separa e formata nome Cidade-UF corretamente, preservando partículas em minúsculo', () => {
    expect(formatarNome('são paulo-sp')).toBe('São Paulo-SP');
    expect(formatarNome('são sebastião do paraíso-mg')).toBe('São Sebastião do Paraíso-MG');
    expect(formatarNome('santa rita de caldas-mg')).toBe('Santa Rita de Caldas-MG');
    expect(formatarNome('alto caparaó-mg')).toBe('Alto Caparaó-MG');
    
    // Testing hyphenated city names containing particles
    expect(formatarNome('são-josé-do-rio-preto-sp')).toBe('São-José-do-Rio-Preto-SP');
    expect(formatarNome('estrela-do-indaiá-mg')).toBe('Estrela-do-Indaiá-MG');

    // Extracting UF using lastIndexOf-based logic
    expect(ufDoMunicipio('São Paulo-SP')).toBe('SP');
    expect(ufDoMunicipio('São Sebastião do Paraíso-MG')).toBe('MG');
    expect(ufDoMunicipio('Sem hifen')).toBe(null);
  });
});

