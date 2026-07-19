'use client';

import { useState, useEffect } from 'react';
import { Receipt, FileText, Plus, Trash2, Wallet, Building2, TrendingUp, TrendingDown, Clock, BarChart3, CheckCircle2, Zap, FolderOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { escolher } from '@/lib/ui/dialogos';
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
  onAbrirAjustes?: (aba: 'escritorio' | 'pessoal' | 'numeracao' | 'modelos') => void;
  onAbrirConferir?: () => void;
  onAbrirProjeto?: (id: string) => void;
}

const hoje = () => new Date().toISOString().slice(0, 10);

export default function GestaoProjetoModal({ open, onOpenChange, imovel, financeiro, onChange, nomeProjeto, areaHa, perimetro, tecnico, escritorio, dataExtenso, isAdmin = false, onAbrirAjustes, onAbrirConferir, onAbrirProjeto }: Props) {
  const lancamentos = financeiro.lancamentos ?? [];
  const valorCobrado = financeiro.valorCobrado ?? 0;

  const recebido = lancamentos.filter((l) => l.tipo === 'recebimento').reduce((s, l) => s + (l.valor || 0), 0);
  const gasto = lancamentos.filter((l) => l.tipo === 'gasto').reduce((s, l) => s + (l.valor || 0), 0);
  const saldoCaixa = recebido - gasto;
  const aReceber = Math.max(0, valorCobrado - recebido);
  const lucro = valorCobrado - gasto;                             // lucro do serviço quando quitado
  const margem = valorCobrado > 0 ? (lucro / valorCobrado) * 100 : 0;

  // Status de Pagamento do Projeto Atual
  const statusPagamento = valorCobrado > 0
    ? recebido >= valorCobrado
      ? 'pago'
      : recebido > 0
      ? 'parcial'
      : 'pendente'
    : 'pendente';

  const [reciboValor, setReciboValor] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('');
  const [prazoDias, setPrazoDias] = useState('30');
  const [aba, setAba] = useState<'projeto' | 'empresa'>('projeto');
  const [projetos, setProjetos] = useState<Projeto[] | null>(null);
  const [precos, setPrecos] = useState<PrecoServico[]>([]);

  useEffect(() => {
    if (!open) {
      setProjetos(null);
      setAba('projeto');
    } else {
      setPrecos(carregarPrecos());
    }
  }, [open]);

  useEffect(() => {
    if (open && aba === 'empresa' && projetos === null) {
      listarProjetos().then(setProjetos).catch((e) => {
        console.warn('[GestaoProjetoModal] listarProjetos:', e);
        setProjetos([]);
      });
    }
  }, [open, aba, projetos]);

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

  const atualizarFinanceiroQualquerProjeto = async (p: Projeto, patchFin: { valorCobrado?: number; recebido?: number; gasto?: number }) => {
    const finAnt = p.imovel?.financeiro ?? {};
    let novosLancamentos = finAnt.lancamentos ? [...finAnt.lancamentos] : [];

    if (patchFin.recebido !== undefined) {
      novosLancamentos = novosLancamentos.filter((l) => l.tipo !== 'recebimento');
      if (patchFin.recebido > 0) {
        novosLancamentos.push({ id: 'recebido_unico', tipo: 'recebimento', descricao: 'Valor Recebido', valor: patchFin.recebido, data: hoje() });
      }
    }
    if (patchFin.gasto !== undefined) {
      novosLancamentos = novosLancamentos.filter((l) => l.tipo !== 'gasto');
      if (patchFin.gasto > 0) {
        novosLancamentos.push({ id: 'gasto_unico', tipo: 'gasto', descricao: 'Custos com o Serviço', valor: patchFin.gasto, data: hoje() });
      }
    }

    const novoFin: FinanceiroProjeto = {
      ...finAnt,
      ...(patchFin.valorCobrado !== undefined ? { valorCobrado: patchFin.valorCobrado } : {}),
      lancamentos: novosLancamentos,
    };

    const novoProj = {
      ...p,
      imovel: {
        ...p.imovel,
        financeiro: novoFin,
      },
    };

    const { salvarProjeto } = await import('@/lib/store/projects');
    await salvarProjeto(novoProj as any);

    setProjetos((prev) => (prev ? prev.map((pr) => (pr.id === p.id ? (novoProj as any) : pr)) : []));
  };

  async function validarDadosFinanceiro(tipoDoc: 'recibo' | 'contrato' | 'proposta' | 'declPosse' | 'declSobreposicao'): Promise<'ok' | 'gerar' | 'omitir' | 'cadastro' | 'voltar'> {
    let msgFalta = '';
    let destinoCadastro: 'escritorio' | 'pessoal' | 'conferir' = 'escritorio';

    if (['recibo', 'contrato', 'proposta'].includes(tipoDoc)) {
      if (!escritorio.nome?.trim()) {
        msgFalta = "O nome do escritório/empresa está em branco nas configurações.";
        destinoCadastro = 'escritorio';
      } else if (!escritorio.cnpj?.trim()) {
        msgFalta = "O CNPJ/CPF do escritório está em branco nas configurações.";
        destinoCadastro = 'escritorio';
      } else if (!escritorio.cidade?.trim()) {
        msgFalta = "A cidade do escritório está em branco nas configurações.";
        destinoCadastro = 'escritorio';
      }
    }

    if (!msgFalta) {
      if (!tecnico.nome?.trim()) {
        msgFalta = "O nome do responsável técnico está em branco.";
        destinoCadastro = 'pessoal';
      } else if (!tecnico.cft?.trim()) {
        msgFalta = "O registro profissional (CFT/CREA) do técnico está em branco.";
        destinoCadastro = 'pessoal';
      } else if (tipoDoc === 'declSobreposicao' && !tecnico.credenciamentoIncra?.trim()) {
        msgFalta = "O código de credenciamento do INCRA do técnico está em branco.";
        destinoCadastro = 'pessoal';
      }
    }

    if (!msgFalta) {
      if (!imovel.denominacao?.trim()) {
        msgFalta = "A denominação do imóvel está em branco nos dados do imóvel.";
        destinoCadastro = 'conferir';
      } else if (!imovel.proprietario?.trim()) {
        msgFalta = "O proprietário do imóvel está em branco nos dados do imóvel.";
        destinoCadastro = 'conferir';
      } else if (!imovel.cpfProprietario?.trim()) {
        msgFalta = "O CPF/CNPJ do proprietário está em branco nos dados do imóvel.";
        destinoCadastro = 'conferir';
      } else if (['contrato', 'proposta'].includes(tipoDoc) && imovel.cns !== 'não informar' && !imovel.matricula?.trim()) {
        msgFalta = "A matrícula do imóvel está em branco nos dados do imóvel.";
        destinoCadastro = 'conferir';
      }
    }

    if (!msgFalta) return 'ok';

    const opcao = await escolher({
      titulo: 'Campos Não Preenchidos no Cadastro',
      mensagem: `${msgFalta}\n\nPosso marcar os campos faltantes com "DADO AUSENTE" em vermelho, ou prefere omiti-los e ajustar o texto de forma fluida sem deixar lacunas?`,
      opcoes: [
        { chave: 'gerar', label: 'Sim, marcar com DADO AUSENTE (vermelho)', variant: 'destructive' },
        { chave: 'omitir', label: 'Não, omitir dados e ajustar o texto', variant: 'default' },
        { chave: 'cadastro', label: 'Ir para o cadastro completar', variant: 'outline' },
      ],
      cancelLabel: 'Voltar e ajustar'
    });

    if (opcao === 'cadastro') return 'cadastro';
    if (opcao === 'gerar') return 'gerar';
    if (opcao === 'omitir') return 'omitir';
    return 'voltar';
  }

  const baseArgs = { imovel, escritorio, tecnico, dataExtenso, areaHa, perimetro };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* TAMANHO FIXO Garantido (h-[680px]) para não mudar de tamanho ao trocar de aba */}
      <DialogContent className="w-[95vw] max-w-[1150px] h-[680px] max-h-[95vh] flex flex-col p-4 overflow-hidden rounded-xl border shadow-2xl">
        <DialogHeader className="border-b pb-2.5 shrink-0 flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2 text-base font-extrabold uppercase tracking-wide">
            <Wallet className="size-5 text-emerald-500" />
            Gestão do Projeto &amp; Financeiro
          </DialogTitle>
        </DialogHeader>

        {/* NAVEGAÇÃO DE ABAS */}
        <div className="flex gap-2 border-b py-2 shrink-0">
          <button
            onClick={() => setAba('projeto')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider transition-colors ${aba === 'projeto' ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-muted/40 text-muted-foreground hover:bg-muted'}`}
          >
            <BarChart3 className="size-3.5" /> 1. Este Projeto &amp; Emissão de Peças
          </button>
          <button
            onClick={() => setAba('empresa')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider transition-colors ${aba === 'empresa' ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-muted/40 text-muted-foreground hover:bg-muted'}`}
          >
            <Building2 className="size-3.5" /> 2. Todos os Projetos &amp; Financeiro Geral
          </button>
        </div>

        {/* CONTEÚDO SCROLLÁVEL INTERNO COM ALTURA FIXA */}
        <div className="flex-1 overflow-y-auto pr-1 py-3 text-xs space-y-4">
          {aba === 'projeto' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              
              {/* COLUNA DA ESQUERDA: DADOS DO PROJETO & FINANCEIRO */}
              <div className="space-y-4">
                
                {/* 1. DADOS RESUMIDOS DO PROJETO */}
                <section className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Resumo do Projeto Atual</h3>
                    {statusPagamento === 'pago' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase">
                        <CheckCircle2 className="size-3 text-emerald-500" /> Pago / Quitado
                      </span>
                    ) : statusPagamento === 'parcial' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-black text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase">
                        <Zap className="size-3 text-amber-500" /> Pagamento Parcial
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[9px] font-black text-red-600 dark:text-red-400 border border-red-500/20 uppercase">
                        <Clock className="size-3 text-red-500" /> Pagamento Pendente
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-lg border bg-muted/20 p-2.5">
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

                {/* 2. VALORES E LANÇAMENTO FINANCEIRO DO PROJETO */}
                <section className="space-y-2.5 rounded-xl border bg-card p-3 shadow-xs">
                  <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Wallet className="size-3.5 text-emerald-500" /> Lançamento Financeiro do Serviço
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold">Valor Cobrado do Cliente (R$)</Label>
                      <Input
                        type="number"
                        className="h-8 font-bold bg-background text-foreground text-xs"
                        value={financeiro.valorCobrado ?? ''}
                        placeholder="0,00"
                        onChange={(e) => patch({ valorCobrado: e.target.value === '' ? undefined : Number(e.target.value) })}
                      />
                    </div>
                    {precos.some((p) => p.valor > 0) && (
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold">Tabela de Preços</Label>
                        <select
                          className="h-8 w-full rounded-md border bg-background px-2 text-xs font-medium text-foreground"
                          value=""
                          onChange={(e) => {
                            const p = precos.find((x) => x.id === e.target.value);
                            if (p) patch({ valorCobrado: p.valor });
                          }}
                        >
                          <option value="">Puxar da Tabela…</option>
                          {precos.filter((p) => p.valor > 0).map((p) => (
                            <option key={p.id} value={p.id}>{p.servico} — {moedaBR(p.valor)}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/20 p-2 border">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Valor Recebido (R$)</Label>
                      <Input
                        type="number"
                        placeholder="0,00"
                        value={recebido || ''}
                        onChange={(e) => setRecebidoTotal(e.target.value === '' ? 0 : Number(e.target.value))}
                        className="h-8 bg-background text-emerald-600 font-bold text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-red-600 dark:text-red-400">Custo com o Serviço (R$)</Label>
                      <Input
                        type="number"
                        placeholder="0,00"
                        value={gasto || ''}
                        onChange={(e) => setCustoTotal(e.target.value === '' ? 0 : Number(e.target.value))}
                        className="h-8 bg-background text-red-600 font-bold text-xs"
                      />
                    </div>
                  </div>

                  {/* Cartões de Indicadores */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <Cartao titulo="Recebido" valor={recebido} cor="text-emerald-600 dark:text-emerald-400" icone={<TrendingUp className="size-3.5" />} />
                    <Cartao titulo="Custos" valor={gasto} cor="text-red-600 dark:text-red-400" icone={<TrendingDown className="size-3.5" />} />
                    <Cartao titulo="A Receber" valor={aReceber} cor={aReceber > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'} icone={<Clock className="size-3.5" />} />
                  </div>

                  <div className="space-y-1 pt-1">
                    <Label className="text-[10px] font-bold text-muted-foreground">Observações Financeiras</Label>
                    <textarea
                      className="w-full rounded-md border bg-background p-2 text-xs font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                      rows={2}
                      value={financeiro.observacoes ?? ''}
                      onChange={(e) => patch({ observacoes: e.target.value })}
                      placeholder="Histórico de pagamentos, parcelas, dados bancários..."
                    />
                  </div>
                </section>
              </div>

              {/* COLUNA DA DIREITA: EMISSÃO DE PEÇAS & DOCUMENTOS */}
              <div className="space-y-4">
                <section className="space-y-3 rounded-xl border bg-card p-3 shadow-xs">
                  <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <FileText className="size-3.5 text-blue-500" /> Emissão de Documentos e Recibos
                  </h3>

                  {/* BLOCO 1: RECIBO */}
                  <div className="rounded-lg border p-3 space-y-2 bg-muted/10">
                    <div className="flex items-start gap-2.5">
                      <Receipt className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-xs text-foreground">Recibo de Quitação (PDF)</div>
                        <div className="text-[10px] text-muted-foreground">Gera comprovante oficial com logomarca e dados do técnico</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder={`Valor (padrão: ${moedaBR(valorCobrado || recebido || 0)})`}
                        value={reciboValor}
                        onChange={(e) => setReciboValor(e.target.value)}
                        className="h-8 text-xs font-medium bg-background flex-1"
                      />
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs font-bold shrink-0 gap-1"
                        onClick={async () => {
                          const status = await validarDadosFinanceiro('recibo');
                          if (status === 'voltar') return;
                          if (status === 'cadastro') { onAbrirAjustes?.('escritorio'); return; }
                          const modoTratamentoAusente = status === 'gerar' ? 'dado_ausente' : status === 'omitir' ? 'omitir' : undefined;
                          const permitirIncompleto = status === 'gerar';
                          gerarReciboPdf({ ...baseArgs, permitirIncompleto, modoTratamentoAusente, valor: Number(reciboValor.replace(',', '.')) || valorCobrado || recebido, numero: consumirNumeroRecibo(new Date().getFullYear()) });
                        }}
                      >
                        <Receipt className="size-3.5" /> Emitir Recibo
                      </Button>
                    </div>
                  </div>

                  {/* BLOCO 2: CONTRATO & PROPOSTA */}
                  <div className="rounded-lg border p-3 space-y-2.5 bg-muted/10">
                    <div className="flex items-start gap-2.5">
                      <FileText className="size-4 text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-xs text-foreground">Contrato e Proposta Comercial</div>
                        <div className="text-[10px] text-muted-foreground">Contrato formal de prestação de serviços agrimensórios</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-0.5">
                        <Label className="text-[9px] uppercase font-bold text-muted-foreground">Forma de Pagamento</Label>
                        <Input
                          placeholder="ex.: 50% entrada, 50% entrega"
                          value={formaPagamento}
                          onChange={(e) => setFormaPagamento(e.target.value)}
                          className="h-7 text-xs bg-background"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-[9px] uppercase font-bold text-muted-foreground">Prazo (Dias)</Label>
                        <Input
                          type="number"
                          placeholder="30"
                          value={prazoDias}
                          onChange={(e) => setPrazoDias(e.target.value)}
                          className="h-7 text-xs bg-background"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs font-bold gap-1"
                        onClick={async () => {
                          const status = await validarDadosFinanceiro('contrato');
                          if (status === 'voltar') return;
                          if (status === 'cadastro') { onAbrirAjustes?.('escritorio'); return; }
                          const modoTratamentoAusente = status === 'gerar' ? 'dado_ausente' : status === 'omitir' ? 'omitir' : undefined;
                          const permitirIncompleto = status === 'gerar';
                          gerarContratoPdf({ ...baseArgs, permitirIncompleto, modoTratamentoAusente, valor: valorCobrado, formaPagamento: formaPagamento || undefined, prazoDias: Number(prazoDias) || undefined });
                        }}
                      >
                        <FileText className="size-3.5" /> Contrato (PDF)
                      </Button>
                      <Button
                        className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs font-bold gap-1"
                        onClick={async () => {
                          const status = await validarDadosFinanceiro('proposta');
                          if (status === 'voltar') return;
                          if (status === 'cadastro') { onAbrirAjustes?.('escritorio'); return; }
                          const modoTratamentoAusente = status === 'gerar' ? 'dado_ausente' : status === 'omitir' ? 'omitir' : undefined;
                          const permitirIncompleto = status === 'gerar';
                          gerarPropostaPdf({ ...baseArgs, permitirIncompleto, modoTratamentoAusente, valor: valorCobrado, formaPagamento: formaPagamento || undefined, prazoDias: Number(prazoDias) || undefined });
                        }}
                      >
                        <FileText className="size-3.5" /> Proposta (PDF)
                      </Button>
                    </div>
                  </div>

                  {/* BLOCO 3: DECLARAÇÕES AVULSAS */}
                  <div className="rounded-lg border p-3 space-y-2 bg-muted/10">
                    <div className="font-bold text-xs text-foreground">Declarações Cartorárias (DOCX)</div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="h-7 text-xs flex-1 gap-1 border-border hover:bg-muted" onClick={async () => {
                        const status = await validarDadosFinanceiro('declPosse');
                        if (status === 'voltar') return;
                        if (status === 'cadastro') { onAbrirConferir?.(); return; }
                        const modoTratamentoAusente = status === 'gerar' ? 'dado_ausente' : status === 'omitir' ? 'omitir' : undefined;
                        const permitirIncompleto = status === 'gerar';
                        const b = await gerarDeclaracaoPosseDocx({ imovel, tecnico, dataExtenso, permitirIncompleto, modoTratamentoAusente });
                        saveAs(b, `Declaracao_Posse_${imovel.proprietario || 'Imovel'}.docx`);
                      }}>
                        <FileText className="size-3.5 text-emerald-500" /> Posse (DOCX)
                      </Button>
                      <Button variant="outline" className="h-7 text-xs flex-1 gap-1 border-border hover:bg-muted" onClick={async () => {
                        const status = await validarDadosFinanceiro('declSobreposicao');
                        if (status === 'voltar') return;
                        if (status === 'cadastro') { onAbrirAjustes?.('pessoal'); return; }
                        const modoTratamentoAusente = status === 'gerar' ? 'dado_ausente' : status === 'omitir' ? 'omitir' : undefined;
                        const permitirIncompleto = status === 'gerar';
                        const b = await gerarDeclaracaoSobreposicaoDocx({ imovel, tecnico, dataExtenso, permitirIncompleto, modoTratamentoAusente });
                        saveAs(b, `Declaracao_Inexistencia_Sobreposicao_${imovel.denominacao || 'Imovel'}.docx`);
                      }}>
                        <FileText className="size-3.5 text-blue-500" /> Sobreposição (DOCX)
                      </Button>
                    </div>
                  </div>

                </section>
              </div>

            </div>
          )}

          {/* ABA 2: LISTA DE TODOS OS PROJETOS DA EMPRESA COM EDIÇÃO DE CUSTO, RECEBIDO E STATUS DE PAGAMENTO */}
          {aba === 'empresa' && (
            <EmpresaResumo
              projetos={projetos}
              isAdmin={isAdmin}
              onAtualizarProjeto={atualizarFinanceiroQualquerProjeto}
              onAbrirProjeto={onAbrirProjeto}
              onOpenChange={onOpenChange}
            />
          )}
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
  return { cobrado, recebido, gasto, saldo: recebido - gasto, aReceber: Math.max(0, cobrado - recebido) };
}

function EmpresaResumo({
  projetos,
  isAdmin,
  onAtualizarProjeto,
  onAbrirProjeto,
  onOpenChange,
}: {
  projetos: Projeto[] | null;
  isAdmin: boolean;
  onAtualizarProjeto: (p: Projeto, patch: { valorCobrado?: number; recebido?: number; gasto?: number }) => Promise<void>;
  onAbrirProjeto?: (id: string) => void;
  onOpenChange: (o: boolean) => void;
}) {
  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-zinc-500/20 bg-zinc-500/5 p-6 text-center text-muted-foreground">
        A visão geral financeira consolidada é restrita aos administradores da empresa.
      </div>
    );
  }
  if (projetos === null) return <div className="p-6 text-center text-muted-foreground">Carregando projetos…</div>;
  if (projetos.length === 0) return <div className="p-6 text-center text-muted-foreground">Nenhum projeto salvo ainda.</div>;

  // Calcular estatísticas globais consolidadas
  const totalGlobal = projetos.reduce((s, p) => {
    const r = resumoFin(p.imovel?.financeiro);
    return {
      cobrado: s.cobrado + r.cobrado,
      recebido: s.recebido + r.recebido,
      gasto: s.gasto + r.gasto,
      aReceber: s.aReceber + r.aReceber,
      saldo: s.saldo + r.saldo
    };
  }, { cobrado: 0, recebido: 0, gasto: 0, aReceber: 0, saldo: 0 });

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Visão Geral &amp; Lançamento de Custos / Pagamentos por Projeto</h3>
        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase">Administração da Empresa</span>
      </div>

      {/* CARTÕES DE RESUMO GLOBAL */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-muted/10 p-2.5 rounded-xl border">
        <Cartao titulo="Total Cobrado" valor={totalGlobal.cobrado} cor="text-zinc-700 dark:text-zinc-300" icone={<BarChart3 className="size-3.5" />} />
        <Cartao titulo="Total Recebido" valor={totalGlobal.recebido} cor="text-emerald-600 dark:text-emerald-400" icone={<TrendingUp className="size-3.5" />} />
        <Cartao titulo="Total Gastos/Custos" valor={totalGlobal.gasto} cor="text-red-600 dark:text-red-400" icone={<TrendingDown className="size-3.5" />} />
        <Cartao titulo="Saldo em Caixa" valor={totalGlobal.saldo} cor={totalGlobal.saldo >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'} icone={<Wallet className="size-3.5" />} />
      </div>

      {/* TABELA COMPLETA DE PROJETOS E EDIÇÃO FINANCEIRA EM TEMPO REAL */}
      <div className="rounded-xl border bg-background overflow-hidden shadow-xs">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 text-left text-muted-foreground font-extrabold uppercase text-[9px] border-b">
            <tr>
              <th className="p-2.5">Projeto / Proprietário</th>
              <th className="p-2 text-center w-28">Valor Cobrado</th>
              <th className="p-2 text-center w-28">Custos do Serviço</th>
              <th className="p-2 text-center w-28">Valor Recebido</th>
              <th className="p-2 text-right w-24">A Receber</th>
              <th className="p-2 text-center w-28">Status</th>
              <th className="p-2 text-center w-20">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {projetos.map((p) => {
              const r = resumoFin(p.imovel?.financeiro);
              const st = r.cobrado > 0
                ? r.recebido >= r.cobrado
                  ? 'pago'
                  : r.recebido > 0
                  ? 'parcial'
                  : 'pendente'
                : 'pendente';

              return (
                <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                  <td className="p-2.5 min-w-0">
                    <div className="font-bold text-foreground truncate">{p.nome || p.imovel?.denominacao || 'Projeto sem nome'}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{p.imovel?.proprietario || 'Proprietário não informado'} • {p.imovel?.municipio || 'UF'}</div>
                  </td>
                  <td className="p-1.5 text-center">
                    <input
                      type="number"
                      defaultValue={r.cobrado || ''}
                      placeholder="0,00"
                      onBlur={(e) => {
                        const val = e.target.value === '' ? 0 : Number(e.target.value);
                        if (val !== r.cobrado) onAtualizarProjeto(p, { valorCobrado: val });
                      }}
                      className="h-7 w-24 rounded border bg-background text-center font-bold text-xs focus:ring-1 focus:ring-primary"
                    />
                  </td>
                  <td className="p-1.5 text-center">
                    <input
                      type="number"
                      defaultValue={r.gasto || ''}
                      placeholder="0,00"
                      onBlur={(e) => {
                        const val = e.target.value === '' ? 0 : Number(e.target.value);
                        if (val !== r.gasto) onAtualizarProjeto(p, { gasto: val });
                      }}
                      className="h-7 w-24 rounded border bg-background text-center font-bold text-red-600 text-xs focus:ring-1 focus:ring-primary"
                    />
                  </td>
                  <td className="p-1.5 text-center">
                    <input
                      type="number"
                      defaultValue={r.recebido || ''}
                      placeholder="0,00"
                      onBlur={(e) => {
                        const val = e.target.value === '' ? 0 : Number(e.target.value);
                        if (val !== r.recebido) onAtualizarProjeto(p, { recebido: val });
                      }}
                      className="h-7 w-24 rounded border bg-background text-center font-bold text-emerald-600 text-xs focus:ring-1 focus:ring-primary"
                    />
                  </td>
                  <td className={`p-2.5 text-right font-mono font-bold ${r.aReceber > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                    {moedaBR(r.aReceber)}
                  </td>
                  <td className="p-2 text-center">
                    {st === 'pago' ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-[9px] font-black text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 uppercase">
                        <CheckCircle2 className="size-3 text-emerald-500" /> Pago
                      </span>
                    ) : st === 'parcial' ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-1 text-[9px] font-black text-amber-600 dark:text-amber-400 border border-amber-500/30 uppercase">
                        <Zap className="size-3 text-amber-500" /> Parcial
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-1 text-[9px] font-black text-red-600 dark:text-red-400 border border-red-500/30 uppercase">
                        <Clock className="size-3 text-red-500" /> Pendente
                      </span>
                    )}
                  </td>
                  <td className="p-2 text-center">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px] gap-1 font-bold border-primary/30 text-primary hover:bg-primary/10"
                      onClick={() => {
                        if (onAbrirProjeto) {
                          onOpenChange(false);
                          onAbrirProjeto(p.id);
                        }
                      }}
                      title="Abrir este projeto no editor"
                    >
                      <FolderOpen className="size-3" /> Abrir
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Info({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] uppercase tracking-wider font-extrabold text-muted-foreground">{rotulo}</div>
      <div className="truncate font-semibold text-foreground">{valor}</div>
    </div>
  );
}

function Cartao({ titulo, valor, cor, sub, icone }: { titulo: string; valor: number; cor: string; sub?: string; icone?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border bg-background p-2.5 shadow-2xs">
      {icone && <div className={`p-1.5 rounded-md bg-muted/40 ${cor}`}>{icone}</div>}
      <div className="min-w-0">
        <div className="text-[8px] uppercase tracking-wider text-muted-foreground font-black leading-none mb-1">{titulo}</div>
        <div className={`text-xs font-black tracking-tight leading-none ${cor}`}>{moedaBR(valor)}</div>
        {sub && <div className="text-[8px] text-muted-foreground mt-1 truncate leading-none">{sub}</div>}
      </div>
    </div>
  );
}
