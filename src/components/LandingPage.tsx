'use client';

import { useState, useEffect, useRef } from 'react';
import { Shield, Zap, Compass, Users, CheckCircle, Smartphone, ChevronLeft, ChevronRight, Sparkles, ArrowRight, Award, Check, Layers, Eye } from 'lucide-react';
import type { LandingPageTexts } from '@/lib/store/suporte';

interface LandingPageProps {
  onPioneiro: () => void;
  numUsuarios: number;
  texts: LandingPageTexts;
}

interface SlidePreview {
  id: string;
  badge: string;
  titulo: string;
  subtitulo: string;
  imagem: string;
  detalhes: string[];
  estatistica: string;
}

const SLIDES_PREVIEW: SlidePreview[] = [
  {
    id: 'gestao',
    badge: 'Gestão Financeira & Contratos',
    titulo: 'Recibos, Contratos & Declarações com 1 Clique',
    subtitulo: 'Emissão formal em PDF de recibos de quitação, contratos de prestação de serviços, propostas comerciais e declarações cartorárias com dados e assinatura digital preenchidos.',
    imagem: '/marca/preview_gestao.png',
    detalhes: [
      'Recibos formais com numeração sequencial automática',
      'Contratos e propostas de serviço personalizadas',
      'Declarações avulsas de posse, espólio e sobreposição'
    ],
    estatistica: '100% Automatizado'
  },
  {
    id: 'erratas',
    badge: 'Automação Cartorária',
    titulo: 'Gerador de Erratas para Retificação de Área em Word',
    subtitulo: 'Minutas de erratas de retificação de área prontas no formato Word (.docx) com atalhos inteligentes de preenchimento rápido de matrículas e confrontantes.',
    imagem: '/marca/preview_modulos.png',
    detalhes: [
      'Arquivo editável em formato Word (.docx)',
      'Atalhos de inserção de matrícula e proprietários',
      'Aceito em cartórios de registro de imóveis'
    ],
    estatistica: 'Elaboração em 5 Minutos'
  },
  {
    id: 'sigef',
    badge: 'Confrontantes & INCRA',
    titulo: 'Busca Online de Imóveis Vizinhos Certificados',
    subtitulo: 'Cruzamento automático online da malha pública do SIGEF/INCRA para importar vértices vizinhos e eliminar vãos ou sobreposições no perímetro.',
    imagem: '/marca/preview_modulos.png',
    detalhes: [
      'Busca georreferenciada online regional por raio',
      'Validação de vértices e confrontações oficiais',
      'Ajuste fino de coordenadas e vértices virtuais'
    ],
    estatistica: 'Zero Sobreposição'
  },
  {
    id: 'config',
    badge: 'Sua Marca & Identidade',
    titulo: 'Personalização Completa & Assinatura Digital',
    subtitulo: 'Aplicação do seu logotipo no carimbo da planta A3/A0 e assinatura PNG transparente automatizada em todas as peças técnicas.',
    imagem: '/marca/preview_config.png',
    detalhes: [
      'Logotipo no carimbo oficial SVG da prancha',
      'Assinatura digital transparente em PDF/DOCX',
      'Configuração de registros (CFT/CREA/CFTA)'
    ],
    estatistica: 'Marca Própria'
  },
  {
    id: 'topografia',
    badge: 'Desenho Topográfico & Curvas',
    titulo: 'Prancha A3/A0 & Curvas de Nível Automáticas',
    subtitulo: 'Planta oficial com rosa dos ventos, escala gráfica, carimbo e curvas de nível automáticas geradas por busca de altitude online.',
    imagem: '/marca/splash.png',
    detalhes: [
      'Exportação para DXF, KML, Shapefile (SHP) e GPX',
      'Curvas de nível 2D e 3D automáticas',
      'Memorial descritivo no padrão oficial INCRA'
    ],
    estatistica: '5h ➔ 20min'
  }
];

