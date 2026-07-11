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
    texto: 'No canto de cima, à direita, você escolhe se prefere usar o modo Simples ou Completo. No Simples, a tela mostra só o caminho essencial de um georreferenciamento, pra você se acostumar com o app sem se perder em botões extras. No Completo, todas as ferramentas avançadas e opcionais aparecem. Mude de modo a qualquer momento, sem perder seu progresso. Depois de cerca de 5 horas acumuladas no Completo, a chave se recolhe sozinha, e você pode reativar nas Configurações.',
    audioUrl: '/introducao.mp3',
  },
  {
    icone: Users,
    titulo: 'Otimização Horizontal Full HD',
    texto: 'Todo o Souza CAD foi projetado pra aproveitar ao máximo uma tela cheia, na horizontal. As colunas de dados, os formulários de proprietários e os painéis de desenho ficam lado a lado, bem largos. Isso elimina rolagens verticais longas. Você visualiza e edita tudo de um jeito bem mais rápido.',
    audioUrl: '/audio/tutorial/passo-base-1.mp3',
  },
  {
    icone: Upload,
    titulo: 'Importação Inteligente de Pontos',
    texto: 'Use o botão Pontos, lá no topo, pra enviar as coordenadas do seu receptor de GPS. O Souza CAD lê o arquivo e desenha a poligonal do imóvel sozinho. Se o seu equipamento exportar as colunas leste, norte, altitude e código numa ordem diferente, você ajusta isso nas Configurações. E o app guarda essa ordem pra sempre, não precisa configurar de novo.',
    audioUrl: '/audio/tutorial/passo-base-2.mp3',
  },
  {
    icone: Search,
    titulo: 'SIGEF & Confrontantes Certificados',
    texto: 'O botão SIGEF procura, sozinho, no acervo do INCRA, os imóveis já certificados que fazem divisa com o seu projeto. Ele desenha esses vizinhos no mapa como referência. Depois de baixados, esse mesmo botão vira o botão Análise, e você consegue conferir se há sobreposição de divisas ou erro de geometria.',
    audioUrl: '/audio/tutorial/passo-base-3.mp3',
  },
  {
    icone: BookUser,
    titulo: 'Dados Completos e Atos do Requerimento',
    texto: 'O botão Dados reúne as informações do proprietário, do imóvel, dos confrontantes e do cartório. É o coração do memorial e do requerimento. Na hora de montar o requerimento, você escolhe o tipo de ato: venda, doação, usucapião, desmembramento ou unificação. O app ajusta sozinho a fundamentação legal e as partes envolvidas. E a comarca já vem preenchida automaticamente, com base no padrão que você configurou nos Ajustes.',
    audioUrl: '/audio/tutorial/passo-base-4.mp3',
  },
  {
    icone: Brush,
    titulo: 'Pintura de Confrontações e Linhas',
    texto: 'Com o perímetro pronto, use os pincéis Confro e Divisas pra pintar cada lado do imóvel. Você define quem confronta com cada trecho, e qual é o tipo de linha: cerca, córrego, muro e outros. A legenda sai sozinha no canto do mapa, e as cores ajudam a identificar tudo rapidinho.',
    audioUrl: '/audio/tutorial/passo-base-5.mp3',
  },
  {
    icone: FileText,
    titulo: 'Geração de Peças e Download Único',
    texto: 'Baixe todas as peças finais, prontas no padrão do SIGEF e dos cartórios. O memorial descritivo sai em Word editável. A planilha oficial do SIGEF sai pronta pra conferência. A planta sai em PDF, formato A3. E o requerimento de retificação sai pronto pro cartório. O botão TRT deixa você inserir a responsabilidade técnica que vai aparecer nos cabeçalhos das peças.',
    audioUrl: '/audio/tutorial/passo-base-6.mp3',
  },
  {
    icone: Save,
    titulo: 'Nunca Perca um Trabalho & Banco de Pontos',
    texto: 'O botão Salvar muda de cor pra avisar quando há alteração pendente. Ele guarda seu projeto com segurança na nuvem, e alimenta seu banco de pontos pessoal, evitando repetir sem querer o nome de um vértice. O Souza CAD também salva automaticamente em segundo plano. Se você fechar a aba sem querer, seu progresso recente continua salvo.',
    audioUrl: '/audio/tutorial/passo-base-7.mp3',
  },
];

