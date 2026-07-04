// Importação/exportação de DXF GEORREFERENCIADO.
//
// Diferença para QCAD/SolarCAD: aqui o sistema SABE o SRC (SIRGAS2000 / UTM fuso N). As
// coordenadas no DXF são UTM (Leste/Norte) em metros; como guardamos o fuso do projeto,
// reprojetamos para lat/lon livremente e o desenho cai no lugar real (com satélite alinhado).
// O DXF gerado leva o SRC anotado (TEXT + nome de layer) para não se perder a etiqueta.

export interface PontoXY { x: number; y: number; }
export interface DxfEntidades {
  polilinhas: { fechada: boolean; pontos: PontoXY[]; layer?: string }[];
  linhas: { a: PontoXY; b: PontoXY; layer?: string }[];
  pontos: { x: number; y: number; layer?: string }[];
  textos: { pos: PontoXY; texto: string; altura?: number; layer?: string }[];
  circulos: { c: PontoXY; r: number; layer?: string }[];
  arcos: { c: PontoXY; r: number; a0: number; a1: number; layer?: string }[];
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
  let polyAberto: { fechada: boolean; pontos: PontoXY[]; layer?: string } | null = null;
  let layerVal = '0';

  const finaliza = () => {
    if (!atual) return;
    const tipo = atual.toUpperCase();
    if (tipo === 'LWPOLYLINE') {
      const pts = xs.map((x, k) => ({ x, y: ys[k] }));
      if (pts.length >= 2) out.polilinhas.push({ fechada, pontos: pts, layer: layerVal });
    } else if (tipo === 'VERTEX') {
      if (polyAberto && xs.length >= 1) polyAberto.pontos.push({ x: xs[0], y: ys[0] });
    } else if (tipo === 'LINE') {
      if (xs.length >= 2) out.linhas.push({ a: { x: xs[0], y: ys[0] }, b: { x: xs[1], y: ys[1] }, layer: layerVal });
    } else if (tipo === 'POINT') {
      if (xs.length >= 1) out.pontos.push({ x: xs[0], y: ys[0], layer: layerVal });
    } else if (tipo === 'TEXT' || tipo === 'MTEXT') {
      if (xs.length >= 1) out.textos.push({ pos: { x: xs[0], y: ys[0] }, texto: textoVal, altura: alturaTxt || undefined, layer: layerVal });
    } else if (tipo === 'CIRCLE') {
      if (xs.length >= 1 && raio > 0) out.circulos.push({ c: { x: xs[0], y: ys[0] }, r: raio, layer: layerVal });
    } else if (tipo === 'ARC') {
      if (xs.length >= 1 && raio > 0) out.arcos.push({ c: { x: xs[0], y: ys[0] }, r: raio, a0: ang0, a1: ang1, layer: layerVal });
    }
    atual = null; xs = []; ys = []; fechada = false; textoVal = ''; raio = 0; ang0 = 0; ang1 = 360; alturaTxt = 0; layerVal = '0';
  };

