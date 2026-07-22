// Modelos de TEXTO editáveis pelo usuário para as peças. Cada empresa escreve os blocos padrão do
// seu jeito, usando variáveis {como_esta} que o sistema troca pelos dados reais na hora de gerar.
// Só os blocos de TEXTO LIVRE são modelo — a estrutura das peças (tabela, narrativa calculada,
// assinaturas) continua automática, pra não quebrar a validade no cartório.

export interface ModelosDocs {
  declProprietario: string;   // declaração do(s) proprietário(s) — memorial e planta
  declConfrontantes: string;  // declaração dos confrontantes — memorial e planta
  laudoTecnico: string;       // laudo técnico — planta
  contratoContratante: string; // qualificação do contratante
  contratoContratado: string;  // qualificação do contratado
  contratoObjeto: string;     // cláusula de OBJETO do contrato
  contratoValor: string;      // cláusula de VALOR e pagamento
  contratoPrazo: string;      // cláusula de PRAZO
  contratoObrigacoes: string; // cláusula de OBRIGAÇÕES do contrato
  contratoForo: string;        // cláusula de FORO
  reciboReferente: string;    // "referente a..." do recibo
  // Blocos que antes eram fixos no código e agora são editáveis:
  memorialInfoTecnicas: string;   // parágrafo "INFORMAÇÕES TÉCNICAS" do memorial
  memorialObservacoes: string;    // parágrafo "OBSERVAÇÕES" do memorial
  requerimentoConfrontantes: string; // declarações sobre confrontantes no requerimento (1+ parágrafos)
  requerimentoResponsabilidade: string; // cláusula de responsabilidade técnica do requerimento
  requerimentoVenda: string;          // requerimento tipo: venda
  requerimentoDoacao: string;         // requerimento tipo: doação
  requerimentoUnificacao: string;     // requerimento tipo: unificação
  requerimentoDesmembramento: string; // requerimento tipo: desmembramento
  requerimentoUsucapiao: string;      // requerimento tipo: usucapião
  requerimentoRetificacao: string;    // requerimento tipo: retificação simples
  errataRatificacao: string;      // parágrafo de ratificação (considerações finais) da errata
  anuenciaFecho: string;          // parágrafo de fecho da carta de anuência
  // Variantes urbanas do memorial (usadas quando o imóvel é urbano):
  memorialInfoTecnicasUrbano: string;
  memorialObservacoesUrbano: string;
  // Peças novas, editáveis:
  propostaTexto: string;                // corpo da proposta/orçamento comercial
  declPosse: string;                    // declaração de posse (do possuidor)
  declInexistenciaSobreposicao: string; // declaração de inexistência de sobreposição (do técnico)
  declIncapaz: string;                  // declaração de representação de incapaz (menores/interditos)
  declEspolio: string;                  // declaração de representação de espólio (inventariante)
  declRespeitoLimites: string;          // declaração de respeito de limites e ausência de conflitos
  servidaoIntro: string;                // parágrafo de abertura do memorial de servidão/faixa de domínio
  // Variante INTERMAT (Mato Grosso): parágrafo de finalidade que entra logo abaixo do cabeçalho do
  // memorial quando o padrão escolhido é INTERMAT (só ofertado em imóveis de MT).
  memorialIntermatFinalidade: string;
}

