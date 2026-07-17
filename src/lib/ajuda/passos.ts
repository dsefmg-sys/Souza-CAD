import type { ComponentType } from 'react';
import {
  Upload, Search, UserCheck, BookUser, Users, Brush, FileText, Save,
  ToggleRight, Ruler, Sparkles, type LucideProps,
} from 'lucide-react';

export interface Passo {
  icone: ComponentType<LucideProps>;
  titulo: string;
  texto: string;
  audioUrl?: string;
}

// PASSOS BÁSICOS — o caminho essencial de um projeto, na ordem em que a tela conduz.
// Linguagem de conversa, amigável. O produto se chama SEMPRE "SOUZA CAD".
export const PASSOS_BASE: Passo[] = [
  {
    icone: ToggleRight,
    titulo: 'A chave Fácil e Completo',
    texto: 'No SOUZA CAD você escolhe o tamanho da tela. Na barra flutuante embaixo tem uma chave: Fácil ou Completo. No Fácil aparece só o essencial — importar pontos, vizinhos, confrontantes e gerar as peças. No Completo entram desenho, cotas, hachuras e o resto das ferramentas. Pode trocar a qualquer hora: nada do projeto se perde.\n\nNa mesma região da barra lateral esquerda, em Visualização e Navegação, fica o botão Folha Travada. Com a folha travada, o carimbo e o layout ficam protegidos. Quer mover título, rosa dos ventos ou escala? Destrave, ajuste, e trave de novo. Assim você não arrasta nada sem querer.',
  },
  {
    icone: Users,
    titulo: 'Tela larga e barra que se move',
    texto: 'O SOUZA CAD foi pensado pra tela larga: dados, mapa e formulários lado a lado, sem ficar rolando pra cima e pra baixo o tempo todo. A barra de controle embaixo você pode arrastar pra onde quiser — é só clicar e puxar — pra ela não cobrir o que você está vendo.',
    audioUrl: '/audio/tutorial/passo-base-1.mp3',
  },
  {
    icone: Upload,
    titulo: 'Trazer os pontos do campo',
    texto: 'Comece pelos pontos. Clique em Pontos e importe o arquivo TXT ou CSV que saiu do seu GPS. Se as colunas vierem em outra ordem, configure o mapeador uma vez e o SOUZA CAD lembra. Ele monta a poligonal e escolhe o fuso UTM com base na sua região.',
    audioUrl: '/audio/tutorial/passo-base-2.mp3',
  },
  {
    icone: Search,
    titulo: 'Vizinhos no SIGEF',
    texto: 'Pra não levar rejeição no INCRA, use o botão SIGEF. O SOUZA CAD busca os imóveis certificados ao redor e desenha os limites no mapa. Dá pra clicar no vértice do vizinho e adotar o código oficial dele na sua divisa — assim os números batem e a divisa fica limpa.',
    audioUrl: '/audio/tutorial/passo-base-3.mp3',
  },
  {
    icone: BookUser,
    titulo: 'Dados do imóvel e do dono',
    texto: 'No painel de Dados, preencha proprietário, imóvel e cartório. Na hora do Requerimento, escolha o tipo de ato — venda, doação, usucapião, desmembramento ou unificação. O SOUZA CAD monta o texto jurídico e as cláusulas certas pra aquele ato.',
    audioUrl: '/audio/tutorial/passo-base-4.mp3',
  },
  {
    icone: Brush,
    titulo: 'Pintar confrontantes e divisas',
    texto: 'Com as ferramentas Confro e Divisas, você pinta o perímetro: quem confronta de cada lado e se a divisa é cerca, muro, vala e por aí vai. O SOUZA CAD colore o mapa e monta a legenda sozinho, na planta e no memorial.',
    audioUrl: '/audio/tutorial/passo-base-5.mp3',
  },
  {
    icone: FileText,
    titulo: 'Gerar as peças pra entregar',
    texto: 'Quando estiver pronto, exporte tudo: memorial em Word, planilha do SIGEF, requerimento e planta em PDF. As cartas de anuência já saem com a lista de vértices em tabela limpa, sem campo de endereço a mais — menos burocracia na assinatura.',
    audioUrl: '/audio/tutorial/passo-base-6.mp3',
  },
  {
    icone: Save,
    titulo: 'Salvar e banco de pontos',
    texto: 'O SOUZA CAD vai salvando sozinho, no computador e na nuvem quando você está logado. Os códigos de vértice entram no seu banco de pontos: o mesmo número não se repete em outro projeto da empresa. Seu acervo fica organizado sem esforço.',
    audioUrl: '/audio/tutorial/passo-base-7.mp3',
  },
];

