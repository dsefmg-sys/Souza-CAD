import type { Vertex, ImovelData, ResultadoCalculo, Confrontante, TecnicoData } from './types';
import { cpfOuCnpjValido } from './validation';
import { obterTipoLimiteEfetivo } from './sigefVocab';

export type Nivel = 'erro' | 'aviso' | 'ok';
export interface Problema { nivel: Nivel; campo: string; msg: string; }

interface Pt { x: number; y: number; }

// orientação do triângulo (a,b,c)
function orient(a: Pt, b: Pt, c: Pt): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}
function noSegmento(a: Pt, b: Pt, p: Pt): boolean {
  return Math.min(a.x, b.x) - 1e-9 <= p.x && p.x <= Math.max(a.x, b.x) + 1e-9 &&
         Math.min(a.y, b.y) - 1e-9 <= p.y && p.y <= Math.max(a.y, b.y) + 1e-9;
}
/** Dois segmentos (a-b) e (c-d) se cruzam propriamente? */
export function segmentosCruzam(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  const o1 = orient(a, b, c), o2 = orient(a, b, d), o3 = orient(c, d, a), o4 = orient(c, d, b);
  if (((o1 > 0) !== (o2 > 0)) && ((o3 > 0) !== (o4 > 0))) return true;
  // casos colineares com sobreposição
  if (Math.abs(o1) < 1e-9 && noSegmento(a, b, c)) return true;
  if (Math.abs(o2) < 1e-9 && noSegmento(a, b, d)) return true;
  if (Math.abs(o3) < 1e-9 && noSegmento(c, d, a)) return true;
  if (Math.abs(o4) < 1e-9 && noSegmento(c, d, b)) return true;
  return false;
}

/** Detecta se a poligonal (anel fechado) se auto-intercepta. */
export function temAutoIntersecao(vertices: Vertex[]): boolean {
  const n = vertices.length;
  if (n < 4) return false;
  const pt = (i: number): Pt => ({ x: vertices[i].leste, y: vertices[i].norte });
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      // ignora lados adjacentes (compartilham vértice) e o par primeiro-último
      const adjacentes = j === i + 1 || (i === 0 && j === n - 1);
      if (adjacentes) continue;
      if (segmentosCruzam(pt(i), pt((i + 1) % n), pt(j), pt((j + 1) % n))) return true;
    }
  }
  return false;
}

