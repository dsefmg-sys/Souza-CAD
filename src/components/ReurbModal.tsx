'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Download, ShieldCheck, Play, FileCheck, CheckCircle2 } from 'lucide-react';
import { ImovelData, EscritorioData, TecnicoData } from '@/lib/topo/types';
import { confirmar } from '@/lib/ui/dialogos';
import { gerarPdfCRF, gerarPdfPRF } from '@/lib/export/reurb';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  imovel: ImovelData;
  onChangeImovel: (i: ImovelData) => void;
  tecnico: TecnicoData;
  esc: EscritorioData | null;
  onSalvarProjeto: () => void;
}

export default function ReurbModal({
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
  const [modalidadeReurb, setModalidadeReurb] = useState<'REURB-S' | 'REURB-E'>('REURB-S');
  const [decretoMunicipal, setDecretoMunicipal] = useState('');
  const [classificacaoSocial, setClassificacaoSocial] = useState('');
  const [infraBasica, setInfraBasica] = useState('');
  const [fundamentoReurb, setFundamentoReurb] = useState('');

  useEffect(() => {
    if (open && imovel.dadosReurb) {
      const d = imovel.dadosReurb;
      setModalidadeReurb(d.modalidadeReurb || 'REURB-S');
      setDecretoMunicipal(d.decretoMunicipal || '');
      setClassificacaoSocial(d.classificacaoSocial || '');
      setInfraBasica(d.infraBasica || '');
      setFundamentoReurb(d.fundamentoReurb || '');
    } else if (open) {
      setModalidadeReurb('REURB-S');
      setDecretoMunicipal('');
      setClassificacaoSocial('');
      setInfraBasica('');
      setFundamentoReurb('');
    }
  }, [open, imovel]);

  const obterDadosAtuais = () => ({
    modalidadeReurb,
    decretoMunicipal,
    classificacaoSocial,
    infraBasica,
    fundamentoReurb
  });

  const verificarModificado = () => {
    const atual = obterDadosAtuais();
    const salvo = imovel.dadosReurb || {};
    return JSON.stringify(atual) !== JSON.stringify({
      modalidadeReurb: salvo.modalidadeReurb || 'REURB-S',
      decretoMunicipal: salvo.decretoMunicipal || '',
      classificacaoSocial: salvo.classificacaoSocial || '',
      infraBasica: salvo.infraBasica || '',
      fundamentoReurb: salvo.fundamentoReurb || ''
    });
  };

  const salvarLocal = () => {
    onChangeImovel({
      ...imovel,
      dadosReurb: obterDadosAtuais()
    });
    setMsg('Dados de REURB salvos!');
    setTimeout(() => setMsg(''), 3000);
  };

  const fecharComVerificacao = async () => {
    if (verificarModificado()) {
      const fecharSemSalvar = await confirmar({
        titulo: 'Alterações pendentes',
        mensagem: 'Você fez alterações nos dados de REURB. Deseja fechar e descartar as alterações?',
        okLabel: 'Descartar e Fechar',
        perigo: true
      });
      if (!fecharSemSalvar) return;
    }
    onOpenChange(false);
  };

  // Presets REURB Lei 13.465/2017
  const carregarReurbS = () => {
    setModalidadeReurb('REURB-S');
    setDecretoMunicipal('Decreto Municipal nº 4.521/2023 - Instauração da REURB');
    setClassificacaoSocial('Núcleo Urbano Informal Consolidado ocupado predominantemente por população de baixa renda (Renda familiar igual ou inferior a 5 salários mínimos). Gratuidade nos atos cartorários.');
    setInfraBasica('Rede pública de abastecimento de água potável, sistema de esgotamento sanitário, rede de energia elétrica domiciliária e vias de circulação abertas.');
    setFundamentoReurb('Fundamentado no artigo 13, inciso I, da Lei Federal nº 13.465/2017 e Decreto Federal nº 9.310/2018.');
    setMsg('Cenário REURB-S (Interesse Social) carregado!');
    setTimeout(() => setMsg(''), 3000);
  };

  const carregarReurbE = () => {
    setModalidadeReurb('REURB-E');
    setDecretoMunicipal('Decreto Municipal nº 4.890/2024 - Instauração REURB Específica');
    setClassificacaoSocial('Núcleo Urbano Informal Consolidado ocupado por população não enquadrada na REURB-S (Interesse Específico). Custos de infraestrutura e cartório a cargo dos ocupantes.');
    setInfraBasica('Rede de abastecimento de água, drenagem de águas pluviais, pavimentação asfáltica e rede elétrica trifásica.');
    setFundamentoReurb('Fundamentado no artigo 13, inciso II, da Lei Federal nº 13.465/2017.');
    setMsg('Cenário REURB-E (Interesse Específico) carregado!');
    setTimeout(() => setMsg(''), 3000);
  };

  const baixarCRF = () => {
    const doc = gerarPdfCRF(imovel, esc, tecnico, obterDadosAtuais());
    doc.save(`${imovel.denominacao || 'imovel'}_certidao_CRF_reurb.pdf`);
  };

  const baixarPRF = () => {
    const doc = gerarPdfPRF(imovel, esc, tecnico, obterDadosAtuais());
    doc.save(`${imovel.denominacao || 'imovel'}_projeto_PRF_reurb.pdf`);
  };

  const baixarLaudoDocx = async () => {
    const { gerarDocxLaudoReurb } = await import('@/lib/export/reurb');
    const { saveAs } = await import('file-saver');
    const blob = await gerarDocxLaudoReurb(imovel, esc, tecnico, obterDadosAtuais());
    saveAs(blob, `${imovel.denominacao || 'imovel'}_laudo_tecnico_reurb.docx`);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) fecharComVerificacao(); else onOpenChange(val); }}>
      <DialogContent className="w-[96vw] sm:w-[92vw] max-w-[780px] max-h-[92vh] flex flex-col p-4 sm:p-6 overflow-hidden shadow-2xl" onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="shrink-0 flex flex-row items-center justify-between border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-base font-extrabold uppercase tracking-wide text-foreground">
            <Building2 className="size-5 text-amber-500 shrink-0" /> Módulo de REURB (Lei Federal nº 13.465/2017)
          </DialogTitle>
          <div className="flex items-center gap-2">
            {msg && <span className="text-xs font-bold text-amber-500 animate-pulse">{msg}</span>}
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs" onClick={salvarLocal}>
              Salvar Dados
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-2 text-xs sm:text-sm">
          {/* Presets REURB */}
          <div className="space-y-1.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <span className="text-xs font-extrabold text-amber-700 dark:text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
              <Play className="size-3.5" /> Preenchimento Rápido por Modalidade Legal:
            </span>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={carregarReurbS}
                className="px-2.5 py-1.5 rounded-md bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-all"
              >
                REURB-S (Interesse Social - Baixa Renda)
              </button>
              <button
                type="button"
                onClick={carregarReurbE}
                className="px-2.5 py-1.5 rounded-md bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition-all"
              >
                REURB-E (Interesse Específico)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Modalidade da REURB</Label>
              <select
                className="w-full h-9 rounded-md border bg-background px-3 text-xs font-bold text-foreground"
                value={modalidadeReurb}
                onChange={(e) => setModalidadeReurb(e.target.value as any)}
              >
                <option value="REURB-S">REURB-S (Interesse Social)</option>
                <option value="REURB-E">REURB-E (Interesse Específico)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Decreto Municipal de Instauração</Label>
              <Input
                placeholder="Ex: Decreto Municipal nº 4.521/2023"
                value={decretoMunicipal}
                onChange={(e) => setDecretoMunicipal(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Classificação Social e Caracterização do Núcleo Urbano</Label>
            <Input
              placeholder="Ex: Núcleo Urbano Informal Consolidado com perfil de baixa renda..."
              value={classificacaoSocial}
              onChange={(e) => setClassificacaoSocial(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Infraestrutura Básica Existente (Art. 36 Lei 13.465)</Label>
            <textarea
              className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
              rows={3}
              placeholder="Descreva a rede de água, saneamento, energia elétrica, iluminação pública e arruamento..."
              value={infraBasica}
              onChange={(e) => setInfraBasica(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Fundamentação Jurídica da Regularização</Label>
            <Input
              placeholder="Ex: Artigo 13 da Lei Federal nº 13.465/2017 e Decreto nº 9.310/2018."
              value={fundamentoReurb}
              onChange={(e) => setFundamentoReurb(e.target.value)}
            />
          </div>

          {/* Documentos Exigidos */}
          <div className="p-3 border rounded-xl bg-card space-y-2 text-xs">
            <span className="font-extrabold uppercase text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <FileCheck className="size-4" /> Checklist de Documentos do Processo de REURB
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" /> Projeto de Regularização Fundiária (PRF).
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" /> Certidão de Regularização Fundiária (CRF).
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" /> Levantamento Topográfico Cadastral Altimétrico.
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" /> Listagem de Ocupantes e Cadastro Social.
              </div>
            </div>
          </div>
        </div>

        {/* BOTOES COM CORES SOLIDADAS DE ALTO CONTRASTE */}
        <div className="pt-3 border-t flex flex-wrap gap-2 justify-end shrink-0 bg-card">
          <Button className="bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs gap-1.5 shrink-0" onClick={baixarPRF}>
            <Download className="size-4" /> Projeto PRF (PDF)
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 shrink-0" onClick={baixarLaudoDocx}>
            <Download className="size-4" /> Laudo de REURB (Word)
          </Button>
          <Button className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5 shrink-0" onClick={baixarCRF}>
            <Download className="size-4" /> Certidão CRF (PDF)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