  for (; i < pares.length; i++) {
    const { code, value } = pares[i];
    if (code === 0) {
      finaliza();
      const v = value.toUpperCase();
      if (v === 'ENDSEC') break;
      if (v === 'POLYLINE') { polyAberto = { fechada: false, pontos: [], layer: '0' }; atual = value; continue; }
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
    else if (code === 8) {
      layerVal = value;
      if (polyAberto && atual && atual.toUpperCase() === 'POLYLINE') polyAberto.layer = value;
    }
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

// --- Leitura COMPLETA com blocos (usada só pelo editor de DXF isolado) ---------------
// Lê, além das entidades soltas, a seção BLOCKS (definições de símbolos) e os INSERT
// (referências a esses símbolos). Não altera importarDxf, então a importação de planta
// continua intacta.

export interface InsertRef { nome: string; pos: PontoXY; sx: number; sy: number; rot: number; }
export interface BlocoDef { ent: DxfEntidades; inserts: InsertRef[]; base: PontoXY; }
export interface DxfDocumento { entidades: DxfEntidades; inserts: InsertRef[]; blocos: Record<string, BlocoDef>; }

function novoEnt(): DxfEntidades { return { polilinhas: [], linhas: [], pontos: [], textos: [], circulos: [], arcos: [] }; }

export function lerDxfDocumento(conteudo: string): DxfDocumento {
  const pares = lerPares(conteudo);
  const doc: DxfDocumento = { entidades: novoEnt(), inserts: [], blocos: {} };

  let secao: 'NONE' | 'ENTITIES' | 'BLOCKS' = 'NONE';
  let descarte = novoEnt();
  let alvoEnt: DxfEntidades = doc.entidades;
  let alvoIns: InsertRef[] = doc.inserts;
  let blocoAtual: BlocoDef | null = null;
  let blocoNome = '';

  let atual: string | null = null;
  let textoVal = '';
  let xs: number[] = [], ys: number[] = [];
  let raio = 0, ang0 = 0, ang1 = 360, alturaTxt = 0;
  let fechada = false;
  let insNome = '', insSx = 1, insSy = 1, insRot = 0;
  let polyAberto: { fechada: boolean; pontos: PontoXY[]; layer?: string } | null = null;
  let layerVal = '0';

  const finaliza = () => {
    if (!atual) return;
    const tipo = atual.toUpperCase();
    if (tipo === 'LWPOLYLINE') { const pts = xs.map((x, k) => ({ x, y: ys[k] })); if (pts.length >= 2) alvoEnt.polilinhas.push({ fechada, pontos: pts, layer: layerVal }); }
    else if (tipo === 'VERTEX') { if (polyAberto && xs.length >= 1) polyAberto.pontos.push({ x: xs[0], y: ys[0] }); }
    else if (tipo === 'LINE') { if (xs.length >= 2) alvoEnt.linhas.push({ a: { x: xs[0], y: ys[0] }, b: { x: xs[1], y: ys[1] }, layer: layerVal }); }
    else if (tipo === 'POINT') { if (xs.length >= 1) alvoEnt.pontos.push({ x: xs[0], y: ys[0], layer: layerVal }); }
    else if (tipo === 'TEXT' || tipo === 'MTEXT') { if (xs.length >= 1) alvoEnt.textos.push({ pos: { x: xs[0], y: ys[0] }, texto: textoVal, altura: alturaTxt || undefined, layer: layerVal }); }
    else if (tipo === 'CIRCLE') { if (xs.length >= 1 && raio > 0) alvoEnt.circulos.push({ c: { x: xs[0], y: ys[0] }, r: raio, layer: layerVal }); }
    else if (tipo === 'ARC') { if (xs.length >= 1 && raio > 0) alvoEnt.arcos.push({ c: { x: xs[0], y: ys[0] }, r: raio, a0: ang0, a1: ang1, layer: layerVal }); }
    else if (tipo === 'INSERT') { if (xs.length >= 1 && insNome) alvoIns.push({ nome: insNome, pos: { x: xs[0], y: ys[0] }, sx: insSx, sy: insSy, rot: insRot }); }
    atual = null; xs = []; ys = []; fechada = false; textoVal = ''; raio = 0; ang0 = 0; ang1 = 360; alturaTxt = 0;
    insNome = ''; insSx = 1; insSy = 1; insRot = 0; layerVal = '0';
  };

  for (let i = 0; i < pares.length; i++) {
    const { code, value } = pares[i];
    if (code === 0) {
      finaliza();
      const v = value.toUpperCase();
      if (v === 'ENDSEC') { secao = 'NONE'; alvoEnt = doc.entidades; alvoIns = doc.inserts; blocoAtual = null; atual = null; continue; }
      if (v === 'BLOCK') { blocoAtual = { ent: novoEnt(), inserts: [], base: { x: 0, y: 0 } }; blocoNome = ''; alvoEnt = blocoAtual.ent; alvoIns = blocoAtual.inserts; atual = 'BLOCK'; continue; }
      if (v === 'ENDBLK') { if (blocoAtual && blocoNome) doc.blocos[blocoNome] = blocoAtual; blocoAtual = null; alvoEnt = descarte; alvoIns = []; atual = null; continue; }
      if (v === 'POLYLINE') { polyAberto = { fechada: false, pontos: [], layer: '0' }; atual = value; continue; }
      if (v === 'SEQEND') { if (polyAberto) { if (polyAberto.pontos.length >= 2) alvoEnt.polilinhas.push(polyAberto); polyAberto = null; } atual = null; continue; }
      atual = value;
      continue;
    }
    // nome da seção logo após 0 SECTION
    if (code === 2 && atual === null && secao === 'NONE') {
      const v = value.toUpperCase();
      if (v === 'ENTITIES') { secao = 'ENTITIES'; alvoEnt = doc.entidades; alvoIns = doc.inserts; }
      else if (v === 'BLOCKS') { secao = 'BLOCKS'; alvoEnt = descarte; alvoIns = []; }
      continue;
    }
    if (!atual) continue;
    const tA = atual.toUpperCase();
    if (code === 2) { if (tA === 'BLOCK') blocoNome = value; else if (tA === 'INSERT') insNome = value; }
    else if (code === 10) { if (tA === 'BLOCK' && blocoAtual) blocoAtual.base.x = parseFloat(value); else xs.push(parseFloat(value)); }
    else if (code === 20) { if (tA === 'BLOCK' && blocoAtual) blocoAtual.base.y = parseFloat(value); else ys.push(parseFloat(value)); }
    else if (code === 11) xs.push(parseFloat(value));
    else if (code === 21) ys.push(parseFloat(value));
    else if (code === 8) {
      layerVal = value;
      if (polyAberto && tA === 'POLYLINE') polyAberto.layer = value;
    }
    else if (code === 70) { if (tA === 'POLYLINE' && polyAberto) polyAberto.fechada = (parseInt(value, 10) & 1) === 1; else fechada = (parseInt(value, 10) & 1) === 1; }
    else if (code === 1) textoVal = value;
    else if (code === 40) { if (tA === 'CIRCLE' || tA === 'ARC') raio = parseFloat(value); else if (tA === 'TEXT' || tA === 'MTEXT') alturaTxt = parseFloat(value); }
    else if (code === 41) { if (tA === 'INSERT') insSx = parseFloat(value); }
    else if (code === 42) { if (tA === 'INSERT') insSy = parseFloat(value); }
    else if (code === 50) { ang0 = parseFloat(value); insRot = parseFloat(value); }
    else if (code === 51) ang1 = parseFloat(value);
  }
  finaliza();
  return doc;
}

/** Devolve a melhor poligonal do DXF (fechada com mais vértices) como anel de pontos UTM. */
export function anelDeDxf(ent: DxfEntidades): PontoXY[] | null {
  const fechadas = ent.polilinhas.filter((p) => p.fechada && p.pontos.length >= 3);
  const candidatas = fechadas.length ? fechadas : ent.polilinhas.filter((p) => p.pontos.length >= 3);
  if (candidatas.length) {
    candidatas.sort((a, b) => b.pontos.length - a.pontos.length);
    return candidatas[0].pontos;
  }
  // Plano B: muitos DXF de campo desenham o perímetro como LINHAS soltas (uma por lado), sem
  // agrupar numa polilinha única. Tenta costurar essas linhas num contorno pelas pontas.
  return anelDeLinhasSoltas(ent.linhas);
}

/** Costura linhas soltas (a-b) num contorno, encaixando ponta com ponta. Ver `anelDeDxf`. */
function anelDeLinhasSoltas(linhas: { a: PontoXY; b: PontoXY }[]): PontoXY[] | null {
  if (linhas.length < 3 || linhas.length > 500) return null; // 500: proteção contra DXF gigante/decorativo
  const todos = linhas.flatMap((l) => [l.a, l.b]);
  const minX = Math.min(...todos.map((p) => p.x)), maxX = Math.max(...todos.map((p) => p.x));
  const minY = Math.min(...todos.map((p) => p.y)), maxY = Math.max(...todos.map((p) => p.y));
  const diag = Math.hypot(maxX - minX, maxY - minY) || 1;
  const tol = diag * 1e-5; // tolerância de "mesmo ponto", proporcional ao tamanho do desenho
  const perto = (p: PontoXY, q: PontoXY) => Math.hypot(p.x - q.x, p.y - q.y) <= tol;

  // A partir de cada linha, encadeia as vizinhas (por qualquer ponta) até não achar mais nenhuma.
  function encadearApartirDe(i: number): { pontos: PontoXY[]; fechado: boolean } {
    const usados = new Set([i]);
    let pontos = [linhas[i].a, linhas[i].b];
    let mudou = true;
    while (mudou) {
      mudou = false;
      const inicio = pontos[0], fim = pontos[pontos.length - 1];
      for (let j = 0; j < linhas.length; j++) {
        if (usados.has(j)) continue;
        const l = linhas[j];
        if (perto(l.a, fim)) { pontos = [...pontos, l.b]; usados.add(j); mudou = true; break; }
        if (perto(l.b, fim)) { pontos = [...pontos, l.a]; usados.add(j); mudou = true; break; }
        if (perto(l.a, inicio)) { pontos = [l.b, ...pontos]; usados.add(j); mudou = true; break; }
        if (perto(l.b, inicio)) { pontos = [l.a, ...pontos]; usados.add(j); mudou = true; break; }
      }
    }
    const fechado = pontos.length >= 4 && perto(pontos[0], pontos[pontos.length - 1]);
    return { pontos: fechado ? pontos.slice(0, -1) : pontos, fechado }; // tira o ponto de fechamento duplicado
  }

  // Testa a partir de cada linha (pode haver várias cadeias soltas no arquivo, ex.: cotas/legendas)
  // e fica com o melhor resultado: prioriza um contorno FECHADO e, entre fechados, o maior.
  let melhor: { pontos: PontoXY[]; fechado: boolean } | null = null;
  for (let i = 0; i < linhas.length; i++) {
    const r = encadearApartirDe(i);
    if (r.pontos.length < 3) continue;
    const ganha = !melhor || (r.fechado && !melhor.fechado) || (r.fechado === melhor.fechado && r.pontos.length > melhor.pontos.length);
    if (ganha) melhor = r;
  }
  return melhor && melhor.pontos.length >= 3 ? melhor.pontos : null;
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
