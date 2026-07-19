// Temas de aprendizado da ajuda: cada área que o SOUZA CAD atende, em DOIS níveis —
// iniciante (didático) e experiente (mais direto). Linguagem de conversa.

export interface TemaAjuda {
  id: string;
  titulo: string;
  iniciante: string;
  experiente: string;
  audioUrlIniciante?: string;
  audioUrlExperiente?: string;
}

export const TEMAS_AJUDA: TemaAjuda[] = [
  {
    id: 'modos',
    titulo: 'Modo Fácil/Completo e layout',
    iniciante:
      'No SOUZA CAD tem duas coisas diferentes. A chave Fácil e Completo, na barra de baixo, decide quantas ferramentas aparecem. No Fácil fica o caminho essencial: pontos, vizinhos, confrontantes e peças. No Completo entram desenho, cotas, hachuras, errata e CAR. A tela é larga de propósito: colunas lado a lado, menos rolagem. O nível da ajuda, iniciante ou experiente, só muda o tamanho destas explicações — não muda as ferramentas.',
    experiente:
      'No SOUZA CAD, a chave faz uma coisa só: o Fácil esconde desenho avançado, errata, CAR e banco de pontos; o Completo mostra tudo. O layout é horizontal de propósito, pra aproveitar a largura da tela. Lembre que o nível da ajuda é separado do modo — só muda o quanto eu explico, nunca as ferramentas.',
    audioUrlIniciante: '/audio/tutorial/tema-modos-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-modos-experiente.mp3',
  },
  {
    id: 'desenho-achuras',
    titulo: 'Desenho, símbolos e hachuras',
    iniciante:
      'No Completo, o SOUZA CAD deixa você enfeitar o mapa e a planta: linhas, polilinhas, cotas e textos. Polígono fechado pode ganhar cor e hachura — linhas a quarenta e cinco graus, grade ou pontos. Símbolos como árvore, poste ou casa entram pelos botões, e você ajusta o tamanho no painel do objeto.',
    experiente:
      'No SOUZA CAD, no modo Completo, você tem objetos livres pra enriquecer a planta: polilinha com cor e espessura, polígono com preenchimento e hachura, símbolos de dez a cento e cinquenta pixels. Tudo organizado por camada, do seu jeito. É assim que a planta sai com cara de trabalho profissional.',
    audioUrlIniciante: '/audio/tutorial/tema-desenho-achuras-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-desenho-achuras-experiente.mp3',
  },
  {
    id: 'georreferenciamento',
    titulo: 'Georreferenciamento e SIGEF',
    iniciante:
      'Georreferenciar é medir o imóvel rural com coordenadas oficiais do Brasil e registrar no SIGEF, o sistema do INCRA. Depois de certificado, os limites valem em todo o país. Sem isso, o cartório trava venda e divisão de muitos imóveis rurais. O SOUZA CAD cuida da parte técnica: área no critério certo, planilha no formato do SIGEF e documentos pro cartório.',
    experiente:
      'O fluxo no SOUZA CAD é direto: importar pontos, código por credenciado com banco único, ODS no modelo oficial e área no SGL. A conferência já barra tudo que o SIGEF rejeita. E vértice compartilhado com o vizinho mantém sempre o mesmo código — isso é o jeito certo de fazer.',
    audioUrlIniciante: '/audio/tutorial/tema-georreferenciamento-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-georreferenciamento-experiente.mp3',
  },
  {
    id: 'campo-desenho',
    titulo: 'Do campo ao desenho',
    iniciante:
      'O GPS entrega um arquivo de texto com leste e norte de cada ponto. O mesmo par de números existe em vários fusos do planeta. O SOUZA CAD sugere o fuso comparando com cidades da sua região — você confirma na prévia. Se o desenho cair longe no mapa, o fuso está errado: troque antes de importar.',
    experiente:
      'No SOUZA CAD, o mapeamento de colunas fica nas Configurações. A detecção de fuso usa âncoras regionais. Vale restringir os fusos à sua área de atuação. Se nenhuma âncora resolver, é só confirmar o fuso na mão, na prévia, antes de importar.',
    audioUrlIniciante: '/audio/tutorial/tema-campo-desenho-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-campo-desenho-experiente.mp3',
  },
  {
    id: 'vizinhos',
    titulo: 'Vizinhos certificados',
    iniciante:
      'Se o vizinho já certificou, a divisa comum já tem código oficial. A regra é reaproveitar esse código, nunca inventar outro pro mesmo canto. No SOUZA CAD, o botão SIGEF busca os imóveis certificados ao redor e desenha o contorno. Clique no vértice do vizinho pra adotar o código dele — evita a rejeição mais comum.',
    experiente:
      'No SOUZA CAD, o botão SIGEF consulta o acervo e salva as parcelas. Depois vira Análise, com checagem de sobreposição. Você adota o vértice pelo clique, ou importa o arquivo do Distribuidor de Coordenadas. Vértice adotado não gasta numeração do seu banco — é economia no dia a dia.',
    audioUrlIniciante: '/audio/tutorial/tema-vizinhos-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-vizinhos-experiente.mp3',
  },
  {
    id: 'confrontantes',
    titulo: 'Confrontantes e divisas',
    iniciante:
      'Confrontante é quem faz divisa com o imóvel. Cada trecho precisa de um nome. No SOUZA CAD, use o pincel: escolha o confrontante e clique nos vértices do trecho. Cada um ganha cor e entra na legenda. Tipo de divisa — cerca, estrada, córrego — também se pinta. Atalho: duplo clique no vértice ou no trecho pra ajustar na hora, no mapa ou na planta.',
    experiente:
      'No SOUZA CAD, o pincel é de dois cliques: do início ao fim do trecho. Posseiro sai sem matrícula; espólio precisa de inventariante. O cônjuge do confrontante já ganha espaço de assinatura. Os tipos de divisa alimentam o memorial e a planilha. E o duplo clique abre o ajuste rápido, na hora.',
    audioUrlIniciante: '/audio/tutorial/tema-confrontantes-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-confrontantes-experiente.mp3',
  },
  {
    id: 'area-sgl',
    titulo: 'Área SGL versus área plana',
    iniciante:
      'A área que o SIGEF certifica não é a área “no papel plano”. Ela considera a curvatura da Terra e a altitude. Por isso quase sempre difere um pouco da área UTM de outros programas. Não é erro. O SOUZA CAD já calcula no sistema que o INCRA confere.',
    experiente:
      'No SOUZA CAD, o SGL usa origem no primeiro vértice e elevação média. A conferência reconcilia com o retorno do SIGEF quando você cola o valor. O fator K e a convergência saem na caixa de coordenadas da planta — tudo no critério que o INCRA confere.',
    audioUrlIniciante: '/audio/tutorial/tema-area-sgl-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-area-sgl-experiente.mp3',
  },
  {
    id: 'memorial',
    titulo: 'Memorial descritivo',
    iniciante:
      'O memorial conta o perímetro lado a lado: azimute, distância, tipo de divisa e confrontante, até fechar no ponto inicial. O SOUZA CAD gera o Word pronto — identificação no topo, narrativa limpa e blocos de assinatura que não quebram no meio da página. Confira os dados do imóvel antes de gerar.',
    experiente:
      'No SOUZA CAD, o memorial sai em Word com Arial, e as assinaturas não quebram de página. O TRT vem do projeto. A narrativa usa os valores da conferência. E os campos colados passam por uma limpeza de caracteres invisíveis — nada de sujeira no documento.',
    audioUrlIniciante: '/audio/tutorial/tema-memorial-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-memorial-experiente.mp3',
  },
  {
    id: 'planta',
    titulo: 'Planta',
    iniciante:
      'A planta do SOUZA CAD sai em A3 deitada: desenho à esquerda, carimbo à direita com dados, declarações e laudo. Embaixo, satélite, convenções e coordenadas. Quase tudo se arrasta — textos, rótulos, blocos — e a posição fica salva no projeto. As marcas no topo são guias de dobra pra caber em pasta A4. Lembre: pra mexer no layout, destrave a folha na barra lateral.',
    experiente:
      'No SOUZA CAD, a planta vem com margens ABNT, escala automática ou manual e grade sem vazamento. O estilo de vértice pode ser SIGEF ou P1, P2. A posição, a escala e o negrito são por elemento, e ficam salvos no projeto. O PDF sai pela impressão do navegador — vale conferir a escala gráfica.',
    audioUrlIniciante: '/audio/tutorial/tema-planta-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-planta-experiente.mp3',
  },
  {
    id: 'requerimento',
    titulo: 'Requerimento, atos e comarca',
    iniciante:
      'O requerimento é a carta ao cartório. O SOUZA CAD monta qualificação e texto conforme o ato: venda, doação, usucapião, desmembramento ou unificação. Dá pra incluir várias partes. A comarca já vem do padrão que você salvou nos Ajustes.',
    experiente:
      'No SOUZA CAD, os textos são específicos por ato, com múltiplas matrículas de origem, partes adicionais ilimitadas e a comarca padrão do escritório. É o ato entrando pronto, sem retrabalho de digitação.',
    audioUrlIniciante: '/audio/tutorial/tema-requerimento-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-requerimento-experiente.mp3',
  },
  {
    id: 'trt',
    titulo: 'TRT e responsabilidade técnica',
    iniciante:
      'O TRT é o documento do seu conselho dizendo que você responde por aquele serviço. Cada projeto tem o seu número — não reaproveita. No SOUZA CAD você registra na tela de TRT do projeto; memorial e peças passam a citar esse número.',
    experiente:
      'No SOUZA CAD, o TRT é sempre por projeto. O memorial prioriza o número do projeto. E a conferência avisa se faltar TRT antes de exportar a peça oficial — ninguém entrega documento incompleto sem saber.',
    audioUrlIniciante: '/audio/tutorial/tema-trt-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-trt-experiente.mp3',
  },
  {
    id: 'car',
    titulo: 'CAR — Cadastro Ambiental Rural',
    iniciante:
      'O CAR registra a situação ambiental do imóvel: reserva legal, APP de rio ou nascente, vegetação e uso consolidado. No SOUZA CAD, no modo Médio ou Completo, o botão CAR faz a conta: escolha o bioma e veja os percentuais. Se você já desenhou essas áreas no mapa, os valores vêm preenchidos.',
    experiente:
      'No SOUZA CAD, a reserva legal é por bioma, e a APP por largura de curso d\'água e raio de nascente. Os polígonos que você já desenhou preenchem o formulário. O shapefile por camada já funciona; a exportação direta ao SICAR ainda está a caminho.',
    audioUrlIniciante: '/audio/tutorial/tema-car-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-car-experiente.mp3',
  },
  {
    id: 'dxf-editor',
    titulo: 'Editor de DXF avulso',
    iniciante:
      'Além do projeto de agrimensura, o SOUZA CAD tem um editor de DXF separado — pra abrir desenho elétrico, hidráulico ou de terceiros sem misturar com o imóvel. Fica no rodapé. Você abre o arquivo, move, apaga, desenha linha e texto, organiza por camadas e baixa o DXF editado.',
    experiente:
      'No SOUZA CAD, o editor lê linhas, polilinhas, círculos, arcos, textos e pontos. Tem pan, zoom, seleção e exportação em DXF R12. As camadas vêm com cor, visibilidade e trava. Os blocos ainda não são desenhados — é a próxima evolução.',
    audioUrlIniciante: '/audio/tutorial/tema-dxf-editor-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-dxf-editor-experiente.mp3',
  },
  {
    id: 'financeiro',
    titulo: 'Financeiro: recibo e contrato',
    iniciante:
      'No SOUZA CAD você também cuida do combinado com o cliente: valor, gastos e recebimentos do projeto, depois gera recibo e contrato em PDF. O contrato descreve serviço, valor, prazo e obrigações. O recibo sai numerado em sequência.',
    experiente:
      'No SOUZA CAD, a gestão é por projeto, com PDF, valor por extenso e numeração de recibo. No caminho: a identidade do escritório nas peças financeiras e cláusulas extras no contrato. É o financeiro junto com o técnico, sem planilha de fora.',
    audioUrlIniciante: '/audio/tutorial/tema-financeiro-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-financeiro-experiente.mp3',
  },
];