/** Roda todas as conferências e devolve a lista de problemas. */
export function conferir(
  vertices: Vertex[],
  res: ResultadoCalculo | null,
  imovel: ImovelData,
  confrontantes: Confrontante[] = [],
  confrontantePorLado?: Record<number, string>,
  tecnico?: TecnicoData | null
): Problema[] {
  const out: Problema[] = [];

  if (vertices.length < 3) {
    out.push({ nivel: 'erro', campo: 'poligonal', msg: 'A poligonal precisa de ao menos 3 vértices.' });
    return out;
  }

  // dados do imóvel obrigatórios para as peças
  const faltando: string[] = [];
  if (!imovel.denominacao) faltando.push('denominação');
  if (!imovel.matricula) faltando.push('matrícula');
  if (!imovel.municipio) faltando.push('município');
  if (!imovel.proprietario) faltando.push('proprietário');
  if (faltando.length) out.push({ nivel: 'aviso', campo: 'imóvel', msg: `Faltam dados do imóvel: ${faltando.join(', ')}.` });

  // Validação CPFs/CNPJs do imóvel
  if (imovel.cpfProprietario && !cpfOuCnpjValido(imovel.cpfProprietario)) {
    out.push({ nivel: 'erro', campo: 'imóvel', msg: `CPF/CNPJ do proprietário "${imovel.cpfProprietario}" é inválido.` });
  }
  if (imovel.cpfComprador && !cpfOuCnpjValido(imovel.cpfComprador)) {
    out.push({ nivel: 'erro', campo: 'imóvel', msg: `CPF/CNPJ do comprador "${imovel.cpfComprador}" é inválido.` });
  }
  if (imovel.cpfConjugeProprietario && !cpfOuCnpjValido(imovel.cpfConjugeProprietario)) {
    out.push({ nivel: 'erro', campo: 'imóvel', msg: `CPF do cônjuge do proprietário "${imovel.cpfConjugeProprietario}" é inválido.` });
  }

  // confrontantes incompletos e CPFs inválidos
  for (const c of confrontantes) {
    if (!c.nome) { out.push({ nivel: 'aviso', campo: 'confrontante', msg: 'Há trecho de divisa sem confrontante informado.' }); continue; }
    const sem: string[] = [];
    if (!c.cpf) sem.push('CPF');
    if (!c.matricula) sem.push('matrícula');
    if (sem.length) out.push({ nivel: 'aviso', campo: 'confrontante', msg: `${c.nome}: falta ${sem.join(' e ')}.` });

    if (c.cpf && !cpfOuCnpjValido(c.cpf)) {
      out.push({ nivel: 'erro', campo: 'confrontante', msg: `${c.nome}: CPF/CNPJ "${c.cpf}" é inválido.` });
    }
    if (c.inventarianteCpf && !cpfOuCnpjValido(c.inventarianteCpf)) {
      out.push({ nivel: 'erro', campo: 'confrontante', msg: `${c.nome} (Inventariante): CPF "${c.inventarianteCpf}" é inválido.` });
    }
    if (c.nuProprietarioCpf && !cpfOuCnpjValido(c.nuProprietarioCpf)) {
      out.push({ nivel: 'erro', campo: 'confrontante', msg: `${c.nome} (Nu-proprietário): CPF/CNPJ "${c.nuProprietarioCpf}" é inválido.` });
    }
    if (c.conjugeCpf && !cpfOuCnpjValido(c.conjugeCpf)) {
      out.push({ nivel: 'erro', campo: 'confrontante', msg: `${c.nome} (Cônjuge): CPF "${c.conjugeCpf}" é inválido.` });
    }
  }

  // Segmentos sem confrontante ou divisa definidos
  if (confrontantePorLado && vertices.length >= 3) {
    for (let i = 0; i < vertices.length; i++) {
      const v = vertices[i];
      const proximo = vertices[(i + 1) % vertices.length];
      const nomeTrecho = `de ${v.codigoSigef || v.nome || `Vértice ${i + 1}`} para ${proximo.codigoSigef || proximo.nome || `Vértice ${((i + 1) % vertices.length) + 1}`}`;

      if (!confrontantePorLado[i]?.trim()) {
        out.push({
          nivel: 'erro',
          campo: 'confrontante',
          msg: `Trecho ${nomeTrecho} está sem confrontante definido.`
        });
      }

      if (!v.representacao?.trim()) {
        out.push({
          nivel: 'erro',
          campo: 'divisa',
          msg: `Trecho ${nomeTrecho} está sem tipo de divisa definido.`
        });
      }
    }
  }

  // Vértices sem altitude (zero, nulo ou não-finito)
  for (let i = 0; i < vertices.length; i++) {
    const v = vertices[i];
    const nomeV = v.codigoSigef || v.nome || `Vértice ${i + 1}`;
    if (v.elevacao === 0 || v.elevacao == null || !Number.isFinite(v.elevacao)) {
      out.push({
        nivel: 'aviso',
        campo: 'altitude',
        msg: `Vértice ${nomeV} está sem altitude (valor é zero ou inválido).`
      });
    }
  }

  // vértices duplicados / muito próximos (< 5 cm)
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      const d = Math.hypot(vertices[i].leste - vertices[j].leste, vertices[i].norte - vertices[j].norte);
      if (d < 0.05) {
        const z1 = vertices[i].elevacao ?? 0;
        const z2 = vertices[j].elevacao ?? 0;
        if (Math.abs(z1 - z2) < 0.01) {
          out.push({
            nivel: 'erro',
            campo: 'vértices',
            msg: `Vértices ${vertices[i].codigoSigef || vertices[i].nome || i + 1} e ${vertices[j].codigoSigef || vertices[j].nome || j + 1} possuem coordenadas e altitude idênticas, indicando possíveis erros ou duplicidade.`
          });
        } else {
          out.push({
            nivel: 'erro',
            campo: 'vértices',
            msg: `Vértices ${vertices[i].codigoSigef || vertices[i].nome || i + 1} e ${vertices[j].codigoSigef || vertices[j].nome || j + 1} estão sobrepostos (${d.toFixed(3)} m).`
          });
        }
      }
    }
  }

  // auto-interseção
  if (temAutoIntersecao(vertices)) {
    out.push({ nivel: 'erro', campo: 'poligonal', msg: 'A poligonal cruza ela mesma — verifique a ordem dos vértices.' });
  }

  // códigos atribuídos
  const semCodigo = vertices.filter((v) => !v.codigoSigef).length;
  if (semCodigo > 0) {
    out.push({ nivel: 'erro', campo: 'códigos', msg: `${semCodigo} vértice(s) sem código — use "Renumerar" antes de exportar.` });
  }

  // reconciliação com o SIGEF
  if (res && imovel.areaSigefHa != null && imovel.areaSigefHa > 0) {
    const difM2 = Math.abs(res.areaHa - imovel.areaSigefHa) * 10000;
    const nivel: Nivel = difM2 > 50 ? 'aviso' : 'ok';
    out.push({ nivel, campo: 'área SGL', msg: `Diferença para o SIGEF: ${difM2.toFixed(1)} m² (nossa ${res.areaHa.toFixed(4)} ha × SIGEF ${imovel.areaSigefHa.toFixed(4)} ha).` });
  }
  if (res && imovel.perimetroSigef != null && imovel.perimetroSigef > 0) {
    const dif = Math.abs(res.perimetro - imovel.perimetroSigef);
    const nivel: Nivel = dif > 0.5 ? 'aviso' : 'ok';
    out.push({ nivel, campo: 'perímetro', msg: `Diferença para o SIGEF: ${dif.toFixed(2)} m (nosso ${res.perimetro.toFixed(2)} × SIGEF ${imovel.perimetroSigef.toFixed(2)}).` });
  }

  // Validação de Precisão Posicional (Sigmas) segundo a 3ª Edição da NTGIR/INCRA
  for (let i = 0; i < vertices.length; i++) {
    const v = vertices[i];
    const nomeV = v.codigoSigef || v.nome || `Vértice ${i + 1}`;
    
    // Precisão horizontal
    const sigX = v.sigmaX ?? 0;
    const sigY = v.sigmaY ?? 0;
    const sigH = Math.max(sigX, sigY);
    
    if (sigX > 0 || sigY > 0) {
      const limite = obterTipoLimiteEfetivo(v, tecnico?.tipoLimite);
      let maxPermitido = 0.10;
      let tipoDesc = 'Artificial';
      
      if (limite.startsWith('LN')) {
        maxPermitido = 3.00;
        tipoDesc = 'Natural';
      } else if (limite.startsWith('LV')) {
        maxPermitido = 7.50;
        tipoDesc = 'Inacessível';
      }
      
      if (sigH > maxPermitido) {
        out.push({
          nivel: 'ok',
          campo: 'precisão',
          msg: `Vértice ${nomeV}: precisão horizontal de ${sigH.toFixed(2)}m excede o limite legal de ${maxPermitido.toFixed(2)}m (limite ${tipoDesc}).`
        });
      }
    }
    
    // Precisão vertical (Z)
    const sigZ = v.sigmaZ ?? 0;
    if (sigZ > 0.30) {
      const limite = obterTipoLimiteEfetivo(v, tecnico?.tipoLimite);
      if (limite.startsWith('LA')) {
        out.push({
          nivel: 'ok',
          campo: 'precisão Z',
          msg: `Vértice ${nomeV}: precisão vertical de ${sigZ.toFixed(2)}m excede a recomendação de 0.30m para limites artificiais.`
        });
      }
    }
  }

  if (out.length === 0) out.push({ nivel: 'ok', campo: 'geral', msg: 'Nenhum problema encontrado.' });
  return out;
}

