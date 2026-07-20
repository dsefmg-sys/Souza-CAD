'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, Check, Plus, Trash2, MessageCircle, Save, Eye, ShieldCheck, Sparkles, TrendingUp, Users, Award, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth';
import { souMaster, carregarWhatsappSuporte, linkWhatsapp } from '@/lib/store/suporte';
import {
  carregarConfigAssinatura, salvarConfigAssinatura, precoNoNivel, formatBRL, atribuicaoDe,
  CONFIG_ASSINATURA_PADRAO, type ConfigAssinatura,
} from '@/lib/store/assinatura';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export default function AssinaturaModal({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const admin = souMaster();
  const [cfg, setCfg] = useState<ConfigAssinatura>(CONFIG_ASSINATURA_PADRAO);
  const [zap, setZap] = useState('');
  const [msg, setMsg] = useState('');
  const [salvando, setSalvando] = useState(false);
  // Se for admin, ele pode alternar entre ver como Admin ou ver a "Visão do Cliente (Preview)"
  const [abaAdmin, setAbaAdmin] = useState<'admin' | 'cliente'>('admin');

  useEffect(() => {
    if (!open) return;
    setMsg('');
    carregarConfigAssinatura().then(setCfg).catch(() => {});
    carregarWhatsappSuporte().then(setZap).catch(() => {});
  }, [open]);

  const minha = atribuicaoDe(cfg, user?.email);
  const meuPreco = minha.plano ? precoNoNivel(minha.plano.precoCheio, minha.nivelPct) : 0;
  const link = linkWhatsapp(zap);
  const linkAssinar = link
    ? `${link}?text=${encodeURIComponent(`Olá! Quero assinar o Métrica${minha.plano ? ` — plano ${minha.plano.nome}` : ''}. Meu e-mail: ${user?.email ?? ''}`)}`
    : null;

  async function salvar() {
    setSalvando(true);
    try { await salvarConfigAssinatura(cfg); setMsg('Cobrança salva com sucesso.'); }
    catch { setMsg('Salvo localmente; nuvem indisponível.'); }
    finally { setSalvando(false); }
  }

  // ---- helpers de edição (master) ----
  const patchPlano = (i: number, campo: string, valor: unknown) =>
    setCfg((c) => ({ ...c, planos: c.planos.map((p, k) => (k === i ? { ...p, [campo]: valor } : p)) }));
  const addPlano = () =>
    setCfg((c) => ({ ...c, planos: [...c.planos, { id: `plano_${c.planos.length + 1}`, nome: 'Novo plano', descricao: '', precoCheio: 99, recursos: [], compromissoMinimoMeses: 0, ativo: true }] }));
  const removerPlano = (i: number) => setCfg((c) => ({ ...c, planos: c.planos.filter((_, k) => k !== i) }));
  const patchNivel = (i: number, campo: 'pct' | 'rotulo', valor: unknown) =>
    setCfg((c) => ({ ...c, niveis: c.niveis.map((n, k) => (k === i ? { ...n, [campo]: valor } : n)) }));
  const addNivel = () => setCfg((c) => ({ ...c, niveis: [...c.niveis, { pct: 100, rotulo: 'Novo nível' }] }));
  const removerNivel = (i: number) => setCfg((c) => ({ ...c, niveis: c.niveis.filter((_, k) => k !== i) }));

  const atribuicoesLista = Object.entries(cfg.atribuicoes);
  const setAtribuicao = (email: string, planoId: string, nivelPct: number) =>
    setCfg((c) => ({ ...c, atribuicoes: { ...c.atribuicoes, [email.trim().toLowerCase()]: { planoId, nivelPct } } }));
  const removerAtribuicao = (email: string) =>
    setCfg((c) => { const a = { ...c.atribuicoes }; delete a[email]; return { ...c, atribuicoes: a }; });
  const [novoEmail, setNovoEmail] = useState('');

  // Cálculo de estatísticas do SaaS (Admin)
  const totalClientes = atribuicoesLista.length;
  const mrrEstimado = atribuicoesLista.reduce((acc, [, at]) => {
    const pl = cfg.planos.find((p) => p.id === at.planoId);
    return acc + (pl ? precoNoNivel(pl.precoCheio, at.nivelPct) : 0);
  }, 0);

  const mostrarVisaoCliente = !admin || abaAdmin === 'cliente';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] max-w-4xl flex-col bg-background shadow-2xl rounded-2xl p-5 border border-border">
        <DialogHeader className="shrink-0 pb-3 border-b border-border/60">
          <DialogTitle className="flex items-center justify-between text-base font-black text-foreground">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
                <CreditCard className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span>{admin ? 'Gestão de Cobrança & Planos' : 'Planos e Assinatura Métrica'}</span>
                  {admin && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[9.5px] font-black uppercase text-amber-600 dark:text-amber-400">
                      PAINEL SAAS MASTER
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-normal text-muted-foreground">
                  {admin ? 'Gerencie a precificação, planos de clientes e descontos de fidelidade' : 'Escolha o plano ideal para seus levantamentos topográficos'}
                </p>
              </div>
            </div>

            {/* Alternador de Guia para o Administrador */}
            {admin && (
              <div className="flex items-center gap-1 rounded-xl bg-muted/60 p-1 border border-border/60">
                <button
                  type="button"
                  onClick={() => setAbaAdmin('admin')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold transition-all ${
                    abaAdmin === 'admin' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <ShieldCheck className="size-3.5 text-amber-500" /> Painel Admin
                </button>
                <button
                  type="button"
                  onClick={() => setAbaAdmin('cliente')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold transition-all ${
                    abaAdmin === 'cliente' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Eye className="size-3.5 text-emerald-500" /> Visão do Cliente
                </button>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          {/* =========================================================================
              VISÃO DO CLIENTE (Disponível para usuários normais e preview do admin)
             ========================================================================= */}
          {mostrarVisaoCliente && (
            <div className="space-y-4">
              {/* Card de aviso se o admin estiver vendo em modo preview */}
              {admin && (
                <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 shrink-0 text-emerald-500" />
                    <span><strong>Modo Preview do Cliente:</strong> Esta é exatamente a tela que seus clientes visualizam ao selecionar planos.</span>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs font-bold" onClick={() => setAbaAdmin('admin')}>
                    Voltar ao Admin
                  </Button>
                </div>
              )}

              {/* Status da assinatura atual do usuário logado */}
              {minha.plano && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Seu Plano Ativo</div>
                      <div className="mt-0.5 flex items-baseline gap-2">
                        <span className="text-lg font-black text-foreground">{minha.plano.nome}</span>
                        <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{formatBRL(meuPreco)}</span>
                        <span className="text-xs text-muted-foreground font-semibold">/mês</span>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/30">
                      <CheckCircle2 className="size-3.5" /> ATIVO
                    </span>
                  </div>
                  {minha.nivelPct < 100 && (
                    <p className="mt-2.5 rounded-xl border border-emerald-600/30 bg-emerald-600/10 p-2.5 text-xs leading-relaxed text-emerald-800 dark:text-emerald-300 font-medium">
                      {cfg.textoPrecoAgressivo}
                    </p>
                  )}
                </div>
              )}

              {/* Grid de Planos com Design Moderno */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {cfg.planos.filter((p) => p.ativo).map((p, idx) => {
                  const seu = precoNoNivel(p.precoCheio, minha.nivelPct);
                  const cheio = p.precoCheio;
                  const eDestaque = idx === 1 || p.nome.toLowerCase().includes('profissional');

                  return (
                    <div
                      key={p.id}
                      className={`relative flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200 shadow-sm ${
                        eDestaque
                          ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-950/20 ring-1 ring-emerald-500/40'
                          : 'border-border/80 bg-card hover:border-border'
                      }`}
                    >
                      {eDestaque && (
                        <span className="absolute -top-3 left-4 rounded-full bg-emerald-600 px-3 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-sm">
                          Mais Popular
                        </span>
                      )}

                      <div>
                        <div className="text-base font-black text-foreground">{p.nome}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{p.descricao}</div>

                        <div className="my-3 border-t border-border/40 pt-3">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{formatBRL(seu)}</span>
                            <span className="text-xs text-muted-foreground font-bold">/mês</span>
                            {seu < cheio && (
                              <span className="text-xs text-muted-foreground line-through font-mono ml-1">{formatBRL(cheio)}</span>
                            )}
                          </div>
                          {p.compromissoMinimoMeses > 0 && (
                            <span className="inline-block mt-1 text-[9.5px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                              Compromisso de {p.compromissoMinimoMeses} meses
                            </span>
                          )}
                        </div>

                        <ul className="space-y-2 mb-4">
                          {p.recursos.map((r, k) => (
                            <li key={k} className="flex items-start gap-2 text-xs text-foreground/90 font-medium">
                              <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {linkAssinar ? (
                        <a href={linkAssinar} target="_blank" rel="noopener noreferrer" className="w-full mt-2">
                          <Button
                            size="sm"
                            className={`w-full h-9 font-black uppercase text-xs tracking-wider gap-1.5 shadow-md active:scale-98 transition-all ${
                              eDestaque
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                            }`}
                          >
                            <MessageCircle className="size-4" /> Assinar Agora
                          </Button>
                        </a>
                      ) : (
                        <Button size="sm" disabled className="w-full h-9 text-xs font-bold">
                          Fale com o Suporte
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-center text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">💡 Dúvidas ou faturamento corporativo?</p>
                <p>Nossa equipe de suporte técnico e comercial ajusta o plano ideal para seu escritório.</p>
              </div>
            </div>
          )}

          {/* =========================================================================
              VISÃO DO ADMIN: Painel Completo do SaaS (Master)
             ========================================================================= */}
          {admin && abaAdmin === 'admin' && (
            <div className="space-y-5">
              {/* KPIs do SaaS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-border bg-card p-3.5 shadow-2xs flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Clientes Atribuídos</div>
                    <div className="text-xl font-black text-foreground mt-0.5">{totalClientes}</div>
                  </div>
                  <div className="flex size-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-500">
                    <Users className="size-4.5" />
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-3.5 shadow-2xs flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">MRR Estimado (Mensal)</div>
                    <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{formatBRL(mrrEstimado)}</div>
                  </div>
                  <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
                    <TrendingUp className="size-4.5" />
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-3.5 shadow-2xs flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Planos Ativos</div>
                    <div className="text-xl font-black text-foreground mt-0.5">{cfg.planos.filter((p) => p.ativo).length}</div>
                  </div>
                  <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
                    <Award className="size-4.5" />
                  </div>
                </div>
              </div>

              {/* Planos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Planos &amp; Valor Cheio (100%)</span>
                  <Button size="sm" variant="outline" className="h-8 text-xs font-bold gap-1" onClick={addPlano}>
                    <Plus className="size-3.5" /> Novo Plano
                  </Button>
                </div>

                <div className="space-y-3">
                  {cfg.planos.map((p, i) => (
                    <div key={i} className="space-y-3 rounded-2xl border border-border/80 bg-card p-3.5 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <Input className="h-9 flex-1 text-xs font-extrabold" value={p.nome} onChange={(e) => patchPlano(i, 'nome', e.target.value)} placeholder="Nome do plano" />
                        <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground cursor-pointer select-none">
                          <input type="checkbox" checked={p.ativo} onChange={(e) => patchPlano(i, 'ativo', e.target.checked)} className="rounded border" /> Ativo
                        </label>
                        <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-destructive hover:bg-destructive/10" onClick={() => removerPlano(i)} title="Remover plano">
                          <Trash2 className="size-4" />
                        </Button>
                      </div>

                      <Input className="h-8 text-xs" value={p.descricao} onChange={(e) => patchPlano(i, 'descricao', e.target.value)} placeholder="Descrição curta do plano" />

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs font-bold text-muted-foreground">Preço Cheio R$/mês:</Label>
                          <Input type="number" className="h-8 w-24 text-xs font-mono font-bold" value={p.precoCheio} onChange={(e) => patchPlano(i, 'precoCheio', Number(e.target.value) || 0)} />
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs font-bold text-muted-foreground">Mínimo (meses):</Label>
                          <Input type="number" className="h-8 w-16 text-xs font-mono font-bold" value={p.compromissoMinimoMeses} onChange={(e) => patchPlano(i, 'compromissoMinimoMeses', Math.max(0, Math.floor(Number(e.target.value) || 0)))} />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Recursos (um por linha)</Label>
                        <textarea
                          className="h-16 w-full rounded-xl border bg-background p-2 text-xs font-mono outline-none focus:ring-1 focus:ring-primary"
                          value={p.recursos.join('\n')}
                          onChange={(e) => patchPlano(i, 'recursos', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))}
                          placeholder="Um recurso por linha"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Escada de fidelidade */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Escada de Fidelidade (% do valor cheio)</span>
                  <Button size="sm" variant="outline" className="h-8 text-xs font-bold gap-1" onClick={addNivel}>
                    <Plus className="size-3.5" /> Novo Nível
                  </Button>
                </div>

                <div className="space-y-2">
                  {cfg.niveis.map((n, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input type="number" className="h-8 w-20 text-xs font-mono font-bold" value={n.pct} onChange={(e) => patchNivel(i, 'pct', Math.max(0, Math.min(100, Number(e.target.value) || 0)))} />
                      <span className="text-xs font-bold text-muted-foreground">%</span>
                      <Input className="h-8 flex-1 text-xs font-semibold" value={n.rotulo} onChange={(e) => patchNivel(i, 'rotulo', e.target.value)} placeholder="Rótulo do nível" />
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={() => removerNivel(i)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Label className="text-xs font-bold text-muted-foreground">Nível padrão de novos usuários:</Label>
                  <select
                    className="h-8 rounded-lg border bg-background px-2 text-xs font-bold text-foreground outline-none"
                    value={cfg.nivelPadraoPct}
                    onChange={(e) => setCfg((c) => ({ ...c, nivelPadraoPct: Number(e.target.value) }))}
                  >
                    {cfg.niveis.map((n, i) => (
                      <option key={i} value={n.pct}>{n.pct}% — {n.rotulo}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Matriz de Preços Calculados */}
              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Tabela Matriz de Preços por Nível</span>
                <div className="overflow-x-auto rounded-xl border border-border/80 bg-card">
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="bg-muted/40 text-left border-b border-border/60">
                        <th className="p-2.5 font-black uppercase text-[10px]">Plano</th>
                        {cfg.niveis.map((n, i) => (
                          <th key={i} className="p-2.5 text-right font-black uppercase text-[10px]">{n.pct}% ({n.rotulo})</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cfg.planos.map((p, i) => (
                        <tr key={i} className="border-t border-border/40">
                          <td className="p-2.5 font-extrabold text-foreground">{p.nome}</td>
                          {cfg.niveis.map((n, k) => (
                            <td key={k} className="p-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                              {formatBRL(precoNoNivel(p.precoCheio, n.pct))}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Atribuições por Usuário */}
              <div className="space-y-3">
                <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Atribuição por E-mail do Cliente</span>

                {atribuicoesLista.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Nenhum cliente atribuído especificamente. Todos usam o nível padrão.</p>
                )}

                <div className="space-y-2">
                  {atribuicoesLista.map(([email, at]) => (
                    <div key={email} className="flex flex-wrap items-center gap-2 p-2 rounded-xl border border-border/60 bg-card">
                      <span className="min-w-[160px] flex-1 truncate text-xs font-bold font-mono text-foreground" title={email}>{email}</span>
                      <select
                        className="h-8 rounded-lg border bg-background px-2 text-xs font-bold outline-none"
                        value={at.planoId}
                        onChange={(e) => setAtribuicao(email, e.target.value, at.nivelPct)}
                      >
                        {cfg.planos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                      </select>
                      <select
                        className="h-8 rounded-lg border bg-background px-2 text-xs font-bold outline-none"
                        value={at.nivelPct}
                        onChange={(e) => setAtribuicao(email, at.planoId, Number(e.target.value))}
                      >
                        {cfg.niveis.map((n, i) => <option key={i} value={n.pct}>{n.pct}% ({n.rotulo})</option>)}
                      </select>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={() => removerAtribuicao(email)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Input
                    className="h-9 min-w-[200px] flex-1 text-xs font-mono"
                    value={novoEmail}
                    onChange={(e) => setNovoEmail(e.target.value)}
                    placeholder="E-mail do novo cliente"
                  />
                  <Button
                    size="sm"
                    className="h-9 px-4 font-bold text-xs gap-1"
                    disabled={!novoEmail.trim()}
                    onClick={() => {
                      const p = cfg.planos[0];
                      if (p) {
                        setAtribuicao(novoEmail, p.id, cfg.nivelPadraoPct);
                        setNovoEmail('');
                      }
                    }}
                  >
                    <Plus className="size-4" /> Atribuir Cliente
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé de Ações */}
        <div className="flex items-center justify-between border-t border-border/60 pt-3 shrink-0">
          <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">{msg}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 px-4 font-bold text-xs" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            {admin && (
              <Button size="sm" disabled={salvando} className="h-9 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs gap-1.5 shadow-md" onClick={salvar}>
                <Save className="size-4" /> Salvar Cobrança
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
