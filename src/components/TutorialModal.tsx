import { useState, useEffect, useRef, type ComponentType } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Upload, Search, UserCheck, BookUser, Users, Brush, FileText, Save,
  ChevronLeft, ChevronRight, CircleCheck, MessageCircle, GraduationCap,
  ToggleRight, PenTool, Ruler, Leaf, Sparkles, Play, Pause, Square, type LucideProps,
} from 'lucide-react';
import { carregarWhatsappSuporte, linkWhatsapp } from '@/lib/store/suporte';
import { TEMAS_AJUDA } from '@/lib/ajuda/temas';
import { carregarPreferencias, salvarModo, salvarNivelExperiencia } from '@/lib/store/preferencias';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

interface Passo {
  icone: ComponentType<LucideProps>;
  titulo: string;
  texto: string;
  audioUrl?: string;
}

// PASSOS BÁSICOS — o caminho essencial de um projeto, na ordem em que a tela conduz.
const PASSOS_BASE: Passo[] = [
  {
    icone: ToggleRight,
    titulo: 'A chave Simples e Completo',
    texto: 'No canto de cima, à direita, você escolhe se prefere usar o modo Simples ou Completo. No Simples, a tela exibe apenas o caminho essencial de um georreferenciamento para que você se acostume com o app sem se perder em botões extras. No Completo, todas as ferramentas avançadas e opcionais aparecem. Mude de modo a qualquer momento sem perder seu progresso. Após cerca de 5 horas acumuladas no Completo, a chave se recolhe automaticamente e pode ser reativada nas Configurações.',
    audioUrl: '/introducao.mp3',
  },
  {
    icone: Users,
    titulo: 'Otimização Horizontal Full HD',
    texto: 'Todo o Souza CAD foi projetado para tirar o máximo proveito de telas Full HD na horizontal. As colunas de dados, formulários de proprietários e painéis de desenho ficam lado a lado e são largas. Isso elimina rolagens verticais longas e desnecessárias, permitindo que você visualize e edite tudo de forma muito mais dinâmica e rápida.',
  },
  {
    icone: Upload,
    titulo: 'Importação Inteligente de Pontos',
    texto: 'Utilize o botão PONTOS no topo para enviar as coordenadas obtidas pelo seu receptor GNSS. O Souza CAD lê e desenha automaticamente a poligonal do imóvel. Se o seu equipamento exportar as colunas (Leste, Norte, Altitude, Código, etc.) em uma ordem diferente, você pode redefinir o mapeamento de colunas em Configurações, e o app lembrará para sempre.',
  },
  {
    icone: Search,
    titulo: 'SIGEF & Confrontantes Certificados',
    texto: 'O botão SIGEF procura automaticamente no acervo do INCRA os imóveis já certificados que fazem divisa com o seu projeto, desenhando-os como referência. Depois de baixados, esse mesmo botão se transforma no botão de ANÁLISE, permitindo verificar sobreposição de divisas ou erros geométricos.',
  },
  {
    icone: BookUser,
    titulo: 'Dados Completos e Atos do Requerimento',
    texto: 'O botão DADOS gerencia as informações do proprietário, imóvel, confrontantes e cartório. É o coração do memorial e do requerimento. Ao redigir o Requerimento de Retificação de Área, escolha o tipo de ato (venda, doação, usucapião, desmembramento ou unificação) e o app ajustará a fundamentação legal e as partes (adquirinte, transmitente ou partes adicionais). A comarca destinatária é preenchida automaticamente com base no padrão da empresa configurado em Ajustes.',
  },
  {
    icone: Brush,
    titulo: 'Pintura de Confrontações e Linhas',
    texto: 'Com o perímetro pronto, utilize os pincéis CONFRO e DIVISAS para pintar cada lado do imóvel. Você define quem confronta com cada trecho e qual é o tipo de linha (cerca, córrego, muro, etc.). A legenda é gerada automaticamente no canto do mapa e as cores ajudam na identificação rápida.',
  },
  {
    icone: FileText,
    titulo: 'Geração de Peças e Download Único',
    texto: 'Baixe todas as peças finais prontas no padrão do SIGEF e de cartórios: MEM (memorial descritivo em Word editável), ODS (planilha oficial do SIGEF), PLANTA (projeto A3 em PDF) e REQ (requerimento de retificação ao cartório). O botão TRT permite inserir a responsabilidade técnica que constará nos cabeçalhos.',
  },
  {
    icone: Save,
    titulo: 'Passo 7: Nunca Perca um Trabalho & Banco de Pontos',
    texto: 'O botão Salvar (que muda de cor para avisar quando há alterações pendentes) guarda seu projeto de forma segura na nuvem e alimenta seu banco de pontos pessoal para evitar a repetição acidental de nomes de vértices. Além disso, o Souza CAD possui salvamento automático em segundo plano; se você fechar a aba sem querer, seu progresso recente estará a salvo.',
  },
];

