// Tipos centrais do domínio de agrimensura.

/** Um ponto bruto lido do TXT, ainda em UTM. */
export interface RawPoint {
  nome: string;        // ex.: "1", "B_4540146", "PPP 1"
  codigo: string;      // ex.: "DIVISA JOSE CLAUDIO X LOBATO", "MATA"
  norte: number;       // N (UTM)
  leste: number;       // E (UTM)
  elevacao: number;    // h (altitude geométrica)
  status: string;      // FIXED | SINGLE | "" (do GNSS)
  isBase: boolean;     // ponto de apoio/base (B_, PPP) — não entra no perímetro
  isSingle: boolean;   // STATUS:SINGLE — referência de baixa precisão, fora do perímetro
}

/** Tipo de vértice na lógica do SIGEF. M = marco (canto de divisa), P = ponto, V = virtual. */
export type TipoVertice = 'M' | 'P' | 'V';

/**
 * Método de posicionamento (SIGEF). PG6 = GNSS preciso; PA1/PA2 = apoio; PT8 = ponto
 * topográfico/virtual; outros conforme o manual. Configurável.
 */
export type MetodoPosicionamento = 'PG6' | 'PA1' | 'PA2' | 'PT8' | string;

/** Vértice já processado: UTM + geográfico + código SIGEF. */
export interface Vertex {
  id: string;          // id estável para edição
  ordem: number;       // posição no anel (0-based)
  nome: string;        // nome original do TXT
  codigoCampo: string; // o campo "Código" do TXT (descrição/divisa)
  norte: number;
  leste: number;
  elevacao: number;
  lat: number;         // graus decimais
  lon: number;         // graus decimais
  tipo: TipoVertice;   // M = marco/canto de divisa, P = ponto, V = virtual
  metodo?: MetodoPosicionamento; // método de posicionamento do vértice (PG6, PA1, PT8...)
  tipoLimite?: string; // tipo de limite SIGEF da divisa que SAI deste vértice (LA6, LN1...)
  representacao?: string; // representação visual da divisa na planta (cerca, estrada...)
  codigoSigef: string; // ex.: COIN-M-0017
  isDivisa: boolean;   // verdadeiro quando o código do campo indica troca de divisa
  registrado?: boolean;// já consumiu número do banco de pontos (não pode ser reusado)
}

// ----- Banco de pontos por credenciado (nunca repetir vértice) -----

/** Registro permanente de um ponto já usado por um credenciado. */
export interface PontoRegistro {
  codigo: string;      // chave: COIN-M-0017
  prefixo: string;     // COIN
  tipo: TipoVertice;
  numero: number;
  leste: number;
  norte: number;
  lat: number;
  lon: number;
  elevacao: number;
  zonaUtm: number;
  hemisferio: 'N' | 'S';
  imovelId?: string;   // a que imóvel/projeto pertence
  criadoEm: number;
}

/** Próximos números livres por tipo, para um prefixo (credenciado). */
export interface Contadores {
  prefixo: string;     // chave
  M: number;
  P: number;
  V: number;
}

// ----- Cadastros reutilizáveis -----

/** Qualificação completa de uma pessoa (para requerimentos cartoriais). */
export interface PessoaQualificada {
  nome: string;
  rg: string;
  cpf: string;
  nacionalidade: string;   // padrão "Brasileira"
  naturalidade: string;
  dataNascimento: string;
  filiacao: string;
  profissao: string;
  estadoCivil: string;
  conjugeNome: string;
  conjugeRg: string;
  conjugeCpf: string;
  endereco: string;        // residente e domiciliado em
  cidadeUf: string;
  cep: string;
}

export interface ProprietarioCad extends Partial<PessoaQualificada> {
  id: string;
  nome: string;
  cpf: string;
  tipoPessoa: 'Física' | 'Jurídica';
}

export interface ConfrontanteCad {
  id: string;
  nome: string;
  cpf: string;
  matricula: string;
  cns: string;
  descricaoExtra?: string;
}

export interface ImovelCad {
  id: string;
  denominacao: string;
  matricula: string;
  cns: string;
  codigoImovelIncra: string;
  municipio: string;
}

export interface CartorioCad {
  id: string;
  cns: string;        // ex.: 03.886-9
  nome: string;       // ex.: Cartório de Registro de Imóveis de Espera Feliz
  municipio: string;
}

/** Confrontante de um trecho do perímetro. */
export interface Confrontante {
  id: string;
  nome: string;
  cpf: string;
  matricula: string;
  cns: string;         // código do cartório
  // descrição livre opcional (ex.: espólio/inventariante)
  descricaoExtra?: string;
  // posição manual do rótulo na planta (se o usuário arrastou); senão é automática
  posRotulo?: { lat: number; lon: number };
}

