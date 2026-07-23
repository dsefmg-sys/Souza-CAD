'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Scale, Download, CheckCircle2, Play, BookOpen, ShieldCheck, FileCheck } from 'lucide-react';
import { ImovelData, EscritorioData, TecnicoData } from '@/lib/topo/types';
import { confirmar } from '@/lib/ui/dialogos';
import { gerarPdfLaudoUsucapiao, gerarPdfAtaPosse } from '@/lib/export/usucapiao';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  imovel: ImovelData;
  onChangeImovel: (i: ImovelData) => void;
  tecnico: TecnicoData;
  esc: EscritorioData | null;
  onSalvarProjeto: () => void;
}

export default function UsucapiaoModal({
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
  const [tempoPosse, setTempoPosse] = useState('');
  const [origemPosse, setOrigemPosse] = useState('');
  const [tipoUsucapiao, setTipoUsucapiao] = useState('');
  const [detalhesPosse, setDetalhesPosse] = useState('');
  const [anuenteVizinhos, setAnuenteVizinhos] = useState(false);

  useEffect(() => {
    if (open && imovel.dadosUsucapiao) {
      const d = imovel.dadosUsucapiao;
      setTempoPosse(d.tempoPosse || '');
      setOrigemPosse(d.origemPosse || '');
      setTipoUsucapiao(d.tipoUsucapiao || '');
      setDetalhesPosse(d.detalhesPosse || '');
      setAnuenteVizinhos(!!d.anuenteVizinhos);
    } else if (open) {
      setTempoPosse('');
      setOrigemPosse('');
      setTipoUsucapiao('');
      setDetalhesPosse('');
      setAnuenteVizinhos(false);
    }
  }, [open, imovel]);

  const obterDadosAtuais = () => ({
    tempoPosse,
    origemPosse,
    tipoUsucapiao,
    detalhesPosse,
    anuenteVizinhos
  });

  const verificarModificado = () => {
    const atual = obterDadosAtuais();
    const salvo = imovel.dadosUsucapiao || {};
    return JSON.stringify(atual) !== JSON.stringify({
      tempoPosse: salvo.tempoPosse || '',
      origemPosse: salvo.origemPosse || '',
      tipoUsucapiao: salvo.tipoUsucapiao || '',
      detalhesPosse: salvo.detalhesPosse || '',
      anuenteVizinhos: !!salvo.anuenteVizinhos
    });
  };

  const salvarLocal = () => {
    onChangeImovel({
      ...imovel,
      dadosUsucapiao: obterDadosAtuais()
    });
    setMsg('Dados de Usucapião salvos!');
    setTimeout(() => setMsg(''), 3000);
  };

  const fecharComVerificacao = async () => {
    if (verificarModificado()) {
      const fecharSemSalvar = await confirmar({
        titulo: 'Alterações pendentes',
        mensagem: 'Você fez alterações nos dados de usucapião. Deseja fechar e descartar as alterações?',
        okLabel: 'Descartar e Fechar',
        perigo: true
      });
      if (!fecharSemSalvar) return;
    }
    onOpenChange(false);
  };

  // Presets de preenchimento rápido
  const carregarExtraordinaria = () => {
    setTempoPosse('15 anos');
    setOrigemPosse('Posse mansa, pacífica e ininterrupta exercida com animus domini sem oposição de terceiros desde 2011.');
    setTipoUsucapiao('Usucapião Extraordinária (Art. 1.238 CC)');
    setDetalhesPosse('O requerente realizou benfeitorias físicas, cercamento perimétrico, manutenção contínua e edificação no imóvel.');
    setAnuenteVizinhos(true);
    setMsg('Cenário Usucapião Extraordinária (15 Anos) carregado!');
    setTimeout(() => setMsg(''), 3000);
  };

  const carregarUrbana = () => {
    setTempoPosse('5 anos');
    setOrigemPosse('Cessão de direitos possessórios com moradia familiar ininterrupta.');
    setTipoUsucapiao('Usucapião Urbana Especial (Art. 1.240 CC)');
    setDetalhesPosse('Imóvel urbano com área inferior a 250m² utilizado exclusivamente para moradia da família, sem proprietário possuir outro imóvel.');
    setAnuenteVizinhos(true);
    setMsg('Cenário Usucapião Urbana Especial (5 Anos) carregado!');
    setTimeout(() => setMsg(''), 3000);
  };

  const carregarRural = () => {
    setTempoPosse('5 anos');
    setOrigemPosse('Posse contínua para produção agrícola familiar e moradia no campo.');
    setTipoUsucapiao('Usucapião Rural Especial (Art. 1.239 CC)');
    setDetalhesPosse('Imóvel rural com área de até 50 hectares tornado produtivo pelo trabalho do requerente e de sua família.');
    setAnuenteVizinhos(true);
    setMsg('Cenário Usucapião Rural Pro Labore (5 Anos) carregado!');
    setTimeout(() => setMsg(''), 3000);
  };

  const baixarLaudo = () => {
    const doc = gerarPdfLaudoUsucapiao(imovel, esc, tecnico, obterDadosAtuais());
    doc.save(`${imovel.denominacao || 'imovel'}_laudo_tecnico_usucapiao.pdf`);
  };

  const baixarLaudoDocx = async () => {
    const { gerarDocxLaudoUsucapiao } = await import('@/lib/export/usucapiao');
    const { saveAs } = await import('file-saver');
    const blob = await gerarDocxLaudoUsucapiao(imovel, esc, tecnico, obterDadosAtuais());
    saveAs(blob, `${imovel.denominacao || 'imovel'}_laudo_tecnico_usucapiao.docx`);
  };

  const baixarAta = () => {
    const doc = gerarPdfAtaPosse(imovel, esc, tecnico, obterDadosAtuais());
    doc.save(`${imovel.denominacao || 'imovel'}_ata_declaracao_posse.pdf`);
  };

  const baixarAtaDocx = async () => {
    const { gerarDocxAtaPosse } = await import('@/lib/export/usucapiao');
    const { saveAs } = await import('file-saver');
    const blob = await gerarDocxAtaPosse(imovel, esc, tecnico, obterDadosAtuais());
    saveAs(blob, `${imovel.denominacao || 'imovel'}_ata_declaracao_posse.docx`);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) fecharComVerificacao(); else onOpenChange(val); }}>
      <DialogContent className="w-[96vw] sm:w-[92vw] max-w-[780px] max-h-[92vh] flex flex-col p-4 sm:p-6 overflow-hidden shadow-2xl" onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="shrink-0 flex flex-row items-center justify-between border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-base font-extrabold uppercase tracking-wide text-foreground">
            <Scale className="size-5 text-indigo-500 shrink-0" /> Módulo de Usucapião &amp; Posse (Provimento 65/2017 CNJ)
          </DialogTitle>
          <div className="flex items-center gap-2">
            {msg && <span className="text-xs font-bold text-indigo-500 animate-pulse">{msg}</span>}
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs" onClick={salvarLocal}>
              Salvar Rascunho
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-2 text-xs sm:text-sm">
          {/* Presets de Carregamento Rápido */}
          <div className="space-y-1.5 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
            <span className="text-xs font-extrabold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide flex items-center gap-1.5">
              <Play className="size-3.5" /> Preenchimento Rápido por Modalidade Legal:
            </span>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={carregarExtraordinaria}
                className="px-2.5 py-1.5 rounded-md bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-all"
              >
                Extraordinária (15 Anos - Art. 1.238 CC)
              </button>
              <button
                type="button"
                onClick={carregarUrbana}
                className="px-2.5 py-1.5 rounded-md bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-all"
              >
                Urbana Especial (5 Anos - Art. 1.240 CC)
              </button>
              <button
                type="button"
                onClick={carregarRural}
                className="px-2.5 py-1.5 rounded-md bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-all"
              >
                Rural / Pro Labore (5 Anos - Art. 1.239 CC)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Tempo de Posse Ininterrupta (Anos)</Label>
              <Input
                placeholder="Ex: 15 anos"
                value={tempoPosse}
                onChange={(e) => setTempoPosse(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Modalidade de Usucapião</Label>
              <select
                className="w-full h-9 rounded-md border bg-background px-3 text-xs font-medium text-foreground focus:ring-1 focus:ring-indigo-500"
                value={tipoUsucapiao}
                onChange={(e) => setTipoUsucapiao(e.target.value)}
              >
                <option value="">Selecione a modalidade...</option>
                <option value="Usucapião Extrajudicial (Art. 216-A LRP / Provimento 65 CNJ)">Usucapião Extrajudicial (Art. 216-A LRP / Provimento 65 CNJ)</option>
                <option value="Usucapião Extraordinária (Art. 1.238 CC)">Usucapião Extraordinária (Art. 1.238 CC)</option>
                <option value="Usucapião Ordinária (Art. 1.242 CC)">Usucapião Ordinária (Art. 1.242 CC)</option>
                <option value="Usucapião Urbana Especial (Art. 1.240 CC)">Usucapião Urbana Especial (Art. 1.240 CC)</option>
                <option value="Usucapião Rural Especial (Art. 1.239 CC)">Usucapião Rural Especial (Art. 1.239 CC)</option>
                <option value="Usucapião Familiar (Art. 1.240-A CC)">Usucapião Familiar (Art. 1.240-A CC)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Origem e Justo Título da Posse</Label>
            <Input
              placeholder="Ex: Contrato particular de cessão de direitos possessórios, recibo de compra e venda..."
              value={origemPosse}
              onChange={(e) => setOrigemPosse(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Detalhes da Posse e Provas Fáticas</Label>
            <textarea
              className="flex min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
              rows={4}
              placeholder="Descreva as benfeitorias, edificações, cercamento, comprovantes de IPTU/ITR ou contas de energia que atestam a posse contínua..."
              value={detalhesPosse}
              onChange={(e) => setDetalhesPosse(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2 pt-1 border-t">
            <input
              type="checkbox"
              id="anuente"
              checked={anuenteVizinhos}
              onChange={(e) => setAnuenteVizinhos(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <Label htmlFor="anuente" className="text-xs font-semibold cursor-pointer">
              Confrontantes anuentes declararam anuência formal de divisas (Planta de Confrontantes assinada)
            </Label>
          </div>

          {/* Checklist Cartorário CNJ 65/2017 */}
          <div className="p-3 border rounded-xl bg-card space-y-2 text-xs">
            <span className="font-extrabold uppercase text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <FileCheck className="size-4" /> Checklist de Protocolo Extrajudicial no Cartório de Imóveis (CNJ 65/2017)
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" /> Planta &amp; Memorial Descritivo com ART/TRT.
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" /> Ata Notarial lavrada no Tabelionato de Notas.
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" /> Certidões Negativas Cíveis (Estadual e Federal).
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" /> Anuência ou Notificação dos Confrontantes.
              </div>
            </div>
          </div>
        </div>

        {/* BOTOES COM CORES SOLIDADAS DE ALTO CONTRASTE */}
        <div className="pt-3 border-t flex flex-wrap gap-2 justify-end shrink-0 bg-card">
          <Button className="bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs gap-1.5 shrink-0" onClick={baixarAta}>
            <Download className="size-4" /> Ata de Posse (PDF)
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 shrink-0" onClick={baixarAtaDocx}>
            <Download className="size-4" /> Ata de Posse (Word)
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 shrink-0" onClick={baixarLaudoDocx}>
            <Download className="size-4" /> Laudo de Usucapião (Word)
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shrink-0" onClick={baixarLaudo}>
            <Download className="size-4" /> Laudo de Usucapião (PDF)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
