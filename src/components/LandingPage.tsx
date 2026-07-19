'use client';

import { useState } from 'react';
import { Shield, Zap, Compass, Users, CheckCircle, Smartphone, Monitor, FileText, Layers, Settings, Eye } from 'lucide-react';
import type { LandingPageTexts } from '@/lib/store/suporte';

interface LandingPageProps {
  onPioneiro: () => void;
  numUsuarios: number;
  texts: LandingPageTexts;
}

export default function LandingPage({ onPioneiro, numUsuarios, texts }: LandingPageProps) {
  const [abaPreview, setAbaPreview] = useState<'gestao' | 'modulos' | 'config'>('gestao');

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

        {/* ── SHOWCASE VISUAL DA INTERFACE ── */}
        <section className="w-full space-y-6 pt-4 border-t border-slate-900/80">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider text-emerald-400">
              <Eye className="size-3" /> Módulos & Interface em Ação
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Conheça a poder operacional do Souza-CAD
            </h2>
            <p className="text-xs text-slate-400 max-w-xl mx-auto">
              Tudo o que você precisa para gerenciar contratos, emitir recibos, calcular erratas e automatizar o georreferenciamento numa única tela.
            </p>
          </div>

          {/* Abas do Preview */}
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setAbaPreview('gestao')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                abaPreview === 'gestao'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="size-4" />
              <span>Gestão do Projeto & Contratos</span>
            </button>

            <button
              type="button"
              onClick={() => setAbaPreview('modulos')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                abaPreview === 'modulos'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="size-4" />
              <span>Erratas & Malha SIGEF</span>
            </button>

            <button
              type="button"
              onClick={() => setAbaPreview('config')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                abaPreview === 'config'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Settings className="size-4" />
              <span>Configurações & Marca</span>
            </button>
          </div>

          {/* Moldura Glassmorphism de Janela de Software */}
          <div className="relative rounded-2xl border border-slate-800 bg-slate-900/80 p-2 md:p-3 shadow-[0_0_90px_rgba(16,185,129,0.12)] backdrop-blur-xl overflow-hidden">
            {/* Header de Moldura de Janela (estilo CAD) */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/80 mb-2">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="size-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="size-3 rounded-full bg-emerald-500/80 inline-block" />
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {abaPreview === 'gestao' && 'Souza-CAD — Módulo de Gestão Financeira e Documentos'}
                {abaPreview === 'modulos' && 'Souza-CAD — Automação de Erratas e Vértices Confrontantes'}
                {abaPreview === 'config' && 'Souza-CAD — Configurações da Empresa e Assinatura Digital'}
              </span>
              <div className="size-3" />
            </div>

            {/* Imagem do Preview */}
            <div className="relative rounded-xl overflow-hidden border border-slate-800/60 bg-slate-950 flex items-center justify-center min-h-[320px] max-h-[520px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  abaPreview === 'gestao' ? '/marca/preview_gestao.png' :
                  abaPreview === 'modulos' ? '/marca/preview_modulos.png' :
                  '/marca/preview_config.png'
                }
                alt="Demonstração do Módulo Souza-CAD"
                className="w-full h-auto object-contain max-h-[500px] transition-all duration-300 transform hover:scale-[1.01]"
              />
            </div>

            {/* Legenda Explicativa */}
            <div className="mt-3 px-3 py-2 bg-slate-950/40 rounded-lg border border-slate-850 flex items-center justify-between text-[11px] text-slate-400">
              <span>
                {abaPreview === 'gestao' && '✔ Emissão instantânea de Recibos, Contratos de Prestação de Serviços, Propostas e Declarações em PDF.'}
                {abaPreview === 'modulos' && '✔ Gerador de Errata para Cartório em Word (.docx) e importador oficial de confrontantes do INCRA.'}
                {abaPreview === 'config' && '✔ Personalização completa da sua empresa com Logotipo, Cores e Assinatura Digital em documentos.'}
              </span>
              <span className="text-emerald-400 font-bold text-[10px] uppercase tracking-wider shrink-0 ml-4">Interativo & Automático</span>
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
