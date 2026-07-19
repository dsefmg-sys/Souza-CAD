'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Users, Crown, RefreshCw, Shield, Sparkles,
  DollarSign, Calendar, AlertTriangle, LogOut, Search, TrendingUp, ChevronDown, ChevronUp, Trash2, Mail, Send, FolderOpen, X, Waypoints, MapPin, Copy, Plus, Youtube, Cloud
} from 'lucide-react';
import { collection, getCountFromServer } from 'firebase/firestore';
import { listarPerfisUso, atualizarPerfilUsoPorAdmin, excluirPerfilUsoPorAdmin, type PerfilUso } from '@/lib/store/perfilUso';
import { listarProjetosDoUsuario, salvarProjeto, novoId } from '@/lib/store/projects';
import type { Projeto } from '@/lib/topo/types';
import { carregarConfigAssinatura, salvarConfigAssinatura, type ConfigAssinatura, CONFIG_ASSINATURA_PADRAO } from '@/lib/store/assinatura';
import { carregarWhatsappSuporte, salvarWhatsappSuporte, carregarWhatsappSuporteNome, salvarWhatsappSuporteNome, carregarGeminiApiKey, salvarGeminiApiKey, carregarAppUrl, salvarAppUrl, carregarModo3dAtivado, salvarModo3dAtivado, carregarConfigSmtp, salvarConfigSmtp, carregarYoutubePlaylist, salvarYoutubePlaylist, carregarVideosTutorial, salvarVideosTutorial, carregarLandingPageTexts, salvarLandingPageTexts, LANDING_PADRAO, type ConfigSmtp, type VideoTutorial, type LandingPageTexts } from '@/lib/store/suporte';
import { auth, db as fdb, firebaseConfigurado } from '@/lib/firebase/client';
import { confirmar, avisar } from '@/lib/ui/dialogos';

