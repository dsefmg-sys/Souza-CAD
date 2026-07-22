import type { RawPoint, Vertex, TecnicoData } from './types';
import { ehDivisa } from './parseTxt';
import { utmParaGeo } from './coords';
import { TIPO_LIMITE_PADRAO, METODO_PADRAO } from './sigefVocab';

/**
 * Quantas casas decimais significativas tem o número. Usado para detectar perda de precisão:
 * um valor UTM com 3 casas (mm) é o esperado de campo; 0-2 casas indica que a coordenada
 * chegou truncada/arredondada da fonte (TXT do GNSS configurado pra poucas casas, GML com
 * lat/lon de baixa resolução, KML, ou edição manual no editor de vértices).
 *
 * Tolera notação científica (1.5e6) tratando só a parte fracionária visível — improvável
 * para UTM em metros, mas não custa defender.
 */
export function casasDecimais(n: number): number {
  if (!Number.isFinite(n) || n === 0) return 0;
  const s = Math.abs(n).toString();
  if (s.includes('e') || s.includes('E')) {
    const [, exp] = s.split(/[eE]/);
    const mantissa = s.split(/[eE]/)[0];
    const [, frac = ''] = mantissa.split('.');
    const e = parseInt(exp, 10);
    // posição da última casa fracionária do número "real"
    return Math.max(0, frac.length - e);
  }
  const i = s.indexOf('.');
  if (i < 0) return 0;
  return s.length - i - 1;
}

/**
 * Sugestão de correção de precisão: casa cada vértice atual com o ponto mais próximo do TXT
 * e marca apenas os casos em que o ponto do TXT traz MAIS casas decimais (logo, mais precisão).
 * Não mexe em vértice que já está no mesmo nível (ou melhor) de precisão que o TXT — pra
 * atualização ser segura, sem regredir nada.
 *
 * Tolerância pequena (10 cm por padrão) garante que só vamos trocar coordenadas de quem é
 * praticamente o MESMO ponto físico, evitando sobrescrever um vértice que o usuário moveu
 * de propósito (ex.: vértice virtual por interseção, ou ponto editado à mão).
 */
export interface CorrecaoPrecisao {
  verticeId: string;
  codigo: string;       // identificação amigável (codigoSigef ou nome) p/ relatório
  antes: { leste: number; norte: number; elevacao: number };
  depois: { leste: number; norte: number; elevacao: number };
  distanciaM: number;   // distância entre antes e depois (sempre ≤ toleranciaM)
  pontoTxtIdx: number;  // índice no array de pontos do TXT
  motivo: 'leste' | 'norte' | 'elevacao' | 'leste+norte' | 'leste+elevacao' | 'norte+elevacao' | 'todos';
}

export interface OpcCasamento {
  /** Tolerância POR EIXO em metros (|E_v - E_p| E |N_v - N_p| têm que caber aqui). Default 0.5m.
   * Cobre o pior caso de arredondamento (0 casas no TXT vs 3 casas reais = até 0.5m de erro
   * em cada eixo). Usar tolerância por eixo — e não raio — evita casar um vértice que esteja
   * 0.01m ao norte mas 0.4m a oeste com o ponto errado. */
  toleranciaEixoM?: number;
  /** Se true, também atualiza a elevação quando o TXT trouxer uma cota com mais casas. Default true. */
  corrigirElevacao?: boolean;
}

export function correcoesPrecisaoViaTxt(
  vertices: Vertex[],
  pontosTxt: RawPoint[],
  opcoes: OpcCasamento = {}
): CorrecaoPrecisao[] {
  const tol = opcoes.toleranciaEixoM ?? 0.5;
  const corrigirElevacao = opcoes.corrigirElevacao ?? true;
  // Cada ponto do TXT só casa com UM vértice — evita que dois vértices próximos herdem a
  // mesma coordenada e, pior, que o segundo "roube" a correção do primeiro.
  const usados = new Set<number>();
  const out: CorrecaoPrecisao[] = [];
  for (const v of vertices) {
    if (!Number.isFinite(v.leste) || !Number.isFinite(v.norte)) continue;
    let melhorIdx = -1;
    let melhorD = Infinity;
    for (let i = 0; i < pontosTxt.length; i++) {
      if (usados.has(i)) continue;
      const p = pontosTxt[i];
      if (!Number.isFinite(p.leste) || !Number.isFinite(p.norte)) continue;
      const d = Math.hypot(p.leste - v.leste, p.norte - v.norte);
      if (d < melhorD) { melhorD = d; melhorIdx = i; }
    }
    if (melhorIdx < 0) continue;
    const p = pontosTxt[melhorIdx];
    // Filtro de casamento: as diferenças POR EIXO têm que caber na tolerância. Distância
    // total pequena mas um eixo muito deslocado (ex.: 0.4m de raio num ponto 1m ao norte
    // e 0.001m a leste) não é o mesmo ponto físico.
    if (Math.abs(p.leste - v.leste) > tol || Math.abs(p.norte - v.norte) > tol) continue;
    const temLeste = casasDecimais(p.leste) > casasDecimais(v.leste) && p.leste !== v.leste;
    const temNorte = casasDecimais(p.norte) > casasDecimais(v.norte) && p.norte !== v.norte;
    const temElev = corrigirElevacao
      && Number.isFinite(p.elevacao)
      && Number.isFinite(v.elevacao)
      && casasDecimais(p.elevacao) > casasDecimais(v.elevacao)
      && p.elevacao !== v.elevacao;
    if (!temLeste && !temNorte && !temElev) continue; // TXT não traz ganho de precisão aqui
    usados.add(melhorIdx);
    const partes: string[] = [];
    if (temLeste) partes.push('leste');
    if (temNorte) partes.push('norte');
    if (temElev) partes.push('elevacao');
    out.push({
      verticeId: v.id,
      codigo: v.codigoSigef || v.nome || v.id,
      antes: { leste: v.leste, norte: v.norte, elevacao: v.elevacao },
      // `depois` traz o valor NOVO só nas dimensões que vão ser atualizadas; nas outras,
      // mantém o valor original pra `aplicarCorrecoesPrecisao` não regredir a precisão.
      depois: {
        leste: temLeste ? p.leste : v.leste,
        norte: temNorte ? p.norte : v.norte,
        elevacao: temElev ? p.elevacao : v.elevacao,
      },
      distanciaM: melhorD,
      pontoTxtIdx: melhorIdx,
      motivo: partes.join('+') as CorrecaoPrecisao['motivo'],
    });
  }
  return out;
}

