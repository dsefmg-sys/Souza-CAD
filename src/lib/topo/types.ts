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
  sigmaX?: number;     // precisão horizontal X (m)
  sigmaY?: number;     // precisão horizontal Y (m)
  sigmaZ?: number;     // precisão vertical Z (m)
  metodo?: string;     // método de posicionamento informado em campo (ex.: PG6, RTK)
}

/** Campo que uma coluna do TXT representa (configuração de importação). */
export type CampoTxt =
  | 'ignorar' | 'nome' | 'codigo' | 'norte' | 'leste' | 'elevacao'
  | 'sigmaX' | 'sigmaY' | 'sigmaZ' | 'metodo';

/**
 * Configuração de como ler o TXT do GNSS: separador de colunas, separador decimal,
 * se a primeira linha é cabeçalho e a QUAL campo cada coluna corresponde.
 * Definida pelo usuário em Configurações a partir de um arquivo de exemplo.
 */
export interface ImportTxtConfig {
  separador: ';' | ',' | 'tab' | 'espaco';
  decimal: '.' | ',';
  temCabecalho: boolean;
  colunas: CampoTxt[]; // colunas[i] = papel da coluna i
}

/** Campo que uma coluna do arquivo de vértices do VIZINHO representa. */
export type CampoVerticeVizinho =
  | 'ignorar' | 'nome' | 'latitude' | 'longitude' | 'leste' | 'norte' | 'elevacao'
  | 'sigmaX' | 'sigmaY' | 'metodo';

/**
 * Configuração de como ler o arquivo de vértices de um imóvel VIZINHO já certificado (baixado
 * pelo agrimensor de dentro da própria conta gov.br dele no Acervo Fundiário/Distribuidor de
 * Coordenadas — não temos acesso automático a esse serviço, é sempre um upload manual). Aceita
 * coordenada geográfica (latitude/longitude) OU UTM (leste/norte); se vierem as duas, a geográfica
 * tem prioridade. Definida pelo usuário em Configurações a partir de um arquivo de exemplo, no
 * mesmo espírito do `ImportTxtConfig`.
 */
export interface ImportVerticesVizinhoConfig {
  separador: ';' | ',' | 'tab' | 'espaco';
  decimal: '.' | ',';
  temCabecalho: boolean;
  colunas: CampoVerticeVizinho[]; // colunas[i] = papel da coluna i
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
  elevacaoInterpolada?: boolean; // cota CALCULADA (não medida) pela ferramenta de completar altitudes
  lat: number;         // graus decimais
  lon: number;         // graus decimais
  tipo: TipoVertice;   // M = marco/canto de divisa, P = ponto, V = virtual
  metodo?: MetodoPosicionamento; // método de posicionamento do vértice (PG6, PA1, PT8...)
  tipoLimite?: string; // tipo de limite SIGEF da divisa que SAI deste vértice (LA6, LN1...)
  representacao?: string; // representação visual da divisa na planta (cerca, estrada...)
  codigoSigef: string; // ex.: COIN-M-0017
  isDivisa: boolean;   // verdadeiro quando o código do campo indica troca de divisa
  registrado?: boolean;// já consumiu número do banco de pontos (não pode ser reusado)
  sigmaX?: number;     // precisão horizontal X (m), lida do TXT
  sigmaY?: number;     // precisão horizontal Y (m), lida do TXT
  sigmaZ?: number;     // precisão vertical Z (m), lida do TXT
  posRotulo?: { lat: number; lon: number }; // posição manual do rótulo do vértice (arrastado com F5)
  // tique de TROCA DE CONFRONTANTE saindo do marco (M): azimute (graus, 0=topo) e comprimento (px da
  // prancha A3). Vazio = padrão (aponta pra fora do polígono, ~4 cm). Ajustável arrastando a ponta.
  divisaConfAz?: number;
  divisaConfLen?: number;
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
  papel?: 'requerente' | 'transmitente';
}

export interface ProprietarioCad extends Partial<PessoaQualificada> {
  id: string;
  nome: string;
  cpf: string;
  tipoPessoa: 'Física' | 'Jurídica' | 'Espólio';
  projetoId?: string;
}

