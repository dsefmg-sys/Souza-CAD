'use client';

import { Shield, Zap, Compass, Users, CheckCircle, Smartphone, ArrowRight, Award, Check, FileText, Layers, Settings, FileSpreadsheet, FileCheck, Map, CheckCircle2 } from 'lucide-react';
import type { LandingPageTexts } from '@/lib/store/suporte';

interface LandingPageProps {
  onPioneiro: () => void;
  numUsuarios: number;
  texts: LandingPageTexts;
}

export default function LandingPage({ onPioneiro, numUsuarios, texts }: LandingPageProps) {
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

  // Fallbacks de textos
  const titulo = texts.titulo || 'Otimize 5 horas de projeto em apenas 20 minutos.';
  const subtitulo = texts.subtitulo || 'Gere a planilha ODS oficial no padrão SIGEF/INCRA em minutos, memoriais descritivos perimétricos, plantas topográficas completas (A3/A0), requerimentos cartorários, erratas, contratos e recibos numa única plataforma.';
  const historia = texts.historia || 'Depois de 14 anos empreendendo na área de agrimensura, enfrentando o cansaço de refazer projetos manuais no CAD tradicional e preencher planilhas repetitivas, decidi aprender a programar para criar a ferramenta que eu mesmo precisava para ter liberdade, agilidade e total segurança técnica. O Souza-CAD transforma um processo manual e exaustivo de 5 horas em apenas 20 minutos de trabalho eficiente.';
  const autorHistoria = texts.autorHistoria || 'Agrimensor Programador & Criador do Souza-CAD';
  const itensCheck = texts.itensCheck && texts.itensCheck.length === 4 ? texts.itensCheck : [
    'Georreferenciamento Rural: Memoriais e geração de planilha ODS para SIGEF.',
    'Planialtimetria Precisa: Curvas de nível automáticas a partir de altitude online.',
    'CAR e Lotes Urbanos: Perímetro, confrontações e desenhos prontos em segundos.',
    'Garantia de Segurança: Validações inteligentes que evitam erros no cartório.'
  ];

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden font-sans select-none selection:bg-emerald-500/30 selection:text-emerald-200 flex flex-col justify-between">
      
      {/* ── BACKGROUND TÉCNICO: CURVAS DE NÍVEL TOPOGRÁFICAS SVG ANIMADAS ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-15">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <defs>
            <linearGradient id="topoGradLine" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#059669" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <path d="M-100 150 C 300 80, 600 350, 1200 180 C 1500 80, 1800 280, 2200 120" fill="none" stroke="url(#topoGradLine)" strokeWidth="1.5" className="animate-pulse" style={{ animationDuration: '7s' }} />
          <path d="M-100 350 C 400 250, 700 550, 1300 300 C 1600 200, 1900 450, 2300 300" fill="none" stroke="url(#topoGradLine)" strokeWidth="1.2" className="animate-pulse" style={{ animationDuration: '9s' }} />
          <path d="M-100 550 C 250 450, 800 750, 1400 500 C 1700 400, 2000 650, 2400 500" fill="none" stroke="url(#topoGradLine)" strokeWidth="1" className="animate-pulse" style={{ animationDuration: '11s' }} />
          <path d="M-100 750 C 500 650, 900 950, 1500 700 C 1800 600, 2100 850, 2500 700" fill="none" stroke="url(#topoGradLine)" strokeWidth="0.8" />
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

      {/* ── HEADER CLEAN & ELEGANTE ── */}
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
            className="px-5 py-2.5 rounded-xl bg-emerald-400 text-slate-950 text-xs font-black transition-all cursor-pointer flex items-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.4)] hover:bg-emerald-300 hover:scale-105 active:scale-95 uppercase tracking-wider"
          >
            <Zap className="size-4 fill-slate-950" />
            <span>Acessar Plataforma</span>
          </button>
        </div>
      </header>

      {/* ── ESTRUTURA EXTENSA EM ROLAGEM VERTICAL (COM IMAGENS LIVRES EM LARGURA TOTAL DA TELA) ── */}
      <main className="relative flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-16 z-10 space-y-28 text-center">
        
        {/* 1. SEÇÃO HERO: DESTAQUE PARA PLANILHA ODS INCRA EM MINUTOS & PEÇAS TÉCNICAS */}
        <section className="max-w-4xl mx-auto space-y-6 pt-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-xs font-black uppercase tracking-wider text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.2)]">
            <FileSpreadsheet className="size-4 text-emerald-400" />
            <span>Geração de Planilha ODS Padrão INCRA & SIGEF em Minutos</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white leading-[1.08] tracking-tight drop-shadow-md">
            {titulo}
          </h1>

          <p className="text-base sm:text-xl text-slate-200 leading-relaxed font-medium max-w-3xl mx-auto">
            {subtitulo}
          </p>

          {/* Três Pilares de Produção Rápida */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 max-w-3xl mx-auto text-left">
            <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-emerald-500/30 flex items-center gap-3 shadow-lg">
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 shrink-0">
                <FileSpreadsheet className="size-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-xs">Planilha ODS INCRA</h3>
                <p className="text-[10px] text-slate-400">Pronta para o SIGEF em minutos</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-emerald-500/30 flex items-center gap-3 shadow-lg">
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 shrink-0">
                <Map className="size-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-xs">Planta A3/A0 SVG/PDF</h3>
                <p className="text-[10px] text-slate-400">Prancha técnica completa</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-emerald-500/30 flex items-center gap-3 shadow-lg">
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 shrink-0">
                <FileCheck className="size-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-xs">Memoriais & Erratas</h3>
                <p className="text-[10px] text-slate-400">Formatados para o cartório</p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. SEÇÃO DE VAGAS DE USUÁRIO PIONEIRO (DESTAQUE CENTRAL ESPAÇADO) */}
        <section className="w-full max-w-3xl mx-auto">
          <div className="bg-slate-900/90 border border-emerald-500/30 p-6 sm:p-10 rounded-3xl shadow-[0_0_60px_rgba(16,185,129,0.18)] space-y-6 backdrop-blur-xl relative overflow-hidden">
            
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800/80 pb-5 text-left">
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-wide flex items-center gap-2">
                  <Award className="size-6 text-emerald-400" />
                  {estaEsgotado ? 'Pioneiros Esgotados' : 'VAGAS DE USUÁRIO PIONEIRO'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  {estaEsgotado 
                    ? 'Vagas de teste encerradas. O Souza-CAD opera via planos profissionais para novos usuários.'
                    : 'Garanta seu credenciamento pioneiro e dite o futuro da plataforma.'
                  }
                </p>
              </div>

              <div className="px-5 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-center shrink-0">
                <span className="text-lg font-black text-emerald-400 font-mono">{estaEsgotado ? vagasTotais : numUsuarios} / {vagasTotais}</span>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Vagas Ativadas</span>
              </div>
            </div>

            {/* Barra de Progresso Neon */}
            <div className="space-y-2 text-left">
              <div className="h-3.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(16,185,129,0.6)]"
                  style={{ width: `${estaEsgotado ? 100 : Math.min(100, (numUsuarios / vagasTotais) * 100)}%` }}
                />
              </div>
              <div className="text-xs text-emerald-300 font-bold uppercase tracking-wider flex items-center justify-between pt-1">
                <span>{estaEsgotado ? 'Plano Comercial Ativado' : `Restam apenas ${vagasRestantes} vagas gratuitas de pioneiro`}</span>
                <span className="animate-pulse">Acesso Imediato</span>
              </div>
            </div>

            {/* Botão CTA Principal */}
            <button
              type="button"
              onClick={onPioneiro}
              className={`w-full text-slate-950 font-black text-base uppercase py-5 px-8 rounded-2xl transition-all transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-3 shadow-2xl ${
                estaEsgotado
                  ? 'bg-amber-500 hover:bg-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.4)]'
                  : 'bg-emerald-400 hover:bg-emerald-300 shadow-[0_0_40px_rgba(16,185,129,0.45)]'
              }`}
            >
              <Zap className="size-5 fill-slate-950" />
              <span>{estaEsgotado ? 'ADQUIRIR PLANO PROFISSIONAL' : 'SER UM USUÁRIO PIONEIRO'}</span>
              <ArrowRight className="size-5" />
            </button>
          </div>
        </section>

        {/* 3. SEÇÃO DESTACADA: PLANTA TOPOGRÁFICA PRONTA (IMAGEM LIMPA E GIGANTE NA LARGURA DA TELA TODA — SEM JANELA) */}
        <section className="w-full space-y-8 pt-6 border-t border-slate-900/80">
          <div className="max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-black uppercase tracking-wider text-emerald-400">
              <Map className="size-4" /> Planta Topográfica Pronta & Layouts
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
              Prancha A3/A0 Completa Gerada no Sistema
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-medium">
              Desenho vetorial de alta precisão com carimbo oficial, rosa dos ventos, escala gráfica, grade de coordenadas UTM e convenções topográficas gerados automaticamente.
            </p>
          </div>

          {/* IMAGEM DIRETA EM LARGURA TOTAL DA TELA (SEM JANELA / MOLDURA) */}
          <div className="w-full max-w-6xl mx-auto rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(16,185,129,0.22)] border border-slate-800/80 bg-slate-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/marca/splash.png"
              alt="Planta Topográfica Pronta no Souza-CAD"
              className="w-full h-auto object-contain max-h-[680px] opacity-100 transition-all duration-300"
            />
          </div>

          {/* Destaques em Cards Espaçados */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto text-left">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 w-fit">
                <Compass className="size-5" />
              </div>
              <h3 className="font-bold text-white text-base">Rosa dos Ventos & Escala</h3>
              <p className="text-xs text-slate-400 leading-relaxed">Cálculo dinâmico da escala gráfica e orientação do Norte de acordo com o perímetro.</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 w-fit">
                <Layers className="size-5" />
              </div>
              <h3 className="font-bold text-white text-base">Tabela de Coordenadas</h3>
              <p className="text-xs text-slate-400 leading-relaxed">Geração da tabela de vértices com azimutes, distâncias, coordenadas N/E e confrontantes.</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 w-fit">
                <CheckCircle2 className="size-5" />
              </div>
              <h3 className="font-bold text-white text-base">Exportação DXF / PDF / KML</h3>
              <p className="text-xs text-slate-400 leading-relaxed">Compatibilidade total para abrir no AutoCAD, Google Earth e leitores de PDF.</p>
            </div>
          </div>
        </section>

        {/* 4. SEÇÃO DA HISTÓRIA DO CRIADOR */}
        <section className="w-full max-w-4xl mx-auto py-4">
          <div className="bg-slate-900/80 border border-slate-800/80 p-8 sm:p-12 rounded-3xl text-left space-y-5 backdrop-blur-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <Shield className="size-5" /> A história por trás da ferramenta
            </h3>
            <p className="text-base sm:text-lg text-slate-200 leading-relaxed italic">
              &ldquo;{historia}&rdquo;
            </p>
            <div className="pt-4 flex items-center justify-between text-xs sm:text-sm text-slate-400 font-medium border-t border-slate-850">
              <span className="font-bold text-white">— {autorHistoria}</span>
              <span className="text-emerald-400 font-bold">14 Anos de Experiência Prática</span>
            </div>
          </div>
        </section>

        {/* 5. SEÇÃO DESTACADA: MÓDULO DE GESTÃO FINANCEIRA E CONTRATOS (IMAGEM LIMPA E GIGANTE NA LARGURA DA TELA TODA — SEM JANELA) */}
        <section className="w-full space-y-8 pt-6 border-t border-slate-900/80">
          <div className="max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-black uppercase tracking-wider text-emerald-400">
              <FileText className="size-4" /> Gestão do Projeto & Documentos
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
              Recibos, Contratos & Declarações com 1 Clique
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-medium">
              Emissão formal em PDF de recibos de quitação, contratos de prestação de serviços de agrimensura, propostas comerciais e declarações cartorárias com dados e assinatura digital preenchidos automaticamente.
            </p>
          </div>

          {/* IMAGEM DIRETA EM LARGURA TOTAL DA TELA (SEM JANELA / MOLDURA) */}
          <div className="w-full max-w-6xl mx-auto rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(16,185,129,0.22)] border border-slate-800/80 bg-slate-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/marca/preview_gestao.png"
              alt="Gestão do Projeto, Recibos e Contratos no Souza-CAD"
              className="w-full h-auto object-contain max-h-[680px] opacity-100 transition-all duration-300"
            />
          </div>
        </section>

        {/* 6. SEÇÃO DESTACADA: AUTOMACÃO DE ERRATAS E CONFRONTANTES (IMAGEM LIMPA E GIGANTE NA LARGURA DA TELA TODA — SEM JANELA) */}
        <section className="w-full space-y-8 pt-6 border-t border-slate-900/80">
          <div className="max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-black uppercase tracking-wider text-emerald-400">
              <Layers className="size-4" /> Cartório & Malha SIGEF/INCRA
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
              Erratas para Cartório & Vértices Confrontantes
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-medium">
              Crie minutas de erratas de retificação de área prontas no formato Word (.docx) e faça busca online automática de polígonos vizinhos certificados no INCRA para evitar sobreposições.
            </p>
          </div>

          {/* IMAGEM DIRETA EM LARGURA TOTAL DA TELA (SEM JANELA / MOLDURA) */}
          <div className="w-full max-w-6xl mx-auto rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(16,185,129,0.22)] border border-slate-800/80 bg-slate-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/marca/preview_modulos.png"
              alt="Automação de Erratas e Malha SIGEF no Souza-CAD"
              className="w-full h-auto object-contain max-h-[680px] opacity-100 transition-all duration-300"
            />
          </div>
        </section>

        {/* 7. SEÇÃO DESTACADA: PERSONALIZAÇÃO DA MARCA E CONFIGURAÇÕES (IMAGEM LIMPA E GIGANTE NA LARGURA DA TELA TODA — SEM JANELA) */}
        <section className="w-full space-y-8 pt-6 border-t border-slate-900/80">
          <div className="max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-black uppercase tracking-wider text-emerald-400">
              <Settings className="size-4" /> Sua Marca & Identidade
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
              A Sua Empresa em Todas as Peças Técnicas
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-medium">
              Configure o logotipo do seu escritório para a prancha SVG/PDF A3/A0, escolha as cores da marca e cadastre sua assinatura digital transparente para carimbar documentos automaticamente.
            </p>
          </div>

          {/* IMAGEM DIRETA EM LARGURA TOTAL DA TELA (SEM JANELA / MOLDURA) */}
          <div className="w-full max-w-6xl mx-auto rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(16,185,129,0.22)] border border-slate-800/80 bg-slate-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/marca/preview_config.png"
              alt="Configurações da Empresa e Assinatura Digital no Souza-CAD"
              className="w-full h-auto object-contain max-h-[680px] opacity-100 transition-all duration-300"
            />
          </div>
        </section>

        {/* 8. SEÇÃO FINAL: VALIDAÇÕES TÉCNICAS E CTA DE CREDENCIAMENTO */}
        <section className="w-full max-w-4xl mx-auto space-y-8 pt-8 border-t border-slate-900/80">
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Tudo o que seu escritório precisa para produzir mais
            </h2>
            <p className="text-sm text-slate-400 max-w-xl mx-auto">
              Garanta sua vaga de usuário pioneiro e simplifique seu fluxo de agrimensura hoje mesmo.
            </p>
          </div>

          {/* Grid de Validações Técnicas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
            {itensCheck.map((item, idx) => {
              const parts = item.split(':');
              const title = parts[0]?.trim() || '';
              const desc = parts[1]?.trim() || '';
              return (
                <div key={idx} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start gap-3 text-xs">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                    <CheckCircle className="size-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-200 text-sm">{title}</h4>
                    {desc && <p className="text-xs text-slate-400 font-normal mt-1 leading-relaxed">{desc}</p>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA Final */}
          <div className="pt-4">
            <button
              type="button"
              onClick={onPioneiro}
              className={`w-full text-slate-950 font-black text-base uppercase py-5 px-8 rounded-2xl transition-all transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-3 shadow-2xl ${
                estaEsgotado
                  ? 'bg-amber-500 hover:bg-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.4)]'
                  : 'bg-emerald-400 hover:bg-emerald-300 shadow-[0_0_40px_rgba(16,185,129,0.45)]'
              }`}
            >
              <Zap className="size-5 fill-slate-950" />
              <span>{estaEsgotado ? 'ADQUIRIR PLANO PROFISSIONAL' : 'SER UM USUÁRIO PIONEIRO AGORA'}</span>
              <ArrowRight className="size-5" />
            </button>
          </div>
        </section>

      </main>

      {/* ── FOOTER CLEAN ── */}
      <footer className="max-w-7xl mx-auto w-full px-6 py-8 border-t border-slate-900/80 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 shrink-0 gap-3 z-10">
        <span>&copy; {new Date().getFullYear()} Souza-CAD. Todos os direitos reservados.</span>
        <div className="flex items-center gap-4">
          <span>Desenvolvido para alta performance em georreferenciamento de imóveis rurais e urbanos.</span>
        </div>
      </footer>
    </div>
  );
}