/**
 * Aplica um conjunto de correções aos vértices. Atualiza E/N (e opcionalmente a elevação)
 * com o valor do TXT, e re-deriva lat/lon pela conversão UTM→geo pra manter consistência.
 * NÃO recalcula o sentido, código SIGEF ou ordem — só os números.
 */
export function aplicarCorrecoesPrecisao(
  vertices: Vertex[],
  correcoes: CorrecaoPrecisao[],
  zona: number,
  hemisferio: 'N' | 'S'
): Vertex[] {
  if (correcoes.length === 0) return vertices;
  const mapa = new Map(correcoes.map((c) => [c.verticeId, c.depois]));
  return vertices.map((v) => {
    const c = mapa.get(v.id);
    if (!c) return v;
    const { lat, lon } = utmParaGeo(c.leste, c.norte, zona, hemisferio);
    return { ...v, leste: c.leste, norte: c.norte, elevacao: c.elevacao, lat, lon };
  });
}

let _seq = 0;
function uid(prefixo: string) {
  _seq += 1;
  return `${prefixo}_${_seq}_${Math.floor(performance.now ? performance.now() : 0)}`;
}

/**
 * Converte os pontos de perímetro em vértices: gera lat/lon, marca M/P e atribui o código
 * SIGEF (ex.: COIN-M-0017). Os contadores iniciais e o prefixo vêm das Configurações.
 */
export function montarVertices(
  pontos: RawPoint[],
  zona: number,
  hemisferio: 'N' | 'S',
  tecnico: Pick<TecnicoData, 'credenciamentoIncra' | 'contadorMarco' | 'contadorPonto'> &
    Partial<Pick<TecnicoData, 'metodoPosicionamento' | 'tipoLimite'>>
): Vertex[] {
  let nMarco = tecnico.contadorMarco;
  let nPonto = tecnico.contadorPonto;
  const prefixo = tecnico.credenciamentoIncra || 'VER'; // neutro: nunca usar o credenciamento de outro (ex.: do dono). Cada RT informa o seu.
  const metodo = tecnico.metodoPosicionamento || METODO_PADRAO;
  const tipoLimite = tecnico.tipoLimite || TIPO_LIMITE_PADRAO;

  return pontos.map((p, i) => {
    const { lat, lon } = utmParaGeo(p.leste, p.norte, zona, hemisferio);
    const isDivisa = ehDivisa(p.codigo);
    const tipo: 'M' | 'P' = isDivisa ? 'M' : 'P';
    const numero = tipo === 'M' ? nMarco++ : nPonto++;
    const codigoSigef = `${prefixo}-${tipo}-${String(numero).padStart(4, '0')}`;
    return {
      id: uid('v'),
      ordem: i,
      nome: p.nome,
      codigoCampo: p.codigo,
      norte: p.norte,
      leste: p.leste,
      elevacao: p.elevacao,
      elevacaoOriginal: p.elevacao,
      lat,
      lon,
      tipo,
      metodo: p.metodo || metodo, // método informado em campo tem prioridade sobre o padrão
      tipoLimite,
      representacao: undefined,
      codigoSigef,
      isDivisa,
      ...(Number.isFinite(p.sigmaX) ? { sigmaX: p.sigmaX } : {}),
      ...(Number.isFinite(p.sigmaY) ? { sigmaY: p.sigmaY } : {}),
      ...(Number.isFinite(p.sigmaZ) ? { sigmaZ: p.sigmaZ } : {}),
    };
  });
}

/** Renumera/reordena os vértices após uma edição (mantém códigos, recalcula `ordem`). */
export function reordenar(vertices: Vertex[]): Vertex[] {
  return vertices.map((v, i) => ({ ...v, ordem: i }));
}

