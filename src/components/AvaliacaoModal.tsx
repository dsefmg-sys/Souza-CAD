import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Coins, Download, Landmark } from 'lucide-react';
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
  const [metodologia, setMetodologia] = useState('');

  useEffect(() => {
    if (open && imovel.dadosAvaliacao) {
      const d = imovel.dadosAvaliacao;
      setTipoImovel(d.tipoImovel || 'rural');
      setAptidaoSolo(d.aptidaoSolo || '');
      setConservacaoEdif(d.conservacaoEdif || '');
      setValorUnitario(d.valorUnitario || '');
      setBenfeitorias(d.benfeitorias || '');
      setMetodologia(d.metodologia || '');
    } else if (open) {
      setTipoImovel('rural');
      setAptidaoSolo('');
      setConservacaoEdif('');
      setValorUnitario('');
      setBenfeitorias('');
      setMetodologia('');
    }
  }, [open, imovel]);

  const obterDadosAtuais = () => ({
    tipoImovel,
    aptidaoSolo,
    conservacaoEdif,
    valorUnitario,
    benfeitorias,
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
      metodologia: salvo.metodologia || ''
    });
  };

  const salvarLocal = () => {
    onChangeImovel({
      ...imovel,
      dadosAvaliacao: obterDadosAtuais()
    });
    setMsg('Rascunho de Avaliação salvo!');
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

  const baixarLaudo = () => {
    const doc = gerarPdfLaudoAvaliacao(imovel, esc, tecnico, {
      tipoImovel,
      aptidaoSolo,
      conservacaoEdif,
      valorUnitario,
      benfeitorias,
      metodologia
    });
    doc.save(`${imovel.denominacao || 'imovel'}_laudo_avaliacao.pdf`);
  };

  // Calcs
  const valUnitNum = parseFloat(valorUnitario.replace(/\./g, '').replace(/,/g, '.')) || 0;
  const areaCalc = tipoImovel === 'rural' ? (imovel.areaHa || 0) : (imovel.areaM2 || 0);
  const valTotal = areaCalc * valUnitNum;
  const valTotalStr = valTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) fecharComVerificacao(); else onOpenChange(val); }}>
      <DialogContent className="w-[96vw] sm:w-[92vw] max-w-[750px] max-h-[92vh] flex flex-col p-4 sm:p-6 overflow-hidden shadow-2xl" onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="shrink-0 flex flex-row items-center justify-between border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-base font-extrabold uppercase tracking-wide text-foreground">
            <Coins className="size-5 text-emerald-500 shrink-0" /> Módulo de Avaliação de Imóveis
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
              <Label className="text-xs font-bold">Tipo do Imóvel para Avaliação</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTipoImovel('rural')}
                  className={`flex-1 py-1.5 px-3 rounded border text-xs font-bold transition-all ${
                    tipoImovel === 'rural' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-transparent'
                  }`}
                >
                  Rural (Avaliável em ha)
                </button>
                <button
                  type="button"
                  onClick={() => setTipoImovel('urbano')}
                  className={`flex-1 py-1.5 px-3 rounded border text-xs font-bold transition-all ${
                    tipoImovel === 'urbano' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-transparent'
                  }`}
                >
                  Urbano (Avaliável em m²)
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Valor Unitário de Referência (R$)</Label>
              <Input
                placeholder={tipoImovel === 'rural' ? 'Ex: 25.000,00 por ha' : 'Ex: 450,00 por m²'}
                value={valorUnitario}
                onChange={(e) => setValorUnitario(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Aptidão do Terreno / Classe de Terra</Label>
              <Input
                placeholder="Ex: Aptidão alta para lavoura, solo argiloso profundo"
                value={aptidaoSolo}
                onChange={(e) => setAptidaoSolo(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Conservação das Edificações</Label>
              <Input
                placeholder="Ex: Regular, Excelente, Necessita reparos"
                value={conservacaoEdif}
                onChange={(e) => setConservacaoEdif(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Metodologia de Avaliação</Label>
              <Input
                placeholder="Ex: Método Comparativo de Dados de Mercado (NBR 14.653)"
                value={metodologia}
                onChange={(e) => setMetodologia(e.target.value)}
              />
            </div>
            <div className="p-3 bg-muted/40 rounded-xl border border-dashed flex flex-col justify-center">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">VALOR TOTAL DO IMÓVEL (ÁREA × REF)</span>
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                <Landmark className="size-4 shrink-0" /> {valTotalStr}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Benfeitorias e Infraestrutura Identificadas</Label>
            <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y"
              rows={4}
              placeholder="Descreva currais, cercas, sedes, casas de colonos, eletrificação, poço artesiano, represas..."
              value={benfeitorias}
              onChange={(e) => setBenfeitorias(e.target.value)}
            />
          </div>

          <div className="pt-4 border-t flex justify-end">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5" onClick={baixarLaudo}>
              <Download className="size-4" /> Gerar Laudo de Avaliação (PDF)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
