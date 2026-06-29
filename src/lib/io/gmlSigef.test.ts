import { describe, it, expect } from 'vitest';
import { parseGmlParcelas } from './sigefVizinhos';

// amostra reduzida no formato do WFS do INCRA (MapServer GML2): coords "lon,lat lon,lat ..."
const GML = `<?xml version='1.0' encoding="UTF-8" ?>
<wfs:FeatureCollection xmlns:ms="http://www.omsug.ca/osgis2004" xmlns:gml="http://www.opengis.net/gml" xmlns:wfs="http://www.opengis.net/wfs">
  <gml:featureMember>
    <ms:certificada_sigef_particular_mg>
      <ms:msGeometry>
        <gml:Polygon srsName="EPSG:4326">
          <gml:outerBoundaryIs>
            <gml:LinearRing>
              <gml:coordinates>-41.9474,-20.6720 -41.9445,-20.6722 -41.9450,-20.6757 -41.9474,-20.6720</gml:coordinates>
            </gml:LinearRing>
          </gml:outerBoundaryIs>
        </gml:Polygon>
      </ms:msGeometry>
      <ms:codigo_imovel>9501060588076</ms:codigo_imovel>
      <ms:nome_area>FAZENDA SAO DOMINGOS - 001</ms:nome_area>
      <ms:registro_matricula>11406</ms:registro_matricula>
      <ms:codigo_municipio>3124203</ms:codigo_municipio>
    </ms:certificada_sigef_particular_mg>
  </gml:featureMember>
</wfs:FeatureCollection>`;

describe('parseGmlParcelas (WFS INCRA)', () => {
  it('extrai anel (lat/lon) e atributos da parcela', () => {
    const ps = parseGmlParcelas(GML);
    expect(ps).toHaveLength(1);
    const p = ps[0];
    expect(p.anel.length).toBeGreaterThanOrEqual(3);
    expect(p.anel[0].lon).toBeCloseTo(-41.9474, 3);
    expect(p.anel[0].lat).toBeCloseTo(-20.6720, 3);
    expect(p.codigoImovel).toBe('9501060588076');
    expect(p.denominacao).toBe('FAZENDA SAO DOMINGOS - 001');
    expect(p.matricula).toBe('11406');
  });

  it('ignora GML sem feições', () => {
    expect(parseGmlParcelas('<wfs:FeatureCollection></wfs:FeatureCollection>')).toHaveLength(0);
  });
});
