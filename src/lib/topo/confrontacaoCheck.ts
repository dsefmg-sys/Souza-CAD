import { Vertex } from './types';
import { numBR } from './geometry';

interface VizinhoGleba {
  nome: string;
  pts: { leste: number; norte: number }[];
}

export interface ResultadoConfrontacao {
  nomeVizinho: string;
  temSobreposicao: boolean;
  detalhe: string;
  tipo: 'OK' | 'ALERTA' | 'PERIGO';
  /** Área estimada de sobreposição (m²) — o número por trás do "detalhe". */
  areaSobrepostaM2?: number;
  /** Quanto da ÁREA do imóvel principal está sobreposta (%). */
  percentualDoMeuImovel?: number;
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

/** Área (m²) de um polígono simples pela fórmula do agrimensor (shoelace). */
export function areaPoligonoEN(poly: { leste: number; norte: number }[]): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    a += p.leste * q.norte - q.leste * p.norte;
  }
  return Math.abs(a / 2);
}

/**
 * Estima a área (m²) de sobreposição entre dois polígonos por amostragem em grade: cobre a caixa
 * delimitadora da união dos dois com uma malha de pontos e conta quantos caem DENTRO DOS DOIS ao
 * mesmo tempo (reaproveitando `pontoNoPoligono`, testado e já usado no resto do arquivo).
 *
 * Por que não contar só vértices "dentro" do outro polígono (como a versão antiga fazia): quando
 * dois polígonos quase COINCIDEM — o caso mais grave, e o mais comum quando duas medições
 * independentes descrevem a mesma terra — a maioria dos vértices de um fica bem EM CIMA da borda
 * do outro, não claramente dentro dele. O teste ponto-a-ponto então sub-conta demais (às vezes só 1
 * ou 2 vértices, mesmo com quase toda a área sobreposta), porque a diferença entre "um pouco dentro"
 * e "um pouco fora" da borda é ruído de medição, não sinal real. Área de sobreposição não tem esse
 * problema: mede o que realmente importa pro SIGEF, quanta TERRA está sendo contada duas vezes.
 */
export function areaSobreposicaoEstimada(
  polyA: { leste: number; norte: number }[],
  polyB: { leste: number; norte: number }[],
): number {
  if (polyA.length < 3 || polyB.length < 3) return 0;
  const lestes = [...polyA, ...polyB].map((p) => p.leste);
  const nortes = [...polyA, ...polyB].map((p) => p.norte);
  const minL = Math.min(...lestes), maxL = Math.max(...lestes);
  const minN = Math.min(...nortes), maxN = Math.max(...nortes);
  const largura = maxL - minL, altura = maxN - minN;
  if (largura <= 0 || altura <= 0) return 0;

  // 160x160 = 25.600 amostras: rápido (bem abaixo de 1s mesmo em polígonos com dezenas de vértices)
  // e preciso o bastante pra um relatório de diagnóstico — não é uma medição oficial de área.
  const RES = 160;
  const passoL = largura / RES, passoN = altura / RES;
  let dentroDosDois = 0;
  for (let i = 0; i < RES; i++) {
    const leste = minL + (i + 0.5) * passoL;
    for (let j = 0; j < RES; j++) {
      const norte = minN + (j + 0.5) * passoN;
      const pt = { leste, norte };
      if (pontoNoPoligono(pt, polyA) && pontoNoPoligono(pt, polyB)) dentroDosDois++;
    }
  }
  return dentroDosDois * passoL * passoN;
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

  const areaMinha = areaPoligonoEN(ptsAtivos);

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

    // Cruzamento de divisas: ainda vale checar À PARTE da área — pega o caso de uma sobra fina que
    // cruza a linha do vizinho sem necessariamente render uma área grande na amostragem em grade.
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

    // Sinal PRINCIPAL: quanta ÁREA realmente se sobrepõe (não só quantos vértices caem dentro do
    // outro — ver o comentário de areaSobreposicaoEstimada pra entender por que isso é decisivo).
    const areaSobreposta = areaSobreposicaoEstimada(ptsAtivos, ptsViz);
    const percentualDoMeuImovel = areaMinha > 0 ? (areaSobreposta / areaMinha) * 100 : 0;

    // Contagem de vértices contidos: mantida como DETALHE complementar da mensagem, não decide
    // mais sozinha (é o que fazia o relatório antigo sub-contar drasticamente quando os polígonos
    // quase coincidem — a maioria dos vértices fica em cima da borda, não "dentro" dela).
    const ptsDentro = ptsAtivos.filter((pt) => pontoNoPoligono(pt, ptsViz)).length;
    const vizDentro = ptsViz.filter((pt) => pontoNoPoligono(pt, ptsAtivos)).length;

    const LIMIAR_PERIGO_PCT = 1; // acima disso, área sobreposta relevante — risco real de recusa no SIGEF
    const LIMIAR_ALERTA_PCT = 0.05; // sobreposição bem pequena, mas não-zero — vale checar/confirmar

    const detalheVertices = (ptsDentro || vizDentro)
      ? ` (${ptsDentro} vértice(s) seu(s) dentro do vizinho, ${vizDentro} do vizinho dentro do seu imóvel)`
      : '';
    const detalheCruzamento = cruzamentos > 0 ? ` As divisas se cruzam em ${cruzamentos} ponto(s).` : '';

    if (cruzamentos > 0 || percentualDoMeuImovel >= LIMIAR_PERIGO_PCT) {
      return {
        nomeVizinho: viz.nome || 'Confrontante Certificado',
        temSobreposicao: true,
        detalhe: `Sobreposição de área: ${numBR(areaSobreposta / 10000, 4)} ha (${numBR(percentualDoMeuImovel, 1)}% do seu imóvel) coincide com esta parcela.${detalheCruzamento}${detalheVertices}`,
        tipo: 'PERIGO',
        areaSobrepostaM2: areaSobreposta,
        percentualDoMeuImovel,
      };
    }

    if (percentualDoMeuImovel >= LIMIAR_ALERTA_PCT) {
      return {
        nomeVizinho: viz.nome || 'Confrontante Certificado',
        temSobreposicao: true,
        detalhe: `Sobreposição pequena detectada: ~${numBR(areaSobreposta, 0)} m² (${numBR(percentualDoMeuImovel, 2)}% do seu imóvel) coincide com esta parcela. Pode ser ruído de medição — vale conferir na prévia.${detalheVertices}`,
        tipo: 'ALERTA',
        areaSobrepostaM2: areaSobreposta,
        percentualDoMeuImovel,
      };
    }

    // Sem sobreposição relevante de área, sem cruzamento
    return {
      nomeVizinho: viz.nome || 'Confrontante Certificado',
      temSobreposicao: false,
      detalhe: 'Limites limpos. Divisas adjacentes ou não coincidentes sem invasão de área.',
      tipo: 'OK',
      areaSobrepostaM2: areaSobreposta,
      percentualDoMeuImovel,
    };
  });
}
