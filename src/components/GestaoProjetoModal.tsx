'use client';

import { useState, useEffect } from 'react';
import { Receipt, FileText, Plus, Trash2, Wallet, Building2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ImovelData, EscritorioData, TecnicoData, FinanceiroProjeto, LancamentoFinanceiro, Projeto } from '@/lib/topo/types';
import { rotulosProfissional } from '@/lib/topo/profissional';
import { saveAs } from 'file-saver';
import { moedaBR, gerarReciboPdf, gerarContratoPdf, gerarPropostaPdf } from '@/lib/export/financeiro';
import { gerarDeclaracaoPosseDocx, gerarDeclaracaoSobreposicaoDocx } from '@/lib/export/declaracoes';
import { listarProjetos } from '@/lib/store/projects';
import { consumirNumeroRecibo } from '@/lib/store/settings';
import { carregarPrecos, type PrecoServico } from '@/lib/store/precos';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  imovel: ImovelData;
  financeiro: FinanceiroProjeto;
  onChange: (f: FinanceiroProjeto) => void;
  nomeProjeto: string;
  areaHa: number;
  perimetro: number;
  tecnico: TecnicoData;
  escritorio: EscritorioData;
  dataExtenso: string;
}

const hoje = () => new Date().toISOString().slice(0, 10);

