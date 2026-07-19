'use client';

import { Shield, Zap, Compass, ArrowRight, Award, FileText, Layers, Settings, FileSpreadsheet, Check, Box, MapPin, Map, Download, Award as AwardIcon, FileCheck, FileCode } from 'lucide-react';
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
  const historia = texts.historia || 'Depois de 14 anos empreendendo e prestando serviços técnicos com comprometimento e responsabilidade no mercado, enfrentando os desafios reais de campo, refazer projetos manuais no CAD tradicional e preencher planilhas repetitivas, decidi aprender a programar para criar a ferramenta que eu mesmo precisava para ter liberdade, agilidade e total segurança técnica. O Souza-CAD transforma um processo manual e exaustivo de 5 horas em apenas 20 minutos de trabalho eficiente.';
  const autorHistoria = texts.autorHistoria || 'Darlan Souza — Agrimensor Programador & Criador do Souza-CAD';
  const itensCheck = texts.itensCheck && texts.itensCheck.length === 4 ? texts.itensCheck : [
    'Georreferenciamento Rural: Memoriais e geração de planilha ODS para SIGEF.',
    'Planialtimetria Precisa: Curvas de nível automáticas a partir de altitude online.',
    'CAR e Lotes Urbanos: Perímetro, confrontações e desenhos prontos em segundos.',
    'Garantia de Segurança: Validações inteligentes que evitam erros no cartório.'
  ];

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden font-sans select-none selection:bg-emerald-500/30 selection:text-emerald-200 flex flex-col justify-between">
      
      {/* ── BACKGROUND TÉCNICO: CURVAS DE NÍVEL TOPOGRÁFICAS SVG ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-10">
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

      {/* ── HEADER CLEAN COM BOTÃO DE PIONEIRO (X/Y) ── */}
      <header className="max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between z-30 relative shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <Compass className="size-6 text-emerald-400" />
          </div>
          <div>
            <span className="text-xl font-black tracking-widest text-white font-mono">SOUZA <span className="text-emerald-400">CAD</span></span>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-400">Engenharia & Georreferenciamento</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onPioneiro}
            className="px-5 py-2.5 rounded-2xl bg-emerald-500 text-white text-xs font-black transition-all cursor-pointer flex items-center gap-2 hover:bg-emerald-400 hover:scale-105 active:scale-95 uppercase tracking-wider font-mono shadow-lg"
          >
            <Zap className="size-4" />
            <span>SER UM PIONEIRO ({estaEsgotado ? vagasTotais : numUsuarios}/{vagasTotais})</span>
          </button>
        </div>
      </header>

      {/* ── ROLAGEM VERTICAL EM GRANDES SEÇÕES PERSUASIVAS & LEGÍVEIS ── */}
      <main className="relative flex-grow w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-16 z-10 space-y-24 text-center">
        
        {/* 1. SEÇÃO HERO: TÍTULO PRINCIPAL & SUBTÍTULO + IMAGEM PRINCIPAL */}
        <section className="max-w-4xl mx-auto space-y-8 pt-4">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-sm font-black uppercase tracking-wider text-emerald-300">
            <FileSpreadsheet className="size-5 text-emerald-400" />
            <span>Planilha ODS Padrão INCRA & SIGEF em Minutos</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white leading-[1.08] tracking-tight">
            {titulo}
          </h1>

          <p className="text-lg sm:text-2xl text-slate-300 leading-relaxed font-medium max-w-3xl mx-auto">
            {subtitulo}
          </p>

          {/* IMAGEM HERO: Screenshot principal do app no topo */}
          <div className="w-full max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-950 mt-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/marca/preview_mapa2d.png"
              alt="Interface completa do Souza-CAD com editor de mapa 2D sobre imagem de satélite, delimitação perimétrica, confrontantes e métricas"
              className="w-full h-auto object-contain"
            />
          </div>
        </section>

        {/* 2. DEMONSTRAÇÃO VISUAL — DIFERENCIAIS DO SOFTWARE */}
        <section className="w-full space-y-20 pt-2">
          
          {/* IMAGEM 2: MODELO DIGITAL DE RELEVO (MDR 3D) INTEGRADO NA PRANCHA A3 */}
          <div className="space-y-4 pt-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-black uppercase tracking-wider text-emerald-400">
              <Box className="size-4" /> Modelo Digital de Relevo (MDR 3D) na Prancha
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white">
              Modelo Digital de Relevo 3D Integrado à Prancha Oficial
            </h2>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto">
              Incorpore o Modelo Digital de Relevo 3D com malha TIN wireframe, diagrama de convergência magnética e convenções cartográficas na sua prancha final.
            </p>

            {/* Imagem Real 2: MDR 3D na Prancha */}
            <div className="w-full max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/marca/preview_mdr_planta.png"
                alt="MDR 3D e Convenções na Prancha A3 no Souza-CAD"
                className="w-full h-auto object-contain"
              />
            </div>
          </div>

        </section>

        {/* 3. A HISTÓRIA DO CRIADOR (DARLAN SOUZA - 14 ANOS DE PRÁTICA TÉCNICA) */}
        <section className="w-full max-w-4xl mx-auto py-2">
          <div className="bg-slate-900/70 border border-slate-800/60 p-8 sm:p-12 rounded-2xl text-left space-y-6 backdrop-blur-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <Shield className="size-5" /> A história por trás da ferramenta
            </h3>
            <p className="text-base sm:text-xl text-slate-200 leading-relaxed italic">
              &ldquo;{historia}&rdquo;
            </p>
            <div className="pt-4 flex items-center justify-between text-sm text-slate-400 font-medium border-t border-slate-850">
              <span className="font-bold text-white">— {autorHistoria}</span>
              <span className="text-emerald-400 font-bold">14 Anos de Experiência Prática</span>
            </div>
          </div>
        </section>

        {/* 4. CAIXA DE ESCASSEZ & CREDENCIAMENTO PIONEIRO */}
        <section className="w-full max-w-3xl mx-auto">
          <div className="bg-slate-900/80 border border-emerald-500/20 p-8 sm:p-12 rounded-2xl shadow-xl space-y-8 backdrop-blur-xl relative overflow-hidden">
            
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-6 text-left">
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-wide flex items-center gap-3">
                  <Award className="size-7 text-emerald-400" />
                  {estaEsgotado ? 'Pioneiros Esgotados' : 'VAGAS DE USUÁRIO PIONEIRO'}
                </h2>
                <p className="text-sm text-slate-300 mt-1">
                  {estaEsgotado 
                    ? 'Vagas de teste encerradas. O Souza-CAD opera via planos profissionais para novos usuários.'
                    : 'Como usuário pioneiro, você terá canal direto no WhatsApp do desenvolvedor para opinar, sugerir e ditar as próximas melhorias no software.'
                  }
                </p>
              </div>

              <div className="px-6 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-center shrink-0">
                <span className="text-2xl font-black text-emerald-400 font-mono">{estaEsgotado ? vagasTotais : numUsuarios} / {vagasTotais}</span>
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">Vagas Ativadas</span>
              </div>
            </div>

            {/* Barra de Progresso */}
            <div className="space-y-3 text-left">
              <div className="h-3.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 rounded-full transition-all duration-1000"
                  style={{ width: `${estaEsgotado ? 100 : Math.min(100, (numUsuarios / vagasTotais) * 100)}%` }}
                />
              </div>
              <div className="text-xs sm:text-sm text-emerald-300 font-bold uppercase tracking-wider flex items-center justify-between">
                <span>{estaEsgotado ? 'Plano Comercial Ativado' : `Restam apenas ${vagasRestantes} vagas gratuitas de pioneiro`}</span>
                <span>Acesso Imediato</span>
              </div>
            </div>

            {/* Botão CTA Principal */}
            <button
              type="button"
              onClick={onPioneiro}
              className={`w-full text-white font-black text-lg uppercase py-5 px-8 rounded-2xl transition-all transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-3 shadow-xl ${
                estaEsgotado
                  ? 'bg-amber-600 hover:bg-amber-500'
                  : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              <Zap className="size-6" />
              <span>{estaEsgotado ? 'ADQUIRIR PLANO PROFISSIONAL' : 'SER UM USUÁRIO PIONEIRO'}</span>
              <ArrowRight className="size-6" />
            </button>
          </div>
        </section>

        {/* 5. MÓDULOS DE AUTOMAÇÃO DE CARTÓRIO & PEÇAS TÉCNICAS */}
        <section className="w-full space-y-20 pt-8 border-t border-slate-900/80">
          
          {/* MÓDULO DE REQUERIMENTOS CARTORÁRIOS MULTI-ATOS */}
          <div className="space-y-6">
            <div className="max-w-3xl mx-auto space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-black uppercase tracking-wider text-emerald-400">
                <FileCode className="size-4" /> Cartório & Requerimentos Jurídicos
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                Requerimentos ao Cartório com Enquadramento Jurídico
              </h2>
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-medium">
                Gere minutas prontas em Word (.docx) para Retificação Simples, Doação, Compra e Venda, Remembramento, Desmembramento e Usucapião com a fundamentação legal de registros públicos.
              </p>
            </div>

            {/* Imagem Real do Requerimento Multi-atos */}
            <div className="w-full max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/marca/preview_requerimento.png"
                alt="Requerimentos ao Cartório Multi-Atos no Souza-CAD"
                className="w-full h-auto object-contain"
              />
            </div>
          </div>

          {/* PLANTA TOPOGRÁFICA OFICIAL A3 & EXPORTAÇÃO EM LOTE (PACOTE ZIP) */}
          <div className="space-y-8 pt-4">
            <div className="max-w-3xl mx-auto space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-black uppercase tracking-wider text-emerald-400">
                <Map className="size-4" /> Peças Técnicas & Download do Pacote ZIP
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                Prancha A3/A0 Automática com Todas as Peças num Único Pacote
              </h2>
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-medium">
                Gere de uma só vez a Planta Topográfica A3/A0 impressa, Memorial Descritivo, Requerimento Cartorário, Cartas de Anuência e Errata Perimetral compactados num único Pacote ZIP.
              </p>
            </div>

            {/* Imagem Real da Planta A3 Oficial */}
            <div className="w-full max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/marca/preview_planta_a3.png"
                alt="Planta Topográfica A3 Pronta no Souza-CAD"
                className="w-full h-auto object-contain"
              />
            </div>

            {/* Imagem Real do Menu de Peças Técnicas (ZIP) */}
            <div className="space-y-4 pt-6 max-w-3xl mx-auto">
              <h3 className="text-xl font-black text-white text-left flex items-center gap-2">
                <Download className="size-5 text-emerald-400" /> Exportação em Lote & Baixar Pacote ZIP
              </h3>
              <div className="w-full rounded-2xl overflow-hidden shadow-xl border border-slate-800 bg-slate-950 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/marca/preview_pecas.png"
                  alt="Menu de Peças Técnicas e Pacote ZIP no Souza-CAD"
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>
          </div>

          {/* SUPORTE COMPLETO A CONSELHOS PROFISSIONAIS (CFT, CFTA, CREA) */}
          <div className="space-y-6 pt-4 max-w-4xl mx-auto">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-black uppercase tracking-wider text-emerald-400">
                <AwardIcon className="size-4" /> Habilitação Profissional
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                ART e TRT Automáticos para CFT, CFTA e CREA
              </h2>
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-medium">
                Escolha seu conselho e categoria profissional para emissão automática de TRT (CFT/CFTA) ou ART (CREA) em todas as peças geradas pelo sistema.
              </p>
            </div>

            {/* Imagem Real do Dropdown de Conselhos */}
            <div className="w-full max-w-2xl mx-auto rounded-2xl overflow-hidden shadow-xl border border-slate-800 bg-slate-950 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/marca/preview_conselhos.png"
                alt="Categorias Profissionais e Conselhos CFT, CFTA, CREA no Souza-CAD"
                className="w-full h-auto object-contain"
              />
            </div>
          </div>

          {/* GESTÃO FINANCEIRA, MALHA SIGEF & CONFIGURAÇÃO DA MARCA */}
          <div className="space-y-16 pt-6">
            
            {/* GESTÃO DO PROJETO & CONTRATOS */}
            <div className="space-y-4">
              <div className="max-w-3xl mx-auto space-y-3">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-black uppercase tracking-wider text-emerald-400">
                  <FileText className="size-4" /> Gestão do Projeto & Documentos
                </div>
                <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                  Recibos, Contratos & Declarações com 1 Clique
                </h2>
              </div>

              <div className="w-full max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/marca/preview_gestao.png"
                  alt="Gestão do Projeto, Recibos e Contratos no Souza-CAD"
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>

            {/* AUTOMACÃO DE ERRATAS E MALHA SIGEF */}
            <div className="space-y-4 pt-4">
              <div className="max-w-3xl mx-auto space-y-3">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-black uppercase tracking-wider text-emerald-400">
                  <Layers className="size-4" /> Cartório & Malha SIGEF/INCRA
                </div>
                <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                  Errata Perimétrica Automática e Malha SIGEF Integrada
                </h2>
              </div>

              <div className="w-full max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/marca/preview_modulos.png"
                  alt="Automação de Erratas e Malha SIGEF no Souza-CAD"
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>

            {/* PERSONALIZAÇÃO DA MARCA */}
            <div className="space-y-4 pt-4">
              <div className="max-w-3xl mx-auto space-y-3">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-black uppercase tracking-wider text-emerald-400">
                  <Settings className="size-4" /> Sua Marca & Identidade
                </div>
                <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                  A Sua Empresa em Todas as Peças Técnicas
                </h2>
              </div>

              <div className="w-full max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/marca/preview_config.png"
                  alt="Configurações da Empresa e Assinatura Digital no Souza-CAD"
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>

          </div>

        </section>

        {/* 6. SEÇÃO FINAL: VALIDAÇÕES TÉCNICAS E CTA DE CREDENCIAMENTO */}
        <section className="w-full max-w-4xl mx-auto space-y-10 pt-10 border-t border-slate-900/80">
          <div className="text-center space-y-4">
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Tudo o que seu escritório precisa para produzir mais
            </h2>
            <p className="text-base text-slate-300 max-w-2xl mx-auto">
              Garanta sua vaga de usuário pioneiro e simplifique seu fluxo de agrimensura hoje mesmo.
            </p>
          </div>

          {/* Lista Ampla de Recursos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-left">
            {itensCheck.map((item, idx) => {
              const parts = item.split(':');
              const title = parts[0]?.trim() || '';
              const desc = parts[1]?.trim() || '';
              return (
                <div key={idx} className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-start gap-4">
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                    <Check className="size-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">{title}</h4>
                    {desc && <p className="text-sm text-slate-300 font-normal mt-1 leading-relaxed">{desc}</p>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA Final */}
          <div className="pt-6">
            <button
              type="button"
              onClick={onPioneiro}
              className={`w-full text-white font-black text-lg uppercase py-5 px-8 rounded-2xl transition-all transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-3 shadow-xl ${
                estaEsgotado
                  ? 'bg-amber-600 hover:bg-amber-500'
                  : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              <Zap className="size-6" />
              <span>{estaEsgotado ? 'ADQUIRIR PLANO PROFISSIONAL' : 'SER UM USUÁRIO PIONEIRO AGORA'}</span>
              <ArrowRight className="size-6" />
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
