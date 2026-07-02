// Termos de uso do Souza CAD. Aceite obrigatório ao cadastrar a empresa / no primeiro acesso.
// Objetivo: proteger o criador (que oferece o software gratuitamente, em fase de testes) — sem
// garantias, sem responsabilidade pelos trabalhos gerados, com direito de cobrar no futuro e com
// os direitos autorais reservados. NÃO é aconselhamento jurídico; é uma base protetiva razoável.

// Suba a versão sempre que o texto mudar de forma relevante — quem já aceitou verá de novo.
export const TERMOS_VERSAO = '2026-07-02';
export const TERMOS_TITULAR = 'Darlan Souza';

export interface SecaoTermo { titulo: string; texto: string; }

export const TERMOS: SecaoTermo[] = [
  {
    titulo: '1. Aceitação',
    texto: `Ao cadastrar sua empresa e utilizar o Souza CAD ("o sistema"), você declara ter lido, entendido e aceitado integralmente estes Termos de Uso. Se não concordar, não utilize o sistema.`,
  },
  {
    titulo: '2. Natureza gratuita e fase de testes',
    texto: `O sistema é disponibilizado gratuitamente, no estado em que se encontra ("como está"), em caráter experimental e de testes, sem qualquer garantia de funcionamento contínuo, disponibilidade, ausência de erros, ou adequação a uma finalidade específica.`,
  },
  {
    titulo: '3. Ausência de responsabilidade pelos trabalhos',
    texto: `O titular do sistema NÃO é responsável, em nenhuma hipótese, por qualquer trabalho, cálculo, medição, memorial, planta, planilha, peça técnica, documento ou resultado produzido, exportado ou apresentado por meio do sistema. Toda a responsabilidade técnica, profissional, civil e administrativa é exclusiva do usuário e do respectivo responsável técnico (RT). Cabe ao usuário conferir todos os dados e resultados antes de qualquer uso oficial, perante cartórios, INCRA, SIGEF ou terceiros.`,
  },
  {
    titulo: '4. Limitação de responsabilidade',
    texto: `O titular não responde por danos diretos, indiretos, lucros cessantes, perda de dados, prejuízos financeiros ou de qualquer natureza decorrentes do uso ou da impossibilidade de uso do sistema. O uso é por conta e risco do usuário.`,
  },
  {
    titulo: '5. Possibilidade de cobrança futura',
    texto: `O sistema é gratuito hoje, mas o titular poderá, a qualquer momento e a seu exclusivo critério, introduzir taxas, mensalidades ou qualquer forma de cobrança pelo uso, no todo ou em parte, mediante aviso prévio. O uso gratuito atual não gera direito adquirido à gratuidade permanente.`,
  },
  {
    titulo: '6. Propriedade intelectual e direitos autorais',
    texto: `Todo o sistema — código, interface, marca, textos, layout das peças e demais elementos — é de propriedade e autoria exclusiva do titular, protegido por direitos autorais. É vedado copiar, redistribuir, revender, sublicenciar, descompilar ou criar obras derivadas do sistema sem autorização expressa e por escrito do titular. O acesso concedido é uma licença de uso pessoal, limitada, revogável e intransferível.`,
  },
  {
    titulo: '7. Dados e privacidade',
    texto: `Os dados cadastrados são de responsabilidade do usuário, inclusive quanto à base legal para tratamento de dados de terceiros (proprietários, confrontantes) conforme a LGPD. O titular poderá acessar dados de uso (empresa, responsável técnico, data e volume de projetos) para acompanhar e melhorar o sistema. Não venda de dados a terceiros.`,
  },
  {
    titulo: '8. Suspensão e encerramento',
    texto: `O titular pode, a qualquer momento e sem aviso, suspender, limitar ou encerrar o acesso de qualquer usuário, bem como descontinuar o sistema, sem que isso gere qualquer direito a indenização.`,
  },
  {
    titulo: '9. Aceite eletrônico',
    texto: `O aceite destes termos é registrado eletronicamente, com data e identificação da conta, e tem validade como manifestação de vontade do usuário.`,
  },
];
