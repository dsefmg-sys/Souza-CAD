// Curvas de nível a partir de pontos medidos (planialtimétrico). Dois passos:
//  1) triangula os pontos no plano (Delaunay, Bowyer-Watson) — a malha TIN;
//  2) para cada nível de altitude, "marcha" pelos triângulos achando onde o plano do nível corta
//     cada triângulo, gera segmentos e os encadeia em polilinhas.
// As curvas são recortadas ao POLÍGONO do imóvel (só triângulos com centro dentro entram), pra não
// desenhar interpolação fora da área levantada. Trabalha no plano projetado (Leste/Norte, em metros).

export interface Ponto2D { x: number; y: number }
export interface Ponto3D { x: number; y: number; z: number }
export interface CurvaNivel { nivel: number; linha: Ponto2D[] }

/** Triângulo por índices dos pontos de entrada. */
export type Triangulo = [number, number, number];

interface Circ { x: number; y: number; r2: number }

function circuncirculo(a: Ponto2D, b: Ponto2D, c: Ponto2D): Circ {
  const ax = a.x, ay = a.y, bx = b.x, by = b.y, cx = c.x, cy = c.y;
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < 1e-12) return { x: 0, y: 0, r2: Infinity }; // colinear → círculo "infinito"
  const a2 = ax * ax + ay * ay, b2 = bx * bx + by * by, c2 = cx * cx + cy * cy;
  const ux = (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / d;
  const uy = (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / d;
  const dx = ax - ux, dy = ay - uy;
  return { x: ux, y: uy, r2: dx * dx + dy * dy };
}

function mesmaAresta(e: [number, number], f: [number, number]): boolean {
  return (e[0] === f[0] && e[1] === f[1]) || (e[0] === f[1] && e[1] === f[0]);
}

/** Triangulação de Delaunay (Bowyer-Watson). Devolve triângulos como índices de `pontos`. */
export function triangularDelaunay(pontos: Ponto2D[]): Triangulo[] {
  const n = pontos.length;
  if (n < 3) return [];

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pontos) {
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
  }
  const dmax = Math.max(maxX - minX, maxY - minY) || 1;
  const midx = (minX + maxX) / 2, midy = (minY + maxY) / 2;
  // super-triângulo que engloba tudo (índices n, n+1, n+2)
  const pts: Ponto2D[] = pontos.concat([
    { x: midx - 20 * dmax, y: midy - dmax },
    { x: midx, y: midy + 20 * dmax },
    { x: midx + 20 * dmax, y: midy - dmax },
  ]);

  let triangulos: Triangulo[] = [[n, n + 1, n + 2]];

  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const arestas: [number, number][] = [];
    triangulos = triangulos.filter((t) => {
      const cc = circuncirculo(pts[t[0]], pts[t[1]], pts[t[2]]);
      const dx = p.x - cc.x, dy = p.y - cc.y;
      if (dx * dx + dy * dy <= cc.r2 + 1e-9) {
        arestas.push([t[0], t[1]], [t[1], t[2]], [t[2], t[0]]);
        return false; // triângulo "ruim" — sai
      }
      return true;
    });
    // arestas de fronteira do buraco = as que aparecem só uma vez
    for (let e = 0; e < arestas.length; e++) {
      let unica = true;
      for (let f = 0; f < arestas.length; f++) {
        if (e !== f && mesmaAresta(arestas[e], arestas[f])) { unica = false; break; }
      }
      if (unica) triangulos.push([arestas[e][0], arestas[e][1], i]);
    }
  }
  // descarta triângulos que ainda tocam o super-triângulo
  return triangulos.filter((t) => t[0] < n && t[1] < n && t[2] < n);
}

/** Ponto dentro de polígono (ray casting). */
export function pontoNoPoligono(x: number, y: number, poly: Ponto2D[]): boolean {
  let dentro = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    const corta = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (corta) dentro = !dentro;
  }
  return dentro;
}

function interp(a: Ponto3D, b: Ponto3D, nivel: number): Ponto2D {
  const t = (nivel - a.z) / (b.z - a.z);
  return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
}

function chave(p: Ponto2D): string {
  return `${p.x.toFixed(3)},${p.y.toFixed(3)}`;
}

