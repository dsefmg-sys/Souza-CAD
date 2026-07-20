'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, SkipForward, Share2, Globe } from 'lucide-react';
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
    const jaTocou = sessionStorage.getItem('metrica:intro_tocada_sessao');
    if (jaTocou) return false;
    return carregarPreferencias().introVideoAtiva;
  });
  const [comSom, setComSom] = useState(() => {
    if (typeof window === 'undefined') return true;
    const salva = localStorage.getItem('metrica:intro_video_muted');
    return salva ? salva === 'false' : true; // por padrão com áudio ativado
  });
  const [tocando, setTocando] = useState(false); // só revela o vídeo quando ele já está rodando
  const [copiado, setCopiado] = useState(false); // feedback de cópia do link
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

  // Ao abrir, garante o autoplay: começa SEMPRE mudo (todo navegador libera vídeo mudo). Depois, se
  // a preferência é com som, tenta ligar o áudio — se o navegador barrar, segue mudo com o botão de
  // som. Antes ele tentava tocar com som primeiro, que os navegadores bloqueiam, e às vezes o vídeo
  // nem chegava a rodar.
  useEffect(() => {
    if (!aberto || !videoRef.current) return;
    const v = videoRef.current;
    let cancelado = false;
    try { v.currentTime = 0; } catch {}
    v.muted = true;
    v.play().then(() => {
      if (cancelado) return;
      setTocando(true);
      if (comSom) {
        v.muted = false;
        v.play().catch(() => { v.muted = true; setComSom(false); });
      }
    }).catch(() => { /* falha no play */ });
    return () => { cancelado = true; };
  }, [aberto, comSom]);

  // Avisa o resto do app quando a abertura está na tela.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('souzacad:intro', { detail: aberto }));
  }, [aberto]);

  function fechar() {
    setAberto(false);
    setTocando(false);
    sessionStorage.setItem('metrica:intro_tocada_sessao', 'true');
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
          <video
            ref={videoRef}
            src="/marca/intro.mp4"
            className="aspect-video w-full object-cover"
            muted
            playsInline
            preload="auto"
            onPlay={() => setTocando(true)}
            onEnded={fechar}
            onError={fechar}
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
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2.5">
          
          {/* Compartilhar */}
          <button
            onClick={() => {
              const appUrl = 'https://souzacad--souza-cad.us-east4.hosted.app/';
              const textoWhats = `Estou usando esse sistema, você deveria experimentar: ${appUrl}`;
              if (typeof navigator !== 'undefined') {
                void navigator.clipboard.writeText(appUrl);
                setCopiado(true);
                setTimeout(() => setCopiado(false), 2000);
              }
              if (typeof window !== 'undefined') {
                window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(textoWhats)}`, '_blank');
              }
            }}
            className="relative flex h-9 items-center justify-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/20 px-3.5 text-xs font-semibold text-emerald-300 backdrop-blur transition-colors hover:bg-emerald-500/30 cursor-pointer"
            title="Compartilhar no WhatsApp"
          >
            <Share2 className="size-4" />
            <span>{copiado ? 'Link Copiado!' : 'Compartilhar'}</span>
          </button>

          {/* Site */}
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('souzacad:ver-site'));
              fechar();
            }}
            className="flex h-9 items-center justify-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 text-xs font-semibold text-white/90 backdrop-blur transition-colors hover:bg-white/20"
            title="Ver a história e detalhes do Souza-CAD"
          >
            <Globe className="size-4" />
            <span>Site</span>
          </button>

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
