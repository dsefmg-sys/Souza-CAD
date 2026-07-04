'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, Check, Plus, Trash2, MessageCircle, Save } from 'lucide-react';
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
    try { await salvarConfigAssinatura(cfg); setMsg('Cobrança salva.'); }
    catch { setMsg('Salvo local; nuvem indisponível.'); }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] max-w-2xl flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <CreditCard className="size-5 text-primary" /> {admin ? 'Cobrança do app (admin)' : 'Planos e assinatura'}
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {/* ===== VISÃO DO USUÁRIO: o preço dele ===== */}
          {!admin && (
            <>
              {minha.plano && (
                <div className="rounded-lg border bg-muted/20 p-3">
                  <div className="text-[11px] font-semibold uppercase text-muted-foreground">Seu plano</div>
                  <div className="mt-0.5 flex items-baseline gap-2">
                    <span className="text-base font-bold text-foreground">{minha.plano.nome}</span>
                    <span className="text-lg font-extrabold text-primary">{formatBRL(meuPreco)}</span>
                    <span className="text-xs text-muted-foreground">/mês</span>
                  </div>
                  {minha.nivelPct < 100 && (
                    <p className="mt-2 rounded border border-emerald-600/30 bg-emerald-600/10 p-2 text-xs leading-relaxed text-emerald-800 dark:text-emerald-300">
                      {cfg.textoPrecoAgressivo}
                    </p>
                  )}
                </div>
              )}

              <div className="grid gap-2 sm:grid-cols-2">
                {cfg.planos.filter((p) => p.ativo).map((p) => {
                  const seu = precoNoNivel(p.precoCheio, minha.nivelPct);
                  const cheio = p.precoCheio;
                  return (
                    <div key={p.id} className="flex flex-col rounded-lg border p-3">
                      <div className="text-sm font-bold text-foreground">{p.nome}</div>
                      <div className="text-[11px] text-muted-foreground">{p.descricao}</div>
                      <div className="mt-1.5 flex items-baseline gap-1.5">
                        <span className="text-lg font-extrabold text-primary">{formatBRL(seu)}</span>
                        <span className="text-[10px] text-muted-foreground">/mês</span>
                        {seu < cheio && <span className="text-[10px] text-muted-foreground line-through">{formatBRL(cheio)}</span>}
                      </div>
                      <ul className="mt-2 space-y-1">
                        {p.recursos.map((r, k) => (
                          <li key={k} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                            <Check className="mt-0.5 size-3 shrink-0 text-primary" /> {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>

              {linkAssinar ? (
                <a href={linkAssinar} target="_blank" rel="noopener noreferrer"
                   className="flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
                  <MessageCircle className="size-4" /> Assinar / falar sobre o pagamento
                </a>
              ) : (
                <p className="rounded border border-dashed p-2 text-center text-[11px] text-muted-foreground">
                  A assinatura é combinada direto com o responsável pelo app. Fale com o suporte.
                </p>
              )}
              <p className="text-center text-[10px] text-muted-foreground">Cobrança mensal, sem fidelidade obrigatória e sem desconto anual.</p>
            </>
          )}

          {/* ===== VISÃO DO ADMIN: editar tudo ===== */}
          {admin && (
            <>
              <p className="rounded border border-dashed p-2 text-[11px] leading-tight text-muted-foreground">
                Só você vê e edita isto. Defina os planos e o <strong>valor cheio</strong> (100%). Cada usuário paga uma
                fração dele pelo nível de fidelidade — quem entra começa no nível de custo e você vai promovendo com o tempo.
              </p>

              {/* Planos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Planos e valor cheio</span>
                  <Button size="sm" variant="outline" className="h-7" onClick={addPlano}><Plus className="size-3.5" /> Plano</Button>
                </div>
                {cfg.planos.map((p, i) => (
                  <div key={i} className="space-y-2 rounded-lg border p-2.5">
                    <div className="flex items-center gap-2">
                      <Input className="h-8 flex-1 text-xs font-semibold" value={p.nome} onChange={(e) => patchPlano(i, 'nome', e.target.value)} placeholder="Nome do plano" />
                      <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <input type="checkbox" checked={p.ativo} onChange={(e) => patchPlano(i, 'ativo', e.target.checked)} /> ativo
                      </label>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => removerPlano(i)} aria-label="Remover plano"><Trash2 className="size-4" /></Button>
                    </div>
                    <Input className="h-8 text-xs" value={p.descricao} onChange={(e) => patchPlano(i, 'descricao', e.target.value)} placeholder="Descrição curta" />
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Label className="text-[11px]">Valor cheio R$/mês</Label>
                        <Input type="number" className="h-8 w-24 text-xs" value={p.precoCheio} onChange={(e) => patchPlano(i, 'precoCheio', Number(e.target.value) || 0)} />
                      </div>
                      <div className="flex items-center gap-1" title="Compromisso mínimo. 0 = mensal. Use 6 para o plano semestral (futuro).">
                        <Label className="text-[11px]">Mínimo (meses)</Label>
                        <Input type="number" className="h-8 w-16 text-xs" value={p.compromissoMinimoMeses} onChange={(e) => patchPlano(i, 'compromissoMinimoMeses', Math.max(0, Math.floor(Number(e.target.value) || 0)))} />
                      </div>
                    </div>
                    <textarea className="h-16 w-full rounded border bg-background p-1.5 text-[11px]" value={p.recursos.join('\n')}
                      onChange={(e) => patchPlano(i, 'recursos', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))}
                      placeholder="Um recurso por linha" />
                  </div>
                ))}
              </div>

              {/* Escada de fidelidade */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Escada de fidelidade (% do valor cheio)</span>
                  <Button size="sm" variant="outline" className="h-7" onClick={addNivel}><Plus className="size-3.5" /> Nível</Button>
                </div>
                {cfg.niveis.map((n, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input type="number" className="h-8 w-16 text-xs" value={n.pct} onChange={(e) => patchNivel(i, 'pct', Math.max(0, Math.min(100, Number(e.target.value) || 0)))} />
                    <span className="text-xs text-muted-foreground">%</span>
                    <Input className="h-8 flex-1 text-xs" value={n.rotulo} onChange={(e) => patchNivel(i, 'rotulo', e.target.value)} placeholder="Rótulo do nível" />
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => removerNivel(i)} aria-label="Remover nível"><Trash2 className="size-4" /></Button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Label className="text-[11px]">Nível de quem entra (padrão)</Label>
                  <select className="h-8 rounded border bg-background px-2 text-xs" value={cfg.nivelPadraoPct} onChange={(e) => setCfg((c) => ({ ...c, nivelPadraoPct: Number(e.target.value) }))}>
                    {cfg.niveis.map((n, i) => <option key={i} value={n.pct}>{n.pct}% — {n.rotulo}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Explicação do preço reduzido (mostrada a quem paga menos que 100%)</Label>
                  <textarea className="h-16 w-full rounded border bg-background p-1.5 text-[11px]" value={cfg.textoPrecoAgressivo}
                    onChange={(e) => setCfg((c) => ({ ...c, textoPrecoAgressivo: e.target.value }))} />
                </div>
              </div>

              {/* Prévia: planos x níveis */}
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Prévia dos preços</span>
                <div className="overflow-x-auto rounded border">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="bg-muted/40 text-left">
                        <th className="p-1.5">Plano</th>
                        {cfg.niveis.map((n, i) => <th key={i} className="p-1.5 text-right">{n.pct}%</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {cfg.planos.map((p, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-1.5 font-semibold">{p.nome}</td>
                          {cfg.niveis.map((n, k) => <td key={k} className="p-1.5 text-right tabular-nums">{formatBRL(precoNoNivel(p.precoCheio, n.pct))}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Atribuições por usuário */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Nível de cada cliente (por e-mail)</span>
                {atribuicoesLista.length === 0 && <p className="text-[11px] text-muted-foreground">Ninguém atribuído ainda — todos pagam o nível padrão.</p>}
                {atribuicoesLista.map(([email, at]) => (
                  <div key={email} className="flex flex-wrap items-center gap-1.5">
                    <span className="min-w-[140px] flex-1 truncate text-xs" title={email}>{email}</span>
                    <select className="h-8 rounded border bg-background px-1 text-xs" value={at.planoId} onChange={(e) => setAtribuicao(email, e.target.value, at.nivelPct)}>
                      {cfg.planos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                    </select>
                    <select className="h-8 rounded border bg-background px-1 text-xs" value={at.nivelPct} onChange={(e) => setAtribuicao(email, at.planoId, Number(e.target.value))}>
                      {cfg.niveis.map((n, i) => <option key={i} value={n.pct}>{n.pct}%</option>)}
                    </select>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => removerAtribuicao(email)} aria-label="Remover atribuição"><Trash2 className="size-4" /></Button>
                  </div>
                ))}
                <div className="flex flex-wrap items-center gap-1.5">
                  <Input className="h-8 min-w-[160px] flex-1 text-xs" value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} placeholder="e-mail do cliente" />
                  <Button size="sm" variant="outline" className="h-8" disabled={!novoEmail.trim()} onClick={() => { const p = cfg.planos[0]; if (p) { setAtribuicao(novoEmail, p.id, cfg.nivelPadraoPct); setNovoEmail(''); } }}>
                    <Plus className="size-3.5" /> Adicionar
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-[11px] text-primary">{msg}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Fechar</Button>
            {admin && <Button size="sm" disabled={salvando} onClick={salvar}><Save className="size-4" /> Salvar cobrança</Button>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
