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
export const PASSOS_BASE: Passo[] = [
  {
    icone: ToggleRight,
    titulo: 'A chave Fácil e Completo',
    texto: 'Para proporcionar uma experiência de aprendizado adaptável e otimizar sua área de trabalho, o Souza-CAD dispõe de duas interfaces de trabalho. A alternância entre o modo Fácil (foco no fluxo básico essencial) e o modo Completo (todas as ferramentas CAD habilitadas) ocorre exclusivamente na Barra de Controle flutuante inferior, deixando a barra lateral esquerda livre e otimizada para as ferramentas de desenho e edição. Nenhum dado do projeto é perdido ao alternar de modo.',
    audioUrl: '/introducao.mp3',
  },
  {
    icone: Users,
    titulo: 'Otimização Horizontal e Barra Flutuante',
    texto: 'O Souza-CAD foi planejado sob o conceito de visualização panorâmica, organizando tabelas, formulários e o mapa lado a lado na horizontal para evitar rolagens desnecessárias. Para dar total liberdade de visualização, a Barra de Controle inferior é totalmente movível (arrastável): basta clicar e arrastá-la para qualquer área da tela, garantindo que ela não se sobreponha à barra de status inferior ou a outros componentes importantes.',
    audioUrl: '/audio/tutorial/passo-base-1.mp3',
  },
  {
    icone: Upload,
    titulo: 'Importação Inteligente de Pontos',
    texto: 'Inicie seu projeto carregando as coordenadas coletadas em campo. Ao clicar em Pontos, importe arquivos TXT/CSV de receptores GNSS. Se o seu equipamento exportar as colunas (Nome, Este, Norte, Altitude) em uma ordem diferente, você pode configurar o mapeador de colunas uma única vez. O sistema cria a poligonal de forma automatizada no fuso UTM ideal baseado na âncora da sua região.',
    audioUrl: '/audio/tutorial/passo-base-2.mp3',
  },
  {
    icone: Search,
    titulo: 'SIGEF e Confrontantes Certificados',
    texto: 'Evite a rejeição de processos no INCRA consultando a base de dados oficial. O botão SIGEF localiza automaticamente imóveis certificados lindeiros e plota os limites no mapa. Você pode clicar diretamente nos vértices do vizinho para adotar a nomenclatura e códigos originais deles na sua divisa, garantindo perfeita integridade e eliminando divergências de limites.',
    audioUrl: '/audio/tutorial/passo-base-3.mp3',
  },
  {
    icone: BookUser,
    titulo: 'Qualificação Jurídica do Requerimento',
    texto: 'No painel de Dados, preencha os dados cadastrais do proprietário, do imóvel e do cartório. Ao gerar o Requerimento de Retificação, selecione o ato jurídico correspondente (como venda, doação, usucapião, desmembramento ou unificação). O app preenche automaticamente a fundamentação legal e as cláusulas específicas, preparando a peça técnica para o protocolo notarial.',
    audioUrl: '/audio/tutorial/passo-base-4.mp3',
  },
  {
    icone: Brush,
    titulo: 'Pintura de Confrontações e Divisas',
    texto: 'Identifique graficamente as divisas e confrontantes do imóvel. Utilizando as ferramentas de pintura Confro (confrontantes) e Divisas (tipo de limite: cerca, muro, vala, etc.), basta clicar sobre as linhas do perímetro. O app colore cada divisa de acordo com seu respectivo confrontante e gera a legenda cartográfica automaticamente no mapa e na planta.',
    audioUrl: '/audio/tutorial/passo-base-5.mp3',
  },
  {
    icone: FileText,
    titulo: 'Geração de Peças e Cartas de Anuência',
    texto: 'Exporte o projeto completo para entrega. Com um clique, gere o memorial descritivo (.docx), a planilha SIGEF (.ods), o requerimento e a planta (PDF). As Cartas de Anuência agora anexam a lista de vértices e coordenadas em uma planilha tabular limpa, fornecendo todos os dados geodésicos necessários e eliminando o campo de endereço para evitar burocracia e agilizar as assinaturas.',
    audioUrl: '/audio/tutorial/passo-base-6.mp3',
  },
  {
    icone: Save,
    titulo: 'Banco de Vértices e Salvamento Automático',
    texto: 'Trabalhe com segurança absoluta. O app salva seu progresso continuamente de forma local (IndexedDB) e em nuvem. As coordenadas também são registradas no seu Banco de Pontos unificado, impedindo que o mesmo código de vértice seja reaproveitado incorretamente em projetos futuros da sua empresa, mantendo seu acervo profissional sempre organizado.',
    audioUrl: '/audio/tutorial/passo-base-7.mp3',
  },
];