function dataBR(ms?: number): string {
  if (!ms) return '—';
  const d = new Date(ms);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

const DIAS_ATIVO = 30 * 24 * 60 * 60 * 1000;

interface Props {
  onVoltarDesenhar: () => void;
}

export default function PainelMasterSaaS({ onVoltarDesenhar }: Props) {
  const [perfis, setPerfis] = useState<PerfilUso[]>([]);
  const [cfg, setCfg] = useState<ConfigAssinatura>(CONFIG_ASSINATURA_PADRAO);
  const [zap, setZap] = useState('');
  const [zapNome, setZapNome] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [appUrl, setAppUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [videos, setVideos] = useState<VideoTutorial[]>([]);
  const [novoVideoTitulo, setNovoVideoTitulo] = useState('');
  const [novoVideoUrl, setNovoVideoUrl] = useState('');
  const [formNovoVideoAberto, setFormNovoVideoAberto] = useState(false);
  const [modo3d, setModo3d] = useState(false);
  const [landingTexts, setLandingTexts] = useState<LandingPageTexts>(LANDING_PADRAO);
  const [salvandoLanding, setSalvandoLanding] = useState(false);
  const [smtp, setSmtp] = useState<ConfigSmtp>({});
  const [salvandoSmtp, setSalvandoSmtp] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [msg, setMsg] = useState('');
  const [busca, setBusca] = useState('');
  const [configExpandido, setConfigExpandido] = useState(true);

  // "Ver projetos" de um cliente: diagnóstico só-leitura (nunca abre no editor de verdade — evita
  // qualquer risco de salvar/mexer no trabalho de outra pessoa). Ajuda a ver onde ele travou sem
  // depender só do que o cliente descreve por mensagem.
  const [projetosCliente, setProjetosCliente] = useState<{ uid: string; nome: string; projetos: Projeto[] } | null>(null);
  const [carregandoProjetos, setCarregandoProjetos] = useState(false);
  const [erroProjetos, setErroProjetos] = useState('');
  const [copiandoId, setCopiandoId] = useState<string | null>(null);

  async function verProjetos(uid: string, nome: string) {
    setCarregandoProjetos(true);
    setErroProjetos('');
    setProjetosCliente({ uid, nome, projetos: [] });
    try {
      const projetos = await listarProjetosDoUsuario(uid);
      setProjetosCliente({ uid, nome, projetos });
    } catch (e) {
      setErroProjetos((e as Error).message || 'Não consegui carregar os projetos deste cliente.');
    } finally {
      setCarregandoProjetos(false);
    }
  }

  // Copia o projeto do CLIENTE (só leitura) para o SEU PRÓPRIO gestor de projetos — nunca escreve
  // nada na conta do cliente, só lê (já permitido pelas regras do master) e grava na sua conta
  // (sempre permitido, é a sua própria conta). Ganha um id novo pra não colidir com nada seu.
  async function copiarProjeto(proj: Projeto) {
    const ok = await confirmar({ titulo: 'Copiar projeto', mensagem: `Copiar "${proj.nome}" para o seu gestor de projetos? Isso NÃO altera nada no cadastro do cliente — cria uma cópia independente na sua conta.` });
    if (!ok) return;
    setCopiandoId(proj.id);
    try {
      const agora = Date.now();
      const copia: Projeto = { ...proj, id: novoId(), nome: `${proj.nome} (cópia)`, criadoEm: agora, atualizadoEm: agora };
      delete (copia as { excluidoEm?: number }).excluidoEm;
      await salvarProjeto(copia);
      flash(`"${proj.nome}" copiado para o seu gestor de projetos!`);
    } catch (e) {
      await avisar({ titulo: 'Copiar projeto', mensagem: (e as Error).message || 'Não consegui copiar este projeto.' });
    } finally {
      setCopiandoId(null);
    }
  }

  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [comunicadoExpandido, setComunicadoExpandido] = useState(false);
  const [emailAssunto, setEmailAssunto] = useState('Complete seu cadastro no Souza CAD');
  const [emailTexto, setEmailTexto] = useState('Olá,\n\nNotamos que o seu cadastro no Souza CAD está incompleto. Preencher os dados básicos do seu escritório e do técnico responsável é essencial para gerar as peças técnicas sem erros.\n\nPor favor, acesse o sistema pelo botão abaixo e conclua a configuração do seu perfil.');
  const [emailImagemUrl, setEmailImagemUrl] = useState('');
  const [emailBotaoTexto, setEmailBotaoTexto] = useState('Acessar Souza CAD');
  const [emailBotaoLink, setEmailBotaoLink] = useState('');
  const [enviandoEmails, setEnviandoEmails] = useState(false);

  const selectedEmails = useMemo(() => {
    return perfis
      .filter((p) => selectedUids.includes(p.uid) && p.email)
      .map((p) => p.email) as string[];
  }, [perfis, selectedUids]);

  async function recarregar() {
    setCarregando(true);
    try {
      const listaPerfis = await listarPerfisUso();
      if (firebaseConfigurado && fdb()) {
        const perfisComContagem = await Promise.all(
          listaPerfis.map(async (p) => {
            try {
              const targetUid = p.workspaceUid || p.uid;
              const colRef = collection(fdb()!, 'users', targetUid, 'projetos');
              const snap = await getCountFromServer(colRef);
              return { ...p, totalProjetos: snap.data().count };
            } catch {
              return p;
            }
          })
        );
        setPerfis(perfisComContagem);
      } else {
        setPerfis(listaPerfis);
      }
      setCfg(await carregarConfigAssinatura());
      setZap(await carregarWhatsappSuporte());
      setZapNome(await carregarWhatsappSuporteNome());
      setGeminiKey(await carregarGeminiApiKey());
      const url = await carregarAppUrl();
      setAppUrl(url);
      if (!emailBotaoLink) {
        setEmailBotaoLink(url || (typeof window !== 'undefined' ? window.location.origin : ''));
      }
      setModo3d(await carregarModo3dAtivado());
      setLandingTexts(await carregarLandingPageTexts());
      setSmtp(await carregarConfigSmtp());
      setYoutubeUrl(await carregarYoutubePlaylist());
      setVideos(await carregarVideosTutorial());
    } catch (e) {
      console.error(e);
    } finally {
      setCarregando(false);
    }
  }

  async function salvarLandingTextsConfig() {
    setSalvandoLanding(true);
    try {
      await salvarLandingPageTexts(landingTexts);
      flash('Textos da Landing Page salvas com sucesso!');
    } catch {
      flash('Erro ao salvar os textos da Landing Page.');
    } finally {
      setSalvandoLanding(false);
    }
  }

  async function salvarSmtpConfig() {
    setSalvandoSmtp(true);
    try {
      await salvarConfigSmtp(smtp);
      flash('Credenciais de e-mail salvas!');
    } catch {
      flash('Erro ao salvar as credenciais de e-mail.');
    } finally {
      setSalvandoSmtp(false);
    }
  }

  async function enviarComunicado() {
    const destinatarios = selectedEmails.length > 0 
      ? selectedEmails 
      : perfis.filter((p) => p.email).map((p) => p.email) as string[];

    if (destinatarios.length === 0) {
      await avisar({ titulo: 'Comunicado', mensagem: 'Nenhum e-mail de destino disponível.' });
      return;
    }

    const confirmacao = await confirmar({
      titulo: 'Enviar comunicado',
      mensagem: `Tem certeza que deseja enviar este comunicado para ${destinatarios.length} destinatário(s)?`,
    });
    if (!confirmacao) return;

    setEnviandoEmails(true);
    try {
      const token = await auth()?.currentUser?.getIdToken();
      if (!token) throw new Error('Não autenticado.');

      const mensagemHtml = gerarCorpoEmailHtml({
        assunto: emailAssunto,
        texto: emailTexto,
        imagemUrl: emailImagemUrl || undefined,
        botaoTexto: emailBotaoTexto,
        botaoLink: emailBotaoLink,
        whatsappSupport: zap
      });

      const response = await fetch('/api/saas/enviar-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          emails: destinatarios,
          assunto: emailAssunto,
          mensagemHtml
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Erro no envio.');
      }

      await avisar({ titulo: 'Comunicado', mensagem: resData.mensagem || 'E-mails enviados com sucesso!' });
    } catch (err: unknown) {
      console.error(err);
      await avisar({ titulo: 'Comunicado', mensagem: `Falha ao disparar e-mails: ${(err as Error).message}` });
    } finally {
      setEnviandoEmails(false);
    }
  }

  useEffect(() => {
    recarregar();
  }, []);

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(''), 2500);
  };

  async function alterarOcultarCobranca(val: boolean) {
    const novaCfg = { ...cfg, ocultarCobranca: val };
    setCfg(novaCfg);
    try { 
      await salvarConfigAssinatura(novaCfg); 
      flash('Configuração de cobrança salva!');
    } catch {
      flash('Erro ao salvar cobrança.');
    }
  }

  async function salvarZap() {
    try {
      await salvarWhatsappSuporte(zap);
      await salvarWhatsappSuporteNome(zapNome);
      flash('Suporte WhatsApp salvo!');
    } catch {
      flash('Erro ao salvar WhatsApp.');
    }
  }

  async function salvarGemini() {
    try {
      await salvarGeminiApiKey(geminiKey);
      flash('Chave Gemini salva!');
    } catch {
      flash('Erro ao salvar chave.');
    }
  }

  async function alterarModo3d(val: boolean) {
    setModo3d(val);
    try {
      await salvarModo3dAtivado(val);
      flash(val ? 'Modo 3D ativado para os clientes.' : 'Modo 3D desativado.');
    } catch {
      flash('Erro ao salvar Modo 3D.');
    }
  }

  async function salvarAppUrlConfig() {
    try {
      await salvarAppUrl(appUrl);
      flash('Link do App salvo!');
    } catch {
      flash('Erro ao salvar Link do App.');
    }
  }

  async function salvarYoutubeUrlConfig() {
    try {
      await salvarYoutubePlaylist(youtubeUrl);
      flash('Link da playlist salvo!');
    } catch {
      flash('Erro ao salvar o link da playlist.');
    }
  }

  async function adicionarVideo() {
    if (!novoVideoTitulo.trim() || !novoVideoUrl.trim()) { flash('Preencha o título e o link do vídeo.'); return; }
    const novaLista = [...videos, { titulo: novoVideoTitulo.trim(), url: novoVideoUrl.trim() }];
    try {
      await salvarVideosTutorial(novaLista);
      setVideos(novaLista);
      setNovoVideoTitulo(''); setNovoVideoUrl(''); setFormNovoVideoAberto(false);
      flash('Vídeo adicionado!');
    } catch {
      flash('Erro ao salvar o vídeo.');
    }
  }

  async function removerVideo(idx: number) {
    const novaLista = videos.filter((_, i) => i !== idx);
    try {
      await salvarVideosTutorial(novaLista);
      setVideos(novaLista);
    } catch {
      flash('Erro ao remover o vídeo.');
    }
  }

  // Lógica de salvamento individual do CRM / Faturamento por cliente
  async function atualizarClienteCRM(clientUid: string, patch: Partial<PerfilUso>) {
    try {
      await atualizarPerfilUsoPorAdmin(clientUid, patch);
      setPerfis((prev) => prev.map((p) => p.uid === clientUid ? { ...p, ...patch } : p));
      flash('Dados do cliente salvos!');
    } catch (e: unknown) {
      console.error(e);
      flash((e as Error).message || 'Erro ao salvar CRM.');
    }
  }

  async function deletarCliente(uid: string, identificacao?: string) {
    const confirmacao = await confirmar({
      titulo: 'Excluir cadastro',
      mensagem: `Tem certeza que deseja excluir permanentemente o cadastro de "${identificacao || uid}"? Esta ação não pode ser desfeita e removerá todos os dados e projetos do usuário.`,
      perigo: true,
    });
    if (!confirmacao) return;

    try {
      await excluirPerfilUsoPorAdmin(uid);
      setPerfis((prev) => prev.filter((p) => p.uid !== uid));
      flash('Cadastro excluído com sucesso!');
    } catch (e: unknown) {
      console.error(e);
      flash((e as Error).message || 'Erro ao excluir cadastro.');
    }
  }

  const agora = perfis.length ? Math.max(...perfis.map((p) => p.ultimoAcessoEm ?? 0), Date.now()) : Date.now();
  const ativos = useMemo(() => perfis.filter((p) => (agora - (p.ultimoAcessoEm ?? p.ultimoProjetoEm ?? 0)) < DIAS_ATIVO), [perfis, agora]);
  const totalProjetos = useMemo(() => perfis.reduce((sum, p) => sum + (p.totalProjetos ?? 0), 0), [perfis]);

  // Filtrar perfis pela busca
  const perfisFiltrados = useMemo(() => {
    if (!busca.trim()) return perfis;
    const q = busca.toLowerCase();
    return perfis.filter((p) =>
      (p.empresaNome || '').toLowerCase().includes(q) ||
      (p.rtNome || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q)
    );
  }, [perfis, busca]);

  // Cálculos REAIS de Faturamento
  const faturamentoReal = useMemo(() => {
    let previsto = 0;
    let recebido = 0;
    let inadimplente = 0;
    let inadimplenteCont = 0;
    let isentoCont = 0;

    for (const p of perfis) {
      const valor = p.mensalidade !== undefined ? p.mensalidade : 150;
      const status = p.statusPagamento || 'atrasado';

      if (status === 'isento') {
        isentoCont++;
      } else {
        previsto += valor;
        if (status === 'pago') {
          recebido += valor;
        } else if (status === 'atrasado') {
          inadimplente += valor;
          inadimplenteCont++;
        }
      }
    }

    return { previsto, recebido, inadimplente, inadimplenteCont, isentoCont };
  }, [perfis]);

  const taxaAdimplencia = faturamentoReal.previsto > 0 
    ? Math.round((faturamentoReal.recebido / faturamentoReal.previsto) * 100) 
    : 0;

  return (
    <div className="flex h-full flex-col bg-zinc-950 text-zinc-50 overflow-hidden font-sans">
      {/* ─── Header ─── */}
      <div className="shrink-0 border-b border-zinc-800 px-6 py-4 bg-zinc-900/60 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-black tracking-tight">
              <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/20">
                <Crown className="size-5 text-zinc-950" />
              </div>
              <span className="bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">PAINEL DO PROPRIETÁRIO</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-1 ml-[46px]">Gestão administrativa, CRM de faturamento e uso real de Souza-CAD</p>
          </div>
          <div className="flex items-center gap-3">
            {msg && (
              <span className="text-xs font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-800/40 px-3 py-1.5 rounded-lg animate-pulse shadow-lg shadow-emerald-500/10">
                {msg}
              </span>
            )}
            <label className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 px-2.5 hover:bg-zinc-800 transition-colors"
              title="Modo 3D (relevo): mostra o botão de visualização 3D do terreno para os clientes. Desligado por padrão enquanto amadurece. Os clientes precisam recarregar o app para a mudança valer.">
              <input type="checkbox" className="rounded text-zinc-950 focus:ring-emerald-500 size-3.5 border-zinc-700 accent-emerald-500"
                checked={modo3d} onChange={(e) => alterarModo3d(e.target.checked)} />
              <span className="text-xs font-bold text-zinc-300 whitespace-nowrap">Modo 3D</span>
            </label>
            <Button size="sm" variant="outline" className="h-9 gap-1.5 border-zinc-750 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 font-semibold" onClick={recarregar} disabled={carregando}>
              <RefreshCw className={`size-4 ${carregando ? 'animate-spin' : ''}`} /> Atualizar
            </Button>
            <Button size="sm" className="h-9 gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-extrabold shadow-lg shadow-amber-500/20 border-0" onClick={onVoltarDesenhar}>
              <LogOut className="size-4 rotate-180" /> Voltar a Desenhar
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Conteúdo com scroll ─── */}
      <div className="flex-1 min-h-0 overflow-auto px-6 py-5 space-y-5">

        {/* ─── Grid de KPIs ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: 'Fat. Previsto', valor: `R$ ${faturamentoReal.previsto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, sub: 'Soma das mensalidades (não isentos)', cor: 'text-white', icone: <Calendar className="size-5 text-indigo-400" />, borda: 'border-indigo-500/20' },
            { label: 'Fat. Recebido', valor: `R$ ${faturamentoReal.recebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, sub: 'Mensalidades marcadas como PAGO', cor: 'text-emerald-400', icone: <DollarSign className="size-5 text-emerald-400" />, borda: 'border-emerald-500/20' },
            { label: 'Inadimplência', valor: `R$ ${faturamentoReal.inadimplente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, sub: `${faturamentoReal.inadimplenteCont} clientes pendentes`, cor: 'text-red-400', icone: <AlertTriangle className="size-5 text-red-400" />, borda: 'border-red-500/20' },
            { label: 'Adimplência', valor: `${taxaAdimplencia}%`, sub: `${faturamentoReal.recebido > 0 ? 'Pagos / Previstos' : 'Sem dados'}`, cor: 'text-cyan-400', icone: <TrendingUp className="size-5 text-cyan-400" />, borda: 'border-cyan-500/20' },
            { label: 'Clientes', valor: `${perfis.length}`, sub: `${ativos.length} ativos · ${faturamentoReal.isentoCont} isentos · ${totalProjetos} projetos`, cor: 'text-amber-400', icone: <Users className="size-5 text-amber-400" />, borda: 'border-amber-500/20' },
          ].map((kpi) => (
            <div key={kpi.label} className={`rounded-xl border ${kpi.borda} bg-zinc-900/60 p-4 shadow-lg backdrop-blur-sm hover:bg-zinc-800/60 transition-colors`}>
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-bold uppercase tracking-wider">{kpi.label}</span>
                {kpi.icone}
              </div>
              <div className={`mt-2 text-2xl font-black ${kpi.cor}`}>{kpi.valor}</div>
              <div className="text-xs text-zinc-500 mt-1 leading-snug">{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* ─── Configurações colapsáveis ─── */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 shadow-lg backdrop-blur-sm overflow-hidden">
          <button type="button" onClick={() => setConfigExpandido((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-zinc-800/40 transition-colors">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Shield className="size-4" /> Parâmetros e Credenciais Globais
            </h2>
            {configExpandido ? <ChevronUp className="size-4 text-zinc-400" /> : <ChevronDown className="size-4 text-zinc-400" />}
          </button>

          {configExpandido && (
            <div className="px-5 pb-5 pt-2 border-t border-zinc-800/60">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* WhatsApp */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-400">Suporte Técnico WhatsApp</Label>
                  <div className="space-y-1.5 bg-zinc-900/30 p-2 rounded border border-zinc-800">
                    <div>
                      <Label className="text-[10px] text-zinc-500 font-bold uppercase">Nome de Exibição</Label>
                      <Input placeholder="Ex.: Darlan Souza" value={zapNome} onChange={(e) => setZapNome(e.target.value)} className="h-8 text-xs bg-zinc-950 border-zinc-800 text-white focus-visible:ring-amber-500 placeholder:text-zinc-700" />
                    </div>
                    <div>
                      <Label className="text-[10px] text-zinc-500 font-bold uppercase">Número (com DDD)</Label>
                      <Input placeholder="Ex.: 32 9 9999-9999" value={zap} onChange={(e) => setZap(e.target.value)} className="h-8 text-xs bg-zinc-950 border-zinc-800 text-white focus-visible:ring-amber-500 placeholder:text-zinc-700" />
                    </div>
                    <Button size="sm" onClick={salvarZap} className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold h-8 text-xs mt-1">Salvar Suporte</Button>
                  </div>
                  <p className="text-[10px] text-zinc-500">Mostrado no tutorial dos clientes em verde com nome e número.</p>
                </div>

                {/* Gemini Key */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-400">Chave de API do Gemini IA</Label>
                  <div className="flex gap-2">
                    <Input type="password" placeholder="AIzaSy..." value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} className="h-10 text-sm bg-zinc-950 border-zinc-800 focus-visible:ring-amber-500 text-white placeholder:text-zinc-700" />
                    <Button size="sm" onClick={salvarGemini} className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold h-10 px-4">Salvar</Button>
                  </div>
                  <p className="text-xs text-zinc-500">Usada no servidor para extrair dados de matrículas.</p>
                </div>

                {/* Link do App */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-400">Link Oficial do App (Souza CAD)</Label>
                  <div className="flex gap-2">
                    <Input placeholder="https://..." value={appUrl} onChange={(e) => setAppUrl(e.target.value)} className="h-10 text-sm bg-zinc-950 border-zinc-800 focus-visible:ring-amber-500 text-white placeholder:text-zinc-700" />
                    <Button size="sm" onClick={salvarAppUrlConfig} className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold h-10 px-4">Salvar</Button>
                  </div>
                  <p className="text-xs text-zinc-500">Link base usado nas peças e compartilhamento.</p>
                </div>

                {/* Playlist de vídeos no YouTube */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-400">Playlist de vídeos-tutorial (YouTube)</Label>
                  <div className="flex gap-2">
                    <Input placeholder="https://www.youtube.com/playlist?list=..." value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} className="h-10 text-sm bg-zinc-950 border-zinc-800 focus-visible:ring-amber-500 text-white placeholder:text-zinc-700" />
                    <Button size="sm" onClick={salvarYoutubeUrlConfig} className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold h-10 px-4">Salvar</Button>
                  </div>
                  <p className="text-xs text-zinc-500">Link do botão &quot;Curso completo&quot;, dentro da lista de vídeos do app (abre a playlist inteira).</p>
                </div>

                {/* Vídeos por tema */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-zinc-400">Vídeos tutoriais por tema</Label>
                    <Button size="sm" variant="outline" onClick={() => setFormNovoVideoAberto((v) => !v)} className="h-8 gap-1 border-zinc-800 text-emerald-400 hover:bg-zinc-800">
                      <Plus className="size-3.5" /> Adicionar vídeo
                    </Button>
                  </div>
                  {formNovoVideoAberto && (
                    <div className="space-y-2 rounded-lg border border-zinc-850 bg-zinc-950 p-3">
                      <Input placeholder="Título (ex.: Como importar pontos do GNSS)" value={novoVideoTitulo} onChange={(e) => setNovoVideoTitulo(e.target.value)} className="h-9 text-sm bg-zinc-900 border-zinc-800 focus-visible:ring-amber-500 text-white placeholder:text-zinc-700" />
                      <Input placeholder="https://www.youtube.com/watch?v=..." value={novoVideoUrl} onChange={(e) => setNovoVideoUrl(e.target.value)} className="h-9 text-sm bg-zinc-900 border-zinc-800 focus-visible:ring-amber-500 text-white placeholder:text-zinc-700" />
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => { setFormNovoVideoAberto(false); setNovoVideoTitulo(''); setNovoVideoUrl(''); }} className="text-zinc-400 hover:bg-zinc-800">Cancelar</Button>
                        <Button size="sm" onClick={adicionarVideo} className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold">Salvar vídeo</Button>
                      </div>
                    </div>
                  )}
                  {videos.length > 0 ? (
                    <div className="space-y-1.5">
                      {videos.map((v, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
                          <Youtube className="size-4 shrink-0 text-red-500" />
                          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white" title={v.titulo}>{v.titulo}</span>
                          <button type="button" onClick={() => removerVideo(i)} title="Remover este vídeo" className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-red-400 transition-colors">
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500">Nenhum vídeo cadastrado ainda.</p>
                  )}
                </div>

                {/* Personalização da Landing Page */}
                <div className="space-y-2 col-span-1 md:col-span-2 border-t border-zinc-800/80 pt-4 mt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Textos Personalizados da Landing Page</Label>
                      <p className="text-[10px] text-zinc-500">Altere a headline, história e diferenciais exibidos na apresentação inicial.</p>
                    </div>
                    <Button size="sm" onClick={salvarLandingTextsConfig} disabled={salvandoLanding} className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold h-8 text-xs">
                      {salvandoLanding ? 'Salvando...' : 'Salvar Textos da Landing'}
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-zinc-400 uppercase">Headline / Título Principal</Label>
                      <Input value={landingTexts.titulo || ''} onChange={(e) => setLandingTexts(prev => ({ ...prev, titulo: e.target.value }))} className="h-8 text-xs bg-zinc-900 border-zinc-800 text-white" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-zinc-400 uppercase">Autor / Assinatura da História</Label>
                      <Input value={landingTexts.autorHistoria || ''} onChange={(e) => setLandingTexts(prev => ({ ...prev, autorHistoria: e.target.value }))} className="h-8 text-xs bg-zinc-900 border-zinc-800 text-white" />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-[10px] font-bold text-zinc-400 uppercase">Subtítulo / Descrição</Label>
                      <Input value={landingTexts.subtitulo || ''} onChange={(e) => setLandingTexts(prev => ({ ...prev, subtitulo: e.target.value }))} className="h-8 text-xs bg-zinc-900 border-zinc-800 text-white" />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-[10px] font-bold text-zinc-400 uppercase">História do Agrimensor Programador</Label>
                      <textarea value={landingTexts.historia || ''} onChange={(e) => setLandingTexts(prev => ({ ...prev, historia: e.target.value }))} className="w-full h-20 p-2 text-xs rounded border border-zinc-800 bg-zinc-900 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                    </div>
                  </div>
                </div>

                {/* Ocultar cobrança */}
                <div className="flex items-start">
                  <label className="flex items-start gap-3 rounded-xl border border-amber-600/25 bg-amber-600/5 p-4 cursor-pointer hover:bg-amber-600/10 transition-colors w-full h-full">
                    <input
                      type="checkbox"
                      className="rounded text-zinc-950 focus:ring-amber-500 size-4 mt-0.5 border-zinc-700 accent-amber-500"
                      checked={!!cfg.ocultarCobranca}
                      onChange={(e) => alterarOcultarCobranca(e.target.checked)}
                    />
                    <div className="space-y-1">
                      <span className="text-sm font-bold text-amber-300">Ocultar cobrança</span>
                      <p className="text-xs text-zinc-400 leading-snug">Se ativado, clientes usam de graça — sem alertas ou telas de planos.</p>
                    </div>
                  </label>
                </div>

              </div>

              {/* Servidor de e-mail (SMTP): credenciais pra disparar comunicados de verdade */}
              <div className="mt-5 rounded-xl border border-indigo-500/25 bg-indigo-500/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="size-4 text-indigo-400" />
                  <span className="text-xs font-bold uppercase tracking-wide text-indigo-300">Servidor de E-mail (SMTP) — para disparar comunicados reais</span>
                </div>
                <p className="text-xs text-zinc-400 leading-snug">
                  Cole aqui as informações da conta de e-mail que vai disparar os comunicados. Pra Gmail: o host é <code className="text-indigo-300 font-bold">smtp.gmail.com</code>, a porta é <code className="text-indigo-300 font-bold">465</code>, o usuário é o próprio endereço de e-mail, e a senha precisa ser uma &quot;senha de app&quot; gerada nas configurações de segurança do Google.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-zinc-400">Servidor (host)</Label>
                    <Input placeholder="smtp.gmail.com" value={smtp.host ?? ''} onChange={(e) => setSmtp((s) => ({ ...s, host: e.target.value }))} className="h-10 text-sm bg-zinc-950 border-zinc-800 focus-visible:ring-indigo-500 text-white placeholder:text-zinc-700" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-zinc-400">Porta</Label>
                    <Input placeholder="465" value={smtp.port ?? ''} onChange={(e) => setSmtp((s) => ({ ...s, port: e.target.value }))} className="h-10 text-sm bg-zinc-950 border-zinc-800 focus-visible:ring-indigo-500 text-white placeholder:text-zinc-700" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-zinc-400">E-mail remetente</Label>
                    <Input placeholder="seuemail@provedor.com" value={smtp.user ?? ''} onChange={(e) => setSmtp((s) => ({ ...s, user: e.target.value }))} className="h-10 text-sm bg-zinc-950 border-zinc-800 focus-visible:ring-indigo-500 text-white placeholder:text-zinc-700" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-zinc-400">Senha de app</Label>
                    <Input type="password" placeholder="•••• •••• •••• ••••" value={smtp.pass ?? ''} onChange={(e) => setSmtp((s) => ({ ...s, pass: e.target.value }))} className="h-10 text-sm bg-zinc-950 border-zinc-800 focus-visible:ring-indigo-500 text-white placeholder:text-zinc-700" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-zinc-400">Nome de exibição (opcional)</Label>
                    <Input placeholder="Souza CAD <remetente@provedor.com>" value={smtp.from ?? ''} onChange={(e) => setSmtp((s) => ({ ...s, from: e.target.value }))} className="h-10 text-sm bg-zinc-950 border-zinc-800 focus-visible:ring-indigo-500 text-white placeholder:text-zinc-700" />
                  </div>
                </div>
                <Button size="sm" onClick={salvarSmtpConfig} disabled={salvandoSmtp} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-10 px-4">
                  {salvandoSmtp ? 'Salvando...' : 'Salvar Credenciais de E-mail'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ─── Painel de E-mail / Comunicado ─── */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 shadow-lg backdrop-blur-sm overflow-hidden">
          <button type="button" onClick={() => setComunicadoExpandido((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-zinc-800/40 transition-colors">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <Mail className="size-4" /> Disparar Comunicado / E-mail ({selectedEmails.length > 0 ? `${selectedEmails.length} selecionado(s)` : 'Todos os clientes'})
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">
                {comunicadoExpandido ? 'Recolher painel' : 'Expandir painel de e-mail'}
              </span>
              {comunicadoExpandido ? <ChevronUp className="size-4 text-zinc-400" /> : <ChevronDown className="size-4 text-zinc-400" />}
            </div>
          </button>

          {comunicadoExpandido && (
            <div className="p-5 border-t border-zinc-800/60 bg-zinc-950/60">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Form Compositor (Esquerda) */}
                <div className="space-y-4 text-left">
                  <div className="text-xs font-bold uppercase tracking-wide text-zinc-400">Editor do Comunicado</div>
                  
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-zinc-400">Assunto do E-mail</Label>
                    <Input
                      value={emailAssunto}
                      onChange={(e) => setEmailAssunto(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 focus-visible:ring-emerald-500 text-white placeholder:text-zinc-700"
                      placeholder="Assunto da mensagem"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-zinc-400">Mensagem (Texto com quebras de linha)</Label>
                    <textarea
                      value={emailTexto}
                      onChange={(e) => setEmailTexto(e.target.value)}
                      rows={6}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-white placeholder:text-zinc-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 resize-y font-sans"
                      placeholder="Olá, escreva aqui a mensagem..."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-zinc-400">Texto do Botão de Acesso</Label>
                      <Input
                        value={emailBotaoTexto}
                        onChange={(e) => setEmailBotaoTexto(e.target.value)}
                        className="bg-zinc-950 border-zinc-800 focus-visible:ring-emerald-500 text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-zinc-400">Link do Botão de Acesso</Label>
                      <Input
                        value={emailBotaoLink}
                        onChange={(e) => setEmailBotaoLink(e.target.value)}
                        className="bg-zinc-950 border-zinc-800 focus-visible:ring-emerald-500 text-white placeholder:text-zinc-700"
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-zinc-400">URL de Imagem no E-mail (Opcional)</Label>
                    <Input
                      value={emailImagemUrl}
                      onChange={(e) => setEmailImagemUrl(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 focus-visible:ring-emerald-500 text-white placeholder:text-zinc-700"
                      placeholder="https://exemplo.com/imagem.png"
                    />
                  </div>

                  <div className="p-3 bg-emerald-950/20 rounded-lg border border-emerald-900/30 text-xs text-zinc-400 space-y-1">
                    <div className="font-bold text-white">Destinatários Selecionados:</div>
                    <div>
                      {selectedEmails.length > 0 
                        ? `${selectedEmails.length} e-mail(s) marcados na tabela abaixo.` 
                        : `Nenhum e-mail marcado. O disparo será feito para TODOS os ${perfis.filter(p => p.email).length} clientes do CRM.`}
                    </div>
                  </div>

                  <Button
                    onClick={enviarComunicado}
                    disabled={enviandoEmails || (selectedEmails.length === 0 && perfis.length === 0)}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold gap-2 shadow-lg shadow-emerald-500/20"
                  >
                    <Send className="size-4" /> {enviandoEmails ? 'Disparando...' : 'Disparar Comunicado'}
                  </Button>
                </div>

                {/* Real-time HTML Preview (Direita) */}
                <div className="space-y-4 flex flex-col text-left">
                  <div className="text-xs font-bold uppercase tracking-wide text-zinc-400 flex items-center justify-between">
                    <span>Prévia Visual (Como o cliente receberá)</span>
                    <span className="text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-800/30 px-2 py-0.5 rounded">Identidade Oficial</span>
                  </div>
                  
                  <div className="flex-grow border border-zinc-800 rounded-lg overflow-hidden bg-white max-h-[460px] overflow-y-auto">
                    <div className="p-4 bg-[#f4f7f5] text-left">
                      <div className="max-w-[480px] mx-auto bg-white rounded-lg shadow-sm border border-zinc-200 overflow-hidden text-zinc-800" style={{ fontFamily: 'sans-serif' }}>
                        <div className="bg-[#0a1f14] p-4 text-center">
                          <h1 className="text-white text-base font-extrabold tracking-wider" style={{ margin: 0 }}>
                            <span className="text-emerald-400">SOUZA</span> <span className="text-zinc-400">CAD</span>
                          </h1>
                          <p className="text-[9px] text-emerald-400 uppercase tracking-widest font-bold" style={{ margin: '2px 0 0 0' }}>Tecnologia no Campo</p>
                        </div>
                        <div className="p-5">
                          <h2 className="text-sm font-bold text-zinc-900 mb-3" style={{ margin: '0 0 12px 0' }}>{emailAssunto}</h2>
                          <div className="text-xs text-zinc-600 leading-relaxed whitespace-pre-line" style={{ margin: '0 0 16px 0' }}>
                            {emailTexto}
                          </div>
                          {emailImagemUrl && (
                            <div className="my-4 text-center" style={{ margin: '16px 0' }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={emailImagemUrl} alt="Preview" className="max-w-full rounded border border-zinc-200" style={{ maxHeight: '180px', objectFit: 'contain' }} />
                            </div>
                          )}
                          <div className="text-center mt-5" style={{ margin: '20px 0 10px 0' }}>
                            <span className="inline-block bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded shadow-sm text-center" style={{ textDecoration: 'none' }}>
                                {emailBotaoTexto}
                            </span>
                          </div>
                        </div>
                        <div className="bg-[#fafafa] p-3 text-center border-t border-zinc-150 text-[10px] text-zinc-400">
                          <p style={{ margin: 0 }}>Souza CAD © 2026. Todos os direitos reservados.</p>
                          {zap && <p style={{ margin: '4px 0 0 0' }}>Suporte WhatsApp: <span className="text-emerald-500 font-bold">{zap}</span></p>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>

        {/* ─── Tabela CRM e Faturamento ─── */}
        <div className="flex-1 border border-zinc-800 rounded-xl bg-zinc-900/20 shadow-lg overflow-hidden flex flex-col">
          <div className="bg-zinc-900/80 px-5 py-3 border-b border-zinc-800/80 flex shrink-0 justify-between items-center gap-4">
            <div className="flex flex-col text-left">
              <span className="text-sm font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Sparkles className="size-4" /> CRM & Faturamento ({perfisFiltrados.length}{busca ? ` de ${perfis.length}` : ''})
              </span>
              <span className="text-xs text-zinc-400 mt-0.5">Os dados editados são salvos automaticamente ao sair do campo.</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="h-9 w-52 rounded-lg border border-zinc-800 bg-zinc-950 pl-8 pr-3 text-xs text-white placeholder:text-zinc-700 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                />
              </div>
              <span className="text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-800/30 px-2.5 py-1 rounded-full font-bold whitespace-nowrap">CRM Ativo</span>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {carregando ? (
              <div className="p-8 text-center text-xs text-zinc-400">
                <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-amber-500" />
                Carregando perfis...
              </div>
            ) : perfisFiltrados.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400">
                {busca ? `Nenhum resultado para "${busca}".` : 'Nenhum perfil de uso encontrado.'}
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-zinc-950 text-zinc-400 text-xs uppercase font-bold tracking-wider border-b border-zinc-800 z-10">
                  <tr>
                    <th className="px-4 py-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={perfisFiltrados.length > 0 && selectedUids.length === perfisFiltrados.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUids(perfisFiltrados.map((p) => p.uid));
                            setComunicadoExpandido(true);
                          } else {
                            setSelectedUids([]);
                          }
                        }}
                        className="rounded text-zinc-950 focus:ring-emerald-500 size-4 mt-0.5 border-zinc-750 accent-emerald-500 cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-3 min-w-[140px]">Cliente / RT</th>
                    <th className="px-4 py-3">E-mail</th>
                    <th className="px-2 py-3 text-center w-24" title="Quantidade de projetos salvos na nuvem pelo usuário">Projetos (Nuvem)</th>
                    <th className="px-2 py-3 text-center w-28">Mensalidade (R$)</th>
                    <th className="px-2 py-3 text-center w-20">Venc. Dia</th>
                    <th className="px-2 py-3 text-center w-28">Faturamento</th>
                    <th className="px-4 py-3 min-w-[170px]">Anotações / Obs. Contrato</th>
                    <th className="px-4 py-3 text-center w-20">Uso</th>
                    <th className="px-4 py-3 text-center w-16">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {perfisFiltrados.map((p) => {
                    const ativo = (agora - (p.ultimoAcessoEm ?? p.ultimoProjetoEm ?? 0)) < DIAS_ATIVO;
                    const status = p.statusPagamento || 'atrasado';
                    // Etapa 2b: cobrança é da EMPRESA. Quem é membro (vinculado a outra conta) não
                    // edita faturamento próprio aqui — segue o status de quem ele ajuda. Editar só
                    // faz sentido na linha do DONO (workspaceUid vazio ou apontando pra si mesmo).
                    const souMembro = !!p.workspaceUid && p.workspaceUid !== p.uid;
                    const dono = souMembro ? perfis.find((x) => x.uid === p.workspaceUid) : null;
                    if (souMembro) {
                      return (
                        <tr key={p.uid} className="hover:bg-zinc-900/30 transition-colors">
                          <td className="px-4 py-2.5 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={selectedUids.includes(p.uid)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedUids((prev) => [...prev, p.uid]);
                                  setComunicadoExpandido(true);
                                } else {
                                  setSelectedUids((prev) => prev.filter((id) => id !== p.uid));
                                }
                              }}
                              className="rounded text-zinc-950 focus:ring-emerald-500 size-4 mt-0.5 border-zinc-750 accent-emerald-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="font-bold text-white leading-tight text-sm">{p.empresaNome || 'Sem Empresa'}</div>
                            <div className="text-xs text-zinc-400 mt-0.5">{p.rtNome || 'RT não cadastrado'}{p.rtCft ? ` (CFT: ${p.rtCft})` : ''}</div>
                          </td>
                          <td className="px-4 py-2.5 text-zinc-400 select-all text-xs">
                            <div>{p.email || '—'}</div>
                            {p.ultimoAcessoEm ? (
                              <div className="text-amber-400 font-semibold mt-0.5">login {dataBR(p.ultimoAcessoEm)}</div>
                            ) : null}
                          </td>
                          <td className="px-2 py-2.5 text-center">
                            <button type="button" title="Ver projetos salvos na nuvem deste cliente" onClick={() => verProjetos(p.uid, p.empresaNome || p.email || p.uid)} className="inline-flex items-center justify-center gap-1 font-extrabold text-emerald-400 hover:text-emerald-300 hover:underline text-xs bg-emerald-950/40 border border-emerald-800/40 px-2 py-1 rounded-md transition-colors"><Cloud className="size-3.5 text-emerald-400 shrink-0" /> <span>{p.totalProjetos ?? 0}</span></button>
                          </td>
                          <td colSpan={3} className="px-4 py-2.5 text-center text-xs text-zinc-500 italic">
                            Membro — cobrança segue a empresa de {dono?.empresaNome || dono?.email || 'outra conta'}
                          </td>
                          <td className="px-4 py-2.5">
                            <input
                              type="text"
                              placeholder="Anotações internas..."
                              defaultValue={p.observacoesAdmin || ''}
                              onBlur={(e) => {
                                const val = e.target.value;
                                if (val !== (p.observacoesAdmin || '')) {
                                  atualizarClienteCRM(p.uid, { observacoesAdmin: val });
                                }
                              }}
                              className="w-full h-9 bg-zinc-950 border border-zinc-800 rounded-lg text-white px-3 text-xs focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 placeholder-zinc-700 transition-colors"
                            />
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider ${ativo ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-700/40 shadow-sm shadow-emerald-500/10' : 'bg-zinc-950/60 text-zinc-450 border border-zinc-700/40'}`}>{ativo ? 'ativo' : 'inativo'}</span>
                          </td>
                          <td className="px-4 py-2.5 text-center flex justify-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg"
                              title="Ver os projetos deste cliente (só leitura) — pra achar onde ele travou"
                              onClick={() => verProjetos(p.uid, p.empresaNome || p.email || p.uid)}
                            >
                              <FolderOpen className="size-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                              title="Excluir cadastro permanentemente"
                              onClick={() => deletarCliente(p.uid, p.email || p.empresaNome)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={p.uid} className="hover:bg-zinc-900/30 transition-colors">
                        <td className="px-4 py-2.5 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={selectedUids.includes(p.uid)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUids((prev) => [...prev, p.uid]);
                                setComunicadoExpandido(true);
                              } else {
                                setSelectedUids((prev) => prev.filter((id) => id !== p.uid));
                              }
                            }}
                            className="rounded text-zinc-950 focus:ring-emerald-500 size-4 mt-0.5 border-zinc-750 accent-emerald-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="font-bold text-white leading-tight text-sm">{p.empresaNome || 'Sem Empresa'}</div>
                          <div className="text-xs text-zinc-400 mt-0.5">{p.rtNome || 'RT não cadastrado'}{p.rtCft ? ` (CFT: ${p.rtCft})` : ''}</div>
                        </td>
                        <td className="px-4 py-2.5 text-zinc-400 select-all text-xs">
                          <div>{p.email || '—'}</div>
                          {p.ultimoAcessoEm ? (
                            <div className="text-amber-400 font-semibold mt-0.5">login {dataBR(p.ultimoAcessoEm)}</div>
                          ) : null}
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          <button type="button" title="Ver projetos salvos na nuvem deste cliente" onClick={() => verProjetos(p.uid, p.empresaNome || p.email || p.uid)} className="inline-flex items-center justify-center gap-1 font-extrabold text-emerald-400 hover:text-emerald-300 hover:underline text-xs bg-emerald-950/40 border border-emerald-800/40 px-2 py-1 rounded-md transition-colors"><Cloud className="size-3.5 text-emerald-400 shrink-0" /> <span>{p.totalProjetos ?? 0}</span></button>
                        </td>
                        
                        {/* CRM: Mensalidade */}
                        <td className="px-2 py-2.5 text-center">
                          <input
                            type="number"
                            defaultValue={p.mensalidade !== undefined ? p.mensalidade : 150}
                            onBlur={(e) => {
                              const val = e.target.value !== '' ? Number(e.target.value) : 150;
                              if (val !== p.mensalidade) {
                                atualizarClienteCRM(p.uid, { mensalidade: val });
                              }
                            }}
                            className="w-20 h-9 text-center bg-zinc-950 border border-zinc-800 rounded-lg text-white px-1.5 text-xs font-bold focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-colors"
                          />
                        </td>

                        {/* CRM: Dia Vencimento */}
                        <td className="px-2 py-2.5 text-center">
                          <input
                            type="number"
                            min="1"
                            max="31"
                            defaultValue={p.vencimentoDia || 10}
                            onBlur={(e) => {
                              const val = e.target.value !== '' ? Number(e.target.value) : 10;
                              if (val !== p.vencimentoDia) {
                                atualizarClienteCRM(p.uid, { vencimentoDia: val });
                              }
                            }}
                            className="w-16 h-9 text-center bg-zinc-950 border border-zinc-800 rounded-lg text-white px-1 text-xs focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-colors"
                          />
                        </td>

                        {/* CRM: Status Faturamento Select */}
                        <td className="px-2 py-2.5 text-center">
                          <select
                            value={status}
                            onChange={(e) => {
                              const newStatus = e.target.value as 'pago' | 'atrasado' | 'isento';
                              const patch: Partial<PerfilUso> = { statusPagamento: newStatus };
                              if (newStatus === 'atrasado') {
                                patch.atrasadoDesde = Date.now();
                              } else {
                                patch.atrasadoDesde = null;
                              }
                              atualizarClienteCRM(p.uid, patch);
                            }}
                            className={`w-28 h-9 rounded-lg px-2 text-xs font-bold bg-zinc-950 border focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 cursor-pointer transition-colors ${
                              status === 'pago' ? 'text-emerald-400 border-emerald-500/40' :
                              status === 'isento' ? 'text-zinc-400 border-zinc-500/40' :
                              'text-red-400 border-red-500/40'
                            }`}
                          >
                            <option value="pago" className="text-emerald-400 font-bold bg-zinc-900">Pago (Ok)</option>
                            <option value="atrasado" className="text-red-400 font-bold bg-zinc-900">Atrasado (🚨)</option>
                            <option value="isento" className="text-zinc-400 font-bold bg-zinc-900">Isento (Free)</option>
                          </select>
                        </td>

                        {/* CRM: Observações */}
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            placeholder="Anotações internas..."
                            defaultValue={p.observacoesAdmin || ''}
                            onBlur={(e) => {
                              const val = e.target.value;
                              if (val !== (p.observacoesAdmin || '')) {
                                atualizarClienteCRM(p.uid, { observacoesAdmin: val });
                              }
                            }}
                            className="w-full h-9 bg-zinc-950 border border-zinc-800 rounded-lg text-white px-3 text-xs focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 placeholder-zinc-700 transition-colors"
                          />
                        </td>

                        <td className="px-4 py-2.5 text-center">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider ${ativo ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-700/40 shadow-sm shadow-emerald-500/10' : 'bg-zinc-950/60 text-zinc-450 border border-zinc-700/40'}`}>{ativo ? 'ativo' : 'inativo'}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center flex justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg"
                            title="Ver os projetos deste cliente (só leitura) — pra achar onde ele travou"
                            onClick={() => verProjetos(p.uid, p.empresaNome || p.email || p.uid)}
                          >
                            <FolderOpen className="size-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                            title="Excluir cadastro permanentemente"
                            onClick={() => deletarCliente(p.uid, p.email || p.empresaNome)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Diagnóstico dos projetos de um cliente */}
      {projetosCliente && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/70 p-4" onClick={() => setProjetosCliente(null)}>
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
              <div>
                <div className="text-sm font-bold text-white text-left">Projetos de {projetosCliente.nome}</div>
                <div className="text-xs text-zinc-400 mt-0.5 text-left">Só leitura — diagnóstico para ver onde travou</div>
              </div>
              <button type="button" onClick={() => setProjetosCliente(null)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white">
                <X className="size-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {carregandoProjetos && <div className="py-8 text-center text-xs text-zinc-400">Carregando…</div>}
              {!carregandoProjetos && erroProjetos && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-400">{erroProjetos}</div>
              )}
              {!carregandoProjetos && !erroProjetos && projetosCliente.projetos.length === 0 && (
                <div className="py-8 text-center text-xs text-zinc-400">Este cliente ainda não tem nenhum projeto salvo na nuvem.</div>
              )}
              {!carregandoProjetos && !erroProjetos && projetosCliente.projetos.map((proj) => {
                const totalVertices = proj.glebas.reduce((s, g) => s + g.vertices.length, 0);
                const totalConfrontantes = proj.glebas.reduce((s, g) => s + g.confrontantes.length, 0);
                return (
                  <div key={proj.id} className="mb-2 rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-white">{proj.nome}</div>
                        <div className="truncate text-xs text-zinc-400">{proj.imovel?.denominacao || 'Sem denominação do imóvel'}</div>
                      </div>
                      <span className="shrink-0 text-xs text-zinc-500">Alterado em {dataBR(proj.atualizadoEm)}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs">
                      <span className={`flex items-center gap-1 ${totalVertices > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        <MapPin className="size-3.5" /> {totalVertices} vértice(s){totalVertices === 0 && ' — nunca importou pontos'}
                      </span>
                      <span className={`flex items-center gap-1 ${totalConfrontantes > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        <Waypoints className="size-3.5" /> {totalConfrontantes} confrontante(s){totalVertices > 0 && totalConfrontantes === 0 && ' — ainda não pintou'}
                      </span>
                    </div>
                    <div className="mt-2 flex justify-end border-t border-zinc-800/60 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1.5 border-zinc-800 bg-zinc-900 px-2.5 text-xs font-semibold text-emerald-300 hover:bg-zinc-800"
                        disabled={copiandoId === proj.id}
                        title="Cria uma cópia independente deste projeto no SEU gestor de projetos — não altera nada na conta do cliente"
                        onClick={() => copiarProjeto(proj)}
                      >
                        <Copy className="size-3.5" /> {copiandoId === proj.id ? 'Copiando…' : 'Copiar para meus projetos'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Gera o corpo do e-mail em HTML responsivo com identidade oficial do Souza CAD */
function gerarCorpoEmailHtml({ assunto, texto, imagemUrl, botaoTexto, botaoLink, whatsappSupport }: {
  assunto: string;
  texto: string;
  imagemUrl?: string;
  botaoTexto: string;
  botaoLink: string;
  whatsappSupport?: string;
}) {
  const formatado = texto.replace(/\n/g, '<br/>');
  const imgTag = imagemUrl ? `<div style="text-align: center; margin: 20px 0;"><img src="${imagemUrl}" alt="Comunicado" style="max-width: 100%; max-height: 350px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.15); display: inline-block;" /></div>` : '';
  const supportFooter = whatsappSupport ? `<p style="margin: 4px 0 0 0; font-size: 11px; color: #a1a1aa;">Dúvidas? Fale conosco pelo WhatsApp: <a href="https://wa.me/${whatsappSupport.replace(/\D/g, '')}" style="color: #10b981; text-decoration: none; font-weight: bold;">${whatsappSupport}</a></p>` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${assunto}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f7f5; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          <tr style="background-color: #0a1f14; text-align: center;">
            <td align="center" style="padding: 25px 20px; background-color: #0a1f14;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; tracking-wide: 0.1em; text-transform: uppercase;">
                <span style="color: #10b981;">SOUZA</span> <span style="color: #a1a1aa;">CAD</span>
              </h1>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #10b981; text-transform: uppercase; letter-spacing: 0.2em; font-weight: 700;">Tecnologia no Campo</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px; text-align: left; background-color: #ffffff;">
              <h2 style="margin: 0 0 20px 0; color: #0f2d1e; font-size: 18px; font-weight: 700;">${assunto}</h2>
              <div style="color: #3f3f46; font-size: 14px; line-height: 1.6; font-weight: 400;">
                ${formatado}
              </div>
              ${imgTag}
              <div style="text-align: center; margin: 35px 0 10px 0;">
                <a href="${botaoLink}" target="_blank" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(16,185,129,0.3); text-align: center; text-transform: uppercase;">
                  ${botaoTexto}
                </a>
              </div>
            </td>
          </tr>
          <tr style="background-color: #fafafa; border-top: 1px solid #f4f4f5; text-align: center;">
            <td align="center" style="padding: 20px; background-color: #fafafa; border-top: 1px solid #f4f4f5;">
              <p style="margin: 0 0 8px 0; font-size: 11px; color: #71717a;">Souza CAD © 2026. Todos os direitos reservados.</p>
              ${supportFooter}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
