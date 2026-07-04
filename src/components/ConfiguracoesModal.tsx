'use client';

import { useEffect, useRef, useState } from 'react';
import { FileCog, FileSpreadsheet, RotateCcw, Check, UploadCloud, UserCheck, Trash2, FileText, Download, Upload, Plus, DollarSign, PlayCircle } from 'lucide-react';
import ModelosDocsModal from './ModelosDocsModal';
import { zerarBancoPontos } from '@/lib/store/registro';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { TecnicoData, EscritorioData } from '@/lib/topo/types';
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
import { souMaster, carregarWhatsappSuporte, salvarWhatsappSuporte } from '@/lib/store/suporte';
import { carregarPreferencias, salvarPreferencias, aplicarEscalaFonte, PREFERENCIAS_PADRAO, type PreferenciasApp } from '@/lib/store/preferencias';
import { carregarPadroes, salvarPadroes, PADROES_PADRAO, type PadroesProjeto } from '@/lib/store/padroes';
import { carregarPrecos, salvarPrecos, type PrecoServico } from '@/lib/store/precos';
import { exportarConfiguracoesJson, importarConfiguracoesJson } from '@/lib/store/backup';
import ImportTxtConfigModal from '@/components/ImportTxtConfigModal';
import ImportVerticesVizinhoConfigModal from '@/components/ImportVerticesVizinhoConfigModal';

// Pessoal = só do usuário (assinatura técnica). Global = da empresa (todos usam o mesmo).
type AbaConfig = 'pessoal' | 'comportamento' | 'escritorio' | 'numeracao' | 'modelos' | 'padroes';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfigChange?: () => void; // Notifica a página principal caso mude algum contador ou fuso base
  abaInicial?: AbaConfig;      // aba aberta ao abrir (ex.: 'pessoal' pelo botão RT)
}

