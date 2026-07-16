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
  isAdmin?: boolean;
}

const hoje = () => new Date().toISOString().slice(0, 10);

export default function GestaoProjetoModal({ open, onOpenChange, imovel, financeiro, onChange, nomeProjeto, areaHa, perimetro, tecnico, escritorio, dataExtenso, isAdmin = false }: Props) {
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
  const [prazoDias, setPrazoDias] = useState('30');
  const [aba, setAba] = useState<'projeto' | 'empresa'>('projeto');
  const [projetos, setProjetos] = useState<Projeto[] | null>(null);
  const [precos, setPrecos] = useState<PrecoServico[]>([]);
  useEffect(() => { if (!open) { setProjetos(null); setAba('projeto'); } else { setPrecos(carregarPrecos()); } }, [open]);
  useEffect(() => { if (open && aba === 'empresa' && projetos === null) listarProjetos().then(setProjetos).catch(() => setProjetos([])); }, [open, aba, projetos]);

  const patch = (p: Partial<FinanceiroProjeto>) => onChange({ ...financeiro, ...p });

  const setRecebidoTotal = (val: number) => {
    const outros = lancamentos.filter((l) => l.tipo !== 'recebimento');
    patch({
      lancamentos: val > 0 ? [
        ...outros,
        { id: 'recebido_unico', tipo: 'recebimento', descricao: 'Valor Recebido', valor: val, data: hoje() }
      ] : outros
    });
  };

  const setCustoTotal = (val: number) => {
    const outros = lancamentos.filter((l) => l.tipo !== 'gasto');
    patch({
      lancamentos: val > 0 ? [
        ...outros,
        { id: 'gasto_unico', tipo: 'gasto', descricao: 'Custos com o Serviço', valor: val, data: hoje() }
      ] : outros
    });
  };

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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-md border p-3 bg-muted/10">
                    <div className="space-y-1">
                      <Label className="text-xs">Valor do recibo (R$)</Label>
                      <Input type="number" placeholder={String(valorCobrado || '0,00')} value={reciboValor} onChange={(e) => setReciboValor(e.target.value)} />
                    </div>
                    <div className="space-y-1 flex items-end">
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold border-transparent" onClick={() => gerarReciboPdf({ ...baseArgs, valor: Number(reciboValor.replace(',', '.')) || valorCobrado || recebido, numero: consumirNumeroRecibo(new Date().getFullYear()) })}>
                        <Receipt className="size-4 mr-1.5" /> Emitir recibo (PDF)
                      </Button>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Forma de pagamento (contrato)</Label>
                      <Input placeholder="ex.: 50% na entrada, 50% na entrega" value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Prazo de execução (dias)</Label>
                      <Input type="number" placeholder="30" value={prazoDias} onChange={(e) => setPrazoDias(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold border-transparent" onClick={() => gerarContratoPdf({ ...baseArgs, valor: valorCobrado, formaPagamento: formaPagamento || undefined, prazoDias: Number(prazoDias) || undefined })}>
                        <FileText className="size-4 mr-1.5" /> Emitir contrato (PDF)
                      </Button>
                    </div>
                    <div className="space-y-1">
                      <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold border-transparent" onClick={() => gerarPropostaPdf({ ...baseArgs, valor: valorCobrado, formaPagamento: formaPagamento || undefined, prazoDias: Number(prazoDias) || undefined })}>
                        <FileText className="size-4 mr-1.5" /> Emitir proposta (PDF)
                      </Button>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">O contrato e a proposta usam o valor cobrado e prazo informados acima.</p>

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

                  {/* Simplificação de Lançamentos */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-md border bg-muted/10 p-3 mt-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-foreground">Valor recebido até o momento (R$)</Label>
                      <Input
                        type="number"
                        placeholder="0,00"
                        value={recebido || ''}
                        onChange={(e) => setRecebidoTotal(e.target.value === '' ? 0 : Number(e.target.value))}
                        className="bg-background text-emerald-600 font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-foreground">Custos com o serviço (R$)</Label>
                      <Input
                        type="number"
                        placeholder="0,00"
                        value={gasto || ''}
                        onChange={(e) => setCustoTotal(e.target.value === '' ? 0 : Number(e.target.value))}
                        className="bg-background text-red-600 font-bold"
                      />
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
          {aba === 'empresa' && <EmpresaResumo projetos={projetos} isAdmin={isAdmin} />}
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

function EmpresaResumo({ projetos, isAdmin }: { projetos: Projeto[] | null; isAdmin: boolean }) {
  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-zinc-500/20 bg-zinc-500/5 p-6 text-center text-muted-foreground">
        A visão geral financeira consolidada é restrita aos administradores da empresa.
      </div>
    );
  }
  if (projetos === null) return <div className="p-6 text-center text-muted-foreground">Carregando projetos…</div>;
  if (projetos.length === 0) return <div className="p-6 text-center text-muted-foreground">Nenhum projeto salvo ainda.</div>;

  const obterMesAno = (timestamp: number | undefined) => {
    const d = new Date(timestamp || Date.now());
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${meses[d.getMonth()]} de ${d.getFullYear()}`;
  };

  const grupos: Record<string, { nome: string; criadoEm: number; r: ReturnType<typeof resumoFin> }[]> = {};
  projetos.forEach((p) => {
    const mes = obterMesAno(p.criadoEm);
    if (!grupos[mes]) grupos[mes] = [];
    grupos[mes].push({
      nome: p.nome || p.imovel?.denominacao || 'Projeto',
      criadoEm: p.criadoEm || 0,
      r: resumoFin(p.imovel?.financeiro)
    });
  });

  const mesesOrdenados = Object.keys(grupos).sort((a, b) => {
    const timeA = grupos[a][0]?.criadoEm || 0;
    const timeB = grupos[b][0]?.criadoEm || 0;
    return timeB - timeA;
  });

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Visão geral consolidada por mês</h3>
        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">Administrador</span>
      </div>

      {mesesOrdenados.map((mes) => {
        const linhas = grupos[mes];
        const tot = linhas.reduce((s, l) => ({
          cobrado: s.cobrado + l.r.cobrado,
          recebido: s.recebido + l.r.recebido,
          gasto: s.gasto + l.r.gasto,
          aReceber: s.aReceber + l.r.aReceber,
          saldo: s.saldo + l.r.saldo
        }), { cobrado: 0, recebido: 0, gasto: 0, aReceber: 0, saldo: 0 });

        return (
          <div key={mes} className="space-y-2 rounded-lg border border-border bg-background/50 p-3 shadow-sm">
            <div className="flex items-center justify-between border-b pb-1">
              <span className="text-xs font-extrabold text-foreground uppercase tracking-wider">{mes}</span>
              <span className="text-[10px] text-muted-foreground font-semibold">{linhas.length} projeto(s)</span>
            </div>
            <div className="overflow-hidden rounded-md border bg-background">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-left text-muted-foreground">
                  <tr>
                    <th className="p-2">Projeto</th>
                    <th className="p-2 text-right">Cobrado</th>
                    <th className="p-2 text-right">Recebido</th>
                    <th className="p-2 text-right">A receber</th>
                    <th className="p-2 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l, i) => (
                    <tr key={i} className="border-t hover:bg-muted/30">
                      <td className="p-2 font-medium">{l.nome}</td>
                      <td className="p-2 text-right text-muted-foreground">{moedaBR(l.r.cobrado)}</td>
                      <td className="p-2 text-right text-emerald-600 font-semibold">{moedaBR(l.r.recebido)}</td>
                      <td className={`p-2 text-right ${l.r.aReceber > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>{moedaBR(l.r.aReceber)}</td>
                      <td className={`p-2 text-right font-bold ${l.r.saldo >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{moedaBR(l.r.saldo)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t bg-muted/30 font-extrabold text-foreground">
                  <tr>
                    <td className="p-2">Total do Mês</td>
                    <td className="p-2 text-right">{moedaBR(tot.cobrado)}</td>
                    <td className="p-2 text-right text-emerald-600">{moedaBR(tot.recebido)}</td>
                    <td className="p-2 text-right text-amber-600">{moedaBR(tot.aReceber)}</td>
                    <td className={`p-2 text-right font-black ${tot.saldo >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{moedaBR(tot.saldo)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
      })}
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