export default function GestaoProjetoModal({ open, onOpenChange, imovel, financeiro, onChange, nomeProjeto, areaHa, perimetro, tecnico, escritorio, dataExtenso }: Props) {
  const lancamentos = financeiro.lancamentos ?? [];
  const valorCobrado = financeiro.valorCobrado ?? 0;

  const recebido = lancamentos.filter((l) => l.tipo === 'recebimento').reduce((s, l) => s + (l.valor || 0), 0);
  const gasto = lancamentos.filter((l) => l.tipo === 'gasto').reduce((s, l) => s + (l.valor || 0), 0);
  const saldoCaixa = recebido - gasto;
  const aReceber = valorCobrado - recebido;
  const lucro = valorCobrado - gasto;                             // lucro do serviço quando quitado
  const margem = valorCobrado > 0 ? (lucro / valorCobrado) * 100 : 0;

  const [novo, setNovo] = useState<{ tipo: 'gasto' | 'recebimento'; descricao: string; valor: string; data: string }>({ tipo: 'recebimento', descricao: '', valor: '', data: hoje() });
  const [reciboValor, setReciboValor] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('');
  const [aba, setAba] = useState<'projeto' | 'empresa'>('projeto');
  const [projetos, setProjetos] = useState<Projeto[] | null>(null);
  const [precos, setPrecos] = useState<PrecoServico[]>([]);
  useEffect(() => { if (!open) { setProjetos(null); setAba('projeto'); } else { setPrecos(carregarPrecos()); } }, [open]);
  useEffect(() => { if (open && aba === 'empresa' && projetos === null) listarProjetos().then(setProjetos).catch(() => setProjetos([])); }, [open, aba, projetos]);

  const patch = (p: Partial<FinanceiroProjeto>) => onChange({ ...financeiro, ...p });

  function adicionar() {
    const valor = Number(novo.valor.replace(',', '.'));
    if (!novo.descricao.trim() || !Number.isFinite(valor) || valor <= 0) return;
    const l: LancamentoFinanceiro = { id: `f_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4)}`, tipo: novo.tipo, descricao: novo.descricao.trim(), valor, data: novo.data || hoje() };
    patch({ lancamentos: [...lancamentos, l] });
    setNovo({ tipo: novo.tipo, descricao: '', valor: '', data: hoje() });
  }
  function remover(id: string) {
    patch({ lancamentos: lancamentos.filter((l) => l.id !== id) });
  }

  const baseArgs = { imovel, escritorio, tecnico, dataExtenso, areaHa, perimetro };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[1200px] max-h-[95vh] flex flex-col p-3 sm:p-6">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold"><Wallet className="size-5" /> Gestão do Projeto</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 border-b pb-2 pt-1">
          <button onClick={() => setAba('projeto')} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${aba === 'projeto' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/50'}`}>Este projeto</button>
          <button onClick={() => setAba('empresa')} className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold ${aba === 'empresa' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/50'}`}><Building2 className="size-3.5" /> Visão geral (empresa)</button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 py-3 text-sm">
          {aba === 'projeto' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Coluna da Esquerda: Informações e Documentos */}
              <div className="space-y-5">
                {/* ---- Informações do projeto ---- */}
                <section>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Informações do projeto</h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 rounded-md border bg-muted/30 p-3 md:grid-cols-3">
                    <Info rotulo="Projeto" valor={nomeProjeto || imovel.denominacao || '—'} />
                    <Info rotulo="Proprietário" valor={imovel.proprietario || '—'} />
                    <Info rotulo="CPF/CNPJ" valor={imovel.cpfProprietario || '—'} />
                    <Info rotulo="Matrícula" valor={imovel.matricula || '—'} />
                    <Info rotulo="Município" valor={imovel.municipio || '—'} />
                    <Info rotulo="Área" valor={`${areaHa.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} ha`} />
                    <Info rotulo="Perímetro" valor={`${perimetro.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} m`} />
                    <Info rotulo={rotulosProfissional(tecnico).termo} valor={imovel.numeroTrt || tecnico.art || '—'} />
                  </div>
                </section>

                {/* ---- Documentos ---- */}
                <section>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Documentos para o cliente</h3>
                  <div className="flex flex-wrap items-end gap-3 rounded-md border p-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Valor do recibo (R$)</Label>
                      <Input type="number" className="w-40" placeholder={String(valorCobrado || '0,00')} value={reciboValor} onChange={(e) => setReciboValor(e.target.value)} />
                    </div>
                    <Button variant="outline" onClick={() => gerarReciboPdf({ ...baseArgs, valor: Number(reciboValor.replace(',', '.')) || valorCobrado || recebido, numero: consumirNumeroRecibo(new Date().getFullYear()) })}>
                      <Receipt className="size-4" /> Emitir recibo (PDF)
                    </Button>
                    <div className="space-y-1">
                      <Label className="text-xs">Forma de pagamento (contrato)</Label>
                      <Input className="w-56" placeholder="ex.: 50% na entrada, 50% na entrega" value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} />
                    </div>
                    <Button variant="outline" onClick={() => gerarContratoPdf({ ...baseArgs, valor: valorCobrado, formaPagamento: formaPagamento || undefined })}>
                      <FileText className="size-4" /> Emitir contrato (PDF)
                    </Button>
                    <Button variant="outline" onClick={() => gerarPropostaPdf({ ...baseArgs, valor: valorCobrado, formaPagamento: formaPagamento || undefined })}>
                      <FileText className="size-4" /> Emitir proposta (PDF)
                    </Button>
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">O contrato e a proposta usam o valor cobrado acima. Todos saem prontos para revisar, imprimir e assinar.</p>

                  <h3 className="mb-2 mt-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">Declarações avulsas</h3>
                  <div className="flex flex-wrap items-center gap-3 rounded-md border p-3">
                    <Button variant="outline" onClick={async () => saveAs(await gerarDeclaracaoPosseDocx({ imovel, tecnico, dataExtenso }), `Declaracao de posse - ${imovel.denominacao || 'imovel'}.docx`)}>
                      <FileText className="size-4" /> Declaração de posse
                    </Button>
                    <Button variant="outline" onClick={async () => saveAs(await gerarDeclaracaoSobreposicaoDocx({ imovel, tecnico, dataExtenso }), `Declaracao de inexistencia de sobreposicao - ${imovel.denominacao || 'imovel'}.docx`)}>
                      <FileText className="size-4" /> Inexistência de sobreposição
                    </Button>
                    <p className="text-[11px] text-muted-foreground">A de posse é assinada pelo possuidor; a de sobreposição, pelo responsável técnico. Os textos são editáveis nos modelos.</p>
                  </div>
                </section>
              </div>

              {/* Coluna da Direita: Financeiro */}
              <div className="space-y-5">
                {/* ---- Resumo financeiro ---- */}
                <section>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Financeiro</h3>
                  <div className="mb-3 flex flex-wrap items-end gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Valor cobrado do cliente (R$)</Label>
                      <Input type="number" className="w-44" value={financeiro.valorCobrado ?? ''} placeholder="0,00"
                        onChange={(e) => patch({ valorCobrado: e.target.value === '' ? undefined : Number(e.target.value) })} />
                    </div>
                    {precos.some((p) => p.valor > 0) && (
                      <div className="space-y-1">
                        <Label className="text-xs">Puxar da tabela de preços</Label>
                        <select className="h-9 w-56 rounded-md border bg-background px-2 text-xs" value=""
                          onChange={(e) => { const p = precos.find((x) => x.id === e.target.value); if (p) patch({ valorCobrado: p.valor }); }}>
                          <option value="">Escolher serviço…</option>
                          {precos.filter((p) => p.valor > 0).map((p) => (
                            <option key={p.id} value={p.id}>{p.servico} — {moedaBR(p.valor)}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 w-full">
                      <Cartao titulo="Recebido" valor={recebido} cor="text-emerald-600" />
                      <Cartao titulo="Gastos" valor={gasto} cor="text-red-600" />
                      <Cartao titulo="Saldo em caixa" valor={saldoCaixa} cor={saldoCaixa >= 0 ? 'text-emerald-700' : 'text-red-700'} />
                      <Cartao titulo="A receber" valor={aReceber} cor={aReceber > 0 ? 'text-amber-600' : 'text-muted-foreground'} />
                      <Cartao titulo="Lucro do serviço" valor={lucro} cor={lucro >= 0 ? 'text-emerald-700' : 'text-red-700'} sub={valorCobrado > 0 ? `margem ${margem.toFixed(0)}%` : 'informe o valor cobrado'} />
                    </div>
                  </div>

                  {/* lançamentos */}
                  <div className="overflow-hidden rounded-md border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 text-left text-muted-foreground">
                        <tr><th className="p-2">Data</th><th className="p-2">Tipo</th><th className="p-2">Descrição</th><th className="p-2 text-right">Valor</th><th className="p-2"></th></tr>
                      </thead>
                      <tbody>
                        {lancamentos.length === 0 && (
                          <tr><td colSpan={5} className="p-3 text-center text-muted-foreground">Nenhum lançamento ainda.</td></tr>
                        )}
                        {lancamentos.slice().sort((a, b) => a.data.localeCompare(b.data)).map((l) => (
                          <tr key={l.id} className="border-t">
                            <td className="p-2">{l.data.split('-').reverse().join('/')}</td>
                            <td className="p-2">{l.tipo === 'recebimento' ? <span className="text-emerald-600 dark:text-emerald-400">Recebimento</span> : <span className="text-red-600 dark:text-red-400">Gasto</span>}</td>
                            <td className="p-2">{l.descricao}</td>
                            <td className="p-2 text-right font-medium">{moedaBR(l.valor)}</td>
                            <td className="p-2 text-right"><button onClick={() => remover(l.id)} title="Excluir este lançamento" className="text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {/* nova linha */}
                    <div className="flex flex-wrap items-end gap-2 border-t bg-muted/20 p-2">
                      <select className="h-9 rounded-sm border bg-background px-2 text-xs" value={novo.tipo} onChange={(e) => setNovo((n) => ({ ...n, tipo: e.target.value as 'gasto' | 'recebimento' }))}>
                        <option value="recebimento">Recebimento</option>
                        <option value="gasto">Gasto</option>
                      </select>
                      <Input className="h-9 flex-1 min-w-[140px] text-xs" placeholder="Descrição (ex.: entrada, diária de campo, cartório)" value={novo.descricao} onChange={(e) => setNovo((n) => ({ ...n, descricao: e.target.value }))} />
                      <Input className="h-9 w-28 text-xs" type="number" placeholder="Valor R$" value={novo.valor} onChange={(e) => setNovo((n) => ({ ...n, valor: e.target.value }))} />
                      <Input className="h-9 w-36 text-xs" type="date" value={novo.data} onChange={(e) => setNovo((n) => ({ ...n, data: e.target.value }))} />
                      <Button size="sm" className="h-9" onClick={adicionar}><Plus className="size-4" /> Lançar</Button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1">
                    <Label className="text-xs">Observações</Label>
                    <textarea className="w-full rounded-sm border bg-background p-2 text-xs" rows={2} value={financeiro.observacoes ?? ''} onChange={(e) => patch({ observacoes: e.target.value })} />
                  </div>
                </section>
              </div>
            </div>
          )}
          {aba === 'empresa' && <EmpresaResumo projetos={projetos} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function resumoFin(f?: FinanceiroProjeto) {
  const ls = f?.lancamentos ?? [];
  const recebido = ls.filter((l) => l.tipo === 'recebimento').reduce((s, l) => s + (l.valor || 0), 0);
  const gasto = ls.filter((l) => l.tipo === 'gasto').reduce((s, l) => s + (l.valor || 0), 0);
  const cobrado = f?.valorCobrado ?? 0;
  return { cobrado, recebido, gasto, saldo: recebido - gasto, aReceber: cobrado - recebido };
}

function EmpresaResumo({ projetos }: { projetos: Projeto[] | null }) {
  if (projetos === null) return <div className="p-6 text-center text-muted-foreground">Carregando projetos…</div>;
  if (projetos.length === 0) return <div className="p-6 text-center text-muted-foreground">Nenhum projeto salvo ainda. Salve projetos para acompanhar o financeiro de cada um aqui.</div>;
  const linhas = projetos.map((p) => ({ nome: p.nome || p.imovel?.denominacao || 'Projeto', r: resumoFin(p.imovel?.financeiro) }));
  const tot = linhas.reduce((s, l) => ({ cobrado: s.cobrado + l.r.cobrado, recebido: s.recebido + l.r.recebido, gasto: s.gasto + l.r.gasto, aReceber: s.aReceber + l.r.aReceber }), { cobrado: 0, recebido: 0, gasto: 0, aReceber: 0 });
  return (
    <section>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Visão geral da empresa — {projetos.length} projeto(s) salvo(s)</h3>
      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr><th className="p-2">Projeto</th><th className="p-2 text-right">Cobrado</th><th className="p-2 text-right">Recebido</th><th className="p-2 text-right">A receber</th><th className="p-2 text-right">Saldo</th></tr>
          </thead>
          <tbody>
            {linhas.map((l, i) => (
              <tr key={i} className="border-t">
                <td className="p-2">{l.nome}</td>
                <td className="p-2 text-right">{moedaBR(l.r.cobrado)}</td>
                <td className="p-2 text-right text-emerald-600">{moedaBR(l.r.recebido)}</td>
                <td className={`p-2 text-right ${l.r.aReceber > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>{moedaBR(l.r.aReceber)}</td>
                <td className={`p-2 text-right font-medium ${l.r.saldo >= 0 ? '' : 'text-red-600'}`}>{moedaBR(l.r.saldo)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t bg-muted/30 font-semibold">
            <tr><td className="p-2">Total</td><td className="p-2 text-right">{moedaBR(tot.cobrado)}</td><td className="p-2 text-right">{moedaBR(tot.recebido)}</td><td className="p-2 text-right">{moedaBR(tot.aReceber)}</td><td className="p-2 text-right">{moedaBR(tot.recebido - tot.gasto)}</td></tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">Soma o financeiro de todos os projetos salvos. O projeto aberto agora aparece aqui depois de salvo.</p>
    </section>
  );
}

function Info({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{rotulo}</div>
      <div className="truncate font-medium">{valor}</div>
    </div>
  );
}

function Cartao({ titulo, valor, cor, sub }: { titulo: string; valor: number; cor: string; sub?: string }) {
  return (
    <div className="rounded-md border bg-background px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{titulo}</div>
      <div className={`text-sm font-bold ${cor}`}>{moedaBR(valor)}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
