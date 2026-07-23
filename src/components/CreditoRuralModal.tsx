'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sprout, Download, Plus, Trash2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { ImovelData, EscritorioData, TecnicoData } from '@/lib/topo/types';
import { confirmar } from '@/lib/ui/dialogos';
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
  const [activeTab, setActiveTab] = useState<'proposta' | 'bens' | 'aptidao' | 'cronograma' | 'mcr'>('proposta');
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

  // Regras MCR & PROAGRO
  const [enquadramentoPrograma, setEnquadramentoPrograma] = useState<'pronaf' | 'pronamp' | 'demais'>('pronamp');
  const [possuiCafDap, setPossuiCafDap] = useState(true);
  const [rendaBrutaAnual, setRendaBrutaAnual] = useState<number | ''>(250000);
  const [solicitarProagro, setSolicitarProagro] = useState(true);
  const [zarcAtendido, setZarcAtendido] = useState(true);
  const [aliquotaProagro, setAliquotaProagro] = useState<number | ''>(3.0);

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

      setEnquadramentoPrograma(d.enquadramentoPrograma || 'pronamp');
      setPossuiCafDap(d.possuiCafDap !== undefined ? d.possuiCafDap : true);
      setRendaBrutaAnual(d.rendaBrutaAnual !== undefined ? d.rendaBrutaAnual : 250000);
      setSolicitarProagro(d.solicitarProagro !== undefined ? d.solicitarProagro : true);
      setZarcAtendido(d.zarcAtendido !== undefined ? d.zarcAtendido : true);
      setAliquotaProagro(d.aliquotaProagro !== undefined ? d.aliquotaProagro : 3.0);

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

      setEnquadramentoPrograma('pronamp');
      setPossuiCafDap(true);
      setRendaBrutaAnual(250000);
      setSolicitarProagro(true);
      setZarcAtendido(true);
      setAliquotaProagro(3.0);

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
    enquadramentoPrograma,
    possuiCafDap,
    rendaBrutaAnual: Number(rendaBrutaAnual) || 0,
    solicitarProagro,
    zarcAtendido,
    aliquotaProagro: Number(aliquotaProagro) || 0,
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

  const atualizarEtapa = (id: string, campo: keyof EtapaCronograma, valor: any) => {
    setCronogramaEtapas(
      cronogramaEtapas.map((e) => (e.id === id ? { ...e, [campo]: valor } : e))
    );
  };

  const removerEtapa = (id: string) => {
    setCronogramaEtapas(cronogramaEtapas.filter((e) => e.id !== id));
  };

  // Downloads PDF / Word
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
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs" onClick={salvarLocal}>
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
          <button
            onClick={() => setActiveTab('mcr')}
            className={`py-2 px-3.5 transition-all whitespace-nowrap ${activeTab === 'mcr' ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-muted-foreground'}`}
          >
            5. Guia MCR &amp; PROAGRO (Didático)
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {activeTab === 'proposta' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Linha de Crédito Solicitada</Label>
                  <Input
                    placeholder="Ex: PRONAMP Custeio, PRONAF Mais Alimentos, ABC+"
                    value={linhaCredito}
                    onChange={(e) => setLinhaCredito(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Agente Financeiro (Banco)</Label>
                  <Input
                    placeholder="Ex: Banco do Brasil, Sicoob, Sicredi, BNB, Caixa"
                    value={agenteFinanceiro}
                    onChange={(e) => setAgenteFinanceiro(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Parceiro / Correspondente Bancário</Label>
                  <Input
                    placeholder="Ex: Souza Topografia &amp; Agro, Escritório Técnico Rural"
                    value={parceiroCorrespondente}
                    onChange={(e) => setParceiroCorrespondente(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Garantias Propostas</Label>
                  <Input
                    placeholder="Ex: Penhor Agrícola, Hipoteca da Matrícula, Avalista"
                    value={garantiaProposta}
                    onChange={(e) => setGarantiaProposta(e.target.value)}
                  />
                </div>
              </div>

              {/* Qualificação do Projetista / RT */}
              <div className="border-t pt-3 space-y-3">
                <span className="text-xs uppercase font-black text-emerald-600 dark:text-emerald-400 tracking-wider">
                  Qualificação do Responsável Técnico do Projeto
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Nome do Profissional</Label>
                    <Input value={tecnico.nome || ''} readOnly className="bg-muted/40 font-semibold" />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Título Profissional</Label>
                    <select
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                      value={tituloProfissionalRt}
                      onChange={(e) => setTituloProfissionalRt(e.target.value)}
                    >
                      <option value="Técnico em Agropecuária">Técnico em Agropecuária</option>
                      <option value="Engenheiro Agrônomo">Engenheiro Agrônomo</option>
                      <option value="Zootecnista">Zootecnista</option>
                      <option value="Engenheiro Florestal">Engenheiro Florestal</option>
                      <option value="Técnico Agrícola">Técnico Agrícola</option>
                      <option value="Engenheiro Agrícola">Engenheiro Agrícola</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Conselho de Classe &amp; Registro</Label>
                    <div className="flex gap-2">
                      <Input
                        className="w-24 text-xs font-bold"
                        value={conselhoRt}
                        onChange={(e) => setConselhoRt(e.target.value)}
                        placeholder="CFT/CREA"
                      />
                      <Input
                        className="flex-1 text-xs font-mono"
                        value={tecnico.cft || ''}
                        readOnly
                        placeholder="Registro"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Condições Financeiras */}
              <div className="border-t pt-3 space-y-3">
                <span className="text-xs uppercase font-black text-emerald-600 dark:text-emerald-400 tracking-wider">
                  Condições Financeiras da Operação
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Taxa de Juros Anual (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={taxaJurosAnual}
                      onChange={(e) => setTaxaJurosAnual(e.target.value ? Number(e.target.value) : '')}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Carência (Meses)</Label>
                    <Input
                      type="number"
                      value={carenciaMeses}
                      onChange={(e) => setCarenciaMeses(e.target.value ? Number(e.target.value) : '')}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Prazo Total (Anos)</Label>
                    <Input
                      type="number"
                      value={prazoAnos}
                      onChange={(e) => setPrazoAnos(e.target.value ? Number(e.target.value) : '')}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bens' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs uppercase font-black text-emerald-600 dark:text-emerald-400 tracking-wider">
                  Discriminação de Bens, Insumos e Benfeitorias a Financiar
                </span>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1" onClick={adicionarItem}>
                  <Plus className="size-3.5" /> Adicionar Item
                </Button>
              </div>

              {itensFinanciados.length === 0 ? (
                <div className="text-center py-8 border border-dashed rounded-xl text-muted-foreground text-xs">
                  Nenhum bem ou insumo cadastrado na proposta. Clique acima para orçar tratores, sementes, fertilizantes ou benfeitorias.
                </div>
              ) : (
                <div className="space-y-2">
                  {itensFinanciados.map((item) => (
                    <div key={item.id} className="p-3 border rounded-xl bg-card space-y-2 text-xs">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <div className="space-y-1 md:col-span-2">
                          <Label className="text-[10px] font-bold">Descrição do Item / Equipamento</Label>
                          <Input
                            placeholder="Ex: Trator 75 CV 4x4 com lâmina"
                            value={item.descricao}
                            onChange={(e) => atualizarItem(item.id, 'descricao', e.target.value)}
                            className="h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold">Categoria</Label>
                          <select
                            className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                            value={item.categoria}
                            onChange={(e) => atualizarItem(item.id, 'categoria', e.target.value as any)}
                          >
                            <option value="Maquinário">Maquinário / Veículo</option>
                            <option value="Insumos">Insumos / Fertilizantes</option>
                            <option value="Rebanho">Rebanho / Matrizes</option>
                            <option value="Benfeitoria">Benfeitoria / Cercas</option>
                            <option value="Irrigação">Irrigação / Energia</option>
                            <option value="Outros">Outros</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold">Unidade Medida</Label>
                          <Input
                            placeholder="Ex: un, ha, kg, sacos"
                            value={item.unidade || ''}
                            onChange={(e) => atualizarItem(item.id, 'unidade', e.target.value)}
                            className="h-8"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 md:grid-cols-4 gap-2 items-end pt-1">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold">Quantidade</Label>
                          <Input
                            type="number"
                            value={item.quantidade || ''}
                            onChange={(e) => atualizarItem(item.id, 'quantidade', Number(e.target.value) || 0)}
                            className="h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold">Valor Unitário (R$)</Label>
                          <Input
                            type="number"
                            value={item.valorUnitario || ''}
                            onChange={(e) => atualizarItem(item.id, 'valorUnitario', Number(e.target.value) || 0)}
                            className="h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold">Subtotal (R$)</Label>
                          <div className="h-8 px-2 flex items-center bg-muted/30 border rounded-md font-mono font-bold text-emerald-600">
                            {item.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removerItem(item.id)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-md shrink-0"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t pt-3 flex justify-between items-center text-xs sm:text-sm font-bold bg-muted/20 p-2.5 rounded-lg">
                <span className="text-muted-foreground">Valor Total Orçado dos Bens:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 text-base">
                  R$ {totalBens.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          {activeTab === 'aptidao' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Aptidão Agrícola e Qualificação do Solo</Label>
                <Input
                  placeholder="Ex: Alta aptidão para culturas anuais e perenes (Cerrado Latossolo Vermelho)"
                  value={aptidaoSolo}
                  onChange={(e) => setAptidaoSolo(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Cultura Principal / Atividade Econômica</Label>
                <Input
                  placeholder="Ex: Cafeicultura de Montanha, Milho Safrinha, Pecuária de Corte Extensiva"
                  value={culturaPrincipal}
                  onChange={(e) => setCulturaPrincipal(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Capacidade de Suporte da Pastagem / Produtividade Esperada</Label>
                <Input
                  placeholder="Ex: 2.5 Unidades Animais (U.A.) por hectare / 65 sacos por hectare"
                  value={capacidadePastagem}
                  onChange={(e) => setCapacidadePastagem(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Finalidade Técnica do Crédito</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
                  rows={3}
                  placeholder="Descreva a finalidade técnica: aquisição de corretivos, adubação de plantio, cercamento de pastagens, irrigação..."
                  value={finalidadeCredito}
                  onChange={(e) => setFinalidadeCredito(e.target.value)}
                />
              </div>
            </div>
          )}

          {activeTab === 'cronograma' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs uppercase font-black text-emerald-600 dark:text-emerald-400 tracking-wider">
                  Etapas do Cronograma Físico-Financeiro
                </span>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1" onClick={adicionarEtapa}>
                  <Plus className="size-3.5" /> Nova Etapa
                </Button>
              </div>

              {cronogramaEtapas.length === 0 ? (
                <div className="text-center py-8 border border-dashed rounded-xl text-muted-foreground text-xs">
                  Nenhuma etapa cronológica cadastrada. Clique no botão acima para organizar a liberação das parcelas financeiras.
                </div>
              ) : (
                <div className="space-y-2">
                  {cronogramaEtapas.map((et) => (
                    <div key={et.id} className="flex gap-2 items-center p-2.5 border rounded-xl bg-card">
                      <div className="w-20">
                        <Label className="text-[10px] font-bold">Mês nº</Label>
                        <Input
                          type="number"
                          value={et.mes}
                          onChange={(e) => atualizarEtapa(et.id, 'mes', Number(e.target.value) || 1)}
                          className="h-8 text-xs font-bold"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-[10px] font-bold">Descrição da Etapa / Investimento</Label>
                        <Input
                          placeholder="Ex: Aquisição de mudas e preparo de solo"
                          value={et.etapa}
                          onChange={(e) => atualizarEtapa(et.id, 'etapa', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="w-32">
                        <Label className="text-[10px] font-bold">Valor Orçado (R$)</Label>
                        <Input
                          type="number"
                          value={et.valor || ''}
                          onChange={(e) => atualizarEtapa(et.id, 'valor', Number(e.target.value) || 0)}
                          className="h-8 text-xs font-mono font-bold"
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

              <div className="border-t pt-3 flex justify-between items-center text-xs sm:text-sm font-bold bg-muted/20 p-2.5 rounded-lg">
                <span className="text-muted-foreground">Valor Total do Cronograma:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 text-base">
                  R$ {totalEtapas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          {activeTab === 'mcr' && (
            <div className="space-y-4">
              {/* Card de Regras MCR Bacen */}
              <div className="p-3.5 border rounded-xl bg-emerald-500/10 border-emerald-500/30 space-y-2">
                <h4 className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-emerald-600" /> Regras Oficiais do Manual de Crédito Rural (MCR - Bacen)
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Este assistente didático auxilia projetistas iniciantes no enquadramento de operações de crédito agrícola de acordo com a legislação do Bacen, requisitos de renda e proteção do PROAGRO.
                </p>
              </div>

              {/* Form de Enquadramento */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border p-3 rounded-xl bg-card">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Enquadramento do Produtor</Label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-semibold"
                    value={enquadramentoPrograma}
                    onChange={(e) => setEnquadramentoPrograma(e.target.value as any)}
                  >
                    <option value="pronaf">PRONAF (Agricultura Familiar)</option>
                    <option value="pronamp">PRONAMP (Médio Produtor Rural)</option>
                    <option value="demais">Demais Produtores Rurais</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Renda Bruta Anual Familiar (R$)</Label>
                  <Input
                    type="number"
                    value={rendaBrutaAnual}
                    onChange={(e) => setRendaBrutaAnual(e.target.value ? Number(e.target.value) : '')}
                    className="h-9 font-mono"
                    placeholder="Ex: 250000"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Possui CAF / DAP Válida?</Label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-semibold"
                    value={possuiCafDap ? 'sim' : 'nao'}
                    onChange={(e) => setPossuiCafDap(e.target.value === 'sim')}
                  >
                    <option value="sim">Sim (CAF / DAP Ativa)</option>
                    <option value="nao">Não possui CAF / DAP</option>
                  </select>
                </div>
              </div>

              {/* Status de Validação MCR */}
              <div className="p-3 border rounded-xl bg-muted/20 space-y-2 text-xs">
                <span className="font-extrabold uppercase text-xs tracking-wide text-foreground">
                  Diagnóstico Automático de Enquadramento MCR
                </span>

                {enquadramentoPrograma === 'pronaf' && (
                  <div className="space-y-1">
                    {Number(rendaBrutaAnual) <= 500000 && possuiCafDap ? (
                      <div className="p-2 bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold rounded-md flex items-center gap-1.5">
                        <CheckCircle2 className="size-4 shrink-0" /> Enquadramento PRONAF VÁLIDO: Renda familiar dentro do teto MCR (até R$ 500.000,00/ano) e CAF/DAP declarada.
                      </div>
                    ) : (
                      <div className="p-2 bg-red-500/20 text-red-800 dark:text-red-300 font-bold rounded-md">
                        Atenção MCR PRONAF: Exige CAF/DAP válida e Renda Bruta Familiar máxima de R$ 500.000,00/ano.
                      </div>
                    )}
                  </div>
                )}

                {enquadramentoPrograma === 'pronamp' && (
                  <div className="space-y-1">
                    {Number(rendaBrutaAnual) <= 3000000 ? (
                      <div className="p-2 bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold rounded-md flex items-center gap-1.5">
                        <CheckCircle2 className="size-4 shrink-0" /> Enquadramento PRONAMP VÁLIDO: Produtor rural com renda anual até R$ 3.000.000,00 (Teto MCR).
                      </div>
                    ) : (
                      <div className="p-2 bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold rounded-md">
                        Atenção MCR PRONAMP: Renda acima de R$ 3.000.000,00 enquadra-se na linha Demais Produtores.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Regras do PROAGRO & ZARC */}
              <div className="border-t pt-3 space-y-3">
                <span className="text-xs uppercase font-black text-emerald-600 dark:text-emerald-400 tracking-wider">
                  Garantia de Lavoura &amp; Seguro PROAGRO (MCR Capítulo 12)
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border p-3 rounded-xl bg-card">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Solicitar PROAGRO / Seguro?</Label>
                    <select
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                      value={solicitarProagro ? 'sim' : 'nao'}
                      onChange={(e) => setSolicitarProagro(e.target.value === 'sim')}
                    >
                      <option value="sim">Sim (Proteção contra intempéries)</option>
                      <option value="nao">Não (Isento / Seguro Privado)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">ZARC MAPA Atendido?</Label>
                    <select
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                      value={zarcAtendido ? 'sim' : 'nao'}
                      onChange={(e) => setZarcAtendido(e.target.value === 'sim')}
                    >
                      <option value="sim">Sim (Janela ZARC respeitada)</option>
                      <option value="nao">Não verificado</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Alíquota Adicional PROAGRO (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={aliquotaProagro}
                      onChange={(e) => setAliquotaProagro(e.target.value ? Number(e.target.value) : '')}
                      className="h-9 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Checklist Didatico do Projeto para Iniciantes */}
              <div className="border-t pt-3 space-y-2">
                <span className="text-xs uppercase font-black text-emerald-600 dark:text-emerald-400 tracking-wider">
                  Checklist Didático para Protocolo no Banco
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 border rounded-lg bg-card flex items-start gap-2">
                    <input type="checkbox" defaultChecked className="mt-0.5 rounded text-emerald-600 size-4" />
                    <div>
                      <div className="font-bold">1. Certidão Atualizada da Matrícula / CAR</div>
                      <div className="text-[11px] text-muted-foreground">Comprovação da posse ou propriedade do imóvel rural.</div>
                    </div>
                  </div>

                  <div className="p-2.5 border rounded-lg bg-card flex items-start gap-2">
                    <input type="checkbox" defaultChecked className="mt-0.5 rounded text-emerald-600 size-4" />
                    <div>
                      <div className="font-bold">2. Anotação / Termo de Responsabilidade (ART/TRT)</div>
                      <div className="text-[11px] text-muted-foreground">Emissão no conselho de classe (CFT, CREA ou CRMV).</div>
                    </div>
                  </div>

                  <div className="p-2.5 border rounded-lg bg-card flex items-start gap-2">
                    <input type="checkbox" defaultChecked className="mt-0.5 rounded text-emerald-600 size-4" />
                    <div>
                      <div className="font-bold">3. Cotações / Orçamentos de Fornecedores</div>
                      <div className="text-[11px] text-muted-foreground">Proformas de trator, insumos ou instalações.</div>
                    </div>
                  </div>

                  <div className="p-2.5 border rounded-lg bg-card flex items-start gap-2">
                    <input type="checkbox" defaultChecked className="mt-0.5 rounded text-emerald-600 size-4" />
                    <div>
                      <div className="font-bold">4. Outorga de Água (se Irrigado)</div>
                      <div className="text-[11px] text-muted-foreground">Licenciamento hídrico estadual para projetos irrigados.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BOTOES DE EXPORTACAO E DOCUMENTOS COM CORES SOLIDADAS DE ALTO CONTRASTE */}
        <div className="pt-4 border-t flex flex-wrap gap-2 justify-end shrink-0 bg-card">
          <Button className="bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs gap-1.5 shrink-0" onClick={baixarCronogramaPdf} disabled={cronogramaEtapas.length === 0}>
            <Download className="size-4" /> Cronograma (PDF)
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 shrink-0" onClick={baixarCronogramaDocx} disabled={cronogramaEtapas.length === 0}>
            <Download className="size-4" /> Cronograma (Word)
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 shrink-0" onClick={baixarLaudoDocx}>
            <Download className="size-4" /> Laudo de Aptidão (Word)
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shrink-0" onClick={baixarLaudoPdf}>
            <Download className="size-4" /> Laudo de Aptidão (PDF)
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 shrink-0" onClick={baixarProjetoDocx}>
            <Download className="size-4" /> Projeto Técnico completo (Word)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
