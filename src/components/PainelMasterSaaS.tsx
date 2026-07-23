'use client';

import { useEffect, useMemo, useState, Fragment } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const MapaClientesSaaS = dynamic(() => import('@/components/MapaClientesSaaS'), { ssr: false });
import {
  Users, Crown, RefreshCw, Shield, Sparkles,
  DollarSign, Calendar, AlertTriangle, LogOut, Search, TrendingUp, ChevronDown, ChevronUp, Trash2, Mail, Send, FolderOpen, X, Waypoints, MapPin, Copy, Plus, Youtube, Cloud,
  HelpCircle, Eye, EyeOff, CheckCircle2, AlertCircle, ExternalLink, BookOpen, Key
} from 'lucide-react';
import { collection, getCountFromServer, getDocs, limit, query } from 'firebase/firestore';
import { ufDoMunicipio } from '@/lib/topo/municipios';
import { listarPerfisUso, atualizarPerfilUsoPorAdmin, excluirPerfilUsoPorAdmin, type PerfilUso } from '@/lib/store/perfilUso';
import { atualizarEmpresaPorAdmin, isModuloHabilitado, obterCotaStorageEmpresa } from '@/lib/store/empresas';
import { registrarAcaoAdmin, listarAcoesAdmin, type ActionLog } from '@/lib/store/actionLog';
import { listarProjetosDoUsuario, salvarProjeto, novoId } from '@/lib/store/projects';
import type { Projeto } from '@/lib/topo/types';
import { carregarConfigAssinatura, salvarConfigAssinatura, type ConfigAssinatura, type CupomDesconto, CONFIG_ASSINATURA_PADRAO, validarCupom } from '@/lib/store/assinatura';
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
  const [landingAberta, setLandingAberta] = useState(false);
  const [mapaSaaSAberto, setMapaSaaSAberto] = useState(false);
  const [smtp, setSmtp] = useState<ConfigSmtp>({});
  const [salvandoSmtp, setSalvandoSmtp] = useState(false);
  const [testandoSmtp, setTestandoSmtp] = useState(false);
  const [resultadoTesteSmtp, setResultadoTesteSmtp] = useState<{ ok: boolean; msg: string; orientacao?: string } | null>(null);
  const [mostrarTutorialSmtp, setMostrarTutorialSmtp] = useState(false);
  const [verSenhaSmtp, setVerSenhaSmtp] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [msg, setMsg] = useState('');
  const [busca, setBusca] = useState('');
  const [configExpandido, setConfigExpandido] = useState(true);
  const [empresaMembrosAberta, setEmpresaMembrosAberta] = useState<Record<string, boolean>>({});
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([]);

  // Cupons de desconto
  const [novoCupomCodigo, setNovoCupomCodigo] = useState('');
  const [novoCupomPct, setNovoCupomPct] = useState('50');
  const [novoCupomTipo, setNovoCupomTipo] = useState<'12meses' | 'permanente' | 'unico'>('12meses');
  const [novoCupomUsos, setNovoCupomUsos] = useState('');
  const [novoCupomExpiraDias, setNovoCupomExpiraDias] = useState('');

  async function criarCupom() {
    if (!novoCupomCodigo.trim()) { flash('Digite o código do cupom.'); return; }
    const cod = novoCupomCodigo.trim().toUpperCase();
    const pct = Math.max(1, Math.min(100, Number(novoCupomPct) || 50));
    const usos = Number(novoCupomUsos) > 0 ? Number(novoCupomUsos) : undefined;
    const expiraMs = Number(novoCupomExpiraDias) > 0 ? Date.now() + Number(novoCupomExpiraDias) * 86400000 : undefined;

    const cupons = cfg.cupons || {};
    const novoCupom: CupomDesconto = {
      id: cod,
      codigo: cod,
      pctDesconto: pct,
      tipoValidade: novoCupomTipo,
      validadeAteMs: expiraMs,
      usosMaximos: usos,
      usosAtuais: 0,
      ativo: true,
    };

    const novaCfg: ConfigAssinatura = {
      ...cfg,
      cupons: {
        ...cupons,
        [cod]: novoCupom,
      },
    };

    try {
      await salvarConfigAssinatura(novaCfg);
      setCfg(novaCfg);
      setNovoCupomCodigo('');
      flash(`Cupom "${cod}" criado com sucesso!`);
    } catch {
      flash('Erro ao salvar cupom.');
    }
  }

  async function alternarStatusCupom(cod: string) {
    const cupons = cfg.cupons || {};
    if (!cupons[cod]) return;
    const atualizado = { ...cupons[cod], ativo: !cupons[cod].ativo };
    const novaCfg = { ...cfg, cupons: { ...cupons, [cod]: atualizado } };
    try {
      await salvarConfigAssinatura(novaCfg);
      setCfg(novaCfg);
      flash(`Cupom "${cod}" ${atualizado.ativo ? 'ativado' : 'desativado'}.`);
    } catch {
      flash('Erro ao atualizar cupom.');
    }
  }

  async function removerCupom(cod: string) {
    if (!(await confirmar({ titulo: 'Excluir cupom', mensagem: `Excluir o cupom "${cod}"?` }))) return;
    const cupons = { ...(cfg.cupons || {}) };
    delete cupons[cod];
    const novaCfg = { ...cfg, cupons };
    try {
      await salvarConfigAssinatura(novaCfg);
      setCfg(novaCfg);
      flash(`Cupom "${cod}" removido.`);
    } catch {
      flash('Erro ao remover cupom.');
    }
  }

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
              const totalProjetos = snap.data().count;

              let muni = (p.municipio || '').trim();
              let uf = (p.uf || '').trim();

              if (!muni && totalProjetos > 0) {
                try {
                  const projSnap = await getDocs(query(colRef, limit(5)));
                  for (const docSnap of projSnap.docs) {
                    const data = docSnap.data();
                    const projMuni = data?.imovel?.municipio;
                    if (projMuni && typeof projMuni === 'string' && projMuni.trim()) {
                      muni = projMuni.trim();
                      uf = ufDoMunicipio(muni) || uf;
                      break;
                    }
                  }
                } catch { /* ignore */ }
              }

              return { ...p, totalProjetos, municipio: muni || p.municipio, uf: uf || p.uf };
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
      setActionLogs(await listarAcoesAdmin(25));
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

  async function testarEnvioSmtp() {
    if (!smtp.host || !smtp.user || !smtp.pass) {
      flash('Preencha o Host, E-mail remetente e Senha de app antes de testar.');
      return;
    }
    setTestandoSmtp(true);
    setResultadoTesteSmtp(null);
    try {
      const token = auth() && auth()?.currentUser ? await auth()!.currentUser!.getIdToken() : '';
      const res = await fetch('/api/saas/testar-smtp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          host: smtp.host,
          port: smtp.port || '465',
          user: smtp.user,
          pass: smtp.pass,
          from: smtp.from,
          destinatario: smtp.user
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResultadoTesteSmtp({ ok: true, msg: data.mensagem });
      } else {
        setResultadoTesteSmtp({ ok: false, msg: data.error || 'Falha no disparo de e-mail de teste.', orientacao: data.orientacao });
      }
    } catch (e: any) {
      setResultadoTesteSmtp({ ok: false, msg: e.message || 'Erro de conexão com o servidor.' });
    } finally {
      setTestandoSmtp(false);
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
      await registrarAcaoAdmin('atualizar_cliente', `Atualizou perfil ${clientUid}: ${JSON.stringify(patch)}`);
      flash('Dados do cliente salvos!');
    } catch (e: unknown) {
      console.error(e);
      flash((e as Error).message || 'Erro ao salvar CRM.');
    }
  }

  async function atualizarEmpresaCRM(empresaId: string, patch: any) {
    try {
      await atualizarEmpresaPorAdmin(empresaId, patch);
      setPerfis((prev) => prev.map((p) => (p.uid === empresaId || p.workspaceUid === empresaId) ? { ...p, ...patch } : p));
      await registrarAcaoAdmin('atualizar_empresa', `Atualizou empresa ${empresaId}: ${JSON.stringify(patch)}`);
      flash('Dados da empresa salvos!');
    } catch (e: unknown) {
      console.error(e);
      flash((e as Error).message || 'Erro ao salvar dados da empresa.');
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

  const [filtroCRM, setFiltroCRM] = useState<'todos' | 'pago' | 'atrasado' | 'isento'>('todos');

  // Filtrar perfis pela busca e pelo status do CRM
  const perfisFiltrados = useMemo(() => {
    let lista = perfis;
    if (filtroCRM !== 'todos') {
      lista = lista.filter((p) => (p.statusPagamento || 'atrasado') === filtroCRM);
    }
    if (!busca.trim()) return lista;
    const q = busca.toLowerCase();
    return lista.filter((p) =>
      (p.empresaNome || '').toLowerCase().includes(q) ||
      (p.rtNome || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q)
    );
  }, [perfis, busca, filtroCRM]);

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
                {/* Seção Sanfona (Accordion) - Editor de Textos da Landing Page */}
                <div className="space-y-2 col-span-1 md:col-span-2 lg:col-span-4 border border-emerald-500/30 rounded-xl bg-zinc-950/70 overflow-hidden transition-all mt-2">
                  <button
                    type="button"
                    onClick={() => setLandingAberta(!landingAberta)}
                    className="w-full px-4 py-3 flex items-center justify-between bg-zinc-900/80 hover:bg-zinc-900 transition-colors cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="size-4 text-emerald-400" />
                      <div className="text-left">
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-400 block">
                          Editor Completo de Textos da Landing Page (Sanfona)
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          Clique para {landingAberta ? 'recolher' : 'expandir'} e editar a headline, subtítulo, história e os 4 pontos de diferenciais.
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        {landingAberta ? 'Recolher' : 'Editar Textos'}
                      </span>
                      {landingAberta ? <ChevronUp className="size-4 text-emerald-400" /> : <ChevronDown className="size-4 text-emerald-400" />}
                    </div>
                  </button>

                  {landingAberta && (
                    <div className="p-4 space-y-4 border-t border-zinc-800/80">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                        <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                          Conteúdo Oficial Exibido na Apresentação Inicial
                        </span>
                        <Button size="sm" onClick={salvarLandingTextsConfig} disabled={salvandoLanding} className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold h-8 text-xs">
                          {salvandoLanding ? 'Salvando...' : 'Salvar Todos os Textos'}
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                          <textarea value={landingTexts.historia || ''} onChange={(e) => setLandingTexts(prev => ({ ...prev, historia: e.target.value }))} className="w-full h-24 p-2 text-xs rounded border border-zinc-800 bg-zinc-900 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                        </div>

                        {/* 4 Pontos de Diferenciais / Checklist */}
                        <div className="space-y-2 sm:col-span-2 border-t border-zinc-800/60 pt-3">
                          <Label className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider block">
                            Diferenciais Principais (4 Itens de Checklist)
                          </Label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {[0, 1, 2, 3].map((idx) => {
                              const itens = landingTexts.itensCheck && landingTexts.itensCheck.length === 4 ? [...landingTexts.itensCheck] : [...LANDING_PADRAO.itensCheck!];
                              return (
                                <div key={idx} className="space-y-1 bg-zinc-900/60 p-2 rounded-lg border border-zinc-800">
                                  <Label className="text-[9px] font-bold text-zinc-400 uppercase">Item {idx + 1}</Label>
                                  <Input
                                    value={itens[idx] || ''}
                                    onChange={(e) => {
                                      const novosItens = [...itens];
                                      novosItens[idx] = e.target.value;
                                      setLandingTexts(prev => ({ ...prev, itensCheck: novosItens }));
                                    }}
                                    className="h-7 text-xs bg-zinc-900 border-zinc-800 text-white"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Cupons de Desconto do SaaS */}
                <div className="space-y-3 col-span-1 md:col-span-2 lg:col-span-4 border-t border-zinc-800/80 pt-4 mt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <Sparkles className="size-4 text-amber-400" /> Gestão de Cupons de Desconto
                      </Label>
                      <p className="text-[10px] text-zinc-400">Crie cupons com desconto em %, validade programada (12 meses, permanente ou único) e limite de resgates.</p>
                    </div>
                  </div>

                  {/* Formulário de Criação de Cupom */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 bg-zinc-950/80 p-3 rounded-xl border border-amber-500/20">
                    <div>
                      <Label className="text-[10px] font-bold text-zinc-400 uppercase">Código do Cupom</Label>
                      <Input placeholder="Ex.: SOUZA50" value={novoCupomCodigo} onChange={(e) => setNovoCupomCodigo(e.target.value.toUpperCase())} className="h-8 text-xs bg-zinc-900 border-zinc-800 text-amber-400 font-mono font-bold" />
                    </div>
                    <div>
                      <Label className="text-[10px] font-bold text-zinc-400 uppercase">Desconto (%)</Label>
                      <Input type="number" min="1" max="100" placeholder="50" value={novoCupomPct} onChange={(e) => setNovoCupomPct(e.target.value)} className="h-8 text-xs bg-zinc-900 border-zinc-800 text-white font-bold" />
                    </div>
                    <div>
                      <Label className="text-[10px] font-bold text-zinc-400 uppercase">Tipo de Validade</Label>
                      <select value={novoCupomTipo} onChange={(e) => setNovoCupomTipo(e.target.value as any)} className="w-full h-8 text-xs bg-zinc-900 border border-zinc-800 text-white rounded px-2 outline-none">
                        <option value="12meses">50% por 12 Meses</option>
                        <option value="permanente">Desconto Permanente</option>
                        <option value="unico">Uso Único</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-[10px] font-bold text-zinc-400 uppercase">Expira em (Dias)</Label>
                      <Input type="number" placeholder="Opcional (ex.: 30)" value={novoCupomExpiraDias} onChange={(e) => setNovoCupomExpiraDias(e.target.value)} className="h-8 text-xs bg-zinc-900 border-zinc-800 text-white" />
                    </div>
                    <div className="flex items-end">
                      <Button size="sm" onClick={criarCupom} className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black h-8 text-xs">
                        <Plus className="size-3.5 mr-1" /> Criar Cupom
                      </Button>
                    </div>
                  </div>

                  {/* Tabela de Cupons */}
                  {cfg.cupons && Object.keys(cfg.cupons).length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/60">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-zinc-900/80 text-[10px] uppercase font-bold text-zinc-400 border-b border-zinc-800">
                          <tr>
                            <th className="px-3 py-2">Código</th>
                            <th className="px-3 py-2">Desconto</th>
                            <th className="px-3 py-2">Regra</th>
                            <th className="px-3 py-2">Validade / Expiração</th>
                            <th className="px-3 py-2 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                          {Object.values(cfg.cupons).map((cp) => (
                            <tr key={cp.id} className="hover:bg-zinc-900/40">
                              <td className="px-3 py-2 font-mono font-black text-amber-400">{cp.codigo}</td>
                              <td className="px-3 py-2 font-bold text-emerald-400">{cp.pctDesconto}% OFF</td>
                              <td className="px-3 py-2 text-zinc-300">
                                {cp.tipoValidade === '12meses' ? '12 Meses' : cp.tipoValidade === 'permanente' ? 'Permanente' : 'Uso Único'}
                              </td>
                              <td className="px-3 py-2 text-zinc-400 text-[11px]">
                                {cp.validadeAteMs ? dataBR(cp.validadeAteMs) : 'Sem expiração'}
                              </td>
                              <td className="px-3 py-2 text-right space-x-2">
                                <Button size="sm" variant="outline" onClick={() => alternarStatusCupom(cp.codigo)} className={`h-6 text-[10px] px-2 ${cp.ativo ? 'border-emerald-500/40 text-emerald-400' : 'border-zinc-700 text-zinc-500'}`}>
                                  {cp.ativo ? 'Ativo' : 'Inativo'}
                                </Button>
                                <button type="button" onClick={() => removerCupom(cp.codigo)} className="text-zinc-500 hover:text-red-400 transition-colors p-1">
                                  <Trash2 className="size-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500 italic">Nenhum cupom cadastrado ainda.</p>
                  )}
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
              <div className="mt-5 rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-5 space-y-4 shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-500/20 pb-3">
                  <div className="flex items-center gap-2">
                    <Mail className="size-5 text-indigo-400" />
                    <span className="text-sm font-extrabold uppercase tracking-wide text-indigo-200">
                      Configuração do Disparador de E-mail (Servidor SMTP)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href="https://myaccount.google.com/apppasswords"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition-all shrink-0"
                    >
                      <ExternalLink className="size-4" /> Abrir Google: Gerar Senha de App
                    </a>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setMostrarTutorialSmtp(true)}
                      className="text-xs font-bold gap-1.5 border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/20"
                    >
                      <BookOpen className="size-4 text-indigo-400" /> Passo a Passo
                    </Button>
                  </div>
                </div>

                {/* Seleção rápida de Provedores (Presets) */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Preenchimento Rápido por Provedor:</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSmtp((s) => ({ ...s, host: 'smtp.gmail.com', port: '465' }))}
                      className="px-3 py-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-xs font-bold text-indigo-200 transition-all"
                    >
                      Gmail (smtp.gmail.com | 465 SSL)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSmtp((s) => ({ ...s, host: 'smtp-mail.outlook.com', port: '587' }))}
                      className="px-3 py-1.5 rounded-lg border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-xs font-bold text-blue-200 transition-all"
                    >
                      Outlook / Office365 (smtp-mail.outlook.com | 587 TLS)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSmtp((s) => ({ ...s, host: 'smtp.mail.yahoo.com', port: '465' }))}
                      className="px-3 py-1.5 rounded-lg border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 text-xs font-bold text-purple-200 transition-all"
                    >
                      Yahoo (smtp.mail.yahoo.com | 465 SSL)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSmtp((s) => ({ ...s, host: 'mail.seu-dominio.com.br', port: '465' }))}
                      className="px-3 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-bold text-emerald-200 transition-all"
                    >
                      cPanel / Webmail Próprio (Porta 465 / 587)
                    </button>
                  </div>
                </div>

                {/* Alerta de Esclarecimento sobre Senha de App com botão direto do Google */}
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
                  <div className="font-extrabold text-amber-300 flex items-center gap-1.5 uppercase tracking-wide">
                    <AlertTriangle className="size-4 shrink-0 text-amber-400" /> IMPORTANTE: Qual senha colocar no campo &quot;Senha de app&quot;?
                  </div>
                  <p className="text-zinc-300 leading-relaxed">
                    <strong>NÃO digite a senha pessoal da sua conta de e-mail!</strong> Para sua segurança, o Google (Gmail) e a Microsoft (Outlook) bloqueiam a senha normal. É necessário gerar uma <strong>&quot;Senha de App&quot; de 16 letras</strong> no seu provedor.
                  </p>
                  <div className="pt-1 flex flex-wrap gap-2 items-center">
                    <a
                      href="https://myaccount.google.com/apppasswords"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all"
                    >
                      <ExternalLink className="size-3.5" /> Clique Aqui para Abrir o Google e Gerar sua Senha de App
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-zinc-300">Servidor (Host)</Label>
                    <Input
                      placeholder="Ex: smtp.gmail.com"
                      value={smtp.host ?? ''}
                      onChange={(e) => setSmtp((s) => ({ ...s, host: e.target.value }))}
                      className="h-10 text-sm bg-zinc-950 border-zinc-800 focus-visible:ring-indigo-500 text-white placeholder:text-zinc-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-zinc-300">Porta</Label>
                    <Input
                      placeholder="465 ou 587"
                      value={smtp.port ?? ''}
                      onChange={(e) => setSmtp((s) => ({ ...s, port: e.target.value }))}
                      className="h-10 text-sm bg-zinc-950 border-zinc-800 focus-visible:ring-indigo-500 text-white placeholder:text-zinc-700 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-zinc-300">E-mail Remetente (Login)</Label>
                    <Input
                      placeholder="seuemail@gmail.com"
                      value={smtp.user ?? ''}
                      onChange={(e) => setSmtp((s) => ({ ...s, user: e.target.value }))}
                      className="h-10 text-sm bg-zinc-950 border-zinc-800 focus-visible:ring-indigo-500 text-white placeholder:text-zinc-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-bold text-zinc-300">Senha de App (16 letras)</Label>
                      <button
                        type="button"
                        onClick={() => setVerSenhaSmtp((v) => !v)}
                        className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        {verSenhaSmtp ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                        {verSenhaSmtp ? 'Ocultar' : 'Mostrar'}
                      </button>
                    </div>
                    <Input
                      type={verSenhaSmtp ? 'text' : 'password'}
                      placeholder="abcd efgh ijkl mnop"
                      value={smtp.pass ?? ''}
                      onChange={(e) => setSmtp((s) => ({ ...s, pass: e.target.value }))}
                      className="h-10 text-sm bg-zinc-950 border-zinc-800 focus-visible:ring-indigo-500 text-white placeholder:text-zinc-700 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-zinc-300">Nome de Exibição (Opcional)</Label>
                    <Input
                      placeholder="Souza CAD <remetente@provedor.com>"
                      value={smtp.from ?? ''}
                      onChange={(e) => setSmtp((s) => ({ ...s, from: e.target.value }))}
                      className="h-10 text-sm bg-zinc-950 border-zinc-800 focus-visible:ring-indigo-500 text-white placeholder:text-zinc-700"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 items-center">
                  <Button
                    size="sm"
                    onClick={salvarSmtpConfig}
                    disabled={salvandoSmtp}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-10 px-5"
                  >
                    {salvandoSmtp ? 'Salvando...' : 'Salvar Configurações SMTP'}
                  </Button>

                  <Button
                    size="sm"
                    onClick={testarEnvioSmtp}
                    disabled={testandoSmtp || !smtp.host || !smtp.user || !smtp.pass}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 px-5 gap-1.5"
                  >
                    <Send className="size-4" />
                    {testandoSmtp ? 'Testando Conexão e Enviando...' : 'Testar Envio de E-mail Agora'}
                  </Button>
                </div>

                {/* Resultado do Teste de Envio */}
                {resultadoTesteSmtp && (
                  <div className={`p-4 rounded-xl border text-xs space-y-1.5 transition-all ${
                    resultadoTesteSmtp.ok
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                      : 'bg-red-500/10 border-red-500/40 text-red-200'
                  }`}>
                    <div className="font-extrabold text-sm flex items-center gap-1.5">
                      {resultadoTesteSmtp.ok ? <CheckCircle2 className="size-5 text-emerald-400" /> : <AlertCircle className="size-5 text-red-400" />}
                      {resultadoTesteSmtp.ok ? 'Sucesso no Teste de Disparo!' : 'Falha na Configuração do E-mail'}
                    </div>
                    <p className="font-semibold">{resultadoTesteSmtp.msg}</p>
                    {resultadoTesteSmtp.orientacao && (
                      <div className="p-2.5 bg-black/40 rounded-lg border border-red-500/30 text-amber-200 font-sans space-y-1 leading-relaxed">
                        <strong className="block text-amber-300 uppercase">Como Resolver:</strong>
                        {resultadoTesteSmtp.orientacao}
                      </div>
                    )}
                  </div>
                )}
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

        {/* ─── Mapa de Clientes SaaS (Geolocalização) ─── */}
        <div className="border border-zinc-800 rounded-xl bg-zinc-950/70 overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => setMapaSaaSAberto(!mapaSaaSAberto)}
            className="w-full px-4 py-3 flex items-center justify-between bg-zinc-900/40 hover:bg-zinc-900/60 transition-colors cursor-pointer select-none text-left"
          >
            <div className="flex items-center gap-2.5">
              <MapPin className="size-4 text-emerald-400" />
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-amber-400 block">
                  Mapa Geolocalizado de Clientes ({perfis.length})
                </span>
                <span className="text-[10px] text-zinc-400">
                  Clique para {mapaSaaSAberto ? 'recolher' : 'expandir'} a visualização geográfica dos clientes cadastrados
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                {mapaSaaSAberto ? 'Recolher' : 'Expandir Mapa'}
              </span>
              {mapaSaaSAberto ? <ChevronUp className="size-4 text-amber-400" /> : <ChevronDown className="size-4 text-amber-400" />}
            </div>
          </button>
          
          {mapaSaaSAberto && (
            <div className="p-4 border-t border-zinc-800 bg-zinc-950">
              <MapaClientesSaaS perfis={perfis} />
            </div>
          )}
        </div>

        {/* ─── Logs de Auditoria Administrativa (Action Logs) ─── */}
        {actionLogs.length > 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 shadow-lg backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Shield className="size-3.5 text-amber-400" /> Logs de Auditoria Administrativa ({actionLogs.length})
              </h3>
              <span className="text-[10px] text-zinc-400">Histórico de ações recentes do Master</span>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px]">
              {actionLogs.map((log, i) => (
                <div key={log.id || i} className="flex items-center justify-between bg-zinc-950/80 px-3 py-1.5 rounded border border-zinc-850/60">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-amber-400 font-bold uppercase text-[9.5px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">{log.tipoAcao}</span>
                    <span className="text-zinc-300 truncate" title={log.detalhes}>{log.detalhes}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-zinc-400 text-[10px]">
                    <span>{log.autorEmail}</span>
                    <span>{dataBR(log.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Tabela CRM e Faturamento ─── */}
        <div className="flex-1 border border-zinc-800 rounded-xl bg-zinc-900/20 shadow-lg overflow-hidden flex flex-col">
          <div className="bg-zinc-900/80 px-5 py-3 border-b border-zinc-800/80 flex shrink-0 justify-between items-center gap-4 flex-wrap">
            <div className="flex flex-col text-left">
              <span className="text-sm font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Sparkles className="size-4" /> CRM & Faturamento ({perfisFiltrados.length}{busca || filtroCRM !== 'todos' ? ` de ${perfis.length}` : ''})
              </span>
              <span className="text-xs text-zinc-400 mt-0.5">Gestão de assinaturas, renovação de mensalidade e liberação de módulos extras.</span>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Filtros rápidos do CRM */}
              <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs">
                <button
                  type="button"
                  onClick={() => setFiltroCRM('todos')}
                  className={`px-2.5 py-1 rounded font-bold transition-colors ${filtroCRM === 'todos' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-white'}`}
                >
                  Todos ({perfis.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroCRM('pago')}
                  className={`px-2.5 py-1 rounded font-bold transition-colors ${filtroCRM === 'pago' ? 'bg-emerald-600 text-white' : 'text-emerald-400 hover:bg-emerald-950/40'}`}
                >
                  Renovados / Pagos ({perfis.filter(p => (p.statusPagamento || 'atrasado') === 'pago').length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroCRM('atrasado')}
                  className={`px-2.5 py-1 rounded font-bold transition-colors ${filtroCRM === 'atrasado' ? 'bg-red-600 text-white' : 'text-red-400 hover:bg-red-950/40'}`}
                >
                  Pendentes / Atrasados ({perfis.filter(p => (p.statusPagamento || 'atrasado') === 'atrasado').length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroCRM('isento')}
                  className={`px-2.5 py-1 rounded font-bold transition-colors ${filtroCRM === 'isento' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}
                >
                  Isentos ({perfis.filter(p => p.statusPagamento === 'isento').length})
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="h-9 w-44 rounded-lg border border-zinc-800 bg-zinc-950 pl-8 pr-3 text-xs text-white placeholder:text-zinc-700 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                />
              </div>
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
<th className="px-3 py-2 text-left min-w-[200px]">Cliente / RT / Métricas</th>
                    <th className="px-2 py-2 text-center w-44">Financeiro &amp; Cobrança</th>
                    <th className="px-3 py-2 text-left min-w-[150px]">Anotações / Obs. Contrato</th>
                    <th className="px-3 py-2 text-center w-48">Módulos Ativos</th>
                    <th className="px-4 py-3 text-center w-16">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {perfisFiltrados.map((p) => {
                    const ativo = (agora - (p.ultimoAcessoEm ?? p.ultimoProjetoEm ?? 0)) < DIAS_ATIVO;
                    const status = p.statusPagamento || 'atrasado';
                    const souMembro = !!p.workspaceUid && p.workspaceUid !== p.uid;
                    const dono = souMembro ? perfis.find((x) => x.uid === p.workspaceUid) : null;
                    const meuUid = auth()?.currentUser?.uid;
                    const meuEmail = auth()?.currentUser?.email?.toLowerCase();
                    const isMinhaEmpresa = (p.uid && p.uid === meuUid) || (p.workspaceUid && p.workspaceUid === meuUid) || (!!meuEmail && p.email?.toLowerCase() === meuEmail);
                    const membrosDaEmpresa = perfis.filter((x) => x.workspaceUid === p.uid && x.uid !== p.uid);
                    const totalUsuariosEmpresa = 1 + membrosDaEmpresa.length;

                    if (souMembro) {
                      return (
                        <tr key={p.uid} className={`transition-colors ${isMinhaEmpresa ? 'bg-emerald-950/40 border-l-4 border-l-emerald-500' : 'hover:bg-zinc-900/30'}`}>
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
                          <td className="px-3 py-2">
                            <div className="font-bold text-white text-xs flex items-center gap-1.5 flex-wrap">
                              <span>{p.empresaNome || 'Sem Empresa'}</span>
                              {isMinhaEmpresa && (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.2 text-[8px] font-black uppercase text-emerald-400">
                                  <Shield className="size-2.5" /> Membro
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-400 mt-0.5">{p.rtNome || 'RT não cadastrado'}{p.rtCft ? ` (CFT: ${p.rtCft})` : ''}</div>
                            <div className="text-[11px] text-zinc-450 mt-0.5 select-all">{p.email || '—'}</div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={`inline-flex items-center rounded-full px-1.5 py-0.2 text-[9px] font-extrabold uppercase ${ativo ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/30' : 'bg-zinc-950/60 text-zinc-450 border border-zinc-800'}`}>
                                {ativo ? 'ativo' : 'inativo'}
                              </span>
                              <span className="text-[10px] text-zinc-500 flex items-center gap-0.5">
                                <Cloud className="size-3 text-zinc-500 shrink-0" /> {p.totalProjetos ?? 0} projs.
                              </span>
                              {p.ultimoAcessoEm && (
                                <span className="text-[9.5px] text-amber-500 font-medium">
                                  login: {dataBR(p.ultimoAcessoEm)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center text-xs text-zinc-550 italic">
                            Membro — cobrança vinculada:
                            <div className="text-[10.5px] font-bold text-zinc-400 truncate max-w-[150px] mx-auto mt-0.5" title={dono?.empresaNome || dono?.email || ''}>
                              {dono?.empresaNome || dono?.email || 'Matriz'}
                            </div>
                          </td>
                          <td className="px-3 py-2">
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
                              className="w-full h-8 bg-zinc-950 border border-zinc-800 rounded text-white px-2 text-xs focus:border-amber-500 focus:outline-none focus:ring-0 placeholder-zinc-700 transition-colors"
                            />
                          </td>
                          <td className="px-3 py-2 text-center text-[10px] text-zinc-550 italic">
                            Herdado da Matriz
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

                    const subRowAberta = !!empresaMembrosAberta[p.uid];

                    return (
                      <Fragment key={p.uid}>
                        <tr className={`transition-colors ${isMinhaEmpresa ? 'bg-emerald-950/45 border-l-4 border-l-emerald-500 font-semibold' : 'hover:bg-zinc-900/30'}`}>
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
                          <td className="px-3 py-2">
                            <div className="font-bold text-white text-xs flex items-center gap-1.5 flex-wrap">
                              <span>{p.empresaNome || 'Sem Empresa'}</span>
                              {isMinhaEmpresa && (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.2 text-[8px] font-black uppercase text-emerald-400">
                                  <Shield className="size-2.5" /> Matriz
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-400 mt-0.5">{p.rtNome || 'RT não cadastrado'}{p.rtCft ? ` (CFT: ${p.rtCft})` : ''}</div>
                            <div className="text-[11px] text-zinc-450 mt-0.5 select-all">{p.email || '—'}</div>
                            <button
                              type="button"
                              onClick={() => setEmpresaMembrosAberta((prev) => ({ ...prev, [p.uid]: !prev[p.uid] }))}
                              className="mt-1 inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-400 hover:text-emerald-300 hover:underline transition-colors"
                            >
                              <Users className="size-3 shrink-0" /> {totalUsuariosEmpresa} user${totalUsuariosEmpresa > 1 ? 's' : ''}
                              {subRowAberta ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                            </button>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={`inline-flex items-center rounded-full px-1.5 py-0.2 text-[9px] font-extrabold uppercase ${ativo ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/30' : 'bg-zinc-950/60 text-zinc-450 border border-zinc-800'}`}>
                                {ativo ? 'ativo' : 'inativo'}
                              </span>
                              <button 
                                type="button" 
                                onClick={() => verProjetos(p.uid, p.empresaNome || p.email || p.uid)}
                                className="text-[10px] text-emerald-400 hover:underline hover:text-emerald-300 flex items-center gap-0.5"
                              >
                                <Cloud className="size-3 shrink-0" /> {p.totalProjetos ?? 0} projs.
                              </button>
                              {p.ultimoAcessoEm && (
                                <span className="text-[9.5px] text-amber-500 font-medium">
                                  login: {dataBR(p.ultimoAcessoEm)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center space-y-1.5">
                            <div className="flex items-center gap-1.5 justify-center">
                              <div className="relative flex items-center">
                                <span className="absolute left-1.5 text-[9px] font-bold text-zinc-500">R$</span>
                                <input
                                  type="number"
                                  defaultValue={p.mensalidade !== undefined ? p.mensalidade : 150}
                                  onBlur={(e) => {
                                    const val = e.target.value !== '' ? Number(e.target.value) : 150;
                                    if (val !== p.mensalidade) {
                                      atualizarClienteCRM(p.uid, { mensalidade: val });
                                    }
                                  }}
                                  className="w-16 h-7 text-center bg-zinc-950 border border-zinc-850 rounded text-white pl-4 pr-1 text-[11px] font-extrabold focus:border-amber-500 focus:outline-none focus:ring-0 transition-colors"
                                  title="Valor da Mensalidade"
                                />
                              </div>
                              <div className="relative flex items-center">
                                <span className="absolute left-1.5 text-[9px] font-bold text-zinc-500">Dia</span>
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
                                  className="w-12 h-7 text-center bg-zinc-950 border border-zinc-850 rounded text-white pl-4 pr-1 text-[11px] font-bold focus:border-amber-500 focus:outline-none focus:ring-0 transition-colors"
                                  title="Dia do Vencimento"
                                />
                              </div>
                            </div>
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
                              className={`w-[134px] h-7 rounded px-1.5 text-[10.5px] font-black bg-zinc-950 border focus:outline-none focus:border-amber-500 focus:ring-0 cursor-pointer transition-colors text-center ${
                                status === 'pago' ? 'text-emerald-400 border-emerald-500/40' :
                                status === 'isento' ? 'text-zinc-400 border-zinc-550' :
                                'text-red-400 border-red-500/40'
                              }`}
                            >
                              <option value="pago" className="text-emerald-400 font-bold bg-zinc-900">Pago (Ok)</option>
                              <option value="atrasado" className="text-red-400 font-bold bg-zinc-900">Atrasado</option>
                              <option value="isento" className="text-zinc-450 font-bold bg-zinc-900">Isento (Free)</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
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
                              className="w-full h-8 bg-zinc-950 border border-zinc-800 rounded text-white px-2 text-xs focus:border-amber-500 focus:outline-none focus:ring-0 placeholder-zinc-700 transition-colors"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <div className="grid grid-cols-4 gap-1 w-[160px] mx-auto text-[9.5px] font-semibold">
                              <label className="flex items-center gap-0.5 cursor-pointer text-zinc-400 hover:text-white" title="Módulo Ambiental">
                                <input
                                  type="checkbox"
                                  checked={!!p.licencaAmbiental}
                                  onChange={(e) => atualizarClienteCRM(p.uid, { licencaAmbiental: e.target.checked })}
                                  className="rounded text-zinc-950 focus:ring-emerald-500 size-3 accent-emerald-500 cursor-pointer"
                                />
                                <span>Amb</span>
                              </label>
                              <label className="flex items-center gap-0.5 cursor-pointer text-zinc-400 hover:text-white" title="Módulo Jurídico">
                                <input
                                  type="checkbox"
                                  checked={!!p.licencaJuridico}
                                  onChange={(e) => atualizarClienteCRM(p.uid, { licencaJuridico: e.target.checked })}
                                  className="rounded text-zinc-950 focus:ring-emerald-500 size-3 accent-emerald-500 cursor-pointer"
                                />
                                <span>Jur</span>
                              </label>
                              <label className="flex items-center gap-0.5 cursor-pointer text-zinc-400 hover:text-white" title="Módulo de Usucapião">
                                <input
                                  type="checkbox"
                                  checked={!!p.licencaUsucapiao}
                                  onChange={(e) => atualizarClienteCRM(p.uid, { licencaUsucapiao: e.target.checked })}
                                  className="rounded text-zinc-950 focus:ring-emerald-500 size-3 accent-emerald-500 cursor-pointer"
                                />
                                <span>Usu</span>
                              </label>
                              <label className="flex items-center gap-0.5 cursor-pointer text-zinc-400 hover:text-white" title="Módulo de Avaliação">
                                <input
                                  type="checkbox"
                                  checked={!!p.licencaAvaliacao}
                                  onChange={(e) => atualizarClienteCRM(p.uid, { licencaAvaliacao: e.target.checked })}
                                  className="rounded text-zinc-950 focus:ring-emerald-500 size-3 accent-emerald-500 cursor-pointer"
                                />
                                <span>Ava</span>
                              </label>
                              <label className="flex items-center gap-0.5 cursor-pointer text-zinc-400 hover:text-white" title="Módulo de REURB">
                                <input
                                  type="checkbox"
                                  checked={!!p.licencaReurb}
                                  onChange={(e) => atualizarClienteCRM(p.uid, { licencaReurb: e.target.checked })}
                                  className="rounded text-zinc-950 focus:ring-emerald-500 size-3 accent-emerald-500 cursor-pointer"
                                />
                                <span>Reu</span>
                              </label>
                              <label className="flex items-center gap-0.5 cursor-pointer text-zinc-400 hover:text-white" title="Módulo de Loteamentos">
                                <input
                                  type="checkbox"
                                  checked={!!p.licencaLoteamento}
                                  onChange={(e) => atualizarClienteCRM(p.uid, { licencaLoteamento: e.target.checked })}
                                  className="rounded text-zinc-950 focus:ring-emerald-500 size-3 accent-emerald-500 cursor-pointer"
                                />
                                <span>Lot</span>
                              </label>
                              <label className="flex items-center gap-0.5 cursor-pointer text-zinc-400 hover:text-white" title="Módulo de Crédito Rural">
                                <input
                                  type="checkbox"
                                  checked={!!p.licencaCredito}
                                  onChange={(e) => atualizarClienteCRM(p.uid, { licencaCredito: e.target.checked })}
                                  className="rounded text-zinc-950 focus:ring-emerald-500 size-3 accent-emerald-500 cursor-pointer"
                                />
                                <span>Cre</span>
                              </label>
                              <label className="flex items-center gap-0.5 cursor-pointer text-zinc-400 hover:text-white" title="Módulo Estúdio 3D Terreno">
                                <input
                                  type="checkbox"
                                  checked={!!p.licencaEstudio3d}
                                  onChange={(e) => atualizarClienteCRM(p.uid, { licencaEstudio3d: e.target.checked })}
                                  className="rounded text-zinc-950 focus:ring-emerald-500 size-3 accent-emerald-500 cursor-pointer"
                                />
                                <span>3D</span>
                              </label>
                              <label className="flex items-center gap-0.5 cursor-pointer text-zinc-400 hover:text-white" title="Módulo Extração por IA">
                                <input
                                  type="checkbox"
                                  checked={!!p.licencaExtrairIa}
                                  onChange={(e) => atualizarClienteCRM(p.uid, { licencaExtrairIa: e.target.checked })}
                                  className="rounded text-zinc-950 focus:ring-emerald-500 size-3 accent-emerald-500 cursor-pointer"
                                />
                                <span>IA</span>
                              </label>
                            </div>
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

                        {subRowAberta && (
                          <tr className="bg-zinc-950/90 border-t border-emerald-500/30">
                            <td colSpan={5} className="p-3 pl-8">
                              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 space-y-2.5 shadow-md">
                                <div className="flex items-center justify-between text-xs font-black uppercase text-emerald-400 tracking-wider">
                                  <span className="flex items-center gap-1.5"><Users className="size-4 text-emerald-400" /> Lista Enxuta de Usuários — {p.empresaNome || 'Empresa'} ({totalUsuariosEmpresa})</span>
                                  <span className="text-[10px] text-zinc-400 normal-case font-mono">Workspace ID: {p.workspaceUid || p.uid}</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                  {/* Titular / Dono */}
                                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-emerald-500/40 bg-zinc-900 text-xs shadow-2xs">
                                    <div className="min-w-0 pr-2">
                                      <div className="font-bold text-white flex items-center gap-1.5 truncate">
                                        <span className="truncate">{p.rtNome || p.email || 'Titular'}</span>
                                        <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-1.5 py-0.2 rounded font-black uppercase shrink-0">Dono</span>
                                      </div>
                                      <div className="text-[10px] text-zinc-400 truncate select-all">{p.email || 'sem e-mail'}</div>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <div className="text-[10px] font-mono text-emerald-400 font-extrabold">{p.totalProjetos ?? 0} proj.</div>
                                      <div className="text-[9px] text-zinc-500">{dataBR(p.ultimoAcessoEm)}</div>
                                    </div>
                                  </div>

                                  {/* Membros vinculados */}
                                  {membrosDaEmpresa.map((m) => (
                                    <div key={m.uid} className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-800 bg-zinc-900 text-xs shadow-2xs">
                                      <div className="min-w-0 pr-2">
                                        <div className="font-bold text-white flex items-center gap-1.5 truncate">
                                          <span className="truncate">{m.rtNome || m.email || 'Membro Auxiliar'}</span>
                                          <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.2 rounded font-bold uppercase shrink-0">Auxiliar</span>
                                        </div>
                                        <div className="text-[10px] text-zinc-400 truncate select-all">{m.email || 'sem e-mail'}</div>
                                      </div>
                                      <div className="text-right shrink-0">
                                        <div className="text-[10px] font-mono text-zinc-400">{m.totalProjetos ?? 0} proj.</div>
                                        <div className="text-[9px] text-zinc-500">{dataBR(m.ultimoAcessoEm)}</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* Módulos Adicionais Contratados */}
                                <div className="border-t border-emerald-500/20 pt-3 mt-3">
                                  <div className="flex items-center gap-1.5 text-xs font-black uppercase text-amber-500 tracking-wider mb-2">
                                    <Shield className="size-4 text-amber-500" /> Licenciamento de Módulos (SaaS)
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2.5">
                                    {[
                                      { label: 'Ambiental', field: 'licencaAmbiental', color: 'text-emerald-400' },
                                      { label: 'Usucapião', field: 'licencaUsucapiao', color: 'text-amber-400' },
                                      { label: 'Avaliação', field: 'licencaAvaliacao', color: 'text-rose-400' },
                                      { label: 'Jurídico', field: 'licencaJuridico', color: 'text-indigo-400' },
                                      { label: 'REURB', field: 'licencaReurb', color: 'text-orange-400' },
                                      { label: 'Loteamento', field: 'licencaLoteamento', color: 'text-teal-400' },
                                      { label: 'Crédito', field: 'licencaCredito', color: 'text-emerald-500' }
                                    ].map((mod) => (
                                      <label key={mod.field} className="flex items-center gap-2 p-2 rounded-lg border border-zinc-800 bg-zinc-900 cursor-pointer hover:bg-zinc-850 transition-colors">
                                        <input
                                          type="checkbox"
                                          checked={!!(p as any)[mod.field]}
                                          onChange={(e) => {
                                            atualizarClienteCRM(p.uid, { [mod.field]: e.target.checked });
                                          }}
                                          className="rounded text-amber-500 focus:ring-amber-500 size-4 mt-0.5 border-zinc-700"
                                        />
                                        <span className={`text-[10px] font-extrabold uppercase ${mod.color}`}>{mod.label}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
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
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="truncate text-sm font-bold text-white">{proj.nome}</span>
                          {proj.excluidoEm ? (
                            <span className="rounded bg-red-950/80 px-1.5 py-0.5 text-[9px] font-bold text-red-400 border border-red-800/40 uppercase shrink-0">Lixeira</span>
                          ) : null}
                        </div>
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

      {/* Modal Tutorial Didático de Senha de App SMTP */}
      <Dialog open={mostrarTutorialSmtp} onOpenChange={setMostrarTutorialSmtp}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-6 overflow-y-auto bg-zinc-950 text-white border-zinc-800">
          <DialogHeader className="border-b border-zinc-800 pb-3">
            <DialogTitle className="flex items-center gap-2 font-black uppercase text-base text-indigo-400">
              <BookOpen className="size-5" /> Passo a Passo: Como Obter a Senha de App de E-mail
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 text-xs text-zinc-300 py-3 leading-relaxed">
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-200">
              <strong className="text-amber-300 block uppercase font-bold mb-1">Por que a senha normal não funciona?</strong>
              Por motivos de segurança cibernética, o Google, a Microsoft e outros grandes provedores impedem o uso direto da senha da sua conta de e-mail em aplicativos externos. É necessário gerar um código de 16 caracteres exclusivo chamado <strong>Senha de App</strong>.
            </div>

            {/* Tutorial Gmail */}
            <div className="p-4 border border-indigo-500/30 bg-indigo-500/10 rounded-xl space-y-2">
              <div className="font-bold text-sm text-indigo-300 flex items-center gap-1.5">
                <Mail className="size-4 text-indigo-400" /> 1. Como gerar no Google / Gmail (smtp.gmail.com)
              </div>
              <ol className="list-decimal pl-4 space-y-1.5 text-zinc-300">
                <li>Acesse as configurações da sua Conta Google: <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline font-bold">myaccount.google.com/security</a>.</li>
                <li>Verifique se a <strong>Verificação em duas etapas</strong> está ATIVADA (obrigatório pelo Google).</li>
                <li>Na barra de busca no topo da página de Segurança Google, digite <strong>&quot;Senhas de app&quot;</strong>.</li>
                <li>Clique no item &quot;Senhas de app&quot;, selecione um nome para o app (digite <code>Souza CAD</code>) e clique em <strong>Criar</strong>.</li>
                <li>O Google mostrará uma senha amarela de 16 letras (ex: <code>abcd efgh ijkl mnop</code>).</li>
                <li><strong>Copie essa senha de 16 letras</strong> e cole no campo &quot;Senha de app&quot; no Souza CAD (Host: <code>smtp.gmail.com</code> | Porta: <code>465</code>).</li>
              </ol>
            </div>

            {/* Tutorial Outlook */}
            <div className="p-4 border border-blue-500/30 bg-blue-500/10 rounded-xl space-y-2">
              <div className="font-bold text-sm text-blue-300 flex items-center gap-1.5">
                <Mail className="size-4 text-blue-400" /> 2. Como gerar no Outlook / Hotmail (smtp-mail.outlook.com)
              </div>
              <ol className="list-decimal pl-4 space-y-1.5 text-zinc-300">
                <li>Acesse o painel de segurança da sua conta Microsoft em <a href="https://account.live.com/proofs/manage/additional" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-bold">account.live.com/proofs/manage</a>.</li>
                <li>Procure pela opção <strong>Senhas de aplicativo</strong> e clique em <em>Criar uma nova senha de aplicativo</em>.</li>
                <li>Copie a senha gerada e cole no campo &quot;Senha de app&quot; (Host: <code>smtp-mail.outlook.com</code> | Porta: <code>587</code>).</li>
              </ol>
            </div>

            {/* Tutorial Webmail Próprio */}
            <div className="p-4 border border-emerald-500/30 bg-emerald-500/10 rounded-xl space-y-2">
              <div className="font-bold text-sm text-emerald-300 flex items-center gap-1.5">
                <Mail className="size-4 text-emerald-400" /> 3. E-mail Corporativo / Webmail / cPanel (Hostgator, Locaweb, etc.)
              </div>
              <p className="text-zinc-300">
                Em servidores de hospedagem próprios, você utiliza a própria senha da conta de e-mail criada no cPanel (ex: <code>contato@seudominio.com.br</code>). O Host é geralmente <code>mail.seudominio.com.br</code> e a Porta é <code>465</code> (SSL) ou <code>587</code> (TLS).
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-800 flex justify-end">
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs" onClick={() => setMostrarTutorialSmtp(false)}>
              Entendi, Fechar Tutorial
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
