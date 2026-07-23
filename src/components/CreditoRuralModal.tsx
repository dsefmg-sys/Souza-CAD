import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sprout, Download, Plus, Trash2 } from 'lucide-react';
import { ImovelData, EscritorioData, TecnicoData } from '@/lib/topo/types';
import { confirmar, avisar } from '@/lib/ui/dialogos';
import { gerarPdfLaudoAptidao, gerarPdfCronogramaFinanceiro, type ItemFinanciado } from '@/lib/export/creditoRural';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  imovel: ImovelData;
  onChangeImovel: (i: ImovelData) => void;
  tecnico: TecnicoData;
  esc: EscritorioData | null;
  onSalvarProjeto: () => void;
}

interface EtapaCronograma {
  id: string;
  etapa: string;
  mes: number;
  valor: number;
}

export default function CreditoRuralModal({
  open,
  onOpenChange,
  imovel,
  onChangeImovel,
  tecnico,
  esc,
  onSalvarProjeto
}: Props) {
  const [activeTab, setActiveTab] = useState<'proposta' | 'bens' | 'aptidao' | 'cronograma'>('proposta');
  const [msg, setMsg] = useState('');

  // Proposta e Instituição
  const [linhaCredito, setLinhaCredito] = useState('');
  const [agenteFinanceiro, setAgenteFinanceiro] = useState('');
  const [parceiroCorrespondente, setParceiroCorrespondente] = useState('');
  const [conselhoRt, setConselhoRt] = useState('');
  const [tituloProfissionalRt, setTituloProfissionalRt] = useState('');
  const [garantiaProposta, setGarantiaProposta] = useState('');
  const [taxaJurosAnual, setTaxaJurosAnual] = useState<number | ''>(7.5);
  const [carenciaMeses, setCarenciaMeses] = useState<number | ''>(12);
  const [prazoAnos, setPrazoAnos] = useState<number | ''>(5);

  // Solos e Aptidão
  const [aptidaoSolo, setAptidaoSolo] = useState('');
  const [culturaPrincipal, setCulturaPrincipal] = useState('');
  const [capacidadePastagem, setCapacidadePastagem] = useState('');
  const [finalidadeCredito, setFinalidadeCredito] = useState('');

  // Itens Financiados & Cronograma
  const [itensFinanciados, setItensFinanciados] = useState<ItemFinanciado[]>([]);
  const [cronogramaEtapas, setCronogramaEtapas] = useState<EtapaCronograma[]>([]);

  useEffect(() => {
    if (open && imovel.dadosCredito) {
      const d = imovel.dadosCredito;
      setLinhaCredito(d.linhaCredito || 'PRONAMP Investimento');
      setAgenteFinanceiro(d.agenteFinanceiro || 'Banco do Brasil');
      setParceiroCorrespondente(d.parceiroCorrespondente || esc?.nome || '');
      setConselhoRt(d.conselhoRt || tecnico.conselho || 'CFT');
      setTituloProfissionalRt(d.tituloProfissionalRt || 'Técnico em Agropecuária');
      setGarantiaProposta(d.garantiaProposta || 'Penhor Agrícola / Alienação Fiduciária');
      setTaxaJurosAnual(d.taxaJurosAnual !== undefined ? d.taxaJurosAnual : 7.5);
      setCarenciaMeses(d.carenciaMeses !== undefined ? d.carenciaMeses : 12);
      setPrazoAnos(d.prazoAnos !== undefined ? d.prazoAnos : 5);

      setAptidaoSolo(d.aptidaoSolo || '');
      setCulturaPrincipal(d.culturaPrincipal || '');
      setCapacidadePastagem(d.capacidadePastagem || '');
      setFinalidadeCredito(d.finalidadeCredito || '');
      setItensFinanciados(d.itensFinanciados || []);
      setCronogramaEtapas(d.cronogramaEtapas || []);
    } else if (open) {
      setLinhaCredito('PRONAMP Investimento');
      setAgenteFinanceiro('Banco do Brasil');
      setParceiroCorrespondente(esc?.nome || '');
      setConselhoRt(tecnico.conselho || 'CFT');
      setTituloProfissionalRt('Técnico em Agropecuária');
      setGarantiaProposta('Penhor Agrícola / Alienação Fiduciária');
      setTaxaJurosAnual(7.5);
      setCarenciaMeses(12);
      setPrazoAnos(5);

      setAptidaoSolo('');
      setCulturaPrincipal('');
      setCapacidadePastagem('');
      setFinalidadeCredito('');
      setItensFinanciados([]);
      setCronogramaEtapas([]);
    }
  }, [open, imovel, esc, tecnico]);

  const obterDadosAtuais = () => ({
    linhaCredito,
    agenteFinanceiro,
    parceiroCorrespondente,
    conselhoRt,
    tituloProfissionalRt,
    garantiaProposta,
    taxaJurosAnual: Number(taxaJurosAnual) || 0,
    carenciaMeses: Number(carenciaMeses) || 0,
    prazoAnos: Number(prazoAnos) || 0,
    aptidaoSolo,
    culturaPrincipal,
    capacidadePastagem,
    finalidadeCredito,
    itensFinanciados,
    cronogramaEtapas
  });

  const salvarLocal = () => {
    onChangeImovel({
      ...imovel,
      dadosCredito: obterDadosAtuais()
    });
    setMsg('Dados de Crédito Rural salvos!');
    setTimeout(() => setMsg(''), 3000);
  };

  const fecharComVerificacao = async () => {
    onOpenChange(false);
  };

  // Funções de Itens a Financiar
  const adicionarItem = () => {
    const novo: ItemFinanciado = {
      id: Math.random().toString(36).substring(2, 9),
      descricao: '',
      categoria: 'Maquinário',
      quantidade: 1,
      valorUnitario: 0,
      valorTotal: 0
    };
    setItensFinanciados([...itensFinanciados, novo]);
  };

  const removerItem = (id: string) => {
    setItensFinanciados(itensFinanciados.filter((i) => i.id !== id));
  };

  const atualizarItem = (id: string, campo: keyof ItemFinanciado, valor: any) => {
    setItensFinanciados(
      itensFinanciados.map((i) => {
        if (i.id !== id) return i;
        const atualizado = { ...i, [campo]: valor };
        if (campo === 'quantidade' || campo === 'valorUnitario') {
          atualizado.valorTotal = (Number(atualizado.quantidade) || 0) * (Number(atualizado.valorUnitario) || 0);
        }
        return atualizado;
      })
    );
  };

  // Funções do Cronograma
  const adicionarEtapa = () => {
    const nova: EtapaCronograma = {
      id: Math.random().toString(36).substring(2, 9),
      etapa: '',
      mes: cronogramaEtapas.length + 1,
      valor: 0
    };
    setCronogramaEtapas([...cronogramaEtapas, nova]);
  };

  const removerEtapa = (id: string) => {
    setCronogramaEtapas(cronogramaEtapas.filter((e) => e.id !== id));
  };

  const atualizarEtapa = (id: string, campo: keyof EtapaCronograma, valor: any) => {
    setCronogramaEtapas(
      cronogramaEtapas.map((e) => (e.id === id ? { ...e, [campo]: valor } : e))
    );
  };

  // Downloads PDF
  const baixarLaudoPdf = () => {
    const doc = gerarPdfLaudoAptidao(imovel, esc, tecnico, obterDadosAtuais());
    doc.save(`${imovel.denominacao || 'imovel'}_laudo_aptidao_agricola.pdf`);
  };

  const baixarCronogramaPdf = () => {
    const doc = gerarPdfCronogramaFinanceiro(imovel, esc, tecnico, obterDadosAtuais());
    doc.save(`${imovel.denominacao || 'imovel'}_cronograma_credito.pdf`);
  };

  const baixarCronogramaDocx = async () => {
    const { gerarDocxCronogramaFinanceiro } = await import('@/lib/export/creditoRural');
    const { saveAs } = await import('file-saver');
    const blob = await gerarDocxCronogramaFinanceiro(imovel, esc, tecnico, obterDadosAtuais());
    saveAs(blob, `${imovel.denominacao || 'imovel'}_cronograma_credito.docx`);
  };

  const baixarLaudoDocx = async () => {
    const { gerarDocxLaudoAptidao } = await import('@/lib/export/creditoRural');
    const { saveAs } = await import('file-saver');
    const blob = await gerarDocxLaudoAptidao(imovel, esc, tecnico, obterDadosAtuais());
    saveAs(blob, `${imovel.denominacao || 'imovel'}_laudo_aptidao_agricola.docx`);
  };

  const baixarProjetoDocx = async () => {
    const { gerarDocxProjetoCreditoRural } = await import('@/lib/export/creditoRural');
    const { saveAs } = await import('file-saver');
    const blob = await gerarDocxProjetoCreditoRural(imovel, esc, tecnico, obterDadosAtuais());
    saveAs(blob, `${imovel.denominacao || 'imovel'}_projeto_tecnico_credito_rural.docx`);
  };

  const totalBens = itensFinanciados.reduce((acc, curr) => acc + (Number(curr.valorTotal) || 0), 0);
  const totalEtapas = cronogramaEtapas.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) fecharComVerificacao(); else onOpenChange(val); }}>
      <DialogContent className="w-[96vw] sm:w-[92vw] max-w-[850px] max-h-[92vh] flex flex-col p-4 sm:p-6 overflow-hidden shadow-2xl" onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="shrink-0 flex flex-row items-center justify-between border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-base font-extrabold uppercase tracking-wide text-foreground">
            <Sprout className="size-5 text-emerald-500 shrink-0" /> Módulo de Crédito Rural &amp; Agropecuário
          </DialogTitle>
          <div className="flex items-center gap-2">
            {msg && <span className="text-xs font-bold text-emerald-500 animate-pulse">{msg}</span>}
            <Button size="sm" variant="outline" className="text-xs font-bold" onClick={salvarLocal}>
              Salvar Alterações
            </Button>
          </div>
        </DialogHeader>

        {/* Tab Buttons */}
        <div className="flex border-b text-xs font-bold shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('proposta')}
            className={`py-2 px-3.5 transition-all whitespace-nowrap ${activeTab === 'proposta' ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-muted-foreground'}`}
          >
            1. Proposta &amp; Instituição
          </button>
          <button
            onClick={() => setActiveTab('bens')}
            className={`py-2 px-3.5 transition-all whitespace-nowrap ${activeTab === 'bens' ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-muted-foreground'}`}
          >
            2. Bens &amp; Orçamento (R$ {totalBens.toLocaleString('pt-BR', { minimumFractionDigits: 0 })})
          </button>
          <button
            onClick={() => setActiveTab('aptidao')}
            className={`py-2 px-3.5 transition-all whitespace-nowrap ${activeTab === 'aptidao' ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-muted-foreground'}`}
          >
            3. Aptidão &amp; Solos
          </button>
          <button
            onClick={() => setActiveTab('cronograma')}
            className={`py-2 px-3.5 transition-all whitespace-nowrap ${activeTab === 'cronograma' ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-muted-foreground'}`}
          >
            4. Cronograma Financeiro
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-3 text-xs sm:text-sm">
          {/* ABA 1: PROPOSTA & INSTITUIÇÃO */}
          {activeTab === 'proposta' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Linha de Crédito / Programa</Label>
                  <Input
                    placeholder="Ex: PRONAMP Investimento, PRONAF Custeio, ABC+, Moderfrota"
                    value={linhaCredito}
                    onChange={(e) => setLinhaCredito(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Agente Financeiro / Banco</Label>
                  <Input
                    placeholder="Ex: Banco do Brasil, Sicoob, Sicredi, Caixa, BNB, BASA"
                    value={agenteFinanceiro}
                    onChange={(e) => setAgenteFinanceiro(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Parceiro / Correspondente Bancário</Label>
                  <Input
                    placeholder="Ex: AgroConsult Consultoria Agrícola Ltda"
                    value={parceiroCorrespondente}
                    onChange={(e) => setParceiroCorrespondente(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Garantia Oferecida</Label>
                  <Input
                    placeholder="Ex: Penhor Agrícola, Hipoteca do Imóvel, Alienação Fiduciária"
                    value={garantiaProposta}
                    onChange={(e) => setGarantiaProposta(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Habilitação do RT / Conselho</Label>
                  <Input
                    placeholder="Ex: CFTA / CFT / CREA / CRMV"
                    value={conselhoRt}
                    onChange={(e) => setConselhoRt(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-bold">Título Profissional do Responsável Técnico</Label>
                  <Input
                    placeholder="Ex: Técnico em Agropecuária / Engenheiro Agrônomo / Zootecnista"
                    value={tituloProfissionalRt}
                    onChange={(e) => setTituloProfissionalRt(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Taxa de Juros (% a.a.)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="7.5"
                    value={taxaJurosAnual}
                    onChange={(e) => setTaxaJurosAnual(e.target.value !== '' ? Number(e.target.value) : '')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Carência (meses)</Label>
                  <Input
                    type="number"
                    placeholder="12"
                    value={carenciaMeses}
                    onChange={(e) => setCarenciaMeses(e.target.value !== '' ? Number(e.target.value) : '')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Prazo Total (anos)</Label>
                  <Input
                    type="number"
                    placeholder="5"
                    value={prazoAnos}
                    onChange={(e) => setPrazoAnos(e.target.value !== '' ? Number(e.target.value) : '')}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: BENS & ORÇAMENTO */}
          {activeTab === 'bens' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Orçamento de Bens &amp; Investimentos a Financiar</h4>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-[11px] font-bold py-1 h-7" onClick={adicionarItem}>
                  <Plus className="size-3.5" /> Adicionar Item
                </Button>
              </div>

              {itensFinanciados.length === 0 ? (
                <div className="text-center py-6 text-zinc-550 border border-dashed rounded-lg text-xs">
                  Nenhum bem ou insumo adicionado ao orçamento. Clique em "Adicionar Item" para discriminar trator, insumos ou benfeitorias.
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {itensFinanciados.map((it) => (
                    <div key={it.id} className="flex gap-2 items-center bg-muted/10 border p-2 rounded-lg text-xs">
                      <div className="w-28 shrink-0">
                        <select
                          value={it.categoria}
                          onChange={(e) => atualizarItem(it.id, 'categoria', e.target.value)}
                          className="w-full h-8 rounded border bg-background px-1.5 text-[11px] font-semibold"
                        >
                          <option value="Maquinário">Maquinário</option>
                          <option value="Insumos">Insumos</option>
                          <option value="Rebanho">Rebanho</option>
                          <option value="Benfeitoria">Benfeitoria</option>
                          <option value="Irrigação">Irrigação</option>
                          <option value="Energia Solar">Energia Solar</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <Input
                          placeholder="Descrição do item (ex: Trator 85cv 4x4 zero km)"
                          value={it.descricao}
                          onChange={(e) => atualizarItem(it.id, 'descricao', e.target.value)}
                          className="h-8 text-xs font-semibold"
                        />
                      </div>
                      <div className="w-16">
                        <Input
                          type="number"
                          placeholder="Qtd"
                          value={it.quantidade}
                          onChange={(e) => atualizarItem(it.id, 'quantidade', Number(e.target.value))}
                          className="h-8 text-xs text-center"
                        />
                      </div>
                      <div className="w-24">
                        <Input
                          type="number"
                          placeholder="Val. Unit"
                          value={it.valorUnitario || ''}
                          onChange={(e) => atualizarItem(it.id, 'valorUnitario', Number(e.target.value))}
                          className="h-8 text-xs text-right font-mono"
                        />
                      </div>
                      <div className="w-28 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        R$ {(it.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removerItem(it.id)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-md shrink-0"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t pt-3 flex justify-between items-center text-xs sm:text-sm font-bold bg-muted/20 p-2.5 rounded-lg">
                <span className="text-muted-foreground">Orçamento Total dos Bens:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 text-base">
                  R$ {totalBens.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          {/* ABA 3: APTIDÃO & SOLOS */}
          {activeTab === 'aptidao' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Aptidão / Tipo de Solo</Label>
                  <Input
                    placeholder="Ex: Classe III (Aptidão Regular para Lavouras)"
                    value={aptidaoSolo}
                    onChange={(e) => setAptidaoSolo(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Cultura Principal</Label>
                  <Input
                    placeholder="Ex: Soja / Milho Safrinha / Cafeicultura"
                    value={culturaPrincipal}
                    onChange={(e) => setCulturaPrincipal(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Capacidade de Pastagem (U.A. / ha)</Label>
                  <Input
                    placeholder="Ex: 1.8 U.A. / ha"
                    value={capacidadePastagem}
                    onChange={(e) => setCapacidadePastagem(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Finalidade do Crédito</Label>
                  <Input
                    placeholder="Ex: Custeio Agrícola / Aquisição de Máquinas"
                    value={finalidadeCredito}
                    onChange={(e) => setFinalidadeCredito(e.target.value)}
                  />
                </div>
              </div>

              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3 space-y-2 mt-4">
                <h5 className="font-extrabold text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Declaração Técnico-Agropecuária de Solo</h5>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  O Laudo Técnico atestará a aptidão do solo do imóvel rural de <strong>{(imovel.areaHa || 0).toFixed(4)} ha</strong> para a cultura principal declarada, em conformidade com as normas do Manual de Crédito Rural (MCR) e exigências dos agentes financeiros nacionais.
                </p>
              </div>
            </div>
          )}

          {/* ABA 4: CRONOGRAMA FINANCEIRO */}
          {activeTab === 'cronograma' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Etapas do Liberação &amp; Aplicação Financeira</h4>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-[11px] font-bold py-1 h-7" onClick={adicionarEtapa}>
                  <Plus className="size-3.5" /> Adicionar Etapa
                </Button>
              </div>

              <div className="space-y-2.5">
                {cronogramaEtapas.length === 0 ? (
                  <div className="text-center py-6 text-zinc-550 border border-dashed rounded-lg text-xs">
                    Nenhuma etapa inserida. Clique em "Adicionar Etapa" para iniciar o cronograma físico-financeiro.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {cronogramaEtapas.map((et, index) => (
                      <div key={et.id} className="flex gap-2 items-center bg-muted/10 border p-2 rounded-lg">
                        <span className="text-xs font-bold text-muted-foreground w-6 text-center shrink-0">#{index + 1}</span>
                        <div className="flex-1">
                          <Input
                            placeholder="Etapa / Investimento (ex: Preparo de Solo / Calagem)"
                            value={et.etapa}
                            onChange={(e) => atualizarEtapa(et.id, 'etapa', e.target.value)}
                            className="h-8 text-xs font-semibold"
                          />
                        </div>
                        <div className="w-16">
                          <Input
                            type="number"
                            placeholder="Mês"
                            value={et.mes}
                            onChange={(e) => atualizarEtapa(et.id, 'mes', Number(e.target.value))}
                            className="h-8 text-xs text-center"
                            title="Mês de aplicação"
                          />
                        </div>
                        <div className="w-28">
                          <Input
                            type="number"
                            placeholder="Valor"
                            value={et.valor || ''}
                            onChange={(e) => atualizarEtapa(et.id, 'valor', Number(e.target.value))}
                            className="h-8 text-xs font-mono text-right"
                          />
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removerEtapa(et.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-md shrink-0"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t pt-3 flex justify-between items-center text-xs sm:text-sm font-bold bg-muted/20 p-2.5 rounded-lg">
                <span className="text-muted-foreground">Valor Total do Cronograma:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 text-base">
                  R$ {totalEtapas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* BOTOES DE EXPORTACAO E DOCUMENTOS */}
        <div className="pt-4 border-t flex flex-wrap gap-2 justify-end shrink-0">
          <Button variant="outline" className="text-xs font-bold gap-1.5" onClick={baixarCronogramaPdf} disabled={cronogramaEtapas.length === 0}>
            <Download className="size-4" /> Cronograma (PDF)
          </Button>
          <Button variant="outline" className="text-xs font-bold gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={baixarCronogramaDocx} disabled={cronogramaEtapas.length === 0}>
            <Download className="size-4 text-blue-600" /> Cronograma (Word)
          </Button>
          <Button variant="outline" className="text-xs font-bold gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={baixarLaudoDocx}>
            <Download className="size-4 text-blue-600" /> Laudo de Aptidão (Word)
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 text-xs" onClick={baixarLaudoPdf}>
            <Download className="size-4" /> Laudo de Aptidão (PDF)
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 text-xs" onClick={baixarProjetoDocx}>
            <Download className="size-4" /> Projeto Técnico completo (Word)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