/**
 * Valores efetivos usados nas peças: se o usuário marcou usar os valores oficiais do SIGEF e
 * eles existem, prevalecem sobre os calculados. Garante que memorial, planta e ODS batam com
 * a certificação.
 */
export function valoresEfetivos(res: ResultadoCalculo, imovel: ImovelData): {
  areaHa: number; areaM2: number; perimetro: number;
  fonte: 'SIGEF' | 'misto' | 'calculado';
  fonteArea: 'SIGEF' | 'calculado'; fontePerimetro: 'SIGEF' | 'calculado';
} {
  if (imovel.usarValoresSigef && imovel.areaSigefHa != null && imovel.areaSigefHa > 0) {
    const temPerim = imovel.perimetroSigef != null && imovel.perimetroSigef > 0;
    const fontePerimetro = temPerim ? 'SIGEF' : 'calculado';
    return {
      areaHa: imovel.areaSigefHa,
      areaM2: imovel.areaSigefHa * 10000,
      perimetro: temPerim ? (imovel.perimetroSigef as number) : res.perimetro,
      // só 'SIGEF' quando AMBOS vêm do SIGEF; senão é 'misto' (área oficial, perímetro calculado)
      fonte: temPerim ? 'SIGEF' : 'misto',
      fonteArea: 'SIGEF',
      fontePerimetro,
    };
  }
  return { areaHa: res.areaHa, areaM2: res.areaM2, perimetro: res.perimetro, fonte: 'calculado', fonteArea: 'calculado', fontePerimetro: 'calculado' };
}

