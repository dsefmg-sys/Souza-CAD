import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sprout, Download, Plus, Trash2 } from 'lucide-react';
import { ImovelData, EscritorioData, TecnicoData } from '@/lib/topo/types';
import { confirmar, avisar } from '@/lib/ui/dialogos';
import { gerarPdfLaudoAptidao, gerarPdfCronogramaFinanceiro } from '@/lib/export/creditoRural';

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
  const [activeTab, setActiveTab] = useState<'aptidao' | 'cronograma'>('aptidao');
  const [msg, setMsg] = useState('');

  // Local state
  const [aptidaoSolo, setAptidaoSolo] = useState('');
  const [culturaPrincipal, setCulturaPrincipal] = useState('');
  const [capacidadePastagem, setCapacidadePastagem] = useState('');
  const [finalidadeCredito, setFinalidadeCredito] = useState('');
  const [cronogramaEtapas, setCronogramaEtapas] = useState<EtapaCronograma[]>([]);

  useEffect(() => {
    if (open && imovel.dadosCredito) {
      const d = imovel.dadosCredito;
      setAptidaoSolo(d.aptidaoSolo || '');
      setCulturaPrincipal(d.culturaPrincipal || '');
      setCapacidadePastagem(d.capacidadePastagem || '');
      setFinalidadeCredito(d.finalidadeCredito || '');
      setCronogramaEtapas(d.cronogramaEtapas || []);
    } else if (open) {
      setAptidaoSolo('');
      setCulturaPrincipal('');
      setCapacidadePastagem('');
      setFinalidadeCredito('');
      setCronogramaEtapas([]);
    }
  }, [open, imovel]);

  const obterDadosAtuais = () => ({
    aptidaoSolo,
    culturaPrincipal,
    capacidadePastagem,
    finalidadeCredito,
    cronogramaEtapas
  });

  const verificarModificado = () => {
    const atual = obterDadosAtuais();
    const salvo = imovel.dadosCredito || {};
    return JSON.stringify(atual) !== JSON.stringify({
      aptidaoSolo: salvo.aptidaoSolo || '',
      culturaPrincipal: salvo.culturaPrincipal || '',
      capacidadePastagem: salvo.capacidadePastagem || '',
      finalidadeCredito: salvo.finalidadeCredito || '',
      cronogramaEtapas: salvo.cronogramaEtapas || []
    });
  };

  const salvarLocal = () => {
    onChangeImovel({
      ...imovel,
      dadosCredito: obterDadosAtuais()
    });
    setMsg('Dados de Crédito Rural salvos!');
    setTimeout(() => setMsg(''), 3000);
  };

  const fecharComVerificacao = async () => {
    if (verificarModificado()) {
      const fecharSemSalvar = await confirmar({
        titulo: 'Alterações pendentes',
        mensagem: 'Você fez alterações no projeto de crédito rural. Deseja fechar e descartar as alterações?',
        okLabel: 'Descartar e Fechar',
        perigo: true
      });
      if (!fecharSemSalvar) return;
    }
    onOpenChange(false);
  };

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

  const baixarLaudo = () => {
    const doc = gerarPdfLaudoAptidao(imovel, esc, tecnico, obterDadosAtuais());
    doc.save(`${imovel.denominacao || 'imovel'}_laudo_aptidao_agricola.pdf`);
  };

  const baixarCronograma = () => {
    const doc = gerarPdfCronogramaFinanceiro(imovel, esc, tecnico, obterDadosAtuais());
    doc.save(`${imovel.denominacao || 'imovel'}_cronograma_credito.pdf`);
  };

  const totalProjeto = cronogramaEtapas.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) fecharComVerificacao(); else onOpenChange(val); }}>
      <DialogContent className="w-[96vw] sm:w-[92vw] max-w-[750px] max-h-[92vh] flex flex-col p-4 sm:p-6 overflow-hidden shadow-2xl" onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
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
        <div className="flex border-b text-xs font-bold shrink-0">
          <button
            onClick={() => setActiveTab('aptidao')}
            className={`py-2 px-4 transition-all ${activeTab === 'aptidao' ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-muted-foreground'}`}
          >
            Aptidão Agrícola &amp; Solos
          </button>
          <button
            onClick={() => setActiveTab('cronograma')}
            className={`py-2 px-4 transition-all ${activeTab === 'cronograma' ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-muted-foreground'}`}
          >
            Cronograma Físico-Financeiro
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-3 text-xs sm:text-sm">
          {activeTab === 'aptidao' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Aptidão / Tipo de Solo</Label>
                  <Input
                    placeholder="Ex: Classe III (Aptidão Regular)"
                    value={aptidaoSolo}
                    onChange={(e) => setAptidaoSolo(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Cultura Principal</Label>
                  <Input
                    placeholder="Ex: Soja / Milho Safrinha"
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
                <h5 className="font-extrabold text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Declaração Técnica de Solo</h5>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  O Laudo Técnico atestará a aptidão do solo do imóvel rural de <strong>{(imovel.areaHa || 0).toFixed(4)} ha</strong> para a cultura principal declarada, em conformidade com as normas do Manual de Crédito Rural (MCR) e exigências dos agentes financeiros nacionais.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'cronograma' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Etapas do Projeto de Investimento</h4>
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
                            placeholder="Etapa / Investimento (ex: Preparo de Solo)"
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
                <span className="text-muted-foreground">Valor Total do Projeto:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 text-base">
                  R$ {totalProjeto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t flex flex-wrap gap-2 justify-end shrink-0">
          <Button variant="outline" className="text-xs font-bold gap-1.5" onClick={baixarCronograma} disabled={cronogramaEtapas.length === 0}>
            <Download className="size-4" /> Cronograma Financeiro (PDF)
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5" onClick={baixarLaudo}>
            <Download className="size-4" /> Laudo de Aptidão Agrícola (PDF)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
