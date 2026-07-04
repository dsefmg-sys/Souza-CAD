import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { gerarShapefileZip } from './shapefile';

const QUAD: { leste: number; norte: number }[] = [
  { leste: 650000, norte: 7680000 },
  { leste: 650200, norte: 7680000 },
  { leste: 650200, norte: 7680200 },
  { leste: 650000, norte: 7680200 },
];

describe('gerarShapefileZip', () => {
  it('gera um zip com os 5 arquivos (inclui .cpg) e um .shp valido', async () => {
    const blob = await gerarShapefileZip(QUAD, { zona: 23, hemisferio: 'S', nome: 'Teste' });
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const nomes = Object.keys(zip.files).sort();
    expect(nomes).toEqual(['Teste.cpg', 'Teste.dbf', 'Teste.prj', 'Teste.shp', 'Teste.shx']);

    const shpBuf = await zip.file('Teste.shp')!.async('arraybuffer');
    const dv = new DataView(shpBuf);
    expect(dv.getInt32(0, false)).toBe(9994);   // file code
    expect(dv.getInt32(32, true)).toBe(5);       // shape type = Polygon
    expect(dv.getInt32(24, false) * 2).toBe(shpBuf.byteLength); // file length bate
    // record: numPoints = 5 (4 + fechamento)
    const numPoints = dv.getInt32(108 + 4 + 32 + 4, true);
    expect(numPoints).toBe(5);

    const prj = await zip.file('Teste.prj')!.async('string');
    expect(prj).toContain('UTM zone 23S');
    expect(prj).toContain('central_meridian",-45');

    // o .dbf tem que terminar com o marcador de fim (0x1A), senão alguns GIS reclamam
    const dbfBuf = await zip.file('Teste.dbf')!.async('arraybuffer');
    const dbf = new DataView(dbfBuf);
    expect(dbf.getUint8(dbfBuf.byteLength - 1)).toBe(0x1a);
  });
});
