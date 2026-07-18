import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft, ChevronRight, CircleCheck, MessageCircle, GraduationCap,
  Sparkles, Play, Pause, Square, BookUser, X, Volume2
} from 'lucide-react';
import { carregarWhatsappSuporte, linkWhatsapp } from '@/lib/store/suporte';
import { TEMAS_AJUDA } from '@/lib/ajuda/temas';
import { PASSOS_BASE, PASSOS_AVANCADOS } from '@/lib/ajuda/passos';
import { carregarPreferencias, salvarModo, salvarNivelExperiencia } from '@/lib/store/preferencias';
import { prepararTextoParaFala, dividirEmFrases, melhorVozPt } from '@/lib/ajuda/voz';
import { Z_CLASSES } from '@/lib/ui/zlayers';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

type TelaAjuda = 'menu' | 'passos' | 'aprenderMais' | 'temas' | 'tema';

export default function TutorialModal({ open, onOpenChange }: Props) {
  const [tela, setTela] = useState<TelaAjuda>('menu');
  const [passo, setPasso] = useState(0);
  const [temaId, setTemaId] = useState<string | null>(null);

  // Duas coisas DIFERENTES: `modo` (quantas ferramentas na tela) e `nivel` (quanta explicação a
  // ajuda dá, conforme o tempo de profissão). O seletor visível é o do nível, porque é ele que muda
  // o texto que a pessoa está lendo aqui. O modo só decide se aparecem os passos avançados.
  const [modo, setModo] = useState<'simples' | 'medio' | 'completo'>('simples');
  const [nivel, setNivel] = useState<'iniciante' | 'experiente'>('experiente');
  const [zapSuporte, setZapSuporte] = useState('');

  // Estados para reprodução de áudio por Text-to-Speech ou Arquivo Gravado
  const [falando, setFalando] = useState(false);
  const [pausado, setPausado] = useState(false);
  const [tipoAudio, setTipoAudio] = useState<'tts' | 'gravado'>('tts');
  const [erroAudio, setErroAudio] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Identifica a "rodada" de fala atual: incrementado sempre que a fala é interrompida ou trocada,
  // pra descartar callbacks (onend/onvoiceschanged) de uma fala antiga que já não vale mais.
  const audioSessaoRef = useRef(0);

  const [ouvirTudo, setOuvirTudo] = useState(false);
  const ouvirTudoRef = useRef(false);

  const [ouvirTudoTemas, setOuvirTudoTemas] = useState(false);
  const ouvirTudoTemasRef = useRef(false);

  const avancarPassoAutoplayRef = useRef<() => void>(() => {});
  const avancarTemaAutoplayRef = useRef<() => void>(() => {});
  const falarTextoRef = useRef<(texto: string) => Promise<void>>(async () => {});

  // Watchdog de áudio gravado: em alguns navegadores, um arquivo ausente (404) faz o play()
  // resolver sem som e o onError NÃO disparar — a tela fica muda. A gente inicia um timer junto
  // com o play; se em ~1,8s nenhum "playing" chegar, assume falha e cai na síntese de voz.
  const audioWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelarWatchdog = useCallback(() => {
    if (audioWatchdogRef.current) {
      clearTimeout(audioWatchdogRef.current);
      audioWatchdogRef.current = null;
    }
  }, []);
  const agendarFallbackTts = useCallback((texto: string) => {
    cancelarWatchdog();
    audioWatchdogRef.current = setTimeout(() => {
      console.warn('Áudio gravado não respondeu a tempo — usando síntese de voz.');
      setTipoAudio('tts');
      falarTextoRef.current(texto);
    }, 1800);
  }, [cancelarWatchdog]);

  const avancarPassoAutoplay = useCallback(() => {
    if (!ouvirTudoRef.current) return;
    setPasso((p) => {
      const passosArr = modo === 'completo' ? [...PASSOS_BASE, ...PASSOS_AVANCADOS] : PASSOS_BASE;
      const proximo = p + 1;
      if (proximo < passosArr.length) {
        const proxP = passosArr[proximo];
        setTimeout(() => {
          if (proxP.audioUrl) {
            setTipoAudio('gravado');
            const audio = audioRef.current;
            if (audio) {
              audio.src = proxP.audioUrl;
              audio.load();
              agendarFallbackTts(proxP.texto);
              audio.play().then(() => {
                setFalando(true);
                setPausado(false);
              }).catch((e) => {
                console.warn('Autoplay play failed, falling back to TTS:', e);
                cancelarWatchdog();
                falarTextoRef.current(proxP.texto);
              });
            }
          } else {
            falarTextoRef.current(proxP.texto);
          }
        }, 1000);
        return proximo;
      } else {
        ouvirTudoRef.current = false;
        setOuvirTudo(false);
        return p;
      }
    });
  }, [modo, agendarFallbackTts, cancelarWatchdog]);

  useEffect(() => {
    avancarPassoAutoplayRef.current = avancarPassoAutoplay;
  }, [avancarPassoAutoplay]);

  const avancarTemaAutoplay = useCallback(() => {
    if (!ouvirTudoTemasRef.current) return;
    setTemaId((currentId) => {
      const atualIdx = currentId ? TEMAS_AJUDA.findIndex((t) => t.id === currentId) : -1;
      const proximoIdx = atualIdx + 1;
      if (proximoIdx < TEMAS_AJUDA.length) {
        const proxTema = TEMAS_AJUDA[proximoIdx];
        const audioUrl = nivel === 'iniciante' ? proxTema.audioUrlIniciante : proxTema.audioUrlExperiente;
        const texto = nivel === 'iniciante' ? proxTema.iniciante : proxTema.experiente;
        setTimeout(() => {
          alternarAudio(texto, audioUrl);
        }, 1000);
        return proxTema.id;
      } else {
        ouvirTudoTemasRef.current = false;
        setOuvirTudoTemas(false);
        setTela('temas');
        return null;
      }
    });
  }, [nivel]);

  useEffect(() => {
    avancarTemaAutoplayRef.current = avancarTemaAutoplay;
  }, [avancarTemaAutoplay]);

  function pararAudio() {
    audioSessaoRef.current += 1;
    cancelarWatchdog();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    ouvirTudoRef.current = false;
    setOuvirTudo(false);
    ouvirTudoTemasRef.current = false;
    setOuvirTudoTemas(false);
    setFalando(false);
    setPausado(false);
    setErroAudio('');
  }

  // Espera a lista de vozes do navegador carregar (na primeira vez que a tela abre, ela costuma vir
  // vazia — pegar a voz antes disso faz o navegador cair na voz padrão, geralmente a mais robótica).
  function obterVozesPt(): Promise<SpeechSynthesisVoice[]> {
    return new Promise((resolve) => {
      const filtrar = () => window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('pt'));
      const prontas = filtrar();
      if (prontas.length) { resolve(prontas); return; }
      const timeout = setTimeout(() => resolve(filtrar()), 600);
      window.speechSynthesis.onvoiceschanged = () => {
        clearTimeout(timeout);
        resolve(filtrar());
      };
    });
  }

  const falarTexto = useCallback(async (texto: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const frases = dividirEmFrases(prepararTextoParaFala(texto));
    audioSessaoRef.current += 1;
    const sessao = audioSessaoRef.current;

    const voz = melhorVozPt(await obterVozesPt());
    if (sessao !== audioSessaoRef.current) return; // usuário trocou de passo/parou enquanto as vozes carregavam

    setTipoAudio('tts');
    setFalando(true);
    setPausado(false);

    const falarFrase = (indice: number) => {
      if (sessao !== audioSessaoRef.current) return;
      if (indice >= frases.length) {
        setFalando(false);
        setPausado(false);
        if (ouvirTudoRef.current) {
          avancarPassoAutoplayRef.current();
        } else if (ouvirTudoTemasRef.current) {
          avancarTemaAutoplayRef.current();
        }
        return;
      }
      const utterance = new SpeechSynthesisUtterance(frases[indice]);
      utterance.lang = voz?.lang || 'pt-BR';
      if (voz) utterance.voice = voz;
      utterance.rate = 0.97;
      utterance.pitch = 1;

      utterance.onend = () => falarFrase(indice + 1);
      utterance.onerror = (e) => {
        // "canceled"/"interrupted" acontecem sempre que a gente mesmo chama cancel() — não é falha real.
        if (e.error === 'canceled' || e.error === 'interrupted') return;
        console.warn('Erro na síntese de voz:', e.error);
        falarFrase(indice + 1);
      };
      window.speechSynthesis.speak(utterance);
    };

    falarFrase(0);
  }, []);

  useEffect(() => {
    falarTextoRef.current = falarTexto;
  }, [falarTexto]);

  const ultimoTextoRef = useRef('');

  function alternarAudio(texto: string, audioUrl?: string) {
    if (typeof window === 'undefined') return;
    ultimoTextoRef.current = texto;

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
        const audio = audioRef.current;
        if (audio) {
          audio.src = audioUrl;
          audio.load();
          agendarFallbackTts(texto);
          audio.play().then(() => {
            setFalando(true);
            setPausado(false);
          }).catch((e) => {
            // Arquivo ausente/quebrado: cai na voz do navegador pra não ficar mudo.
            console.warn('Falha ao rodar áudio gravado, usando síntese:', e);
            cancelarWatchdog();
            falarTextoRef.current(texto);
          });
        }
      } else {
        falarTextoRef.current(texto);
      }
    }
  }

  // Interrompe áudio ao fechar, ou ao navegar manualmente. Durante "Tutorial Completo" /
  // autoplay de temas, o avanço de passo/tema NÃO deve cortar a narração (senão o play
  // inicial morre no mesmo ciclo de render).
  useEffect(() => {
    if (!open) {
      pararAudio();
      return;
    }
    if (ouvirTudoRef.current || ouvirTudoTemasRef.current) return;
    pararAudio();
  }, [open, tela, passo, temaId, nivel]);

  // Cancela na desmontagem do componente
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (audioWatchdogRef.current) clearTimeout(audioWatchdogRef.current);
    };
  }, []);
  useEffect(() => {
    if (!open) return;
    setTela('menu'); setPasso(0); setTemaId(null);
    const p = carregarPreferencias();
    setModo(p.modo); setNivel('experiente');
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
          onClick={() => {
            if (ouvirTudo) {
              pararAudio();
            } else {
              alternarAudio(texto, audioUrl);
            }
          }}
          className="h-8 gap-1.5 px-3 font-semibold text-xs transition-colors hover:bg-muted"
        >
          {falando && !pausado ? (
            <>
              <Pause className="size-3.5 text-amber-500 fill-amber-500" /> {ouvirTudo ? 'Parar tudo' : 'Pausar áudio'}
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
      <div className="flex items-center gap-1.5">
        {ouvirTudo && (
          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full animate-pulse">
            Ouvindo Tudo
          </span>
        )}
        {falando && (
          <span className="text-[10px] font-semibold text-muted-foreground px-2 py-0.5 rounded-full bg-background border border-border/60">
            {tipoAudio === 'gravado' ? 'Narração Gravada' : 'Síntese de Voz'}
          </span>
        )}
      </div>
    </div>
  );

  const botaoSuporte = linkSuporte && (
    <a href={linkSuporte} target="_blank" rel="noopener noreferrer"
       className="flex items-center justify-center gap-2 rounded-md border border-emerald-600/40 bg-emerald-600/10 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-600/20 dark:text-emerald-400">
      <MessageCircle className="size-4" /> Falar com o suporte no WhatsApp
    </a>
  );

  if (!open) return null;

  return (
    <div className={`no-print fixed bottom-16 right-4 ${Z_CLASSES.TUTORIAL_PILL} w-[380px] md:w-[440px] flex flex-col bg-white dark:bg-zinc-950 shadow-2xl rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 transition-all duration-300 max-h-[80vh] overflow-y-auto scroll-fino text-foreground`}>
      {/* Botão fechar flutuante */}
      <button type="button" onClick={() => onOpenChange(false)} className="absolute top-4 right-4 z-20 rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors" title="Fechar tutorial">
        <X className="size-4.5" />
      </button>

      <div className="flex flex-col gap-3.5">
        {tela === 'menu' && (
          <>
            {/* Banner de boas-vindas com gradiente moderno e sofisticado */}
            <div className="relative -mx-5 -mt-5 mb-2 h-28 overflow-hidden rounded-t-2xl bg-gradient-to-br from-emerald-600 to-teal-800 dark:from-emerald-700 dark:to-zinc-900 flex flex-col justify-center px-6 text-white shadow-inner">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent)]" />
              <div className="relative flex h-full flex-col justify-center gap-1">
                <div className="flex items-center gap-2 text-base font-black uppercase tracking-wider"><GraduationCap className="size-5 text-emerald-300 animate-bounce" /> Central de ajuda</div>
                <p className="text-[10px] text-emerald-100 font-bold uppercase tracking-wider">Bem-vindo ao Souza CAD — aprenda no seu ritmo.</p>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 dark:border-zinc-850 p-4 bg-zinc-50/50 dark:bg-zinc-900/30 flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="min-w-0 flex-1 text-left">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
                    <Play className="size-4 text-emerald-500 fill-emerald-500" />
                    <span>Audioguia e Autoplay</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground leading-normal font-semibold">
                    Cada seção do tutorial tem narração própria. Use <b>Tutorial Completo</b> para ouvir todos os passos em sequência automática.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (ouvirTudo) {
                        pararAudio();
                      } else {
                        // Marca autoplay ANTES de trocar tela/passo — senão o effect de
                        // "parar ao navegar" cancela o áudio no mesmo ciclo.
                        const pFirst = passos[0];
                        ouvirTudoRef.current = true;
                        setOuvirTudo(true);
                        setPasso(0);
                        setTela('passos');
                        // play no próximo tick, depois do effect de navegação
                        setTimeout(() => {
                          if (!ouvirTudoRef.current) return;
                          alternarAudio(pFirst.texto, pFirst.audioUrl);
                        }, 50);
                      }
                    }}
                    title="Ouvir todos os áudios do tutorial em sequência automática (recomendado)"
                    className="gap-1.5 h-8 font-bold text-xs px-3 transition-colors bg-amber-500 hover:bg-amber-600 text-white border-none shadow-sm shrink-0"
                  >
                    {ouvirTudo ? (
                      <><Pause className="size-3 text-white fill-white animate-pulse" /> Parar</>
                    ) : (
                      <><Play className="size-3 text-white fill-white" /> Tutorial Completo</>
                    )}
                  </Button>
                </div>
              </div>
              {erroAudio && (
                <p className="text-xs font-semibold text-red-500 text-left">{erroAudio}</p>
              )}
            </div>

            <button type="button" onClick={() => { setPasso(0); setTela('passos'); }}
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 text-left bg-zinc-50/50 dark:bg-zinc-900/40 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all flex items-start gap-3">
              <div className="p-2 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-lg text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                <CircleCheck className="size-5" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-bold uppercase text-foreground tracking-wider">Tutorial Passo a Passo</div>
                <p className="text-[11px] text-muted-foreground leading-relaxed font-semibold">O fluxo completo de um projeto, na ordem dos botões da tela. Ideal para guiar seu trabalho do início ao fim.</p>
              </div>
            </button>

            <button type="button" onClick={() => setTela('temas')}
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 text-left bg-zinc-50/50 dark:bg-zinc-900/40 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all flex items-start gap-3">
              <div className="p-2 bg-blue-500/10 dark:bg-blue-500/5 rounded-lg text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                <BookUser className="size-5" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-bold uppercase text-foreground tracking-wider">Aprender por Tema</div>
                <p className="text-[11px] text-muted-foreground leading-relaxed font-semibold">Cada área técnica detalhada: SIGEF, fusos UTM, confrontações, memorial descritivo, prancha de desenho e mais.</p>
              </div>
            </button>

            {botaoSuporte}
          </>
        )}

        {tela === 'passos' && (
          <>
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider pb-2 border-b mb-1 text-left text-primary">
              <Icone className="size-5 text-primary" /> {p.titulo}
            </div>
            {audioControls(p.texto, p.audioUrl)}
            {p.texto.includes('Folha Travada') || p.texto.includes('Trava da Folha') ? (
              (() => {
                // Separa o texto principal do bloco da Trava
                const partes = p.texto.split(/\n\n(?=(?:⚠️|🔒|Na mesma região|Na mesma Barra))/);
                return (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold leading-relaxed text-muted-foreground text-left whitespace-pre-line">{partes[0]}</p>
                    {partes.slice(1).map((parte, i) => (
                      <div key={i} className="rounded-xl border border-amber-500/40 bg-amber-500/8 dark:bg-amber-500/10 px-4 py-3 text-left space-y-1.5">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-amber-700 dark:text-amber-400">
                          <span className="text-base">🔒</span> Botão Folha Travada
                        </div>
                        <p className="text-[11px] font-semibold leading-relaxed text-amber-900 dark:text-amber-200 whitespace-pre-line">
                          {parte
                            .replace(/^⚠️ Botão Folha Travada — essencial ao editar a planta:\n/, '')
                            .replace(/^⚠️ Botão Trava da Folha — essencial ao editar a planta:\n/, '')
                            .replace(/^Na mesma região da barra lateral esquerda, em Visualização e Navegação, fica o botão Folha Travada\. /, '')
                            .replace(/^Na mesma Barra de Controle flutuante, você encontra o botão 🔒 Trava da Folha — um dos controles mais importantes do sistema\.\n/, '')}
                        </p>
                      </div>
                    ))}
                  </div>
                );
              })()
            ) : (
              <p className="text-xs font-semibold leading-relaxed text-muted-foreground text-left whitespace-pre-line">{p.texto}</p>
            )}

            {modo === 'simples' && noFimDoBasico && (
              <button type="button" onClick={irParaCompleto}
                className="flex items-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3.5 text-left text-xs text-muted-foreground hover:bg-primary/10">
                <Sparkles className="size-4 shrink-0 text-primary" />
                <span>Quer ver as ferramentas avançadas? Toque aqui pra virar a tela pro <b className="text-primary">modo Completo</b> e ganhar mais passos neste tutorial.</span>
              </button>
            )}
            <div className="flex items-center justify-center gap-1.5 py-1">
              {passos.map((_, i) => (
                <span key={i} className={`h-1.5 rounded-full transition-all ${i === passo ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/30'}`} />
              ))}
            </div>
            <div className="flex items-center justify-between border-t pt-3.5 mt-2">
              <Button variant="ghost" size="sm" className="font-bold text-xs" onClick={() => setTela('menu')}>Voltar ao menu</Button>
              <div className="flex items-center gap-2">
                {passo > 0 && (
                  <Button variant="outline" size="sm" className="font-bold text-xs" onClick={() => setPasso((n) => n - 1)}><ChevronLeft className="size-4" /> Voltar</Button>
                )}
                {ultimo ? (
                  <Button size="sm" className="font-bold text-xs" onClick={() => setTela('aprenderMais')}><CircleCheck className="size-4" /> Entendi</Button>
                ) : (
                  <Button size="sm" className="font-bold text-xs" onClick={() => setPasso((n) => n + 1)}>Avançar <ChevronRight className="size-4" /></Button>
                )}
              </div>
            </div>
          </>
        )}

        {tela === 'aprenderMais' && (
          <>
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider pb-2 border-b mb-1 text-left text-primary">
              <GraduationCap className="size-5 text-primary" /> Deseja aprender mais?
            </div>
            <p className="text-xs font-semibold leading-relaxed text-muted-foreground text-left">
              Tem muito mais dica por aqui: explicações detalhadas de cada área do trabalho — SIGEF, fuso UTM, confrontantes, memorial descritivo, prancha de desenho, requerimento — prontas para o agrimensor experiente.
            </p>
            <div className="flex items-center justify-end gap-2 border-t pt-3.5 mt-2">
              <Button variant="ghost" size="sm" className="font-bold text-xs" onClick={() => onOpenChange(false)}>Agora não</Button>
              <Button size="sm" className="font-bold text-xs" onClick={() => setTela('temas')}><BookUser className="size-4" /> Sim, ver os temas</Button>
            </div>
          </>
        )}

        {tela === 'temas' && (
          <>
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider pb-2 border-b mb-1 text-left text-primary">
              <BookUser className="size-5 text-primary" /> Aprender por tema
            </div>

            {/* Bloco Ouvir Todos os Temas */}
            <div className="rounded-xl border p-3 bg-amber-500/10 border-amber-500/30 my-1 shrink-0 text-left">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide"><Volume2 className="size-4 shrink-0" /> Ouvir Temas (Autoplay)</div>
                  <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground leading-normal">Reproduz a explicação em áudio de todos os temas na sequência.</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (ouvirTudoTemas) {
                      pararAudio();
                    } else {
                      ouvirTudoTemasRef.current = true;
                      setOuvirTudoTemas(true);
                      const firstT = TEMAS_AJUDA[0];
                      setTemaId(firstT.id);
                      setTela('tema');
                      const audioUrl = firstT.audioUrlExperiente;
                      const texto = firstT.experiente;
                      setTimeout(() => {
                        alternarAudio(texto, audioUrl);
                      }, 100);
                    }
                  }}
                  className="gap-1.5 h-8 font-semibold text-xs px-2.5 transition-colors border-amber-500/40 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 shrink-0"
                >
                  {ouvirTudoTemas ? (
                    <><Pause className="size-3 text-amber-500 fill-amber-500" /> Parar</>
                  ) : (
                    <><Play className="size-3 text-amber-500 fill-amber-500" /> Iniciar</>
                  )}
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
              {TEMAS_AJUDA.map((t) => (
                <button key={t.id} type="button" onClick={() => { setTemaId(t.id); setTela('tema'); }}
                  className="flex w-full items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 p-2.5 text-left text-xs font-bold uppercase tracking-wide hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors text-foreground">
                  {t.titulo} <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between border-t pt-3.5 mt-2">
              <Button variant="ghost" size="sm" className="font-bold text-xs" onClick={() => setTela('menu')}>Voltar ao menu</Button>
              <Button size="sm" variant="outline" className="font-bold text-xs" onClick={() => onOpenChange(false)}>Fechar</Button>
            </div>
          </>
        )}

        {tela === 'tema' && tema && (
          <>
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider pb-2 border-b mb-1 text-left text-primary">
              <BookUser className="size-5 text-primary" /> {tema.titulo}
            </div>
            {audioControls(tema.experiente, tema.audioUrlExperiente)}
            <p className="min-h-0 flex-1 overflow-y-auto pr-1 text-xs font-semibold leading-relaxed text-muted-foreground text-left whitespace-pre-line">
              {tema.experiente}
            </p>
            <div className="flex items-center justify-between border-t pt-3.5 mt-2">
              <Button variant="ghost" size="sm" className="font-bold text-xs" onClick={() => setTela('temas')}><ChevronLeft className="size-4" /> Todos os temas</Button>
              <Button size="sm" variant="outline" className="font-bold text-xs" onClick={() => onOpenChange(false)}>Fechar</Button>
            </div>
          </>
        )}
        <audio
          ref={audioRef}
          preload="auto"
          onPlaying={() => {
            // Confirmou que o arquivo existe e está tocando de verdade: cancela o fallback.
            cancelarWatchdog();
            setFalando(true);
            setPausado(false);
          }}
          onEnded={() => {
            cancelarWatchdog();
            setFalando(false);
            setPausado(false);
            if (ouvirTudoRef.current) {
              avancarPassoAutoplay();
            } else if (ouvirTudoTemasRef.current) {
              avancarTemaAutoplay();
            }
          }}
          onError={() => {
            console.warn('Erro ao carregar o áudio gravado.');
            cancelarWatchdog();
            const txt = ultimoTextoRef.current;
            if (txt && txt.trim()) {
              setTipoAudio('tts');
              falarTexto(txt);
            } else {
              setFalando(false);
              setPausado(false);
            }
          }}
        />
      </div>
    </div>
  );
}