/** Encadeia segmentos soltos (que compartilham pontas) em polilinhas. */
function encadear(segs: [Ponto2D, Ponto2D][]): Ponto2D[][] {
  // mapa ponta -> lista de índices de segmentos que a tocam
  const porPonta = new Map<string, number[]>();
  segs.forEach((s, i) => {
    for (const p of s) {
      const k = chave(p);
      const arr = porPonta.get(k) ?? [];
      arr.push(i);
      porPonta.set(k, arr);
    }
  });
  const usado = new Array(segs.length).fill(false);
  const linhas: Ponto2D[][] = [];

  for (let i = 0; i < segs.length; i++) {
    if (usado[i]) continue;
    usado[i] = true;
    const linha: Ponto2D[] = [segs[i][0], segs[i][1]];
    // estende pela frente e por trás
    for (const dir of [1, 0] as const) {
      let crescendo = true;
      while (crescendo) {
        crescendo = false;
        const ponta = dir === 1 ? linha[linha.length - 1] : linha[0];
        const cand = porPonta.get(chave(ponta)) ?? [];
        for (const j of cand) {
          if (usado[j]) continue;
          const [a, b] = segs[j];
          let prox: Ponto2D | null = null;
          if (chave(a) === chave(ponta)) prox = b;
          else if (chave(b) === chave(ponta)) prox = a;
          if (prox) {
            usado[j] = true;
            if (dir === 1) linha.push(prox); else linha.unshift(prox);
            crescendo = true;
            break;
          }
        }
      }
    }
    linhas.push(linha);
  }
  return linhas;
}

/**
 * Suaviza uma polilinha pelo método de Chaikin (corta cantos). O TIN gera isolinhas em ZIGUE-ZAGUE
 * (segmentos retos de triângulo em triângulo); Chaikin arredonda esses cantos e entrega uma CURVA de
 * verdade, mantendo-se colada aos dados (não estoura pra fora, ao contrário de splines interpoladoras).
 * Linha reta continua reta. Extremidades de linha aberta são preservadas; laço fechado é tratado em ciclo.
 */
export function suavizarChaikin(linha: Ponto2D[], passos = 2): Ponto2D[] {
  if (linha.length < 3 || passos < 1) return linha;
  const fim = linha[linha.length - 1];
  const fechada = Math.abs(linha[0].x - fim.x) < 1e-6 && Math.abs(linha[0].y - fim.y) < 1e-6;
  let pts = fechada ? linha.slice(0, -1) : linha;
  for (let it = 0; it < passos; it++) {
    const out: Ponto2D[] = [];
    if (!fechada) out.push(pts[0]);
    const n = pts.length;
    const lim = fechada ? n : n - 1;
    for (let i = 0; i < lim; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      out.push({ x: 0.75 * a.x + 0.25 * b.x, y: 0.75 * a.y + 0.25 * b.y });
      out.push({ x: 0.25 * a.x + 0.75 * b.x, y: 0.25 * a.y + 0.75 * b.y });
    }
    if (!fechada) out.push(pts[n - 1]);
    pts = out;
  }
  if (fechada) pts.push({ x: pts[0].x, y: pts[0].y });
  return pts;
}

/**
 * Intervalo de curva SUGERIDO (em metros) a partir do desnível dos pontos. O padrão fixo de 1 m vira
 * um emaranhado de linhas num imóvel grande; aqui escolhemos o menor intervalo "redondo" que resulta
 * em cerca de uma dúzia de curvas no desnível total — legível em terreno plano OU acidentado.
 */
export function intervaloSugerido(pontos: Ponto3D[]): number {
  const validos = pontos.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z));
  if (validos.length < 2) return 1;
  const zs = validos.map((p) => p.z);
  const desnivel = Math.max(...zs) - Math.min(...zs);
  if (!(desnivel > 0)) return 1;
  // Lógica INTELIGENTE: leva em conta o RELEVO (desnível) E o TAMANHO do imóvel. Num terreno grande as
  // curvas se espalham por mais espaço, então cabem MAIS curvas sem virar emaranhado; num pequeno, menos.
  // O nº-alvo de curvas cresce suavemente com o tamanho (diagonal da nuvem de pontos, em metros), entre
  // ~8 (imóvel pequeno) e ~24 (grande). O intervalo é o desnível dividido por esse alvo, arredondado.
  const xs = validos.map((p) => p.x), ys = validos.map((p) => p.y);
  const tamanho = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)); // metros
  const alvoN = Math.min(24, Math.max(8, Math.round(8 + tamanho / 150)));
  const alvo = desnivel / alvoN;
  const redondos = [0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100];
  return redondos.find((n) => n >= alvo) ?? Math.ceil(alvo);
}

export interface OpcoesCurvas {
  /** Intervalo entre curvas, em metros (ex.: 1, 5). */
  intervalo: number;
  /** Polígono do imóvel (Leste/Norte) para recortar; opcional. */
  poligono?: Ponto2D[];
  /** Múltiplos polígonos (todas as glebas) para recortar; opcional. */
  poligonos?: Ponto2D[][];
  /** Suaviza as curvas (Chaikin) para saírem como curvas de verdade, não zigue-zague. Padrão: true. */
  suavizar?: boolean;
  /** Passos de suavização (mais = mais lisa, mais pontos). Padrão: 2. */
  passosSuavizacao?: number;
  /** Se false, remove triângulos com arestas muito longas que distorcem o terreno nas bordas. Padrão: true. */
  usarTriangulacao?: boolean;
}

/**
 * Gera as curvas de nível dos pontos (com x,y,z em metros). Devolve uma lista de polilinhas, cada
 * uma com o nível (altitude) correspondente.
 */