// PASSOS AVANÇADOS — só aparecem quando a tela está no modo Completo.
export const PASSOS_AVANCADOS: Passo[] = [
  {
    icone: UserCheck,
    titulo: 'Casar vértices com o vizinho',
    texto: 'Dois códigos diferentes no mesmo canto físico é o erro que mais rejeita no SIGEF. No modo Completo, a ferramenta Casar acha pontos que coincidem com o vizinho certificado e unifica os nomes. Também dá pra importar o arquivo de outro agrimensor no painel de Vizinhos e alinhar a divisa comum.',
    audioUrl: '/audio/tutorial/passo-avancado-0.mp3',
  },
  {
    icone: Sparkles,
    titulo: 'Desenho, hachuras e símbolos',
    texto: 'No SOUZA CAD você enriquece a planta com linhas, cotas, textos livres e símbolos — poste, marco, árvore. Dá pra hachurar áreas de preservação ou servidão, em linhas a quarenta e cinco graus ou em grade, e organizar tudo por camadas, com cor e espessura do seu jeito.\n\n⚠️ Botão Folha Travada — essencial ao editar a planta:\nPra reposicionar rosa dos ventos, escala, título ou qualquer pedaço do carimbo, a folha precisa estar destravada. O botão fica na barra lateral esquerda, em Visualização e Navegação. Destrave, ajuste o layout, e trave de novo. Travado, nada se move sem querer — o ideal pro dia a dia.',
  },
  {
    icone: Ruler,
    titulo: 'Vértice virtual e ferramentas CAD',
    texto: 'Tem canto que não dá pra ocupar no campo — meio de rio, dentro de uma construção. Aí entra o vértice virtual: o SOUZA CAD calcula a posição por distância e direção, ou pelo cruzamento de dois alinhamentos. O ímã gruda o cursor no canto certo. Paralela, Dividir e Prolongar fecham o acabamento do desenho.',
    audioUrl: '/audio/tutorial/passo-avancado-2.mp3',
  },
  {
    icone: FileText,
    titulo: 'Retificações e errata',
    texto: 'Matrícula antiga com vários erros? No painel de Errata você junta correções de tipos diferentes — área, confrontação, nome — e o SOUZA CAD organiza isso numa narrativa só, pronta pro cartório.',
    audioUrl: '/audio/tutorial/passo-avancado-3.mp3',
  },
  {
    icone: Ruler,
    titulo: 'Área no sistema local (SGL)',
    texto: 'O INCRA não aceita a área “plana” do UTM. O SOUZA CAD calcula área e perímetro no Sistema Geodésico Local, o mesmo critério do SIGEF. Assim o número da sua planta bate com o que o sistema federal confere.',
    audioUrl: '/audio/tutorial/passo-avancado-4.mp3',
  },
  {
    icone: Upload,
    titulo: 'Qualquer arquivo de GPS',
    texto: 'Seu equipamento manda vírgula, ponto e vírgula ou tabulação? Colunas em outra ordem? O mapeador de colunas do SOUZA CAD associa os campos em segundos e guarda a configuração pras próximas importações.',
    audioUrl: '/audio/tutorial/passo-avancado-5.mp3',
  },
  {
    icone: Save,
    titulo: 'Contrato e dinheiro do serviço',
    texto: 'Sem sair do projeto: registre valor, despesas e parcelas. O SOUZA CAD gera contrato de prestação de serviço e recibo com valor por extenso, prontos pra imprimir ou assinar.',
    audioUrl: '/audio/tutorial/passo-avancado-6.mp3',
  },
];
