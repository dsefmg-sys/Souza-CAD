import type { Gleba, Projeto, Vertex, Confrontante } from './types';

let _seq = 0;
export function novoGlebaId(): string {
  _seq += 1;
  return `g_${Date.now().toString(36)}_${_seq}`;
}

export function novaGlebaVazia(indice: number): Gleba {
  return {
    id: novoGlebaId(),
    denominacao: `Parcela ${indice}`,
    parcela: String(indice).padStart(3, '0'),
    vertices: [],
    confrontantes: [],
    confrontantePorLado: {},
    objetos: [],
  };
}

export function glebaDe(
  indice: number,
  vertices: Vertex[],
  confrontantes: Confrontante[],
  confrontantePorLado: Record<number, string>,
  denominacao?: string
): Gleba {
  return {
    id: novoGlebaId(),
    denominacao: denominacao || `Parcela ${indice}`,
    parcela: String(indice).padStart(3, '0'),
    vertices,
    confrontantes,
    confrontantePorLado,
    objetos: [],
  };
}

/**
 * Migração: projetos salvos antes do multi-gleba têm vertices/confrontantes no topo. Converte
 * para glebas[0]. Projetos já com glebas passam sem mudança.
 */
export function migrarProjeto(p: Projeto): Projeto {
  if (p.glebas && p.glebas.length > 0) return p;
  const g = glebaDe(1, p.vertices ?? [], p.confrontantes ?? [], p.confrontantePorLado ?? {}, 'Parcela 1');
  return { ...p, glebas: [g] };
}

export function dividirGleba(
  vertices: Vertex[],
  confrontantes: Confrontante[],
  confrontantePorLado: Record<number, string>,
  idInicio: string,
  idFim: string
): {
  verticesA: Vertex[];
  confrontantePorLadoA: Record<number, string>;
  verticesB: Vertex[];
  confrontantePorLadoB: Record<number, string>;
} {
  const idxInicio = vertices.findIndex(v => v.id === idInicio);
  const idxFim = vertices.findIndex(v => v.id === idFim);
  if (idxInicio === -1 || idxFim === -1) throw new Error('Vértice não encontrado.');
  if (idxInicio === idxFim) throw new Error('Selecione dois vértices diferentes.');

  const i = Math.min(idxInicio, idxFim);
  const j = Math.max(idxInicio, idxFim);

  if (j === i + 1 || (i === 0 && j === vertices.length - 1)) {
    throw new Error('Não é possível dividir por vértices adjacentes.');
  }

  const timestamp = Date.now().toString(36);
  // Gleba A
  const verticesA = vertices.slice(i, j + 1).map(v => ({ ...v, id: `va_${v.id}_${timestamp}` }));
  const confrontantePorLadoA: Record<number, string> = {};
  for (let k = 0; k < j - i; k++) {
    const originalIndex = i + k;
    if (confrontantePorLado[originalIndex] !== undefined) {
      confrontantePorLadoA[k] = confrontantePorLado[originalIndex];
    }
  }
  // A última divisa (j -> i) é a nova linha de divisão
  confrontantePorLadoA[j - i] = '';

  // Gleba B
  const part1 = vertices.slice(j);
  const part2 = vertices.slice(0, i + 1);
  const verticesB = [...part1, ...part2].map(v => ({ ...v, id: `vb_${v.id}_${timestamp}` }));
  const confrontantePorLadoB: Record<number, string> = {};
  
  const totalB = verticesB.length;
  for (let k = 0; k < totalB - 1; k++) {
    const v1 = verticesB[k];
    const v2 = verticesB[k + 1];
    
    const origId1 = v1.id.split('_')[1];
    const origId2 = v2.id.split('_')[1];
    const origIdx = vertices.findIndex(v => v.id === origId1);
    
    if (origIdx !== -1) {
      const nextIdx = (origIdx + 1) % vertices.length;
      if (vertices[nextIdx].id === origId2) {
        if (confrontantePorLado[origIdx] !== undefined) {
          confrontantePorLadoB[k] = confrontantePorLado[origIdx];
        }
      }
    }
  }
  // A última divisa (i -> j) é a nova linha de divisão
  confrontantePorLadoB[totalB - 1] = '';

  return {
    verticesA,
    confrontantePorLadoA,
    verticesB,
    confrontantePorLadoB,
  };
}

