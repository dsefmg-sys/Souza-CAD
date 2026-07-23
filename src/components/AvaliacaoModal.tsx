'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Coins, Download, Landmark, Play, Calculator, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { ImovelData, EscritorioData, TecnicoData } from '@/lib/topo/types';
import { confirmar } from '@/lib/ui/dialogos';
import { gerarPdfLaudoAvaliacao } from '@/lib/export/avaliacao';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  imovel: ImovelData;
  onChangeImovel: (i: ImovelData) => void;
  tecnico: TecnicoData;
  esc: EscritorioData | null;
  onSalvarProjeto: () => void;
}

export default function AvaliacaoModal({
  open,
  onOpenChange,
  imovel,
  onChangeImovel,
  tecnico,
  esc,
  onSalvarProjeto
}: Props) {
  const [msg, setMsg] = useState('');

  // Local state
  const [tipoImovel, setTipoImovel] = useState<'rural' | 'urbano'>('rural');
  const [aptidaoSolo, setAptidaoSolo] = useState('');
  const [conservacaoEdif, setConservacaoEdif] = useState('');
  const [valorUnitario, setValorUnitario] = useState('');
  const [benfeitorias, setBenfeitorias] = useState('');
  const [valorBenfeitorias, setValorBenfeitorias] = useState('');
  const [metodologia, setMetodologia] = useState('');

  useEffect(() => {
    if (open && imovel.dadosAvaliacao) {
      const d = imovel.dadosAvaliacao;
      setTipoImovel(d.tipoImovel || 'rural');
      setAptidaoSolo(d.aptidaoSolo || '');
      setConservacaoEdif(d.conservacaoEdif || '');
      setValorUnitario(d.valorUnitario || '');
      setBenfeitorias(d.benfeitorias || '');
      setValorBenfeitorias((d as any).valorBenfeitorias || '');
      setMetodologia(d.metodologia || '');
    } else if (open) {
      setTipoImovel('rural');
      setAptidaoSolo('');
      setConservacaoEdif('');
      setValorUnitario('');
      setBenfeitorias('');
      setValorBenfeitorias('');
      setMetodologia('');
    }
  }, [open, imovel]);

  const obterDadosAtuais = () => ({
    tipoImovel,
    aptidaoSolo,
    conservacaoEdif,
    valorUnitario,
    benfeitorias,
    valorBenfeitorias,
    metodologia
  });

  const verificarModificado = () => {
    const atual = obterDadosAtuais();
    const salvo = imovel.dadosAvaliacao || {};
    return JSON.stringify(atual) !== JSON.stringify({
      tipoImovel: salvo.tipoImovel || 'rural',
      aptidaoSolo: salvo.aptidaoSolo || '',
      conservacaoEdif: salvo.conservacaoEdif || '',
      valorUnitario: salvo.valorUnitario || '',
      benfeitorias: salvo.benfeitorias || '',
      valorBenfeitorias: (salvo as any).valorBenfeitorias || '',
      metodologia: salvo.metodologia || ''
    });
  };

  const salvarLocal = () => {
    onChangeImovel({
      ...imovel,
      dadosAvaliacao: obterDadosAtuais() as any
    });
    setMsg('Dados de Avaliação salvos!');
    setTimeout(() => setMsg(''), 3000);
  };

  const fecharComVerificacao = async () => {
    if (verificarModificado()) {
      const fecharSemSalvar = await confirmar({
        titulo: 'Alterações pendentes',
        mensagem: 'Você fez alterações nos dados de avaliação. Deseja fechar e descartar as alterações?',
        okLabel: 'Descartar e Fechar',
        perigo: true
      });
      if (!fecharSemSalvar) return;
    }
    onOpenChange(false);
  };

  // Presets de Avaliação NBR 14653
  const carregarCenarioRural = () => {
    setTipoImovel('rural');
    setAptidaoSolo('Alta aptidão agrícola para culturas anuais e cafeicultura (Latossolo Vermelho profundo com declividade suave de 5%).');
    setConservacaoEdif('Excelente estado de conservação das infraestruturas operacionais e cercamentos perimétricos.');
    setValorUnitario('45000');
    setBenfeitorias('Casa sede 180m², galpão de máquinas 300m², curral de cordoalha com balança e poço artesiano.');
    setValorBenfeitorias('180000');
    setMetodologia('Método Comparativo Direto de Dados de Mercado (ABNT NBR 14653-3) com amostragem de dados de transações reais na região.');
    setMsg('Cenário Avaliação Rural NBR 14653-3 carregado!');
    setTimeout(() => setMsg(''), 3000);
  };

  const carregarCenarioUrbano = () => {
    setTipoImovel('urbano');
    setAptidaoSolo('Zona Urbana Consolidada (ZUC) - Coeficiente de aproveitamento 2.0.');
    setConservacaoEdif('Boa conservação de infraestrutura urbana de entorno.');
    setValorUnitario('1200');
    setBenfeitorias('Fechamento em alvenaria, portão basculante, pavimentação asfáltica frontal e pontos de água/energia.');
    setValorBenfeitorias('45000');
    setMetodologia('Método Comparativo Direto de Dados de Mercado (ABNT NBR 14653-2) por inferência estatística de ofertas.');
    setMsg('Cenário Avaliação Urbana NBR 14653-2 carregado!');
    setTimeout(() => setMsg(''), 3000);
  };

  // Cálculo Automático de Avaliação
  const areaCalc = tipoImovel === 'rural' ? (imovel.areaHa || (imovel.areaM2 ? imovel.areaM2 / 10000 : 0)) : (imovel.areaM2 || 0);
  const valUnitNum = Number(valorUnitario) || 0;
  const valBenfNum = Number(valorBenfeitorias) || 0;
  const valorTerraNua = areaCalc * valUnitNum;
  const valorTotalImovel = valorTerraNua + valBenfNum;
  const valorMinimoConfianca = valorTotalImovel * 0.90;
  const valorMaximoConfianca = valorTotalImovel * 1.10;

  const baixarLaudo = () => {
    const doc = gerarPdfLaudoAvaliacao(imovel, esc, tecnico, obterDadosAtuais());
    doc.save(`${imovel.denominacao || 'imovel'}_laudo_avaliacao_nbr14653.pdf`);
  };

  const baixarLaudoDocx = async () => {
    const { gerarDocxAvaliacaoImovel } = await import('@/lib/export/avaliacao');
    const { saveAs } = await import('file-saver');
    const blob = await gerarDocxAvaliacaoImovel(imovel, esc, tecnico, obterDadosAtuais());
    saveAs(blob, `${imovel.denominacao || 'imovel'}_laudo_avaliacao_nbr14653.docx`);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) fecharComVerificacao(); else onOpenChange(val); }}>
      <DialogContent className="w-[96vw] sm:w-[92vw] max-w-[780px] max-h-[92vh] flex flex-col p-4 sm:p-6 overflow-hidden shadow-2xl" onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="shrink-0 flex flex-row items-center justify-between border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-base font-extrabold uppercase tracking-wide text-foreground">
            <Coins className="size-5 text-emerald-500 shrink-0" /> Módulo de Avaliação de Imóveis (ABNT NBR 14653)
          </DialogTitle>
          <div className="flex items-center gap-2">
            {msg && <span className="text-xs font-bold text-emerald-500 animate-pulse">{msg}</span>}
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs" onClick={salvarLocal}>
              Salvar Avaliação
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-2 text-xs sm:text-sm">
          {/* Presets de Carregamento Rápido NBR 14653 */}
          <div className="space-y-1.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide flex items-center gap-1.5">
              <Play className="size-3.5" /> Preenchimento Rápido NBR 14653:
            </span>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={carregarCenarioRural}
                className="px-2.5 py-1.5 rounded-md bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-all"
              >
                Avaliação Rural (NBR 14653-3 em R$/ha)
              </button>
              <button
                type="button"
                onClick={carregarCenarioUrbano}
                className="px-2.5 py-1.5 rounded-md bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-all"
              >
                Avaliação Urbana (NBR 14653-2 em R$/m²)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Tipo de Imóvel</Label>
              <select
                className="w-full h-9 rounded-md border bg-background px-3 text-xs font-semibold"
                value={tipoImovel}
                onChange={(e) => setTipoImovel(e.target.value as any)}
              >
                <option value="rural">Imóvel Rural (R$/ha)</option>
                <option value="urbano">Imóvel Urbano (R$/m²)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">
                Valor Unitário ({tipoImovel === 'rural' ? 'R$ / hectare' : 'R$ / m²'})
              </Label>
              <Input
                type="number"
                placeholder={tipoImovel === 'rural' ? 'Ex: 45000' : 'Ex: 1200'}
                value={valorUnitario}
                onChange={(e) => setValorUnitario(e.target.value)}
                className="font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Valor Estimado das Benfeitorias (R$)</Label>
              <Input
                type="number"
                placeholder="Ex: 180000"
                value={valorBenfeitorias}
                onChange={(e) => setValorBenfeitorias(e.target.value)}
                className="font-mono font-bold"
              />
            </div>
          </div>

          {/* Card de Cálculo Automático do Valor de Mercado */}
          <div className="p-3.5 border rounded-xl bg-card space-y-2">
            <div className="flex justify-between items-center text-xs font-extrabold uppercase text-emerald-600 dark:text-emerald-400">
              <span className="flex items-center gap-1.5"><Calculator className="size-4" /> Resumo do Cálculo do Valor de Mercado NBR 14653</span>
              <span className="font-mono text-muted-foreground font-normal">Área: {areaCalc.toFixed(2)} {tipoImovel === 'rural' ? 'ha' : 'm²'}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs">
              <div className="p-2 border rounded-lg bg-muted/20 space-y-0.5">
                <span className="text-[10px] text-muted-foreground font-bold uppercase">Valor da Terra Nua (VTN):</span>
                <div className="font-mono font-bold text-sm text-foreground">
                  R$ {valorTerraNua.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              <div className="p-2 border rounded-lg bg-emerald-500/10 border-emerald-500/30 space-y-0.5">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase">Valor Total Estimado do Imóvel:</span>
                <div className="font-mono font-black text-base text-emerald-600 dark:text-emerald-400">
                  R$ {valorTotalImovel.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              <div className="p-2 border rounded-lg bg-muted/20 space-y-0.5">
                <span className="text-[10px] text-muted-foreground font-bold uppercase">Intervalo de Confiança (&plusmn;10%):</span>
                <div className="font-mono font-bold text-[11px] text-muted-foreground">
                  R$ {valorMinimoConfianca.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} a R$ {valorMaximoConfianca.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Aptidão Agrícola / Uso do Solo</Label>
            <Input
              placeholder="Ex: Alta aptidão para culturas anuais (Latossolo Vermelho)"
              value={aptidaoSolo}
              onChange={(e) => setAptidaoSolo(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Discriminação das Benfeitorias e Edificações</Label>
            <textarea
              className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
              rows={3}
              placeholder="Descreva as benfeitorias: galpão de máquinas, casa sede, cercamentos, poço artesiano..."
              value={benfeitorias}
              onChange={(e) => setBenfeitorias(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Metodologia e Fundamentação Técnica (ABNT NBR 14653)</Label>
            <Input
              placeholder="Ex: Método Comparativo Direto de Dados de Mercado com amostragem de dados reais na região."
              value={metodologia}
              onChange={(e) => setMetodologia(e.target.value)}
            />
          </div>
        </div>

        {/* BOTOES COM CORES SOLIDADAS DE ALTO CONTRASTE */}
        <div className="pt-3 border-t flex flex-wrap gap-2 justify-end shrink-0 bg-card">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 shrink-0" onClick={baixarLaudoDocx}>
            <Download className="size-4" /> Laudo de Avaliação (Word)
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shrink-0" onClick={baixarLaudo}>
            <Download className="size-4" /> Laudo de Avaliação (PDF)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
