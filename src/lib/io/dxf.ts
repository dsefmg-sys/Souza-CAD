// Importação/exportação de DXF GEORREFERENCIADO.
//
// Diferença para QCAD/SolarCAD: aqui o sistema SABE o SRC (SIRGAS2000 / UTM fuso N). As
// coordenadas no DXF são UTM (Leste/Norte) em metros; como guardamos o fuso do projeto,
// reprojetamos para lat/lon livremente e o desenho cai no lugar real (com satélite alinhado).
// O DXF gerado leva o SRC anotado (TEXT + nome de layer) para não se perder a etiqueta.

export interface PontoXY { x: number; y: number; }
export interface DxfEntidades {
  polilinhas: { fechada: boolean; pontos: PontoXY[] }[];
  linhas: { a: PontoXY; b: PontoXY }[];
  pontos: PontoXY[];
  textos: { pos: PontoXY; texto: string; altura?: number }[];
  circulos: { c: PontoXY; r: number }[];
  arcos: { c: PontoXY; r: number; a0: number; a1: number }[];
}

/** Lê pares (código, valor) do DXF ASCII. */
function lerPares(conteudo: string): { code: number; value: string }[] {
  const linhas = conteudo.split(/\r?\n/);
  const pares: { code: number; value: string }[] = [];
  for (let i = 0; i + 1 < linhas.length; i += 2) {
    const code = parseInt(linhas[i].trim(), 10);
    const value = linhas[i + 1] ?? '';
    if (Number.isNaN(code)) { i -= 1; continue; } // tolera linhas órfãs
    pares.push({ code, value: value.trim() });
  }
  return pares;
}

/** Extrai entidades geométricas do DXF (LWPOLYLINE, POLYLINE, LINE, POINT, TEXT). */
export function importarDxf(conteudo: string): DxfEntidades {
  const pares = lerPares(conteudo);
  const out: DxfEntidades = { polilinhas: [], linhas: [], pontos: [], textos: [], circulos: [], arcos: [] };

  // localiza a seção ENTITIES
  let i = 0;
  for (; i < pares.length; i++) {
    if (pares[i].code === 2 && pares[i].value.toUpperCase() === 'ENTITIES') break;
  }

  let atual: string | null = null;
  let textoVal = '';
  let xs: number[] = [], ys: number[] = [];
  let raio = 0, ang0 = 0, ang1 = 360, alturaTxt = 0;
  let fechada = false;
  // POLYLINE clássico: vértices vêm em entidades VERTEX separadas até o SEQEND.
  let polyAberto: { fechada: boolean; pontos: PontoXY[] } | null = null;

  const finaliza = () => {
    if (!atual) return;
    const tipo = atual.toUpperCase();
    if (tipo === 'LWPOLYLINE') {
      const pts = xs.map((x, k) => ({ x, y: ys[k] }));
      if (pts.length >= 2) out.polilinhas.push({ fechada, pontos: pts });
    } else if (tipo === 'VERTEX') {
      if (polyAberto && xs.length >= 1) polyAberto.pontos.push({ x: xs[0], y: ys[0] });
    } else if (tipo === 'LINE') {
      if (xs.length >= 2) out.linhas.push({ a: { x: xs[0], y: ys[0] }, b: { x: xs[1], y: ys[1] } });
    } else if (tipo === 'POINT') {
      if (xs.length >= 1) out.pontos.push({ x: xs[0], y: ys[0] });
    } else if (tipo === 'TEXT' || tipo === 'MTEXT') {
      if (xs.length >= 1) out.textos.push({ pos: { x: xs[0], y: ys[0] }, texto: textoVal, altura: alturaTxt || undefined });
    } else if (tipo === 'CIRCLE') {
      if (xs.length >= 1 && raio > 0) out.circulos.push({ c: { x: xs[0], y: ys[0] }, r: raio });
    } else if (tipo === 'ARC') {
      if (xs.length >= 1 && raio > 0) out.arcos.push({ c: { x: xs[0], y: ys[0] }, r: raio, a0: ang0, a1: ang1 });
    }
    atual = null; xs = []; ys = []; fechada = false; textoVal = ''; raio = 0; ang0 = 0; ang1 = 360; alturaTxt = 0;
  };

  for (; i < pares.length; i++) {
    const { code, value } = pares[i];
    if (code === 0) {
      finaliza();
      const v = value.toUpperCase();
      if (v === 'ENDSEC') break;
      if (v === 'POLYLINE') { polyAberto = { fechada: false, pontos: [] }; atual = value; continue; }
      if (v === 'SEQEND') {
        if (polyAberto) { if (polyAberto.pontos.length >= 2) out.polilinhas.push(polyAberto); polyAberto = null; }
        atual = null; continue;
      }
      atual = value;
      continue;
    }
    if (!atual) continue;
    if (code === 10) xs.push(parseFloat(value));
    else if (code === 20) ys.push(parseFloat(value));
    else if (code === 11) xs.push(parseFloat(value)); // segundo ponto de LINE
    else if (code === 21) ys.push(parseFloat(value));
    else if (code === 70) { if (atual.toUpperCase() === 'POLYLINE' && polyAberto) polyAberto.fechada = (parseInt(value, 10) & 1) === 1; else fechada = (parseInt(value, 10) & 1) === 1; }
    else if (code === 1) textoVal = value;
    else if (code === 40) { const t = atual.toUpperCase(); if (t === 'CIRCLE' || t === 'ARC') raio = parseFloat(value); else if (t === 'TEXT' || t === 'MTEXT') alturaTxt = parseFloat(value); }
    else if (code === 50) ang0 = parseFloat(value);
    else if (code === 51) ang1 = parseFloat(value);
  }
  finaliza();
  if (polyAberto && polyAberto.pontos.length >= 2) out.polilinhas.push(polyAberto);
  return out;
}