// PASSOS AVANÇADOS — só aparecem quando a tela está no modo Completo.
const PASSOS_AVANCADOS: Passo[] = [
  {
    icone: UserCheck,
    titulo: 'Casar Vértices dos Vizinhos',
    texto: 'Para evitar a rejeição mais comum (múltiplos códigos para o mesmo ponto), você deve reaproveitar os códigos de vértices vizinhos certificados. No modo Completo, o botão CASAR adota automaticamente os códigos dos vértices SIGEF que encostam no seu imóvel, e o botão VIZINHOS permite ler arquivos de vértices exportados do Acervo Fundiário do INCRA.',
  },
  {
    icone: Sparkles,
    titulo: 'Desenho Avançado, Achuras e Símbolos',
    texto: 'No modo Completo, você pode desenhar polilinhas livres, cotas de distância, textos e símbolos (como postes, árvores ou marcos). Os polígonos fechados de desenho aceitam cores de preenchimento e achuras (linhas 45°, grade/X, etc.), ideais para áreas ambientais do CAR. Ajuste ângulos precisos usando a trava Orto (90°) ou Polar (15°), ou digite diretamente o rumo e distância. Organize tudo pelo Gerenciador de Camadas (ajustando cor, espessura, visibilidade ou bloqueio de edição com o cadeado) e pressione Enter ou Espaço para repetir a última ferramenta.',
  },
  {
    icone: Ruler,
    titulo: 'Vértices Virtuais, Imã Esperto & Edição',
    texto: 'O modo Completo oferece a ferramenta Vértice Virtual (V) para calcular pontos invisíveis/inacessíveis por afastamento ou interseções. O Imã Esperto (Snapping avançado) atrai o cursor para o fim de segmento, meio de segmento (triângulo verde), interseções (X verde), pé da perpendicular e extensão de alinhamentos. Use a ferramenta Paralela (Offset) para desenhar recuos e faixas de domínio, e use as ferramentas Dividir, Aparar (Trim) e Prolongar (Extend) para ajustar seus desenhos.',
  },
  {
    icone: FileText,
    titulo: 'Retificações Múltiplas e Atos de Errata',
    texto: 'Precisa retificar mais de um dado na matrícula de uma vez só? Nas abas de Errata e Requerimento, você pode cadastrar múltiplas linhas de correções de diferentes naturezas (área, confrontantes, estado civil ou dados pessoais). O Souza CAD agrupa e escreve a narrativa legal de forma organizada no Word (.docx), permitindo que você entregue uma única peça consolidada para todas as retificações do seu projeto.',
  },
  {
    icone: Ruler,
    titulo: 'Área SGL (Sem distorção UTM)',
    texto: 'O Souza CAD calcula automaticamente a Área SGL (Sistema Geodésico Local) no plano topocêntrico local (do elipsoide GRS80/SIRGAS2000). Ao contrário da área UTM bruta, que distorce as distâncias reais por causa do fator de escala do meridiano central da zona, a Área SGL é a exata medida física aceita pelo INCRA e pelo SIGEF na certificação.',
  },
  {
    icone: Upload,
    titulo: 'Mapeador de Colunas do Arquivo de Pontos',
    texto: 'Seu receptor GNSS exporta arquivos com colunas fora do padrão (ex: Altitude antes do Nome, ou delimitado por ponto e vírgula)? Nas Configurações, você pode ajustar a ordem das colunas e o caractere de separação. O app salva essa configuração no seu navegador e aplica automaticamente em todas as próximas importações.',
  },
  {
    icone: Save,
    titulo: 'Contrato e Gestão Financeira',
    texto: 'Gerencie o valor contratado, custos de campo e recebimentos de cada projeto diretamente pela barra inferior. Você pode gerar contratos de prestação de serviços com cláusulas de obrigações e recibos com preenchimento de valor por extenso automático.',
  },
];
type TelaAjuda = 'menu' | 'passos' | 'aprenderMais' | 'temas' | 'tema';