// PASSOS AVANÇADOS — só aparecem quando a tela está no modo Completo.
export const PASSOS_AVANCADOS: Passo[] = [
  {
    icone: UserCheck,
    titulo: 'Casar Vértices dos Vizinhos',
    texto: 'A rejeição mais comum no SIGEF é ter dois códigos diferentes pro mesmo ponto físico. Pra evitar isso, você reaproveita o código dos vértices vizinhos já certificados. No modo Completo, o botão Casar adota automaticamente os códigos dos vértices do SIGEF que encostam no seu imóvel. E o botão Vizinhos lê arquivos de vértices exportados direto do Acervo Fundiário do INCRA.',
    audioUrl: '/audio/tutorial/passo-avancado-0.mp3',
  },
  {
    icone: Sparkles,
    titulo: 'Desenho Avançado, Achuras e Símbolos',
    texto: 'No modo Completo, você desenha polilinhas livres, cotas de distância, textos e símbolos, como postes, árvores ou marcos. Os polígonos fechados aceitam cor de preenchimento e achuras, como linhas a 45 graus ou grade, ótimas pra marcar áreas ambientais do CAR. Pra ajustar ângulos com precisão, use a trava Orto, de 90 graus, ou a trava Polar, de 15 graus. Ou digite direto o rumo e a distância. Organize tudo pelo Gerenciador de Camadas: dá pra mudar cor, espessura, visibilidade, ou travar a edição com o cadeado. E pressione Enter ou Espaço pra repetir a última ferramenta usada.',
    audioUrl: '/audio/tutorial/passo-avancado-1.mp3',
  },
  {
    icone: Ruler,
    titulo: 'Vértices Virtuais, Imã Esperto & Edição',
    texto: 'O modo Completo traz a ferramenta Vértice Virtual pra calcular pontos invisíveis ou inacessíveis, por afastamento ou por interseção. O Imã Esperto atrai o cursor pro fim de um segmento, pro meio dele, pra interseções, pro pé da perpendicular e pra extensão de alinhamentos. Use a ferramenta Paralela pra desenhar recuos e faixas de domínio. E use Dividir, Aparar e Prolongar pra ajustar seus desenhos.',
    audioUrl: '/audio/tutorial/passo-avancado-2.mp3',
  },
  {
    icone: FileText,
    titulo: 'Retificações Múltiplas e Atos de Errata',
    texto: 'Precisa retificar mais de um dado na matrícula de uma vez só? Nas abas de Errata e Requerimento, você cadastra várias linhas de correção, de naturezas diferentes: área, confrontantes, estado civil ou dados pessoais. O Souza CAD agrupa tudo e escreve a narrativa legal organizada, num Word editável. Você entrega uma única peça consolidada, com todas as retificações do projeto.',
    audioUrl: '/audio/tutorial/passo-avancado-3.mp3',
  },
  {
    icone: Ruler,
    titulo: 'Área SGL (Sem distorção UTM)',
    texto: 'O Souza CAD calcula sozinho a Área SGL, no plano geodésico local do elipsoide GRS80/SIRGAS2000. A área UTM comum distorce um pouco as distâncias reais, por causa do fator de escala da zona. Já a Área SGL é a medida física exata, e é essa que o INCRA e o SIGEF exigem na certificação.',
    audioUrl: '/audio/tutorial/passo-avancado-4.mp3',
  },
  {
    icone: Upload,
    titulo: 'Mapeador de Colunas do Arquivo de Pontos',
    texto: 'Seu receptor de GPS exporta arquivos com as colunas fora do padrão? Por exemplo, altitude antes do nome, ou separado por ponto e vírgula em vez de vírgula. Nas Configurações, você ajusta a ordem das colunas e o caractere de separação. O app guarda essa configuração no seu navegador, e aplica sozinho em todas as próximas importações.',
    audioUrl: '/audio/tutorial/passo-avancado-5.mp3',
  },
  {
    icone: Save,
    titulo: 'Contrato e Gestão Financeira',
    texto: 'Gerencie o valor contratado, os custos de campo e os recebimentos de cada projeto direto pela barra inferior. Você gera contratos de prestação de serviço, com as cláusulas de obrigação, e recibos com o valor por extenso preenchido automaticamente.',
    audioUrl: '/audio/tutorial/passo-avancado-6.mp3',
  },
];
