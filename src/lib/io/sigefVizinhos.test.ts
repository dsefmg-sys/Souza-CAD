import { describe, it, expect } from 'vitest';
import { parseParcelasSigef, parseGmlParcelas, parcelasVizinhas, confrontantesDeVizinhas, parcelasParaReferencias, type ParcelaSigef } from './sigefVizinhos';

// quadrado ~100m de lado perto de Espera Feliz (graus aproximados)
const d = 0.001; // ~110 m em latitude
const base = { lat: -20.65, lon: -41.91 };
function quadrado(olat: number, olon: number) {
  return [
    { lat: olat, lon: olon },
    { lat: olat, lon: olon + d },
    { lat: olat + d, lon: olon + d },
    { lat: olat + d, lon: olon },
  ];
}

describe('sigefVizinhos', () => {
  const meu = quadrado(base.lat, base.lon);

  it('detecta a parcela que compartilha divisa (encosta) e ignora a distante', () => {
    const vizinho: ParcelaSigef = { detentor: 'Vizinho A', anel: quadrado(base.lat, base.lon + d) }; // encostado à direita
    const longe: ParcelaSigef = { detentor: 'Longe B', anel: quadrado(base.lat + 0.05, base.lon + 0.05) };
    const achados = parcelasVizinhas(meu, [vizinho, longe], 15);
    expect(achados.map((p) => p.detentor)).toContain('Vizinho A');
    expect(achados.map((p) => p.detentor)).not.toContain('Longe B');
  });

  it('parseia GeoJSON de parcelas com nomes de propriedade variados (shapefile truncado)', () => {
    const gj = JSON.stringify({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: { codigo_imo: 'ABC123', nome_deten: 'Fulano de Tal', municipio: 'Espera Feliz', matricula: '4919' },
        geometry: { type: 'Polygon', coordinates: [quadrado(base.lat, base.lon + d).map((p) => [p.lon, p.lat]).concat([[base.lon + d, base.lat]])] },
      }],
    });
    const parcelas = parseParcelasSigef(gj);
    expect(parcelas.length).toBe(1);
    expect(parcelas[0].codigoImovel).toBe('ABC123');
    expect(parcelas[0].detentor).toBe('Fulano de Tal');
    expect(parcelas[0].anel.length).toBeGreaterThanOrEqual(3);
  });

  it('parseia GML de parcelas do WFS INCRA', () => {
    const xml = `
      <gml:featureMember>
        <ms:codigo_imovel>123456</ms:codigo_imovel>
        <ms:nome_area>Fazenda Teste</ms:nome_area>
        <ms:codigo_municipio>3124808</ms:codigo_municipio>
        <ms:registro_matricula>9876</ms:registro_matricula>
        <gml:outerBoundaryIs>
          <gml:LinearRing>
            <gml:coordinates>-41.91,-20.65 -41.90,-20.65 -41.90,-20.64 -41.91,-20.64 -41.91,-20.65</gml:coordinates>
          </gml:LinearRing>
        </gml:outerBoundaryIs>
      </gml:featureMember>
    `;
    const parcelas = parseGmlParcelas(xml);
    expect(parcelas.length).toBe(1);
    expect(parcelas[0].codigoImovel).toBe('123456');
    expect(parcelas[0].denominacao).toBe('Fazenda Teste');
    expect(parcelas[0].anel.length).toBe(5);
    expect(parcelas[0].anel[0].lon).toBe(-41.91);
    expect(parcelas[0].anel[0].lat).toBe(-20.65);
  });

  it('monta confrontantes a partir das parcelas (nome = detentor; código na descrição)', () => {
    const cs = confrontantesDeVizinhas([{ detentor: 'Vizinho A', codigoImovel: 'ABC123', matricula: '4919', anel: quadrado(base.lat, base.lon + d) }]);
    expect(cs[0].nome).toBe('Vizinho A');
    expect(cs[0].matricula).toBe('4919');
    expect(cs[0].descricaoExtra).toContain('ABC123');
  });

  it('converte os vértices das parcelas para Leste/Norte (encaixar ao lado do desenho)', () => {
    const refs = parcelasParaReferencias([{ detentor: 'Vizinho A', anel: quadrado(base.lat, base.lon + d) }], 23, 'S');
    expect(refs.length).toBe(1);
    expect(refs[0].length).toBeGreaterThanOrEqual(3);
    for (const p of refs[0]) {
      expect(Number.isFinite(p.leste)).toBe(true);
      expect(Number.isFinite(p.norte)).toBe(true);
    }
  });
});
