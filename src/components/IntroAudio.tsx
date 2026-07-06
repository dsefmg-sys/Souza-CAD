'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, X } from 'lucide-react';

/**
 * Botão flutuante de áudio de introdução (canto superior direito).
 * - O arquivo padrão é /introducao.mp3 (estático em /public).
 * - Admins podem salvar um arquivo alternativo no IndexedDB (chave: 'intro_audio_blob').
 * - O admin pode atualizar o arquivo via ConfiguracoesModal (evento 'souzacad:intro-audio-updated').
 */

const IDB_KEY = 'intro_audio_blob';
const IDB_STORE = 'intro_audio';
const IDB_DB = 'metrica_audio';
const DEFAULT_SRC = '/introducao.mp3';

async function lerAudioIdb(): Promise<string | null> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') return null;
  try {
    const db = await new Promise<IDBDatabase>((res, rej) => {
      const req = indexedDB.open(IDB_DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    return await new Promise<string | null>((res, rej) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => res(req.result ?? null);
      req.onerror = () => rej(req.error);
    });
  } catch {
    return null;
  }
}

export async function salvarAudioIntroIdb(dataUrl: string): Promise<void> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') return;
  const db = await new Promise<IDBDatabase>((res, rej) => {
    const req = indexedDB.open(IDB_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(dataUrl, IDB_KEY);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
  window.dispatchEvent(new CustomEvent('souzacad:intro-audio-updated'));
}

export async function removerAudioIntroIdb(): Promise<void> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') return;
  const db = await new Promise<IDBDatabase>((res, rej) => {
    const req = indexedDB.open(IDB_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(IDB_KEY);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
  window.dispatchEvent(new CustomEvent('souzacad:intro-audio-updated'));
}

/**
 * Player mini ("pill") genérico, pra viver dentro da barra flutuante ao lado da chave
 * Fácil/Completo. Cada pill toca um áudio e mostra um rótulo curto pra distinguir.
 */
export function AudioPill({ src, rotulo, titulo }: { src: string; rotulo: string; titulo: string }) {
  const [tocando, setTocando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const a = new Audio(src);
    a.preload = 'metadata';
    audioRef.current = a;
    // O estado segue os EVENTOS do elemento — assim pausa externa (tecla de mídia, fone) e
    // falha de play (arquivo ausente, autoplay bloqueado) não deixam o ícone mentindo.
    const onPlay = () => setTocando(true);
    const onPause = () => setTocando(false);
    const onTime = () => { if (a.duration) setProgresso(a.currentTime / a.duration); };
    const onEnd = () => { setProgresso(0); a.currentTime = 0; };
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('ended', onEnd);
    return () => {
      a.pause();
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('ended', onEnd);
      a.removeAttribute('src'); a.load(); // libera o player de mídia do navegador
      audioRef.current = null;
      setTocando(false); setProgresso(0);
    };
  }, [src]);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    a.currentTime = ratio * a.duration;
    setProgresso(ratio);
  }

  return (
    <div className="flex items-center gap-1 rounded-full border bg-background/95 pl-1.5 pr-1 py-0.5 shadow-xl" title={titulo}>
      <Volume2 className="size-3 text-muted-foreground shrink-0" />
      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground select-none shrink-0">{rotulo}</span>
      {/* barra de progresso minúscula — clicável pra retomar de onde parou */}
      <div className="relative h-1 w-10 cursor-pointer rounded-full bg-border overflow-hidden shrink-0" onClick={seek} title="Clique para avançar">
        <div className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all duration-150" style={{ width: `${progresso * 100}%` }} />
      </div>
      <button
        onClick={toggle}
        className={`flex size-5 shrink-0 items-center justify-center rounded-full transition-all ${tocando ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
        title={tocando ? 'Pausar' : titulo}
      >
        {tocando ? <Pause className="size-2.5" /> : <Play className="size-2.5 translate-x-px" />}
      </button>
    </div>
  );
}

/** Pill da introdução: toca o áudio salvo pelo admin no IndexedDB ou o padrão /introducao.mp3. */
export function IntroAudioPill() {
  const [src, setSrc] = useState<string>(DEFAULT_SRC);
  useEffect(() => {
    let vivo = true;
    const carregar = () => { lerAudioIdb().then((salvo) => { if (vivo) setSrc(salvo ?? DEFAULT_SRC); }); };
    carregar();
    window.addEventListener('souzacad:intro-audio-updated', carregar);
    return () => { vivo = false; window.removeEventListener('souzacad:intro-audio-updated', carregar); };
  }, []);
  return <AudioPill src={src} rotulo="INTRODUÇÃO" titulo="Áudio de introdução ao sistema" />;
}

/** Pill do tutorial: toca /tutorial.mp3 (estático em /public). */
export function TutorialAudioPill() {
  return <AudioPill src="/tutorial.mp3" rotulo="TUTORIAL" titulo="Áudio tutorial: como usar o sistema" />;
}

export default function IntroAudio() {
  const [src, setSrc] = useState<string>(DEFAULT_SRC);
  const [tocando, setTocando] = useState(false);
  const [mudo, setMudo] = useState(false);
  const [progresso, setProgresso] = useState(0); // 0-1
  const [duracao, setDuracao] = useState(0);
  const [minimizado, setMinimizado] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const carregarSrc = useCallback(async () => {
    const salvo = await lerAudioIdb();
    setSrc(salvo ?? DEFAULT_SRC);
  }, []);

  useEffect(() => {
    carregarSrc();
    const onUpdate = () => carregarSrc();
    window.addEventListener('souzacad:intro-audio-updated', onUpdate);
    return () => window.removeEventListener('souzacad:intro-audio-updated', onUpdate);
  }, [carregarSrc]);

  // Sincroniza o elemento <audio> quando o src muda
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = src;
    audio.load();
    setTocando(false);
    setProgresso(0);
    setDuracao(0);
  }, [src]);

  function togglePlay() {
    const a = audioRef.current;
    if (!a) return;
    if (tocando) {
      a.pause();
      setTocando(false);
    } else {
      a.play().catch(() => {});
      setTocando(true);
    }
  }

  function toggleMudo() {
    const a = audioRef.current;
    if (!a) return;
    const novo = !mudo;
    a.muted = novo;
    setMudo(novo);
  }

  function handleTimeUpdate() {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    setProgresso(a.currentTime / a.duration);
  }

  function handleLoadedMetadata() {
    const a = audioRef.current;
    if (!a) return;
    setDuracao(a.duration);
  }

  function handleEnded() {
    setTocando(false);
    setProgresso(0);
    const a = audioRef.current;
    if (a) a.currentTime = 0;
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const a = audioRef.current;
    if (!a || !duracao) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    a.currentTime = ratio * duracao;
    setProgresso(ratio);
  }

  const minutos = Math.floor((duracao * progresso) / 60);
  const segundos = Math.floor((duracao * progresso) % 60);
  const tempoStr = duracao > 0 ? `${minutos}:${String(segundos).padStart(2, '0')}` : '';

  return (
    <>
      {/* Elemento de áudio oculto */}
      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={() => setTocando(true)}
        onPause={() => setTocando(false)}
      />

      {/* Player flutuante no canto superior direito */}
      <div
        className={`
          no-print fixed top-3 right-3 z-[1200]
          flex items-center gap-2
          rounded-2xl border border-border/60
          bg-background/95 backdrop-blur shadow-xl
          transition-all duration-300
          ${minimizado ? 'w-11 h-11 overflow-hidden justify-center' : 'px-3 py-2'}
        `}
        title={minimizado ? 'Abrir player de introdução' : undefined}
      >
        {minimizado ? (
          /* Bolinha quando minimizado */
          <button
            onClick={() => setMinimizado(false)}
            className="flex size-full items-center justify-center text-primary hover:text-primary/80 transition-colors"
            title="Abrir player de áudio de introdução"
          >
            <Volume2 className="size-5" />
          </button>
        ) : (
          <>
            {/* Botão minimizar */}
            <button
              onClick={() => setMinimizado(true)}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              title="Minimizar"
            >
              <X className="size-3.5" />
            </button>

            {/* Label */}
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground shrink-0 select-none">
              Introdução
            </span>

            {/* Barra de progresso clicável */}
            <div
              className="relative h-1.5 w-24 cursor-pointer rounded-full bg-border overflow-hidden shrink-0"
              onClick={handleSeek}
              title="Clique para avançar"
            >
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all duration-150"
                style={{ width: `${progresso * 100}%` }}
              />
            </div>

            {/* Tempo atual */}
            {tempoStr && (
              <span className="text-[10px] tabular-nums text-muted-foreground shrink-0 select-none">
                {tempoStr}
              </span>
            )}

            {/* Botão mudo */}
            <button
              onClick={toggleMudo}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              title={mudo ? 'Ativar som' : 'Silenciar'}
            >
              {mudo ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>

            {/* Botão play/pause */}
            <button
              onClick={togglePlay}
              className={`
                flex size-8 shrink-0 items-center justify-center rounded-full
                transition-all duration-150
                ${tocando
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-primary/10 text-primary hover:bg-primary/20'
                }
              `}
              title={tocando ? 'Pausar introdução' : 'Ouvir introdução do sistema'}
            >
              {tocando
                ? <Pause className="size-4" />
                : <Play className="size-4 translate-x-px" />
              }
            </button>
          </>
        )}
      </div>
    </>
  );
}
