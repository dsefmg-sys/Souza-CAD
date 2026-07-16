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
    titulo: 'A chave Simples e Completo',
    texto: 'Para proporcionar uma experiência de aprendizado adaptável, o Souza-CAD dispõe de duas interfaces de trabalho. No modo Simples, a interface oculta ferramentas secundárias para focar estritamente no fluxo essencial de georreferenciamento (ideal para início rápido). No modo Completo, todos os comandos de edição CAD, camadas e triangulação são habilitados. Alterne livremente entre eles a qualquer momento; nenhum dado ou progresso do projeto será perdido. O sistema é flexível e molda-se ao seu ritmo de trabalho.',
    audioUrl: '/introducao.mp3',
  },
  {
    icone: Users,
    titulo: 'Otimização Horizontal Full HD',
    texto: 'Todo o Souza-CAD foi projetado sob o conceito de visualização panorâmica para aproveitar ao máximo a largura total da tela horizontal. As tabelas de dados, formulários de confrontações e painéis de desenho ficam lado a lado. Isso elimina rolagens verticais longas e cansativas. Você visualiza e edita todo o seu projeto de um jeito rápido, organizado e produtivo.',
    audioUrl: '/audio/tutorial/passo-base-1.mp3',
  },
  {
    icone: Upload,
    titulo: 'Importação Inteligente de Pontos',
    texto: 'Importe de forma rápida e segura os dados brutos coletados em campo. Ao clicar no botão Pontos, o sistema processa arquivos de coordenadas de receptores GNSS (RTK) e traça a poligonal automaticamente. Se o seu equipamento exportar as colunas (Nome, Este, Norte, Altitude) in uma ordem diferente ou com separadores específicos, você poderá configurar o mapeador de colunas uma única vez. O sistema memoriza o padrão para todas as futuras importações, reduzindo cliques e erros manuais.',
    audioUrl: '/audio/tutorial/passo-base-2.mp3',
  },
  {
    icone: Search,
    titulo: 'SIGEF & Confrontantes Certificados',
    texto: 'Evite retrabalho e inconsistências territoriais pesquisando diretamente a base cartográfica do INCRA. O botão SIGEF realiza uma busca automatizada por parcelas lindeiras já certificadas na área do seu projeto, renderizando-as no mapa. O mesmo botão transforma-se na ferramenta de Análise, permitindo confrontar divisas e verificar cruzamentos ou sobreposições com precisão cirúrgica antes de enviar a certificação oficial.',
    audioUrl: '/audio/tutorial/passo-base-3.mp3',
  },
  {
    icone: BookUser,
    titulo: 'Dados Completos e Atos do Requerimento',
    texto: 'Centralize toda a qualificação jurídica necessária para o registro imobiliário. No painel de Dados, insira os dados do proprietário, do imóvel e do cartório. Ao gerar o requerimento de retificação, selecione o ato jurídico correspondente (venda, doação, usucapião, desmembramento ou unificação). A fundamentação legal e as comarcas configuradas são preenchidas de forma automática e integrada, garantindo conformidade com a legislação notarial.',
    audioUrl: '/audio/tutorial/passo-base-4.mp3',
  },
  {
    icone: Brush,
    titulo: 'Pintura de Confrontações e Divisas',
    texto: 'Facilite a conformidade técnica vinculando confrontantes às respectivas divisas de forma visual. Com os pincéis Confro (Confrontantes) e Divisas (tipo de limite), basta clicar sobre as linhas do perímetro para atribuir os titulares e o tipo de divisa (cerca, córrego, muro, etc.). A legenda cartográfica correspondente é gerada automaticamente no mapa, colorindo as feições para controle visual imediato.',
    audioUrl: '/audio/tutorial/passo-base-5.mp3',
  },
  {
    icone: FileText,
    titulo: 'Geração de Peças e Download Único',
    texto: 'Gere todas as peças técnicas regulamentares prontas para protocolo em cartório ou no SIGEF. Com um único clique, exporte o memorial descritivo em Word editável (.docx), a planilha de dados oficial do SIGEF (.ods), a planta em formato A3 (PDF) e os requerimentos de retificação. A ferramenta TRT permite consolidar as informações do termo de responsabilidade técnica diretamente no cabeçalho das peças.',
    audioUrl: '/audio/tutorial/passo-base-6.mp3',
  },
  {
    icone: Save,
    titulo: 'Nunca Perca um Trabalho & Banco de Pontos',
    texto: 'Trabalhe com total tranquilidade operacional. O botão Salvar sinaliza alterações pendentes e grava os dados de maneira automática e redundante em nuvem e no armazenamento local. Além de proteger seu progresso em caso de fechamento acidental da aba, as coordenadas alimentam seu banco de pontos integrado, prevenindo a duplicidade ou inconsistência no nome de vértices em projetos futuros.',
    audioUrl: '/audio/tutorial/passo-base-7.mp3',
  },
];

