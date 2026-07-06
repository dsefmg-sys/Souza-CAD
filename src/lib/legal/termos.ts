// Condições de uso do Souza CAD — texto em tom CORDIAL de propósito (pedido do dono, 05/07/2026):
// as proteções continuam as mesmas (sem garantias, responsabilidade técnica do usuário, preço
// futuro, direitos autorais), mas escritas como uma conversa franca, sem juridiquês agressivo.
// O texto mora em Ajustes (Sobre o sistema); o aceite é registrado discretamente no primeiro
// acesso ("ao concluir, você concorda…"). NÃO é aconselhamento jurídico.

// Suba a versão sempre que o texto mudar de forma relevante.
export const TERMOS_VERSAO = '2026-07-05';
export const TERMOS_TITULAR = 'Darlan Souza';

export interface SecaoTermo { titulo: string; texto: string; }

export const TERMOS: SecaoTermo[] = [
  {
    titulo: 'Sobre estas condições',
    texto: `Usar o Souza CAD significa concordar com estas condições. Elas existem pra deixar a relação clara e justa entre quem fez o sistema e quem usa — leia quando quiser, está tudo aqui.`,
  },
  {
    titulo: 'Um sistema em evolução',
    texto: `O sistema é oferecido hoje gratuitamente, do jeito que está, e segue em constante desenvolvimento. Fazemos o possível pra que tudo funcione bem, mas não há garantia de disponibilidade contínua nem de ausência de erros.`,
  },
  {
    titulo: 'O trabalho técnico é seu',
    texto: `O Souza CAD é uma ferramenta de apoio. Os cálculos, memoriais, plantas, planilhas e demais peças geradas são de responsabilidade técnica e profissional de quem as produz e do respectivo responsável técnico. Confira sempre os dados e resultados antes de usá-los oficialmente em cartórios, INCRA, SIGEF ou com terceiros — a palavra final é sempre a do profissional.`,
  },
  {
    titulo: 'Limites de responsabilidade',
    texto: `Por ser uma ferramenta gratuita e em evolução, o titular não se responsabiliza por prejuízos decorrentes do uso ou da indisponibilidade do sistema, incluindo perda de dados. Mantenha seus backups em dia — o próprio sistema oferece exportação de projetos e configurações pra facilitar isso.`,
  },
  {
    titulo: 'Preço no futuro',
    texto: `Hoje o uso é gratuito. Lá na frente, o sistema poderá passar a ter planos pagos, sempre com aviso prévio — a gratuidade de hoje não é uma promessa de gratuidade pra sempre.`,
  },
  {
    titulo: 'Autoria e uso',
    texto: `O sistema — código, visual, textos e modelos de peças — é criação e propriedade do titular, protegido por direitos autorais. O acesso é uma licença de uso pessoal e intransferível: copiar, revender, redistribuir ou derivar outro produto do sistema depende de autorização por escrito.`,
  },
  {
    titulo: 'Seus dados',
    texto: `Os dados que você cadastra (proprietários, confrontantes, imóveis) são seus e de sua responsabilidade, inclusive perante a LGPD. O titular pode ver dados básicos de uso (empresa, responsável técnico, volume de projetos) pra acompanhar e melhorar o sistema. Seus dados não são vendidos a ninguém.`,
  },
  {
    titulo: 'Encerramento',
    texto: `O titular pode suspender contas que façam mau uso do sistema e, se um dia for necessário, descontinuar o serviço — nesse caso, com esforço razoável de aviso pra ninguém perder trabalho.`,
  },
  {
    titulo: 'Registro do aceite',
    texto: `A concordância com estas condições fica registrada eletronicamente, com data e identificação da conta, no momento do cadastro.`,
  },
];