export const MODELOS_PADRAO: ModelosDocs = {
  declProprietario:
    'Atestamos, sob as penas da lei, serem verdadeiras todas as informações apresentadas nesta planta e no memorial anexo, e que indicamos em campo, de forma expressa, as divisas, limites e confrontações consideradas verdadeiras.',
  declConfrontantes:
    'Concordamos com as medidas apresentadas neste memorial e na planta anexa no tocante aos espaços em que o referido imóvel faz confrontação com o imóvel de nossa propriedade. Estamos cientes de que, nos termos do §10 do artigo 213 da LRP, nossa anuência supre a participação do cônjuge e de eventuais outros condôminos titulares de nosso imóvel.',
  laudoTecnico:
    'Atesto, sob as penas da lei, que o levantamento geodésico do imóvel acima descrito foi executado em estrita observância das normas técnicas vigentes e reflete os limites físicos indicados em campo pelo proprietário/requerente, que se responsabiliza pela indicação dos mesmos.',
  contratoContratante:
    '{proprietario}, inscrito(a) no CPF/CNPJ sob o nº {cpfProprietario}, residente e domiciliado(a) no município de {municipio}, doravante denominado(a) simplesmente CONTRATANTE.',
  contratoContratado:
    '{escritorio}, pessoa jurídica de direito privado inscrita no CNPJ sob o nº {cnpjEscritorio}, neste ato representada por {responsavelTecnico}, doravante denominado simplesmente CONTRATADO.',
  contratoObjeto:
    'O presente contrato tem por objeto a prestação de serviços técnicos especializados de Engenharia/Agrimensura, compreendendo o levantamento planialtimétrico, georreferenciamento de precisão ao Sistema Geodésico Brasileiro (SIRGAS 2000), demarcação de divisas, confecção de peças gráficas (Planta Oficial), narrativa perimétrica em Memorial Descritivo e elaboração da Planilha ODS para certificação junto ao SIGEF/INCRA do imóvel rural {denominacao}, registrado sob a Matrícula nº {matricula}, situado no município de {municipio}, com área aproximada de {area} e perímetro de {perimetro}.',
  contratoValor:
    'Pelos serviços técnicos contratados e descritos na Cláusula 1ª, o(a) CONTRATANTE pagará ao CONTRATADO o valor total ajustado de {valor} ({valorExtenso}), a ser quitado mediante a seguinte forma de pagamento: {formaPagamento}.',
  contratoPrazo:
    'O CONTRATADO compromete-se a concluir os trabalhos de campo e elaboração das peças técnicas no prazo estimado de {prazoDias} dias úteis, contados a partir da entrega de toda a documentação necessária pelo CONTRATANTE. Parágrafo Único: O prazo avençado poderá ser prorrogado por motivos de força maior, intempéries climáticas adversas ou atrasos decorrentes de trâmites burocráticos junto a terceiros, tais como Ofícios de Registro de Imóveis, INCRA ou colheita de assinaturas de anuência de confrontantes.',
  contratoObrigacoes:
    'I - O CONTRATANTE obriga-se a fornecer ao CONTRATADO cópias legíveis dos documentos de propriedade (matrícula/certidão atualizada), documentos pessoais e indicar expressamente em campo os limites e confrontações do imóvel, responsabilizando-se civil e criminalmente pela veracidade das indicações fornecidas.\nII - O CONTRATADO compromete-se a executar os serviços com rigoroso zelo técnico, observando as normas de precisão do INCRA (ABNT/SIGEF), prestando a devida Anotação/Termo de Responsabilidade Técnica (ART/TRT).',
  contratoForo:
    'Para dirimir quaisquer controvérsias decorrentes deste contrato, as partes elegem, com renúncia expressa a qualquer outro por mais privilegiado que seja, o Foro da Comarca de {municipio}.',
  reciboReferente:
    'serviços de georreferenciamento e certificação do imóvel {denominacao}, matrícula {matricula}, situado em {municipio}, com área de {area}',
  memorialInfoTecnicas:
    'As coordenadas dos vértices descritos neste memorial foram determinadas por meio de ' +
    'levantamento topográfico georreferenciado ao Sistema Geodésico Brasileiro, adotando-se o ' +
    'datum SIRGAS2000, mediante utilização de tecnologia GNSS de dupla frequência, com ' +
    'equipamentos compatíveis com a precisão exigida pelas normas técnicas vigentes. O ' +
    'levantamento foi executado a partir de base geodésica determinada por métodos de ' +
    'posicionamento por satélite, sendo os demais vértices obtidos por técnicas de ' +
    'posicionamento relativo, assegurando coerência geométrica, confiabilidade dos dados e ' +
    'compatibilidade com os padrões adotados pelo Incra para fins de certificação, quando ' +
    'aplicável. As distâncias, perímetro e área do imóvel foram calculados a partir das ' +
    'coordenadas dos vértices levantados, em sistema de referência adequado ao levantamento realizado.',
  memorialObservacoes:
    'OBSERVAÇÕES: 1. O presente memorial descritivo reflete fielmente a situação física e ' +
    'geométrica do imóvel na data do levantamento, destinando-se à individualização de área ' +
    'para fins de regularização registral, sem prejuízo de eventual complementação ou ' +
    'adequação técnica caso venha a ser exigida certificação junto aos órgãos competentes. ' +
    '2. Os limites e divisas físicas descritos foram expressamente indicados em campo pelo ' +
    'proprietário/possuidor requerente, sob sua inteira responsabilidade civil e criminal, ' +
    'respondendo o profissional signatário tão somente pela exatidão geométrica e geodésica do ' +
    'levantamento executado. 3. A planta anexa é parte integrante deste memorial descritivo.',
  requerimentoConfrontantes:
    'Declaram os requerentes que: não houve qualquer invasão ou sobreposição de áreas de imóveis ' +
    'confrontantes; os limites do imóvel foram devidamente respeitados; todos os confrontantes ' +
    'anuíram expressamente com os limites definidos, conforme assinaturas apostas na planta e no ' +
    'memorial descritivo, com firmas devidamente reconhecidas.\n\n' +
    'Declaram ainda que: não existem confrontantes incapazes; não há outros confrontantes além dos ' +
    'constantes nos documentos apresentados.',
  requerimentoResponsabilidade:
    'DA RESPONSABILIDADE CIVIL, CRIMINAL E TÉCNICA\n\n' +
    'O profissional responsável técnico declara a exatidão, o rigor e a veracidade técnica das medições, cálculos e do levantamento geodésico elaborado.\n\n' +
    'Por sua vez, o proprietário registral (transmitente) e os requerentes (adquirentes) declaram que a indicação física dos limites, marcos e confrontações fáticas em campo é de suas exclusivas responsabilidades, atestando o transmitente que indicou as divisas reais, pacíficas e consolidadas do imóvel no momento da medição.\n\n' +
    'Todos os signatários declaram, sob as penas da lei, que foram respeitados os direitos dos confrontantes e estão cientes de que respondem civil e criminalmente pela veracidade das informações, cada qual na medida de sua respectiva competência e atuação (o profissional pela exatidão das peças técnicas; e os proprietários/adquirentes pela correta indicação física dos limites e veracidade dos acordos de confrontação), atendendo ao que dispõe o §14 do art. 213 da Lei nº 6.015/73: “Verificado, a qualquer tempo, não serem verdadeiros os fatos constantes do memorial descritivo, responderão os requerentes e o profissional que o elaborou pelos prejuízos causados.”',
  requerimentoVenda:
    'O requerente, em conjunto com o proprietário registral acima qualificado, vem, ' +
    'respeitosamente, à presença de Vossa Senhoria, com fundamento no art. 176, §3º e §4º, e ' +
    'art. 213, inciso II, da Lei nº 6.015/73, com redação dada pela Lei nº 10.931/04, c/c o ' +
    'Decreto nº 4.449/02, requerer a averbação do georreferenciamento com retificação da área e ' +
    'da descrição do imóvel rural, visando a adequação da descrição tabular à realidade física ' +
    'do imóvel, considerando que o mesmo encontra-se em processo de transmissão ao requerente.',
  requerimentoDoacao:
    'O requerente, em conjunto com o proprietário registral acima qualificado, vem, ' +
    'respeitosamente, à presença de Vossa Senhoria, com fundamento no art. 176, §3º e §4º, e ' +
    'art. 213, inciso II, da Lei nº 6.015/73, com redação dada pela Lei nº 10.931/04, c/c o ' +
    'Decreto nº 4.449/02, requerer a averbação do georreferenciamento com retificação da área e ' +
    'da descrição do imóvel rural, visando a adequação da descrição tabular à realidade física ' +
    'do imóvel, considerando que o mesmo é objeto de doação ao requerente.',
  requerimentoUnificacao:
    'O requerente, em conjunto com o proprietário registral acima qualificado, vem, ' +
    'respeitosamente, à presença de Vossa Senhoria, com fundamento no art. 176, §3º e §4º, e ' +
    'art. 213, inciso II, da Lei nº 6.015/73, com redação dada pela Lei nº 10.931/04, c/c o ' +
    'Decreto nº 4.449/02, requerer a averbação do georreferenciamento com retificação da área e ' +
    'da descrição do imóvel rural, visando a adequação da descrição tabular à realidade física ' +
    'do imóvel, considerando que o requerente promove a unificação deste imóvel com outro(s) de sua propriedade.',
  requerimentoDesmembramento:
    'O requerente, em conjunto com o proprietário registral acima qualificado, vem, ' +
    'respeitosamente, à presença de Vossa Senhoria, com fundamento no art. 176, §3º e §4º, e ' +
    'art. 213, inciso II, da Lei nº 6.015/73, com redação dada pela Lei nº 10.931/04, c/c o ' +
    'Decreto nº 4.449/02, requerer a averbação do georreferenciamento com retificação da área e ' +
    'da descrição do imóvel rural, visando a adequação da descrição tabular à realidade física ' +
    'do imóvel, considerando que o requerente promove o desmembramento de parte deste imóvel.',
  requerimentoUsucapiao:
    'O requerente, em conjunto com o proprietário registral acima qualificado, vem, ' +
    'respeitosamente, à presença de Vossa Senhoria, com fundamento no art. 176, §3º e §4º, e ' +
    'art. 213, inciso II, da Lei nº 6.015/73, com redação dada pela Lei nº 10.931/04, c/c o ' +
    'Decreto nº 4.449/02, requerer a averbação do georreferenciamento com retificação da área e ' +
    'da descrição do imóvel rural, visando a adequação da descrição tabular à realidade física ' +
    'do imóvel, considerando que o requerente busca o reconhecimento da usucapião sobre o imóvel.',
  requerimentoRetificacao:
    'O requerente, na qualidade de proprietário/possuidor do imóvel rural acima qualificado, vem, ' +
    'respeitosamente, à presença de Vossa Senhoria, com fundamento no art. 176, §3º e §4º, e ' +
    'art. 213, inciso II, da Lei nº 6.015/73, com redação dada pela Lei nº 10.931/04, c/c o ' +
    'Decreto nº 4.449/02, requerer a averbação do georreferenciamento com retificação da área e ' +
    'da descrição do imóvel rural, visando a adequação da descrição tabular à realidade física ' +
    'do imóvel.',
  errataRatificacao:
    'Esta errata visa sanar apenas os erros materiais de digitação referentes às matrículas dos ' +
    'confrontantes e à inclusão de registro profissional, mantendo-se inalterados os limites físicos, ' +
    'as coordenadas georreferenciadas (SIRGAS2000), os azimutes e a área total de {area} do imóvel. ' +
    'Esta peça passa a ser parte integrante da documentação técnica para todos os fins de direito.',
  anuenciaFecho:
    'Declaro ainda que o respeito aos limites acima descritos não causa qualquer tipo de sobreposição ou ' +
    'invasão sobre a minha propriedade, estando a divisa física implantada há longa data e em perfeito comum acordo entre as partes.',
  memorialInfoTecnicasUrbano:
    'As coordenadas dos vértices descritos neste memorial foram determinadas por meio de levantamento ' +
    'topográfico georreferenciado ao Sistema Geodésico Brasileiro, adotando-se o datum SIRGAS2000, com ' +
    'emprego de tecnologia GNSS e/ou estação total, em conformidade com as normas técnicas e cadastrais ' +
    'aplicáveis a imóveis urbanos. As distâncias, o perímetro e a área do lote foram calculados a partir ' +
    'das coordenadas dos vértices levantados, em sistema de referência adequado ao levantamento realizado.',
  memorialObservacoesUrbano:
    'OBSERVAÇÕES: 1. O presente memorial descritivo reflete fielmente a situação física e geométrica do ' +
    'lote urbano na data do levantamento, destinando-se à sua individualização para fins de regularização ' +
    'registral e cadastral junto ao Município e ao Cartório de Registro de Imóveis. 2. Os limites e ' +
    'divisas físicas descritos foram expressamente indicados em campo pelo proprietário/possuidor ' +
    'requerente, sob sua inteira responsabilidade civil e criminal, respondendo o profissional signatário ' +
    'tão somente pela exatidão geométrica e geodésica do levantamento executado. 3. A planta anexa é ' +
    'parte integrante deste memorial descritivo.',
  propostaTexto:
    'Apresentamos nossa proposta de prestação de serviços para o imóvel {denominacao}, matrícula {matricula}, ' +
    'situado em {municipio}, com área de {area}. O serviço compreende o levantamento topográfico georreferenciado, ' +
    'a elaboração das peças técnicas (memorial descritivo e planta) e o acompanhamento do processo até a ' +
    'certificação, conforme as condições de valor e prazo abaixo.',
  declPosse:
    'DECLARO, para os devidos fins de direito e sob as penas da lei, que exerço a posse mansa, pacífica e ' +
    'ininterrupta do imóvel {denominacao}, situado em {municipio}, comportando-me como legítimo possuidor(a), ' +
    'sem oposição de terceiros, respondendo civil e criminalmente pela veracidade desta declaração.',
  declInexistenciaSobreposicao:
    'DECLARO, sob as penas da lei, na qualidade de responsável técnico pelo levantamento do imóvel {denominacao}, ' +
    'situado em {municipio}, que, com base nas confrontações indicadas em campo pelo proprietário e na análise de ' +
    'cadastros públicos oficiais e das peças apresentadas pelas partes confrontantes, os limites medidos e georreferenciados ' +
    '(SIRGAS2000) não apresentam sobreposição de áreas tabulares ou limites de domínio público registrados, cabendo a indicação ' +
    'e o respeito aos limites fáticos de posse exclusivamente ao proprietário requerente.',
  declIncapaz:
    'DECLARO, sob as penas da lei, que sou o representante legal (tutor/curador/representante) de {representado}, ' +
    'menor/incapaz titular de direitos sobre o imóvel {denominacao}, comarca de {municipio}, e que o represento para ' +
    'todos os fins de georreferenciamento, retificação de registro e anuências de limites, respondendo civil e criminalmente ' +
    'pela veracidade desta representação.',
  declEspolio:
    'DECLARO, sob as penas da lei, que sou o inventariante devidamente nomeado do espólio de {falecido}, ' +
    'proprietário falecido do imóvel {denominacao}, comarca de {municipio}, e que possuo plenos poderes de representação ' +
    'ativa e passiva do espólio para fins de georreferenciamento, retificação de registro e anuências perante confrontantes, ' +
    'respondendo civil e criminalmente por esta declaração.',
  declRespeitoLimites:
    'DECLARAMOS, sob as penas da lei, que os limites e divisas do imóvel {denominacao}, matrícula {matricula}, ' +
    'situado em {municipio}, são respeitados de comum acordo por todas as partes confrontantes há longa data, ' +
    'inexistindo qualquer tipo de sobreposição, invasão ou litígio sobre as áreas ou linhas limítrofes indicadas ' +
    'na planta e memorial descritivo.',
  servidaoIntro:
    'O presente memorial descritivo tem por objeto a ÁREA DE SERVIDÃO instituída sobre o imóvel {denominacao}, ' +
    'matrícula {matricula}, situado em {municipio}, com área de servidão de {area} e perímetro de {perimetro}. ' +
    'A faixa de servidão destina-se à sua finalidade específica (passagem, rede de energia, adutora, estrada ou ' +
    'outra), respeitando-se integralmente os limites do imóvel serviente e as divisas de terceiros, conforme a ' +
    'descrição do perímetro a seguir.',
  memorialIntermatFinalidade:
    'O presente memorial descritivo destina-se ao processo de regularização fundiária junto ao INSTITUTO DE ' +
    'TERRAS DE MATO GROSSO — INTERMAT, relativo ao imóvel {denominacao}, situado em {municipio}, com área de ' +
    '{area} e perímetro de {perimetro}. O levantamento georreferenciado ao Sistema Geodésico Brasileiro ' +
    '(SIRGAS2000) observa a norma técnica do Incra para georreferenciamento de imóveis rurais e destina-se à ' +
    'instrução do pedido de titulação/regularização de área pública estadual, sem prejuízo da certificação junto ' +
    'ao Incra e da anuência dos confrontantes.',
};