export interface ConflitoDivisa {
  ladoIdx: number;
  tipo: 'sobreposicao' | 'vao';
  distancia: number;
  referenciaIdx: number;
  pontoConflito: { leste: number; norte: number; lat: number; lon: number };
}

export function detectarConflitosDivisas(
  vertices: Vertex[],
  referencias: { leste: number; norte: number; lat: number; lon: number }[][]
): ConflitoDivisa[] {
  const conflitos: ConflitoDivisa[] = [];
  const n = vertices.length;
  if (n < 3 || referencias.length === 0) return [];

  const pointInPolygon = (x: number, y: number, poly: { leste: number; norte: number }[]): boolean => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].leste, yi = poly[i].norte;
      const xj = poly[j].leste, yj = poly[j].norte;
      const intersect = ((yi > y) !== (yj > y))
          && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const distToSegment = (mx: number, my: number, cx: number, cy: number, dx: number, dy: number) => {
    const l2 = Math.pow(cx - dx, 2) + Math.pow(cy - dy, 2);
    if (l2 === 0) return { dist: Math.hypot(mx - cx, my - cy), px: cx, py: cy };
    let t = ((mx - cx) * (dx - cx) + (my - cy) * (dy - cy)) / l2;
    t = Math.max(0, Math.min(1, t));
    const px = cx + t * (dx - cx);
    const py = cy + t * (dy - cy);
    return { dist: Math.hypot(mx - px, my - py), px, py };
  };

  for (let i = 0; i < n; i++) {
    const v1 = vertices[i];
    const v2 = vertices[(i + 1) % n];
    
    const mx = (v1.leste + v2.leste) / 2;
    const my = (v1.norte + v2.norte) / 2;
    const mlat = (v1.lat + v2.lat) / 2;
    const mlon = (v1.lon + v2.lon) / 2;

    let melhorDist = Infinity;
    let refIdxConflict = -1;
    let refPtConflict = { leste: mx, norte: my };

    referencias.forEach((refRing, rIdx) => {
      const lenR = refRing.length;
      for (let j = 0; j < lenR; j++) {
        const p1 = refRing[j];
        const p2 = refRing[(j + 1) % lenR];
        
        const { dist, px, py } = distToSegment(mx, my, p1.leste, p1.norte, p2.leste, p2.norte);
        if (dist < melhorDist) {
          melhorDist = dist;
          refIdxConflict = rIdx;
          refPtConflict = { leste: px, norte: py };
        }
      }
    });

    if (melhorDist >= 0.05 && melhorDist <= 3.0 && refIdxConflict !== -1) {
      const refRing = referencias[refIdxConflict];
      const isInside = pointInPolygon(mx, my, refRing);
      
      conflitos.push({
        ladoIdx: i,
        tipo: isInside ? 'sobreposicao' : 'vao',
        distancia: melhorDist,
        referenciaIdx: refIdxConflict,
        pontoConflito: {
          leste: (mx + refPtConflict.leste) / 2,
          norte: (my + refPtConflict.norte) / 2,
          lat: mlat,
          lon: mlon,
        }
      });
    }
  }

  return conflitos;
}