/** Devolve a melhor poligonal do DXF (fechada com mais vértices) como anel de pontos UTM. */
export function anelDeDxf(ent: DxfEntidades): PontoXY[] | null {
  const fechadas = ent.polilinhas.filter((p) => p.fechada && p.pontos.length >= 3);
  const candidatas = fechadas.length ? fechadas : ent.polilinhas.filter((p) => p.pontos.length >= 3);
  if (!candidatas.length) return null;
  candidatas.sort((a, b) => b.pontos.length - a.pontos.length);
  return candidatas[0].pontos;
}

export interface VerticeDxf { leste: number; norte: number; codigoSigef: string; tipo: 'M' | 'P' | 'V'; }

function ent(tipo: string, layer: string, linhas: string[]): string {
  return ['0', tipo, '8', layer, ...linhas].join('\n');
}

/**
 * Gera um DXF (R12 ASCII) georreferenciado: poligonal fechada + pontos + rótulos, em UTM,
 * com o SRC anotado. Layers: PERIMETRO, VERTICES, ROTULOS, SRC.
 */
export function exportarDxf(vertices: VerticeDxf[], opts: { zona: number; hemisferio: 'N' | 'S'; titulo?: string }): string {
  const xs = vertices.map((v) => v.leste);
  const ys = vertices.map((v) => v.norte);
  const minX = Math.min(...xs), minY = Math.min(...ys), maxX = Math.max(...xs), maxY = Math.max(...ys);
  const alturaTexto = Math.max(1, (maxX - minX) / 80);

  const corpo: string[] = [];

  // poligonal fechada
  const poly: string[] = ['90', String(vertices.length), '70', '1'];
  for (const v of vertices) poly.push('10', v.leste.toFixed(3), '20', v.norte.toFixed(3));
  corpo.push(ent('LWPOLYLINE', 'PERIMETRO', poly));

  // pontos + rótulos
  for (const v of vertices) {
    corpo.push(ent('POINT', 'VERTICES', ['10', v.leste.toFixed(3), '20', v.norte.toFixed(3), '30', '0']));
    corpo.push(ent('TEXT', 'ROTULOS', [
      '10', (v.leste + alturaTexto * 0.4).toFixed(3), '20', (v.norte + alturaTexto * 0.4).toFixed(3),
      '40', alturaTexto.toFixed(3), '1', v.codigoSigef || v.tipo,
    ]));
  }

  // anotação do SRC (etiqueta de georreferência que QCAD perderia)
  const srcTxt = `SIRGAS2000 / UTM ${opts.zona}${opts.hemisferio} - ${opts.titulo ?? ''}`.trim();
  corpo.push(ent('TEXT', 'SRC', ['10', minX.toFixed(3), '20', (minY - alturaTexto * 2).toFixed(3), '40', alturaTexto.toFixed(3), '1', srcTxt]));

  return [
    '0', 'SECTION', '2', 'HEADER',
    '9', '$ACADVER', '1', 'AC1009',
    '9', '$INSUNITS', '70', '6',        // 6 = metros
    '9', '$EXTMIN', '10', minX.toFixed(3), '20', minY.toFixed(3),
    '9', '$EXTMAX', '10', maxX.toFixed(3), '20', maxY.toFixed(3),
    '0', 'ENDSEC',
    '0', 'SECTION', '2', 'ENTITIES',
    corpo.join('\n'),
    '0', 'ENDSEC',
    '0', 'EOF', '',
  ].join('\n');
}
