import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Download, ShieldAlert } from 'lucide-react';
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
    setMsg('Rascunho de REURB salvo!');
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

  const baixarCRF = () => {
    const doc = gerarPdfCRF(imovel, esc, tecnico, {
      modalidadeReurb,
      decretoMunicipal,
      classificacaoSocial,
      infraBasica,
      fundamentoReurb
    });
    doc.save(`${imovel.denominacao || 'imovel'}_crf_regularizacao.pdf`);
  };

  const baixarPRF = () => {
    const doc = gerarPdfPRF(imovel, esc, tecnico, {
      modalidadeReurb,
      decretoMunicipal,
      classificacaoSocial,
      infraBasica,
      fundamentoReurb
    });
    doc.save(`${imovel.denominacao || 'imovel'}_projeto_reurb.pdf`);
  };

  const baixarLaudoReurbDocx = async () => {
    const { gerarDocxLaudoReurb } = await import('@/lib/export/reurb');
    const { saveAs } = await import('file-saver');
    const blob = await gerarDocxLaudoReurb(imovel, esc, tecnico, {
      modalidadeReurb,
      decretoMunicipal,
      classificacaoSocial,
      infraBasica,
      fundamentoReurb
    });
    saveAs(blob, `${imovel.denominacao || 'imovel'}_reurb.docx`);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) fecharComVerificacao(); else onOpenChange(val); }}>
      <DialogContent className="w-[96vw] sm:w-[92vw] max-w-[750px] max-h-[92vh] flex flex-col p-4 sm:p-6 overflow-hidden shadow-2xl" onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="shrink-0 flex flex-row items-center justify-between border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-base font-extrabold uppercase tracking-wide text-foreground">
            <Building2 className="size-5 text-amber-500 shrink-0" /> Módulo de REURB (Regularização Fundiária)
          </DialogTitle>
          <div className="flex items-center gap-2">
            {msg && <span className="text-xs font-bold text-emerald-500 animate-pulse">{msg}</span>}
            <Button size="sm" variant="outline" className="text-xs font-bold" onClick={salvarLocal}>
              Salvar Rascunho
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-2 text-xs sm:text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Modalidade da Regularização (Lei 13.465/17)</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalidadeReurb('REURB-S')}
                  className={`flex-1 py-1.5 px-3 rounded border text-xs font-bold transition-all ${
                    modalidadeReurb === 'REURB-S' ? 'bg-amber-600 text-white border-amber-600' : 'bg-transparent'
                  }`}
                >
                  REURB-S (Interesse Social)
                </button>
                <button
                  type="button"
                  onClick={() => setModalidadeReurb('REURB-E')}
                  className={`flex-1 py-1.5 px-3 rounded border text-xs font-bold transition-all ${
                    modalidadeReurb === 'REURB-E' ? 'bg-amber-600 text-white border-amber-600' : 'bg-transparent'
                  }`}
                >
                  REURB-E (Interesse Específico)
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Decreto Municipal de Homologação</Label>
              <Input
                placeholder="Ex: Decreto nº 3.489/2026 de 15/04/2026"
                value={decretoMunicipal}
                onChange={(e) => setDecretoMunicipal(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Classificação da Ocupação</Label>
              <Input
                placeholder="Ex: Ocupação consolidade urbana de baixa renda"
                value={classificacaoSocial}
                onChange={(e) => setClassificacaoSocial(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Fundamento Legal / Enquadramento</Label>
              <Input
                placeholder="Ex: Art. 13 da Lei 13.465/17"
                value={fundamentoReurb}
                onChange={(e) => setFundamentoReurb(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Atestado de Infraestrutura Básica Existente</Label>
            <textarea
              rows={4}
              placeholder="Descreva a rede de energia pública, escoamento de águas, saneamento básico e vias de acesso consolidadas..."
              value={infraBasica}
              onChange={(e) => setInfraBasica(e.target.value)}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y"
            />
          </div>

          <div className="pt-4 border-t flex flex-wrap gap-2 justify-end">
            <Button variant="outline" className="text-xs font-bold gap-1.5" onClick={baixarPRF}>
              <Download className="size-4" /> Projeto de REURB (PDF)
            </Button>
            <Button variant="outline" className="text-xs font-bold gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={baixarLaudoReurbDocx}>
              <Download className="size-4 text-blue-600" /> Projeto / Certidão REURB (Word)
            </Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1.5 text-xs" onClick={baixarCRF}>
              <Download className="size-4" /> Certidão CRF (PDF)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