export function gerarCurvasDeNivel(pontos: Ponto3D[], opcoes: OpcoesCurvas): CurvaNivel[] {
  const intervalo = opcoes.intervalo;
  const pts = pontos.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z));
  if (pts.length < 3 || !(intervalo > 0)) return [];

  // Deduplicação espacial por coordenadas planas (com tolerância de 1mm = 0.001)
  const dedup: Ponto3D[] = [];
  for (const p of pts) {
    const duplicate = dedup.some(
      (d) => Math.hypot(d.x - p.x, d.y - p.y) < 0.001
    );
    if (!duplicate) {
      dedup.push(p);
    }
  }
  if (dedup.length < 3) return [];

  const tris = triangularDelaunay(dedup);
  if (!tris.length) return [];

  const listaPoligonos: Ponto2D[][] = [];
  if (opcoes.poligono && opcoes.poligono.length >= 3) listaPoligonos.push(opcoes.poligono);
  if (opcoes.poligonos) {
    for (const p of opcoes.poligonos) {
      if (p && p.length >= 3) listaPoligonos.push(p);
    }
  }

  // Se a triangulação perimétrica estiver desativada ou restrita, calcula o tamanho máximo permitido da aresta
  let maxAresta2 = Infinity;
  if (opcoes.usarTriangulacao === false) {
    // Calcula a distância média entre pontos vizinhos para filtrar arestas espúrias
    let distSoma = 0, distCont = 0;
    for (let i = 0; i < Math.min(dedup.length, 50); i++) {
      let minDist = Infinity;
      for (let j = 0; j < dedup.length; j++) {
        if (i === j) continue;
        const d2 = (dedup[i].x - dedup[j].x) ** 2 + (dedup[i].y - dedup[j].y) ** 2;
        if (d2 < minDist) minDist = d2;
      }
      if (minDist < Infinity) { distSoma += Math.sqrt(minDist); distCont++; }
    }
    const distMedia = distCont > 0 ? distSoma / distCont : 30;
    maxAresta2 = (distMedia * 3.5) ** 2; // descarta arestas que cruzam grandes áreas vazias
  }

  const segsPorNivel = new Map<number, [Ponto2D, Ponto2D][]>();

  for (const t of tris) {
    const A = dedup[t[0]], B = dedup[t[1]], C = dedup[t[2]];

    // Recorte ao(s) polígono(s) do imóvel: só triângulos com centro dentro da área levantada
    if (listaPoligonos.length > 0) {
      const cx = (A.x + B.x + C.x) / 3, cy = (A.y + B.y + C.y) / 3;
      const dentro = listaPoligonos.some(poly => pontoNoPoligono(cx, cy, poly));
      if (!dentro) continue;
    } else if (maxAresta2 < Infinity) {
      // Filtra arestas excessivamente longas se NÃO houver polígono delimitador
      const dAB2 = (A.x - B.x) ** 2 + (A.y - B.y) ** 2;
      const dBC2 = (B.x - C.x) ** 2 + (B.y - C.y) ** 2;
      const dCA2 = (C.x - A.x) ** 2 + (C.y - A.y) ** 2;
      if (dAB2 > maxAresta2 || dBC2 > maxAresta2 || dCA2 > maxAresta2) continue;
    }

    const zlo = Math.min(A.z, B.z, C.z);
    const zhi = Math.max(A.z, B.z, C.z);
    if (zhi - zlo < 1e-9) continue; // triângulo plano — nenhuma curva passa

    const primeiro = Math.ceil(zlo / intervalo - 1e-9) * intervalo;
    for (let nivel = primeiro; nivel <= zhi + 1e-9; nivel += intervalo) {
      const nv = +nivel.toFixed(6);
      // classifica vértices: acima (>= nível) ou abaixo. 1 ou 2 acima = a curva corta.
      const vs = [A, B, C];
      const acima = vs.map((v) => v.z >= nv);
      const nAcima = acima.filter(Boolean).length;
      if (nAcima === 0 || nAcima === 3) continue;
      // o vértice "sozinho" (flag diferente dos outros dois)
      const lone = acima[0] === acima[1] ? 2 : acima[0] === acima[2] ? 1 : 0;
      const outros = [0, 1, 2].filter((k) => k !== lone);
      const p1 = interp(vs[lone], vs[outros[0]], nv);
      const p2 = interp(vs[lone], vs[outros[1]], nv);
      const arr = segsPorNivel.get(nv) ?? [];
      arr.push([p1, p2]);
      segsPorNivel.set(nv, arr);
    }
  }

  const suavizar = opcoes.suavizar !== false; // padrão: suaviza
  const passos = opcoes.passosSuavizacao ?? 2;
  const curvas: CurvaNivel[] = [];
  for (const [nivel, segs] of segsPorNivel) {
    for (const linha of encadear(segs)) {
      if (linha.length >= 2) {
        curvas.push({ nivel, linha: suavizar ? suavizarChaikin(linha, passos) : linha });
      }
    }
  }
  curvas.sort((a, b) => a.nivel - b.nivel);
  return curvas;
}
