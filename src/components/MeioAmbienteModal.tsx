'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Leaf, Download, Sparkles, ShieldCheck, Play, FileCheck, CheckCircle2 } from 'lucide-react';
import { ImovelData, EscritorioData, TecnicoData } from '@/lib/topo/types';
import { confirmar } from '@/lib/ui/dialogos';
import { gerarPdfLTCA, gerarPdfFinanciamento, gerarPdfPRADA } from '@/lib/export/meioAmbiente';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  imovel: ImovelData;
  onChangeImovel: (i: ImovelData) => void;
  tecnico: TecnicoData;
  esc: EscritorioData | null;
  onSalvarProjeto: () => void;
}

export default function MeioAmbienteModal({
  open,
  onOpenChange,
  imovel,
  onChangeImovel,
  tecnico,
  esc,
  onSalvarProjeto
}: Props) {
  const [aba, setAba] = useState<'ltca' | 'financiamento' | 'prada'>('ltca');
  const [msg, setMsg] = useState('');

  // Local state for inputs
  const [vegetacao, setVegetacao] = useState('');
  const [conservacao, setConservacao] = useState('');
  const [corposAgua, setCorposAgua] = useState('');
  const [appEstimada, setAppEstimada] = useState('');
  const [fauna, setFauna] = useState('');
  const [diagnostico, setDiagnostico] = useState('');

  const [instituicao, setInstituicao] = useState('');
  const [linhaCredito, setLinhaCredito] = useState('');
  const [atividade, setAtividade] = useState('');
  const [valorFinanc, setValorFinanc] = useState('');
  const [cronograma, setCronograma] = useState('');

  const [declividade, setDeclividade] = useState('');
  const [recomposicao, setRecomposicao] = useState(false);
  const [acoesPRADA, setAcoesPRADA] = useState('');

  // Initial load
  useEffect(() => {
    if (open && imovel.dadosAmbientais) {
      const d = imovel.dadosAmbientais;
      setVegetacao(d.vegetacao || '');
      setConservacao(d.conservacao || '');
      setCorposAgua(d.corposAgua || '');
      setAppEstimada(d.appEstimada || '');
      setFauna(d.fauna || '');
      setDiagnostico(d.diagnostico || '');
      setInstituicao(d.instituicao || '');
      setLinhaCredito(d.linhaCredito || '');
      setAtividade(d.atividade || '');
      setValorFinanc(d.valorFinanc || '');
      setCronograma(d.cronograma || '');
      setDeclividade(d.declividade || '');
      setRecomposicao(!!d.recomposicao);
      setAcoesPRADA(d.acoesPRADA || '');
    } else if (open) {
      setVegetacao('');
      setConservacao('');
      setCorposAgua('');
      setAppEstimada('');
      setFauna('');
      setDiagnostico('');
      setInstituicao('');
      setLinhaCredito('');
      setAtividade('');
      setValorFinanc('');
      setCronograma('');
      setDeclividade('');
      setRecomposicao(false);
      setAcoesPRADA('');
    }
  }, [open, imovel]);

  const obterDadosAtuais = () => ({
    vegetacao,
    conservacao,
    corposAgua,
    appEstimada,
    fauna,
    diagnostico,
    instituicao,
    linhaCredito,
    atividade,
    valorFinanc,
    cronograma,
    declividade,
    recomposicao,
    acoesPRADA
  });

  const salvarLocal = () => {
    onChangeImovel({
      ...imovel,
      dadosAmbientais: obterDadosAtuais()
    });
    setMsg('Dados Ambientais salvos!');
    setTimeout(() => setMsg(''), 3000);
  };

  const fecharComVerificacao = async () => {
    onOpenChange(false);
  };

  // Presets Ambientais
  const carregarPresetLtca = () => {
    setVegetacao('Vegetação nativa em estágio médio e avançado de regeneração do Bioma Mata Atlântica / Cerrado Sensu Stricto.');
    setConservacao('Excelente estado de conservação sem indícios de queimadas ou corte seletivo ilegal.');
    setCorposAgua('Presença de 2 nascentes perenes e 1 córrego de 2ª ordem cruzando a propriedade.');
    setAppEstimada('Área de Preservação Permanente (APP) estimada em 4.50 hectares com raio de 50m nas nascentes.');
    setFauna('Fauna silvestre diversificada com registros de avifauna local e mamíferos de pequeno e médio porte.');
    setDiagnostico('A propriedade cumpre os requisitos do Código Florestal (Lei nº 12.651/2012) com 20% de Reserva Legal preservada.');
    setMsg('Preset LTCA Vegetal carregado!');
    setTimeout(() => setMsg(''), 3000);
  };

  const carregarPresetPrada = () => {
    setDeclividade('Declividade média de 12% em relevo suave ondulado.');
    setRecomposicao(true);
    setAcoesPRADA('Isolamento da faixa de APP de nascente com cerca de 4 fios (500m), plantio adensado de 1.200 mudas de espécies nativas regionais (Ingá, Ipê, Aroeira) e combate a formigas cortadeiras.');
    setMsg('Preset PRADA Recuperação de APP carregado!');
    setTimeout(() => setMsg(''), 3000);
  };

  const baixarLTCA = () => {
    const doc = gerarPdfLTCA(imovel, esc, tecnico, obterDadosAtuais());
    doc.save(`${imovel.denominacao || 'imovel'}_laudo_LTCA.pdf`);
  };

  const baixarPRADA = () => {
    const doc = gerarPdfPRADA(imovel, esc, tecnico, {
      declividade,
      recomposicao,
      acoes: acoesPRADA
    });
    doc.save(`${imovel.denominacao || 'imovel'}_plano_PRADA.pdf`);
  };

  const baixarFinanciamento = () => {
    const doc = gerarPdfFinanciamento(imovel, esc, tecnico, {
      instituicao,
      linhaCredito,
      atividade,
      valor: valorFinanc,
      cronograma
    });
    doc.save(`${imovel.denominacao || 'imovel'}_laudo_ambiental_credito.pdf`);
  };

  const baixarLaudoDocx = async () => {
    const { gerarDocxLaudoAmbiental } = await import('@/lib/export/meioAmbiente');
    const { saveAs } = await import('file-saver');
    const blob = await gerarDocxLaudoAmbiental(imovel, esc, tecnico, obterDadosAtuais());
    saveAs(blob, `${imovel.denominacao || 'imovel'}_laudo_ambiental.docx`);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) fecharComVerificacao(); else onOpenChange(val); }}>
      <DialogContent className="w-[96vw] sm:w-[92vw] max-w-[800px] max-h-[92vh] flex flex-col p-4 sm:p-6 overflow-hidden shadow-2xl" onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="shrink-0 flex flex-row items-center justify-between border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-base font-extrabold uppercase tracking-wide text-foreground">
            <Leaf className="size-5 text-emerald-500 shrink-0" /> Módulo de Meio Ambiente &amp; Licenciamento CAR
          </DialogTitle>
          <div className="flex items-center gap-2">
            {msg && <span className="text-xs font-bold text-emerald-500 animate-pulse">{msg}</span>}
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs" onClick={salvarLocal}>
              Salvar Dados
            </Button>
          </div>
        </DialogHeader>

        {/* Tab Buttons */}
        <div className="flex border-b text-xs font-bold shrink-0 overflow-x-auto">
          <button
            onClick={() => setAba('ltca')}
            className={`py-2 px-3.5 transition-all ${aba === 'ltca' ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-muted-foreground'}`}
          >
            1. LTCA (Cobertura Vegetal)
          </button>
          <button
            onClick={() => setAba('prada')}
            className={`py-2 px-3.5 transition-all ${aba === 'prada' ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-muted-foreground'}`}
          >
            2. PRADA (Recuperação de APP)
          </button>
          <button
            onClick={() => setAba('financiamento')}
            className={`py-2 px-3.5 transition-all ${aba === 'financiamento' ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-muted-foreground'}`}
          >
            3. Laudo Ambiental para Crédito
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-2 text-xs sm:text-sm">
          {aba === 'ltca' && (
            <div className="space-y-4">
              <div className="space-y-1.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide flex items-center gap-1.5">
                  <Play className="size-3.5" /> Preenchimento Rápido LTCA:
                </span>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={carregarPresetLtca}
                    className="px-2.5 py-1.5 rounded-md bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-all"
                  >
                    Carregar Laudo LTCA Mata Atlântica / Cerrado
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Tipo de Vegetação Nativa</Label>
                  <Input placeholder="Ex: Mata Atlântica em Estágio Médio" value={vegetacao} onChange={(e) => setVegetacao(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Estado de Conservação</Label>
                  <Input placeholder="Ex: Preservado, Sem Queimadas" value={conservacao} onChange={(e) => setConservacao(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Corpos d'Água e Nascentes</Label>
                  <Input placeholder="Ex: 2 Nascentes e Córrego Perene" value={corposAgua} onChange={(e) => setCorposAgua(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Área de Preservação Permanente (APP)</Label>
                  <Input placeholder="Ex: 4.50 hectares (Nascentes 50m)" value={appEstimada} onChange={(e) => setAppEstimada(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Diagnóstico Ambiental do Imóvel</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
                  rows={3}
                  placeholder="Conclusão técnica do Engenheiro / Técnico sobre a conformidade ambiental do imóvel..."
                  value={diagnostico}
                  onChange={(e) => setDiagnostico(e.target.value)}
                />
              </div>
            </div>
          )}

          {aba === 'prada' && (
            <div className="space-y-4">
              <div className="space-y-1.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide flex items-center gap-1.5">
                  <Play className="size-3.5" /> Preenchimento Rápido PRADA:
                </span>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={carregarPresetPrada}
                    className="px-2.5 py-1.5 rounded-md bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-all"
                  >
                    Carregar Plano de Recuperação de APP (1.200 Mudas)
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Declividade e Relevo do Local</Label>
                <Input placeholder="Ex: Relevo suave ondulado com declividade de 12%" value={declividade} onChange={(e) => setDeclividade(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Ações de Recomposição Vegetal e Manejo</Label>
                <textarea
                  className="flex min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
                  rows={4}
                  placeholder="Descreva o isolamento da área, plantio de mudas nativas, irrigação e adubação de cova..."
                  value={acoesPRADA}
                  onChange={(e) => setAcoesPRADA(e.target.value)}
                />
              </div>
            </div>
          )}

          {aba === 'financiamento' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Instituição Financeira</Label>
                  <Input placeholder="Ex: Banco do Brasil / Sicredi" value={instituicao} onChange={(e) => setInstituicao(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Linha de Crédito Solicitada</Label>
                  <Input placeholder="Ex: ABC+ Conservação do Solo" value={linhaCredito} onChange={(e) => setLinhaCredito(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Atividade Licenciada / Projeto</Label>
                <Input placeholder="Ex: Irrigação por Pivô Central e Agropecuária" value={atividade} onChange={(e) => setAtividade(e.target.value)} />
              </div>
            </div>
          )}
        </div>

        {/* BOTOES COM CORES SOLIDADAS DE ALTO CONTRASTE */}
        <div className="pt-3 border-t flex flex-wrap gap-2 justify-end shrink-0 bg-card">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 shrink-0" onClick={baixarLaudoDocx}>
            <Download className="size-4" /> Laudo Ambiental (Word)
          </Button>
          {aba === 'ltca' && (
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shrink-0" onClick={baixarLTCA}>
              <Download className="size-4" /> Laudo LTCA (PDF)
            </Button>
          )}
          {aba === 'prada' && (
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shrink-0" onClick={baixarPRADA}>
              <Download className="size-4" /> Plano PRADA (PDF)
            </Button>
          )}
          {aba === 'financiamento' && (
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shrink-0" onClick={baixarFinanciamento}>
              <Download className="size-4" /> Laudo de Crédito (PDF)
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
