'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Users, Crown, RefreshCw, Shield, Sparkles, CreditCard, 
  DollarSign, Calendar, AlertTriangle, LogOut, Search, TrendingUp, ChevronDown, ChevronUp
} from 'lucide-react';
import { listarPerfisUso, atualizarPerfilUsoPorAdmin, type PerfilUso } from '@/lib/store/perfilUso';
import { carregarConfigAssinatura, salvarConfigAssinatura, type ConfigAssinatura, CONFIG_ASSINATURA_PADRAO } from '@/lib/store/assinatura';
import { carregarWhatsappSuporte, salvarWhatsappSuporte, carregarGeminiApiKey, salvarGeminiApiKey, carregarAppUrl, salvarAppUrl } from '@/lib/store/suporte';

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
  const [geminiKey, setGeminiKey] = useState('');
  const [appUrl, setAppUrl] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [msg, setMsg] = useState('');
  const [busca, setBusca] = useState('');
  const [configExpandido, setConfigExpandido] = useState(true);

  async function recarregar() {
    setCarregando(true);
    try {
      setPerfis(await listarPerfisUso());
      setCfg(await carregarConfigAssinatura());
      setZap(await carregarWhatsappSuporte());
      setGeminiKey(await carregarGeminiApiKey());
      setAppUrl(await carregarAppUrl());
    } catch (e) {
      console.error(e);
    } finally {
      setCarregando(false);
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

  async function salvarAppUrlConfig() {
    try {
      await salvarAppUrl(appUrl);
      flash('Link do App salvo!');
    } catch {
      flash('Erro ao salvar Link do App.');
    }
  }

  // Lógica de salvamento individual do CRM / Faturamento por cliente
  async function atualizarClienteCRM(clientUid: string, patch: Partial<PerfilUso>) {
    try {
      await atualizarPerfilUsoPorAdmin(clientUid, patch);
      setPerfis((prev) => prev.map((p) => p.uid === clientUid ? { ...p, ...patch } : p));
      flash('Dados do cliente salvos!');
    } catch (e: any) {
      console.error(e);
      flash(e.message || 'Erro ao salvar CRM.');
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
    <div className="flex h-full flex-col bg-gradient-to-b from-[#030f07] via-[#05140b] to-[#071a0e] text-[#e2f1e8] overflow-hidden font-sans">
      {/* ─── Header ─── */}
      <div className="shrink-0 border-b border-[#12361d]/60 px-6 py-4 bg-[#05140b]/80 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-black tracking-tight">
              <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/20">
                <Crown className="size-5 text-[#05140b]" />
              </div>
              <span className="bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">PAINEL DO PROPRIETÁRIO</span>
            </h1>
            <p className="text-xs text-[#87a992] mt-1 ml-[46px]">Gestão administrativa, CRM de faturamento e uso real de Souza-CAD</p>
          </div>
          <div className="flex items-center gap-3">
            {msg && (
              <span className="text-xs font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-800/40 px-3 py-1.5 rounded-lg animate-pulse shadow-lg shadow-emerald-500/10">
                {msg}
              </span>
            )}
            <Button size="sm" variant="outline" className="h-9 gap-1.5 border-[#1e4d2e] bg-[#0c2415] hover:bg-[#12361d] text-[#e2f1e8] font-semibold" onClick={recarregar} disabled={carregando}>
              <RefreshCw className={`size-4 ${carregando ? 'animate-spin' : ''}`} /> Atualizar
            </Button>
            <Button size="sm" className="h-9 gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-[#05140b] font-extrabold shadow-lg shadow-amber-500/20 border-0" onClick={onVoltarDesenhar}>
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
            <div key={kpi.label} className={`rounded-xl border ${kpi.borda} bg-[#091b10]/60 p-4 shadow-lg backdrop-blur-sm hover:bg-[#0c2415]/60 transition-colors`}>
              <div className="flex items-center justify-between text-[#87a992]">
                <span className="text-[10px] font-bold uppercase tracking-wider">{kpi.label}</span>
                {kpi.icone}
              </div>
              <div className={`mt-2 text-2xl font-black ${kpi.cor}`}>{kpi.valor}</div>
              <div className="text-[10px] text-[#6b937a] mt-1 leading-snug">{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* ─── Configurações colapsáveis ─── */}
        <div className="rounded-xl border border-[#12361d]/60 bg-[#091b10]/40 shadow-lg backdrop-blur-sm overflow-hidden">
          <button type="button" onClick={() => setConfigExpandido((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-[#0c2415]/40 transition-colors">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Shield className="size-4" /> Parâmetros e Credenciais Globais
            </h2>
            {configExpandido ? <ChevronUp className="size-4 text-[#87a992]" /> : <ChevronDown className="size-4 text-[#87a992]" />}
          </button>

          {configExpandido && (
            <div className="px-5 pb-5 pt-2 border-t border-[#12361d]/40">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* WhatsApp */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-[#87a992]">WhatsApp de Suporte Técnico</Label>
                  <div className="flex gap-2">
                    <Input placeholder="Ex.: 32 9 9999-9999" value={zap} onChange={(e) => setZap(e.target.value)} className="h-10 text-sm bg-[#07170d] border-[#1e4d2e]/60 focus-visible:ring-amber-500 text-white placeholder:text-[#374e40]" />
                    <Button size="sm" onClick={salvarZap} className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold h-10 px-4">Salvar</Button>
                  </div>
                  <p className="text-[10px] text-[#6b937a]">Link wa.me mostrado no tutorial dos clientes.</p>
                </div>

                {/* Gemini Key */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-[#87a992]">Chave de API do Gemini IA</Label>
                  <div className="flex gap-2">
                    <Input type="password" placeholder="AIzaSy..." value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} className="h-10 text-sm bg-[#07170d] border-[#1e4d2e]/60 focus-visible:ring-amber-500 text-white placeholder:text-[#374e40]" />
                    <Button size="sm" onClick={salvarGemini} className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold h-10 px-4">Salvar</Button>
                  </div>
                  <p className="text-[10px] text-[#6b937a]">Usada no servidor para extrair dados de matrículas.</p>
                </div>

                {/* Link do App */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-[#87a992]">Link Oficial do App (Souza CAD)</Label>
                  <div className="flex gap-2">
                    <Input placeholder="https://..." value={appUrl} onChange={(e) => setAppUrl(e.target.value)} className="h-10 text-sm bg-[#07170d] border-[#1e4d2e]/60 focus-visible:ring-amber-500 text-white placeholder:text-[#374e40]" />
                    <Button size="sm" onClick={salvarAppUrlConfig} className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold h-10 px-4">Salvar</Button>
                  </div>
                  <p className="text-[10px] text-[#6b937a]">Link base usado nas peças e compartilhamento.</p>
                </div>

                {/* Ocultar cobrança */}
                <div className="flex items-start">
                  <label className="flex items-start gap-3 rounded-xl border border-amber-600/25 bg-amber-600/5 p-4 cursor-pointer hover:bg-amber-600/10 transition-colors w-full h-full">
                    <input
                      type="checkbox"
                      className="rounded-sm text-[#05140b] focus:ring-amber-500 size-4 mt-0.5 border-[#12361d] accent-amber-500"
                      checked={!!cfg.ocultarCobranca}
                      onChange={(e) => alterarOcultarCobranca(e.target.checked)}
                    />
                    <div className="space-y-1">
                      <span className="text-sm font-bold text-amber-300">Ocultar cobrança</span>
                      <p className="text-[11px] text-[#87a992] leading-snug">Se ativado, clientes usam de graça — sem alertas ou telas de planos.</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── Tabela CRM e Faturamento ─── */}
        <div className="flex-1 border border-[#12361d]/60 rounded-xl bg-[#091b10]/30 shadow-lg overflow-hidden flex flex-col">
          <div className="bg-[#091b10]/80 px-5 py-3 border-b border-[#12361d]/40 flex shrink-0 justify-between items-center gap-4">
            <div className="flex flex-col">
              <span className="text-sm font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Sparkles className="size-4" /> CRM & Faturamento ({perfisFiltrados.length}{busca ? ` de ${perfis.length}` : ''})
              </span>
              <span className="text-[10px] text-[#6b937a] mt-0.5">Os dados editados são salvos automaticamente ao sair do campo.</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#6b937a]" />
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="h-9 w-52 rounded-lg border border-[#1e4d2e]/60 bg-[#07170d] pl-8 pr-3 text-xs text-white placeholder:text-[#374e40] focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                />
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-950/30 border border-emerald-800/30 px-2.5 py-1 rounded-full font-bold whitespace-nowrap">CRM Ativo</span>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {carregando ? (
              <div className="p-8 text-center text-sm text-[#87a992]">
                <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-amber-500" />
                Carregando perfis...
              </div>
            ) : perfisFiltrados.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#87a992]">
                {busca ? `Nenhum resultado para "${busca}".` : 'Nenhum perfil de uso encontrado.'}
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-[#07170d] text-[#87a992] text-[10px] uppercase font-bold tracking-wider border-b border-[#12361d] z-10">
                  <tr>
                    <th className="px-4 py-3 min-w-[140px]">Cliente / RT</th>
                    <th className="px-4 py-3">E-mail</th>
                    <th className="px-2 py-3 text-center w-16">Projetos</th>
                    <th className="px-2 py-3 text-center w-28">Mensalidade (R$)</th>
                    <th className="px-2 py-3 text-center w-20">Venc. Dia</th>
                    <th className="px-2 py-3 text-center w-28">Faturamento</th>
                    <th className="px-4 py-3 min-w-[170px]">Anotações / Obs. Contrato</th>
                    <th className="px-4 py-3 text-center w-20">Uso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#12361d]/30">
                  {perfisFiltrados.map((p) => {
                    const ativo = (agora - (p.ultimoAcessoEm ?? p.ultimoProjetoEm ?? 0)) < DIAS_ATIVO;
                    const status = p.statusPagamento || 'atrasado';
                    return (
                      <tr key={p.uid} className="hover:bg-[#0c2415]/40 transition-colors">
                        <td className="px-4 py-2.5">
                          <div className="font-bold text-white leading-tight text-[13px]">{p.empresaNome || 'Sem Empresa'}</div>
                          <div className="text-[10px] text-[#87a992] mt-0.5">{p.rtNome || 'RT não cadastrado'}{p.rtCft ? ` (CFT: ${p.rtCft})` : ''}</div>
                        </td>
                        <td className="px-4 py-2.5 text-[#87a992] select-all text-[11px]">{p.email || '—'}</td>
                        <td className="px-2 py-2.5 text-center font-bold text-emerald-400 text-[13px]">{p.totalProjetos ?? 0}</td>
                        
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
                            className="w-20 h-9 text-center bg-[#07170d] border border-[#1e4d2e]/60 rounded-lg text-white px-1.5 text-xs font-bold focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-colors"
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
                            className="w-16 h-9 text-center bg-[#07170d] border border-[#1e4d2e]/60 rounded-lg text-white px-1 text-xs focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-colors"
                          />
                        </td>

                        {/* CRM: Status Faturamento Select */}
                        <td className="px-2 py-2.5 text-center">
                          <select
                            value={status}
                            onChange={(e) => {
                              const newStatus = e.target.value as any;
                              const patch: any = { statusPagamento: newStatus };
                              if (newStatus === 'atrasado') {
                                patch.atrasadoDesde = Date.now();
                              } else {
                                patch.atrasadoDesde = null;
                              }
                              atualizarClienteCRM(p.uid, patch);
                            }}
                            className={`w-28 h-9 rounded-lg px-2 text-[11px] font-bold bg-[#07170d] border focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 cursor-pointer transition-colors ${
                              status === 'pago' ? 'text-emerald-400 border-emerald-500/40' :
                              status === 'isento' ? 'text-zinc-400 border-zinc-500/40' :
                              'text-red-400 border-red-500/40'
                            }`}
                          >
                            <option value="pago" className="text-emerald-400 font-bold bg-[#05140b]">Pago (Ok)</option>
                            <option value="atrasado" className="text-red-400 font-bold bg-[#05140b]">Atrasado (🚨)</option>
                            <option value="isento" className="text-zinc-400 font-bold bg-[#05140b]">Isento (Free)</option>
                          </select>
                        </td>

                        {/* CRM: Observações / Obs. Contrato */}
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
                            className="w-full h-9 bg-[#07170d] border border-[#1e4d2e]/60 rounded-lg text-white px-3 text-xs focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 placeholder-[#374e40] transition-colors"
                          />
                        </td>

                        <td className="px-4 py-2.5 text-center">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${ativo ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-700/40 shadow-sm shadow-emerald-500/10' : 'bg-zinc-950/60 text-[#6b937a] border border-zinc-700/40'}`}>{ativo ? 'ativo' : 'inativo'}</span>
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
    </div>
  );
}
