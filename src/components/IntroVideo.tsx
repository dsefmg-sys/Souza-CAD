'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, SkipForward } from 'lucide-react';
import { carregarPreferencias } from '@/lib/store/preferencias';
import { introJaVista, marcarIntroVista } from '@/lib/store/settings';

/**
 * Abertura do app (splash animado). Toca /marca/intro.mp4 por cima de tudo.
 *
 * Regras de exibição:
 *  - Aparece sozinho só na PRIMEIRA vez neste navegador, e só se a preferência estiver ligada.
 *  - Começa MUDO — navegador só deixa um vídeo tocar sozinho sem som; há um botão pra ligar o som.
 *  - "Pular" fecha na hora; quando o vídeo acaba, fecha sozinho.
 *  - As Configurações podem mandar rever a qualquer momento pelo evento 'souzacad:ver-intro'.
 */
export default function IntroVideo() {
  const [aberto, setAberto] = useState(false);
  const [comSom, setComSom] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Decide na montagem: primeira vez + preferência ligada. E fica ouvindo o pedido de rever.
  useEffect(() => {
    if (carregarPreferencias().introVideoAtiva && !introJaVista()) setAberto(true);
    const rever = () => { setComSom(false); setAberto(true); };
    window.addEventListener('souzacad:ver-intro', rever);
    return () => window.removeEventListener('souzacad:ver-intro', rever);
  }, []);

  // Ao abrir, tenta dar play (mudo garante o autoplay em qualquer navegador).
  useEffect(() => {
    if (aberto && videoRef.current) videoRef.current.play().catch(() => {});
  }, [aberto]);

  function fechar() {
    marcarIntroVista();
    setAberto(false);
  }

  function alternarSom() {
    const v = videoRef.current;
    if (!v) return;
    const novo = !comSom;
    v.muted = !novo;
    setComSom(novo);
    if (novo) v.play().catch(() => {});
  }

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black">
      <video
        ref={videoRef}
        src="/marca/intro.mp4"
        className="max-h-full max-w-full"
        autoPlay
        muted
        playsInline
        onEnded={fechar}
      />
      <button
        onClick={alternarSom}
        className="absolute bottom-5 left-5 flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur transition-colors hover:bg-white/20"
        title={comSom ? 'Silenciar' : 'Ligar o som'}
      >
        {comSom ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
        {comSom ? 'Som ligado' : 'Sem som'}
      </button>
      <button
        onClick={fechar}
        className="absolute bottom-5 right-5 flex items-center gap-1.5 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-black shadow-lg transition-colors hover:bg-white"
      >
        Pular introdução <SkipForward className="size-4" />
      </button>
    </div>
  );
}
