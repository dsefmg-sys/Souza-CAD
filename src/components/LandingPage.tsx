'use client';

import { useState, useEffect, useRef } from 'react';
import { Shield, Zap, Compass, Users, CheckCircle, Smartphone, Monitor, FileText, Layers, Settings, Eye, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import type { LandingPageTexts } from '@/lib/store/suporte';

interface LandingPageProps {
  onPioneiro: () => void;
  numUsuarios: number;
  texts: LandingPageTexts;
}

interface SlideItem {
  id: string;
  titulo: string;
  subtitulo: string;
  badge: string;
  imagem: string;
  detalhe: string;
}

const SLIDES: SlideItem[] = [
  {
    id: 'gestao',
    titulo: 'Gestão Financeira & Documentos Comerciais',
    subtitulo: 'Emissão instantânea de Recibos formais, Contratos de Prestação de Serviços, Propostas e Declarações de Posse ou Sobreposição.',
    badge: 'Financeiro & Contratos',
    imagem: '/marca/preview_gestao.png',
    detalhe: '✔ Gere recibos em PDF, contratos e propostas com os valores e prazos do projeto em 1 clique.'
  },
  {
    id: 'errata',
    titulo: 'Errata para o Cartório em 1 Clique',
    subtitulo: 'Defina as correções necessárias para o processo de retificação de área com atalhos de preenchimento rápido.',
    badge: 'Cartório & Retificação',
    imagem: '/marca/preview_modulos.png',
    detalhe: '✔ Errata gerada no formato Word (.docx), pronta para protocolo com justificativa e campo de assinatura.'
  },
  {
    id: 'sigef',
    titulo: 'Confrontantes & Busca Online no INCRA',
    subtitulo: 'Busca automática online por região de todos os imóveis certificados que confrontam com o perímetro trabalhado.',
    badge: 'SIGEF & INCRA',
    imagem: '/marca/preview_modulos.png',
    detalhe: '✔ Importe polígonos vizinhos e evite vãos ou sobreposições de divisa na certificação.'
  },
  {
    id: 'config',
    titulo: 'Configurações da Empresa & Marca',
    subtitulo: 'Identificação completa do seu escritório com logotipo, marca, endereço e assinatura digital transparente.',
    badge: 'Marca & Empresa',
    imagem: '/marca/preview_config.png',
    detalhe: '✔ Tudo o que você preenche reflete automaticamente nos memoriais, plantas, recibos e requerimentos.'
  },
  {
    id: 'planta',
    titulo: 'Desenho Topográfico & Prancha SVG/PDF',
    subtitulo: 'Renderização em tempo real de pranchas nos padrões A3/A0 com tabela de coordenadas, carimbo e escala.',
    badge: 'Planta & Desenho',
    imagem: '/marca/splash.png',
    detalhe: '✔ Controle total de rótulos, cotas, linhas de divisa e convenções topográficas.'
  }
];

export default function LandingPage({ onPioneiro, numUsuarios, texts }: LandingPageProps) {
  const [slideAtual, setSlideAtual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Lógica de vagas dinâmicas baseada na quantidade de usuários cadastrados
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

  // Autoplay do carrossel (avança a cada 5s, se não estiver pausado)
  useEffect(() => {
    if (pausado) return;
    timerRef.current = setInterval(() => {
      setSlideAtual((prev) => (prev + 1) % SLIDES.length);
    }, 5000);
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

  const slide = SLIDES[slideAtual];

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden font-sans select-none selection:bg-emerald-500/30 selection:text-emerald-200 flex flex-col justify-between">
      
      {/* ── BANNER PARA CELULAR (Aviso de uso complementar no mobile e completo no PC) ── */}
      <div className="block md:hidden bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center">
        <div className="flex items-center justify-center gap-2 text-xs font-bold text-amber-400">
          <Smartphone className="size-4 animate-bounce shrink-0" />
          <span>Uso no celular é auxiliar/consulta em campo.</span>
        </div>
        <p className="text-[10px] text-amber-500/80 mt-0.5 leading-snug">
          Para trabalho profissional e elaboração de desenhos e peças técnicas, utilize a versão completa no seu Computador/PC.
        </p>
      </div>

      {/* ── HEADER ── */}
      <header className="max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <Compass className="size-6 text-emerald-400 animate-spin" style={{ animationDuration: '60s' }} />
          </div>
          <span className="text-lg font-black tracking-widest text-white font-mono">SOUZA <span className="text-emerald-400">CAD</span></span>
        </div>
        <div className="hidden md:flex items-center gap-2.5 text-xs text-slate-400">
          <Monitor className="size-3.5" />
          <span>Focado no navegador para PC</span>
        </div>
      </header>

      {/* ── CONTEÚDO PRINCIPAL ── */}
      <main className="flex-grow flex flex-col items-center justify-center max-w-6xl mx-auto w-full px-6 py-8 md:py-12 z-10 space-y-16">
        
        {/* HERO SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full">
          
          {/* Coluna Esquerda: Chamada, História, Métricas */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider text-emerald-400">
              <Zap className="size-3" /> Tecnologia & Prática de Campo
            </div>

            <h1 className="text-3xl md:text-5xl font-black text-white leading-tight tracking-tight">
              {titulo}
            </h1>

            <p className="text-sm md:text-base text-slate-300 leading-relaxed font-medium">
              {subtitulo}
            </p>

            {/* 📋 História do Agrimensor-Programador */}
            <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden backdrop-blur-md">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
                <Shield className="size-4" /> A história por trás da ferramenta
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                &ldquo;{historia}&rdquo;
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400">— {autorHistoria}</span>
              </div>
            </div>

            {/* Recursos Rápido */}
            <div className="grid grid-cols-2 gap-4 text-xs font-bold">
              {itensCheck.map((item, idx) => {
                const parts = item.split(':');
                const title = parts[0]?.trim() || '';
                const desc = parts[1]?.trim() || '';
                return (
                  <div key={idx} className="flex items-start gap-2 text-slate-300">
                    <CheckCircle className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <h4>{title}</h4>
                      {desc && <p className="text-[10px] text-slate-400 font-normal mt-0.5">{desc}</p>}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Coluna Direita: Box de Acesso e Escassez */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-3xl shadow-[0_0_80px_rgba(16,185,129,0.1)] text-center relative overflow-hidden backdrop-blur-xl">
              
              {/* Círculos decorativos */}
              <div className="absolute -left-12 -top-12 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
              <div className="absolute -right-12 -bottom-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />

              <h2 className="text-xl font-black text-white uppercase tracking-wide">
                {estaEsgotado ? 'Pioneiros Esgotados' : 'OPORTUNIDADE EXCLUSIVA'}
              </h2>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                {estaEsgotado 
                  ? 'As vagas gratuitas de pioneiros foram totalmente preenchidas. O Souza-CAD agora opera sob o sistema de planos comerciais para novos entrantes.'
                  : 'Seja um pioneiro na plataforma e ajude a ditar o futuro da tecnologia para agrimensura no Brasil.'
                }
              </p>

              {/* Barra de vagas */}
              <div className="my-6 space-y-2">
                <div className="flex justify-between text-xs font-black">
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Users className="size-3.5" /> {estaEsgotado ? 'VAGAS PREENCHIDAS' : 'VAGAS ATIVADAS'}
                  </span>
                  <span>{estaEsgotado ? vagasTotais : numUsuarios} / {vagasTotais}</span>
                </div>
                <div className="h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000"
                    style={{ width: `${estaEsgotado ? 100 : Math.min(100, (numUsuarios / vagasTotais) * 100)}%` }}
                  />
                </div>
                <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center justify-center gap-1 animate-pulse">
                  {estaEsgotado 
                    ? <span>Adquira uma assinatura profissional para ter acesso completo</span>
                    : <span>Apenas {vagasRestantes} vagas de pioneiro em aberto</span>
                  }
                </div>
              </div>

              {/* Botão de Ação */}
              <button
                type="button"
                onClick={onPioneiro}
                className={`w-full text-slate-950 font-black text-sm uppercase py-4 px-6 rounded-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 ${
                  estaEsgotado
                    ? 'bg-amber-500 hover:bg-amber-400 shadow-[0_4px_20px_rgba(245,158,11,0.3)]'
                    : 'bg-emerald-500 hover:bg-emerald-400 shadow-[0_4px_20px_rgba(16,185,129,0.3)]'
                }`}
              >
                <Zap className="size-4 fill-slate-950" />
                {estaEsgotado ? 'ADQUIRIR PLANO PROFISSIONAL' : 'SER UM USUÁRIO PIONEIRO'}
              </button>

              <div className="mt-4 flex flex-col items-center justify-center gap-1.5">
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <CheckCircle className="size-3.5 text-emerald-400" />
                  <span>{estaEsgotado ? 'Acesso imediato com plano ativo' : 'Acesso imediato à versão completa'}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <CheckCircle className="size-3.5 text-emerald-400" />
                  <span>{estaEsgotado ? 'Suporte prioritário via WhatsApp' : 'Sem compromisso financeiro inicial'}</span>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* ── CARROSSEL SHOWCASE INTERATIVO DE ALTA QUALIDADE ── */}
        <section 
          className="w-full space-y-6 pt-6 border-t border-slate-900/80"
          onMouseEnter={() => setPausado(true)}
          onMouseLeave={() => setPausado(false)}
        >
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider text-emerald-400">
              <Sparkles className="size-3" /> Galeria Interativa da Aplicação
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              O Souza-CAD por dentro
            </h2>
            <p className="text-xs text-slate-400 max-w-xl mx-auto">
              Navegue pelos módulos oficiais do sistema e veja a precisão gráfica, facilidade de uso e automações disponíveis.
            </p>
          </div>

          {/* Navegação de Abas Rápidas do Carrossel */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {SLIDES.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSlideAtual(idx)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  slideAtual === idx
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)] scale-105'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="size-1.5 rounded-full bg-current" />
                <span>{s.badge}</span>
              </button>
            ))}
          </div>

          {/* Moldura de Janela CAD com Navegação Lateral e Controles */}
          <div className="relative rounded-2xl border border-slate-800 bg-slate-900/90 p-2 md:p-4 shadow-[0_0_90px_rgba(16,185,129,0.14)] backdrop-blur-xl overflow-hidden group">
            
            {/* Header da Moldura estilo Software */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/80 mb-3">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="size-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="size-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="ml-2 text-xs font-bold text-slate-200">{slide.titulo}</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
                <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-emerald-400 font-bold">{slide.badge}</span>
                <span>Slide {slideAtual + 1} de {SLIDES.length}</span>
              </div>
            </div>

            {/* Imagem com botões de navegação lateral (< >) */}
            <div className="relative rounded-xl overflow-hidden border border-slate-800/80 bg-slate-950 flex items-center justify-center min-h-[340px] max-h-[540px]">
              
              {/* Botão Anterior */}
              <button
                type="button"
                onClick={() => setSlideAtual((prev) => (prev - 1 + SLIDES.length) % SLIDES.length)}
                className="absolute left-3 z-20 p-2.5 rounded-full bg-slate-950/80 text-white border border-slate-800 hover:bg-emerald-500 hover:text-slate-950 transition-all shadow-xl hover:scale-110 active:scale-95"
                title="Slide Anterior"
              >
                <ChevronLeft className="size-5" />
              </button>

              {/* Botão Próximo */}
              <button
                type="button"
                onClick={() => setSlideAtual((prev) => (prev + 1) % SLIDES.length)}
                className="absolute right-3 z-20 p-2.5 rounded-full bg-slate-950/80 text-white border border-slate-800 hover:bg-emerald-500 hover:text-slate-950 transition-all shadow-xl hover:scale-110 active:scale-95"
                title="Próximo Slide"
              >
                <ChevronRight className="size-5" />
              </button>

              {/* Imagem Renderizada */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={slide.id}
                src={slide.imagem}
                alt={slide.titulo}
                className="w-full h-auto object-contain max-h-[520px] transition-all duration-500 transform animate-in fade-in zoom-in-95"
              />
            </div>

            {/* Painel Inferior Sincronizado */}
            <div className="mt-3 px-4 py-3 bg-slate-950/60 rounded-xl border border-slate-850 flex flex-col md:flex-row items-start md:items-center justify-between text-xs gap-3">
              <div className="space-y-0.5">
                <p className="font-semibold text-slate-200">{slide.subtitulo}</p>
                <p className="text-[11px] text-emerald-400 font-medium">{slide.detalhe}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 self-center md:self-auto">
                {SLIDES.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSlideAtual(idx)}
                    className={`h-2 rounded-full transition-all ${
                      slideAtual === idx ? 'w-6 bg-emerald-400' : 'w-2 bg-slate-800 hover:bg-slate-700'
                    }`}
                    title={`Ir para slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>

          </div>
        </section>

      </main>

      {/* ── FOOTER ── */}
      <footer className="max-w-7xl mx-auto w-full px-6 py-6 border-t border-slate-900/60 flex flex-col md:flex-row items-center justify-between text-[10px] text-slate-500 shrink-0 gap-2">
        <span>&copy; {new Date().getFullYear()} Souza-CAD. Todos os direitos reservados.</span>
        <div className="flex items-center gap-4">
          <span>Desenvolvido para máxima eficiência em georreferenciamento de imóveis.</span>
        </div>
      </footer>
    </div>
  );
}
