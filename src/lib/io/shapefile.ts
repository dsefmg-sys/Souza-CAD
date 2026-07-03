import JSZip from 'jszip';

// Gera um Shapefile (ESRI) de UM polígono, em coordenadas UTM (SIRGAS2000), empacotado num .zip
// com os quatro arquivos: .shp (geometria), .shx (índice), .dbf (atributos) e .prj (projeção).
// Feito à mão porque shapefile é binário e não vale trazer uma dependência só pra isso.

export interface PontoUTM { leste: number; norte: number; }

/** Área com sinal (regra do agrimensor) — positivo = anti-horário. */
function areaAssinada(p: PontoUTM[]): number {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const j = (i + 1) % p.length;
    a += p[i].leste * p[j].norte - p[j].leste * p[i].norte;
  }
  return a / 2;
}

function wktSirgasUtm(zona: number, hemisferio: 'N' | 'S'): string {
  const mc = -183 + zona * 6; // meridiano central
  const falseNorthing = hemisferio === 'S' ? 10000000 : 0;
  return `PROJCS["SIRGAS 2000 / UTM zone ${zona}${hemisferio}",GEOGCS["SIRGAS 2000",DATUM["Sistema_de_Referencia_Geocentrico_para_las_AmericaS_2000",SPHEROID["GRS 1980",6378137,298.257222101]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",0],PARAMETER["central_meridian",${mc}],PARAMETER["scale_factor",0.9996],PARAMETER["false_easting",500000],PARAMETER["false_northing",${falseNorthing}],UNIT["metre",1],AXIS["Easting",EAST],AXIS["Northing",NORTH]]`;
}

export async function gerarShapefileZip(
  pontosEntrada: PontoUTM[],
  opts: { zona: number; hemisferio: 'N' | 'S'; nome: string },
): Promise<Blob> {
  // anel do polígono: outer ring precisa ser HORÁRIO no shapefile (área assinada negativa)
  let pts = pontosEntrada.slice();
  if (areaAssinada(pts) > 0) pts = pts.reverse();
  // fecha o anel (primeiro == último)
  const primeiro = pts[0], ultimo = pts[pts.length - 1];
  if (primeiro.leste !== ultimo.leste || primeiro.norte !== ultimo.norte) pts = [...pts, primeiro];
  const n = pts.length;

  const xs = pts.map((p) => p.leste), ys = pts.map((p) => p.norte);
  const minX = Math.min(...xs), minY = Math.min(...ys), maxX = Math.max(...xs), maxY = Math.max(...ys);

  // ---- .shp ----
  const recordContentBytes = 4 /*shapeType*/ + 32 /*bbox*/ + 4 /*numParts*/ + 4 /*numPoints*/ + 4 /*parts*/ + n * 16;
  const shpLen = 100 + 8 + recordContentBytes;
  const shp = new DataView(new ArrayBuffer(shpLen));
  // header
  shp.setInt32(0, 9994, false);            // file code
  shp.setInt32(24, shpLen / 2, false);     // file length (16-bit words)
  shp.setInt32(28, 1000, true);            // version
  shp.setInt32(32, 5, true);               // shape type = Polygon
  shp.setFloat64(36, minX, true); shp.setFloat64(44, minY, true);
  shp.setFloat64(52, maxX, true); shp.setFloat64(60, maxY, true);
  // record header
  shp.setInt32(100, 1, false);             // record number
  shp.setInt32(104, recordContentBytes / 2, false); // content length (words)
  // record content
  let o = 108;
  shp.setInt32(o, 5, true); o += 4;        // shape type
  shp.setFloat64(o, minX, true); o += 8; shp.setFloat64(o, minY, true); o += 8;
  shp.setFloat64(o, maxX, true); o += 8; shp.setFloat64(o, maxY, true); o += 8;
  shp.setInt32(o, 1, true); o += 4;        // numParts
  shp.setInt32(o, n, true); o += 4;        // numPoints
  shp.setInt32(o, 0, true); o += 4;        // parts[0]
  for (const p of pts) { shp.setFloat64(o, p.leste, true); o += 8; shp.setFloat64(o, p.norte, true); o += 8; }

  // ---- .shx ----
  const shx = new DataView(new ArrayBuffer(100 + 8));
  shx.setInt32(0, 9994, false);
  shx.setInt32(24, (100 + 8) / 2, false);
  shx.setInt32(28, 1000, true);
  shx.setInt32(32, 5, true);
  shx.setFloat64(36, minX, true); shx.setFloat64(44, minY, true);
  shx.setFloat64(52, maxX, true); shx.setFloat64(60, maxY, true);
  shx.setInt32(100, 50, false);                       // offset do 1º registro (em words: 100/2)
  shx.setInt32(104, recordContentBytes / 2, false);   // content length

  // ---- .dbf ---- (um campo texto NOME)
  const nome = (opts.nome || 'parcela').slice(0, 50);
  const nomeBytes = new Uint8Array(50);
  for (let i = 0; i < nome.length && i < 50; i++) nomeBytes[i] = nome.charCodeAt(i) & 0xff;
  const headerSize = 32 + 32 + 1;
  const recordSize = 1 + 50;
  const dbf = new DataView(new ArrayBuffer(headerSize + recordSize + 1));
  const d = new Date();
  dbf.setUint8(0, 0x03);
  dbf.setUint8(1, d.getFullYear() - 1900); dbf.setUint8(2, d.getMonth() + 1); dbf.setUint8(3, d.getDate());
  dbf.setInt32(4, 1, true);                 // nº de registros
  dbf.setInt16(8, headerSize, true);
  dbf.setInt16(10, recordSize, true);
  // descritor do campo NOME (offset 32)
  const fieldName = 'NOME';
  for (let i = 0; i < fieldName.length; i++) dbf.setUint8(32 + i, fieldName.charCodeAt(i));
  dbf.setUint8(32 + 11, 'C'.charCodeAt(0)); // tipo Char
  dbf.setUint8(32 + 16, 50);                // tamanho
  dbf.setUint8(64, 0x0d);                   // terminador do header
  // registro
  dbf.setUint8(65, 0x20);                   // flag "não deletado"
  for (let i = 0; i < 50; i++) dbf.setUint8(66 + i, nomeBytes[i] || 0x20);

  const prj = wktSirgasUtm(opts.zona, opts.hemisferio);

  const base = (opts.nome || 'parcela').replace(/[^\w.-]+/g, '_');
  const zip = new JSZip();
  zip.file(`${base}.shp`, shp.buffer);
  zip.file(`${base}.shx`, shx.buffer);
  zip.file(`${base}.dbf`, dbf.buffer);
  zip.file(`${base}.prj`, prj);
  return zip.generateAsync({ type: 'blob' });
}