/**
 * Condição do confrontante perante o imóvel vizinho:
 * - proprietario: dono com matrícula (padrão)
 * - posseiro: possuidor sem matrícula (descreve "na condição de possuidor(a)")
 * - espolio: imóvel de pessoa falecida, assinado pelo inventariante
 * - condomino: coproprietário do imóvel vizinho (a anuência de um supre os demais, §10 art. 213 LRP)
 * - usufrutuario: usufrutuário do imóvel; assina junto com o nu-proprietário (se informado)
 * - publico: bem público sem titular (estrada municipal/estadual, rio, ferrovia...) — não é pessoa,
 *   então NUNCA entra com linha de assinatura na planta, no memorial nem nas cartas de anuência
 *   (não tem quem assine). CPF/matrícula ficam sempre vazios pra este tipo.
 */
export type CondicaoConfrontante = 'proprietario' | 'posseiro' | 'espolio' | 'condomino' | 'usufrutuario' | 'publico';

export interface ConfrontanteCad {
  id: string;
  nome: string;
  cpf: string;
  matricula: string;
  cns: string;
  descricaoExtra?: string;
  condicao?: CondicaoConfrontante;
  conjugeNome?: string;
  conjugeCpf?: string;
  // quando espólio: quem assina pelo espólio (inventariante)
  inventarianteNome?: string;
  inventarianteCpf?: string;
  // quando usufrutuário: o nu-proprietário assina junto (se houver)
  nuProprietarioNome?: string;
  nuProprietarioCpf?: string;
  projetoId?: string;
}

export interface ImovelCad {
  id: string;
  denominacao: string;
  matricula: string;
  cns: string;
  codigoImovelIncra: string;
  municipio: string;
  projetoId?: string;
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
  // condição perante o imóvel vizinho (proprietário/posseiro/espólio)
  condicao?: CondicaoConfrontante;
  // cônjuge — qualifica e assina junto
  conjugeNome?: string;
  conjugeCpf?: string;
  // quando espólio: inventariante que assina pelo espólio
  inventarianteNome?: string;
  inventarianteCpf?: string;
  // quando usufrutuário: nu-proprietário que assina junto (se houver)
  nuProprietarioNome?: string;
  nuProprietarioCpf?: string;
  // posição manual do rótulo na planta (se o usuário arrastou); senão é automática
  posRotulo?: { lat: number; lon: number };
  // tamanho da fonte do rótulo/assinatura (mapa e planta); vazio = padrão
  tamRotulo?: number;
  // cor personalizada para o confrontante; se vazia, usa a cor da paleta hash
  cor?: string;
  layoutAssinatura?: 'vertical' | 'horizontal';
}

/** Objeto de desenho livre (georreferenciado) sobreposto ao mapa/planta. */
export type ObjetoTipo = 'polilinha' | 'texto' | 'cota' | 'simbolo';
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
  tracejado?: boolean;        // polilinha com traço tracejado (ex.: estrada)
  estiloLinha?: string;       // estilo da linha (solido, tracejado, pontilhado)
  corPreenchimento?: string;  // cor de preenchimento do polígono
  achura?: string;            // tipo de achura (nenhuma, linhas, cruzado, pontos)
  simbolo?: string;           // elemento cartográfico (arvore, arbusto, casa, poste, pedra)
  carTema?: 'app' | 'reservaLegal' | 'vegetacao' | 'usoConsolidado'; // camada ambiental (CAR) do polígono
  curvaNivel?: number;        // quando é uma CURVA DE NÍVEL gerada: a altitude (m) desta curva
  curvaMestra?: boolean;      // verdadeiro se for uma curva mestra (grossa)
  tamanhoFonte?: number;      // tamanho da fonte do texto/cota
  corFonte?: string;          // cor da fonte do texto/cota
  posicaoTexto?: string;      // posição da cota (acima, centro, abaixo)
  negrito?: boolean;          // texto em negrito
  x?: number;                 // posição do texto/símbolo na tela/planta
  y?: number;
  xA?: number;                // referência de cota A
  yA?: number;
  xB?: number;                // referência de cota B
  yB?: number;
}

/** Um lado da poligonal (vértice i → vértice i+1). */
export interface Lado {
  de: Vertex;
  para: Vertex;
  azimute: number;     // graus decimais, 0..360 a partir do Norte
  distancia: number;   // metros (plano local SGL)
  confrontanteId: string | null;
}

/**
 * Papel de um titular na cadeia dominial do imóvel — decide COMO ele assina as peças:
 * - proprietario: dono pleno (padrão)
 * - condomino: coproprietário (todos os condôminos assinam)
 * - usufrutuario: tem o usufruto (assina com o nu-proprietário)
 * - nu-proprietario: tem a nua-propriedade (assina com o usufrutuário)
 * - inventariante: assina pelo espólio, quando o titular é falecido
 */
