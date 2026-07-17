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
      'No SOUZA CAD: modo Fácil esconde desenho avançado, errata, CAR e banco de pontos; Completo mostra tudo. Layout horizontal prioriza largura útil. Nível da ajuda é independente do modo.',
    audioUrlIniciante: '/audio/tutorial/tema-modos-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-modos-experiente.mp3',
  },
  {
    id: 'desenho-achuras',
    titulo: 'Desenho, símbolos e hachuras',
    iniciante:
      'No Completo, o SOUZA CAD deixa você enfeitar mapa e planta: linhas, polilinhas, cotas e textos. Polígono fechado pode ganhar cor e hachura — linhas a quarenta e cinco graus, grade ou pontos. Símbolos como árvore, poste ou casa entram pelos botões e você ajusta o tamanho no painel do objeto.',
    experiente:
      'Objetos livres no Completo: polilinha com cor e espessura; polígono com preenchimento e hachura; símbolos de dez a cento e cinquenta pixels. Tudo por camada.',
    audioUrlIniciante: '/audio/tutorial/tema-desenho-achuras-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-desenho-achuras-experiente.mp3',
  },
  {
    id: 'georreferenciamento',
    titulo: 'Georreferenciamento e SIGEF',
    iniciante:
      'Georreferenciar é medir o imóvel rural com coordenadas oficiais do Brasil e registrar no SIGEF, o sistema do INCRA. Depois de certificado, os limites valem em todo o país. Sem isso, o cartório trava venda e divisão de muitos imóveis rurais. O SOUZA CAD cuida da parte técnica: área no critério certo, planilha no formato do SIGEF e documentos pro cartório.',
    experiente:
      'Fluxo no SOUZA CAD: importar pontos, código por credenciado com banco único, ODS no modelo oficial, área no SGL. A conferência barra o que o SIGEF rejeita. Vértice compartilhado com vizinho mantém o mesmo código — isso é correto.',
    audioUrlIniciante: '/audio/tutorial/tema-georreferenciamento-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-georreferenciamento-experiente.mp3',
  },
  {
    id: 'campo-desenho',
    titulo: 'Do campo ao desenho',
    iniciante:
      'O GPS entrega um arquivo de texto com leste e norte de cada ponto. O mesmo par de números existe em vários fusos do planeta. O SOUZA CAD sugere o fuso comparando com cidades da sua região — você confirma na prévia. Se o desenho cair longe no mapa, o fuso está errado: troque antes de importar.',
    experiente:
      'Mapeamento de colunas nas Configurações. Detecção de fuso por âncora regional. Restrinja os fusos permitidos à sua área de atuação. Se nenhuma âncora resolver, confirme o fuso na mão na prévia.',
    audioUrlIniciante: '/audio/tutorial/tema-campo-desenho-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-campo-desenho-experiente.mp3',
  },
  {
    id: 'vizinhos',
    titulo: 'Vizinhos certificados',
    iniciante:
      'Se o vizinho já certificou, a divisa comum já tem código oficial. A regra é reaproveitar esse código, nunca inventar outro pro mesmo canto. No SOUZA CAD, o botão SIGEF busca os imóveis certificados ao redor e desenha o contorno. Clique no vértice do vizinho pra adotar o código dele — evita a rejeição mais comum.',
    experiente:
      'SIGEF consulta o acervo e salva as parcelas. Depois vira Análise, com checagem de sobreposição. Adote o vértice pelo clique ou importe o arquivo do Distribuidor de Coordenadas. Vértice adotado não gasta numeração do seu banco.',
    audioUrlIniciante: '/audio/tutorial/tema-vizinhos-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-vizinhos-experiente.mp3',
  },
  {
    id: 'confrontantes',
    titulo: 'Confrontantes e divisas',
    iniciante:
      'Confrontante é quem faz divisa com o imóvel. Cada trecho precisa de um nome. No SOUZA CAD, use o pincel: escolha o confrontante e clique nos vértices do trecho. Cada um ganha cor e entra na legenda. Tipo de divisa — cerca, estrada, córrego — também se pinta. Atalho: duplo clique no vértice ou no trecho pra ajustar na hora, no mapa ou na planta.',
    experiente:
      'Pincel de dois cliques: do início ao fim do trecho. Posseiro sai sem matrícula; espólio precisa de inventariante. Cônjuge de confrontante ganha espaço de assinatura. Tipos de divisa alimentam memorial e planilha. Duplo clique abre o ajuste rápido.',
    audioUrlIniciante: '/audio/tutorial/tema-confrontantes-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-confrontantes-experiente.mp3',
  },
  {
    id: 'area-sgl',
    titulo: 'Área SGL versus área plana',
    iniciante:
      'A área que o SIGEF certifica não é a área “no papel plano”. Ela considera a curvatura da Terra e a altitude. Por isso quase sempre difere um pouco da área UTM de outros programas. Não é erro. O SOUZA CAD já calcula no sistema que o INCRA confere.',
    experiente:
      'SGL com origem no primeiro vértice e elevação média. A conferência reconcilia com o retorno do SIGEF quando você cola o valor. Fator K e convergência saem na caixa de coordenadas da planta.',
    audioUrlIniciante: '/audio/tutorial/tema-area-sgl-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-area-sgl-experiente.mp3',
  },
  {
    id: 'memorial',
    titulo: 'Memorial descritivo',
    iniciante:
      'O memorial conta o perímetro lado a lado: azimute, distância, tipo de divisa e confrontante, até fechar no ponto inicial. O SOUZA CAD gera o Word pronto — identificação no topo, narrativa limpa e blocos de assinatura que não quebram no meio da página. Confira os dados do imóvel antes de gerar.',
    experiente:
      'Word com Arial, assinaturas sem quebra de página. TRT vem do projeto. Narrativa usa valores da conferência. Campos colados passam por limpeza de caracteres invisíveis.',
    audioUrlIniciante: '/audio/tutorial/tema-memorial-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-memorial-experiente.mp3',
  },
  {
    id: 'planta',
    titulo: 'Planta A3',
    iniciante:
      'A planta do SOUZA CAD sai em A3 deitada: desenho à esquerda, carimbo à direita com dados, declarações e laudo. Embaixo, satélite, convenções e coordenadas. Quase tudo se arrasta — textos, rótulos, blocos — e a posição fica salva no projeto. As marcas no topo são guias de dobra pra caber em pasta A4. Lembre: pra mexer no layout, destrave a folha na barra lateral.',
    experiente:
      'Margens ABNT, escala automática ou manual, grade sem vazamento. Estilo de vértice SIGEF ou P1, P2. Posição, escala e negrito por elemento, salvos no projeto. PDF pela impressão do navegador — confira a escala gráfica.',
    audioUrlIniciante: '/audio/tutorial/tema-planta-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-planta-experiente.mp3',
  },
  {
    id: 'requerimento',
    titulo: 'Requerimento, atos e comarca',
    iniciante:
      'O requerimento é a carta ao cartório. O SOUZA CAD monta qualificação e texto conforme o ato: venda, doação, usucapião, desmembramento ou unificação. Dá pra incluir várias partes. A comarca já vem do padrão que você salvou nos Ajustes.',
    experiente:
      'Textos específicos por ato, múltiplas matrículas de origem, partes adicionais ilimitadas e comarca padrão do escritório.',
    audioUrlIniciante: '/audio/tutorial/tema-requerimento-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-requerimento-experiente.mp3',
  },
  {
    id: 'trt',
    titulo: 'TRT e responsabilidade técnica',
    iniciante:
      'O TRT é o documento do seu conselho dizendo que você responde por aquele serviço. Cada projeto tem o seu número — não reaproveita. No SOUZA CAD você registra na tela de TRT do projeto; memorial e peças passam a citar esse número.',
    experiente:
      'TRT sempre por projeto. Memorial prioriza o número do projeto. A conferência avisa se faltar TRT antes de exportar peça oficial.',
    audioUrlIniciante: '/audio/tutorial/tema-trt-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-trt-experiente.mp3',
  },
  {
    id: 'car',
    titulo: 'CAR — Cadastro Ambiental Rural',
    iniciante:
      'O CAR registra a situação ambiental do imóvel: reserva legal, APP de rio ou nascente, vegetação e uso consolidado. No SOUZA CAD, no modo Médio ou Completo, o botão CAR faz a conta: escolha o bioma e veja os percentuais. Se você já desenhou essas áreas no mapa, os valores vêm preenchidos.',
    experiente:
      'Reserva legal por bioma; APP por largura de curso d\'água e raio de nascente. Polígonos já desenhados preenchem o formulário. Shapefile por camada já funciona; exportação direta ao SICAR ainda está a caminho.',
    audioUrlIniciante: '/audio/tutorial/tema-car-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-car-experiente.mp3',
  },
  {
    id: 'dxf-editor',
    titulo: 'Editor de DXF avulso',
    iniciante:
      'Além do projeto de agrimensura, o SOUZA CAD tem um editor de DXF separado — pra abrir desenho elétrico, hidráulico ou de terceiros sem misturar com o imóvel. Fica no rodapé. Você abre o arquivo, move, apaga, desenha linha e texto, organiza por camadas e baixa o DXF editado.',
    experiente:
      'Lê linhas, polilinhas, círculos, arcos, textos e pontos. Pan, zoom, seleção, exportação DXF R12. Camadas com cor, visibilidade e trava. Blocos ainda não são desenhados.',
    audioUrlIniciante: '/audio/tutorial/tema-dxf-editor-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-dxf-editor-experiente.mp3',
  },
  {
    id: 'financeiro',
    titulo: 'Financeiro: recibo e contrato',
    iniciante:
      'No SOUZA CAD você também cuida do combinado com o cliente: valor, gastos e recebimentos do projeto, depois gera recibo e contrato em PDF. O contrato descreve serviço, valor, prazo e obrigações. O recibo sai numerado em sequência.',
    experiente:
      'Gestão por projeto com PDF, valor por extenso e numeração de recibo. No roadmap: identidade do escritório nas peças financeiras e cláusulas extras no contrato.',
    audioUrlIniciante: '/audio/tutorial/tema-financeiro-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-financeiro-experiente.mp3',
  },
];
