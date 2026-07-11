import { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft, ChevronRight, CircleCheck, MessageCircle, GraduationCap,
  Sparkles, Play, Pause, Square, BookUser,
} from 'lucide-react';
import { carregarWhatsappSuporte, linkWhatsapp } from '@/lib/store/suporte';
import { TEMAS_AJUDA } from '@/lib/ajuda/temas';
import { PASSOS_BASE, PASSOS_AVANCADOS } from '@/lib/ajuda/passos';
import { carregarPreferencias, salvarModo, salvarNivelExperiencia } from '@/lib/store/preferencias';
import { prepararTextoParaFala, dividirEmFrases, melhorVozPt } from '@/lib/ajuda/voz';

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
  const [nivel, setNivel] = useState<'iniciante' | 'experiente'>('iniciante');
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

  function pararAudio() {
    audioSessaoRef.current += 1;
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

  async function falarTexto(texto: string) {
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
            {audioControls(
              nivel === 'iniciante' ? tema.iniciante : tema.experiente,
              nivel === 'iniciante' ? tema.audioUrlIniciante : tema.audioUrlExperiente,
            )}
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
