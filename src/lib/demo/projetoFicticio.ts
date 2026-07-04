import type { Vertex, Confrontante, ImovelData, RawPoint } from '../topo/types';
import { montarVertices } from '../topo/vertices';
import { montarConfrontantes } from '../topo/confrontantes';

// Projeto de DEMONSTRAÇÃO ALEATORIZADO: preenche um imóvel completo e fictício
// situado em Minas Gerais (fuso 23S). Gera nomes, CPFs, e polígonos de forma
// aleatória em cada clique para facilitar a gravação de vídeos tutoriais e testes.
// Tudo aqui é inventado e as peças saem marcadas como "DADOS FICTÍCIOS" (imovel.ficticio = true).

const ZONA = 23;
const HEMISFERIO: 'N' | 'S' = 'S';

/**
 * Gera um CPF matematicamente válido com dígitos verificadores corretos
 * para passar na validação e evitar alertas de CPF inválido no app.
 */
function gerarCpfValido(): string {
  const d = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  
  // Primeiro dígito verificador
  let s1 = 0;
  for (let i = 0; i < 9; i++) s1 += d[i] * (10 - i);
  let dv1 = 11 - (s1 % 11);
  if (dv1 >= 10) dv1 = 0;
  d.push(dv1);
  
  // Segundo dígito verificador
  let s2 = 0;
  for (let i = 0; i < 10; i++) s2 += d[i] * (11 - i);
  let dv2 = 11 - (s2 % 11);
  if (dv2 >= 10) dv2 = 0;
  d.push(dv2);
  
  // Formata: 000.000.000-00
  return `${d[0]}${d[1]}${d[2]}.${d[3]}${d[4]}${d[5]}.${d[6]}${d[7]}${d[8]}-${d[9]}${d[10]}`;
}

// Hexágono base de ~3,6 ha numa área rural genérica de MG (fuso 23S).
const PONTOS_BASE: { leste: number; norte: number; codigo: string }[] = [
  { leste: 650000, norte: 7680000, codigo: 'DIVISA JOAO BATISTA X ANTONIO CARLOS FERREIRA' },
  { leste: 650205, norte: 7680030, codigo: 'MATA' },
  { leste: 650240, norte: 7679850, codigo: 'DIVISA ANTONIO CARLOS FERREIRA X RITA DE CASSIA SOUZA' },
  { leste: 650090, norte: 7679745, codigo: 'CERCA' },
  { leste: 649915, norte: 7679820, codigo: 'DIVISA RITA DE CASSIA SOUZA X CORREGO SANTA RITA' },
  { leste: 649950, norte: 7679960, codigo: 'CORREGO' },
];

const IMOVEIS = [
  'Sítio Santa Rita', 'Fazenda Primavera', 'Sítio São José', 'Chácara Bela Vista',
  'Fazenda Santa Maria', 'Sítio Santo Antônio', 'Fazenda Boa Esperança', 'Sítio Alvorada',
  'Chácara Recanto Verde', 'Estância Paraíso', 'Fazenda Vale do Sol', 'Fazenda Veredas',
  'Sítio Cachoeira', 'Fazenda Recanto Feliz', 'Estância Vale Verde', 'Sítio Recanto Alegre'
];

const PROPRIETARIOS = [
  { nome: 'João Batista de Oliveira', conjuge: 'Maria Aparecida de Oliveira' },
  { nome: 'Sebastião Pereira Souza', conjuge: 'Rita de Cássia Souza' },
  { nome: 'Francisco de Assis Silva', conjuge: 'Tereza Cristina Silva' },
  { nome: 'Antônio Carlos Ferreira', conjuge: 'Luciana Ferreira' },
  { nome: 'Luiz Gonzaga dos Santos', conjuge: 'Clarice Lispector Santos' },
  { nome: 'Benedito Alves Pereira', conjuge: 'Ana Maria Rodrigues' },
  { nome: 'José Cláudio da Silva', conjuge: 'Mariana Santos Silva' }
];

const MUNICIPIOS = [
  'Espera Feliz-MG', 'Manhuaçu-MG', 'Caratinga-MG', 'Viçosa-MG', 'Ponte Nova-MG',
  'Teófilo Otoni-MG', 'Ouro Preto-MG', 'Serro-MG', 'Diamantina-MG', 'Guanhães-MG',
  'Ubá-MG', 'Lafaiete-MG', 'Ipatinga-MG', 'Governador Valadares-MG'
];

