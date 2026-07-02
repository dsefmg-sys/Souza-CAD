// Temas de aprendizado da ajuda: cada área que o app atende, explicada em DOIS níveis de
// linguagem — iniciante (didática, sem pressupor vocabulário) e experiente (objetiva, direto
// ao que importa na prática). O nível vem das preferências do usuário (nivelExperiencia).

export interface TemaAjuda {
  id: string;
  titulo: string;
  iniciante: string;
  experiente: string;
}

export const TEMAS_AJUDA: TemaAjuda[] = [
  {
    id: 'georreferenciamento',
    titulo: 'Georreferenciamento e SIGEF',
    iniciante:
      'Georreferenciar é medir o imóvel rural com coordenadas oficiais, amarradas ao sistema de referência do Brasil (SIRGAS2000), e registrar essa medição no SIGEF, o sistema do INCRA. Depois de certificado, o imóvel tem limites com validade nacional: qualquer pessoa consegue conferir onde ele começa e termina. Sem a certificação, o cartório não averba venda, doação nem divisão de imóveis rurais acima dos tamanhos mínimos da lei. O app cuida das partes técnicas: calcula a área no sistema exigido, gera a planilha no formato do SIGEF e monta os documentos pro cartório.',
    experiente:
      'O fluxo SIGEF no app: importação dos pontos, códigos de vértice por credenciado (banco de pontos garante numeração única), planilha ODS no template oficial com abas identificacao e perimetro_N por gleba, área calculada no SGL. A conferência de exportação trava os erros que o SIGEF rejeita (vértice sem código, código repetido na mesma parcela) e avisa os demais. Vértices de divisa compartilhados entre parcelas vizinhas mantêm o mesmo código — o app trata isso como correto, não como duplicidade.',
  },
  {
    id: 'campo-desenho',
    titulo: 'Do campo ao desenho (TXT e fuso UTM)',
    iniciante:
      'O receptor GNSS entrega um arquivo de texto com os pontos medidos em coordenadas UTM: um par de números Leste e Norte pra cada ponto. Só que o mesmo par de números existe em várias regiões do planeta — o que diferencia é o FUSO, uma faixa vertical do globo. O app descobre o fuso certo comparando os pontos com cidades conhecidas da sua região de trabalho, e você confirma na prévia antes de importar. Se o desenho aparecer longe do lugar certo no mapa, o fuso está errado: troque na prévia.',
    experiente:
      'Import TXT com mapeamento de colunas configurável (Configurações, aba Importação). Detecção de fuso por âncora regional: a mesma dupla E/N é geometricamente válida em qualquer fuso, então a zona só se resolve com referência externa — o app testa os fusos permitidos e fica com o que cai mais perto de uma âncora conhecida (capitais + cidades da sua região). Restrinja os fusos permitidos em Configurações à sua área de atuação pra detecção nunca hesitar. Âncora nenhuma resolve trabalho fora da região cadastrada: nesse caso confirme o fuso manualmente na prévia.',
  },
  {
    id: 'vizinhos',
    titulo: 'Vizinhos certificados e vértices compartilhados',
    iniciante:
      'Quando o vizinho já certificou o imóvel dele, os vértices da divisa comum JÁ TÊM código oficial — e a regra é reaproveitar esses códigos, nunca criar números novos pro mesmo lugar. No app, o botão SIGEF busca sozinho os imóveis certificados que encostam no seu e desenha o contorno deles no mapa. Clique no vértice do vizinho pra adotar o código dele no seu desenho. Isso evita a rejeição mais comum na certificação: dois códigos diferentes pro mesmo ponto físico.',
    experiente:
      'O botão SIGEF consulta o acervo do INCRA (WFS) e persiste as parcelas no projeto; depois vira ANÁLISE, com verificação de sobreposição de polígonos. Adoção de vértice: clique no vértice da parcela certificada pra herdar o código; ou importe o arquivo de vértices baixado do Distribuidor de Coordenadas do Acervo Fundiário (login gov.br), com mapeamento de colunas em Configurações. Vértice adotado não consome numeração do seu banco de pontos.',
  },
  {
    id: 'confrontantes',
    titulo: 'Confrontantes e divisas',
    iniciante:
      'Confrontante é quem faz divisa com o imóvel: pessoa, espólio, posseiro ou até um órgão público. Cada trecho do perímetro precisa de um confrontante atribuído — o memorial narra "confrontando com fulano" trecho a trecho, e o cartório exige isso completo. No app, use o pincel de confrontante no mapa: escolha o nome e clique nos vértices do trecho. Cada confrontante ganha uma cor, e a legenda no canto do mapa mostra quem é quem. O tipo de divisa (cerca, estrada, córrego...) também é pintado, com cor própria desenhada por fora do traçado.',
    experiente:
      'Pincel em dois cliques (do vértice inicial ao final, caminho todo). Condições especiais mudam a peça: posseiro sai sem matrícula e como "possuidor(a)"; espólio exige inventariante (sem ele a assinatura sai em branco — a conferência trava). Cônjuge de confrontante entra na planta com espaço de assinatura próprio. Divisas com representação por vértice (cerca/estrada/córrego/rio/açude/muro/vala) alimentam o memorial ("segue por cerca...") e a planilha SIGEF (tipo de limite por vértice).',
  },
  {
    id: 'area-sgl',
    titulo: 'Área SGL versus área plana',
    iniciante:
      'A área que o SIGEF certifica não é a área "no papel plano": é calculada no Sistema Geodésico Local, que considera a curvatura da Terra e a altitude do terreno. Por isso ela quase sempre difere um pouco da área UTM que outros programas mostram. Se o cartório ou o cliente comparar valores e achar diferença pequena, é isso — não é erro. O app calcula direto no sistema certo, o mesmo que o SIGEF vai conferir.',
    experiente:
      'Cálculo no SGL com origem no primeiro vértice, elevação média da poligonal, azimutes e distâncias derivados no plano local — replicando o comportamento da planilha oficial. A conferência reconcilia a área calculada com a área SGL declarada no retorno do SIGEF quando você cola o valor; divergência acima da tolerância acende aviso. Fator K e convergência meridiana do vértice de referência saem na planta (caixa de coordenadas).',
  },
  {
    id: 'memorial',
    titulo: 'Memorial descritivo',
    iniciante:
      'O memorial é o texto oficial que descreve o perímetro: começa num vértice, percorre lado a lado dizendo azimute, distância, tipo de divisa e confrontante, e fecha no ponto inicial. O cartório confere esse texto contra a planta e a matrícula. O app gera o memorial pronto em Word: tabela de identificação no topo, narrativa justificada, códigos em negrito e blocos de assinatura que nunca quebram entre páginas. Confira os dados do imóvel antes de gerar — o texto reflete exatamente o que estiver preenchido.',
    experiente:
      'Gerado em docx com fonte Arial explícita, keepNext/keepLines nos blocos de assinatura, TRT do projeto (numeroTrt) com fallback no cadastro do técnico. A narrativa usa os valores efetivos da conferência (área/perímetro reconciliados com o SIGEF quando informados). Campos colados de Word/PDF passam por sanitização de caracteres invisíveis — se um memorial abrir "corrompido" no Office, me envie o arquivo: o gerador é validado por teste de integridade de XML a cada build.',
  },
  {
    id: 'planta',
    titulo: 'Planta A3',
    iniciante:
      'A planta sai em folha A3 deitada, com o desenho à esquerda e o carimbo à direita: dados do imóvel, declaração dos proprietários, laudo técnico com a assinatura do responsável, declaração dos confrontantes e os dados do escritório. Embaixo ficam a situação (foto de satélite), as convenções e as informações de coordenadas. Quase tudo é ajustável: arraste textos, rótulos e blocos pra posição que preferir — e essas posições ficam salvas no projeto. As marcas tracejadas no topo são guias de dobra pra planta caber em pasta A4.',
    experiente:
      'Margens NBR (esquerda 25 mm), escala automática ou manual, grade E/N com rótulos que não vazam do quadro, estilo de vértice SIGEF ou convencional (P1, P2...). Overrides por elemento (posição/escala/negrito/largura de quebra) persistem em plantaConfig.textos; assinaturas de confrontante escalam o espaço de firma com a fonte. Situação capturada do satélite fica salva no projeto. PDF gerado via impressão do navegador — confira a escala gráfica após imprimir.',
  },
  {
    id: 'requerimento',
    titulo: 'Requerimento e tipos de ato',
    iniciante:
      'O requerimento é a carta formal pedindo ao cartório pra averbar o georreferenciamento e retificar a área. O texto muda conforme a intenção do cliente: venda, doação, unificação de matrículas ou desmembramento — cada ato tem partes com papéis diferentes (quem transmite, quem recebe, quem assina). No app, escolha o tipo de ato e ele monta o texto jurídico certo, com a qualificação completa das partes. Na dúvida sobre qual ato usar, o glossário dentro do requerimento explica cada um em linguagem simples.',
    experiente:
      'Tipos de ato com rótulos e frases de contexto próprios (venda/doação/unificação/desmembramento), partes adicionais pra atos com múltiplos requerentes, matrículas de origem na unificação. Fundamentação: art. 176 §§3º-4º e art. 213, II, da Lei 6.015/73 c/c Decreto 4.449/02. A conferência avisa cônjuge sem CPF e confrontante sem trecho atribuído antes de gerar. Docx com as mesmas garantias do memorial (Arial, assinaturas sem quebra de página).',
  },
  {
    id: 'trt',
    titulo: 'TRT e responsabilidade técnica',
    iniciante:
      'O TRT é o Termo de Responsabilidade Técnica: o documento do seu conselho profissional dizendo que VOCÊ responde tecnicamente por aquele serviço. Cada projeto tem o seu número de TRT, emitido pra aquele trabalho específico — não existe um número padrão reaproveitável. No app, registre o número na tela de TRT do projeto; o memorial e as demais peças passam a citar esse número automaticamente.',
    experiente:
      'imovel.numeroTrt é por projeto (o campo "TRT padrão" foi removido das configurações de propósito). O memorial prioriza o número do projeto e só cai no cadastro do técnico como reserva de compatibilidade. A conferência de exportação acusa TRT ausente antes de gerar peça oficial.',
  },
  {
    id: 'financeiro',
    titulo: 'Financeiro: recibo e contrato',
    iniciante:
      'Além da parte técnica, o app ajuda no combinado com o cliente: registre o valor do serviço, os gastos e os recebimentos de cada projeto, e gere recibo e contrato de prestação de serviço em PDF. O contrato protege os dois lados: descreve o serviço, o valor, o prazo e as obrigações de cada um. Recibo numerado em sequência automática.',
    experiente:
      'Gestão por projeto (valor/gastos/recebimentos) com recibo e contrato via jsPDF, valor por extenso, numeração sequencial de recibo. Roadmap: identidade visual do escritório nas peças financeiras (nunca no memorial/requerimento, que são peças de cartório) e cláusulas de rescisão, LGPD e assinatura eletrônica no contrato.',
  },
];