export type PapelProprietario = 'proprietario' | 'condomino' | 'usufrutuario' | 'nu-proprietario' | 'inventariante';

/** Um titular ADICIONAL do imóvel (além do principal em ImovelData.proprietario). */
export interface ProprietarioParte {
  nome: string;
  cpf: string;
  papel: PapelProprietario;
  conjugeNome?: string;
  conjugeCpf?: string;
}

/** Dados de identificação do imóvel (aba identificacao do SIGEF + memorial). */
export interface ImovelData {
  denominacao: string;        // "Fazenda Ventania"
  matricula: string;          // "3470"
  cns: string;                // "03.886-9"
  codigoImovelIncra: string;  // SNCR/INCRA "9501143617043"
  proprietario: string;       // "Juraci Francisco de Sales"
  cpfProprietario: string;
  tipoPessoa: 'Física' | 'Jurídica' | 'Espólio';
  inventarianteNome?: string;
  inventarianteCpf?: string;
  inventarianteRg?: string;
  inventarianteEstadoCivil?: string;
  inventarianteNacionalidade?: string;
  comprador?: string;
  cpfComprador?: string;
  // cônjuge do proprietário — qualifica e assina junto nas peças
  conjugeProprietario?: string;
  cpfConjugeProprietario?: string;
  // Papel do proprietário PRINCIPAL na cadeia dominial (padrão 'proprietario').
  papelProprietario?: PapelProprietario;
  // Outros titulares do imóvel (condôminos, nu-proprietário, inventariante...). Cada um assina as
  // peças conforme o seu papel. Vazio/ausente = só o proprietário principal (comportamento antigo).
  proprietariosAdicionais?: ProprietarioParte[];
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
  tipoAzimute?: 'plano' | 'geodesico';
  // Para o requerimento de retificação:
  areaAnterior?: number;  // área que consta na matrícula (ha)
  valorImovel?: number;   // valor declarado (R$)
  // Matrículas de origem, para remembramento/unificação de mais de uma matrícula numa só.
  // Vazio/ausente = comportamento normal (uma matrícula só, em `matricula`).
  matriculasOrigem?: string[];
  // Para a planta:
  declinacaoMagnetica?: number; // graus (negativo = oeste), do serviço de declinação
  variacaoAnual?: number;       // minutos/ano
  tipoImovel?: 'rural' | 'urbano';
  regimeTerra?: 'propriedade' | 'posse';
  // Padrão do memorial descritivo. 'incra' (padrão nacional SIGEF) ou 'intermat' (variante do
  // Instituto de Terras de Mato Grosso, para regularização de terras públicas estaduais). O padrão
  // INTERMAT só é oferecido quando o imóvel é de Mato Grosso. Ausente = 'incra'.
  padraoMemorial?: 'incra' | 'intermat';
  inscricaoMunicipal?: string;
  frenteM?: number;
  fundosM?: number;
  distanciaEsquinaM?: number;
  esquinaRua?: string;
  numeroTrt?: string;          // nº do TRT/ART emitido no conselho (por projeto)
  financeiro?: FinanceiroProjeto; // gestão financeira do projeto (valor cobrado, gastos, recebimentos)
  ficticio?: boolean;          // projeto de DEMONSTRAÇÃO: as peças saem marcadas como dados fictícios
}

/** Um lançamento financeiro do projeto: um gasto (custo) ou um recebimento (entrada). */
export interface LancamentoFinanceiro {
  id: string;
  tipo: 'gasto' | 'recebimento';
  descricao: string;
  valor: number;  // em reais (R$)
  data: string;   // 'AAAA-MM-DD'
}

/** Controle financeiro de um projeto: o quanto foi cobrado e o histórico de gastos/recebimentos. */
export interface FinanceiroProjeto {
  valorCobrado?: number;                 // valor total combinado com o cliente (R$)
  lancamentos?: LancamentoFinanceiro[];
  observacoes?: string;
}

/**
 * Configuração editável da planta (por projeto). Tudo é opcional: vazio = usa o padrão, então
 * plantas antigas continuam idênticas. Permite ao usuário editar textos, escala, tipografia e
 * ligar/desligar blocos sem quebrar o layout A3 padronizado que os órgãos exigem.
 */
