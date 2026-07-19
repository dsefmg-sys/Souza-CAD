'use client';

import { useState, useEffect, useRef } from 'react';
import { Shield, Zap, Compass, Users, CheckCircle, Smartphone, FileText, Layers, Settings, ChevronLeft, ChevronRight, Sparkles, ArrowRight, Award, Check } from 'lucide-react';
import type { LandingPageTexts } from '@/lib/store/suporte';

interface LandingPageProps {
  onPioneiro: () => void;
  numUsuarios: number;
  texts: LandingPageTexts;
}

interface ShowcaseModule {
  id: string;
  badge: string;
  titulo: string;
  subtitulo: string;
  imagem: string;
  destaques: string[];
  estatistica: { valor: string; rotulo: string };
}

const MODULOS_SHOWCASE: ShowcaseModule[] = [
  {
    id: 'gestao',
    badge: 'Gestão Financeira & Contratos',
    titulo: 'Contratos, Recibos e Propostas Comerciais com 1 Clique',
    subtitulo: 'Tudo integrado ao projeto. Emita recibos formais de quitação em PDF, propostas comerciais, contratos de prestação de serviços e declarações cartorárias com seus dados e assinatura digital preenchidos automaticamente.',
    imagem: '/marca/preview_gestao.png',
    destaques: [
      'Recibo de quitação formal em PDF assinado automaticamente',
      'Contratos e propostas comerciais personalizadas',
      'Declarações avulsas de posse, espólio e sobreposição'
    ],
    estatistica: { valor: '100%', rotulo: 'Segurança Contratual' }
  },
  {
    id: 'erratas',
    badge: 'Automação Cartorária',
    titulo: 'Gerador de Erratas para Retificação de Área em Word (.docx)',
    subtitulo: 'Esqueça o preenchimento manual de correções de matrícula. O Souza-CAD gera minutas completas de erratas prontas para protocolo em cartório com atalhos de preenchimento rápido dos dados do imóvel e confrontantes.',
    imagem: '/marca/preview_modulos.png',
    destaques: [
      'Atalhos de inserção de matrícula, denominação e confrontantes',
      'Formatação oficial aceita em cartórios de registro de imóveis',
      'Gerado em Word editável (.docx) com campo de responsabilidade técnica'
    ],
    estatistica: { valor: '5 min', rotulo: 'Tempo de Elaboração' }
  },
  {
    id: 'sigef',
    badge: 'Malha SIGEF & INCRA',
    titulo: 'Busca Online Automática de Confrontantes e Polígonos Vizinhos',
    subtitulo: 'Cruze instantaneamente a malha pública do SIGEF/INCRA na sua região de projeto. O sistema importa automaticamente os polígonos vizinhos certificados e previne vãos ou sobreposições no perímetro.',
    imagem: '/marca/preview_modulos.png',
    destaques: [
      'Busca georreferenciada online por raio de localização',
      'Validação automática de vértices e confrontações oficiais',
      'Gerador de vértices virtuais e ajuste fino de coordenadas'
    ],
    estatistica: { valor: 'Zero', rotulo: 'Sobreposição de Divisas' }
  },
  {
    id: 'config',
    badge: 'Sua Marca & Identidade',
    titulo: 'Personalização Completa com seu Logotipo e Assinatura Digital',
    subtitulo: 'Defina as cores da sua empresa, logotipo oficial para o carimbo da planta A3/A0 e assinatura PNG transparente para aplicar automaticamente em todas as peças técnicas.',
    imagem: '/marca/preview_config.png',
    destaques: [
      'Assinatura digital transparente em PDF, DOCX e Memoriais',
      'Logotipo personalizado no carimbo oficial da prancha SVG/PDF',
      'Configuração rápida de registros profissionais (CFT/CREA/CFTA)'
    ],
    estatistica: { valor: '100%', rotulo: 'Personalizado para seu Escritório' }
  },
  {
    id: 'topografia',
    badge: 'Georreferenciamento & Planialtimetria',
    titulo: 'Prancha SVG/PDF A3/A0, Curvas de Nível 3D e Memoriais Automáticos',
    subtitulo: 'Desenho vetorial de alto desempenho focado em agrimensura rural e urbana. Curvas de nível automáticas a partir de altitude Copernicus DEM 90m online, memorial descritivo perimétrico e exportação ODS para SIGEF.',
    imagem: '/marca/splash.png',
    destaques: [
      'Rosa dos ventos, escala gráfica e tabela de coordenadas UTM automáticas',
      'Exportação para DXF (AutoCAD), KML, Shapefile (SHP) e GPX',
      'Algoritmo perimétrico com ponto inicial no vértice mais ao Norte'
    ],
    estatistica: { valor: '5h ➔ 20min', rotulo: 'Ganho Real de Produtividade' }
  }
];