// PASSOS AVANÇADOS — só aparecem quando a tela está no modo Completo.
export const PASSOS_AVANCADOS: Passo[] = [
  {
    icone: UserCheck,
    titulo: 'Casar Vértices dos Vizinhos',
    texto: 'A sobreposição de vértices limítrofes é um erro crítico no SIGEF. No modo Completo, a ferramenta Casar identifica pontos fisicamente coincidentes com vizinhos certificados e unifica as nomenclaturas. Você também pode importar arquivos de coordenadas de outros agrimensores no painel de Vizinhos para conciliar as divisas comuns.',
    audioUrl: '/audio/tutorial/passo-avancado-0.mp3',
  },
  {
    icone: Sparkles,
    titulo: 'Desenho Livre, Achuras e Símbolos',
    texto: 'Enriqueça graficamente sua planta com polilinhas, cotas, textos livres e símbolos cartográficos (postes, marcos, árvores). Você pode aplicar hachuras a 45° ou em grade para destacar áreas de preservação ou servidões, e gerenciar tudo por meio de Camadas (Layers) com espessuras e cores personalizadas.',
    audioUrl: '/audio/tutorial/passo-avancado-1.mp3',
  },
  {
    icone: Ruler,
    titulo: 'Vértices Virtuais e Ferramentas CAD',
    texto: 'Calcule a posição de pontos inacessíveis em campo projetando vértices virtuais por meio de cruzamentos ou direções e distâncias. O Ímã Esperto (Snap) garante precisão milimétrica ao ancorar o cursor em cantos, meios e interseções. Use ferramentas clássicas como Paralela, Dividir e Prolongar para o refino final do desenho.',
    audioUrl: '/audio/tutorial/passo-avancado-2.mp3',
  },
  {
    icone: FileText,
    titulo: 'Retificações Múltiplas e Atos de Errata',
    texto: 'Simplifique correções complexas de matrículas antigas. No painel de Errata, agrupe e detalhe múltiplas correções de naturezas distintas (como retificação de área, confrontações ou qualificação pessoal). O Souza-CAD organiza essas correções em uma narrativa única e coesa para o cartório de registro de imóveis.',
    audioUrl: '/audio/tutorial/passo-avancado-3.mp3',
  },
  {
    icone: Ruler,
    titulo: 'Precisão do Sistema Geodésico Local (SGL)',
    texto: 'Cumpra com rigor as normas do INCRA realizando os cálculos de área e perímetro diretamente no Sistema Geodésico Local (SGL). Projetando no elipsoide SIRGAS2000, o app elimina o fator de escala UTM (distorção linear), garantindo que as dimensões representadas correspondam exatamente à realidade física medida no terreno.',
    audioUrl: '/audio/tutorial/passo-avancado-4.mp3',
  },
  {
    icone: Upload,
    titulo: 'Mapeador Customizado de Arquivos',
    texto: 'Importe arquivos de coordenadas de qualquer marca ou modelo de equipamento GPS/GNSS. Se o delimitador do seu arquivo for diferente (vírgula, ponto e vírgula, tabulação) ou as colunas estiverem fora de ordem, o Mapeador de Colunas permite associar os campos em segundos, salvando a configuração para as próximas importações.',
    audioUrl: '/audio/tutorial/passo-avancado-5.mp3',
  },
  {
    icone: Save,
    titulo: 'Contrato e Controle Financeiro',
    texto: 'Gerencie a saúde financeira do serviço sem sair da tela de projeto. Registre o valor acordado, despesas e parcelas recebidas. A partir desses dados, o sistema gera contratos de prestação de serviços técnicos e recibos com o valor por extenso calculado automaticamente, prontos para impressão ou assinatura digital.',
    audioUrl: '/audio/tutorial/passo-avancado-6.mp3',
  },
];
