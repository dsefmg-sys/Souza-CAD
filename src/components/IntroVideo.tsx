'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, SkipForward } from 'lucide-react';
import { carregarPreferencias } from '@/lib/store/preferencias';

/**
 * Abertura do app (splash animado). Toca /marca/intro.mp4 por cima de tudo.
 *
 * Regras de exibição:
 *  - Aparece TODA vez que o app carrega, desde que a preferência esteja ligada.
 *  - Começa MUDO — navegador só deixa um vídeo tocar sozinho sem som; há um botão pra ligar o som.
 *  - "Pular" fecha na hora; quando o vídeo acaba, fecha sozinho.
 *  - As Configurações podem mandar rever a qualquer momento pelo evento 'souzacad:ver-intro'.
 */
export default function IntroVideo() {
  const [aberto, setAberto] = useState(() => {
    if (typeof window === 'undefined') return false;
    return carregarPreferencias().introVideoAtiva;
  });
  const [comSom, setComSom] = useState(() => {
    if (typeof window === 'undefined') return true;
    const salva = localStorage.getItem('metrica:intro_video_muted');
    return salva ? salva === 'false' : true; // por padrão com áudio ativado
  });
  const [tocando, setTocando] = useState(false); // só revela o vídeo quando ele já está rodando
  const videoRef = useRef<HTMLVideoElement>(null);

  // Fica ouvindo o pedido de rever (botão nas Configurações).
  useEffect(() => {
    const rever = () => {
      const salva = localStorage.getItem('metrica:intro_video_muted');
      setComSom(salva ? salva === 'false' : true);
      setTocando(false);
      setAberto(true);
    };
    window.addEventListener('souzacad:ver-intro', rever);
    return () => window.removeEventListener('souzacad:ver-intro', rever);
  }, []);

  // Ao abrir, tenta dar play (com áudio ativado por padrão; se o navegador bloquear, tenta mudo).
  useEffect(() => {
    if (aberto && videoRef.current) {
      const v = videoRef.current;
      v.muted = !comSom;
      v.play().catch(() => {
        // Fallback: se o navegador proibir autoplay com áudio, inicia mutado
        v.muted = true;
        setComSom(false);
        v.play().catch(() => {});
      });
    }
  }, [aberto, comSom]);

  // Avisa o resto do app quando a abertura está na tela.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('souzacad:intro', { detail: aberto }));
  }, [aberto]);

  function fechar() {
    setAberto(false);
    setTocando(false);
  }

  function alternarSom() {
    const v = videoRef.current;
    if (!v) return;
    const novo = !comSom;
    v.muted = !novo;
    setComSom(novo);
    localStorage.setItem('metrica:intro_video_muted', String(!novo));
    if (novo) v.play().catch(() => {});
  }

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black overflow-hidden">
      {/* Cobertura preta que some quando o vídeo realmente começa a rodar */}
      {!tocando && <div className="absolute inset-0 z-10 bg-black" />}
      <video
        ref={videoRef}
        src="/marca/intro.mp4"
        className="h-full w-full object-cover transition-opacity duration-150 scale-[1.15] origin-top-left"
        style={{ opacity: tocando ? 1 : 0 }}
        autoPlay
        playsInline
        preload="auto"
        onPlaying={() => setTocando(true)}
        onEnded={fechar}
      />
      {/* Sombra horizontal na base inteira para contraste dos botões */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-[1] h-24 bg-gradient-to-t from-black/85 via-black/40 to-transparent"
      />
      
      {/* Botões agrupados no canto inferior direito */}
      <div className="absolute bottom-5 right-5 z-20 flex items-center gap-2">
        <button
          onClick={alternarSom}
          className="flex h-9 items-center justify-center gap-1.5 rounded-full bg-white/10 px-3 text-xs font-semibold text-white/90 backdrop-blur transition-colors hover:bg-white/20 border border-white/20"
          title={comSom ? 'Desativar áudio (Sem som)' : 'Ativar áudio (Ligar o som)'}
        >
          {comSom ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
          {comSom ? 'Áudio Ativado' : 'Áudio Desativado'}
        </button>
        <button
          onClick={fechar}
          className="flex h-9 items-center gap-1.5 rounded-full bg-white/90 px-4 text-xs font-bold text-black shadow-lg transition-colors hover:bg-white"
        >
          Pular introdução <SkipForward className="size-4" />
        </button>
      </div>
    </div>
  );
}