export interface PlantaConfig {
  titulo?: string;             // padrão "Levantamento Planimétrico Georreferenciado"
  folha?: string;              // padrão "Única"
  escalaManual?: number;       // denominador fixo (ex.: 2000); 0/ausente = automática
  offsetX?: number;            // deslocamento da folha em relação ao polígono (px da prancha A3)
  offsetY?: number;
  centroInfoPos?: { lat: number; lon: number }; // posição (arrastada) do rótulo central do imóvel no mapa
  mostrarGrade?: boolean;      // padrão true
  gradeEspacamento?: 'auto' | 'fine' | 'medium' | 'coarse'; // espaçamento das linhas da grade UTM
  gradeCorLinha?: string;      // cor das linhas da grade (padrão '#8a94a6')
  gradeMostrarRotulos?: boolean; // mostrar rótulos E/N (padrão true)
  mostrarNortes?: boolean;     // padrão true
  mostrarConvencoes?: boolean; // padrão true
  mostrarEscalaGrafica?: boolean; // padrão true
  mostrarDivisaConf?: boolean;    // padrão true: tique de troca de confrontante nos marcos M
  mostrarVerticesVizinho?: boolean; // padrão true: pontos dos imóveis vizinhos certificados importados
  estiloVertice?: 'sigef' | 'convencional'; // rótulo do vértice: código SIGEF (padrão) ou P1, P2, P3…
  mostrarSituacao?: boolean;   // padrão true (quando há imagem de situação)
  fonteRotulos?: number;       // tamanho da fonte dos rótulos (vértices/confrontantes), padrão 8.5
  escalaTextos?: number;       // multiplicador de TODOS os textos da planta (1 = padrão)
  escalaDeclaracoes?: number;  // multiplicador só das declarações (proprietário + laudo), 1 = padrão
  escalaConfront?: number;     // multiplicador só do texto/assinatura dos confrontantes, 1 = padrão
  escalaTabelas?: number;      // multiplicador só das tabelas (roteiro, coordenadas, áreas), 1 = padrão
  escalaVertices?: number;     // multiplicador do tamanho dos símbolos dos vértices (M/P/V), 1 = padrão
  estiloRosa?: number;         // variação visual da rosa dos ventos (0..n) — botão direito troca
  estiloEscala?: number;       // variação da barra de escala (0 = blocos, 1 = régua)
  estiloDiagrama?: number;     // variação do diagrama de convergência
  hachura?: 'nenhuma' | 'diagonal' | 'cruzada' | 'pontos'; // padrão de preenchimento do polígono
  textoLaudo?: string;         // texto do laudo técnico (carimbo)
  textoConfrontantes?: string; // declaração dos confrontantes (carimbo)
  // ajustes por texto (chave = id do texto na planta): conteúdo, escala própria e negrito
  textos?: Record<string, { texto?: string; escala?: number; negrito?: boolean; dx?: number; dy?: number; larguraChars?: number }>;
  // imagem da planta de situação (data URL) — salva junto do projeto pra não precisar recapturar
  situacaoDataUrl?: string;
  mostrarQuadroAreas?: boolean; // quadro-resumo de área/perímetro de todos os polígonos do desenho
  mostrarRoteiro?: boolean;     // tabela de roteiro perimétrico (vértice, azimute, distância, confrontante)
  mostrarCoordenadas?: boolean; // tabela de coordenadas dos vértices (UTM E/N, Altitude, Limite/Método)
  roteiroComConfrontante?: boolean; // inclui a coluna de confrontante no roteiro (padrão true)
  