export default function TutorialModal({ open, onOpenChange }: Props) {
  const [tela, setTela] = useState<TelaAjuda>('menu');
  const [passo, setPasso] = useState(0);
  const [temaId, setTemaId] = useState<string | null>(null);

  // Duas coisas DIFERENTES: `modo` (quantas ferramentas na tela) e `nivel` (quanta explicação a
  // ajuda dá, conforme o tempo de profissão). O seletor visível é o do nível, porque é ele que muda
  // o texto que a pessoa está lendo aqui. O modo só decide se aparecem os passos avançados.
  const [modo, setModo] = useState<'simples' | 'medio' | 'completo'>('simples');
  const [nivel, setNivel] = useState<'iniciante' | 'experiente'>('iniciante');
  const [zapSuporte, setZapSuporte] = useState('');

  // Estados para reprodução de áudio por Text-to-Speech ou Arquivo Gravado
  const [falando, setFalando] = useState(false);
  const [pausado, setPausado] = useState(false);
  const [tipoAudio, setTipoAudio] = useState<'tts' | 'gravado'>('tts');
  const [erroAudio, setErroAudio] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function pararAudio() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setFalando(false);
    setPausado(false);
    setErroAudio('');
  }

  function falarTexto(texto: string) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const cleanText = texto.replace(/[*_#`[\]()]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pt-BR';

    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find((v) => v.lang.startsWith('pt'));
    if (ptVoice) utterance.voice = ptVoice;

    utterance.onend = () => {
      setFalando(false);
      setPausado(false);
    };
    utterance.onerror = () => {
      setFalando(false);
      setPausado(false);
    };

    setFalando(true);
    setPausado(false);
    setTipoAudio('tts');
    window.speechSynthesis.speak(utterance);
  }

  function alternarAudio(texto: string, audioUrl?: string) {
    if (typeof window === 'undefined') return;

    if (falando) {
      if (pausado) {
        if (tipoAudio === 'gravado' && audioRef.current) {
          audioRef.current.play().catch((e) => console.error(e));
        } else if (tipoAudio === 'tts' && window.speechSynthesis) {
          window.speechSynthesis.resume();
        }
        setPausado(false);
      } else {
        if (tipoAudio === 'gravado' && audioRef.current) {
          audioRef.current.pause();
        } else if (tipoAudio === 'tts' && window.speechSynthesis) {
          window.speechSynthesis.pause();
        }
        setPausado(true);
      }
    } else {
      setErroAudio('');
      if (audioUrl) {
        setTipoAudio('gravado');
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        const usarFallback = (motivo: string, erro: unknown) => {
          console.warn(motivo, erro);
          audioRef.current = null;
          if (texto.trim()) {
            setTipoAudio('tts');
            falarTexto(texto);
          } else {
            setFalando(false);
            setPausado(false);
            setErroAudio('Não consegui tocar este áudio agora. Tente de novo em instantes.');
          }
        };

        audio.addEventListener('ended', () => {
          setFalando(false);
          setPausado(false);
          audioRef.current = null;
        });

        audio.addEventListener('error', () => {
          usarFallback('Erro ao carregar o arquivo gravado.', undefined);
        });

        audio.play().then(() => {
          setFalando(true);
          setPausado(false);
        }).catch((e) => {
          usarFallback('Falha ao rodar áudio gravado:', e);
        });
      } else {
        setTipoAudio('tts');
        falarTexto(texto);
      }
    }
  }

  // Interrompe qualquer áudio sempre que fechar o modal ou mudar de passo/tela/nível
  useEffect(() => {
    pararAudio();
  }, [open, tela, passo, temaId, nivel]);

  // Cancela na desmontagem do componente
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);
  useEffect(() => {
    if (!open) return;
    setTela('menu'); setPasso(0); setTemaId(null);
    const p = carregarPreferencias();
    setModo(p.modo); setNivel(p.nivelExperiencia);
    carregarWhatsappSuporte().then(setZapSuporte).catch(() => {});
  }, [open]);
  const linkSuporte = linkWhatsapp(zapSuporte);

  // O nível da ajuda é uma preferência do usuário: muda aqui, vale no app inteiro.
  function trocarNivel(n: 'iniciante' | 'experiente') { setNivel(n); salvarNivelExperiencia(n); }
  // Virar pro Completo (a partir do convite no fim do básico) muda a interface e revela mais passos.
  function irParaCompleto() { setModo('completo'); salvarModo('completo'); }

  // No Simples, só os passos básicos. No Completo, básicos + avançados.
  const passos = modo === 'completo' ? [...PASSOS_BASE, ...PASSOS_AVANCADOS] : PASSOS_BASE;
  const ultimo = passo === passos.length - 1;
  const noFimDoBasico = passo === PASSOS_BASE.length - 1;
  const p = passos[passo] ?? passos[0];
  const Icone = p.icone;
  const tema = TEMAS_AJUDA.find((t) => t.id === temaId) ?? null;

  const seletorNivel = (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center justify-center gap-1 rounded-full border bg-muted/40 p-0.5 text-xs">
        {(['iniciante', 'experiente'] as const).map((n) => (
          <button key={n} type="button" onClick={() => trocarNivel(n)}
            className={`rounded-full px-3 py-1 font-semibold capitalize transition-colors ${nivel === n ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            title={n === 'iniciante' ? 'Explica os porquês, linguagem didática — pra quem tem pouco tempo de profissão' : 'Direto ao ponto — pra o agrimensor que já tem tempo de profissão e não quer tanta explicação'}>
            {n}
          </button>
        ))}
      </div>
      <span className="text-[10px] text-muted-foreground">Nível da ajuda — quanta explicação você quer. É separado da chave Simples/Completo.</span>
    </div>
  );

  const audioControls = (texto: string, audioUrl?: string) => (
    <div className="flex items-center justify-between mb-1.5 bg-muted/40 p-1.5 rounded-lg border border-border/50 animate-in fade-in duration-200">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => alternarAudio(texto, audioUrl)}
          className="h-8 gap-1.5 px-3 font-semibold text-xs transition-colors hover:bg-muted"
        >
          {falando && !pausado ? (
            <>
              <Pause className="size-3.5 text-amber-500 fill-amber-500" /> Pausar áudio
            </>
          ) : (
            <>
              <Play className="size-3.5 text-emerald-500 fill-emerald-500" /> {pausado ? 'Retomar áudio' : 'Ouvir instruções'}
            </>
          )}
        </Button>
        {(falando || pausado) && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={pararAudio}
            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
            title="Parar áudio"
          >
            <Square className="size-3.5 fill-destructive" />
          </Button>
        )}
      </div>
      {falando && (
        <span className="text-[10px] font-semibold text-muted-foreground px-2 py-0.5 rounded-full bg-background border border-border/60">
          {tipoAudio === 'gravado' ? '🎙️ Narração Gravada' : '🤖 Síntese de Voz'}
        </span>
      )}
    </div>
  );

  const botaoSuporte = linkSuporte && (
    <a href={linkSuporte} target="_blank" rel="noopener noreferrer"
       className="flex items-center justify-center gap-2 rounded-md border border-emerald-600/40 bg-emerald-600/10 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-600/20 dark:text-emerald-400">
      <MessageCircle className="size-4" /> Falar com o suporte no WhatsApp
    </a>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-lg flex-col">
        {tela === 'menu' && (
          <>
            {/* Banner de boas-vindas com a textura do campo (arte da marca) */}
            <div className="relative -mx-5 -mt-5 mb-1 h-24 overflow-hidden rounded-t-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/marca/fundo-campo.png" alt="" aria-hidden className="absolute inset-0 size-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0a1f14]/90 via-[#0a1f14]/60 to-transparent" />
              <div className="relative flex h-full flex-col justify-center px-6 text-white">
                <div className="flex items-center gap-2 text-base font-bold drop-shadow"><GraduationCap className="size-5" /> Central de ajuda</div>
                <p className="text-xs text-white/85 drop-shadow">Bem-vindo ao Souza CAD — aprenda no seu ritmo.</p>
              </div>
            </div>
            <DialogHeader className="sr-only"><DialogTitle>Central de ajuda</DialogTitle></DialogHeader>
            {seletorNivel}

            <div className="rounded-lg border p-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary"><Play className="size-4 text-emerald-500 fill-emerald-500" /> Audioguia Completo (MP3)</div>
                  <p className="mt-0.5 text-xs text-muted-foreground">Ouça a narração em áudio gravado sobre o Souza CAD.</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => alternarAudio('', '/tutorial.mp3')}
                  className="gap-1.5 h-8 font-semibold text-xs px-2.5 transition-colors hover:bg-muted"
                >
                  {falando && tipoAudio === 'gravado' && !pausado ? (
                    <><Pause className="size-3 text-amber-500 fill-amber-500" /> Pausar</>
                  ) : (
                    <><Play className="size-3 text-emerald-500 fill-emerald-500" /> Ouvir</>
                  )}
                </Button>
              </div>
              {erroAudio && (
                <p className="mt-2 text-xs font-medium text-red-500">{erroAudio}</p>
              )}
            </div>

            <button type="button" onClick={() => { setPasso(0); setTela('passos'); }}
              className="rounded-lg border p-3 text-left hover:bg-muted/50">
              <div className="flex items-center gap-2 text-sm font-semibold"><CircleCheck className="size-4 text-primary" /> Tutorial passo a passo</div>
              <p className="mt-1 text-sm text-muted-foreground">O fluxo completo de um projeto, na ordem dos botões da tela. Comece por aqui.</p>
            </button>
            <button type="button" onClick={() => setTela('temas')}
              className="rounded-lg border p-3 text-left hover:bg-muted/50">
              <div className="flex items-center gap-2 text-sm font-semibold"><BookUser className="size-4 text-primary" /> Aprender por tema</div>
              <p className="mt-1 text-sm text-muted-foreground">Cada área que o app atende, explicada no seu nível: SIGEF, fuso, confrontantes, memorial, planta, requerimento e mais.</p>
            </button>
            {botaoSuporte}
          </>
        )}

        {tela === 'passos' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Icone className="size-5 text-primary" /> {p.titulo}
              </DialogTitle>
            </DialogHeader>
            {audioControls(p.texto, p.audioUrl)}
            <p className="text-sm leading-relaxed text-muted-foreground">{p.texto}</p>
            {modo === 'simples' && noFimDoBasico && (
              <button type="button" onClick={irParaCompleto}
                className="flex items-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-2 text-left text-xs text-muted-foreground hover:bg-primary/10">
                <Sparkles className="size-4 shrink-0 text-primary" />
                <span>Quer ver as ferramentas avançadas? Toque aqui pra virar a tela pro <b className="text-primary">modo Completo</b> e ganhar mais passos neste tutorial.</span>
              </button>
            )}
            <div className="flex items-center justify-center gap-1.5 py-1">
              {passos.map((_, i) => (
                <span key={i} className={`h-1.5 rounded-full transition-all ${i === passo ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/30'}`} />
              ))}
            </div>
            <div className="flex items-center justify-between border-t pt-3">
              <Button variant="ghost" size="sm" onClick={() => setTela('menu')}>Voltar ao menu</Button>
              <div className="flex items-center gap-2">
                {passo > 0 && (
                  <Button variant="outline" size="sm" onClick={() => setPasso((n) => n - 1)}><ChevronLeft className="size-4" /> Voltar</Button>
                )}
                {ultimo ? (
                  <Button size="sm" onClick={() => setTela('aprenderMais')}><CircleCheck className="size-4" /> Entendi</Button>
                ) : (
                  <Button size="sm" onClick={() => setPasso((n) => n + 1)}>Avançar <ChevronRight className="size-4" /></Button>
                )}
              </div>
            </div>
          </>
        )}

        {tela === 'aprenderMais' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base"><GraduationCap className="size-5 text-primary" /> Deseja aprender mais?</DialogTitle>
            </DialogHeader>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Tem muito mais dica por aqui: explicações de cada área do trabalho — SIGEF, fuso, confrontantes, memorial, planta, requerimento — no seu nível de experiência.
            </p>
            <div className="flex items-center justify-end gap-2 border-t pt-3">
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Agora não</Button>
              <Button size="sm" onClick={() => setTela('temas')}><BookUser className="size-4" /> Sim, ver os temas</Button>
            </div>
          </>
        )}

        {tela === 'temas' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base"><BookUser className="size-5 text-primary" /> Aprender por tema</DialogTitle>
            </DialogHeader>
            {seletorNivel}
            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
              {TEMAS_AJUDA.map((t) => (
                <button key={t.id} type="button" onClick={() => { setTemaId(t.id); setTela('tema'); }}
                  className="flex w-full items-center justify-between rounded-lg border p-2.5 text-left text-sm font-medium hover:bg-muted/50">
                  {t.titulo} <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between border-t pt-3">
              <Button variant="ghost" size="sm" onClick={() => setTela('menu')}>Voltar ao menu</Button>
              <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
            </div>
          </>
        )}

        {tela === 'tema' && tema && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base"><BookUser className="size-5 text-primary" /> {tema.titulo}</DialogTitle>
            </DialogHeader>
            {seletorNivel}
            {audioControls(nivel === 'iniciante' ? tema.iniciante : tema.experiente)}
            <p className="min-h-0 flex-1 overflow-y-auto pr-1 text-sm leading-relaxed text-muted-foreground">
              {nivel === 'iniciante' ? tema.iniciante : tema.experiente}
            </p>
            <div className="flex items-center justify-between border-t pt-3">
              <Button variant="ghost" size="sm" onClick={() => setTela('temas')}><ChevronLeft className="size-4" /> Todos os temas</Button>
              <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
