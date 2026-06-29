import { describe, it, expect } from 'vitest';
import { detectarFusoPorRegiao } from './municipios';
import { geoParaUtm } from './coords';

// Espera Feliz fica logo a LESTE da divisa 23/24 (lon -41,91), então um mesmo ponto pode ser
// exportado tanto no fuso 23 (coordenadas estendidas) quanto no 24. O detector deve recuperar o
// fuso em que o arquivo foi gerado — é isso que resolve a ambiguidade na importação.
const eFeliz = { lat: -20.6506, lon: -41.9094 };

describe('detectarFusoPorRegiao', () => {
  it('recupera o fuso 24 quando o ponto foi exportado no fuso 24', () => {
    const { leste, norte } = geoParaUtm(eFeliz.lat, eFeliz.lon, 24, 'S');
    expect(detectarFusoPorRegiao(leste, norte, 'S', [23, 24]).zona).toBe(24);
  });

  it('recupera o fuso 23 quando o ponto foi exportado no fuso 23', () => {
    const { leste, norte } = geoParaUtm(eFeliz.lat, eFeliz.lon, 23, 'S');
    expect(detectarFusoPorRegiao(leste, norte, 'S', [23, 24]).zona).toBe(23);
  });

  it('um ponto claramente a oeste (Carangola, fuso 23) é detectado como 23', () => {
    const { leste, norte } = geoParaUtm(-20.73, -42.03, 23, 'S');
    expect(detectarFusoPorRegiao(leste, norte, 'S', [22, 23, 24, 25]).zona).toBe(23);
  });
});