/** Objeto de desenho livre (georreferenciado) sobreposto ao mapa/planta. */
export type ObjetoTipo = 'polilinha' | 'texto' | 'cota';
export interface PontoLL { lat: number; lon: number; leste: number; norte: number; }
export interface ObjetoDesenho {
  id: string;
  tipo: ObjetoTipo;
  pontos: PontoLL[];          // polilinha/cota: 2+; texto: 1 (âncora)
  texto?: string;             // texto
  tamanho?: number;           // tamanho do texto
  alinhamento?: 'left' | 'center' | 'right';
  cor?: string;
  espessura?: number;
  preenchido?: boolean;       // polilinha fechada com cor sólida (ex.: lago)
}

/** Um lado da poligonal (vértice i → vértice i+1). */
export interface Lado {
  de: Vertex;
  para: Vertex;
  azimute: number;     // graus decimais, 0..360 a partir do Norte
  distancia: number;   // metros (plano local SGL)
  confrontanteId: string | null;
}

/** Dados de identificação do imóvel (aba identificacao do SIGEF + memorial). */
export interface ImovelData {
  denominacao: string;        // "Fazenda Ventania"
  matricula: string;          // "3470"
  cns: string;                // "03.886-9"
  codigoImovelIncra: string;  // SNCR/INCRA "9501143617043"
  proprietario: string;       // "Juraci Francisco de Sales"
  cpfProprietario: string;
  tipoPessoa: 'Física' | 'Jurídica';
  municipio: string;          // "Espera Feliz-MG"
  local: string;              // "Córrego Ventania, Espera Feliz-MG"
  naturezaServico: string;    // "Particular"
  situacao: string;           // "Imóvel Registrado"
  naturezaArea: string;       // "Particular"
  // Reconciliação com o rascunho do SIGEF: valores oficiais (o SIGEF recalcula a SGL e
  // costuma diferir alguns m²/cm). Quando preenchidos e usarValoresSigef=true, as peças
  // finais usam estes valores no lugar dos calculados.
  areaSigefHa?: number;
  perimetroSigef?: number;
  usarValoresSigef?: boolean;
  // Para o requerimento de retificação:
  areaAnterior?: number;  // área que consta na matrícula (ha)
  valorImovel?: number;   // valor declarado (R$)
  // Para a planta:
  declinacaoMagnetica?: number; // graus (negativo = oeste), do serviço de declinação
  variacaoAnual?: number;       // minutos/ano
}

/** Dados fixos do escritório (carimbo da planta). */
export interface EscritorioData {
  nome: string;        // "SOUZA GESTÃO FUNDIÁRIA"
  ramo: string;        // "Agrimensura e Georreferenciamento"
  cnpj: string;        // "45.539.408/0001-74"
  endereco: string;    // "Rua Doutor José Paixão 1400, Sala 02 Santa Inês, Espera Feliz"
  telefone: string;    // "(32) 99911-6227"
  logoDataUrl?: string;// logotipo opcional (base64 data URL)
}

/** Dados fixos do responsável técnico (Configurações). */
export interface TecnicoData {
  nome: string;
  formacao: string;           // "TÉCNICO EM AGRIMENSURA"
  cft: string;                // "12287132600-MG"
  art: string;                // "CFT2505318024"
  credenciamentoIncra: string;// "COIN" — também é o prefixo dos vértices
  cidadeAssinatura: string;   // "Espera Feliz-MG"
  metodoPosicionamento: string; // "PG6"
  tipoLimite: string;         // "LA6"
  contadorMarco: number;      // semente do próximo número p/ COIN-M (quando o banco está vazio)
  contadorPonto: number;      // semente do próximo número p/ COIN-P
  contadorVirtual?: number;   // semente do próximo número p/ COIN-V
  zonaBase?: number;          // fuso UTM principal de trabalho (padrão 23 — Espera Feliz)
  fusosPermitidos?: number[]; // fusos liberados para auto-detecção (ex.: [22,23,24,25])
}

export interface ResultadoCalculo {
  vertices: Vertex[];
  lados: Lado[];
  areaM2: number;
  areaHa: number;
  perimetro: number;
}

/** Uma gleba/parcela do imóvel (polígono próprio). */
export interface Gleba {
  id: string;
  denominacao: string;          // ex.: "Parcela 1"
  parcela: string;              // número da parcela no SIGEF, ex.: "001"
  vertices: Vertex[];
  confrontantes: Confrontante[];
  confrontantePorLado: Record<number, string>;
  objetos?: ObjetoDesenho[];   // desenho livre (linhas, textos, cotas)
}

/** Projeto completo, salvo no navegador. Um imóvel pode ter várias glebas. */
export interface Projeto {
  id: string;
  nome: string;
  criadoEm: number;
  atualizadoEm: number;
  imovel: ImovelData;
  glebas: Gleba[];
  zonaUtm: number;
  hemisferio: 'N' | 'S';
  // Requerimento cartorial (opcional)
  requerente?: PessoaQualificada;
  transmitente?: PessoaQualificada;
  // Campos legados (projetos salvos antes do multi-gleba) — migrados ao abrir.
  vertices?: Vertex[];
  confrontantes?: Confrontante[];
  confrontantePorLado?: Record<number, string>;
}
