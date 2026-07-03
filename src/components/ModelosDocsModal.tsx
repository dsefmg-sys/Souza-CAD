'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, RotateCcw } from 'lucide-react';
import { carregarModelos, salvarModelos, MODELOS_PADRAO, VARIAVEIS_MODELO, type ModelosDocs } from '@/lib/store/modelos';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const CAMPOS: { chave: keyof ModelosDocs; titulo: string }[] = [
  { chave: 'declProprietario', titulo: 'Declaração do(s) proprietário(s) — memorial e planta' },
  { chave: 'declConfrontantes', titulo: 'Declaração dos confrontantes — memorial e planta' },
  { chave: 'laudoTecnico', titulo: 'Laudo técnico — planta' },
  { chave: 'contratoObjeto', titulo: 'Objeto do contrato de prestação de serviços' },
  { chave: 'reciboReferente', titulo: 'Texto "referente a…" do recibo' },
];

// Editor dos modelos de texto das peças. Cada empresa personaliza; as variáveis {chave} são trocadas
// pelos dados reais na geração. A estrutura das peças (tabela, narrativa, assinaturas) segue automática.
export default function ModelosDocsModal({ open, onOpenChange }: Props) {
  const [m, setM] = useState<ModelosDocs>(MODELOS_PADRAO);
  useEffect(() => { if (open) setM(carregarModelos()); }, [open]);

  function set(chave: keyof ModelosDocs, valor: string) {
    const novo = { ...m, [chave]: valor };
    setM(novo); salvarModelos(novo);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileText className="size-5 text-primary" /> Modelos dos documentos</DialogTitle>
        </DialogHeader>

        <div className="rounded border bg-muted/30 p-2 text-[11px]">
          <div className="mb-1 font-semibold">Variáveis disponíveis (o sistema troca pelos dados reais):</div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            {VARIAVEIS_MODELO.map((v) => (
              <span key={v.chave}><code className="rounded bg-background px-1 font-mono text-primary">{v.chave}</code> <span className="text-muted-foreground">{v.descricao}</span></span>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {CAMPOS.map(({ chave, titulo }) => (
            <div key={chave} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">{titulo}</span>
                <button type="button" className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground" onClick={() => set(chave, MODELOS_PADRAO[chave])}><RotateCcw className="size-3" /> restaurar padrão</button>
              </div>
              <textarea
                className="min-h-[70px] w-full rounded border bg-background p-2 text-xs leading-relaxed"
                value={m[chave]}
                onChange={(e) => set(chave, e.target.value)}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Salvo automaticamente. A narrativa do memorial e a estrutura das peças continuam automáticas.</span>
          <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
