import type { Vertex, Confrontante, ImovelData, RawPoint } from '../topo/types';
import { montarVertices } from '../topo/vertices';
import { montarConfrontantes } from '../topo/confrontantes';

// Projeto de DEMONSTRAÇÃO: preenche um imóvel completo e fictício, situado em Minas Gerais
// (fuso 23S), para o dono usar em apresentações e enviar peças de exemplo. Tudo aqui é inventado
// e as peças saem marcadas como "DADOS FICTÍCIOS" (imovel.ficticio = true).

const ZONA = 23;
const HEMISFERIO: 'N' | 'S' = 'S';

// Hexágono de ~3,6 ha numa área rural genérica de MG (fuso 23S). Cada troca de divisa (marco M)
// carrega o nome do confrontante daquele trecho no "codigo", pra montarConfrontantes reconhecer.
const PONTOS: { leste: number; norte: number; codigo: string }[] = [
  { leste: 650000, norte: 7680000, codigo: 'DIVISA JOSE DEMONSTRACAO X ANTONIO EXEMPLO' },
  { leste: 650205, norte: 7680030, codigo: 'MATA' },
  { leste: 650240, norte: 7679850, codigo: 'DIVISA ANTONIO EXEMPLO X MARIA MODELO' },
  { leste: 650090, norte: 7679745, codigo: 'CERCA' },
  { leste: 649915, norte: 7679820, codigo: 'DIVISA MARIA MODELO X CORREGO' },
  { leste: 649950, norte: 7679960, codigo: 'CORREGO' },
];

const TEC_DEMO = { credenciamentoIncra: 'COIN', contadorMarco: 10, contadorPonto: 60, metodoPosicionamento: 'PG6', tipoLimite: 'LA6' };

export interface ProjetoFicticio {
  nome: string;
  imovel: ImovelData;
  vertices: Vertex[];
  confrontantes: Confrontante[];
  confrontantePorLado: Record<number, string>;
  zona: number;
  hemisferio: 'N' | 'S';
}

export function gerarProjetoFicticio(): ProjetoFicticio {
  const raw: RawPoint[] = PONTOS.map((p, i) => ({
    nome: String(i + 1), codigo: p.codigo, norte: p.norte, leste: p.leste, elevacao: 820 + i,
    status: 'FIXED', isBase: false, isSingle: false, sigmaX: 0.01, sigmaY: 0.01, sigmaZ: 0.02,
  }));
  const vertices = montarVertices(raw, ZONA, HEMISFERIO, TEC_DEMO);
  // cada divisa recebe um tipo de representação de exemplo (mostra as convenções na planta)
  const reps = ['cerca', 'mata', 'estrada', 'cerca', 'corrego', 'corrego'];
  vertices.forEach((v, i) => { v.representacao = reps[i] === 'mata' ? 'linha-ideal' : reps[i]; });
  const { confrontantes, confrontantePorLado } = montarConfrontantes(vertices);

  // preenche dados dos confrontantes reconhecidos pelos nomes das divisas
  for (const c of confrontantes) {
    if (/antonio/i.test(c.nome)) { c.cpf = '111.444.777-35'; c.matricula = '2451'; c.cns = '01.234-5'; }
    else if (/maria/i.test(c.nome)) { c.cpf = '529.982.247-25'; c.matricula = '1897'; c.cns = '01.234-5'; c.conjugeNome = 'Pedro Modelo'; c.conjugeCpf = '390.533.447-05'; }
    else if (/corrego/i.test(c.nome)) { c.nome = 'Córrego do Exemplo'; c.condicao = 'posseiro'; }
    else { c.cpf = '087.575.606-64'; c.matricula = '3320'; c.cns = '01.234-5'; }
  }

  const imovel: ImovelData = {
    denominacao: 'Fazenda Modelo',
    matricula: '9999',
    cns: '01.234-5',
    codigoImovelIncra: '9012345678901',
    proprietario: 'José Demonstração da Silva',
    cpfProprietario: '231.002.999-00',
    conjugeProprietario: 'Ana Demonstração da Silva',
    cpfConjugeProprietario: '648.375.190-40',
    tipoPessoa: 'Física',
    municipio: 'Espera Feliz-MG',
    local: 'Córrego do Exemplo, Zona Rural, Espera Feliz-MG',
    naturezaServico: 'Georreferenciamento',
    situacao: 'Imóvel Registrado',
    naturezaArea: 'Particular',
    numeroTrt: 'TRT-DEMO-0001',
    ficticio: true,
  };

  return { nome: 'PROJETO FICTÍCIO — DEMONSTRAÇÃO', imovel, vertices, confrontantes, confrontantePorLado, zona: ZONA, hemisferio: HEMISFERIO };
}