export interface PontoEN { leste: number; norte: number }

function areaShoelace(p: PontoEN[]): number {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const b = p[(i + 1) % p.length];
    a += p[i].leste * b.norte - b.leste * p[i].norte;
  }
  return Math.abs(a) / 2;
}

// Corta o polígono pelo semiplano n·p <= c (Sutherland-Hodgman). Insere os pontos de interseção.
function cortarSemiplano(poly: PontoEN[], nx: number, ny: number, c: number): PontoEN[] {
  const out: PontoEN[] = [];
  const N = poly.length;
  for (let i = 0; i < N; i++) {
    const cur = poly[i], nxt = poly[(i + 1) % N];
    const dCur = nx * cur.leste + ny * cur.norte - c;
    const dNxt = nx * nxt.leste + ny * nxt.norte - c;
    const inCur = dCur <= 0, inNxt = dNxt <= 0;
    if (inCur) out.push(cur);
    if (inCur !== inNxt) {
      const t = dCur / (dCur - dNxt);
      out.push({ leste: cur.leste + t * (nxt.leste - cur.leste), norte: cur.norte + t * (nxt.norte - cur.norte) });
    }
  }
  return out;
}

/**
 * Divide o polígono em duas partes por uma linha de corte PARALELA ao azimute `azimuteGraus`
 * (medido do Norte, horário), posicionada por busca binária para que a parte A tenha `areaAlvoM2`.
 * Trabalha em coordenadas planas UTM (leste,norte). Retorna os dois anéis e suas áreas.
 */
export function dividirPorAreaAlvo(poly: PontoEN[], areaAlvoM2: number, azimuteGraus: number): {
  anelA: PontoEN[]; anelB: PontoEN[]; areaA: number; areaB: number;
} {
  if (poly.length < 3) throw new Error('A gleba precisa de ao menos 3 vértices.');
  const total = areaShoelace(poly);
  if (!(areaAlvoM2 > 0) || areaAlvoM2 >= total) {
    throw new Error('A área alvo precisa ser maior que zero e menor que a área total da gleba.');
  }
  const rad = (azimuteGraus * Math.PI) / 180;
  const dx = Math.sin(rad), dy = Math.cos(rad); // direção do corte (E,N)
  const nx = dy, ny = -dx;                       // normal de varredura, perpendicular ao corte
  let lo = Infinity, hi = -Infinity;
  for (const p of poly) { const c = nx * p.leste + ny * p.norte; lo = Math.min(lo, c); hi = Math.max(hi, c); }
  // a área do lado (n·p <= c) cresce de 0 (c=lo) a total (c=hi): monótona → busca binária
  let a = lo, b = hi, cMid = (a + b) / 2;
  for (let it = 0; it < 80; it++) {
    cMid = (a + b) / 2;
    const parte = cortarSemiplano(poly, nx, ny, cMid);
    const areaParte = parte.length >= 3 ? areaShoelace(parte) : 0;
    if (areaParte < areaAlvoM2) a = cMid; else b = cMid;
  }
  const anelA = cortarSemiplano(poly, nx, ny, cMid);
  const anelB = cortarSemiplano(poly, -nx, -ny, -cMid);
  return { anelA, anelB, areaA: areaShoelace(anelA), areaB: areaShoelace(anelB) };
}