  // Customização de cores e espessuras das linhas e polígonos na planta
  corPoligono?: string;        // cor do perímetro principal, padrão "#7c2d12"
  larguraPoligono?: number;    // espessura da linha do perímetro principal, padrão 1.8
  fillPoligono?: string;       // cor de preenchimento do perímetro principal, padrão "#fde68a"
  corOutrasGlebas?: string;    // cor das linhas de outras glebas, padrão "#c2410c"
  larguraOutrasGlebas?: number;// espessura das linhas de outras glebas, padrão 1.2
  larguraDivisasApoio?: number;// espessura das linhas de apoio das divisas, padrão 3.2
  corCabecalho?: string;       // cor dos cabeçalhos das sessões, padrão "#475569"
  corVerticeP?: string;        // cor dos vértices tipo P na planta, padrão "#1e3a8a"
  corVerticeM?: string;        // cor dos vértices tipo M na planta, padrão "#f59e0b"
  situacaoEscondida?: boolean;
  situacaoEscala?: number;
  print3dDataUrl?: string;
  mostrarPrint3D?: boolean;
  /** Volume de corte (m³) calculado na terraplanagem ao capturar o MDR. */
  print3dVolumeCorte?: number;
  /** Volume de aterro (m³) calculado na terraplanagem ao capturar o MDR. */
  print3dVolumeAterro?: number;
  /** Cota de referência (platô, m) usada no cálculo de terraplanagem. */
  print3dZRef?: number;
  /** Exibir dados de corte/aterro abaixo da imagem MDR na planta. */
  print3dMostrarTerraplanagem?: boolean;
  /** Exibir altitude nas curvas de nível na planta. Padrão: true (apenas nas mestras). */
  mostrarCotasCurvas?: boolean;
  sigefCor?: string;
  sigefEspessura?: number;
  sigefOpacidade?: number;
  /** Ocultar polígonos SIGEF importados na planta (checkbox no modal de personalização). */
  sigefOcultar?: boolean;
}

/** Como os dados ausentes/não preenchidos no cadastro devem ser tratados na geração de documentos. */
export type ModoTratamentoAusente = 'dado_ausente' | 'omitir' | 'linhas';



/** Dados fixos do escritório (carimbo da planta, cabeçalho de recibos/contratos). */
export interface EscritorioData {
  nome: string;        // razão social / "SOUZA GESTÃO FUNDIÁRIA"
  ramo: string;        // "Agrimensura e Georreferenciamento"
  cnpj: string;        // "45.539.408/0001-74" (aceita CNPJ ou CPF)
  endereco: string;    // logradouro + número + bairro: "Rua Doutor José Paixão 1400, Sala 02, Santa Inês"
  telefone: string;    // "(32) 99911-6227"
  logoDataUrl?: string;// logotipo opcional (base64 data URL)
  corPrimaria?: string; // cor primária para personalização da marca
  corSecundaria?: string; // cor secundária para personalização da marca
  // Campos cadastrais complementares (opcionais p/ compatibilidade com cadastros antigos).
  nomeFantasia?: string;      // nome fantasia, se diferente da razão social
  inscricaoEstadual?: string; // IE ou "ISENTO"
  inscricaoMunicipal?: string;// IM (alvará municipal)
  cidade?: string;            // município do escritório
  uf?: string;                // UF (2 letras)
  cep?: string;               // "36830-000"
  email?: string;             // e-mail de contato/comercial
  site?: string;              // site ou rede social
  assinaturaDataUrl?: string; // imagem da assinatura em PNG (base64 data URL)
  autoAssinar?: boolean;      // marcar para assinar recibos/contratos/propostas automaticamente
}

/** Dados fixos do responsável técnico (Configurações). */
export interface TecnicoData {
  nome: string;
  formacao: string;           // "TÉCNICO EM AGRIMENSURA" (técnico) ou "ENGENHEIRO AGRIMENSOR" (engenheiro)
  // Conselho do responsável: técnico registra no CFT e emite TRT; engenheiro registra no CREA e
  // emite ART. Ausente = CFT (compatibilidade com projetos antigos). Define as siglas nas peças.
  conselho?: 'CFT' | 'CREA' | 'CFTA' | 'CFT+CREA' | 'CFTA+CREA';
  cft: string;                // "12287132600-MG" — nº de registro no conselho (CFT ou CREA)
  art: string;                // "CFT2505318024" — nº do termo de responsabilidade (TRT ou ART)
  credenciamentoIncra: string;// "COIN" — também é o prefixo dos vértices
  cidadeAssinatura: string;   // "Espera Feliz-MG"
  metodoPosicionamento: string; // "PG6"
  tipoLimite: string;         // "LA6"
  contadorMarco: number;      // semente do próximo número p/ COIN-M (quando o banco está vazio)
  contadorPonto: number;      // semente do próximo número p/ COIN-P
  contadorVirtual?: number;   // semente do próximo número p/ COIN-V
  zonaBase?: number;          // fuso UTM principal de trabalho (padrão 23 — Espera Feliz)
  fusosPermitidos?: number[]; // fusos liberados para auto-detecção (ex.: [22,23,24,25])
  // Formações/registros ADICIONAIS, além da principal acima — ex.: o técnico também é engenheiro,
  // ou tem CFTA além do CFT. Na hora de emitir o TRT/ART (TrtModal), o profissional escolhe qual
  // credencial citar naquela peça específica; as demais peças (memorial, planta etc.) continuam
  // usando a formação principal, como sempre.
  registrosExtras?: RegistroProfissionalExtra[];
  tipoLevantamento?: 'base_rover' | 'rtk_ntrip';
}

