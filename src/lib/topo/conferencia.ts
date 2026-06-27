import type { Vertex, ImovelData, ResultadoCalculo } from './types';

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
export function conferir(vertices: Vertex[], res: ResultadoCalculo | null, imovel: ImovelData): Problema[] {
  const out: Problema[] = [];

  if (vertices.length < 3) {
    out.push({ nivel: 'erro', campo: 'poligonal', msg: 'A poligonal precisa de ao menos 3 vértices.' });
    return out;
  }

  // vértices duplicados / muito próximos (< 5 cm)
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      const d = Math.hypot(vertices[i].leste - vertices[j].leste, vertices[i].norte - vertices[j].norte);
      if (d < 0.05) {
        out.push({ nivel: 'erro', campo: 'vértices', msg: `Vértices ${vertices[i].codigoSigef || i + 1} e ${vertices[j].codigoSigef || j + 1} estão sobrepostos (${d.toFixed(3)} m).` });
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
