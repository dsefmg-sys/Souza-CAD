import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { gerarShapefileZip, importarShapefileZip, lerShp, zonaDoPrj } from './shapefile';

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

  it('gera um shapefile em formato geografico com o .prj SIRGAS 2000 correspondente', async () => {
    const blob = await gerarShapefileZip(QUAD, { zona: 23, hemisferio: 'S', nome: 'TesteGeo', formato: 'geo' });
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const prj = await zip.file('TesteGeo.prj')!.async('string');
    expect(prj).toContain('GEOGCS["SIRGAS 2000"');
    expect(prj).not.toContain('PROJCS');

    const shpBuf = await zip.file('TesteGeo.shp')!.async('arraybuffer');
    const dv = new DataView(shpBuf);
    const minX = dv.getFloat64(112, true);
    const minY = dv.getFloat64(120, true);
    // Para zona 23 Sul, coordenadas do QUAD devem dar longitude aproximada de -45 e latitude aproximada de -21
    expect(minX).toBeLessThan(-40);
    expect(minX).toBeGreaterThan(-50);
    expect(minY).toBeLessThan(-20);
    expect(minY).toBeGreaterThan(-25);
  });

  it('os pontos escritos no .shp batem com a geometria (leitura de volta)', async () => {
    const blob = await gerarShapefileZip(QUAD, { zona: 23, hemisferio: 'S', nome: 'q' });
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const dv = new DataView(await zip.file('q.shp')!.async('arraybuffer'));
    // bbox do registro (offset 112): Xmin,Ymin,Xmax,Ymax
    expect(dv.getFloat64(112, true)).toBe(650000);
    expect(dv.getFloat64(120, true)).toBe(7680000);
    expect(dv.getFloat64(128, true)).toBe(650200);
    expect(dv.getFloat64(136, true)).toBe(7680200);
    const numPoints = dv.getInt32(148, true);
    expect(numPoints).toBe(5); // 4 + fechamento
    // lê os pontos (offset 156) e confere que o anel fecha e que todos os cantos aparecem
    const pts: [number, number][] = [];
    for (let k = 0; k < numPoints; k++) pts.push([dv.getFloat64(156 + k * 16, true), dv.getFloat64(156 + k * 16 + 8, true)]);
    expect(pts[0]).toEqual(pts[numPoints - 1]); // anel fechado (primeiro == último)
    const set = new Set(pts.map((p) => p.join(',')));
    expect(set.has('650000,7680000')).toBe(true);
    expect(set.has('650200,7680200')).toBe(true);
    // orientação: outer ring do shapefile é HORÁRIO → área assinada negativa
    let a2 = 0;
    for (let k = 0; k < numPoints - 1; k++) a2 += pts[k][0] * pts[k + 1][1] - pts[k + 1][0] * pts[k][1];
    expect(a2).toBeLessThan(0);
  });
});

describe('importarShapefileZip (ida e volta)', () => {
  it('exporta e importa de volta o mesmo polígono, com o fuso do .prj', async () => {
    const blob = await gerarShapefileZip(QUAD, { zona: 23, hemisferio: 'S', nome: 'Ida' });
    const lido = await importarShapefileZip(await blob.arrayBuffer());
    expect(lido.tipo).toBe('poligono');
    expect(lido.zona).toBe(23);
    expect(lido.hemisferio).toBe('S');
    expect(lido.aneis.length).toBe(1);
    // todos os cantos do quadrado voltam
    const set = new Set(lido.aneis[0].map((p) => `${p.leste},${p.norte}`));
    expect(set.has('650000,7680000')).toBe(true);
    expect(set.has('650200,7680000')).toBe(true);
    expect(set.has('650200,7680200')).toBe(true);
    expect(set.has('650000,7680200')).toBe(true);
  });

  it('lê fuso do .prj (meridiano central -45 = zona 23; false_northing = hemisfério S)', () => {
    expect(zonaDoPrj('...central_meridian",-45],...false_northing",10000000]...')).toEqual({ zona: 23, hemisferio: 'S' });
    expect(zonaDoPrj('...central_meridian",-39],...false_northing",0]...')).toEqual({ zona: 24, hemisferio: 'N' });
  });

  it('rejeita buffer que não é shapefile', () => {
    expect(lerShp(new Uint8Array([1, 2, 3, 4]).buffer).tipo).toBe('desconhecido');
  });
});
