// Temas de aprendizado da ajuda: cada área que o app atende, explicada em DOIS níveis de
// linguagem — iniciante (didática, sem pressupor vocabulário) e experiente (objetiva, direto
// ao que importa na prática). O nível vem das preferências do usuário (nivelExperiencia).

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
    titulo: 'Modo Simples/Completo e Layout Horizontal',
    iniciante:
      'São duas coisas diferentes. A primeira é a chave Simples e Completo, no topo à direita: ela define quantas ferramentas aparecem na tela. No Simples fica só o fluxo básico: importar pontos, buscar vizinhos, pintar confrontantes e divisas, e gerar as peças. No Completo aparece tudo: desenhar linhas, cotas, achuras, símbolos, errata e CAR. O aplicativo também é otimizado pro espaço horizontal em telas grandes: as colunas de dados ficam lado a lado, os painéis são largos, e isso elimina rolagens verticais demoradas. A segunda coisa é o nível da ajuda, iniciante ou experiente, que só muda o tamanho e o detalhe das explicações destes textos.',
    experiente:
      'A interface segue duas regras. Primeira: otimização horizontal, com modais expandidos até 1400 pixels de largura e grids multi-coluna no desktop, usando toda a largura útil sem rolagem. Segunda: o modo Simples oculta ferramentas de desenho, errata, CAR, caixa de ferramentas e banco de pontos. O modo Completo revela tudo. O nível da ajuda, iniciante ou experiente, é independente do modo, e só muda a verbosidade das dicas.',
    audioUrlIniciante: '/audio/tutorial/tema-modos-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-modos-experiente.mp3',
  },
  {
    id: 'desenho-achuras',
    titulo: 'Desenho Avançado, Símbolos e Achuras',
    iniciante:
      'No modo Completo, você enriquece a planta e o mapa com desenho livre: linhas, polilinhas, cotas de medição e textos. As polilinhas fechadas podem ser preenchidas com cor personalizada e com estilos de achura, como linhas paralelas a 45 graus, grade ou pontos. E os símbolos cartográficos, como árvore, poste ou casa, são inseridos e redimensionados direto pelos botões de mais e menos, no painel de edição do objeto.',
    experiente:
      'O modo Completo dá suporte a objetos gráficos livres. Polilinhas aceitam cor, espessura de meio a 10 pixels, e estilo sólido, tracejado ou pontilhado. Polígonos aceitam cor de preenchimento e padrão de achura: nenhuma, linhas, cruzado ou pontos, via patterns SVG. Símbolos são escaláveis de 10 a 150 pixels.',
    audioUrlIniciante: '/audio/tutorial/tema-desenho-achuras-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-desenho-achuras-experiente.mp3',
  },
  {
    id: 'georreferenciamento',
    titulo: 'Georreferenciamento e SIGEF',
    iniciante:
      'Georreferenciar é medir o imóvel rural com coordenadas oficiais, amarradas ao sistema de referência do Brasil, o SIRGAS2000. E registrar essa medição no SIGEF, o sistema do INCRA. Depois de certificado, o imóvel tem limites com validade nacional: qualquer pessoa consegue conferir onde ele começa e termina. Sem essa certificação, o cartório não registra venda, doação nem divisão de imóveis rurais acima dos tamanhos mínimos da lei. O app cuida da parte técnica: calcula a área no sistema exigido, gera a planilha no formato do SIGEF, e monta os documentos pro cartório.',
    experiente:
      'O fluxo SIGEF no app segue essa ordem: importação dos pontos, código de vértice por credenciado, com o banco de pontos garantindo numeração única, planilha ODS no modelo oficial, com abas de identificação e perímetro por gleba, e área calculada no SGL. A conferência de exportação trava os erros que o SIGEF rejeita, como vértice sem código ou código repetido na mesma parcela, e avisa os demais. Vértices de divisa compartilhados entre parcelas vizinhas mantêm o mesmo código: o app trata isso como correto, não como duplicidade.',
    audioUrlIniciante: '/audio/tutorial/tema-georreferenciamento-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-georreferenciamento-experiente.mp3',
  },
  {
    id: 'campo-desenho',
    titulo: 'Do campo ao desenho (Pontos e fuso UTM)',
    iniciante:
      'O receptor de GPS entrega um arquivo de texto com os pontos medidos em coordenadas UTM: um par de números, leste e norte, pra cada ponto. Só que o mesmo par de números existe em várias regiões do planeta. O que diferencia é o fuso, uma faixa vertical do globo. O app descobre o fuso certo comparando os pontos com cidades conhecidas da sua região de trabalho, e você confirma isso na prévia, antes de importar. Se o desenho aparecer longe do lugar certo no mapa, o fuso está errado: é só trocar na prévia.',
    experiente:
      'A importação de pontos tem mapeamento de colunas configurável, na aba Importação das Configurações. A detecção de fuso usa uma âncora regional: a mesma dupla leste e norte é geometricamente válida em qualquer fuso, então a zona só se resolve com uma referência externa. O app testa os fusos permitidos e fica com o que cai mais perto de uma âncora conhecida, como capitais e cidades da sua região. Restrinja os fusos permitidos, nas Configurações, à sua área de atuação, pra detecção nunca hesitar. Se nenhuma âncora resolver, é porque o trabalho está fora da região cadastrada: aí você confirma o fuso manualmente na prévia.',
    audioUrlIniciante: '/audio/tutorial/tema-campo-desenho-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-campo-desenho-experiente.mp3',
  },
  {
    id: 'vizinhos',
    titulo: 'Vizinhos certificados e compartilhamento',
    iniciante:
      'Quando o vizinho já certificou o imóvel dele, os vértices da divisa comum já têm código oficial. A regra é reaproveitar esses códigos, nunca criar números novos pro mesmo lugar. No app, o botão SIGEF busca sozinho os imóveis certificados que encostam no seu, e desenha o contorno deles no mapa. Clique no vértice do vizinho pra adotar o código dele no seu desenho. Isso evita a rejeição mais comum na certificação: dois códigos diferentes pro mesmo ponto físico.',
    experiente:
      'O botão SIGEF consulta o acervo do INCRA e salva as parcelas no projeto. Depois ele vira o botão Análise, com verificação de sobreposição de polígonos. Pra adotar um vértice, clique no vértice da parcela certificada pra herdar o código dele. Ou importe o arquivo de vértices baixado do Distribuidor de Coordenadas do Acervo Fundiário, com login gov.br, ajustando o mapeamento de colunas nas Configurações. Vértice adotado não consome numeração do seu banco de pontos.',
    audioUrlIniciante: '/audio/tutorial/tema-vizinhos-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-vizinhos-experiente.mp3',
  },
  {
    id: 'confrontantes',
    titulo: 'Confrontantes e divisas',
    iniciante:
      'Confrontante é quem faz divisa com o imóvel: uma pessoa, um espólio, um posseiro, ou até um órgão público. Cada trecho do perímetro precisa de um confrontante atribuído. O memorial narra, trecho a trecho, quem confronta com quem, e o cartório exige isso completo. No app, use o pincel de confrontante no mapa: escolha o nome e clique nos vértices do trecho. Cada confrontante ganha uma cor, e a legenda no canto do mapa mostra quem é quem. O tipo de divisa, como cerca, estrada ou córrego, também é pintado, com cor própria por fora do traçado. Um atalho rápido: dê um duplo clique num vértice pra editar altitude ou tipo na hora. Ou dê duplo clique num trecho da divisa, pra ver comprimento, azimute, tipo e confrontante daquele lado, sem abrir menu nenhum. Funciona tanto no mapa quanto na planta.',
    experiente:
      'O pincel funciona em dois cliques: do vértice inicial ao final, o caminho todo. Condições especiais mudam a peça: posseiro sai sem matrícula, como possuidor. Espólio exige inventariante — sem ele, a assinatura sai em branco e a conferência trava. Cônjuge de confrontante entra na planta com espaço de assinatura próprio. Divisas com tipo por vértice, como cerca, estrada, córrego, rio, açude, muro ou vala, alimentam o memorial e a planilha do SIGEF automaticamente. Duplo clique num vértice ou num segmento abre o painel de ajuste rápido: altitude e tipo no vértice, comprimento, azimute, tipo de divisa e confrontante no segmento. É mais rápido que o menu de botão direito pra edições pontuais.',
    audioUrlIniciante: '/audio/tutorial/tema-confrontantes-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-confrontantes-experiente.mp3',
  },
  {
    id: 'area-sgl',
    titulo: 'Área SGL versus área plana',
    iniciante:
      'A área que o SIGEF certifica não é a área "no papel plano". Ela é calculada no Sistema Geodésico Local, que considera a curvatura da Terra e a altitude do terreno. Por isso ela quase sempre difere um pouco da área UTM que outros programas mostram. Se o cartório ou o cliente comparar valores e achar uma diferença pequena, é isso, não é erro. O app já calcula direto no sistema certo, o mesmo que o SIGEF vai conferir.',
    experiente:
      'O cálculo no SGL usa origem no primeiro vértice, elevação média da poligonal, e azimutes e distâncias derivados no plano local, replicando o comportamento da planilha oficial. A conferência reconcilia a área calculada com a área SGL declarada no retorno do SIGEF, quando você cola esse valor. Divergência acima da tolerância acende um aviso. O fator K e a convergência meridiana do vértice de referência saem na planta, na caixa de coordenadas.',
    audioUrlIniciante: '/audio/tutorial/tema-area-sgl-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-area-sgl-experiente.mp3',
  },
  {
    id: 'memorial',
    titulo: 'Memorial descritivo',
    iniciante:
      'O memorial é o texto oficial que descreve o perímetro. Ele começa num vértice, percorre lado a lado dizendo azimute, distância, tipo de divisa e confrontante, e fecha de volta no ponto inicial. O cartório confere esse texto contra a planta e a matrícula. O app gera o memorial pronto em Word: tabela de identificação no topo, narrativa justificada, códigos em negrito, e blocos de assinatura que nunca quebram entre páginas. Confira os dados do imóvel antes de gerar: o texto reflete exatamente o que estiver preenchido.',
    experiente:
      'É gerado em Word, com fonte Arial explícita, e os blocos de assinatura configurados pra nunca quebrarem entre páginas. O número do TRT vem do projeto, e só cai no cadastro do técnico como reserva. A narrativa usa os valores efetivos da conferência, com área e perímetro reconciliados com o SIGEF quando informados. Campos colados de Word ou PDF passam por uma limpeza de caracteres invisíveis. Se um memorial abrir corrompido no Office, me manda o arquivo: o gerador é validado por teste de integridade a cada atualização.',
    audioUrlIniciante: '/audio/tutorial/tema-memorial-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-memorial-experiente.mp3',
  },
  {
    id: 'planta',
    titulo: 'Planta A3',
    iniciante:
      'A planta sai em folha A3 deitada, com o desenho à esquerda e o carimbo à direita: dados do imóvel, declaração dos proprietários, laudo técnico com a assinatura do responsável, declaração dos confrontantes, e os dados do escritório. Embaixo ficam a foto de satélite da situação, as convenções, e as informações de coordenadas. Quase tudo é ajustável: você arrasta textos, rótulos e blocos pra posição que preferir, e essas posições ficam salvas no projeto. As marcas tracejadas no topo são guias de dobra, pra planta caber numa pasta A4.',
    experiente:
      'As margens seguem a norma da ABNT, com 25 milímetros à esquerda. A escala pode ser automática ou manual, e a grade de coordenadas tem rótulos que não vazam do quadro. O estilo de vértice pode ser o do SIGEF ou o convencional, tipo P1, P2. Cada elemento aceita ajuste próprio de posição, escala e negrito, e isso fica salvo no projeto. A assinatura de confrontante escala o espaço de firma junto com a fonte. A imagem de satélite fica salva no projeto. O PDF é gerado pela impressão do navegador: confira a escala gráfica depois de imprimir.',
    audioUrlIniciante: '/audio/tutorial/tema-planta-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-planta-experiente.mp3',
  },
  {
    id: 'requerimento',
    titulo: 'Requerimento, Atos e Comarca',
    iniciante:
      'O requerimento é a carta formal enviada ao cartório de registro de imóveis. O app monta a qualificação completa e o texto jurídico, de acordo com o tipo de ato: venda, doação, usucapião, desmembramento ou unificação. Se houver mais de um adquirente, cônjuges ou herdeiros, você adiciona eles como partes adicionais do requerimento. E a comarca já vem preenchida automaticamente, com base no padrão que você configurou nos Ajustes do app.',
    experiente:
      'O app tem qualificação e texto específico pra venda, doação, usucapião, desmembramento e unificação de matrículas, com suporte a múltiplas matrículas de origem. Aceita quantas partes adicionais forem necessárias, todas qualificadas. E integra automaticamente com a comarca padrão configurada nas preferências do escritório.',
    audioUrlIniciante: '/audio/tutorial/tema-requerimento-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-requerimento-experiente.mp3',
  },
  {
    id: 'trt',
    titulo: 'TRT e responsabilidade técnica',
    iniciante:
      'O TRT é o Termo de Responsabilidade Técnica: o documento do seu conselho profissional dizendo que você responde tecnicamente por aquele serviço. Cada projeto tem o seu próprio número de TRT, emitido pra aquele trabalho específico. Não existe um número padrão reaproveitável. No app, você registra esse número na tela de TRT do projeto, e o memorial e as demais peças passam a citar esse número automaticamente.',
    experiente:
      'O número do TRT é sempre por projeto — o campo de TRT padrão foi removido das configurações de propósito. O memorial prioriza o número do projeto, e só usa o cadastro do técnico como reserva. A conferência de exportação acusa TRT ausente antes de gerar qualquer peça oficial.',
    audioUrlIniciante: '/audio/tutorial/tema-trt-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-trt-experiente.mp3',
  },
  {
    id: 'car',
    titulo: 'CAR — Cadastro Ambiental Rural',
    iniciante:
      'O CAR é o cadastro que registra a situação ambiental do imóvel rural, conforme o Código Florestal: quanto de Reserva Legal ele precisa ter, quanto de Área de Preservação Permanente existe, como margem de rio ou entorno de nascente, e quanto já é vegetação nativa ou uso consolidado, tipo lavoura ou pasto. O botão CAR, visível no modo Médio ou Completo, faz essa conta pra você. Escolha o bioma da região, e o app calcula o percentual de reserva legal exigido, e as faixas de APP conforme o tamanho dos rios e nascentes. Se você já pintou essas áreas como camadas no mapa, o botão já traz os valores medidos automaticamente.',
    experiente:
      'O percentual de reserva legal varia por bioma: 20% nas demais regiões do país, e na Amazônia Legal, 80%, 35% ou 20%, conforme seja floresta, cerrado ou campo. As faixas de APP variam pela largura do curso d\'água e pelo raio da nascente, e há também a APP de lago. Se o polígono já tiver as áreas de APP, Reserva Legal, vegetação e uso consolidado desenhadas e preenchidas no mapa, o formulário se preenche sozinho ao abrir. Já dá pra exportar e importar shapefile por camada. O modo CAR completo, com exportação direta pro SICAR, ainda está em construção.',
    audioUrlIniciante: '/audio/tutorial/tema-car-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-car-experiente.mp3',
  },
  {
    id: 'dxf-editor',
    titulo: 'Editor de DXF isolado',
    iniciante:
      'Além do editor do projeto de agrimensura, o Souza CAD tem um editor de DXF avulso, pra abrir e mexer em qualquer desenho técnico, por exemplo um projeto elétrico ou hidráulico de terceiros, sem misturar com o seu projeto de imóvel. O botão fica no rodapé, com o ícone de régua e lápis. Dentro dele, você abre um arquivo DXF, vê linhas, círculos, arcos e textos, arrasta pra mover, apaga, adiciona linha e texto novo, e organiza por camadas. Cada camada pode ter sua própria cor, ficar oculta, ou travada contra edição. No final, você baixa o DXF editado.',
    experiente:
      'O editor lê linhas, polilinhas, círculos, arcos, textos e pontos. Tem pan, zoom, enquadrar, seleção com mover e apagar, desenho de linha e texto, e exporta em DXF R12. As camadas têm cor própria, visibilidade e trava individual, com destaque visual na camada ativa. Blocos ainda não são desenhados: se o DXF usar símbolos por bloco, eles não aparecem por enquanto.',
    audioUrlIniciante: '/audio/tutorial/tema-dxf-editor-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-dxf-editor-experiente.mp3',
  },
  {
    id: 'financeiro',
    titulo: 'Financeiro: recibo e contrato',
    iniciante:
      'Além da parte técnica, o app ajuda no combinado com o cliente. Registre o valor do serviço, os gastos e os recebimentos de cada projeto, e gere recibo e contrato de prestação de serviço em PDF. O contrato protege os dois lados: descreve o serviço, o valor, o prazo, e as obrigações de cada um. E o recibo já sai numerado em sequência automática.',
    experiente:
      'A gestão é por projeto: valor, gastos e recebimentos, com recibo e contrato gerados em PDF, valor por extenso, e numeração sequencial de recibo. No roadmap: identidade visual do escritório nas peças financeiras, que nunca aparece no memorial ou requerimento, já que essas são peças de cartório, além de cláusulas de rescisão, LGPD e assinatura eletrônica no contrato.',
    audioUrlIniciante: '/audio/tutorial/tema-financeiro-iniciante.mp3',
    audioUrlExperiente: '/audio/tutorial/tema-financeiro-experiente.mp3',
  },
];