export function unirGlebas(
  verticesA: Vertex[],
  verticesB: Vertex[],
  confrontantePorLadoA: Record<number, string>,
  confrontantePorLadoB: Record<number, string>
): {
  vertices: Vertex[];
  confrontantePorLado: Record<number, string>;
} {
  const matchingIndices: { a: number; b: number }[] = [];
  verticesA.forEach((va, idxA) => {
    const idxB = verticesB.findIndex(vb => Math.hypot(va.leste - vb.leste, va.norte - vb.norte) < 0.05);
    if (idxB !== -1) {
      matchingIndices.push({ a: idxA, b: idxB });
    }
  });

  if (matchingIndices.length < 2) {
    throw new Error('As glebas não compartilham uma divisa comum (precisam de ao menos 2 pontos coincidentes).');
  }

  const sharedA = new Set<number>();
  const sharedB = new Set<number>();

  const lenA = verticesA.length;
  const lenB = verticesB.length;

  for (let p = 0; p < lenA; p++) {
    const nextP = (p + 1) % lenA;
    const match1 = matchingIndices.find(m => m.a === p);
    const match2 = matchingIndices.find(m => m.a === nextP);
    
    if (match1 && match2) {
      const q = match1.b;
      const prevQ = (q - 1 + lenB) % lenB;
      const nextQ = (q + 1) % lenB;
      
      if (match2.b === prevQ) {
        sharedA.add(p);
        sharedB.add(prevQ);
      } else if (match2.b === nextQ) {
        sharedA.add(p);
        sharedB.add(q);
      }
    }
  }

  if (sharedA.size === 0) {
    throw new Error('Nenhum segmento divisório comum foi encontrado entre as glebas.');
  }

  let startA = -1;
  for (let p = 0; p < lenA; p++) {
    const prevP = (p - 1 + lenA) % lenA;
    if (!sharedA.has(p) && !sharedA.has(prevP)) {
      startA = p;
      break;
    }
  }

  if (startA === -1) {
    throw new Error('Não foi possível unificar (as glebas se sobrepõem completamente).');
  }

  const mergedVertices: Vertex[] = [];
  const confrontantePorLado: Record<number, string> = {};
  const timestamp = Date.now().toString(36);

  let currentA = startA;
  let visitedACount = 0;

  while (visitedACount < lenA) {
    const nextA = (currentA + 1) % lenA;
    
    if (sharedA.has(currentA)) {
      const matchNextA = matchingIndices.find(m => m.a === nextA);
      if (matchNextA) {
        let currentB = matchNextA.b;
        let visitedBCount = 0;
        
        while (visitedBCount < lenB) {
          const nextB = (currentB + 1) % lenB;
          
          if (sharedB.has(currentB)) {
            const matchB = matchingIndices.find(m => m.b === nextB);
            if (matchB) {
              currentB = nextB;
            } else {
              break;
            }
          } else {
            const vb = { ...verticesB[currentB], id: `un_${verticesB[currentB].id}_${timestamp}` };
            mergedVertices.push(vb);
            
            const idxMerged = mergedVertices.length - 1;
            if (confrontantePorLadoB[currentB] !== undefined) {
              confrontantePorLado[idxMerged] = confrontantePorLadoB[currentB];
            }
            
            const matchNextB = matchingIndices.find(m => m.b === nextB);
            if (matchNextB) {
              currentA = (matchNextB.a - 1 + lenA) % lenA;
              break;
            }
            currentB = nextB;
          }
          visitedBCount++;
        }
      }
    } else {
      const va = { ...verticesA[currentA], id: `un_${verticesA[currentA].id}_${timestamp}` };
      mergedVertices.push(va);
      
      const idxMerged = mergedVertices.length - 1;
      if (confrontantePorLadoA[currentA] !== undefined) {
        confrontantePorLado[idxMerged] = confrontantePorLadoA[currentA];
      }
    }
    
    currentA = (currentA + 1) % lenA;
    if (currentA === startA) break;
    visitedACount++;
  }

  const finalVertices: Vertex[] = [];
  const finalConf: Record<number, string> = {};
  
  mergedVertices.forEach((v, idx) => {
    const nextV = mergedVertices[(idx + 1) % mergedVertices.length];
    if (Math.hypot(v.leste - nextV.leste, v.norte - nextV.norte) > 0.05) {
      finalVertices.push(v);
      const newIdx = finalVertices.length - 1;
      if (confrontantePorLado[idx] !== undefined) {
        finalConf[newIdx] = confrontantePorLado[idx];
      }
    }
  });

  return {
    vertices: finalVertices,
    confrontantePorLado: finalConf,
  };
}
