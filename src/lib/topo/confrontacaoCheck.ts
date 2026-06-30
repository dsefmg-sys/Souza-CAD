import { Vertex } from './types';

interface VizinhoGleba {
  nome: string;
  pts: { leste: number; norte: number }[];
}

export interface ResultadoConfrontacao {
  nomeVizinho: string;
  temSobreposicao: boolean;
  detalhe: string;
  tipo: 'OK' | 'ALERTA' | 'PERIGO';
}

/**
 * Determina se um ponto está dentro de um polígono usando o algoritmo de Ray-Casting.
 */
export function pontoNoPoligono(pt: { leste: number; norte: number }, poly: { leste: number; norte: number }[]): boolean {
  if (poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].leste, yi = poly[i].norte;
    const xj = poly[j].leste, yj = poly[j].norte;
    
    const intersect = ((yi > pt.norte) !== (yj > pt.norte))
        && (pt.leste < (xj - xi) * (pt.norte - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Auxiliar para determinar orientação horária/anti-horária de 3 pontos.
 */
function ccw(a: { leste: number; norte: number }, b: { leste: number; norte: number }, c: { leste: number; norte: number }): boolean {
  return (c.norte - a.norte) * (b.leste - a.leste) > (b.norte - a.norte) * (c.leste - a.leste);
}

/**
 * Retorna true se os segmentos AB e CD se intersectam no seu interior.
 * Ignora se eles compartilham exatamente as coordenadas de um vértice.
 */
export function segmentosSeCruzam(
  a: { leste: number; norte: number }, b: { leste: number; norte: number },
  c: { leste: number; norte: number }, d: { leste: number; norte: number }
): boolean {
  const tol = 1e-4; // tolerância para ponto coincidente
  const coincide = (p1: { leste: number; norte: number }, p2: { leste: number; norte: number }) => 
    Math.abs(p1.leste - p2.leste) < tol && Math.abs(p1.norte - p2.norte) < tol;

  if (coincide(a, c) || coincide(a, d) || coincide(b, c) || coincide(b, d)) {
    return false;
  }

  return (ccw(a, c, d) !== ccw(b, c, d)) && (ccw(a, b, c) !== ccw(a, b, d));
}

/**
 * Analisa as confrontações da gleba principal contra as demais glebas/vizinhos carregados.
 */
export function analisarSobreposicoes(
  vertices: Vertex[],
  vizinhos: VizinhoGleba[]
): ResultadoConfrontacao[] {
  const ptsAtivos = vertices.filter((v) => Number.isFinite(v.leste) && Number.isFinite(v.norte));
  if (ptsAtivos.length < 3) {
    return [
      {
        nomeVizinho: 'Projeto Principal',
        temSobreposicao: false,
        detalhe: 'Número insuficiente de vértices ativos para análise.',
        tipo: 'ALERTA',
      },
    ];
  }

  if (vizinhos.length === 0) {
    return [];
  }

  return vizinhos.map((viz) => {
    const ptsViz = viz.pts.filter((p) => Number.isFinite(p.leste) && Number.isFinite(p.norte));
    if (ptsViz.length < 3) {
      return {
        nomeVizinho: viz.nome || 'Confrontante Sem Nome',
        temSobreposicao: false,
        detalhe: 'Parceiro de confrontação com geometria inválida ou insuficiente.',
        tipo: 'ALERTA',
      };
    }

    // 1. Verificar cruzamento de divisas (segmentos que se intersectam)
    let cruzamentos = 0;
    for (let i = 0; i < ptsAtivos.length; i++) {
      const a = ptsAtivos[i];
      const b = ptsAtivos[(i + 1) % ptsAtivos.length];
      for (let j = 0; j < ptsViz.length; j++) {
        const c = ptsViz[j];
        const d = ptsViz[(j + 1) % ptsViz.length];
        if (segmentosSeCruzam(a, b, c, d)) {
          cruzamentos++;
        }
      }
    }

    if (cruzamentos > 0) {
      return {
        nomeVizinho: viz.nome || 'Confrontante Certificado',
        temSobreposicao: true,
        detalhe: `Sobreposição detectada: as linhas perimetrais se cruzam em ${cruzamentos} ponto(s).`,
        tipo: 'PERIGO',
      };
    }

    // 2. Verificar se algum vértice do imóvel principal está DENTRO do vizinho
    let ptsDentro = 0;
    for (const pt of ptsAtivos) {
      if (pontoNoPoligono(pt, ptsViz)) {
        ptsDentro++;
      }
    }

    if (ptsDentro > 0) {
      return {
        nomeVizinho: viz.nome || 'Confrontante Certificado',
        temSobreposicao: true,
        detalhe: `Sobreposição detectada: ${ptsDentro} vértice(s) do seu imóvel estão localizados dentro do limite desta parcela.`,
        tipo: 'PERIGO',
      };
    }

    // 3. Verificar se o vizinho está DENTRO do imóvel principal
    let vizDentro = 0;
    for (const pt of ptsViz) {
      if (pontoNoPoligono(pt, ptsAtivos)) {
        vizDentro++;
      }
    }

    if (vizDentro > 0) {
      return {
        nomeVizinho: viz.nome || 'Confrontante Certificado',
        temSobreposicao: true,
        detalhe: `Sobreposição detectada: parcela vizinha está contida dentro dos limites medidos do seu imóvel.`,
        tipo: 'PERIGO',
      };
    }

    // Se passou por todas as checagens e não há sobreposição
    return {
      nomeVizinho: viz.nome || 'Confrontante Certificado',
      temSobreposicao: false,
      detalhe: 'Limites limpos. Divisas adjacentes ou não coincidentes sem invasão de área.',
      tipo: 'OK',
    };
  });
}
