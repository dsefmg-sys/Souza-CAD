'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { registrarDialogos, type ChoiceOpts } from '@/lib/ui/dialogos';

type Estado =
  | { modo: 'confirm'; titulo: string; mensagem: string; okLabel: string; cancelLabel: string; perigo: boolean; resolve: (b: boolean) => void }
  | { modo: 'alert'; titulo: string; mensagem: string; okLabel: string; resolve: () => void }
  | { modo: 'prompt'; titulo: string; mensagem: string; valor: string; placeholder: string; resolve: (v: string | null) => void }
  | { modo: 'choice'; titulo: string; mensagem: string; opcoes: ChoiceOpts['opcoes']; cancelLabel: string; resolve: (v: string | null) => void };

// Renderiza os diálogos próprios do app. Montado uma vez no layout; registra o tratador que
// `lib/ui/dialogos` usa. Sempre resolve a Promise (nunca deixa quem chamou esperando pra sempre).
export default function DialogosHost() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    registrarDialogos({
      confirmar: (o) => new Promise((resolve) => setEstado({ modo: 'confirm', titulo: o.titulo ?? 'Confirmar', mensagem: o.mensagem, okLabel: o.okLabel ?? 'Sim', cancelLabel: o.cancelLabel ?? 'Cancelar', perigo: !!o.perigo, resolve })),
      avisar: (o) => new Promise((resolve) => setEstado({ modo: 'alert', titulo: o.titulo ?? 'Aviso', mensagem: o.mensagem, okLabel: o.okLabel ?? 'Entendi', resolve })),
      perguntar: (o) => new Promise((resolve) => setEstado({ modo: 'prompt', titulo: o.titulo ?? 'Digite', mensagem: o.mensagem ?? '', valor: o.valorInicial ?? '', placeholder: o.placeholder ?? '', resolve })),
      escolher: (o) => new Promise((resolve) => setEstado({ modo: 'choice', titulo: o.titulo ?? 'Escolha uma opção', mensagem: o.mensagem, opcoes: o.opcoes, cancelLabel: o.cancelLabel ?? 'Cancelar', resolve })),
    });
    return () => registrarDialogos(null);
  }, []);

  if (!estado) return null;

  const responder = (v: boolean | string | null) => {
    const e = estado;
    setEstado(null);
    if (e.modo === 'confirm') e.resolve(v === true);
    else if (e.modo === 'alert') e.resolve();
    else if (e.modo === 'choice') e.resolve(v as string | null);
    else e.resolve(v === false ? null : (v as string | null));
  };
  const cancelarPorFora = () => responder(estado!.modo === 'confirm' ? false : estado!.modo === 'prompt' || estado!.modo === 'choice' ? null : true);

  return (
    <Dialog open onOpenChange={(o) => { if (!o) cancelarPorFora(); }}>
      <DialogContent className="max-w-md" onEscapeKeyDown={cancelarPorFora}>
        <DialogHeader>
          <DialogTitle className={estado.modo === 'confirm' && estado.perigo ? 'text-destructive' : undefined}>{estado.titulo}</DialogTitle>
        </DialogHeader>

        {estado.mensagem && <p className="whitespace-pre-line text-sm text-muted-foreground">{estado.mensagem}</p>}

        {estado.modo === 'prompt' && (
          <input ref={inputRef} autoFocus className="w-full rounded-sm border bg-background px-3 py-2 text-sm" placeholder={estado.placeholder}
            value={estado.valor} onChange={(e) => setEstado((s) => (s && s.modo === 'prompt' ? { ...s, valor: e.target.value } : s))}
            onKeyDown={(e) => { if (e.key === 'Enter') responder(estado.valor); }} />
        )}

        {estado.modo === 'choice' ? (
          <div className="mt-1 flex flex-col gap-2">
            {estado.opcoes.map((op) => (
              <Button key={op.chave} variant={op.variant ?? 'default'} className="h-10 w-full justify-center text-sm" onClick={() => responder(op.chave)}>
                {op.label}
              </Button>
            ))}
            <Button variant="ghost" size="sm" className="mt-1 w-full text-muted-foreground" onClick={() => responder(null)}>
              {estado.cancelLabel}
            </Button>
          </div>
        ) : (
          <div className="mt-2 flex justify-end gap-2">
            {estado.modo !== 'alert' && (
              <Button variant="outline" size="sm" onClick={() => responder(estado.modo === 'confirm' ? false : null)}>
                {estado.modo === 'confirm' ? estado.cancelLabel : 'Cancelar'}
              </Button>
            )}
            <Button size="sm" variant={estado.modo === 'confirm' && estado.perigo ? 'destructive' : 'default'}
              onClick={() => responder(estado.modo === 'prompt' ? estado.valor : true)}>
              {estado.modo === 'alert' ? estado.okLabel : estado.modo === 'confirm' ? estado.okLabel : 'OK'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
