'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Users, Crown, RefreshCw, Shield, Sparkles, CreditCard, 
  DollarSign, Calendar, AlertTriangle, LogOut
} from 'lucide-react';
import { listarPerfisUso, atualizarPerfilUsoPorAdmin, type PerfilUso } from '@/lib/store/perfilUso';
import { carregarConfigAssinatura, salvarConfigAssinatura, type ConfigAssinatura, CONFIG_ASSINATURA_PADRAO } from '@/lib/store/assinatura';
import { carregarWhatsappSuporte, salvarWhatsappSuporte, carregarGeminiApiKey, salvarGeminiApiKey } from '@/lib/store/suporte';

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
  const [carregando, setCarregando] = useState(false);
  const [msg, setMsg] = useState('');

  async function recarregar() {
    setCarregando(true);
    try {
      setPerfis(await listarPerfisUso());
      setCfg(await carregarConfigAssinatura());
      setZap(await carregarWhatsappSuporte());
      setGeminiKey(await carregarGeminiApiKey());
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

  return (
    <div className="flex h-full flex-col bg-[#05140b] text-[#e2f1e8] overflow-hidden p-6 font-sans">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[#12361d] pb-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-amber-500">
            <Crown className="size-7 animate-bounce" /> PAINEL DO PROPRIETÁRIO
          </h1>
          <p className="text-xs text-[#87a992]">Gestão administrativa, CRM de faturamento e uso real de Souza-CAD</p>
        </div>
        <div className="flex items-center gap-3">
          {msg && <span className="text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 px-3 py-1.5 rounded-lg animate-pulse">{msg}</span>}
          <Button size="sm" variant="outline" className="h-9 gap-1.5 border-[#12361d] bg-[#0c2415] hover:bg-[#12361d] text-[#e2f1e8]" onClick={recarregar} disabled={carregando}>
            <RefreshCw className={`size-4 ${carregando ? 'animate-spin' : ''}`} /> Atualizar Dados
          </Button>
          <Button size="sm" variant="outline" className="h-9 gap-1.5 border-amber-500/35 bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 font-extrabold shadow-md shadow-amber-500/5" onClick={onVoltarDesenhar}>
            <LogOut className="size-4 rotate-180" /> Voltar a Desenhar
          </Button>
        </div>
      </div>

      {/* Grid de KPIs Reais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 shrink-0">
        <div className="rounded-xl border border-[#12361d] bg-[#091b10]/60 p-4 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between text-[#87a992]">
            <span className="text-xs font-bold uppercase tracking-wider">Faturamento Previsto</span>
            <Calendar className="size-5 text-indigo-400" />
          </div>
          <div className="mt-2 text-3xl font-black text-white">R$ {faturamentoReal.previsto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          <div className="text-[10px] text-[#87a992] mt-1">Soma das mensalidades de clientes não isentos</div>
        </div>

        <div className="rounded-xl border border-[#12361d] bg-[#091b10]/60 p-4 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between text-[#87a992]">
            <span className="text-xs font-bold uppercase tracking-wider">Faturamento Recebido</span>
            <DollarSign className="size-5 text-emerald-400" />
          </div>
          <div className="mt-2 text-3xl font-black text-emerald-400">R$ {faturamentoReal.recebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          <div className="text-[10px] text-[#87a992] mt-1">Mensalidades marcadas como PAGO</div>
        </div>

        <div className="rounded-xl border border-[#12361d] bg-[#091b10]/60 p-4 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between text-[#87a992]">
            <span className="text-xs font-bold uppercase tracking-wider">Inadimplência (Atrasados)</span>
            <AlertTriangle className="size-5 text-red-500" />
          </div>
          <div className="mt-2 text-3xl font-black text-red-500">R$ {faturamentoReal.inadimplente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          <div className="text-[10px] text-[#87a992] mt-1">{faturamentoReal.inadimplenteCont} clientes com pagamento pendente</div>
        </div>

        <div className="rounded-xl border border-[#12361d] bg-[#091b10]/60 p-4 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between text-[#87a992]">
            <span className="text-xs font-bold uppercase tracking-wider">Clientes (Ativos / Isentos)</span>
            <Users className="size-5 text-amber-500" />
          </div>
          <div className="mt-2 text-3xl font-black text-amber-500">{perfis.length} <span className="text-lg text-muted-foreground font-normal">({ativos.length} at. / {faturamentoReal.isentoCont} is.)</span></div>
          <div className="text-[10px] text-[#87a992] mt-1">Volume de projetos total: {totalProjetos}</div>
        </div>
      </div>

      {/* Lógica de Configuração */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 shrink-0">
        <div className="lg:col-span-2 rounded-xl border border-[#12361d] bg-[#091b10]/40 p-5 shadow-lg backdrop-blur space-y-4">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-amber-500 flex items-center gap-1.5"><Shield className="size-4" /> Parâmetros e Credenciais Globais</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-[#87a992]">WhatsApp de Suporte Técnico</Label>
              <div className="flex gap-2">
                <Input placeholder="Ex.: 32 9 9999-9999" value={zap} onChange={(e) => setZap(e.target.value)} className="h-9 text-xs bg-[#07170d] border-[#12361d] focus-visible:ring-amber-500 text-white" />
                <Button size="sm" onClick={salvarZap} className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold h-9">Salvar</Button>
              </div>
              <p className="text-[10px] text-[#87a992]">Link wa.me mostrado no painel de tutorial dos clientes.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-[#87a992]">Chave de API do Gemini IA (Global)</Label>
              <div className="flex gap-2">
                <Input type="password" placeholder="AIzaSy..." value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} className="h-9 text-xs bg-[#07170d] border-[#12361d] focus-visible:ring-amber-500 text-white" />
                <Button size="sm" onClick={salvarGemini} className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold h-9">Salvar</Button>
              </div>
              <p className="text-[10px] text-[#87a992]">Utilizada no servidor para extrair dados de matrículas anexadas.</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#12361d] bg-[#091b10]/40 p-5 shadow-lg backdrop-blur flex flex-col justify-center">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-amber-500 flex items-center gap-1.5 mb-3"><CreditCard className="size-4" /> Configuração de Assinatura</h2>
          <label className="flex items-start gap-3 rounded-lg border border-amber-600/35 bg-amber-600/5 p-3 cursor-pointer hover:bg-amber-600/10 transition-colors">
            <input
              type="checkbox"
              className="rounded text-[#05140b] focus:ring-amber-500 size-4 mt-0.5 border-[#12361d] accent-amber-500"
              checked={!!cfg.ocultarCobranca}
              onChange={(e) => alterarOcultarCobranca(e.target.checked)}
            />
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-amber-300">Ocultar cobrança e planos de usuários</span>
              <p className="text-[10px] text-[#87a992] leading-snug">Se ativado, os clientes usam o sistema de graça, sem alertas ou telas de planos.</p>
            </div>
          </label>
        </div>
      </div>

      {/* Tabela CRM e Faturamento por Cliente */}
      <div className="flex-1 min-h-0 border border-[#12361d] rounded-xl bg-[#091b10]/30 shadow-lg mt-6 overflow-hidden flex flex-col">
        <div className="bg-[#091b10]/80 px-4 py-3 border-b border-[#12361d] flex shrink-0 justify-between items-center">
          <div className="flex flex-col">
            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-500">Listagem CRM e Faturamento por Cliente ({perfis.length})</span>
            <span className="text-[10px] text-[#87a992]">Os dados administrativos editados abaixo são salvos automaticamente ao sair do campo (onBlur/onChange).</span>
          </div>
          <span className="text-[10px] text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 px-2 py-0.5 rounded-full font-bold">CRM Ativado</span>
        </div>
        <div className="flex-1 overflow-auto">
          {carregando ? (
            <div className="p-8 text-center text-sm text-[#87a992]">Carregando perfis...</div>
          ) : perfis.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#87a992]">Nenhum perfil de uso encontrado no banco de dados.</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-[#07170d] text-[#87a992] text-[10px] uppercase font-bold tracking-wider border-b border-[#12361d] z-10">
                <tr>
                  <th className="px-4 py-3 min-w-[120px]">Cliente / RT</th>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-2 py-3 text-center w-16">Projetos</th>
                  <th className="px-2 py-3 text-center w-24">Mensalidade (R$)</th>
                  <th className="px-2 py-3 text-center w-16">Venc. Dia</th>
                  <th className="px-2 py-3 text-center w-28">Faturamento</th>
                  <th className="px-4 py-3 min-w-[150px]">Anotações / Obs. Contrato</th>
                  <th className="px-4 py-3 text-center w-20">Uso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#12361d]/40">
                {perfis.map((p) => {
                  const ativo = (agora - (p.ultimoAcessoEm ?? p.ultimoProjetoEm ?? 0)) < DIAS_ATIVO;
                  const status = p.statusPagamento || 'atrasado';
                  return (
                    <tr key={p.uid} className="hover:bg-[#0c2415]/30 transition-colors">
                      <td className="px-4 py-2">
                        <div className="font-bold text-white leading-tight">{p.empresaNome || 'Sem Empresa'}</div>
                        <div className="text-[10px] text-[#87a992] mt-0.5">{p.rtNome || 'RT não cadastrado'}{p.rtCft ? ` (CFT: ${p.rtCft})` : ''}</div>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground text-[#87a992] select-all">{p.email || '—'}</td>
                      <td className="px-2 py-2 text-center font-bold text-emerald-400">{p.totalProjetos ?? 0}</td>
                      
                      {/* CRM: Mensalidade */}
                      <td className="px-2 py-2 text-center">
                        <input
                          type="number"
                          defaultValue={p.mensalidade !== undefined ? p.mensalidade : 150}
                          onBlur={(e) => {
                            const val = e.target.value !== '' ? Number(e.target.value) : 150;
                            if (val !== p.mensalidade) {
                              atualizarClienteCRM(p.uid, { mensalidade: val });
                            }
                          }}
                          className="w-16 h-8 text-center bg-[#07170d] border border-[#12361d]/85 rounded text-white px-1 text-xs font-bold focus:border-amber-500 focus:outline-none"
                        />
                      </td>

                      {/* CRM: Dia Vencimento */}
                      <td className="px-2 py-2 text-center">
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
                          className="w-12 h-8 text-center bg-[#07170d] border border-[#12361d]/85 rounded text-white px-1 text-xs focus:border-amber-500 focus:outline-none"
                        />
                      </td>

                      {/* CRM: Status Faturamento Select */}
                      <td className="px-2 py-2 text-center">
                        <select
                          value={status}
                          onChange={(e) => atualizarClienteCRM(p.uid, { statusPagamento: e.target.value as any })}
                          className={`w-28 h-8 rounded px-1 text-[11px] font-bold bg-[#07170d] border focus:outline-none focus:border-amber-500 cursor-pointer ${
                            status === 'pago' ? 'text-emerald-400 border-emerald-500/50' :
                            status === 'isento' ? 'text-zinc-400 border-zinc-500/50' :
                            'text-red-400 border-red-500/50'
                          }`}
                        >
                          <option value="pago" className="text-emerald-400 font-bold bg-[#05140b]">Pago (Ok)</option>
                          <option value="atrasado" className="text-red-400 font-bold bg-[#05140b]">Atrasado (🚨)</option>
                          <option value="isento" className="text-zinc-400 font-bold bg-[#05140b]">Isento (Free)</option>
                        </select>
                      </td>

                      {/* CRM: Observações / Obs. Contrato */}
                      <td className="px-4 py-2">
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
                          className="w-full h-8 bg-[#07170d] border border-[#12361d]/85 rounded text-white px-2 text-xs focus:border-amber-500 focus:outline-none placeholder-[#374e40]"
                        />
                      </td>

                      <td className="px-4 py-2 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase ${ativo ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-zinc-950 text-[#87a992] border border-zinc-800'}`}>{ativo ? 'ativo' : 'inativo'}</span>
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
  );
}
