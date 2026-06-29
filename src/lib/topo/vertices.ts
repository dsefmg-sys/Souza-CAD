import type { RawPoint, Vertex, TecnicoData } from './types';
import { ehDivisa } from './parseTxt';
import { utmParaGeo } from './coords';
import { TIPO_LIMITE_PADRAO, METODO_PADRAO } from './sigefVocab';

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
  const prefixo = tecnico.credenciamentoIncra || 'COIN';
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
      lat,
      lon,
      tipo,
      metodo: p.metodo || metodo, // método informado em campo tem prioridade sobre o padrão
      tipoLimite,
      representacao: 'linha-ideal',
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
  const pref = prefixo || 'COIN';
  return vertices.map((v, i) => {
    const numero = v.tipo === 'M' ? nM++ : nP++;
    return { ...v, ordem: i, codigoSigef: `${pref}-${v.tipo}-${String(numero).padStart(4, '0')}` };
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
  // vértice mais ao norte (maior Norte; empate: mais a oeste)
  let idx = 0;
  for (let i = 1; i < anel.length; i++) {
    const v = anel[i], m = anel[idx];
    if (v.norte > m.norte || (v.norte === m.norte && v.leste < m.leste)) idx = i;
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