/**
 * Recalcula lat/lon de todos os vértices a partir do UTM, ao trocar o fuso.
 *
 * INVARIANTE: o par (Leste,Norte) do TXT é o dado bruto canônico; lat/lon é DERIVADO do fuso
 * escolhido. Trocar o fuso = "estas coordenadas E/N foram exportadas no fuso X" → re-derivamos
 * lat/lon de E/N com o novo fuso. É exatamente o que o fluxo de importação + âncora do município
 * precisa: importou no fuso-base (errado) e, ao escolher o fuso certo, lat/lon passa a ficar
 * correto. (Por isso NÃO se deve recomputar E/N a partir de lat/lon aqui — isso congelaria um
 * lat/lon derivado de um palpite errado de fuso.)
 */
export function reprojetar(vertices: Vertex[], zona: number, hemisferio: 'N' | 'S'): Vertex[] {
  return vertices.map((v) => {
    const { lat, lon } = utmParaGeo(v.leste, v.norte, zona, hemisferio);
    return { ...v, lat, lon };
  });
}

/**
 * Reatribui os códigos SIGEF a todos os vértices na ordem atual, respeitando o tipo M/P
 * de cada um e os contadores iniciais. Use após inserir/apagar/trocar tipo de vértices.
 */
export function recodificar(
  vertices: Vertex[],
  prefixo: string,
  contadorMarco: number,
  contadorPonto: number
): Vertex[] {
  let nM = contadorMarco;
  let nP = contadorPonto;
  const pref = prefixo || 'VER';
  return vertices.map((v, i) => {
    const numero = v.tipo === 'M' ? nM++ : nP++;
    const cod = `${pref}-${v.tipo}-${String(numero).padStart(4, '0')}`.toUpperCase();
    return { ...v, ordem: i, codigoSigef: cod, nome: cod, codigoCampo: cod };
  });
}

let _uidNovo = 0;
/** Cria um vértice novo (inserção manual) a partir de lat/lon/UTM. */
export function novoVertice(
  dados: { lat: number; lon: number; leste: number; norte: number; elevacao: number }
): Vertex {
  _uidNovo += 1;
  return {
    id: `vn_${Date.now().toString(36)}_${_uidNovo}`,
    ordem: 0,
    nome: 'novo',
    codigoCampo: '',
    norte: dados.norte,
    leste: dados.leste,
    elevacao: dados.elevacao,
    elevacaoOriginal: dados.elevacao,
    lat: dados.lat,
    lon: dados.lon,
    tipo: 'P',
    codigoSigef: '',
    isDivisa: false,
  };
}

/** Inverte o sentido do anel (horário <-> anti-horário). */
export function inverterSentido(vertices: Vertex[]): Vertex[] {
  const inv = [...vertices].reverse();
  return reordenar(inv);
}

/**
 * Ordena o anel como manda a praxe do georreferenciamento: começa no vértice mais ao NORTE e
 * percorre no sentido HORÁRIO. Não renumera (faça `recodificar`/`atribuirProvisorio` depois).
 */
export function iniciarDoNorteHorario(vertices: Vertex[]): Vertex[] {
  if (vertices.length < 3) return reordenar(vertices);
  // Orientação pela área assinada no plano UTM (E = x, N = y). >0 = anti-horário → inverter.
  let area2 = 0;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i], b = vertices[(i + 1) % vertices.length];
    area2 += a.leste * b.norte - b.leste * a.norte;
  }
  let anel = area2 > 0 ? [...vertices].reverse() : [...vertices];
  
  const valorNorte = (v: Vertex) => {
    if (Number.isFinite(v.lat) && v.lat !== 0) return v.lat;
    if (Number.isFinite(v.norte) && v.norte !== 0) return v.norte;
    return 0;
  };
  const valorLeste = (v: Vertex) => {
    if (Number.isFinite(v.lon) && v.lon !== 0) return v.lon;
    if (Number.isFinite(v.leste) && v.leste !== 0) return v.leste;
    return 0;
  };

  let idx = 0;
  for (let i = 1; i < anel.length; i++) {
    const v = anel[i], m = anel[idx];
    const nV = valorNorte(v);
    const nM = valorNorte(m);
    const diffN = nV - nM;

    if (diffN > 1e-6) {
      idx = i;
    } else if (Math.abs(diffN) <= 1e-6) {
      // Em caso de empate de Norte, desempata pelo mais a LESTE (maior Leste / maior Longitude)
      if (valorLeste(v) > valorLeste(m)) {
        idx = i;
      }
    }
  }
  anel = [...anel.slice(idx), ...anel.slice(0, idx)];
  return reordenar(anel);
}

/** Define qual vértice é o inicial, rotacionando o anel. */
export function definirInicio(vertices: Vertex[], id: string): Vertex[] {
  const idx = vertices.findIndex((v) => v.id === id);
  if (idx <= 0) return reordenar(vertices);
  return reordenar([...vertices.slice(idx), ...vertices.slice(0, idx)]);
}