// PASSOS AVANÇADOS — só aparecem quando a tela está no modo Completo.
export const PASSOS_AVANCADOS: Passo[] = [
  {
    icone: UserCheck,
    titulo: 'Casar Vértices dos Vizinhos',
    texto: 'A sobreposição ou divergência de nomes de vértices limítrofes é um dos principais motivos de rejeição de processos no SIGEF. Para garantir consistência com o acervo do INCRA, a ferramenta Casar identifica vértices vizinhos certificados fisicamente idênticos e adota automaticamente a nomenclatura homologada. O Souza-CAD permite ainda importar arquivos de vértices limítrofes via painel Vizinhos para agilizar essa conciliação espacial.',
    audioUrl: '/audio/tutorial/passo-avancado-0.mp3',
  },
  {
    icone: Sparkles,
    titulo: 'Desenho Avançado, Achuras e Símbolos',
    texto: 'Amplie o detalhamento técnico do seu mapa e planta. No modo Completo, você pode inserir polilinhas livres, cotas de distância, textos e simbologias de campo (postes, marcos, árvores). Aplique preenchimentos e achuras a 45° ou em grade para delimitar áreas de preservação ambiental ou servidões. Utilize o Gerenciador de Camadas (Layers) para definir cores, espessuras e visibilidade de cada elemento com precisão de CAD.',
    audioUrl: '/audio/tutorial/passo-avancado-1.mp3',
  },
  {
    icone: Ruler,
    titulo: 'Vértices Virtuais, Imã Esperto & Edição',
    texto: 'Resolva geometrias complexas de campo diretamente no escritório. A ferramenta Vértice Virtual permite calcular a posição de pontos inacessíveis por meio de cruzamentos ou azimutes e distâncias de projeto. O Ímã Esperto (Snap) garante aderência precisa do cursor a extremidades, pontos médios e interseções de linhas. Use também ferramentas como Paralela, Dividir, Aparar (Trim) e Prolongar (Extend) para o refino fino da poligonal.',
    audioUrl: '/audio/tutorial/passo-avancado-2.mp3',
  },
  {
    icone: FileText,
    titulo: 'Retificações Múltiplas e Atos de Errata',
    texto: 'Simplifique a correção de registros cartoriais antigos e complexos. Nas abas de Errata e Requerimento, cadastre múltiplas correções de naturezas distintas (correção de área, correção de confrontações ou dados pessoais) em um único processo. O sistema formata e agrupa todas as divergências gerando uma narrativa jurídica coesa para submissão, poupando tempo e custas cartoriais.',
    audioUrl: '/audio/tutorial/passo-avancado-3.mp3',
  },
  {
    icone: Ruler,
    titulo: 'Área SGL (Sem distorção UTM)',
    texto: 'Garanta a precisão geodésica exigida pelas normas do INCRA. O Souza-CAD realiza os cálculos de área e perímetro com projeção direta no Plano Geodésico Local (Sistema Geodésico Local - SGL), sob o elipsoide GRS80/SIRGAS2000. Isso elimina as distorções de escala típicas da projeção UTM clássica, resultando na exata área física real do imóvel.',
    audioUrl: '/audio/tutorial/passo-avancado-4.mp3',
  },
  {
    icone: Upload,
    titulo: 'Mapeador de Colunas do Arquivo de Pontos',
    texto: 'Flexibilidade total para ler qualquer arquivo de coordenadas. Caso os dados gerados pelo seu receptor GPS/GNSS possuam formatação fora do padrão tradicional, configure o mapeador para indicar a posição exata de cada coluna (Nome, Norte, Leste, Altitude) e o tipo de delimitador (vírgula, ponto e vírgula, tabulação). O sistema salvará este modelo para automatizar as próximas importações.',
    audioUrl: '/audio/tutorial/passo-avancado-5.mp3',
  },
  {
    icone: Save,
    titulo: 'Contrato e Gestão Financeira',
    texto: 'Administre a saúde financeira do seu projeto sem sair do ambiente de desenho. A barra inferior integra a gestão financeira, permitindo registrar o valor contratado, custos de campo e recebimentos parcelados. Com base nestes dados, o sistema gera contratos de prestação de serviços técnicos e recibos com o valor por extenso calculado automaticamente, prontos para assinatura e entrega ao cliente.',
    audioUrl: '/audio/tutorial/passo-avancado-6.mp3',
  },
];
