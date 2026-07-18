'use client';

import { useEffect, useRef, useState } from 'react';
import { FileCog, FileSpreadsheet, RotateCcw, Check, UploadCloud, UserCheck, Trash2, FileText, Download, Upload, Plus, DollarSign, PlayCircle, Database, Music, Shield, Crown, Phone, Building2, Users, User, Sliders, Binary, Settings, Coins, Keyboard } from 'lucide-react';
import ModelosDocsModal from './ModelosDocsModal';
import PontosBancoModal from './PontosBancoModal';
import { zerarBancoPontos } from '@/lib/store/registro';
import { TERMOS, TERMOS_VERSAO, TERMOS_TITULAR } from '@/lib/legal/termos';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { auth } from '@/lib/firebase/client';
import { sincronizarPerfil, obterPerfilUsuario, criarConvite, listarConvitesEnviados, cancelarConvite, listarMembrosDoWorkspace, removerMembroDoWorkspace, excluirMinhaConta, listarSolicitacoesRecebidas, aprovarSolicitacao, recusarSolicitacao, type ConvitePendente, type PerfilUso, type SolicitacaoVinculo } from '@/lib/store/perfilUso';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { TecnicoData, EscritorioData, RegistroProfissionalExtra, ColegaCad } from '@/lib/topo/types';
import {
  carregarTecnico,
  salvarTecnico,
  TECNICO_PADRAO,
  carregarEscritorio,
  salvarEscritorio,
  ESCRITORIO_PADRAO,
  salvarModeloSigef,
  temModeloSigefProprio,
  limparModeloSigef,
  proximoNumeroReciboSeq,
  definirNumeroReciboSeq,
} from '@/lib/store/settings';
import { souMaster, carregarWhatsappSuporte, salvarWhatsappSuporte, carregarWhatsappSuporteNome, salvarWhatsappSuporteNome, carregarGeminiApiKey, salvarGeminiApiKey } from '@/lib/store/suporte';
import { minhaEmpresa, type Empresa } from '@/lib/store/empresas';
import { carregarModelos, salvarModelos, MODELOS_PADRAO } from '@/lib/store/modelos';
import { carregarPreferencias, salvarPreferencias, aplicarEscalaFonte, PREFERENCIAS_PADRAO, ATALHOS_F_PADRAO, type PreferenciasApp } from '@/lib/store/preferencias';
import { carregarPadroes, salvarPadroes, PADROES_PADRAO, type PadroesProjeto } from '@/lib/store/padroes';
import { carregarPrecos, salvarPrecos, type PrecoServico } from '@/lib/store/precos';
import { exportarConfiguracoesJson, importarConfiguracoesJson } from '@/lib/store/backup';
import { confirmar, avisar } from '@/lib/ui/dialogos';
import { cpfOuCnpjValido, formatarCpfCnpj } from '@/lib/topo/validation';
import ImportTxtConfigModal from '@/components/ImportTxtConfigModal';
import ImportVerticesVizinhoConfigModal from '@/components/ImportVerticesVizinhoConfigModal';
import { colegasCad } from '@/lib/store/cadastros';

const TEXTO_TECNICO_RTK_NTRIP =
  'As coordenadas dos vértices descritos neste memorial foram determinadas por meio de ' +
  'levantamento topográfico georreferenciado ao Sistema Geodésico Brasileiro, adotando-se o ' +
  'datum SIRGAS2000, mediante utilização de tecnologia GNSS de dupla frequência em modo RTK ' +
  'com correções diferenciais em tempo real recebidas via protocolo NTRIP, a partir de ' +
  'estações de referência ativa integrantes da Rede Brasileira de Monitoramento Contínuo (RBMC/IBGE). ' +
  'As determinações asseguram coerência geométrica, confiabilidade dos dados e ' +
  'compatibilidade com os padrões adotados pelo Incra para fins de certificação, quando ' +
  'aplicável. As distâncias, perímetro e área do imóvel foram calculados a partir das ' +
  'coordenadas dos vértices levantados, em sistema de referência adequado ao levantamento realizado.';

const ACOES_ATALHOS: Record<string, string> = {
  tutorial: 'Tutorial Interativo',
  pontos: 'Importar Pontos (TXT/CSV)',
  sigef: 'Importar SIGEF/INCRA',
  dados: 'Dados do Imóvel/Dono',
  confro: 'Confrontações / Proprietários',
  divisas: 'Tipo de Divisa / Limite',
  trt: 'Emitir TRT / RT',
  ods: 'Planilha SIGEF (ODS)',
  conferir: 'Conferência Geral',
  pecas: 'Peças Técnicas / Documentos',
  cert: 'Login SIGEF/INCRA',
  car: 'Consulta CAR / Área Ambiental',
  navegar: 'Navegar / Modo Mover',
  linha: 'Desenhar Linha',
  polilinha: 'Desenhar Polilinha',
  tracejado: 'Desenhar Linha Tracejada',
  texto: 'Inserir Texto',
  cota: 'Inserir Cota / Medida',
  simbolo: 'Inserir Símbolo',
  retangulo: 'Desenhar Retângulo',
  circulo: 'Desenhar Círculo',
  arco: 'Desenhar Arco',
  selecao_varios: 'Selecionar Vários',
  medir: 'Medir Distância',
  paralela: 'Criar Paralela',
  dividir: 'Dividir Linha',
  aparar: 'Aparar Linha (Trim)',
  prolongar: 'Prolongar Linha (Extend)',
};

type AbaConfig =
  | 'escritorio'
  | 'equipe'
  | 'pessoal'
  | 'comportamento'
  | 'atalhos'
  | 'numeracao'
  | 'modelos'
  | 'padroes'
  | 'colegas';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfigChange?: () => void; // Notifica a página principal caso mude algum contador ou fuso base
  abaInicial?: AbaConfig;      // aba aberta ao abrir (ex.: 'pessoal' pelo botão RT)
}