export interface RegistroProfissionalExtra {
  formacao: string;                       // "ENGENHEIRO AGRÔNOMO"
  conselho: 'CFT' | 'CFTA' | 'CREA';
  registro: string;                       // nº de registro nesse conselho
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

/**
 * Vértice de um imóvel VIZINHO já certificado, importado do Distribuidor de Coordenadas do Acervo
 * Fundiário. Guardamos com a coordenada oficial, o sigma (precisão) e o nome/código do vértice, para
 * reaproveitar na hora de montar a planta: amarra a nossa divisa exatamente no ponto certificado do
 * vizinho, sem sobrar vão nem sobrepor. Fica gravado no projeto mesmo quando o vizinho está perto mas
 * não encosta (por isso é um dado próprio, não some depois de encaixar).
 */
export interface VerticeVizinho {
  nome: string;        // nome/código oficial do vértice do vizinho (ex.: CODI-M-0123)
  lat: number;         // graus decimais
  lon: number;         // graus decimais
  leste: number;       // UTM E (m), no fuso do trabalho
  norte: number;       // UTM N (m), no fuso do trabalho
  elevacao?: number;   // altitude (m), quando o arquivo traz
  sigmaX?: number;     // precisão horizontal X (m), quando o arquivo traz
  sigmaY?: number;     // precisão horizontal Y (m), quando o arquivo traz
  sigmaZ?: number;     // precisão vertical Z (m), quando o arquivo traz
  metodo?: string;     // método de posicionamento (PG6, PA2...), quando o arquivo traz
  origem?: string;     // rótulo do imóvel/arquivo de origem, para agrupar/identificar
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
  tipoAto?: 'venda' | 'doacao' | 'unificacao' | 'desmembramento' | 'usucapiao' | 'retificacao';
  partesAdicionais?: PessoaQualificada[];
  // Configuração editável da planta (opcional)
  plantaConfig?: PlantaConfig;
  // Parcelas certificadas do SIGEF/INCRA baixadas como referência (vizinhos): ficam gravadas no
  // projeto para não precisar buscar de novo a cada vez que ele é reaberto.
  parcelasCert?: { anel: [number, number][]; info: { titulo: string; linhas: string[] } }[];
  // Vértices de imóveis vizinhos já certificados, importados do Distribuidor de Coordenadas: ficam
  // gravados para reaproveitar coordenada/sigma/nome na planta (evita vão e sobreposição na divisa).
  verticesVizinho?: VerticeVizinho[];
  // Vértices IGNORADOS (pontos soltos fora do anel, ferramenta ignorar/considerar). São do
  // PROJETO, não de uma gleba — sem este campo eles sumiam ao salvar/recarregar (bug 05/07/2026).
  verticesIgnorados?: Vertex[];
  gradeAltimetrica?: { lat: number; lon: number; leste: number; norte: number; elevacao: number }[];
  verticesOnlineElev?: Record<string, number>;
  correcoes?: CorrecaoErrata[];
  // Campos legados (projetos salvos antes do multi-gleba) — migrados ao abrir.
  vertices?: Vertex[];
  confrontantes?: Confrontante[];
  confrontantePorLado?: Record<number, string>;
  // Lixeira: quando preenchido, o projeto foi "excluído" (some da lista, mas dá pra restaurar por
  // um prazo antes da limpeza definitiva). Ausente = projeto ativo.
  excluidoEm?: number;
}

export type NaturezaCorrecao = 'imovel' | 'pessoais' | 'confrontantes' | 'geometria' | 'outros';

export interface CorrecaoErrata {
  onde: string;     // ex.: "Confrontante Flávio Alves"
  constava: string; // ex.: "Matrícula nº 3383"
  passa: string;    // ex.: "Matrícula nº 5.378"
  natureza?: NaturezaCorrecao;
}

export interface ColegaCad {
  id: string;
  nome: string;
  telefone: string;
  credenciamento: string; // ex.: COIN (prefixo de credenciamento INCRA)
}