export default function LandingPage({ onPioneiro, numUsuarios, texts }: LandingPageProps) {
  const [moduloAtivo, setModuloAtivo] = useState(0);
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

  // Autoplay suave a cada 6 segundos
  useEffect(() => {
    if (pausado) return;
    timerRef.current = setInterval(() => {
      setModuloAtivo((prev) => (prev + 1) % MODULOS_SHOWCASE.length);
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

  const modulo = MODULOS_SHOWCASE[moduloAtivo];

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden font-sans select-none selection:bg-emerald-500/30 selection:text-emerald-200 flex flex-col justify-between">
      
      {/* ── BACKGROUND TÉCNICO: CURVAS DE NÍVEL TOPOGRÁFICAS SVG ANIMADAS ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-20">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <defs>
            <linearGradient id="topoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#059669" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path d="M-100 200 C 300 100, 600 400, 1200 200 C 1500 100, 1800 300, 2200 150" fill="none" stroke="url(#topoGrad)" strokeWidth="1.5" className="animate-pulse" style={{ animationDuration: '8s' }} />
          <path d="M-100 350 C 400 250, 700 550, 1300 300 C 1600 200, 1900 450, 2300 300" fill="none" stroke="url(#topoGrad)" strokeWidth="1.2" className="animate-pulse" style={{ animationDuration: '10s' }} />
          <path d="M-100 500 C 250 400, 800 700, 1400 450 C 1700 350, 2000 600, 2400 450" fill="none" stroke="url(#topoGrad)" strokeWidth="1" className="animate-pulse" style={{ animationDuration: '12s' }} />
          <path d="M-100 650 C 500 550, 900 850, 1500 600 C 1800 500, 2100 750, 2500 600" fill="none" stroke="url(#topoGrad)" strokeWidth="0.8" />
          <path d="M-100 800 C 350 700, 1000 1000, 1600 750 C 1900 650, 2200 900, 2600 750" fill="none" stroke="url(#topoGrad)" strokeWidth="0.6" />
        </svg>
      </div>

      {/* ── BANNER PARA CELULAR (Uso complementar no mobile) ── */}
      <div className="block md:hidden bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center z-20">
        <div className="flex items-center justify-center gap-2 text-xs font-bold text-amber-400">
          <Smartphone className="size-4 animate-bounce shrink-0" />
          <span>Uso no celular é auxiliar/consulta em campo.</span>
        </div>
        <p className="text-[10px] text-amber-500/80 mt-0.5 leading-snug">
          Para trabalho profissional e elaboração de desenhos e peças técnicas, utilize a versão completa no seu Computador/PC.
        </p>
      </div>

      {/* ── HEADER CLEAN ── */}
      <header className="max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <Compass className="size-6 text-emerald-400 animate-spin" style={{ animationDuration: '60s' }} />
          </div>
          <div>
            <span className="text-xl font-black tracking-widest text-white font-mono">SOUZA <span className="text-emerald-400">CAD</span></span>
            <span className="block text-[9px] font-bold uppercase tracking-wider text-emerald-500/90">Engenharia & Georreferenciamento</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onPioneiro}
            className="px-4 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
          >
            <Zap className="size-3.5" />
            <span>Acessar Plataforma</span>
          </button>
        </div>
      </header>

      {/* ── CONTEÚDO PRINCIPAL (HERO + VAGAS + CARROSSEL FULL-WIDTH) ── */}
      <main className="flex-grow flex flex-col items-center max-w-7xl mx-auto w-full px-6 py-4 md:py-8 z-10 space-y-12">
        
        {/* HERO TITULO & SUBTITULO */}
        <div className="text-center max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-xs font-black uppercase tracking-wider text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
            <Zap className="size-3.5" /> Desenvolvido por Agrimensor para Agrimensores
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white leading-tight tracking-tight">
            {titulo}
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-slate-300 leading-relaxed font-medium max-w-3xl mx-auto">
            {subtitulo}
          </p>
        </div>

        {/* ── RETÂNGULO DE OPORTUNIDADE & ESCASSEZ DE PIONEIROS (POSICIONADO LOGO ABAIXO DA CHAMADA) ── */}
        <div className="w-full max-w-3xl bg-slate-900/90 border border-slate-800 p-6 md:p-8 rounded-3xl shadow-[0_0_80px_rgba(16,185,129,0.12)] text-center relative overflow-hidden backdrop-blur-2xl">
          <div className="absolute -left-12 -top-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -right-12 -bottom-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
            <div className="text-left">
              <h2 className="text-lg font-black text-white uppercase tracking-wide flex items-center gap-2">
                <Award className="size-5 text-emerald-400" />
                {estaEsgotado ? 'Pioneiros Esgotados' : 'VAGAS DE USUÁRIO PIONEIRO'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {estaEsgotado 
                  ? 'Vagas de teste preenchidas. O Souza-CAD opera via planos profissionais para novos usuários.'
                  : 'Garanta seu credenciamento pioneiro e tenha acesso prioritário a todas as atualizações.'
                }
              </p>
            </div>
            
            {/* Vagas Contador Badge */}
            <div className="px-4 py-2 rounded-2xl bg-slate-950 border border-slate-800 text-center shrink-0">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Status de Vagas</span>
              <span className="text-base font-black text-emerald-400">{estaEsgotado ? vagasTotais : numUsuarios} / {vagasTotais}</span>
            </div>
          </div>

          {/* Barra de vagas */}
          <div className="space-y-2 mb-6">
            <div className="h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                style={{ width: `${estaEsgotado ? 100 : Math.min(100, (numUsuarios / vagasTotais) * 100)}%` }}
              />
            </div>
            <div className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
              <Sparkles className="size-3.5 animate-pulse" />
              {estaEsgotado 
                ? <span>Cadastre seu escritório e adquira o plano profissional</span>
                : <span>Resta(m) apenas {vagasRestantes} vaga(s) de pioneiro com desconto vitalício</span>
              }
            </div>
          </div>

          {/* Botão de Ação CTA Principal */}
          <button
            type="button"
            onClick={onPioneiro}
            className={`w-full text-slate-950 font-black text-base uppercase py-4 px-8 rounded-2xl transition-all transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-3 shadow-2xl ${
              estaEsgotado
                ? 'bg-amber-500 hover:bg-amber-400 shadow-[0_4px_25px_rgba(245,158,11,0.4)]'
                : 'bg-emerald-400 hover:bg-emerald-300 shadow-[0_4px_25px_rgba(16,185,129,0.4)]'
            }`}
          >
            <Zap className="size-5 fill-slate-950" />
            <span>{estaEsgotado ? 'ADQUIRIR PLANO PROFISSIONAL' : 'QUERO SER UM USUÁRIO PIONEIRO'}</span>
            <ArrowRight className="size-5" />
          </button>
        </div>

        {/* 📋 HISTÓRIA E DESTAQUES TÉCNICOS */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full max-w-5xl">
          {/* História do Criador */}
          <div className="md:col-span-7 bg-slate-900/70 border border-slate-800/80 p-6 rounded-3xl relative overflow-hidden backdrop-blur-xl flex flex-col justify-between">
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <Shield className="size-4" /> A história por trás da ferramenta
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed italic">
                &ldquo;{historia}&rdquo;
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-850 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">— {autorHistoria}</span>
              <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">14 Anos de Prática de Campo</span>
            </div>
          </div>

          {/* Destaques Rápido em Grid */}
          <div className="md:col-span-5 grid grid-cols-1 gap-3">
            {itensCheck.map((item, idx) => {
              const parts = item.split(':');
              const title = parts[0]?.trim() || '';
              const desc = parts[1]?.trim() || '';
              return (
                <div key={idx} className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800/80 flex items-start gap-3 text-xs">
                  <div className="p-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                    <Check className="size-3.5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-200">{title}</h4>
                    {desc && <p className="text-[11px] text-slate-400 font-normal mt-0.5 leading-snug">{desc}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── SHOWCASE EM TELA CHEIA CINEMATOGRÁFICO COM FUSÃO DE GRADIENTE ("FUMAÇA") ── */}
        <section 
          className="w-full pt-8 space-y-6"
          onMouseEnter={() => setPausado(true)}
          onMouseLeave={() => setPausado(false)}
        >
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-black uppercase tracking-wider text-emerald-400">
              <Sparkles className="size-3.5" /> Galeria Imersiva de Alta Qualidade
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              Conheça o Souza-CAD por dentro
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto">
              Visualização de tela cheia das ferramentas reais. A fusão contínua entre a interface e o sistema.
            </p>
          </div>

          {/* Seleção de Módulos (Tabs) */}
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {MODULOS_SHOWCASE.map((m, idx) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setModuloAtivo(idx)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center gap-2 ${
                  moduloAtivo === idx
                    ? 'bg-emerald-400 text-slate-950 border-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.3)] font-black scale-105'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                <span className={`size-2 rounded-full ${moduloAtivo === idx ? 'bg-slate-950' : 'bg-emerald-500'}`} />
                <span>{m.badge}</span>
              </button>
            ))}
          </div>

          {/* 🖼️ CONTAINER CINEMATOGRÁFICO DE LARGURA TOTAL COM SOBREPOSIÇÃO DE TEXTO E VIGNETTE ("FUMAÇA") */}
          <div className="relative w-full rounded-3xl border border-slate-800/80 bg-slate-950 overflow-hidden shadow-[0_0_120px_rgba(16,185,129,0.12)] min-h-[460px] md:min-h-[580px] flex items-center justify-center group">
            
            {/* 1. A IMAGEM DE TELA CHEIA */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={modulo.id}
              src={modulo.imagem}
              alt={modulo.titulo}
              className="absolute inset-0 w-full h-full object-cover object-top opacity-70 transition-all duration-700 transform scale-[1.01] group-hover:scale-105"
            />

            {/* 2. GRADIENTES DE FUSÃO ("FUMAÇA" NAS BORDAS QUE SE FUNDEM AO BG-SLATE-950 DO APP) */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/80 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/30 to-slate-950/80 pointer-events-none" />
            <div className="absolute inset-0 bg-radial from-transparent via-slate-950/30 to-slate-950 pointer-events-none" />

            {/* 3. BOTÕES FLUTUANTES DE NAVEGAÇÃO LATERAL (< >) */}
            <button
              type="button"
              onClick={() => setModuloAtivo((prev) => (prev - 1 + MODULOS_SHOWCASE.length) % MODULOS_SHOWCASE.length)}
              className="absolute left-4 z-30 p-3 rounded-full bg-slate-950/80 text-white border border-slate-800 hover:bg-emerald-400 hover:text-slate-950 transition-all shadow-2xl hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-md"
              title="Módulo Anterior"
            >
              <ChevronLeft className="size-6" />
            </button>

            <button
              type="button"
              onClick={() => setModuloAtivo((prev) => (prev + 1) % MODULOS_SHOWCASE.length)}
              className="absolute right-4 z-30 p-3 rounded-full bg-slate-950/80 text-white border border-slate-800 hover:bg-emerald-400 hover:text-slate-950 transition-all shadow-2xl hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-md"
              title="Próximo Módulo"
            >
              <ChevronRight className="size-6" />
            </button>

            {/* 4. CONTEÚDO SOBREPOSTO (TEXTO, TÍTULOS E ESTATÍSTICA DIRECTLY OVER THE IMAGE) */}
            <div className="relative z-20 max-w-4xl mx-auto px-6 py-12 md:py-16 text-left space-y-6 flex flex-col justify-end h-full">
              
              <div className="flex items-center gap-3">
                <span className="px-3.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-black uppercase tracking-wider backdrop-blur-md shadow-lg">
                  {modulo.badge}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Módulo {moduloAtivo + 1} de {MODULOS_SHOWCASE.length}
                </span>
              </div>

              <h3 className="text-2xl sm:text-4xl md:text-5xl font-black text-white leading-tight tracking-tight drop-shadow-md max-w-3xl">
                {modulo.titulo}
              </h3>

              <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-medium max-w-2xl drop-shadow-sm">
                {modulo.subtitulo}
              </p>

              {/* Destaques e Estatística do Módulo */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-2">
                <div className="sm:col-span-8 space-y-2">
                  {modulo.destaques.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs font-bold text-slate-200 bg-slate-900/60 border border-slate-800/60 backdrop-blur-md px-3 py-1.5 rounded-xl">
                      <CheckCircle className="size-4 text-emerald-400 shrink-0" />
                      <span>{d}</span>
                    </div>
                  ))}
                </div>

                <div className="sm:col-span-4 bg-emerald-500/10 border border-emerald-500/30 backdrop-blur-md p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-lg">
                  <span className="text-2xl font-black text-emerald-400 font-mono">{modulo.estatistica.valor}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 mt-0.5">{modulo.estatistica.rotulo}</span>
                </div>
              </div>

            </div>

            {/* Indicator Dots na Parte Inferior do Container */}
            <div className="absolute bottom-4 right-6 z-30 flex items-center gap-2">
              {MODULOS_SHOWCASE.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setModuloAtivo(idx)}
                  className={`h-2.5 rounded-full transition-all cursor-pointer ${
                    moduloAtivo === idx ? 'w-8 bg-emerald-400' : 'w-2.5 bg-slate-800 hover:bg-slate-700'
                  }`}
                  title={`Ir para o módulo ${idx + 1}`}
                />
              ))}
            </div>

          </div>
        </section>

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
