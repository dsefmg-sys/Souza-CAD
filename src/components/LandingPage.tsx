'use client';

import { useState, useRef, useEffect } from 'react';
import { Shield, Zap, Compass, ArrowRight, Award, FileText, Layers, Settings, FileSpreadsheet, Check, Box, Map, Download, Award as AwardIcon, FileCode, Share2, ChevronDown, Monitor, Smartphone, X } from 'lucide-react';
import type { LandingPageTexts } from '@/lib/store/suporte';
const bp = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '');

interface LandingPageProps {
  onPioneiro: () => void;
  numUsuarios: number;
  texts: LandingPageTexts;
}

function InteractiveImageWindow({ src, alt, onExpand }: { src: string; alt: string; onExpand?: (src: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const resolvedSrc = src.startsWith('/') ? `${bp}${src}` : src;

  return (
    <div
      ref={containerRef}
      className="w-full h-[320px] sm:h-[460px] md:h-[580px] rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-slate-950 relative select-none group"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={resolvedSrc}
        alt={alt}
        style={{
          imageRendering: '-webkit-optimize-contrast',
        }}
        className="w-full h-auto block pointer-events-none filter contrast-[1.02] saturate-[1.02]"
      />

      {onExpand && (
        <button
          type="button"
          onClick={() => onExpand(resolvedSrc)}
          className="absolute top-3 right-3 px-3.5 py-1.5 rounded-full bg-slate-950/90 border border-emerald-500/40 text-[10px] sm:text-xs font-bold text-emerald-300 opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all pointer-events-auto backdrop-blur-md shadow-lg cursor-pointer"
        >
          VER
        </button>
      )}
    </div>
  );
}

export default function LandingPage({ onPioneiro, numUsuarios, texts }: LandingPageProps) {
  const [activeSection, setActiveSection] = useState(0);
  const [modalIndiqueAberto, setModalIndiqueAberto] = useState(false);
  const [textoCopiado, setTextoCopiado] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  const mensagemRecomendacao = `Conheça o Souza-CAD — Software Profissional de Engenharia Topográfica e Georreferenciamento SIGEF / INCRA.

Recursos Principais:
• Geração automática da Planilha ODS oficial do SIGEF
• Requerimentos Cartorários (Retificação, Usucapião, Desmembramento)
• Prancha Oficial com Modelo Digital de Relevo 3D
• Leitura inteligente de documentos por IA

Acesse agora e teste gratuitamente no seu navegador:
https://souzacad--souza-cad.us-east4.hosted.app/`;

  const indicarAmigo = () => {
    setModalIndiqueAberto(true);
  };

  const copiarTextoIndicacao = async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(mensagemRecomendacao);
      setTextoCopiado(true);
      setTimeout(() => setTextoCopiado(false), 3500);
    }
  };

  const compartilharWhatsApp = () => {
    if (typeof window !== 'undefined') {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(mensagemRecomendacao)}`, '_blank');
    }
  };

  const scrollToSec = (idx: number) => {
    const el = document.getElementById(`sec-${idx}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Observa a seção visível para atualizar os pontinhos laterais e gerencia rolada leve no mouse
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            const idx = parseInt(id.replace('sec-', ''), 10);
            if (!isNaN(idx)) setActiveSection(idx);
          }
        });
      },
      { threshold: 0.4 }
    );

    const sections = document.querySelectorAll('.landing-snap-sec');
    sections.forEach((sec) => observer.observe(sec));

    let cooldown = false;
    let timeoutId: NodeJS.Timeout | null = null;

    const handleWheel = (e: WheelEvent) => {
      if (cooldown) return;
      if (Math.abs(e.deltaY) < 10) return; // ignora micro tremores

      // Executa o pulo de seção com uma rolada leve
      if (e.deltaY > 0) {
        setActiveSection((prev) => {
          const next = Math.min(6, prev + 1);
          scrollToSec(next);
          return next;
        });
      } else {
        setActiveSection((prev) => {
          const next = Math.max(0, prev - 1);
          scrollToSec(next);
          return next;
        });
      }

      cooldown = true;
      timeoutId = setTimeout(() => {
        cooldown = false;
      }, 550);
    };

    window.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('wheel', handleWheel);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Escassez de vagas de pioneiros
  let vagasTotais = 100;
  if (numUsuarios >= 100 && numUsuarios < 200) vagasTotais = 200;
  else if (numUsuarios >= 200 && numUsuarios < 500) vagasTotais = 500;
  else if (numUsuarios >= 500) vagasTotais = 1000;

  const vagasRestantes = Math.max(0, vagasTotais - numUsuarios);
  const estaEsgotado = numUsuarios >= 500;

  // Fallbacks de textos
  const titulo = texts.titulo || 'Otimize 5 horas de projeto em apenas 20 minutos.';
  const subtitulo = texts.subtitulo || 'Gere a planilha ODS oficial no padrão SIGEF/INCRA em minutos, memoriais descritivos perimétricos, plantas topográficas completas (A3/A0), requerimentos cartorários, erratas, contratos e recibos numa única plataforma.';
  const historia = texts.historia || 'Depois de anos empreendendo e vivenciando na prática os desafios reais de campo, os altos custos e a baixa performance dos softwares de CAD tradicionais e o preenchimento exaustivo de planilhas, decidi usar meus conhecimentos de programação para desenvolver uma solução definitiva. O Souza-CAD transforma um processo manual e exaustivo em minutos de trabalho inteligente, proporcionando agilidade, autonomia e total segurança técnica para o seu escritório.';
  const autorHistoria = texts.autorHistoria || 'Souza-CAD — Software Profissional de Engenharia Topográfica';
  const itensCheck = texts.itensCheck && texts.itensCheck.length === 4 ? texts.itensCheck : [
    'Georreferenciamento Rural: Memoriais e geração de planilha ODS para SIGEF.',
    'Planialtimetria Precisa: Curvas de nível automáticas a partir de altitude online.',
    'CAR e Lotes Urbanos: Perímetro, confrontações e desenhos prontos em segundos.',
    'Garantia de Segurança: Validações inteligentes que evitam erros no cartório.'
  ];

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      
      {/* Estilos CSS para rolagem inteligente por seção (Scroll Snap) */}
      <style jsx global>{`
        .landing-snap-sec {
          scroll-snap-align: start !important;
          scroll-snap-stop: always !important;
        }
        @keyframes float-subtle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes ambient-glow {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.25; transform: scale(1.05); }
        }
        @keyframes btn-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-float-subtle { animation: float-subtle 7s ease-in-out infinite; }
        .animate-ambient-glow { animation: ambient-glow 10s ease-in-out infinite; }
        .btn-shimmer-effect {
          background-size: 200% 100%;
          background-image: linear-gradient(110deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0) 100%);
        }
        .btn-shimmer-effect:hover { animation: btn-shimmer 2s infinite; }
      `}</style>

      {/* BACKGROUND DE CURVAS DE NÍVEL SVG */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 opacity-15 animate-ambient-glow">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <defs>
            <linearGradient id="topoGradLine" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#059669" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0.08" />
            </linearGradient>
          </defs>
          <path d="M-100 150 C 300 80, 600 350, 1200 180 C 1500 80, 1800 280, 2200 120" fill="none" stroke="url(#topoGradLine)" strokeWidth="1.5" />
          <path d="M-100 350 C 400 250, 700 550, 1300 300 C 1600 200, 1900 450, 2300 300" fill="none" stroke="url(#topoGradLine)" strokeWidth="1.2" />
          <path d="M-100 550 C 250 450, 800 750, 1400 500 C 1700 400, 2000 650, 2400 500" fill="none" stroke="url(#topoGradLine)" strokeWidth="1" />
        </svg>
      </div>

      {/* NAVEGADOR DE SEÇÕES COM PONTINHOS LATERAIS FLUTUANTES */}
      <div className="fixed right-6 top-1/2 -translate-y-1/2 z-50 hidden md:flex flex-col gap-3">
        {[0, 1, 2, 3, 4, 5, 6].map((idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => scrollToSec(idx)}
            title={`Ir para seção ${idx + 1}`}
            className={`size-3 rounded-full transition-all duration-300 cursor-pointer ${
              activeSection === idx
                ? 'bg-emerald-400 scale-125 ring-4 ring-emerald-500/20'
                : 'bg-slate-700 hover:bg-slate-500 hover:scale-110'
            }`}
          />
        ))}
      </div>

      {/* HEADER FIXO NO TOPO */}
      <header className="fixed top-4 left-1/2 -translate-x-1/2 max-w-5xl w-[92%] px-5 py-2.5 flex items-center justify-between z-40 bg-zinc-950/65 dark:bg-zinc-900/65 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl">
        <div className="flex items-center gap-2.5 group cursor-default">
          <div className="p-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 group-hover:border-emerald-400/60 group-hover:bg-emerald-500/20 transition-all duration-300 shadow-md">
            <Compass className="size-4.5 text-emerald-400 group-hover:rotate-45 transition-transform duration-500" />
          </div>
          <div className="text-left">
            <span className="text-base font-black tracking-wide text-white">SOUZA <span className="text-emerald-400">CAD</span></span>
            <span className="block text-[8.5px] font-semibold uppercase tracking-wider text-emerald-400/85">Georreferenciamento</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={indicarAmigo}
            className="group px-3.5 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/90 text-xs font-semibold hover:bg-white/10 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <Share2 className="size-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Indicar a um amigo</span>
          </button>

          <button
            type="button"
            onClick={onPioneiro}
            className="group px-4 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-bold transition-all duration-300 cursor-pointer flex items-center gap-1.5 hover:bg-emerald-500 hover:scale-[1.02] active:scale-[0.98] shadow-md btn-shimmer-effect"
          >
            <Zap className="size-3.5" />
            <span>Pioneiro ({estaEsgotado ? vagasTotais : numUsuarios}/{vagasTotais})</span>
          </button>
        </div>
      </header>

      {/* SEÇÃO 1: HERO & PREVIEW INICIAL */}
      <section id="sec-0" className="landing-snap-sec min-h-screen w-full flex flex-col justify-center items-center relative pt-16 sm:pt-20 pb-8 text-center border-b border-slate-900/60 overflow-hidden">
        {/* VÍDEO DE FUNDO NO INÍCIO (VÍDEO 1) - LARGURA TOTAL 100% */}
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <video
            ref={(el) => { if (el) el.playbackRate = 0.75; }}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover opacity-50 filter contrast-110 brightness-95 saturate-125"
          >
            <source src={`${bp}/marca/video1.mp4`} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/45 to-slate-950" />
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-3.5 w-full relative z-10">
          {/* AVISO RECOMENDAÇÃO MOBILE & PC */}
          <div className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-slate-200 text-xs font-medium max-w-xl mx-auto text-left leading-snug shadow-md backdrop-blur-sm">
            <div className="flex items-center gap-1 shrink-0 text-emerald-400 font-bold">
              <Monitor className="size-4" />
              <Smartphone className="size-4" />
            </div>
            <span>
              <strong className="text-white font-bold">Pronto para PC &amp; Celular:</strong> Crie, edite e processe mapas com poder total no <strong>Computador</strong>; consulte projetos, imóveis e baixe peças técnicas no <strong>Celular</strong> de onde estiver no campo.
            </span>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-black uppercase tracking-wider text-emerald-300 shadow-sm">
            <FileSpreadsheet className="size-3.5 text-emerald-400" />
            <span>Requerimentos Cartorários &amp; Planilha ODS SIGEF em Minutos</span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white leading-[1.1] tracking-tight">
            {titulo}
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-medium max-w-2xl mx-auto">
            {subtitulo}
          </p>

          {/* CONTAINER COM EFEITO DE SOBREPOSIÇÃO E JANELA INTERATIVA (ROLAGEM DO MOUSE SEM DESFOQUE) */}
          <div className="relative w-full max-w-5xl mx-auto mt-2">
            {/* PRIMEIRA IMAGEM (PRINCIPAL COM JANELA INTERATIVA DE ROLAGEM INSTANTÂNEA) */}
            <InteractiveImageWindow
              src="/marca/preview_requerimento.png"
              alt="Requerimentos e Minutas Cartorárias do Souza-CAD"
              onExpand={setLightboxImg}
            />

            {/* SEGUNDA IMAGEM (FLUTUANTE SOBREPOSTA NO CANTO INFERIOR DIREITO - MESMO TAMANHO E ESTILO DAS OUTRAS SEÇÕES) */}
            <div className="absolute -bottom-5 -right-2 sm:-bottom-6 sm:-right-6 z-20 w-44 sm:w-72 rounded-2xl overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.9)] border-2 border-emerald-500/50 bg-slate-950/95 backdrop-blur-md transition-all duration-300 hover:scale-105 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${bp}/marca/preview_requerimento_modal.png`}
                alt="Requerimento ao Cartório e Atos Cumulativos"
                className="w-full h-auto object-contain block"
              />
            </div>
          </div>
        </div>
        <button type="button" onClick={() => scrollToSec(1)} className="absolute bottom-4 animate-bounce text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer z-10">
          <ChevronDown className="size-6" />
        </button>
      </section>

      {/* SEÇÃO 2: GEORREFERENCIAMENTO SIGEF / INCRA */}
      <section id="sec-1" className="landing-snap-sec min-h-screen w-full flex flex-col justify-center items-center relative pt-20 pb-12 text-center border-b border-slate-900/60 overflow-hidden">
        {/* IMAGEM DE FUNDO AMBIENTAL EM ALTA DEFINIÇÃO NA SEÇÃO SIGEF/INCRA (SEC-1) */}
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${bp}/marca/fundo-sigef-campo-hd.jpg`}
            alt=""
            className="w-full h-full object-cover opacity-45 sm:opacity-55 filter contrast-120 saturate-120 brightness-95"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/55 to-slate-950" />
        </div>

        {/* BRILHO AMBIENTAL SUAVE NO CENTRO */}
        <div className="absolute inset-0 pointer-events-none z-[1] flex items-center justify-center">
          <div className="w-[60vw] h-[60vh] bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6 w-full relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-black uppercase tracking-wider text-emerald-400">
            <Award className="size-4" /> Pensado para Georreferenciamento SIGEF / INCRA
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            100% Projetado para Georreferenciamento de Imóveis Rurais SIGEF
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto">
            Geração automática da Planilha ODS oficial para certificação eletrônica, conferência visual de vértices, códigos de limites/métodos e total conformidade com a 3ª edição da norma técnica do INCRA.
          </p>

          <div className="w-full max-w-5xl mx-auto mt-4">
            <InteractiveImageWindow
              src="/marca/preview_sigef.png"
              alt="Conferência da Planilha SIGEF e Geração ODS no Souza-CAD"
              onExpand={setLightboxImg}
            />
          </div>
        </div>
        <button type="button" onClick={() => scrollToSec(2)} className="absolute bottom-4 animate-bounce text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer">
          <ChevronDown className="size-6" />
        </button>
      </section>

      {/* SEÇÃO 3: INTERFACE COMPLETA & RELEVO 3D */}
      <section id="sec-2" className="landing-snap-sec min-h-screen w-full flex flex-col justify-center items-center relative pt-20 pb-12 px-4 sm:px-6 max-w-6xl mx-auto text-center border-b border-slate-900/60">
        <div className="max-w-5xl mx-auto space-y-6 w-full">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-black uppercase tracking-wider text-emerald-400">
            <Box className="size-4" /> Interface Completa &amp; Relevo 3D
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            Modelo Digital de Relevo 3D Integrado à Prancha Oficial
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto">
            Incorpore o Modelo Digital de Relevo 3D com malha TIN wireframe, diagnósticos de altimetria e convenções cartográficas na sua prancha final.
          </p>

          <div className="w-full max-w-5xl mx-auto mt-4">
            <InteractiveImageWindow
              src="/marca/preview_mapa2d.png"
              alt="Interface Completa e Relevo 3D Souza-CAD"
              onExpand={setLightboxImg}
            />
          </div>
        </div>
        <button type="button" onClick={() => scrollToSec(3)} className="absolute bottom-4 animate-bounce text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer">
          <ChevronDown className="size-6" />
        </button>
      </section>

      {/* SEÇÃO 4: HISTÓRIA DO CRIADOR */}
      <section id="sec-3" className="landing-snap-sec min-h-screen w-full flex flex-col justify-center items-center relative pt-20 pb-12 px-4 sm:px-6 max-w-4xl mx-auto text-center border-b border-slate-900/60">
        <div className="w-full space-y-6">
          <div className="group bg-white/5 border border-white/10 p-8 sm:p-12 rounded-3xl text-left space-y-6 backdrop-blur-xl relative overflow-hidden transition-all duration-500 hover:border-emerald-500/45 hover:shadow-emerald-500/5 hover:shadow-2xl shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/10 transition-all duration-700" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <Shield className="size-5 text-emerald-400" /> A história por trás da ferramenta
            </h3>
            <p className="text-base sm:text-xl text-slate-200 leading-relaxed italic">
              &ldquo;{historia}&rdquo;
            </p>
            <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between text-sm text-slate-400 font-medium border-t border-slate-800 gap-2">
              <span className="font-bold text-white">{autorHistoria}</span>
              <span className="text-emerald-400 font-bold">Engenharia &amp; Desenvolvimento</span>
            </div>
          </div>
        </div>
        <button type="button" onClick={() => scrollToSec(4)} className="absolute bottom-4 animate-bounce text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer">
          <ChevronDown className="size-6" />
        </button>
      </section>

      {/* SEÇÃO 5: REQUERIMENTOS & PEÇAS ZIP */}
      <section id="sec-4" className="landing-snap-sec min-h-screen w-full flex flex-col justify-center items-center relative pt-20 pb-12 px-4 sm:px-6 max-w-6xl mx-auto text-center border-b border-slate-900/60">
        <div className="max-w-6xl mx-auto space-y-6 w-full">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-black uppercase tracking-wider text-emerald-400">
            <FileCode className="size-4" /> Cartório &amp; Requerimentos Jurídicos
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            Requerimentos ao Cartório &amp; Download do Pacote ZIP
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto">
            Gere minutas prontas para Retificação, Doação, Usucapião, Desmembramento e a Planta com todas as peças compactadas num único Pacote ZIP.
          </p>

          {/* CONTAINER COM JANELA INTERATIVA (MOVIMENTO DO MOUSE ROLA A PLANTA) E PRIMEIRA IMAGEM FLUTUANTE */}
          <div className="relative w-full max-w-5xl mx-auto mt-4">
            <InteractiveImageWindow
              src="/marca/preview_planta_a3.png"
              alt="Planta Oficial do Imóvel"
              onExpand={setLightboxImg}
            />

            {/* PRIMEIRA IMAGEM (FLUTUANTE COMO DETALHAMENTO SOBREPOSTO - SEM TÍTULO E SEM CORTES) */}
            <div className="absolute -bottom-6 -left-3 sm:-bottom-8 sm:-left-8 z-20 w-48 sm:w-80 rounded-2xl overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.9)] border-2 border-emerald-500/50 bg-slate-950/95 backdrop-blur-md transition-all duration-300 hover:scale-105 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${bp}/marca/preview_pecas.png`}
                alt="Pacote de Peças Técnicas ZIP"
                className="w-full h-auto object-contain block"
              />
            </div>
          </div>
        </div>
        <button type="button" onClick={() => scrollToSec(5)} className="absolute bottom-4 animate-bounce text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer">
          <ChevronDown className="size-6" />
        </button>
      </section>

      {/* SEÇÃO 6: HABILITAÇÃO PROFISSIONAL & MARCA */}
      <section id="sec-5" className="landing-snap-sec min-h-screen w-full flex flex-col justify-center items-center relative pt-20 pb-12 px-4 sm:px-6 max-w-6xl mx-auto text-center border-b border-slate-900/60">
        <div className="max-w-6xl mx-auto space-y-6 w-full">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-black uppercase tracking-wider text-emerald-400">
            <AwardIcon className="size-4" /> CFT, CFTA &amp; CREA + Sua Marca
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            Sua marca em todas as peças técnicas e documentos.
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto">
            Desenvolvida sob medida para profissionais registrados no CRT, CFTA e CREA.
          </p>

          {/* CONTAINER COM IMAGEM PRINCIPAL DE CONFIGURAÇÃO E PRIMEIRA IMAGEM DE CONSELHOS FLUTUANTE SOBREPOSTA À DIREITA */}
          <div className="relative w-full max-w-5xl mx-auto mt-4">
            <InteractiveImageWindow
              src="/marca/preview_config.png"
              alt="Personalização de Marca e Assinatura Digital"
              onExpand={setLightboxImg}
            />

            {/* PRIMEIRA IMAGEM (FLUTUANTE SOBREPOSTA À DIREITA - MESMO TAMANHO E SEM TÍTULO) */}
            <div className="absolute -bottom-6 -right-3 sm:-bottom-8 sm:-right-8 z-20 w-48 sm:w-80 rounded-2xl overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.9)] border-2 border-emerald-500/50 bg-slate-950/95 backdrop-blur-md transition-all duration-300 hover:scale-105 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${bp}/marca/preview_conselhos.png`}
                alt="Habilitação Profissional CFT/CREA"
                className="w-full h-auto object-contain block"
              />
            </div>
          </div>
        </div>
        <button type="button" onClick={() => scrollToSec(6)} className="absolute bottom-4 animate-bounce text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer">
          <ChevronDown className="size-6" />
        </button>
      </section>

      {/* SEÇÃO 7: CREDENCIAMENTO PIONEIRO & CTA FINAL */}
      <section id="sec-6" className="landing-snap-sec min-h-screen w-full flex flex-col justify-between items-center relative pt-20 pb-6 text-center overflow-hidden">
        {/* VÍDEO DE FUNDO NO FINAL (VÍDEO 2) - ALTA VISIBILIDADE 75% */}
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <video
            ref={(el) => { if (el) el.playbackRate = 0.75; }}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover opacity-75 filter contrast-110 brightness-95 saturate-125"
          >
            <source src={`${bp}/marca/video2.mp4`} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950" />
        </div>

        <div className="w-full max-w-3xl px-4 sm:px-6 space-y-6 my-auto relative z-10">
          <div className="bg-zinc-950/70 border border-white/10 p-6 sm:p-10 rounded-3xl shadow-2xl space-y-6 backdrop-blur-2xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4 text-left">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wide flex items-center gap-2">
                  <Award className="size-6 text-emerald-400 animate-float-subtle" />
                  {estaEsgotado ? 'Pioneiros Esgotados' : 'VAGAS DE USUÁRIO PIONEIRO'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">
                  {estaEsgotado 
                    ? 'Vagas de teste encerradas. O Souza-CAD opera via planos profissionais.'
                    : 'Canal direto no WhatsApp do desenvolvedor para sugerir e acelerar melhorias.'}
                </p>
              </div>
              <div className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-center shrink-0">
                <span className="text-xl font-black text-emerald-400 font-mono">{estaEsgotado ? vagasTotais : numUsuarios} / {vagasTotais}</span>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Ativadas</span>
              </div>
            </div>

            {/* BARRA DE VAGAS LIMITADAS */}
            <div className="space-y-3 text-left">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <Zap className="size-3.5 text-amber-400 fill-amber-400" />
                  <span>VAGAS LIMITADAS</span>
                </span>
                <span className="text-emerald-400 font-mono font-black">{estaEsgotado ? 'Plano Comercial Ativado' : `Restam apenas ${vagasRestantes} vagas gratuitas`}</span>
              </div>

              <div className="h-3.5 bg-slate-950 rounded-full overflow-hidden border border-emerald-500/40 p-0.5 shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-300 to-amber-400 rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(16,185,129,0.8)]"
                  style={{ width: `${estaEsgotado ? 100 : Math.min(100, (numUsuarios / vagasTotais) * 100)}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={onPioneiro}
              className={`group relative w-full text-white font-black text-base uppercase py-4 px-6 rounded-2xl transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 shadow-xl btn-shimmer-effect ${
                estaEsgotado ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              <Zap className="size-5" />
              <span>{estaEsgotado ? 'ADQUIRIR PLANO PROFISSIONAL' : 'SER UM USUÁRIO PIONEIRO AGORA'}</span>
              <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-4 border-t border-slate-900/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2 shrink-0 relative z-10">
          <span>&copy; {new Date().getFullYear()} Souza-CAD. Todos os direitos reservados.</span>
          <span>Desenvolvido para alta performance em georreferenciamento.</span>
        </footer>
      </section>

      {/* MODAL CONVIDATIVO: INDIQUE UM AMIGO */}
      {modalIndiqueAberto && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 text-left text-white">
            <button
              type="button"
              onClick={() => setModalIndiqueAberto(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
            >
              <X className="size-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Share2 className="size-6" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-wide">
                  Indique o Souza-CAD
                </h3>
                <p className="text-xs sm:text-sm text-slate-300">
                  Compartilhe com amigos, colegas e grupos de agrimensura no WhatsApp!
                </p>
              </div>
            </div>

            {/* CAIXA DE TEXTO COPIÁVEL ESPAÇOSA E SEM ROLAGEM */}
            <div className="relative rounded-2xl border border-slate-800 bg-slate-950 p-5 font-mono text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap select-all">
              {mensagemRecomendacao}
            </div>

            {/* AÇÕES: COPIAR E ENVIAR NO WHATSAPP */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={copiarTextoIndicacao}
                className="w-full py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                {textoCopiado ? (
                  <>
                    <Check className="size-4 text-emerald-400" />
                    <span className="text-emerald-400">COPIADO COM SUCESSO!</span>
                  </>
                ) : (
                  <>
                    <FileText className="size-4 text-emerald-400" />
                    <span>COPIAR TEXTO</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={compartilharWhatsApp}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg hover:scale-[1.02] active:scale-[0.98]"
              >
                <Zap className="size-4" />
                <span>ABRIR NO WHATSAPP</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LIGHTBOX HD FULLSCREEN */}
      {lightboxImg && (
        <div
          onClick={() => setLightboxImg(null)}
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-200 cursor-zoom-out"
        >
          <button
            type="button"
            onClick={() => setLightboxImg(null)}
            className="absolute top-6 right-6 z-10 px-4 py-2 rounded-2xl bg-slate-900 border border-slate-700 text-white font-bold text-xs hover:border-emerald-400 transition-all cursor-pointer shadow-2xl flex items-center gap-1.5"
          >
            <X className="size-3.5" /> Fechar Imagem (ESC)
          </button>
          <div className="max-w-[95vw] max-h-[92vh] overflow-auto rounded-2xl border border-emerald-500/40 bg-slate-950 shadow-[0_0_80px_rgba(16,185,129,0.3)] p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxImg}
              alt="Visualização HD em Tela Cheia"
              style={{ imageRendering: '-webkit-optimize-contrast' }}
              className="max-w-full h-auto max-h-[88vh] object-contain rounded-xl block mx-auto filter contrast-105"
            />
          </div>
        </div>
      )}

      <style>{`
        @keyframes varreLuzesSigef {
          0% { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(250%) skewX(-12deg); }
        }
      `}</style>

    </div>
  );
}
