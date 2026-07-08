import { describe, it, expect } from 'vitest';
import { parseParcelasSigef, parseGmlParcelas, parcelasVizinhas, confrontantesDeVizinhas, parcelasParaReferencias, parseVerticesSigefGml, parsePropriedadeSigefGml, type ParcelaSigef } from './sigefVizinhos';

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

  it('NÃO trata a própria parcela (idêntica/sobreposta) como vizinha', () => {
    const eumesmo: ParcelaSigef = { detentor: 'Eu mesmo', anel: quadrado(base.lat, base.lon) }; // mesmo anel do "meu"
    const vizinho: ParcelaSigef = { detentor: 'Vizinho A', anel: quadrado(base.lat, base.lon + d) };
    const achados = parcelasVizinhas(meu, [eumesmo, vizinho], 15);
    expect(achados.map((p) => p.detentor)).not.toContain('Eu mesmo');
    expect(achados.map((p) => p.detentor)).toContain('Vizinho A');
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

  it('parseia vertices completos a partir de um GML de certificacao do SIGEF', () => {
    const gmlText = `
      <sigef:vertice>
        <geo:Vértice>
          <geo:codigo>COIN-M-0017</geo:codigo>
          <geo:latitude>-20.672012</geo:latitude>
          <geo:longitude>-41.947413</geo:longitude>
          <geo:altitude>842.15</geo:altitude>
          <geo:tipo>M</geo:tipo>
          <geo:metodo>PG2</geo:metodo>
          <geo:limite>muro</geo:limite>
        </geo:Vértice>
      </sigef:vertice>
      <sigef:vertice>
        <geo:Vértice>
          <geo:codigo>COIN-P-0128</geo:codigo>
          <geo:latitude>-20.675711</geo:latitude>
          <geo:longitude>-41.945012</geo:longitude>
          <geo:altitude>831.50</geo:altitude>
          <geo:tipo>P</geo:tipo>
          <geo:metodo>PG1</geo:metodo>
          <geo:limite>cerca</geo:limite>
        </geo:Vértice>
      </sigef:vertice>
    `;
    const vs = parseVerticesSigefGml(gmlText);
    expect(vs.length).toBe(2);
    expect(vs[0].id).toBe('COIN-M-0017');
    expect(vs[0].lat).toBe(-20.672012);
    expect(vs[0].lon).toBe(-41.947413);
    expect(vs[0].altitude).toBe(842.15);
    expect(vs[0].tipo).toBe('M');
    expect(vs[0].metodo).toBe('PG2');
    expect(vs[0].limite).toBe('muro');

    expect(vs[1].id).toBe('COIN-P-0128');
    expect(vs[1].lat).toBe(-20.675711);
    expect(vs[1].lon).toBe(-41.945012);
    expect(vs[1].altitude).toBe(831.50);
    expect(vs[1].tipo).toBe('P');
    expect(vs[1].metodo).toBe('PG1');
    expect(vs[1].limite).toBe('cerca');

    // totalNos deve bater com a contagem quando nenhum vértice foi descartado
    expect((vs as unknown as { totalNos: number }).totalNos).toBe(2);
  });

  it('NAO perde em silencio um vertice cuja tag de coordenada nao e reconhecida — totalNos denuncia o descarte', () => {
    const gmlText = `
      <sigef:vertice>
        <geo:Vértice>
          <geo:codigo>COIN-M-0017</geo:codigo>
          <geo:latitude>-20.672012</geo:latitude>
          <geo:longitude>-41.947413</geo:longitude>
        </geo:Vértice>
      </sigef:vertice>
      <sigef:vertice>
        <geo:Vértice>
          <geo:codigo>COIN-P-0128</geo:codigo>
          <geo:coordenadaXYZ>-20.675711,-41.945012</geo:coordenadaXYZ>
        </geo:Vértice>
      </sigef:vertice>
    `;
    const vs = parseVerticesSigefGml(gmlText);
    // só o 1º vértice tem tag de latitude/longitude reconhecida pela heurística — o 2º é descartado
    expect(vs.length).toBe(1);
    expect(vs[0].id).toBe('COIN-M-0017');
    // mas totalNos revela que havia 2 nós <Vértice> no XML — dá pra quem chama avisar da perda
    expect((vs as unknown as { totalNos: number }).totalNos).toBe(2);
  });

  it('parseia metadados da propriedade a partir de um GML/XML do SIGEF', () => {
    const xml = `
      <wfs:FeatureCollection>
        <ms:nome_area>FAZENDA BELA VISTA</ms:nome_area>
        <ms:detentor>MARIA DA SILVA</ms:detentor>
        <ms:codigo_imovel>9501060588076</ms:codigo_imovel>
        <ms:codigo_municipio>3124203</ms:codigo_municipio>
        <ms:registro_matricula>12345</ms:registro_matricula>
      </wfs:FeatureCollection>
    `;
    const prop = parsePropriedadeSigefGml(xml);
    expect(prop.denominacao).toBe('FAZENDA BELA VISTA');
    expect(prop.detentor).toBe('MARIA DA SILVA');
    expect(prop.codigoImovel).toBe('9501060588076');
    expect(prop.municipio).toBe('3124203');
    expect(prop.matricula).toBe('12345');
  });
});
