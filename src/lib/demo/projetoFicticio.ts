import type { Vertex, Confrontante, ImovelData, RawPoint, Gleba } from '../topo/types';
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
  imoveis?: ImovelData[];
  vertices: Vertex[];
  confrontantes: Confrontante[];
  confrontantePorLado: Record<number, string>;
  glebas?: Gleba[];
  zona: number;
  hemisferio: 'N' | 'S';
  tipoProjeto?: 'rural' | 'loteamento';
}

export function gerarProjetoFicticio(opts?: { grande?: boolean; multiplicador?: number }): ProjetoFicticio {
  const mult = opts?.multiplicador && opts.multiplicador > 0 ? opts.multiplicador : (opts?.grande ? 1 : 0);
  const grande = opts?.grande || mult > 0;

  // Variantes geométricas aleatórias: escala, rotação e translação
  const offsetLeste = Math.floor((Math.random() - 0.5) * 4000);
  const offsetNorte = Math.floor((Math.random() - 0.5) * 4000);
  const escala = grande ? (1.5 + Math.sqrt(mult) * 0.8) : (0.75 + Math.random() * 0.55);
  const angulo = Math.random() * 2 * Math.PI; // rotaciona a figura

  const cxOrig = PONTOS_BASE.reduce((s, p) => s + p.leste, 0) / PONTOS_BASE.length;
  const cyOrig = PONTOS_BASE.reduce((s, p) => s + p.norte, 0) / PONTOS_BASE.length;

  // Se grande ou multiplicador > 0, gera polígono com número ajustável de vértices (ex: 80 a 10.000)
  let pontosFinais: typeof PONTOS_BASE;
  if (grande) {
    const numVertices = Math.max(80, Math.min(10000, Math.floor(80 * (mult || 1) + Math.random() * 20)));
    const raio = (350 + Math.random() * 200) * Math.sqrt(Math.max(1, mult)); // raio base em metros ajustado
    pontosFinais = Array.from({ length: numVertices }, (_, i) => {
      const theta = (2 * Math.PI * i) / numVertices;
      const r = raio * (0.7 + Math.random() * 0.6); // variação de raio para irregularidade
      const leste = Math.round(cxOrig + r * Math.cos(theta));
      const norte = Math.round(cyOrig + r * Math.sin(theta));
      const codigos = ['CERCA', 'MATA', 'ESTRADA', 'MURO', 'CORREGO', 'RIO', 'DIVISA', 'VALE'];
      const codigo = codigos[Math.floor(Math.random() * codigos.length)];
      return { leste, norte, codigo };
    });
  } else {
    pontosFinais = PONTOS_BASE;
  }

  const raw: RawPoint[] = pontosFinais.map((p, i) => {
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
  vertices.forEach((v, i) => { v.representacao = reps[i % reps.length] === 'mata' ? 'linha-ideal' : reps[i % reps.length]; });
  const { confrontantes, confrontantePorLado } = montarConfrontantes(vertices);

  // Preenche dados dos confrontantes com nomes e CPFs aleatórios
  const nomesRestantes = [...CONFRONTANTES_NOMES];
  for (const c of confrontantes) {
    if (/corrego/i.test(c.nome)) {
      c.nome = 'Córrego Santa Rita';
      c.condicao = 'posseiro';
    } else {
      const idx = Math.floor(Math.random() * nomesRestantes.length);
      const nomeEscolhido = nomesRestantes.splice(idx, 1)[0] || nomesRestantes.length > 0 ? nomesRestantes[0] || 'Confrontante Temporário' : 'Confrontante Temporário';
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

  // Gera 3 Glebas Confrontantes para permitir treinamento de multi-gleba
  const rawGleba1: RawPoint[] = [
    { nome: '1', codigo: 'DIVISA NORTE X CARLOS DRUMMOND', norte: Math.round(cyOrig + 200 * escala + offsetNorte), leste: Math.round(cxOrig - 100 * escala + offsetLeste), elevacao: 820, status: 'FIXED', isBase: false, isSingle: false },
    { nome: '2', codigo: 'DIVISA GLEBA 1 X GLEBA 2 (PASTAGEM)', norte: Math.round(cyOrig + 200 * escala + offsetNorte), leste: Math.round(cxOrig + 100 * escala + offsetLeste), elevacao: 825, status: 'FIXED', isBase: false, isSingle: false },
    { nome: '3', codigo: 'DIVISA TRÍPLICE GLEBA 1 X GLEBA 2 X GLEBA 3', norte: Math.round(cyOrig + 0 * escala + offsetNorte), leste: Math.round(cxOrig + 100 * escala + offsetLeste), elevacao: 832, status: 'FIXED', isBase: false, isSingle: false },
    { nome: '4', codigo: 'DIVISA GLEBA 1 X GLEBA 3 (RESERVA)', norte: Math.round(cyOrig + 0 * escala + offsetNorte), leste: Math.round(cxOrig - 100 * escala + offsetLeste), elevacao: 818, status: 'FIXED', isBase: false, isSingle: false },
    { nome: '5', codigo: 'CORREGO SANTA RITA', norte: Math.round(cyOrig + 100 * escala + offsetNorte), leste: Math.round(cxOrig - 180 * escala + offsetLeste), elevacao: 814, status: 'FIXED', isBase: false, isSingle: false },
  ];

  const rawGleba2: RawPoint[] = [
    { nome: '2', codigo: 'DIVISA GLEBA 2 X GLEBA 1 (SEDE)', norte: Math.round(cyOrig + 200 * escala + offsetNorte), leste: Math.round(cxOrig + 100 * escala + offsetLeste), elevacao: 825, status: 'FIXED', isBase: false, isSingle: false },
    { nome: '6', codigo: 'ESTRADA MUNICIPAL', norte: Math.round(cyOrig + 220 * escala + offsetNorte), leste: Math.round(cxOrig + 320 * escala + offsetLeste), elevacao: 840, status: 'FIXED', isBase: false, isSingle: false },
    { nome: '7', codigo: 'DIVISA GLEBA 2 X GLEBA 3 (RESERVA)', norte: Math.round(cyOrig - 20 * escala + offsetNorte), leste: Math.round(cxOrig + 350 * escala + offsetLeste), elevacao: 845, status: 'FIXED', isBase: false, isSingle: false },
    { nome: '3', codigo: 'DIVISA TRÍPLICE GLEBA 1 X GLEBA 2 X GLEBA 3', norte: Math.round(cyOrig + 0 * escala + offsetNorte), leste: Math.round(cxOrig + 100 * escala + offsetLeste), elevacao: 832, status: 'FIXED', isBase: false, isSingle: false },
  ];

  const rawGleba3: RawPoint[] = [
    { nome: '4', codigo: 'DIVISA GLEBA 3 X GLEBA 1 (SEDE)', norte: Math.round(cyOrig + 0 * escala + offsetNorte), leste: Math.round(cxOrig - 100 * escala + offsetLeste), elevacao: 818, status: 'FIXED', isBase: false, isSingle: false },
    { nome: '3', codigo: 'DIVISA TRÍPLICE GLEBA 1 X GLEBA 2 X GLEBA 3', norte: Math.round(cyOrig + 0 * escala + offsetNorte), leste: Math.round(cxOrig + 100 * escala + offsetLeste), elevacao: 832, status: 'FIXED', isBase: false, isSingle: false },
    { nome: '7', codigo: 'DIVISA GLEBA 3 X GLEBA 2 (PASTAGEM)', norte: Math.round(cyOrig - 20 * escala + offsetNorte), leste: Math.round(cxOrig + 350 * escala + offsetLeste), elevacao: 845, status: 'FIXED', isBase: false, isSingle: false },
    { nome: '8', codigo: 'CERCA DE ARAME FARPADO', norte: Math.round(cyOrig - 200 * escala + offsetNorte), leste: Math.round(cxOrig + 200 * escala + offsetLeste), elevacao: 838, status: 'FIXED', isBase: false, isSingle: false },
    { nome: '9', codigo: 'VALE DO SANTA RITA', norte: Math.round(cyOrig - 180 * escala + offsetNorte), leste: Math.round(cxOrig - 120 * escala + offsetLeste), elevacao: 810, status: 'FIXED', isBase: false, isSingle: false },
  ];

  const rawGleba4: RawPoint[] = [
    { nome: '5', codigo: 'DIVISA CORREGO SANTA RITA', norte: Math.round(cyOrig + 100 * escala + offsetNorte), leste: Math.round(cxOrig - 180 * escala + offsetLeste), elevacao: 814, status: 'FIXED', isBase: false, isSingle: false },
    { nome: '4', codigo: 'DIVISA TRÍPLICE GLEBA 1 X 3 X 4', norte: Math.round(cyOrig + 0 * escala + offsetNorte), leste: Math.round(cxOrig - 100 * escala + offsetLeste), elevacao: 818, status: 'FIXED', isBase: false, isSingle: false },
    { nome: '9', codigo: 'VALE DO SANTA RITA', norte: Math.round(cyOrig - 180 * escala + offsetNorte), leste: Math.round(cxOrig - 120 * escala + offsetLeste), elevacao: 810, status: 'FIXED', isBase: false, isSingle: false },
    { nome: '10', codigo: 'DIVISA GLEBA 4 X GLEBA 5 (REMANESCENTE)', norte: Math.round(cyOrig - 50 * escala + offsetNorte), leste: Math.round(cxOrig - 300 * escala + offsetLeste), elevacao: 805, status: 'FIXED', isBase: false, isSingle: false },
    { nome: '11', codigo: 'CERCA DE ARAME FARPADO', norte: Math.round(cyOrig + 120 * escala + offsetNorte), leste: Math.round(cxOrig - 280 * escala + offsetLeste), elevacao: 812, status: 'FIXED', isBase: false, isSingle: false },
  ];

  const rawGleba5: RawPoint[] = [
    { nome: '1', codigo: 'DIVISA NORTE X CARLOS DRUMMOND', norte: Math.round(cyOrig + 200 * escala + offsetNorte), leste: Math.round(cxOrig - 100 * escala + offsetLeste), elevacao: 820, status: 'FIXED', isBase: false, isSingle: false },
    { nome: '5', codigo: 'CORREGO SANTA RITA', norte: Math.round(cyOrig + 100 * escala + offsetNorte), leste: Math.round(cxOrig - 180 * escala + offsetLeste), elevacao: 814, status: 'FIXED', isBase: false, isSingle: false },
    { nome: '11', codigo: 'CERCA DE ARAME FARPADO', norte: Math.round(cyOrig + 120 * escala + offsetNorte), leste: Math.round(cxOrig - 280 * escala + offsetLeste), elevacao: 812, status: 'FIXED', isBase: false, isSingle: false },
    { nome: '12', codigo: 'MATA FECHADA', norte: Math.round(cyOrig + 300 * escala + offsetNorte), leste: Math.round(cxOrig - 250 * escala + offsetLeste), elevacao: 828, status: 'FIXED', isBase: false, isSingle: false },
    { nome: '13', codigo: 'DIVISA NORTE REMANESCENTE', norte: Math.round(cyOrig + 320 * escala + offsetNorte), leste: Math.round(cxOrig - 120 * escala + offsetLeste), elevacao: 830, status: 'FIXED', isBase: false, isSingle: false },
  ];

  const v1 = montarVertices(rawGleba1, ZONA, HEMISFERIO, TEC_DEMO);
  v1.forEach((v, i) => { v.representacao = reps[i % reps.length] === 'mata' ? 'linha-ideal' : reps[i % reps.length]; });
  const conf1 = montarConfrontantes(v1);

  const v2 = montarVertices(rawGleba2, ZONA, HEMISFERIO, TEC_DEMO);
  v2.forEach((v, i) => { v.representacao = reps[(i + 1) % reps.length] === 'mata' ? 'linha-ideal' : reps[(i + 1) % reps.length]; });
  const conf2 = montarConfrontantes(v2);

  const v3 = montarVertices(rawGleba3, ZONA, HEMISFERIO, TEC_DEMO);
  v3.forEach((v, i) => { v.representacao = reps[(i + 2) % reps.length] === 'mata' ? 'linha-ideal' : reps[(i + 2) % reps.length]; });
  const conf3 = montarConfrontantes(v3);

  const v4 = montarVertices(rawGleba4, ZONA, HEMISFERIO, TEC_DEMO);
  v4.forEach((v, i) => { v.representacao = reps[(i + 3) % reps.length] === 'mata' ? 'linha-ideal' : reps[(i + 3) % reps.length]; });
  const conf4 = montarConfrontantes(v4);

  const v5 = montarVertices(rawGleba5, ZONA, HEMISFERIO, TEC_DEMO);
  v5.forEach((v, i) => { v.representacao = reps[(i + 4) % reps.length] === 'mata' ? 'linha-ideal' : reps[(i + 4) % reps.length]; });
  const conf5 = montarConfrontantes(v5);

  // Preenche dados dos confrontantes com nomes e CPFs aleatórios
  [conf1, conf2, conf3, conf4, conf5].forEach((confObj) => {
    for (const c of confObj.confrontantes) {
      if (/corrego/i.test(c.nome)) {
        c.nome = 'Córrego Santa Rita';
        c.condicao = 'posseiro';
      } else {
        const idx = Math.floor(Math.random() * nomesRestantes.length);
        const nomeEscolhido = nomesRestantes.splice(idx, 1)[0] || (nomesRestantes.length > 0 ? nomesRestantes[0] : 'Confrontante Temporário');
        c.nome = nomeEscolhido;
        c.cpf = gerarCpfValido();
        c.matricula = String(Math.floor(1000 + Math.random() * 9000));
        c.cns = '01.234-5';
      }
    }
  });

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

  const gleba1: Gleba = {
    id: 'gleba_demo_1',
    denominacao: `${selectedImovel} - Gleba 1 (Sede)`,
    parcela: '001',
    vertices: v1,
    confrontantes: conf1.confrontantes,
    confrontantePorLado: conf1.confrontantePorLado,
    tipoGleba: 'principal',
    visivel: true,
  };

  const gleba2: Gleba = {
    id: 'gleba_demo_2',
    denominacao: `${selectedImovel} - Gleba 2 (Pastagem)`,
    parcela: '002',
    vertices: v2,
    confrontantes: conf2.confrontantes,
    confrontantePorLado: conf2.confrontantePorLado,
    tipoGleba: 'principal',
    visivel: true,
  };

  const gleba3: Gleba = {
    id: 'gleba_demo_3',
    denominacao: `${selectedImovel} - Gleba 3 (Reserva Legal)`,
    parcela: '003',
    vertices: v3,
    confrontantes: conf3.confrontantes,
    confrontantePorLado: conf3.confrontantePorLado,
    tipoGleba: 'auxiliar',
    visivel: true,
  };

  const gleba4: Gleba = {
    id: 'gleba_demo_4',
    denominacao: `${selectedImovel} - Gleba 4 (Preservação APP)`,
    parcela: '004',
    vertices: v4,
    confrontantes: conf4.confrontantes,
    confrontantePorLado: conf4.confrontantePorLado,
    tipoGleba: 'auxiliar',
    visivel: true,
  };

  const gleba5: Gleba = {
    id: 'gleba_demo_5',
    denominacao: `${selectedImovel} - Gleba 5 (Área Remanescente)`,
    parcela: '005',
    vertices: v5,
    confrontantes: conf5.confrontantes,
    confrontantePorLado: conf5.confrontantePorLado,
    tipoGleba: 'auxiliar',
    visivel: false, // Oculta por padrão para testes de visibilidade
  };

  return {
    nome: `${selectedImovel} (demonstração 5 glebas${grande ? ' GRANDE' : ''})`,
    imovel,
    vertices: v1,
    confrontantes: conf1.confrontantes,
    confrontantePorLado: conf1.confrontantePorLado,
    glebas: [gleba1, gleba2, gleba3, gleba4, gleba5],
    zona: ZONA,
    hemisferio: HEMISFERIO
  };
}

export interface OpcoesDemo {
  numImoveis: number;
  numGlebas: number;
  tipoGleba: 'rural' | 'loteamento';
}

export function gerarProjetoDemoConfiguravel(opts: OpcoesDemo): ProjetoFicticio {
  const { numImoveis, numGlebas, tipoGleba } = opts;
  const imoveisList: ImovelData[] = [];
  const glebasList: Gleba[] = [];
  
  const nomesRestantes = [...CONFRONTANTES_NOMES];
  
  for (let imIdx = 0; imIdx < numImoveis; imIdx++) {
    const selectedImovelName = IMOVEIS[(Math.floor(Math.random() * IMOVEIS.length) + imIdx) % IMOVEIS.length];
    const prop = PROPRIETARIOS[(Math.floor(Math.random() * PROPRIETARIOS.length) + imIdx) % PROPRIETARIOS.length];
    const mun = MUNICIPIOS[(Math.floor(Math.random() * MUNICIPIOS.length) + imIdx) % MUNICIPIOS.length];
    const imovelId = `imovel_${imIdx + 1}`;
    
    const im: ImovelData = {
      id: imovelId,
      denominacao: numImoveis > 1 ? `${selectedImovelName} - Imóvel ${imIdx + 1}` : selectedImovelName,
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
      naturezaServico: tipoGleba === 'loteamento' ? 'Desmembramento/Loteamento' : 'Georreferenciamento',
      situacao: 'Imóvel Registrado',
      naturezaArea: 'Particular',
      numeroTrt: 'MG-' + (2025 + Math.floor(Math.random() * 3)) + '-' + String(Math.floor(1000000 + Math.random() * 9000000)),
      ficticio: true,
    };
    
    imoveisList.push(im);
    
    // Gera as glebas/lotes para este imóvel
    for (let glIdx = 0; glIdx < numGlebas; glIdx++) {
      const glebaId = `gleba_demo_im_${imIdx + 1}_gl_${glIdx + 1}`;
      const nomeUnidade = tipoGleba === 'loteamento' ? `Lote ${glIdx + 1}` : `Gleba ${glIdx + 1}`;
      
      let rawPoints: RawPoint[] = [];
      if (tipoGleba === 'loteamento') {
        // Lote de 10m x 20m
        const row = Math.floor(glIdx / 10);
        const col = glIdx % 10;
        const x0 = 650000 + imIdx * 150 + col * 12; // 12 metros de passo (lote + recuo de 2m)
        const y0 = 7680000 + row * 28; // 28 metros de passo (lote + 8m de rua)
        
        rawPoints = [
          { nome: `L${glIdx + 1}_V1`, codigo: 'LOTEAMENTO-MURO', norte: y0, leste: x0, elevacao: 800 + row * 0.4 + col * 0.1, status: 'FIXED', isBase: false, isSingle: false },
          { nome: `L${glIdx + 1}_V2`, codigo: 'LOTEAMENTO-MURO', norte: y0, leste: x0 + 10, elevacao: 800 + row * 0.4 + (col + 1) * 0.1, status: 'FIXED', isBase: false, isSingle: false },
          { nome: `L${glIdx + 1}_V3`, codigo: 'LOTEAMENTO-MURO', norte: y0 + 20, leste: x0 + 10, elevacao: 800.5 + row * 0.4 + (col + 1) * 0.1, status: 'FIXED', isBase: false, isSingle: false },
          { nome: `L${glIdx + 1}_V4`, codigo: 'LOTEAMENTO-MURO', norte: y0 + 20, leste: x0, elevacao: 800.5 + row * 0.4 + col * 0.1, status: 'FIXED', isBase: false, isSingle: false },
        ];
      } else {
        // Gleba rural de 1 a 100 ha
        // ex: 350m x 350m (~12.2 ha)
        const row = Math.floor(glIdx / 3);
        const col = glIdx % 3;
        const x0 = 650000 + imIdx * 1500 + col * 450;
        const y0 = 7680000 + row * 450;
        
        // Adiciona um ruído para não ser um quadrado perfeito
        const dx1 = Math.round((Math.random() - 0.5) * 40);
        const dy1 = Math.round((Math.random() - 0.5) * 40);
        const dx2 = Math.round((Math.random() - 0.5) * 40);
        const dy2 = Math.round((Math.random() - 0.5) * 40);
        const dx3 = Math.round((Math.random() - 0.5) * 40);
        const dy3 = Math.round((Math.random() - 0.5) * 40);
        const dx4 = Math.round((Math.random() - 0.5) * 40);
        const dy4 = Math.round((Math.random() - 0.5) * 40);
        
        rawPoints = [
          { nome: `G${glIdx + 1}_V1`, codigo: 'CERCA', norte: y0 + dy1, leste: x0 + dx1, elevacao: 820 + row * 2 + col, status: 'FIXED', isBase: false, isSingle: false },
          { nome: `G${glIdx + 1}_V2`, codigo: 'MATA', norte: y0 + dy2, leste: x0 + 400 + dx2, elevacao: 822 + row * 2 + col, status: 'FIXED', isBase: false, isSingle: false },
          { nome: `G${glIdx + 1}_V3`, codigo: 'CERCA', norte: y0 + 400 + dy3, leste: x0 + 400 + dx3, elevacao: 825 + row * 2 + col, status: 'FIXED', isBase: false, isSingle: false },
          { nome: `G${glIdx + 1}_V4`, codigo: 'CORREGO', norte: y0 + 400 + dy4, leste: x0 + dx4, elevacao: 818 + row * 2 + col, status: 'FIXED', isBase: false, isSingle: false },
        ];
      }
      
      const v = montarVertices(rawPoints, ZONA, HEMISFERIO, TEC_DEMO);
      
      // Define algumas representações
      const reps = ['cerca', 'mata', 'estrada', 'corrego'];
      v.forEach((vt, vi) => {
        vt.representacao = reps[vi % reps.length];
      });
      
      const { confrontantes: confs, confrontantePorLado: cpl } = montarConfrontantes(v);
      
      // Preenche os nomes e CPFs aleatórios dos confrontantes
      for (const c of confs) {
        if (/corrego/i.test(c.nome)) {
          c.nome = 'Córrego Santa Rita';
          c.condicao = 'posseiro';
        } else {
          if (nomesRestantes.length === 0) {
            nomesRestantes.push(...CONFRONTANTES_NOMES);
          }
          const idx = Math.floor(Math.random() * nomesRestantes.length);
          const nomeEscolhido = nomesRestantes.splice(idx, 1)[0] || 'Confrontante Temporário';
          c.nome = nomeEscolhido;
          c.cpf = gerarCpfValido();
          c.matricula = String(Math.floor(1000 + Math.random() * 9000));
          c.cns = '01.234-5';
        }
      }
      
      const gleba: Gleba = {
        id: glebaId,
        denominacao: `${im.denominacao} - ${nomeUnidade}`,
        parcela: String(glIdx + 1).padStart(3, '0'),
        vertices: v,
        confrontantes: confs,
        confrontantePorLado: cpl,
        tipoGleba: 'principal',
        visivel: true,
        imovelId: imovelId,
      };
      
      glebasList.push(gleba);
    }
  }
  
  const primeiraGleba = glebasList[0];
  
  return {
    nome: `Projeto Demonstração - ${numImoveis} imóvel(is) (${tipoGleba === 'loteamento' ? 'Loteamento' : 'Rural'})`,
    imovel: imoveisList[0],
    imoveis: imoveisList,
    vertices: primeiraGleba.vertices,
    confrontantes: primeiraGleba.confrontantes,
    confrontantePorLado: primeiraGleba.confrontantePorLado,
    glebas: glebasList,
    zona: ZONA,
    hemisferio: HEMISFERIO,
    tipoProjeto: tipoGleba,
  };
}