const CONFRONTANTES_NOMES = [
  'Carlos Drummond de Andrade', 'Mário de Andrade', 'Guimarães Rosa',
  'Adilson Braga Amorim', 'Valderis Amorim Pena', 'José Claudio da Silva',
  'Rita de Cássia Souza', 'Antônio Carlos Ferreira', 'Benedito Alves Pereira',
  'Geraldo Alvarenga', 'Maria das Dores', 'Sebastião Antunes', 'Otávio Mesquita'
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
  // Variantes geométricas aleatórias: escala, rotação e translação
  const offsetLeste = Math.floor((Math.random() - 0.5) * 4000);
  const offsetNorte = Math.floor((Math.random() - 0.5) * 4000);
  const escala = 0.75 + Math.random() * 0.55; // varia tamanho da área
  const angulo = Math.random() * 2 * Math.PI; // rotaciona a figura

  const cxOrig = PONTOS_BASE.reduce((s, p) => s + p.leste, 0) / PONTOS_BASE.length;
  const cyOrig = PONTOS_BASE.reduce((s, p) => s + p.norte, 0) / PONTOS_BASE.length;

  const raw: RawPoint[] = PONTOS_BASE.map((p, i) => {
    const dx = p.leste - cxOrig;
    const dy = p.norte - cyOrig;
    // Rotação geométrica
    const rx = dx * Math.cos(angulo) - dy * Math.sin(angulo);
    const ry = dx * Math.sin(angulo) + dy * Math.cos(angulo);
    // Escala e deslocamento
    const leste = Math.round(cxOrig + rx * escala + offsetLeste);
    const norte = Math.round(cyOrig + ry * escala + offsetNorte);

    return {
      nome: String(i + 1), codigo: p.codigo, norte, leste, elevacao: 820 + i * (0.8 + Math.random() * 0.4),
      status: 'FIXED', isBase: false, isSingle: false, sigmaX: 0.01, sigmaY: 0.01, sigmaZ: 0.02,
    };
  });

  const vertices = montarVertices(raw, ZONA, HEMISFERIO, TEC_DEMO);
  // cada divisa recebe um tipo de representação de exemplo (mostra as convenções na planta)
  const reps = ['cerca', 'mata', 'estrada', 'cerca', 'corrego', 'corrego'];
  vertices.forEach((v, i) => { v.representacao = reps[i] === 'mata' ? 'linha-ideal' : reps[i]; });
  const { confrontantes, confrontantePorLado } = montarConfrontantes(vertices);

  // Preenche dados dos confrontantes com nomes e CPFs aleatórios
  const nomesRestantes = [...CONFRONTANTES_NOMES];
  for (const c of confrontantes) {
    if (/corrego/i.test(c.nome)) {
      c.nome = 'Córrego Santa Rita';
      c.condicao = 'posseiro';
    } else {
      const idx = Math.floor(Math.random() * nomesRestantes.length);
      const nomeEscolhido = nomesRestantes.splice(idx, 1)[0] || 'Confrontante Temporário';
      c.nome = nomeEscolhido;
      c.cpf = gerarCpfValido();
      c.matricula = String(Math.floor(1000 + Math.random() * 9000));
      c.cns = '01.234-5';
    }
  }

  // Preenche dados do Imóvel e Proprietário aleatórios
  const selectedImovel = IMOVEIS[Math.floor(Math.random() * IMOVEIS.length)];
  const prop = PROPRIETARIOS[Math.floor(Math.random() * PROPRIETARIOS.length)];
  const mun = MUNICIPIOS[Math.floor(Math.random() * MUNICIPIOS.length)];

  const imovel: ImovelData = {
    denominacao: selectedImovel,
    matricula: String(Math.floor(1000 + Math.random() * 9000)),
    cns: '01.234-5',
    codigoImovelIncra: '9012' + Math.floor(100000000 + Math.random() * 900000000),
    proprietario: prop.nome,
    cpfProprietario: gerarCpfValido(),
    conjugeProprietario: prop.conjuge,
    cpfConjugeProprietario: gerarCpfValido(),
    tipoPessoa: 'Física',
    municipio: mun,
    local: `Córrego Principal, Zona Rural, ${mun}`,
    naturezaServico: 'Georreferenciamento',
    situacao: 'Imóvel Registrado',
    naturezaArea: 'Particular',
    numeroTrt: 'MG-' + (2025 + Math.floor(Math.random() * 3)) + '-' + String(Math.floor(1000000 + Math.random() * 9000000)),
    ficticio: true,
  };

  return { nome: `${selectedImovel} (demonstração)`, imovel, vertices, confrontantes, confrontantePorLado, zona: ZONA, hemisferio: HEMISFERIO };
}