export default function LandingPage({ onPioneiro, numUsuarios, texts }: LandingPageProps) {
  const [slideAtual, setSlideAtual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Escassez de vagas de pioneiros
  let vagasTotais = 50;
  if (numUsuarios >= 50 && numUsuarios < 100) {
    vagasTotais = 100;
  } else if (numUsuarios >= 100 && numUsuarios < 200) {
    vagasTotais = 200;
  } else if (numUsuarios >= 200 && numUsuarios < 500) {
    vagasTotais = 500;
  } else if (numUsuarios >= 500) {
    vagasTotais = 1000;
  }

  const vagasRestantes = Math.max(0, vagasTotais - numUsuarios);
  const estaEsgotado = numUsuarios >= 500;

  // Carrossel sincronizado automático (troca a cada 6s)
  useEffect(() => {
    if (pausado) return;
    timerRef.current = setInterval(() => {
      setSlideAtual((prev) => (prev + 1) % SLIDES_PREVIEW.length);
    }, 6000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pausado]);

  // Fallbacks de textos
  const titulo = texts.titulo || 'Otimize 5 horas de projeto em apenas 20 minutos.';
  const subtitulo = texts.subtitulo || 'Um sistema planialtimétrico e de georreferenciamento de imóveis rurais completo e intuitivo, feito sob medida para as reais necessidades de agrimensores, técnicos e engenheiros brasileiros.';
  const historia = texts.historia || 'Depois de 14 anos empreendendo na área de agrimensura, enfrentando o cansaço de refazer projetos manuais no CAD tradicional e preencher planilhas repetitivas, decidi aprender a programar para criar a ferramenta que eu mesmo precisava para ter liberdade, agilidade e total segurança técnica. O Souza-CAD transforma um processo manual e exaustivo de 5 horas em apenas 20 minutos de trabalho eficiente.';
  const autorHistoria = texts.autorHistoria || 'Agrimensor Programador & Criador do Souza-CAD';
  const itensCheck = texts.itensCheck && texts.itensCheck.length === 4 ? texts.itensCheck : [
    'Georreferenciamento Rural: Memoriais e geração de planilha ODS para SIGEF.',
    'Planialtimetria Precisa: Curvas de nível automáticas a partir de altitude online.',
    'CAR e Lotes Urbanos: Perímetro, confrontações e desenhos prontos em segundos.',
    'Garantia de Segurança: Validações inteligentes que evitam erros no cartório.'
  ];

  const slide = SLIDES_PREVIEW[slideAtual];

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden font-sans select-none selection:bg-emerald-500/30 selection:text-emerald-200 flex flex-col justify-between">
      
      {/* ── BACKGROUND TÉCNICO: CURVAS DE NÍVEL TOPOGRÁFICAS SVG ANIMADAS ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-20">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <defs>
            <linearGradient id="topoGradLine" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#059669" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <path d="M-100 150 C 300 80, 600 350, 1200 180 C 1500 80, 1800 280, 2200 120" fill="none" stroke="url(#topoGradLine)" strokeWidth="1.5" className="animate-pulse" style={{ animationDuration: '7s' }} />
          <path d="M-100 300 C 400 200, 700 500, 1300 250 C 1600 150, 1900 400, 2300 250" fill="none" stroke="url(#topoGradLine)" strokeWidth="1.2" className="animate-pulse" style={{ animationDuration: '9s' }} />
          <path d="M-100 450 C 250 350, 800 650, 1400 400 C 1700 300, 2000 550, 2400 400" fill="none" stroke="url(#topoGradLine)" strokeWidth="1" className="animate-pulse" style={{ animationDuration: '11s' }} />
          <path d="M-100 600 C 500 500, 900 800, 1500 550 C 1800 450, 2100 700, 2500 550" fill="none" stroke="url(#topoGradLine)" strokeWidth="0.8" />
        </svg>
      </div>

      {/* ── BANNER PARA CELULAR (Uso complementar no mobile) ── */}
      <div className="block md:hidden bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center z-30 relative">
        <div className="flex items-center justify-center gap-2 text-xs font-bold text-amber-400">
          <Smartphone className="size-4 animate-bounce shrink-0" />
          <span>Uso no celular é auxiliar/consulta em campo.</span>
        </div>
        <p className="text-[10px] text-amber-500/80 mt-0.5 leading-snug">
          Para trabalho profissional e elaboração de desenhos e peças técnicas, utilize a versão completa no seu Computador/PC.
        </p>
      </div>

      {/* ── HEADER CLEAN ── */}
      <header className="max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between z-30 relative shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <Compass className="size-6 text-emerald-400 animate-spin" style={{ animationDuration: '60s' }} />
          </div>
          <div>
            <span className="text-xl font-black tracking-widest text-white font-mono">SOUZA <span className="text-emerald-400">CAD</span></span>
            <span className="block text-[9px] font-bold uppercase tracking-wider text-emerald-400">Engenharia & Georreferenciamento</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onPioneiro}
            className="px-4 py-2 rounded-xl bg-emerald-400 text-slate-950 text-xs font-black transition-all cursor-pointer flex items-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.4)] hover:bg-emerald-300 hover:scale-105 active:scale-95 uppercase tracking-wider"
          >
            <Zap className="size-3.5 fill-slate-950" />
            <span>Acessar Plataforma</span>
          </button>
        </div>
      </header>

      {/* ── HERO IMPRESSIONANTE EM DUAS COLUNAS: TEXTO NA ESQUERDA + IMAGEM ENORME 100% VISÍVEL E LIMPÍSSIMA NA DIREITA ── */}
      <main className="relative flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 md:py-8 z-10 space-y-12">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start w-full">
          
          {/* 👈 COLUNA DA ESQUERDA (LG:COL-SPAN-6): TÍTULO, SUBTÍTULO, VAGAS E HISTÓRIA DO CRIADOR */}
          <div className="lg:col-span-6 space-y-6 text-left">
            
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-xs font-black uppercase tracking-wider text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
              <Zap className="size-3.5" /> Criado por Agrimensor para Agrimensores
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white leading-[1.1] tracking-tight drop-shadow-md">
              {titulo}
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-medium">
              {subtitulo}
            </p>

            {/* 🎯 CAIXA DE ESCASSEZ & VAGAS DE PIONEIRO */}
            <div className="bg-slate-900/90 border border-emerald-500/30 p-5 rounded-3xl shadow-[0_0_40px_rgba(16,185,129,0.12)] space-y-4 backdrop-blur-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                <div>
                  <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wide flex items-center gap-2">
                    <Award className="size-4 text-emerald-400" />
                    {estaEsgotado ? 'Pioneiros Esgotados' : 'VAGAS DE USUÁRIO PIONEIRO'}
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {estaEsgotado 
                      ? 'Vagas de teste encerradas. Plano comercial ativo.'
                      : 'Garanta seu credenciamento pioneiro e dite o futuro da plataforma.'
                    }
                  </p>
                </div>

                <div className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-center shrink-0">
                  <span className="text-sm font-black text-emerald-400 font-mono">{estaEsgotado ? vagasTotais : numUsuarios} / {vagasTotais}</span>
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Vagas</span>
                </div>
              </div>

              {/* Barra de Progresso Neon */}
              <div className="space-y-1">
                <div className="h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(16,185,129,0.6)]"
                    style={{ width: `${estaEsgotado ? 100 : Math.min(100, (numUsuarios / vagasTotais) * 100)}%` }}
                  />
                </div>
                <div className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider flex items-center justify-between">
                  <span>{estaEsgotado ? 'Plano Comercial Ativado' : `Restam apenas ${vagasRestantes} vagas gratuitas`}</span>
                  <span className="animate-pulse">Acesso Imediato</span>
                </div>
              </div>

              {/* Botão CTA Principal */}
              <button
                type="button"
                onClick={onPioneiro}
                className={`w-full text-slate-950 font-black text-sm uppercase py-4 px-6 rounded-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 ${
                  estaEsgotado
                    ? 'bg-amber-500 hover:bg-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.4)]'
                    : 'bg-emerald-400 hover:bg-emerald-300 shadow-[0_0_35px_rgba(16,185,129,0.45)]'
                }`}
              >
                <Zap className="size-4 fill-slate-950" />
                <span>{estaEsgotado ? 'ADQUIRIR PLANO PROFISSIONAL' : 'SER UM USUÁRIO PIONEIRO'}</span>
                <ArrowRight className="size-4" />
              </button>
            </div>

            {/* 📋 HISTÓRIA DO CRIADOR */}
            <div className="bg-slate-900/70 border border-slate-800/80 p-5 rounded-2xl space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Shield className="size-4" /> A história por trás da ferramenta
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                &ldquo;{historia}&rdquo;
              </p>
              <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                <span>— {autorHistoria}</span>
                <span className="text-emerald-400 font-bold">14 Anos de Prática</span>
              </div>
            </div>

          </div>

          {/* 👉 COLUNA DA DIREITA (LG:COL-SPAN-6): A IMAGEM ENORME E 100% VISÍVEL / NÍTIDA + ABAS E TEXTO SINCRONIZADO ABAIXO */}
          <div 
            className="lg:col-span-6 space-y-4 sticky top-6"
            onMouseEnter={() => setPausado(true)}
            onMouseLeave={() => setPausado(false)}
          >
            {/* Seletor de Abas de Módulos */}
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {SLIDES_PREVIEW.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSlideAtual(idx)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border cursor-pointer ${
                    slideAtual === idx
                      ? 'bg-emerald-400 text-slate-950 border-emerald-300 font-black shadow-[0_0_15px_rgba(16,185,129,0.3)] scale-105'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s.badge}
                </button>
              ))}
            </div>

            {/* CONTAINER DA IMAGEM GIGANTE (NÍTIDA, OPACITY-100, SEM NENHUM TEXTO COBRINDO) */}
            <div className="relative rounded-3xl border border-emerald-500/30 bg-slate-900/90 p-3 shadow-[0_0_90px_rgba(16,185,129,0.2)] backdrop-blur-xl overflow-hidden group">
              
              {/* Header estilo Janela CAD */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 mb-2">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-rose-500/80 inline-block" />
                  <span className="size-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="size-3 rounded-full bg-emerald-500/80 inline-block" />
                  <span className="ml-1 text-xs font-bold text-slate-200">{slide.titulo}</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                  {slide.badge}
                </span>
              </div>

              {/* A IMAGEM TOTALMENTE VISÍVEL E NÍTIDA */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center min-h-[380px] max-h-[520px]">
                
                {/* Botão Anterior */}
                <button
                  type="button"
                  onClick={() => setSlideAtual((prev) => (prev - 1 + SLIDES_PREVIEW.length) % SLIDES_PREVIEW.length)}
                  className="absolute left-3 z-20 p-2.5 rounded-full bg-slate-950/80 text-white border border-slate-800 hover:bg-emerald-400 hover:text-slate-950 transition-all shadow-2xl hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-md"
                  title="Anterior"
                >
                  <ChevronLeft className="size-5" />
                </button>

                {/* Botão Próximo */}
                <button
                  type="button"
                  onClick={() => setSlideAtual((prev) => (prev + 1) % SLIDES_PREVIEW.length)}
                  className="absolute right-3 z-20 p-2.5 rounded-full bg-slate-950/80 text-white border border-slate-800 hover:bg-emerald-400 hover:text-slate-950 transition-all shadow-2xl hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-md"
                  title="Próximo"
                >
                  <ChevronRight className="size-5" />
                </button>

                {/* IMAGEM SUPER NÍTIDA E SEM NENHUM CARD BLOQUEANDO */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={slide.id}
                  src={slide.imagem}
                  alt={slide.titulo}
                  className="w-full h-auto object-contain max-h-[500px] opacity-100 transition-all duration-500 transform animate-in fade-in zoom-in-95 group-hover:scale-[1.01]"
                />
              </div>

              {/* 📜 LEGENDA EXPLICATIVA ABAIXO DA IMAGEM (SINCRONIZADA COM A IMAGEM EXIBIDA) */}
              <div className="mt-3 p-4 bg-slate-950/80 rounded-2xl border border-slate-850 space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-emerald-400" />
                    {slide.titulo}
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">
                    {slideAtual + 1} / {SLIDES_PREVIEW.length}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  {slide.subtitulo}
                </p>

                {/* Pontos Chave em Check */}
                <div className="space-y-1 pt-2 border-t border-slate-850">
                  {slide.detalhes.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-200 font-medium">
                      <Check className="size-3.5 text-emerald-400 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                {/* Indicadores Dots */}
                <div className="pt-3 flex items-center justify-center gap-1.5">
                  {SLIDES_PREVIEW.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSlideAtual(idx)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        slideAtual === idx ? 'w-8 bg-emerald-400' : 'w-2 bg-slate-800 hover:bg-slate-700'
                      }`}
                      title={`Ir para slide ${idx + 1}`}
                    />
                  ))}
                </div>

              </div>

            </div>

          </div>

        </div>

      </main>

      {/* ── FOOTER CLEAN ── */}
      <footer className="max-w-7xl mx-auto w-full px-6 py-6 border-t border-slate-900/80 flex flex-col md:flex-row items-center justify-between text-[11px] text-slate-500 shrink-0 gap-2 z-10">
        <span>&copy; {new Date().getFullYear()} Souza-CAD. Todos os direitos reservados.</span>
        <div className="flex items-center gap-4">
          <span>Desenvolvido para alta performance em georreferenciamento de imóveis rurais e urbanos.</span>
        </div>
      </footer>
    </div>
  );
}
