import JSZip from 'jszip';

// Gera um Shapefile (ESRI) de UM polígono, em coordenadas UTM (SIRGAS2000), empacotado num .zip
// com os quatro arquivos: .shp (geometria), .shx (índice), .dbf (atributos) e .prj (projeção).
// Feito à mão porque shapefile é binário e não vale trazer uma dependência só pra isso.

export interface PontoUTM { leste: number; norte: number; }

export interface ShapefileLido {
  tipo: 'poligono' | 'polilinha' | 'ponto' | 'multiponto' | 'desconhecido';
  /** Anéis/linhas (cada parte é uma lista de pontos). Pontos soltos entram como anéis de 1 ponto. */
  aneis: PontoUTM[][];
  /** Fuso detectado a partir do .prj, quando presente. */
  zona?: number;
  hemisferio?: 'N' | 'S';
}

/** Lê o fuso UTM (zona + hemisfério) de um .prj SIRGAS/WGS UTM, quando dá pra reconhecer. */
export function zonaDoPrj(prj: string): { zona: number; hemisferio: 'N' | 'S' } | null {
  const mc = prj.match(/central_meridian"?\s*,\s*(-?\d+(?:\.\d+)?)/i);
  if (!mc) return null;
  const meridiano = Number(mc[1]);
  const zona = Math.round((meridiano + 183) / 6);
  if (zona < 1 || zona > 60) return null;
  const fn = prj.match(/false_northing"?\s*,\s*(-?\d+(?:\.\d+)?)/i);
  const hemisferio: 'N' | 'S' = fn && Number(fn[1]) > 0 ? 'S' : 'N';
  return { zona, hemisferio };
}

/**
 * Lê a geometria de um .shp (ESRI). Suporta Ponto (1), PolyLine (3), Polígono (5) e MultiPoint (8),
 * além das variantes Z/M (que têm o mesmo X/Y no começo — o Z/M do fim é ignorado). Devolve os
 * pontos NO SISTEMA DO ARQUIVO (normalmente UTM Leste/Norte); o fuso vem do .prj à parte.
 */
export function lerShp(buf: ArrayBuffer): ShapefileLido {
  const dv = new DataView(buf);
  if (buf.byteLength < 100 || dv.getInt32(0, false) !== 9994) {
    return { tipo: 'desconhecido', aneis: [] };
  }
  const tipoArquivo = dv.getInt32(32, true);
  const aneis: PontoUTM[][] = [];
  const lerXY = (o: number): PontoUTM => ({ leste: dv.getFloat64(o, true), norte: dv.getFloat64(o + 8, true) });

  let o = 100; // início dos registros
  while (o + 8 <= buf.byteLength) {
    const contentWords = dv.getInt32(o + 4, false); // big-endian, em palavras de 16 bits
    const conteudo = o + 8;
    if (contentWords <= 0 || conteudo + contentWords * 2 > buf.byteLength) break;
    const tipoReg = dv.getInt32(conteudo, true);
    const base = tipoReg % 10; // 1,11,21 = ponto; 3,13,23 = linha; 5,15,25 = polígono; 8,18,28 = multiponto
    if (base === 1) {
      aneis.push([lerXY(conteudo + 4)]);
    } else if (base === 3 || base === 5) {
      const numParts = dv.getInt32(conteudo + 4 + 32, true);
      const numPoints = dv.getInt32(conteudo + 4 + 36, true);
      const partsOff = conteudo + 4 + 40;
      const pontosOff = partsOff + numParts * 4;
      const inicios: number[] = [];
      for (let p = 0; p < numParts; p++) inicios.push(dv.getInt32(partsOff + p * 4, true));
      for (let p = 0; p < numParts; p++) {
        const ini = inicios[p], fim = p + 1 < numParts ? inicios[p + 1] : numPoints;
        const parte: PontoUTM[] = [];
        for (let k = ini; k < fim; k++) parte.push(lerXY(pontosOff + k * 16));
        if (parte.length) aneis.push(parte);
      }
    } else if (base === 8) {
      const numPoints = dv.getInt32(conteudo + 4 + 32, true);
      const pontosOff = conteudo + 4 + 36;
      for (let k = 0; k < numPoints; k++) aneis.push([lerXY(pontosOff + k * 16)]);
    }
    o = conteudo + contentWords * 2;
  }

  const tipo = tipoArquivo % 10 === 5 ? 'poligono'
    : tipoArquivo % 10 === 3 ? 'polilinha'
    : tipoArquivo % 10 === 1 ? 'ponto'
    : tipoArquivo % 10 === 8 ? 'multiponto' : 'desconhecido';
  return { tipo, aneis };
}

/** Lê um shapefile empacotado num .zip (procura o .shp e o .prj). */
export async function importarShapefileZip(zipBuf: ArrayBuffer): Promise<ShapefileLido> {
  const zip = await JSZip.loadAsync(zipBuf);
  const nomeShp = Object.keys(zip.files).find((n) => n.toLowerCase().endsWith('.shp'));
  if (!nomeShp) throw new Error('Nenhum arquivo .shp encontrado no zip.');
  const shpBuf = await zip.file(nomeShp)!.async('arraybuffer');
  const lido = lerShp(shpBuf);
  const nomePrj = Object.keys(zip.files).find((n) => n.toLowerCase().endsWith('.prj'));
  if (nomePrj) {
    const fuso = zonaDoPrj(await zip.file(nomePrj)!.async('string'));
    if (fuso) { lido.zona = fuso.zona; lido.hemisferio = fuso.hemisferio; }
  }
  return lido;
}

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
  const nome = (opts.nome || 'parcela');
  const nomeBytes = new Uint8Array(50);
  // Codifica em UTF-8 (declarado no .cpg abaixo) e limita a 50 bytes. O jeito antigo (charCodeAt & 0xff)
  // truncava cada caractere pra 1 byte, então "São João" saía como lixo no QGIS/ArcGIS.
  nomeBytes.set(new TextEncoder().encode(nome).subarray(0, 50));
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
  dbf.setUint8(headerSize + recordSize, 0x1a); // marcador de fim do arquivo (EOF), exigido pelo formato dBASE

  const prj = wktSirgasUtm(opts.zona, opts.hemisferio);

  const base = (opts.nome || 'parcela').replace(/[^\w.-]+/g, '_');
  const zip = new JSZip();
  zip.file(`${base}.shp`, shp.buffer);
  zip.file(`${base}.shx`, shx.buffer);
  zip.file(`${base}.dbf`, dbf.buffer);
  zip.file(`${base}.cpg`, 'UTF-8'); // declara a codificação do .dbf (senão acento vira lixo)
  zip.file(`${base}.prj`, prj);
  return zip.generateAsync({ type: 'blob' });
}
