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

  const marca = 'SOUZA CAD';

  return (
    <div className="pointer-events-auto fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#0a1f14]">
      {/* Barras decorativas de fundo em dois tons de verde, varrendo devagar — clima de
          "apresentação do software" atrás da moldura */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute left-[-20%] top-[16%] h-1.5 w-[70%] rounded-full bg-emerald-700/40" style={{ animation: 'introFundoBarra 7s ease-in-out infinite alternate' }} />
        <div className="absolute left-[-10%] top-[16%] mt-3 h-1 w-[45%] rounded-full bg-emerald-400/30" style={{ animation: 'introFundoBarra 9s ease-in-out infinite alternate-reverse' }} />
        <div className="absolute right-[-20%] bottom-[14%] h-1.5 w-[70%] rounded-full bg-emerald-700/40" style={{ animation: 'introFundoBarra 8s ease-in-out infinite alternate-reverse' }} />
        <div className="absolute right-[-10%] bottom-[14%] mb-3 h-1 w-[45%] rounded-full bg-emerald-400/30" style={{ animation: 'introFundoBarra 6s ease-in-out infinite alternate' }} />
      </div>

      <div className="relative z-10 w-[min(90vw,960px)]">
        {/* Moldura do vídeo: cantos arredondados, borda e brilho verdes — sem zoom no vídeo */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-400/30 bg-black shadow-[0_0_90px_rgba(16,185,129,0.28)]">
          {/* Cobertura que some quando o vídeo realmente começa a rodar */}
          {!tocando && <div className="absolute inset-0 z-10 bg-[#0a1f14]" />}
          <video
            ref={videoRef}
            src="/marca/intro.mp4"
            className="aspect-video w-full object-cover transition-opacity duration-150"
            style={{ opacity: tocando ? 1 : 0 }}
            autoPlay
            playsInline
            preload="auto"
            onPlaying={() => setTocando(true)}
            onEnded={fechar}
          />

          {/* Tarja de marca na base (largura inteira): rodapé profissional com o logo. A altura em
              porcentagem é dimensionada pra cobrir a marca d'água de IA, que fica logo acima da
              base do vídeo; o min-h garante espaço pro logo em telas pequenas. */}
          <div className="absolute bottom-0 left-0 right-0 z-[5] h-[22%] min-h-[64px] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-700" />
            <div className="absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-emerald-400/25" style={{ animation: 'introBarraVarre 3.8s linear infinite' }} />
            <div className="absolute inset-x-0 top-0 h-[3px] bg-emerald-400" />

            {/* Logo se formando: compasso gira pra dentro, letras surgem uma a uma,
                linha clara cresce por baixo */}
            <div className="absolute inset-0 flex items-center justify-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/marca/icone.png" alt="" className="size-8 rounded-md object-contain sm:size-9" style={{ animation: 'introIcone .7s ease-out both' }} />
              <div className="flex flex-col">
                <div className="flex">
                  {marca.split('').map((letra, i) => (
                    <span
                      key={i}
                      className="inline-block text-base font-black tracking-[0.18em] text-white sm:text-lg"
                      style={{ animation: `introLetra .5s ease-out both`, animationDelay: `${0.25 + i * 0.09}s` }}
                    >
                      {letra === ' ' ? ' ' : letra}
                    </span>
                  ))}
                </div>
                <div className="h-[2px] bg-emerald-300" style={{ animation: 'introLinha 1.2s ease-out .4s both' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Botões abaixo da moldura */}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={alternarSom}
            className="flex h-9 items-center justify-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 text-xs font-semibold text-white/90 backdrop-blur transition-colors hover:bg-white/20"
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

      <style>{`
        @keyframes introFundoBarra { from { transform: translateX(-12%); } to { transform: translateX(12%); } }
        @keyframes introBarraVarre { from { transform: translateX(-120%) skewX(-12deg); } to { transform: translateX(420%) skewX(-12deg); } }
        @keyframes introLetra { from { opacity: 0; transform: translateY(10px) scale(.7); filter: blur(4px); } to { opacity: 1; transform: none; filter: none; } }
        @keyframes introIcone { from { opacity: 0; transform: translateX(-18px) rotate(-120deg) scale(.6); } to { opacity: 1; transform: none; } }
        @keyframes introLinha { from { width: 0%; } to { width: 100%; } }
      `}</style>
    </div>
  );
}
