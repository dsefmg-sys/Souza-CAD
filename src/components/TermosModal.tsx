'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldCheck } from 'lucide-react';
import { TERMOS, TERMOS_VERSAO, TERMOS_TITULAR } from '@/lib/legal/termos';
import { aceitarTermos } from '@/lib/store/perfilUso';

interface Props {
  open: boolean;
  onAceitar: () => void;
}

/** Aceite OBRIGATÓRIO dos termos ao cadastrar a empresa / primeiro acesso. Não fecha sem aceitar. */
export default function TermosModal({ open, onAceitar }: Props) {
  const [marcado, setMarcado] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  async function confirmar() {
    setOcupado(true);
    try { await aceitarTermos(); onAceitar(); }
    finally { setOcupado(false); }
  }

  return (
    <Dialog open={open} onOpenChange={() => { /* bloqueado: só sai aceitando */ }}>
      <DialogContent className="flex max-h-[88vh] max-w-2xl flex-col" onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base"><ShieldCheck className="size-5 text-primary" /> Termos de Uso — Souza CAD</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Para cadastrar sua empresa e usar o sistema, leia e aceite os termos abaixo. Titular: <strong>{TERMOS_TITULAR}</strong> · versão {TERMOS_VERSAO}.
        </p>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded border bg-muted/20 p-3 text-sm leading-relaxed">
          {TERMOS.map((s) => (
            <div key={s.titulo}>
              <div className="font-semibold">{s.titulo}</div>
              <p className="text-muted-foreground">{s.texto}</p>
            </div>
          ))}
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-0.5" checked={marcado} onChange={(e) => setMarcado(e.target.checked)} />
          <span>Li e <strong>aceito</strong> os Termos de Uso. Entendo que o sistema é gratuito, sem garantias, que o titular não responde pelos trabalhos que eu gerar, que poderá haver cobrança futura e que os direitos autorais são do titular.</span>
        </label>

        <div className="flex justify-end">
          <Button disabled={!marcado || ocupado} onClick={confirmar}><ShieldCheck className="size-4" /> Aceitar e continuar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