export default function ConfiguracoesModal({ open, onOpenChange, onConfigChange, abaInicial }: Props) {
  const [aba, setAba] = useState<AbaConfig>('pessoal');
  useEffect(() => { if (open && abaInicial) setAba(abaInicial); }, [open, abaInicial]);
  const [t, setT] = useState<TecnicoData>(TECNICO_PADRAO);
  const [esc, setEsc] = useState<EscritorioData>(ESCRITORIO_PADRAO);
  const [msg, setMsg] = useState('');
  const [importTxtAberto, setImportTxtAberto] = useState(false);
  const [importVizinhoAberto, setImportVizinhoAberto] = useState(false);
  const [modeloProprio, setModeloProprio] = useState(false);
  const [zapSuporte, setZapSuporte] = useState('');
  const [prefs, setPrefs] = useState<PreferenciasApp>(PREFERENCIAS_PADRAO);
  const [modelosAberto, setModelosAberto] = useState(false);
  const [padroes, setPadroes] = useState<PadroesProjeto>(PADROES_PADRAO);
  const [precos, setPrecos] = useState<PrecoServico[]>([]);
  const [reciboSeq, setReciboSeq] = useState(1);
  const sigefRef = useRef<HTMLInputElement>(null);
  const importConfigRef = useRef<HTMLInputElement>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setT(carregarTecnico());
      setEsc(carregarEscritorio());
      setModeloProprio(temModeloSigefProprio());
      setPrefs(carregarPreferencias());
      setPadroes(carregarPadroes());
      setPrecos(carregarPrecos());
      setReciboSeq(proximoNumeroReciboSeq());
      if (souMaster()) carregarWhatsappSuporte().then(setZapSuporte).catch(() => {});
    }
  }, [open]);

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

  const changeEsc = (k: keyof EscritorioData, val: EscritorioData[keyof EscritorioData]) => {
    const updated = { ...esc, [k]: val };
    setEsc(updated);
    salvarEscritorio(updated);
    onConfigChange?.();
    flash('Salvo automaticamente');
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
    if (!window.confirm('Restaurar as configurações deste arquivo?\n\nOs seus ajustes atuais (assinatura, escritório, modelos de texto, títulos, preços e padrões) serão substituídos pelos do arquivo. Os projetos não são afetados.')) return;
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
      !window.confirm(
        'Deseja realmente substituir a planilha SIGEF do sistema por este arquivo?\n\nEle passará a ser usado em TODAS as exportações de planilha (.ods), no lugar do modelo embutido.'
      )
    )
      return;
    salvarModeloSigef(await file.arrayBuffer());
    setModeloProprio(true);
    onConfigChange?.();
    flash('Modelo SIGEF atualizado.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function restaurarModeloSigef() {
    if (!window.confirm('Voltar a usar o modelo de planilha SIGEF embutido do sistema?')) return;
    limparModeloSigef();
    setModeloProprio(false);
    onConfigChange?.();
    flash('Modelo SIGEF restaurado.');
  }

  function lerLogo(file: File) {
    const r = new FileReader();
    r.onload = () => {
      changeEsc('logoDataUrl', String(r.result));
    };
    r.readAsDataURL(file);
  }

  const Tb = ({ a, rotulo }: { a: AbaConfig; rotulo: string }) => (
    <button onClick={() => setAba(a)}
      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${aba === a ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/50'}`}>
      {rotulo}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col bg-background/95 backdrop-blur-md border border-border/80 shadow-2xl p-6 rounded-lg text-foreground">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              Configurações do Sistema
            </DialogTitle>
            {msg && (
              <span className="text-xs bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded flex items-center gap-1 font-semibold animate-pulse">
                <Check className="size-3" /> {msg}
              </span>
            )}
          </div>
          {/* dois grupos com TÍTULO acima dos botões (não na mesma linha) — deixa claro o que é
              pessoal (do técnico) e o que é global (da empresa) */}
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-8">
            <div>
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600">Pessoais</div>
              <div className="flex flex-wrap gap-2">
                <Tb a="pessoal" rotulo="Responsável Técnico" />
                <Tb a="comportamento" rotulo="Comportamento" />
              </div>
            </div>
            <div>
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600">Globais (empresa)</div>
              <div className="flex flex-wrap gap-2">
                <Tb a="escritorio" rotulo="Escritório & Carimbo" />
                <Tb a="numeracao" rotulo="Numeração e Fuso" />
                <Tb a="modelos" rotulo="Importação e Modelos" />
                <Tb a="padroes" rotulo="Padrões & Backup" />
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 py-3 text-sm">
          {aba === 'pessoal' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3.5">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Nome Completo</Label>
                  <Input value={t.nome} onChange={(e) => changeT('nome', e.target.value)} />
                </div>
                {/* conselho: define as siglas das peças — técnico (CFT/TRT) x engenheiro (CREA/ART) */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Conselho / categoria</Label>
                  <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={t.conselho ?? 'CFT'} onChange={(e) => changeT('conselho', e.target.value as 'CFT' | 'CREA')}>
                    <option value="CFT">Técnico — CFT (emite TRT)</option>
                    <option value="CREA">Engenheiro — CREA (emite ART)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Formação Profissional</Label>
                  <Input value={t.formacao} onChange={(e) => changeT('formacao', e.target.value)} />
                </div>
                {/* o TRT/ART é sempre por projeto (emitido no modal, campo imovel.numeroTrt) — não existe "padrão" */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Registro {(t.conselho ?? 'CFT') === 'CREA' ? 'CREA' : 'CFT'}</Label>
                  <Input value={t.cft} onChange={(e) => changeT('cft', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Cidade da Assinatura (peças técnicas)</Label>
                  <Input value={t.cidadeAssinatura} onChange={(e) => changeT('cidadeAssinatura', e.target.value)} />
                </div>
              </div>

              <div className="space-y-3.5 border-t md:border-t-0 md:border-l md:pl-4 pt-3.5 md:pt-0">
                <div className="p-2.5 rounded bg-muted/40 text-[11px] leading-tight text-muted-foreground border">
                  Estes dados são <strong>pessoais</strong>: cada técnico da empresa assina as peças com os seus. O escritório, a numeração, o fuso e os modelos são da empresa (abas Globais).
                </div>
                {/* Ícones do cabeçalho: liga/desliga por botão (fica mais limpo com só o texto) */}
                <div className="space-y-1.5 rounded border p-2.5">
                  <Label className="text-xs font-semibold">Ícones dos botões do cabeçalho</Label>
                  <p className="text-[11px] leading-tight text-muted-foreground">Desligado = o botão mostra só o texto (cabeçalho mais limpo).</p>
                  {([['analise', 'Análise / SIGEF'], ['dados', 'Dados'], ['trt', 'TRT']] as [string, string][]).map(([chave, rotulo]) => (
                    <label key={chave} className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={!prefs.iconesCabecalhoOcultos.includes(chave)}
                        onChange={(e) => {
                          const ocultos = new Set(prefs.iconesCabecalhoOcultos);
                          if (e.target.checked) ocultos.delete(chave); else ocultos.add(chave);
                          const np = { ...prefs, iconesCabecalhoOcultos: [...ocultos] };
                          setPrefs(np); salvarPreferencias(np); onConfigChange?.();
                        }} />
                      Mostrar ícone em &quot;{rotulo}&quot;
                    </label>
                  ))}
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
                <div className="space-y-1.5 rounded border p-2.5">
                  <Label className="text-xs font-semibold">Modo da interface</Label>
                  <p className="text-[11px] leading-tight text-muted-foreground">Quanta ferramenta aparece na tela. O <strong>Simples</strong> mostra só o essencial, pra qualquer nível se adaptar ao software; o <strong>Completo</strong> mostra tudo. Depois de bastante uso no Completo, a chave do topo some e é aqui que você volta pro Simples.</p>
                  <div className="flex w-fit items-center gap-1 rounded-full border bg-muted/40 p-0.5 text-xs">
                    {(['simples', 'completo'] as const).map((m) => (
                      <button key={m} type="button" onClick={() => mudarPref('modo', m)}
                        className={`rounded-full px-3 py-1 font-semibold capitalize transition-colors ${prefs.modo === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>{m}</button>
                    ))}
                  </div>
                </div>

                {/* Nível da ajuda: quanta explicação. Coisa diferente do modo — é sobre tempo de profissão. */}
                <div className="space-y-1.5 rounded border p-2.5">
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
                  descricao="Toca a animação da marca na primeira vez que o app abre neste navegador. Desligado: entra direto no editor, sem abertura." />
                <Button variant="outline" size="sm" className="w-full gap-1.5 font-semibold" onClick={reverIntro}>
                  <PlayCircle className="size-4" /> Ver a abertura agora
                </Button>

                <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground pt-1">Aparência da tela</div>
                <div className="space-y-1.5 rounded border p-2.5">
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
                <div className="space-y-1.5 rounded border p-2.5">
                  <Label className="text-xs font-semibold">Casas decimais na tela</Label>
                  <p className="text-[11px] leading-tight text-muted-foreground">Quantas casas depois da vírgula aparecem em coordenadas, distâncias e área <strong>na tela</strong>. Os documentos e exportações (memorial, planilha SIGEF, KML) mantêm a precisão exigida pela norma, sem mudar.</p>
                  <div className="flex w-fit items-center gap-1 rounded-full border bg-muted/40 p-0.5 text-xs">
                    {[2, 3, 4].map((val) => (
                      <button key={val} type="button" onClick={() => mudarPref('casasDecimais', val)}
                        className={`rounded-full px-3 py-1 font-semibold transition-colors ${(prefs.casasDecimais ?? 3) === val ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>{val}</button>
                    ))}
                  </div>
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
                <div className="p-2.5 rounded bg-muted/40 text-[11px] leading-tight text-muted-foreground border">
                  <strong>Dica de agrimensor:</strong> A numeração dos contadores é a semente inicial. À medida que novos pontos são gerados, o banco de dados interno avança automaticamente para evitar duplicidades de vértices.
                </div>

                <div className="space-y-1 rounded border p-2.5">
                  <Label className="text-xs font-semibold">Próximo número de recibo</Label>
                  <p className="text-[11px] leading-tight text-muted-foreground">O recibo é numerado sozinho, no formato 0001/ano. Ajuste aqui pra continuar de uma numeração antiga.</p>
                  <Input type="number" min={1} className="w-32" value={reciboSeq} onChange={(e) => mudarReciboSeq(Number(e.target.value))} />
                </div>

                {/* Editar banco de vértices: excluir individual na tela do Banco de pontos; aqui, zerar tudo */}
                <div className="space-y-1.5 rounded border p-2.5">
                  <div className="text-xs font-bold">Editar banco de vértices</div>
                  <p className="text-[11px] leading-tight text-muted-foreground">
                    Abra o <strong>Banco de pontos</strong> (botão PONTOS na barra inferior) para <strong>excluir vértices um a um</strong> ou resgatar da lixeira. Aqui embaixo, você pode zerar TODOS de uma vez (também recuperável) — útil ao trocar de credenciado ou liberar códigos de uma certificação cancelada.
                  </p>
                  <Button size="sm" variant="outline" className="h-8 gap-1 border-red-600/40 text-red-700 hover:bg-red-600 hover:text-white dark:text-red-400"
                    onClick={async () => {
                      if (!window.confirm('Zerar o banco de vértices?\n\nTodos os vértices ativos vão para a lixeira (recuperáveis depois). Continuar?')) return;
                      const n = await zerarBancoPontos();
                      flash(n > 0 ? `${n} vértice(s) movidos para a lixeira.` : 'O banco já estava vazio.');
                    }}>
                    <Trash2 className="size-4" /> Zerar banco de vértices
                  </Button>
                </div>
              </div>
            </div>
          )}

          {aba === 'escritorio' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3.5">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Nome da Empresa / Escritório</Label>
                  <Input value={esc.nome} onChange={(e) => changeEsc('nome', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Ramo de Atuação</Label>
                  <Input value={esc.ramo} onChange={(e) => changeEsc('ramo', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">CNPJ / CPF</Label>
                    <Input value={esc.cnpj} onChange={(e) => changeEsc('cnpj', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">WhatsApp / Contato</Label>
                    <Input value={esc.telefone} onChange={(e) => changeEsc('telefone', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Endereço Físico</Label>
                  <Input value={esc.endereco} onChange={(e) => changeEsc('endereco', e.target.value)} />
                </div>
                {souMaster() && (
                  <div className="space-y-1 rounded border border-emerald-600/30 bg-emerald-600/5 p-2">
                    <Label className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">WhatsApp de SUPORTE do sistema (só o master vê este campo)</Label>
                    <Input placeholder="Ex.: 32 9 9999-9999 — vazio = botão de suporte não aparece"
                      value={zapSuporte}
                      onChange={(e) => setZapSuporte(e.target.value)}
                      onBlur={() => { salvarWhatsappSuporte(zapSuporte).then(() => flash('Suporte salvo')).catch(() => flash('Salvo local; nuvem indisponível')); }} />
                    <p className="text-xs text-muted-foreground">Aparece pros clientes como botão &quot;Falar com o suporte&quot; no tutorial. Deixe vazio pra esconder.</p>
                  </div>
                )}
              </div>

              <div className="space-y-3.5 border-t md:border-t-0 md:border-l md:pl-4 pt-3.5 md:pt-0 flex flex-col justify-between">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Logotipo para a Planta</Label>
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
                  {esc.logoDataUrl && (
                    <div className="mt-2 p-2 border rounded bg-background flex items-center justify-between">
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
                <div className="p-3 bg-muted/40 rounded border text-[11px] leading-snug text-muted-foreground">
                  O logotipo será desenhado automaticamente no quadro de convenções e carimbo de assinaturas nas pranchas impressas e exportações em PDF.
                </div>
              </div>
            </div>
          )}

          {aba === 'modelos' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded p-4 bg-muted/20 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-1.5">
                    <FileCog className="size-4" /> Layout do Arquivo TXT (Colunas)
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Personalize o posicionamento de cada coluna no arquivo de pontos (ex. Nome, Leste, Norte, Altitude, Precisões). O sistema lerá seus relatórios GNSS seguindo esse mapeamento.
                  </p>
                </div>
                <Button variant="outline" className="w-full font-semibold gap-1.5" onClick={() => setImportTxtAberto(true)}>
                  <FileCog className="size-4" /> Configurar ordem das colunas
                </Button>
              </div>

              <div className="border rounded p-4 bg-muted/20 flex flex-col justify-between space-y-4">
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

              <div className="border rounded p-4 bg-muted/20 flex flex-col justify-between space-y-4">
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

              <div className="border rounded p-4 bg-muted/20 flex flex-col justify-between space-y-4">
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
                <div className="space-y-3 rounded border p-3">
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

                <div className="space-y-2 rounded border p-3">
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
                        <Button size="sm" variant="ghost" className="size-8 shrink-0 p-0 text-destructive" onClick={() => removerPreco(p.id)}><Trash2 className="size-3.5" /></Button>
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
                <div className="rounded border border-dashed p-2.5 text-[11px] leading-tight text-muted-foreground">
                  Restaurar substitui os ajustes atuais pelos do arquivo. Os projetos e o banco de vértices não são tocados.
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t pt-3 flex justify-between items-center text-xs text-muted-foreground">
          <span>Pressione <kbd className="font-semibold">ESC</kbd> para fechar</span>
          <span className="font-medium text-emerald-500 flex items-center gap-1">
            <Check className="size-3.5" /> Salvamento automático habilitado
          </span>
        </div>
      </DialogContent>
      <ModelosDocsModal open={modelosAberto} onOpenChange={setModelosAberto} />
      <ImportTxtConfigModal open={importTxtAberto} onOpenChange={setImportTxtAberto} />
      <ImportVerticesVizinhoConfigModal open={importVizinhoAberto} onOpenChange={setImportVizinhoAberto} />
    </Dialog>
  );
}

/** Interruptor de liga/desliga com título e explicação, no padrão das preferências. */
function Interruptor({ ligado, onToggle, titulo, descricao }: { ligado: boolean; onToggle: (v: boolean) => void; titulo: string; descricao: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded border p-2.5 hover:bg-muted/30">
      <input type="checkbox" className="mt-0.5 size-4 shrink-0" checked={ligado} onChange={(e) => onToggle(e.target.checked)} />
      <span className="space-y-0.5">
        <span className="block text-xs font-semibold">{titulo}</span>
        <span className="block text-[11px] leading-tight text-muted-foreground">{descricao}</span>
      </span>
    </label>
  );
}