export default function ConfiguracoesModal({ open, onOpenChange, onConfigChange, abaInicial }: Props) {
  const [aba, setAba] = useState<AbaConfig>('escritorio');
  useEffect(() => {
    if (open) {
      if (abaInicial) setAba(abaInicial);
      const mode = carregarPreferencias().modo;
      if (mode === 'simples' && (aba === 'numeracao' || aba === 'modelos')) {
        setAba('pessoal');
      }
    }
  }, [open, abaInicial]);
  const [t, setT] = useState<TecnicoData>(TECNICO_PADRAO);
  const [esc, setEsc] = useState<EscritorioData>(ESCRITORIO_PADRAO);
  const [msg, setMsg] = useState('');
  const [importTxtAberto, setImportTxtAberto] = useState(false);
  const [importVizinhoAberto, setImportVizinhoAberto] = useState(false);
  const [modeloProprio, setModeloProprio] = useState(false);
  const [zapSuporte, setZapSuporte] = useState('');
  const [zapSuporteNome, setZapSuporteNome] = useState('');
  const [prefs, setPrefs] = useState<PreferenciasApp>(PREFERENCIAS_PADRAO);
  const [modelosAberto, setModelosAberto] = useState(false);
  const [bancoAberto, setBancoAberto] = useState(false);
  const [padroes, setPadroes] = useState<PadroesProjeto>(PADROES_PADRAO);
  const [precos, setPrecos] = useState<PrecoServico[]>([]);
  const [reciboSeq, setReciboSeq] = useState(1);
  const sigefRef = useRef<HTMLInputElement>(null);
  const importConfigRef = useRef<HTMLInputElement>(null);
  const audioIntroRef = useRef<HTMLInputElement>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [audioIntroNome, setAudioIntroNome] = useState<string>('introducao.mp3 (padrão)');
  const [geminiKey, setGeminiKey] = useState('');
  const [workspaceUid, setWorkspaceUid] = useState('');
  const [emailConviteInput, setEmailConviteInput] = useState('');
  const [convitesEnviados, setConvitesEnviados] = useState<ConvitePendente[]>([]);
  const [membrosWorkspace, setMembrosWorkspace] = useState<PerfilUso[]>([]);
  const [empresaVinculo, setEmpresaVinculo] = useState<Empresa | null>(null); // empresa/RT a que estou vinculado (quando sou auxiliar)
  const [solicitacoesRecebidas, setSolicitacoesRecebidas] = useState<SolicitacaoVinculo[]>([]);
  const [apagandoConta, setApagandoConta] = useState(false);

  const [colegas, setColegas] = useState<ColegaCad[]>([]);
  const [novoColegaNome, setNovoColegaNome] = useState('');
  const [novoColegaTelefone, setNovoColegaTelefone] = useState('');
  const [novoColegaCred, setNovoColegaCred] = useState('');

  async function cadastrarColega() {
    if (!novoColegaNome.trim()) { flash('Preencha o nome do colega.'); return; }
    if (!novoColegaCred.trim()) { flash('Preencha o código de credenciamento.'); return; }
    const cred = novoColegaCred.trim().toUpperCase();
    if (!/^[A-Z]{3,4}$/.test(cred)) {
      flash('O código de credenciamento do INCRA deve conter 3 ou 4 letras (Ex: COIN).');
      return;
    }
    try {
      const novo = await colegasCad.salvar({
        id: '',
        nome: novoColegaNome.trim(),
        telefone: novoColegaTelefone.trim(),
        credenciamento: cred,
      });
      setColegas((prev) => [...prev, novo]);
      setNovoColegaNome('');
      setNovoColegaTelefone('');
      setNovoColegaCred('');
      flash('Colega cadastrado com sucesso!');
    } catch (e) {
      flash('Erro ao cadastrar colega: ' + ((e as Error).message || e));
    }
  }

  async function excluirColega(id: string) {
    if (!(await confirmar({ titulo: 'Excluir Colega', mensagem: 'Deseja realmente excluir este colega do cadastro?', okLabel: 'Excluir', perigo: true }))) return;
    try {
      await colegasCad.excluir(id);
      setColegas((prev) => prev.filter((c) => c.id !== id));
      flash('Colega removido com sucesso.');
    } catch (e) {
      flash('Erro ao remover colega: ' + ((e as Error).message || e));
    }
  }


  async function desvincular() {
    const myUid = auth()?.currentUser?.uid;
    if (!myUid) { flash('Erro: Usuário não autenticado.'); return; }
    try {
      await sincronizarPerfil({ workspaceUid: undefined });
      setWorkspaceUid(myUid);
      flash('Desvinculado. Recarregando...');
      setTimeout(() => { window.location.reload(); }, 1000);
    } catch {
      flash('Erro ao desvincular.');
    }
  }

  async function enviarConvite() {
    const paraEmail = emailConviteInput;
    try {
      await criarConvite(paraEmail, esc.nome);
      setEmailConviteInput('');
      listarConvitesEnviados().then(setConvitesEnviados).catch((e) => console.warn('[ConfigModal] listarConvites (enviarConvite):', e));
      // O convite já funciona sem isso (a pessoa entra sozinha ao logar com esse e-mail) — o
      // e-mail é só o aviso pra ela saber que precisa entrar. Por isso não trava o fluxo se falhar.
      try {
        const token = await auth()?.currentUser?.getIdToken();
        const r = await fetch('/api/convite/enviar-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ paraEmail, empresaNome: esc.nome }),
        });
        const data = await r.json();
        flash(data.enviado
          ? 'Convite salvo e e-mail enviado! A pessoa entra automaticamente ao logar com esse e-mail.'
          : 'Convite salvo, mas não consegui mandar o e-mail (avise a pessoa por outro meio pra ela entrar com esse e-mail).');
      } catch {
        flash('Convite salvo, mas não consegui mandar o e-mail (avise a pessoa por outro meio pra ela entrar com esse e-mail).');
      }
    } catch (e) {
      flash((e as Error).message || 'Erro ao enviar convite.');
    }
  }

  async function cancelarConviteUI(emailAlvo: string) {
    await cancelarConvite(emailAlvo);
    setConvitesEnviados((cs) => cs.filter((c) => c.email !== emailAlvo));
    flash('Convite cancelado.');
  }

  async function aprovarSolicitacaoUI(sol: SolicitacaoVinculo) {
    try {
      await aprovarSolicitacao(sol.solicitanteEmail, esc.nome);
      setSolicitacoesRecebidas((ss) => ss.filter((s) => s.solicitanteEmail !== sol.solicitanteEmail));
      listarConvitesEnviados().then(setConvitesEnviados).catch((e) => console.warn('[ConfigModal] listarConvites (aprovarSol):', e));
      flash('Pedido aprovado! A pessoa entra vinculada ao logar de novo com esse e-mail.');
    } catch (e) {
      flash((e as Error).message || 'Erro ao aprovar o pedido.');
    }
  }

  async function recusarSolicitacaoUI(solicitanteEmail: string) {
    await recusarSolicitacao(solicitanteEmail);
    setSolicitacoesRecebidas((ss) => ss.filter((s) => s.solicitanteEmail !== solicitanteEmail));
    flash('Pedido recusado.');
  }

  async function removerMembroUI(m: PerfilUso) {
    if (!(await confirmar({
      titulo: 'Remover membro da equipe',
      mensagem: `Tem certeza que deseja remover ${m.email} deste workspace? O acesso dele aos projetos será revogado imediatamente.`,
      okLabel: 'Remover',
      perigo: true
    }))) return;
    try {
      await removerMembroDoWorkspace(m.uid);
      setMembrosWorkspace((membros) => membros.filter((x) => x.uid !== m.uid));
      flash('Membro removido com sucesso.');
    } catch (e) {
      flash('Erro ao remover membro: ' + ((e as Error).message || 'erro'));
    }
  }

  useEffect(() => {
    if (open) {
      setT(carregarTecnico());
      setEsc(carregarEscritorio());
      temModeloSigefProprio().then(setModeloProprio).catch((e) => console.warn('[ConfigModal] temModeloSigefProprio:', e));
      setPrefs(carregarPreferencias());
      setPadroes(carregarPadroes());
      setPrecos(carregarPrecos());
      setReciboSeq(proximoNumeroReciboSeq());
      colegasCad.listar().then(setColegas).catch((e) => { console.warn('[ConfigModal] listarColegas:', e); flash('Nuvem indisponível — dados locais ativos.'); });
      if (souMaster()) {
        carregarWhatsappSuporte().then(setZapSuporte).catch((e) => console.warn('[ConfigModal] carregarWhatsappSuporte:', e));
        carregarWhatsappSuporteNome().then(setZapSuporteNome).catch((e) => console.warn('[ConfigModal] carregarWhatsappSuporteNome:', e));
        carregarGeminiApiKey().then(setGeminiKey).catch((e) => console.warn('[ConfigModal] carregarGeminiApiKey:', e));
      }
      obterPerfilUsuario().then((p) => {
        if (p) {
          setWorkspaceUid(p.workspaceUid || p.uid);
        }
      }).catch((e) => console.warn('[ConfigModal] obterPerfilUsuario:', e));
      listarConvitesEnviados().then(setConvitesEnviados).catch((e) => console.warn('[ConfigModal] listarConvites (init):', e));
      listarMembrosDoWorkspace().then(setMembrosWorkspace).catch((e) => console.warn('[ConfigModal] listarMembros:', e));
      listarSolicitacoesRecebidas().then(setSolicitacoesRecebidas).catch((e) => console.warn('[ConfigModal] listarSolicitacoes:', e));
      minhaEmpresa().then(setEmpresaVinculo).catch((e) => console.warn('[ConfigModal] minhaEmpresa:', e));
    }
  }, [open]);

  async function apagarMinhaConta() {
    const aviso = membrosWorkspace.length > 0
      ? `Você tem ${membrosWorkspace.length} colaborador(es) vinculado(s) ao seu workspace. Apagar sua conta apaga TODOS os projetos e cadastros dela — os colaboradores perdem o acesso a esses dados junto. Isso não pode ser desfeito. Quer mesmo apagar?`
      : 'Isso apaga sua conta e TODOS os seus projetos e cadastros salvos na nuvem, sem volta. Quer mesmo apagar?';
    if (!(await confirmar({ titulo: 'Apagar minha conta', mensagem: aviso, okLabel: 'Apagar minha conta', perigo: true }))) return;
    setApagandoConta(true);
    try {
      await excluirMinhaConta();
      flash('Conta apagada.');
      window.location.reload();
    } catch (e) {
      flash((e as Error).message || 'Erro ao apagar a conta.');
      setApagandoConta(false);
    }
  }

  const flash = (m: string) => {
    setMsg(m);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setMsg(''), 2000);
  };

  const changeT = (k: keyof TecnicoData, val: TecnicoData[keyof TecnicoData]) => {
    const updated = { ...t, [k]: val };
    setT(updated);
    salvarTecnico(updated);
    onConfigChange?.();
    flash('Salvo automaticamente');
  };

  // Formações/registros ADICIONAIS do técnico (além da principal) — ex.: também é engenheiro.
  const addRegistroExtra = () => {
    changeT('registrosExtras', [...(t.registrosExtras ?? []), { formacao: '', conselho: 'CREA', registro: '' }]);
  };
  const changeRegistroExtra = (i: number, patch: Partial<RegistroProfissionalExtra>) => {
    const lista = [...(t.registrosExtras ?? [])];
    lista[i] = { ...lista[i], ...patch };
    changeT('registrosExtras', lista);
  };
  const removeRegistroExtra = (i: number) => {
    changeT('registrosExtras', (t.registrosExtras ?? []).filter((_, idx) => idx !== i));
  };

  const changeEsc = (k: keyof EscritorioData, val: EscritorioData[keyof EscritorioData]) => {
    const updated = { ...esc, [k]: val };
    setEsc(updated);
    salvarEscritorio(updated);
    onConfigChange?.();
    flash('Salvo automaticamente');
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    changeEsc('cnpj', formatarCpfCnpj(e.target.value));
  };

  const handleCnpjBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      const clean = val.replace(/\D/g, '');
      if (clean.length > 0 && !cpfOuCnpjValido(clean)) {
        await avisar({
          titulo: 'Documento Inválido',
          mensagem: `O CNPJ / CPF informado ("${val}") é inválido. Por favor, digite um CPF ou CNPJ correto.`
        });
        changeEsc('cnpj', '');
      }
    }
  };

  const mudarPref = <K extends keyof PreferenciasApp>(k: K, val: PreferenciasApp[K]) => {
    const np = { ...prefs, [k]: val };
    setPrefs(np);
    salvarPreferencias(np);
    onConfigChange?.();
    flash('Salvo automaticamente');
  };

  const mudarPadrao = <K extends keyof PadroesProjeto>(k: K, val: PadroesProjeto[K]) => {
    const np = { ...padroes, [k]: val };
    setPadroes(np);
    salvarPadroes(np);
    flash('Salvo automaticamente');
  };

  const salvarListaPrecos = (lista: PrecoServico[]) => {
    setPrecos(lista);
    salvarPrecos(lista);
    flash('Salvo automaticamente');
  };
  const mudarPreco = (id: string, campo: 'servico' | 'valor', valor: string) => {
    salvarListaPrecos(precos.map((p) => p.id === id ? { ...p, [campo]: campo === 'valor' ? (Number(valor.replace(',', '.')) || 0) : valor } : p));
  };
  const adicionarPreco = () => {
    salvarListaPrecos([...precos, { id: `p_${Date.now().toString(36)}`, servico: '', valor: 0 }]);
  };
  const removerPreco = (id: string) => {
    salvarListaPrecos(precos.filter((p) => p.id !== id));
  };

  const reverIntro = () => {
    window.dispatchEvent(new Event('souzacad:ver-intro'));
    onOpenChange(false);
  };

  const mudarReciboSeq = (v: number) => {
    const n = Math.max(1, Math.floor(v) || 1);
    setReciboSeq(n);
    definirNumeroReciboSeq(n);
    flash('Salvo automaticamente');
  };

  async function importarConfig(file: File) {
    if (!(await confirmar({ titulo: 'Restaurar configurações', mensagem: 'Restaurar as configurações deste arquivo?\n\nOs seus ajustes atuais (assinatura, escritório, modelos de texto, títulos, preços e padrões) serão substituídos pelos do arquivo. Os projetos não são afetados.', okLabel: 'Restaurar' }))) return;
    try {
      const n = await importarConfiguracoesJson(file);
      // recarrega o que está na tela
      setT(carregarTecnico()); setEsc(carregarEscritorio()); setPrefs(carregarPreferencias());
      setPadroes(carregarPadroes()); setPrecos(carregarPrecos()); setReciboSeq(proximoNumeroReciboSeq());
      onConfigChange?.();
      flash(`${n} configuração(ões) restauradas.`);
    } catch {
      flash('Arquivo inválido — não foi possível restaurar.');
    }
  }

  async function atualizarModeloSigef(file: File) {
    if (
      !(await confirmar({
        titulo: 'Substituir planilha SIGEF',
        mensagem: 'Deseja realmente substituir a planilha SIGEF do sistema por este arquivo?\n\nEle passará a ser usado em TODAS as exportações de planilha (.ods), no lugar do modelo embutido.',
        okLabel: 'Substituir',
      }))
    )
      return;
    await salvarModeloSigef(await file.arrayBuffer());
    setModeloProprio(true);
    onConfigChange?.();
    flash('Modelo SIGEF atualizado.');
  }

   
  async function restaurarModeloSigef() {
    if (!(await confirmar({ titulo: 'Restaurar planilha SIGEF', mensagem: 'Voltar a usar o modelo de planilha SIGEF embutido do sistema?', okLabel: 'Restaurar' }))) return;
    await limparModeloSigef();
    setModeloProprio(false);
    onConfigChange?.();
    flash('Modelo SIGEF restaurado.');
  }

  function lerLogo(file: File) {
    if (file.size > 500 * 1024) {
      flash('Logotipo muito grande! Limite de 500 KB para evitar lentidão.');
      return;
    }
    const r = new FileReader();
    r.onload = () => {
      changeEsc('logoDataUrl', String(r.result));
    };
    r.readAsDataURL(file);
  }

  function lerAssinatura(file: File) {
    if (file.size > 500 * 1024) {
      flash('Assinatura muito grande! Limite de 500 KB para evitar lentidão.');
      return;
    }
    const r = new FileReader();
    r.onload = () => {
      changeEsc('assinaturaDataUrl', String(r.result));
    };
    r.readAsDataURL(file);
  }

  const getTabIcon = (a: AbaConfig) => {
    switch (a) {
      case 'escritorio': return <Building2 className="size-4" />;
      case 'equipe': return <Users className="size-4" />;
      case 'pessoal': return <User className="size-4" />;
      case 'comportamento': return <Sliders className="size-4" />;
      case 'atalhos': return <Keyboard className="size-4" />;
      case 'numeracao': return <Binary className="size-4" />;
      case 'modelos': return <FileCog className="size-4" />;
      case 'padroes': return <Settings className="size-4" />;
      case 'colegas': return <UserCheck className="size-4" />;
      default: return <Settings className="size-4" />;
    }
  };

  const Tb = ({ a, rotulo, titulo }: { a: AbaConfig; rotulo: string; titulo?: string }) => {
    if (prefs.modo === 'simples' && (a === 'numeracao' || a === 'modelos')) {
      return null;
    }
    const ativo = aba === a;
    
    const getActiveStyles = (abaName: AbaConfig) => {
      if (['escritorio', 'equipe'].includes(abaName)) {
        return 'bg-amber-500/5 text-amber-600 dark:text-amber-400 font-extrabold border-amber-500/20 shadow-[0_2px_8px_rgba(245,158,11,0.05)]';
      }
      if (['pessoal', 'comportamento', 'atalhos'].includes(abaName)) {
        return 'bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 font-extrabold border-indigo-500/20 shadow-[0_2px_8px_rgba(99,102,241,0.05)]';
      }
      return 'bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 font-extrabold border-emerald-500/20 shadow-[0_2px_8px_rgba(16,185,129,0.05)]';
    };

    return (
      <button onClick={() => setAba(a)} title={titulo}
        className={`w-full text-left px-3 py-2 rounded-lg text-[11px] font-semibold tracking-wide transition-all duration-150 flex items-center justify-between border group ${
          ativo
            ? getActiveStyles(a)
            : 'bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
        }`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`transition-transform duration-200 group-hover:scale-110 ${ativo ? 'text-current' : 'text-muted-foreground/75 group-hover:text-foreground'}`}>
            {getTabIcon(a)}
          </span>
          <span className="truncate">{rotulo}</span>
        </div>
        {ativo ? (
          <span className={`size-1.5 rounded-full animate-pulse ${
            ['escritorio', 'equipe'].includes(a) ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]' :
            ['pessoal', 'comportamento', 'atalhos'].includes(a) ? 'bg-indigo-500 shadow-[0_0_8px_#6366f1]' :
            'bg-emerald-500 shadow-[0_0_8px_#10b981]'
          }`} />
        ) : (
          <span className="size-1 rounded-full bg-zinc-300 dark:bg-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </button>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[92vh] flex flex-col bg-background/95 backdrop-blur-md shadow-2xl p-0 overflow-hidden rounded-xl text-foreground border border-border/50">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <Settings className="size-5 text-indigo-500" />
            <div>
              <DialogTitle className="text-sm font-bold tracking-tight">
                Configurações do Sistema
              </DialogTitle>
              <p className="text-[11px] text-muted-foreground">Gerencie preferências pessoais, dados da empresa e parâmetros do projeto.</p>
            </div>
          </div>
          {msg && (
            <span className="text-xs bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5 font-semibold animate-pulse shadow-sm">
              <span className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
              {msg}
            </span>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Menu Lateral de Navegação */}
          <div className="w-60 border-r border-border/40 bg-zinc-50/50 dark:bg-zinc-950/20 flex flex-col gap-4 p-4 shrink-0 overflow-y-auto select-none">
            {/* Grupo 1: Empresa */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 px-2 mb-1">
                <span className="size-1.5 rounded-full bg-amber-500" />
                <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/80">Empresa</span>
              </div>
              <div className="space-y-0.5">
                <Tb a="escritorio" rotulo="Dados da Empresa" titulo="Identificação, contato, endereço, logotipo e cores" />
                <Tb a="equipe" rotulo="Ajudantes / Equipe" titulo="Convidar colaboradores e gerenciar permissões" />
              </div>
            </div>

            {/* Grupo 2: Pessoais */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 px-2 mb-1">
                <span className="size-1.5 rounded-full bg-indigo-500" />
                <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/80">Pessoal</span>
              </div>
              <div className="space-y-0.5">
                <Tb a="pessoal" rotulo="Responsável Técnico" titulo="Seu nome, formação, conselho e registros" />
                <Tb a="comportamento" rotulo="Comportamento" titulo="Tema, tamanho da fonte e preferências" />
                <Tb a="atalhos" rotulo="Atalhos" titulo="Teclas de atalho do teclado" />
              </div>
            </div>

            {/* Grupo 3: Workspace */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 px-2 mb-1">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/80">Workspace</span>
              </div>
              <div className="space-y-0.5">
                <Tb a="numeracao" rotulo="Numeração e Fuso" titulo="Contador de marcos, fuso e hemisfério" />
                <Tb a="modelos" rotulo="Importação e Modelos" titulo="Modelos de memorial, layout TXT e vizinhos" />
                <Tb a="padroes" rotulo="Padrões & Backup" titulo="Valores padrão, tabela de preços e backup" />
                <Tb a="colegas" rotulo="Colegas" titulo="Lista de agrimensores credenciados confrontantes" />
              </div>
            </div>
          </div>

          {/* Área de Conteúdo Principal */}
          <div className="flex-1 overflow-y-auto p-6 bg-background">
          {aba === 'pessoal' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3.5">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Nome Completo</Label>
                  <Input value={t.nome} onChange={(e) => changeT('nome', e.target.value)} />
                </div>
                {/* conselho: define as siglas das peças — técnico (CFT/TRT) x engenheiro (CREA/ART) x técnico agrícola (CFTA/TRT) */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Conselho / categoria</Label>
                  <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={t.conselho ?? 'CFT'} onChange={(e) => changeT('conselho', e.target.value as 'CFT' | 'CREA' | 'CFTA' | 'CFT+CREA' | 'CFTA+CREA')}>
                    <option value="CFT">Técnico Agrimensura — CFT (emite TRT)</option>
                    <option value="CFTA">Técnico Agrícola — CFTA (emite TRT)</option>
                    <option value="CREA">Engenheiro — CREA (emite ART)</option>
                    <option value="CFT+CREA">CFT e CREA (Técnico e Engenheiro)</option>
                    <option value="CFTA+CREA">CFTA e CREA (Téc. Agrícola e Engenheiro)</option>
                  </select>
                </div>
                {prefs.modo === 'simples' ? (
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Registro {t.conselho ?? 'CFT'}</Label>
                    <Input value={t.cft} onChange={(e) => changeT('cft', e.target.value)} />
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Formação Profissional</Label>
                      <Input value={t.formacao} onChange={(e) => changeT('formacao', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Registro {t.conselho ?? 'CFT'}</Label>
                      <Input value={t.cft} onChange={(e) => changeT('cft', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Cidade da Assinatura (peças técnicas)</Label>
                      <Input value={t.cidadeAssinatura} onChange={(e) => changeT('cidadeAssinatura', e.target.value)} />
                    </div>

                    {/* Formações/registros adicionais: quem tem mais de uma formação (ex.: técnico e
                        também engenheiro) cadastra aqui. Na hora de emitir o TRT/ART, escolhe qual
                        credencial usar naquela peça. */}
                    <div className="space-y-1.5 rounded-sm border p-2.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">Outras formações / registros</Label>
                        <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={addRegistroExtra}>
                          <Plus className="size-3.5" /> Adicionar
                        </Button>
                      </div>
                      <p className="text-[11px] leading-tight text-muted-foreground">
                        Tem mais de uma formação, técnica ou superior? Cadastre aqui — ao emitir o TRT/ART você escolhe qual credencial citar naquela peça.
                      </p>
                      {(t.registrosExtras ?? []).map((r, i) => (
                        <div key={i} className="flex items-center gap-1.5 rounded-sm border bg-muted/20 p-1.5">
                          <select className="h-8 shrink-0 rounded-sm border bg-background px-1.5 text-xs"
                            value={r.conselho} onChange={(e) => changeRegistroExtra(i, { conselho: e.target.value as RegistroProfissionalExtra['conselho'] })}>
                            <option value="CFT">CFT (Técnico)</option>
                            <option value="CFTA">CFTA (Téc. Agrícola)</option>
                            <option value="CREA">CREA (Engenheiro)</option>
                          </select>
                          <Input className="h-8 text-xs" placeholder="Formação (ex.: Engenheiro Agrônomo)"
                            value={r.formacao} onChange={(e) => changeRegistroExtra(i, { formacao: e.target.value })} />
                          <Input className="h-8 w-28 shrink-0 text-xs" placeholder="Nº registro"
                            value={r.registro} onChange={(e) => changeRegistroExtra(i, { registro: e.target.value })} />
                          <Button size="sm" variant="ghost" className="h-8 w-8 shrink-0 p-0 text-destructive" onClick={() => removeRegistroExtra(i)} title="Remover">
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-3.5 border-t md:border-t-0 md:border-l md:pl-4 pt-3.5 md:pt-0">
                <div className="p-2.5 rounded-sm bg-muted/40 text-[11px] leading-tight text-muted-foreground border">
                  Estes dados são <strong>pessoais</strong>: cada técnico da empresa assina as peças com os seus. O escritório, a numeração, o fuso e os modelos são da empresa (abas Globais).
                </div>
              </div>
            </div>
          )}

          {aba === 'comportamento' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Conferência antes de exportar</div>
                <Interruptor
                  ligado={prefs.bloquearExportacaoIncompleta}
                  onToggle={(v) => mudarPref('bloquearExportacaoIncompleta', v)}
                  titulo="Travar exportação com problema grave"
                  descricao="Ligado (recomendado): geometria incompleta ou código de vértice repetido impede a exportação, porque o SIGEF rejeitaria. Desligado: vira só aviso e você decide prosseguir." />
                <Interruptor
                  ligado={prefs.exigirConjuge}
                  onToggle={(v) => mudarPref('exigirConjuge', v)}
                  titulo="Exigir cônjuge preenchido"
                  descricao="Avisa antes de exportar se faltar o nome do cônjuge do proprietário ou de algum confrontante. Útil para escritórios que sempre colhem a assinatura do casal." />
                <Interruptor
                  ligado={prefs.exigirCns}
                  onToggle={(v) => mudarPref('exigirCns', v)}
                  titulo="Exigir CNS do cartório"
                  descricao="Avisa antes de exportar se o código CNS do cartório do imóvel estiver vazio." />

                 <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground pt-1">Segurança</div>
                <Interruptor
                  ligado={prefs.confirmarAntesApagar}
                  onToggle={(v) => mudarPref('confirmarAntesApagar', v)}
                  titulo="Confirmar antes de apagar"
                  descricao="Ligado (recomendado): pede confirmação antes de excluir vértice, projeto ou divisa, pra você não apagar sem querer. Desligado: apaga na hora, mais rápido pra quem tem certeza." />

                <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground pt-1">Desenho e Planta</div>
                <Interruptor
                  ligado={!!prefs.mostrarAssinaturaConfrontantes}
                  onToggle={(v) => mudarPref('mostrarAssinaturaConfrontantes', v)}
                  titulo="Assinatura dos confrontantes na planta"
                  descricao="Ligado (padrão): exibe os campos/linhas para assinatura dos confrontantes na planta final impressa. Desligado: oculta esses campos para um desenho mais limpo." />

              </div>

              <div className="space-y-3 border-t md:border-t-0 md:border-l md:pl-4 pt-3 md:pt-0">
                <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Ajuda e linguagem</div>
                <Interruptor
                  ligado={prefs.mostrarDicasEducativas}
                  onToggle={(v) => mudarPref('mostrarDicasEducativas', v)}
                  titulo="Mostrar dicas educativas"
                  descricao="Liga as explicações do glossário (por exemplo, os tipos de ato no requerimento). Desligue para uma tela mais enxuta." />

                {/* Modo da interface: quantas ferramentas aparecem. É AQUI que dá pra voltar pro Simples
                    quando a chave do topo já sumiu (some depois de 5 h de uso no Completo). */}
                <div className="space-y-1.5 rounded-sm border p-2.5">
                  <Label className="text-xs font-semibold">Modo da interface</Label>
                  <p className="text-[11px] leading-tight text-muted-foreground">Quanta ferramenta aparece na tela, em três degraus. O <strong>Fácil</strong> mostra só o essencial, pra qualquer nível se adaptar ao software e ainda assim entregar um trabalho básico completo; o <strong>Médio</strong> acrescenta as ferramentas do dia a dia (desenho, anotação, vértices, vizinhos certificados, errata, CAR, calculadora e camadas); o <strong>Completo</strong> mostra tudo, inclusive as avançadas. Depois de bastante uso no Completo, a chave flutuante some e é aqui que você volta pro Fácil.</p>
                  <div className="flex w-fit items-center gap-1 rounded-full border bg-muted/40 p-0.5 text-xs">
                    {(['simples', 'medio', 'completo'] as const).map((m) => (
                      <button key={m} type="button" onClick={() => mudarPref('modo', m)}
                        className={`rounded-full px-3 py-1 font-semibold transition-colors ${prefs.modo === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>{m === 'simples' ? 'Fácil' : m === 'medio' ? 'Médio' : 'Completo'}</button>
                    ))}
                  </div>
                </div>

                {/* Nível da ajuda: quanta explicação. Coisa diferente do modo — é sobre tempo de profissão. */}
                <div className="space-y-1.5 rounded-sm border p-2.5">
                  <Label className="text-xs font-semibold">Nível da ajuda</Label>
                  <p className="text-[11px] leading-tight text-muted-foreground">Quanta explicação a ajuda dá. <strong>Iniciante</strong> explica os porquês; <strong>Experiente</strong> vai direto ao ponto, pra o agrimensor que já tem tempo de profissão. É separado do modo da interface.</p>
                  <div className="flex w-fit items-center gap-1 rounded-full border bg-muted/40 p-0.5 text-xs">
                    {(['iniciante', 'experiente'] as const).map((n) => (
                      <button key={n} type="button" onClick={() => mudarPref('nivelExperiencia', n)}
                        className={`rounded-full px-3 py-1 font-semibold capitalize transition-colors ${prefs.nivelExperiencia === n ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>{n}</button>
                    ))}
                  </div>
                </div>

                <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground pt-1">Abertura do app</div>
                <Interruptor
                  ligado={prefs.introVideoAtiva}
                  onToggle={(v) => mudarPref('introVideoAtiva', v)}
                  titulo="Mostrar vídeo de abertura"
                  descricao="Toca a animação da marca toda vez que o app é carregado. Desligado: entra direto no editor, sem abertura." />
                <Button variant="outline" size="sm" className="w-full gap-1.5 font-semibold" onClick={reverIntro}>
                  <PlayCircle className="size-4" /> Ver a abertura agora
                </Button>

                {/* Áudio de introdução — só para admins (master) */}
                {souMaster() && (
                  <>
                    <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground pt-1">Áudio de Introdução (Admin)</div>
                    <div className="rounded-sm border p-2.5 space-y-2">
                      <p className="text-[11px] leading-tight text-muted-foreground">
                        O player de introdução fica no canto superior direito da tela. O arquivo padrão é <code className="bg-muted rounded-sm px-1">introducao.mp3</code>. Você pode substituir por outro áudio (MP3, OGG ou WAV, máx 20 MB) — fica salvo localmente neste navegador.
                      </p>
                      <div className="flex items-center gap-2">
                        <Music className="size-4 shrink-0 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground truncate flex-1">{audioIntroNome}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => audioIntroRef.current?.click()}
                        >
                          <UploadCloud className="size-4" /> Substituir áudio
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-destructive hover:text-destructive"
                          onClick={async () => {
                            const { removerAudioIntroIdb } = await import('@/components/IntroAudio');
                            await removerAudioIntroIdb();
                            setAudioIntroNome('introducao.mp3 (padrão)');
                            flash('Áudio restaurado para o padrão');
                          }}
                        >
                          <Trash2 className="size-4" /> Restaurar padrão
                        </Button>
                      </div>
                      <input
                        ref={audioIntroRef}
                        type="file"
                        accept="audio/mp3,audio/mpeg,audio/ogg,audio/wav"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 20 * 1024 * 1024) { flash('Arquivo muito grande (máx 20 MB)'); return; }
                          const reader = new FileReader();
                          reader.onloadend = async () => {
                            const { salvarAudioIntroIdb } = await import('@/components/IntroAudio');
                            await salvarAudioIntroIdb(reader.result as string);
                            setAudioIntroNome(file.name);
                            flash('Áudio de introdução atualizado!');
                          };
                          reader.readAsDataURL(file);
                          e.target.value = '';
                        }}
                      />
                    </div>
                  </>
                )}

                <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground pt-1">Aparência da tela</div>
                <div className="space-y-1.5 rounded-sm border p-2.5">
                  <Label className="text-xs font-semibold">Tamanho do texto</Label>
                  <p className="text-[11px] leading-tight text-muted-foreground">Deixa a interface com letra maior ou menor. Bom pra ler no sol ou em tela pequena.</p>
                  <div className="flex w-fit items-center gap-1 rounded-full border bg-muted/40 p-0.5 text-xs">
                    {([['Menor', 0.9], ['Normal', 1], ['Maior', 1.1], ['Grande', 1.25]] as [string, number][]).map(([rotulo, val]) => (
                      <button key={val} type="button"
                        onClick={() => { mudarPref('escalaFonte', val); aplicarEscalaFonte(val); window.dispatchEvent(new CustomEvent('souzacad:escala-fonte', { detail: val })); }}
                        className={`rounded-full px-3 py-1 font-semibold transition-colors ${Math.abs((prefs.escalaFonte ?? 1) - val) < 0.001 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>{rotulo}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2 rounded-sm border p-2.5">
                  <label className="flex cursor-pointer items-start gap-2.5">
                    <input type="checkbox" className="mt-0.5 size-4 shrink-0" checked={prefs.casasDecimaisAtivo}
                      onChange={(e) => mudarPref('casasDecimaisAtivo', e.target.checked)} />
                    <span className="space-y-0.5">
                      <span className="block text-xs font-semibold">Personalizar casas decimais na tela</span>
                      <span className="block text-[11px] leading-tight text-muted-foreground">Desligado (padrão): cada tela usa a precisão que já usa. Ligado: você escolhe quantas casas aparecem em coordenadas e área <strong>na tela</strong>. Os documentos e exportações (memorial, planilha SIGEF, KML) mantêm a precisão da norma, sem mudar.</span>
                    </span>
                  </label>
                  {prefs.casasDecimaisAtivo && (
                    <div className="flex w-fit items-center gap-1 rounded-full border bg-muted/40 p-0.5 text-xs">
                      {[2, 3, 4].map((val) => (
                        <button key={val} type="button" onClick={() => mudarPref('casasDecimais', val)}
                          className={`rounded-full px-3 py-1 font-semibold transition-colors ${(prefs.casasDecimais ?? 3) === val ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>{val}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {aba === 'numeracao' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3.5">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Credenciamento INCRA (prefixo dos vértices)</Label>
                  <Input value={t.credenciamentoIncra} onChange={(e) => changeT('credenciamentoIncra', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Tecnologia do Levantamento (Padrão)</Label>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={t.tipoLevantamento || 'base_rover'}
                    onChange={(e) => {
                      const val = e.target.value as 'base_rover' | 'rtk_ntrip';
                      changeT('tipoLevantamento', val);
                      changeT('metodoPosicionamento', val === 'rtk_ntrip' ? 'PG7' : 'PG6');
                      try {
                        const mods = carregarModelos();
                        if (
                          mods.memorialInfoTecnicas === MODELOS_PADRAO.memorialInfoTecnicas ||
                          mods.memorialInfoTecnicas === TEXTO_TECNICO_RTK_NTRIP
                        ) {
                          mods.memorialInfoTecnicas = val === 'rtk_ntrip'
                            ? TEXTO_TECNICO_RTK_NTRIP
                            : MODELOS_PADRAO.memorialInfoTecnicas;
                          salvarModelos(mods);
                        }
                      } catch (err) {
                        console.error('Erro ao atualizar modelo de memorial:', err);
                      }
                    }}
                  >
                    <option value="base_rover">Base + Rover (RTK Convencional - PG6)</option>
                    <option value="rtk_ntrip">NTRIP + RTK (Correção em Rede - PG7)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Método Posicionamento</Label>
                    <Input value={t.metodoPosicionamento} onChange={(e) => changeT('metodoPosicionamento', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Tipo Limite</Label>
                    <Input value={t.tipoLimite} onChange={(e) => changeT('tipoLimite', e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Marcos (M) inicial</Label>
                    <Input type="number" value={t.contadorMarco} onChange={(e) => changeT('contadorMarco', Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Pontos (P) inicial</Label>
                    <Input type="number" value={t.contadorPonto} onChange={(e) => changeT('contadorPonto', Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Virtuais (V) inicial</Label>
                    <Input type="number" value={t.contadorVirtual ?? 1} onChange={(e) => changeT('contadorVirtual', Number(e.target.value))} />
                  </div>
                </div>
              </div>

              <div className="space-y-3.5 border-t md:border-t-0 md:border-l md:pl-4 pt-3.5 md:pt-0">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Fuso UTM principal</Label>
                  <Input type="number" value={t.zonaBase ?? 23} onChange={(e) => changeT('zonaBase', Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Fusos permitidos (auto-detecção)</Label>
                  <Input
                    value={(t.fusosPermitidos ?? [18, 19, 20, 21, 22, 23, 24, 25]).join(', ')}
                    onChange={(e) =>
                      changeT(
                        'fusosPermitidos',
                        e.target.value
                          .split(',')
                          .map((s) => Number(s.trim()))
                          .filter((n) => Number.isFinite(n))
                      )
                    }
                  />
                </div>
                <div className="p-2.5 rounded-sm bg-muted/40 text-[11px] leading-tight text-muted-foreground border">
                  <strong>Dica de agrimensor:</strong> A numeração dos contadores é a semente inicial. À medida que novos pontos são gerados, o banco de dados interno avança automaticamente para evitar duplicidades de vértices.
                </div>

                <div className="space-y-1 rounded-sm border p-2.5">
                  <Label className="text-xs font-semibold">Próximo número de recibo</Label>
                  <p className="text-[11px] leading-tight text-muted-foreground">O recibo é numerado sozinho, no formato 0001/ano. Ajuste aqui pra continuar de uma numeração antiga.</p>
                  <Input type="number" min={1} className="w-32" value={reciboSeq} onChange={(e) => mudarReciboSeq(Number(e.target.value))} />
                </div>

                {/* Gestão do banco de vértices: editar um a um (abre o Banco de pontos aqui mesmo) ou zerar tudo */}
                <div className="space-y-1.5 rounded-sm border p-2.5">
                  <div className="text-xs font-bold">Editar banco de vértices</div>
                  <p className="text-[11px] leading-tight text-muted-foreground">
                    Abra o <strong>Banco de pontos</strong> para <strong>ver, buscar e excluir vértices um a um</strong> ou resgatar da lixeira. Ou zere TODOS de uma vez (também recuperável) — útil ao trocar de credenciado ou liberar códigos de uma certificação cancelada.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setBancoAberto(true)}>
                      <Database className="size-4" /> Abrir banco de pontos
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 gap-1 border-red-600/40 text-red-700 hover:bg-red-600 hover:text-white dark:text-red-400"
                      onClick={async () => {
                        if (!(await confirmar({ titulo: 'Zerar banco de vértices', mensagem: 'Zerar o banco de vértices?\n\nTodos os vértices ativos vão para a lixeira (recuperáveis depois). Continuar?', okLabel: 'Zerar', perigo: true }))) return;
                        const n = await zerarBancoPontos();
                        flash(n > 0 ? `${n} vértice(s) movidos para a lixeira.` : 'O banco já estava vazio.');
                      }}>
                      <Trash2 className="size-4" /> Zerar banco de vértices
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {aba === 'escritorio' && (
            <div className="space-y-3">
            <p className="text-[11px] leading-snug text-muted-foreground">
              Esta é a configuração completa da empresa. Tudo o que você preencher aqui vale para toda a equipe e aparece no cabeçalho e no carimbo das peças técnicas (memorial, planta, requerimento). Só o que você quiser precisa ser preenchido — o resto pode ficar em branco.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600/90 border-b pb-1">Identificação</div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Razão Social / Nome do Escritório</Label>
                  <Input value={esc.nome} onChange={(e) => changeEsc('nome', e.target.value)} placeholder="Ex.: Souza Gestão Fundiária Ltda" title="Nome oficial da empresa (ou seu nome, se você é autônomo). Aparece no cabeçalho das peças." />
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600/90 border-b pb-1 pt-1">Marca (cores da interface)</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Cor Primária (Tema)</Label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={esc.corPrimaria || '#15803d'}
                        onChange={(e) => changeEsc('corPrimaria', e.target.value)}
                        className="size-8 rounded-md border cursor-pointer p-0 bg-transparent"
                      />
                      <Input
                        value={esc.corPrimaria || '#15803d'}
                        onChange={(e) => changeEsc('corPrimaria', e.target.value.toUpperCase())}
                        className="h-8 text-xs font-mono uppercase"
                        maxLength={7}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Cor Secundária</Label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={esc.corSecundaria || '#16a34a'}
                        onChange={(e) => changeEsc('corSecundaria', e.target.value)}
                        className="size-8 rounded-md border cursor-pointer p-0 bg-transparent"
                      />
                      <Input
                        value={esc.corSecundaria || '#16a34a'}
                        onChange={(e) => changeEsc('corSecundaria', e.target.value.toUpperCase())}
                        className="h-8 text-xs font-mono uppercase"
                        maxLength={7}
                      />
                    </div>
                  </div>
                </div>
                <p className="text-[10px] leading-snug text-muted-foreground">
                  Estas cores pintam só a interface do app (botões, destaques), nunca as peças técnicas
                  impressas — a planta e os documentos não mudam de cor. Se você escolher uma cor muito
                  clara ou muito escura (branco, preto, amarelo), o app ajusta o brilho dela sozinho pra
                  não sumir no tema claro nem no escuro. Ainda assim, prefira uma cor de contraste médio.
                </p>
                {prefs.modo === 'simples' ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">CNPJ / CPF</Label>
                        <Input value={formatarCpfCnpj(esc.cnpj)} onChange={handleCnpjChange} onBlur={handleCnpjBlur} placeholder="00.000.000/0001-00 ou CPF" title="CNPJ da empresa (ou seu CPF, se autônomo). Entra no cabeçalho e no requerimento." />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">WhatsApp / Contato</Label>
                        <Input value={esc.telefone} onChange={(e) => changeEsc('telefone', e.target.value)} placeholder="(00) 90000-0000" title="Telefone/WhatsApp de contato da empresa" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">E-mail</Label>
                      <Input type="email" value={esc.email ?? ''} onChange={(e) => changeEsc('email', e.target.value)} placeholder="contato@exemplo.com (Opcional)" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Nome Fantasia</Label>
                        <Input value={esc.nomeFantasia ?? ''} onChange={(e) => changeEsc('nomeFantasia', e.target.value)} placeholder="opcional" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Ramo de Atuação</Label>
                        <Input value={esc.ramo} onChange={(e) => changeEsc('ramo', e.target.value)} placeholder="Agrimensura e Georreferenciamento" title="Área de atuação, como aparece no cabeçalho das peças" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">CNPJ / CPF</Label>
                        <Input value={formatarCpfCnpj(esc.cnpj)} onChange={handleCnpjChange} onBlur={handleCnpjBlur} placeholder="00.000.000/0001-00 ou CPF" title="CNPJ da empresa (ou seu CPF, se autônomo). Entra no cabeçalho e no requerimento." />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">WhatsApp / Contato</Label>
                        <Input value={esc.telefone} onChange={(e) => changeEsc('telefone', e.target.value)} placeholder="(00) 90000-0000" title="Telefone/WhatsApp de contato da empresa" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Inscrição Estadual</Label>
                        <Input value={esc.inscricaoEstadual ?? ''} onChange={(e) => changeEsc('inscricaoEstadual', e.target.value)} placeholder="IE ou ISENTO" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Inscrição Municipal</Label>
                        <Input value={esc.inscricaoMunicipal ?? ''} onChange={(e) => changeEsc('inscricaoMunicipal', e.target.value)} placeholder="opcional" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Endereço (logradouro, número, bairro)</Label>
                      <Input value={esc.endereco} onChange={(e) => changeEsc('endereco', e.target.value)} placeholder="Rua Exemplo, 123, Centro" />
                    </div>
                    <div className="grid grid-cols-[1fr_auto_auto] gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Cidade</Label>
                        <Input value={esc.cidade ?? ''} onChange={(e) => changeEsc('cidade', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">UF</Label>
                        <Input className="w-16" maxLength={2} value={esc.uf ?? ''} onChange={(e) => changeEsc('uf', e.target.value.toUpperCase())} placeholder="MG" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">CEP</Label>
                        <Input className="w-28" value={esc.cep ?? ''} onChange={(e) => changeEsc('cep', e.target.value)} placeholder="36830-000" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">E-mail</Label>
                        <Input type="email" value={esc.email ?? ''} onChange={(e) => changeEsc('email', e.target.value)} placeholder="contato@exemplo.com (Opcional)" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Site / Rede Social</Label>
                        <Input value={esc.site ?? ''} onChange={(e) => changeEsc('site', e.target.value)} placeholder="opcional" />
                      </div>
                    </div>
                  </>
                )}
                {souMaster() && (
                  <div className="space-y-3 rounded-sm border border-emerald-600/30 bg-emerald-600/5 p-3">
                    <div className="grid grid-cols-1 gap-2.5">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Nome de Exibição do Suporte</Label>
                        <Input placeholder="Ex.: Darlan Souza"
                          value={zapSuporteNome}
                          onChange={(e) => setZapSuporteNome(e.target.value)}
                          onBlur={() => { salvarWhatsappSuporteNome(zapSuporteNome).then(() => flash('Nome do suporte salvo')).catch(() => flash('Salvo local; nuvem indisponível')); }} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">WhatsApp de SUPORTE do sistema (só o master vê este campo)</Label>
                        <Input placeholder="Ex.: 32 9 9999-9999 — vazio = botão de suporte não aparece"
                          value={zapSuporte}
                          onChange={(e) => setZapSuporte(e.target.value)}
                          onBlur={() => { salvarWhatsappSuporte(zapSuporte).then(() => flash('Suporte salvo')).catch(() => flash('Salvo local; nuvem indisponível')); }} />
                        <p className="text-[10px] text-muted-foreground">Aparece pros clientes como botão &quot;Falar com o suporte&quot; no tutorial. Deixe vazio pra esconder.</p>
                      </div>
                    </div>
                    <div className="space-y-1 border-t pt-2">
                      <Label className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Chave de API do Gemini IA (Global para todos os clientes)</Label>
                      <Input type="password" placeholder="AIzaSy..."
                        value={geminiKey}
                        onChange={(e) => setGeminiKey(e.target.value)}
                        onBlur={() => { salvarGeminiApiKey(geminiKey).then(() => flash('Chave Gemini salva')).catch(() => flash('Salvo local; nuvem indisponível')); }} />
                      <p className="text-[10px] text-muted-foreground">Chave de API do Google Gemini AI usada no servidor para extrair dados de documentos/matrículas dos clientes.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3.5 border-t md:border-t-0 md:border-l md:pl-4 pt-3.5 md:pt-0 flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Logotipo */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Logotipo para a Planta</Label>
                    {!esc.logoDataUrl && (
                      <div className="border border-dashed rounded-lg p-4 flex flex-col items-center justify-center bg-muted/20 hover:bg-muted/40 transition-colors relative cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) lerLogo(f);
                          }}
                        />
                        <UploadCloud className="size-8 text-muted-foreground mb-1" />
                        <span className="text-xs font-medium text-muted-foreground">Clique para selecionar imagem</span>
                      </div>
                    )}
                    {esc.logoDataUrl && (
                      <div className="mt-2 p-2 border rounded-sm bg-background flex items-center justify-between">
                        <img src={esc.logoDataUrl} alt="Logotipo do Escritório" className="h-10 object-contain" />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs text-destructive font-semibold hover:bg-destructive/10"
                          onClick={() => changeEsc('logoDataUrl', '')}
                        >
                          Remover
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Assinatura PNG */}
                  <div className="space-y-2 border-t pt-3.5">
                    <Label className="text-xs font-semibold">Assinatura Digital (PNG transparente)</Label>
                    {!esc.assinaturaDataUrl && (
                      <div className="border border-dashed rounded-lg p-4 flex flex-col items-center justify-center bg-muted/20 hover:bg-muted/40 transition-colors relative cursor-pointer">
                        <input
                          type="file"
                          accept="image/png"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) lerAssinatura(f);
                          }}
                        />
                        <UploadCloud className="size-8 text-muted-foreground mb-1" />
                        <span className="text-xs font-medium text-muted-foreground">Clique para selecionar assinatura PNG</span>
                      </div>
                    )}
                    {esc.assinaturaDataUrl && (
                      <div className="space-y-2">
                        <div className="p-2 border rounded-sm bg-background flex items-center justify-between">
                          <img src={esc.assinaturaDataUrl} alt="Assinatura Digital" className="h-10 object-contain bg-muted/10" />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs text-destructive font-semibold hover:bg-destructive/10"
                            onClick={() => changeEsc('assinaturaDataUrl', '')}
                          >
                            Remover
                          </Button>
                        </div>
                        <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={!!esc.autoAssinar}
                            onChange={(e) => changeEsc('autoAssinar', e.target.checked)}
                            className="rounded border-border text-emerald-600 focus:ring-emerald-500"
                          />
                          Assinar recibos, contratos e propostas automaticamente
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-muted/40 rounded-sm border text-[11px] leading-snug text-muted-foreground">
                  O logotipo e a assinatura serão desenhados automaticamente nas peças técnicas e exportações em PDF caso configurados.
                </div>
              </div>
            </div>
            </div>
          )}

          {aba === 'modelos' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-sm p-4 bg-muted/20 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-1.5">
                    <FileCog className="size-4" /> Layout do Arquivo de Pontos (Colunas)
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Personalize o posicionamento de cada coluna no arquivo de pontos (ex. Nome, Leste, Norte, Altitude, Precisões). O sistema lerá seus relatórios GNSS seguindo esse mapeamento.
                  </p>
                </div>
                <Button variant="outline" className="w-full font-semibold gap-1.5" onClick={() => setImportTxtAberto(true)}>
                  <FileCog className="size-4" /> Configurar ordem das colunas
                </Button>
              </div>

              <div className="border rounded-sm p-4 bg-muted/20 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-1.5">
                    <FileSpreadsheet className="size-4" /> Modelo de Planilha SIGEF (.ods)
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Você pode fazer upload de um modelo próprio de planilha de dados cartográficos do SIGEF. O sistema o preencherá automaticamente ao exportar seus arquivos.
                  </p>
                </div>
                <input
                  ref={sigefRef}
                  type="file"
                  accept=".ods"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) atualizarModeloSigef(f);
                    e.currentTarget.value = '';
                  }}
                />
                <div className="flex flex-col gap-2">
                  <Button variant="outline" className="w-full font-semibold gap-1.5" onClick={() => sigefRef.current?.click()}>
                    <FileSpreadsheet className="size-4" /> Atualizar planilha modelo (.ods)
                  </Button>
                  {modeloProprio && (
                    <Button variant="ghost" className="w-full text-xs gap-1" onClick={restaurarModeloSigef}>
                      <RotateCcw className="size-3.5" /> Restaurar modelo padrão
                    </Button>
                  )}
                  <span className="text-[10px] text-muted-foreground text-center">
                    {modeloProprio ? 'Planilha ativa: Modelo personalizado.' : 'Planilha ativa: Modelo padrão embutido.'}
                  </span>
                </div>
              </div>

              <div className="border rounded-sm p-4 bg-muted/20 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-1.5">
                    <FileText className="size-4" /> Textos das peças (modelos)
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Personalize os blocos de texto das peças (declarações, laudo, objeto do contrato, recibo) usando variáveis como <code className="font-mono">{'{proprietario}'}</code>. A narrativa do memorial e a estrutura continuam automáticas.
                  </p>
                </div>
                <Button variant="outline" className="w-full font-semibold gap-1.5" onClick={() => setModelosAberto(true)}>
                  <FileText className="size-4" /> Editar modelos de texto
                </Button>
              </div>

              <div className="border rounded-sm p-4 bg-muted/20 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-1.5">
                    <UserCheck className="size-4" /> Vértices de Vizinho Certificado
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Quando um vizinho já certificado empresta o vértice de divisa, o código dele deve ser reaproveitado, não gerado de novo. Diga qual coluna do arquivo é o nome/código do vértice e qual é a coordenada.
                  </p>
                </div>
                <Button variant="outline" className="w-full font-semibold gap-1.5" onClick={() => setImportVizinhoAberto(true)}>
                  <UserCheck className="size-4" /> Configurar leitura de vértices do vizinho
                </Button>
              </div>
            </div>
          )}

          {aba === 'padroes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-4">
                <div className="space-y-3 rounded-sm border p-3">
                  <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Padrões de novos projetos</div>
                  <p className="text-[11px] leading-tight text-muted-foreground">Todo projeto novo já nasce com estes valores, pra você não repetir a cada trabalho.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Azimute</Label>
                      <select className="w-full rounded-md border bg-background px-2 py-2 text-sm" value={padroes.tipoAzimute} onChange={(e) => mudarPadrao('tipoAzimute', e.target.value as 'geodesico' | 'plano')}>
                        <option value="geodesico">Geodésico</option>
                        <option value="plano">Plano</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Tipo de imóvel</Label>
                      <select className="w-full rounded-md border bg-background px-2 py-2 text-sm" value={padroes.tipoImovel} onChange={(e) => mudarPadrao('tipoImovel', e.target.value as 'rural' | 'urbano')}>
                        <option value="rural">Rural</option>
                        <option value="urbano">Urbano</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Natureza do serviço</Label>
                      <Input value={padroes.naturezaServico} onChange={(e) => mudarPadrao('naturezaServico', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Comarca padrão</Label>
                      <Input placeholder="vazio = usa o município" value={padroes.comarcaPadrao} onChange={(e) => mudarPadrao('comarcaPadrao', e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 rounded-sm border p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5"><DollarSign className="size-3.5" /> Tabela de preços</div>
                    <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={adicionarPreco}><Plus className="size-3.5" /> Adicionar</Button>
                  </div>
                  <p className="text-[11px] leading-tight text-muted-foreground">Puxe estes valores com um clique na gestão financeira do projeto.</p>
                  <div className="space-y-1.5">
                    {precos.length === 0 && <div className="text-[11px] text-muted-foreground">Nenhum preço cadastrado.</div>}
                    {precos.map((p) => (
                      <div key={p.id} className="flex items-center gap-1.5">
                        <Input className="h-8 flex-1 text-xs" placeholder="Serviço" value={p.servico} onChange={(e) => mudarPreco(p.id, 'servico', e.target.value)} />
                        <Input className="h-8 w-24 text-xs" type="number" step="0.01" placeholder="R$" value={p.valor || ''} onChange={(e) => mudarPreco(p.id, 'valor', e.target.value)} />
                        <Button size="sm" variant="ghost" className="size-8 shrink-0 p-0 text-destructive" title="Remover este serviço" onClick={() => removerPreco(p.id)}><Trash2 className="size-3.5" /></Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-t md:border-t-0 md:border-l md:pl-4 pt-3 md:pt-0">
                <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Backup das configurações</div>
                <p className="text-[11px] leading-tight text-muted-foreground">
                  Leve seus ajustes de uma máquina pra outra: baixa um arquivo com assinatura, escritório, modelos de texto, títulos, preços e padrões. Não inclui os projetos (para os projetos, use o backup completo na tela de Projetos).
                </p>
                <input ref={importConfigRef} type="file" accept=".json,application/json" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) importarConfig(f); e.currentTarget.value = ''; }} />
                <Button variant="outline" className="w-full font-semibold gap-1.5" onClick={() => exportarConfiguracoesJson()}>
                  <Download className="size-4" /> Baixar configurações (.json)
                </Button>
                <Button variant="outline" className="w-full font-semibold gap-1.5" onClick={() => importConfigRef.current?.click()}>
                  <Upload className="size-4" /> Restaurar configurações de um arquivo
                </Button>
                <div className="rounded-sm border border-dashed p-2.5 text-[11px] leading-tight text-muted-foreground">
                  Restaurar substitui os ajustes atuais pelos do arquivo. Os projetos e o banco de vértices não são tocados.
                </div>

                {/* Sobre o sistema: versão, autoria e as condições de uso — de propósito num canto
                    discreto, junto das outras informações (decisão do dono, 05/07/2026) */}
                <details className="rounded-sm border p-2.5 text-[11px] leading-tight text-muted-foreground">
                  <summary className="cursor-pointer font-semibold">Sobre o sistema</summary>
                  <div className="mt-2 space-y-2">
                    <p>Souza CAD — criado e mantido por {TERMOS_TITULAR}. Condições de uso (versão {TERMOS_VERSAO}):</p>
                    {TERMOS.map((s) => (
                      <p key={s.titulo}><span className="font-semibold">{s.titulo}.</span> {s.texto}</p>
                    ))}
                  </div>
                </details>
              </div>
            </div>
          )}

          {aba === 'equipe' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="space-y-2 rounded-sm border p-3 bg-amber-500/5 border-amber-500/20">
                  <div className="text-xs font-bold uppercase tracking-wide text-amber-500 flex items-center gap-1.5">
                    <Crown className="size-3.5" /> Convidar Colaborador
                  </div>
                  <p className="text-[11px] leading-snug text-amber-600/90">
                    Digite o e-mail de quem vai trabalhar com você. Ao entrar no app com esse e-mail exato, a pessoa cai direto no seu espaço de trabalho — mesmos projetos e configurações. Sem código pra copiar; e ninguém entra sem ser convidado por você (ou sem você aprovar o pedido dela aqui embaixo).
                  </p>
                  <div className="space-y-2 pt-1">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">E-mail do colaborador</Label>
                      <div className="flex gap-1">
                        <Input
                          placeholder="nome@exemplo.com"
                          type="email"
                          value={emailConviteInput}
                          onChange={(e) => setEmailConviteInput(e.target.value)}
                        />
                        <Button size="sm" onClick={enviarConvite} title="Convidar este e-mail para a sua equipe e avisá-lo por e-mail" className="shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
                          Convidar
                        </Button>
                      </div>
                    </div>
                  </div>
                  {solicitacoesRecebidas.length > 0 && (
                    <div className="space-y-1.5 pt-2 mt-1 border-t border-amber-500/20">
                      <div className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Pedidos de acesso — precisam da sua aprovação</div>
                      {solicitacoesRecebidas.map((s) => (
                        <div key={s.solicitanteEmail} className="flex items-center justify-between gap-2 rounded-sm bg-emerald-500/10 px-2 py-1 text-xs">
                          <span className="truncate" title={s.solicitanteEmail}>{s.solicitanteEmail}</span>
                          <div className="flex shrink-0 gap-1">
                            <Button size="sm" className="h-6 px-2 bg-emerald-600 hover:bg-emerald-500 text-white" onClick={() => aprovarSolicitacaoUI(s)}>
                              Aprovar
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-destructive hover:bg-destructive/10" onClick={() => recusarSolicitacaoUI(s.solicitanteEmail)}>
                              Recusar
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {convitesEnviados.length > 0 && (
                    <div className="space-y-1.5 pt-2 mt-1 border-t border-amber-500/20">
                      <div className="text-[10px] font-bold uppercase text-muted-foreground">Aguardando aceite</div>
                      {convitesEnviados.map((c) => (
                        <div key={c.email} className="flex items-center justify-between gap-2 rounded-sm bg-background/50 px-2 py-1 text-xs">
                          <span className="truncate">{c.email}</span>
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-destructive hover:bg-destructive/10" onClick={() => cancelarConviteUI(c.email)}>
                            Cancelar
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {membrosWorkspace.length > 0 && (
                    <div className="space-y-1.5 pt-2 mt-1 border-t border-amber-500/20">
                      <div className="text-[10px] font-bold uppercase text-muted-foreground">Já fazem parte da equipe</div>
                      {membrosWorkspace.map((m) => {
                        const souDono = workspaceUid === (auth()?.currentUser?.uid || '');
                        return (
                          <div key={m.uid} className="flex items-center justify-between gap-2 rounded-sm bg-emerald-500/10 px-2 py-1 text-xs">
                            <span className="truncate">{m.email}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Ativo</span>
                              {souDono && (
                                <Button size="sm" variant="ghost" className="h-6 px-2 text-destructive hover:bg-destructive/10" onClick={() => removerMembroUI(m)}>
                                  Remover
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4 border-t md:border-t-0 md:border-l md:pl-4 pt-3 md:pt-0">
                <div className="space-y-2 rounded-sm border p-3">
                  <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                    <Shield className="size-3.5" /> Meu Vínculo
                  </div>
                  {workspaceUid === (auth()?.currentUser?.uid || '') ? (
                    <p className="text-[11px] leading-tight text-muted-foreground">
                      Você está no seu próprio workspace — nenhum vínculo ativo. Os projetos e dados são só seus.
                    </p>
                  ) : (
                    <>
                      <p className="text-[11px] leading-tight text-muted-foreground">
                        Você é auxiliar e está trabalhando dentro do espaço de outra conta — os projetos, o banco de pontos e as configurações são os dela.
                      </p>
                      <div className="rounded-sm bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Vinculado a</div>
                        <div className="text-sm font-semibold text-foreground truncate" title={empresaVinculo?.nome || esc.nome}>
                          {empresaVinculo?.nome || esc.nome || 'Empresa vinculada'}
                        </div>
                        {t.nome && (
                          <div className="text-[11px] text-muted-foreground truncate" title={t.nome}>
                            Responsável técnico: {t.nome}
                          </div>
                        )}
                      </div>
                      <Button size="sm" variant="outline" onClick={desvincular} title="Sair da empresa e voltar a trabalhar sozinho, no seu próprio espaço" className="text-destructive hover:bg-destructive/10">
                        Desvincular e trabalhar sozinho
                      </Button>
                    </>
                  )}
                </div>

                <div className="space-y-2 rounded-sm border border-destructive/30 bg-destructive/5 p-3">
                  <div className="text-xs font-bold uppercase tracking-wide text-destructive flex items-center gap-1.5">
                    <Trash2 className="size-3.5" /> Apagar minha conta
                  </div>
                  <p className="text-[11px] leading-tight text-muted-foreground">
                    Apaga sua conta e todos os seus projetos e cadastros salvos na nuvem. Não pode ser desfeito.
                  </p>
                  <Button size="sm" variant="outline" disabled={apagandoConta} onClick={apagarMinhaConta} className="text-destructive border-destructive/40 hover:bg-destructive/10">
                    {apagandoConta ? 'Apagando…' : 'Apagar minha conta'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {aba === 'colegas' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-4">
                <div className="space-y-3 rounded-sm border p-3 bg-muted/5">
                  <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                    <Plus className="size-3.5" /> Cadastrar Colega Agrimensor
                  </div>
                  <p className="text-[11px] leading-tight text-muted-foreground">
                    Cadastre colegas com seu código de credenciamento do INCRA (3 ou 4 letras) para identificar automaticamente seus contatos ao importar parcelas certificadas no SIGEF.
                  </p>
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Nome Completo</Label>
                      <Input
                        placeholder="Ex: João da Silva"
                        value={novoColegaNome}
                        onChange={(e) => setNovoColegaNome(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Credenciamento INCRA</Label>
                        <Input
                          placeholder="Ex: COIN"
                          maxLength={4}
                          value={novoColegaCred}
                          onChange={(e) => setNovoColegaCred(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Telefone / Contato</Label>
                        <Input
                          placeholder="Ex: (11) 98765-4321"
                          value={novoColegaTelefone}
                          onChange={(e) => setNovoColegaTelefone(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button size="sm" className="w-full font-bold gap-1 mt-1" onClick={cadastrarColega}>
                      <Plus className="size-4" /> Cadastrar Colega
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Colegas Cadastrados ({colegas.length})
                </div>
                <div className="border rounded-sm overflow-hidden">
                  <div className="max-h-[300px] overflow-y-auto divide-y bg-background">
                    {colegas.length === 0 && (
                      <div className="p-4 text-center text-xs text-muted-foreground">
                        Nenhum colega cadastrado ainda.
                      </div>
                    )}
                    {colegas.map((c) => (
                      <div key={c.id} className="p-2.5 flex items-center justify-between gap-3 text-xs bg-background hover:bg-muted/10 transition-colors">
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="font-bold text-foreground flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded text-[10px] font-black tracking-wider uppercase">
                              {c.credenciamento}
                            </span>
                            <span className="truncate">{c.nome}</span>
                          </div>
                          {c.telefone && (
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Phone className="size-3 text-muted-foreground" /> {c.telefone}
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="size-8 p-0 text-destructive shrink-0"
                          title="Remover colega"
                          onClick={() => excluirColega(c.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>

        <div className="border-t border-border/50 px-6 py-4 flex justify-between items-center text-[11px] text-muted-foreground shrink-0 bg-zinc-50/50 dark:bg-zinc-950/20">
          <span>Pressione <kbd className="font-semibold">ESC</kbd> para fechar</span>
          <span className="font-medium text-emerald-500 dark:text-emerald-400 flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            Salvamento automático habilitado
          </span>
        </div>
      </DialogContent>
      <ModelosDocsModal open={modelosAberto} onOpenChange={setModelosAberto} />
      <PontosBancoModal open={bancoAberto} onOpenChange={setBancoAberto} />
      <ImportTxtConfigModal open={importTxtAberto} onOpenChange={setImportTxtAberto} />
      <ImportVerticesVizinhoConfigModal open={importVizinhoAberto} onOpenChange={setImportVizinhoAberto} />
    </Dialog>
  );
}

/** Interruptor de liga/desliga com título e explicação, no padrão das preferências. */
function Interruptor({ ligado, onToggle, titulo, descricao }: { ligado: boolean; onToggle: (v: boolean) => void; titulo: string; descricao: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-sm border p-2.5 hover:bg-muted/30">
      <input type="checkbox" className="mt-0.5 size-4 shrink-0" checked={ligado} onChange={(e) => onToggle(e.target.checked)} />
      <span className="space-y-0.5">
        <span className="block text-xs font-semibold">{titulo}</span>
        <span className="block text-[11px] leading-tight text-muted-foreground">{descricao}</span>
      </span>
    </label>
  );
}