// Variáveis oferecidas ao usuário (para o painel de ajuda do editor).
export const VARIAVEIS_MODELO: { chave: string; descricao: string }[] = [
  { chave: '{proprietario}', descricao: 'Nome do proprietário' },
  { chave: '{cpf}', descricao: 'CPF/CNPJ do proprietário' },
  { chave: '{denominacao}', descricao: 'Nome do imóvel' },
  { chave: '{matricula}', descricao: 'Matrícula' },
  { chave: '{cns}', descricao: 'CNS do cartório' },
  { chave: '{municipio}', descricao: 'Município' },
  { chave: '{comarca}', descricao: 'Comarca' },
  { chave: '{area}', descricao: 'Área (ha)' },
  { chave: '{areaAnterior}', descricao: 'Área anterior (matrícula)' },
  { chave: '{areaDiferenca}', descricao: 'Diferença de área (ha)' },
  { chave: '{areaDiferencaM2}', descricao: 'Diferença de área (m²)' },
  { chave: '{areaDiferencaPct}', descricao: 'Divergência de área (%)' },
  { chave: '{perimetro}', descricao: 'Perímetro (m)' },
  { chave: '{codigoIncra}', descricao: 'Código do imóvel no INCRA' },
  { chave: '{tecnico}', descricao: 'Nome do responsável técnico' },
  { chave: '{cft}', descricao: 'Registro CFT/CREA do técnico' },
  { chave: '{numeroTrt}', descricao: 'Número do TRT/ART do projeto' },
  { chave: '{cidade}', descricao: 'Cidade da assinatura' },
  { chave: '{data}', descricao: 'Data por extenso' },
];

const KEY = 'metrica.modelosDocs';

export function carregarModelos(): ModelosDocs {
  if (typeof window === 'undefined') return MODELOS_PADRAO;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return MODELOS_PADRAO;
    return { ...MODELOS_PADRAO, ...JSON.parse(raw) };
  } catch { return MODELOS_PADRAO; }
}

export function salvarModelos(m: ModelosDocs): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(KEY, JSON.stringify(m)); } catch { /* ignore */ }
}

/** Troca as variáveis {chave} do modelo pelos valores reais. Chaves desconhecidas viram ''. */
export function preencherModelo(texto: string, vars: Record<string, string | undefined>): string {
  return (texto || '').replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? '').toString());
}

/** Quebra um modelo em parágrafos (linhas em branco separam), já com as variáveis trocadas. */
export function preencherModeloParagrafos(texto: string, vars: Record<string, string | undefined>): string[] {
  return preencherModelo(texto, vars)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
