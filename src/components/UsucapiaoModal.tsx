import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Scale, Download, CheckCircle2 } from 'lucide-react';
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
    setMsg('Rascunho de Usucapião salvo!');
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

  const baixarLaudo = () => {
    const doc = gerarPdfLaudoUsucapiao(imovel, esc, tecnico, {
      tempoPosse,
      origemPosse,
      tipoUsucapiao,
      detalhesPosse,
      anuenteVizinhos
    });
    doc.save(`${imovel.denominacao || 'imovel'}_laudo_tecnico_usucapiao.pdf`);
  };

  const baixarLaudoDocx = async () => {
    const { gerarDocxLaudoUsucapiao } = await import('@/lib/export/usucapiao');
    const { saveAs } = await import('file-saver');
    const blob = await gerarDocxLaudoUsucapiao(imovel, esc, tecnico, {
      tempoPosse,
      origemPosse,
      tipoUsucapiao,
      detalhesPosse,
      anuenteVizinhos
    });
    saveAs(blob, `${imovel.denominacao || 'imovel'}_laudo_tecnico_usucapiao.docx`);
  };

  const baixarAta = () => {
    const doc = gerarPdfAtaPosse(imovel, esc, tecnico, {
      tempoPosse,
      origemPosse,
      tipoUsucapiao,
      detalhesPosse,
      anuenteVizinhos
    });
    doc.save(`${imovel.denominacao || 'imovel'}_ata_declaracao_posse.pdf`);
  };

  const baixarAtaDocx = async () => {
    const { gerarDocxAtaPosse } = await import('@/lib/export/usucapiao');
    const { saveAs } = await import('file-saver');
    const blob = await gerarDocxAtaPosse(imovel, esc, tecnico, {
      tempoPosse,
      origemPosse,
      tipoUsucapiao,
      detalhesPosse,
      anuenteVizinhos
    });
    saveAs(blob, `${imovel.denominacao || 'imovel'}_ata_declaracao_posse.docx`);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) fecharComVerificacao(); else onOpenChange(val); }}>
      <DialogContent className="w-[96vw] sm:w-[92vw] max-w-[750px] max-h-[92vh] flex flex-col p-4 sm:p-6 overflow-hidden shadow-2xl" onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="shrink-0 flex flex-row items-center justify-between border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-base font-extrabold uppercase tracking-wide text-foreground">
            <Scale className="size-5 text-indigo-500 shrink-0" /> Módulo de Usucapião &amp; Posse
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
              <Label className="text-xs font-bold">Tempo de Posse Ininterrupta (anos)</Label>
              <Input
                placeholder="Ex: 15 anos"
                value={tempoPosse}
                onChange={(e) => setTempoPosse(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Modalidade de Usucapião</Label>
              <select
                className="w-full rounded-md border bg-background px-3 py-1.5 text-xs font-medium text-foreground focus:ring-1 focus:ring-indigo-500 mb-1"
                value={
                  [
                    'Usucapião Extrajudicial (Art. 216-A LRP / Provimento 65 CNJ)',
                    'Usucapião Extraordinária (Art. 1.238 CC)',
                    'Usucapião Ordinária (Art. 1.242 CC)',
                    'Usucapião Especial Rural / Pro Labore (Art. 1.239 CC / Art. 191 CF)',
                    'Usucapião Especial Urbana / Pro Misero (Art. 1.240 CC / Art. 183 CF)',
                    'Usucapião Familiar (Art. 1.240-A CC)',
                    'Usucapião Coletiva (Art. 10 Lei 10.257/01)'
                  ].includes(tipoUsucapiao) ? tipoUsucapiao : 'personalizado'
                }
                onChange={(e) => {
                  if (e.target.value !== 'personalizado') {
                    setTipoUsucapiao(e.target.value);
                  }
                }}
              >
                <option value="Usucapião Extrajudicial (Art. 216-A LRP / Provimento 65 CNJ)">Usucapião Extrajudicial (Art. 216-A LRP / Provimento 65 CNJ)</option>
                <option value="Usucapião Extraordinária (Art. 1.238 CC)">Usucapião Extraordinária (Art. 1.238 CC)</option>
                <option value="Usucapião Ordinária (Art. 1.242 CC)">Usucapião Ordinária (Art. 1.242 CC)</option>
                <option value="Usucapião Especial Rural / Pro Labore (Art. 1.239 CC / Art. 191 CF)">Usucapião Especial Rural / Pro Labore (Art. 1.239 CC)</option>
                <option value="Usucapião Especial Urbana / Pro Misero (Art. 1.240 CC / Art. 183 CF)">Usucapião Especial Urbana / Pro Misero (Art. 1.240 CC)</option>
                <option value="Usucapião Familiar (Art. 1.240-A CC)">Usucapião Familiar (Art. 1.240-A CC)</option>
                <option value="Usucapião Coletiva (Art. 10 Lei 10.257/01)">Usucapião Coletiva (Art. 10 Lei 10.257/01)</option>
                <option value="personalizado">Personalizado / Digitar Texto Manual...</option>
              </select>
              <Input
                placeholder="Ou digite/ajuste a modalidade de usucapião manualmente"
                value={tipoUsucapiao}
                onChange={(e) => setTipoUsucapiao(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Origem/Histórico da Posse</Label>
              <Input
                placeholder="Ex: Cessão de direitos possessórios, sucessão familiar"
                value={origemPosse}
                onChange={(e) => setOrigemPosse(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="anuente"
                checked={anuenteVizinhos}
                onChange={(e) => setAnuenteVizinhos(e.target.checked)}
                className="size-4 cursor-pointer"
              />
              <Label htmlFor="anuente" className="font-bold cursor-pointer flex items-center gap-1">
                <CheckCircle2 className="size-4 text-emerald-500" /> Vizinhos Anuentes das Divisas
              </Label>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Descrição dos Fatos, Benfeitorias e Delimitação</Label>
            <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y"
              rows={5}
              placeholder="Descreva detalhes como moradia construída, plantações, cercas de divisa bem consolidadas e ausência de contestações históricas..."
              value={detalhesPosse}
              onChange={(e) => setDetalhesPosse(e.target.value)}
            />
          </div>

          <div className="pt-4 border-t flex flex-wrap gap-2 justify-end">
            <Button className="bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs gap-1.5" onClick={baixarAta}>
              <Download className="size-4" /> Ata de Posse (PDF)
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5" onClick={baixarAtaDocx}>
              <Download className="size-4" /> Ata de Posse (Word)
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 text-xs" onClick={baixarLaudo}>
              <Download className="size-4" /> Laudo de Usucapião (PDF)
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 text-xs" onClick={baixarLaudoDocx}>
              <Download className="size-4" /> Laudo de Usucapião (Word)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
