import { describe, it, expect } from 'vitest';
import { importarGeoJsonAneis } from './geojson';

describe('importarGeoJsonAneis', () => {
  it('lê Polygon geográfico (lon/lat) de uma FeatureCollection', () => {
    const gj = JSON.stringify({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature', properties: { parcela: 'SIGEF-1' },
        geometry: { type: 'Polygon', coordinates: [[[-42.0, -20.6], [-41.99, -20.6], [-41.99, -20.59], [-42.0, -20.6]]] },
      }],
    });
    const r = importarGeoJsonAneis(gj);
    expect(r.geografico).toBe(true);
    expect(r.aneis).toHaveLength(1);
    expect(r.aneis[0][0]).toEqual({ x: -42.0, y: -20.6 });
  });

  it('detecta UTM pela magnitude e lê MultiPolygon', () => {
    const gj = JSON.stringify({
      type: 'Feature', properties: {},
      geometry: { type: 'MultiPolygon', coordinates: [[[[812375, 7720152], [812481, 7720102], [812541, 7720075], [812375, 7720152]]]] },
    });
    const r = importarGeoJsonAneis(gj);
    expect(r.geografico).toBe(false);
    expect(r.aneis[0][0]).toEqual({ x: 812375, y: 7720152 });
  });
});
