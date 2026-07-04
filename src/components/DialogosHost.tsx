'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { registrarDialogos } from '@/lib/ui/dialogos';

type Estado =
  | { modo: 'confirm'; titulo: string; mensagem: string; okLabel: string; cancelLabel: string; perigo: boolean; resolve: (b: boolean) => void }
  | { modo: 'alert'; titulo: string; mensagem: string; okLabel: string; resolve: () => void }
  | { modo: 'prompt'; titulo: string; mensagem: string; valor: string; placeholder: string; resolve: (v: string | null) => void };

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
    });
    return () => registrarDialogos(null);
  }, []);

  if (!estado) return null;

  const responder = (v: boolean | string | null) => {
    const e = estado;
    setEstado(null);
    if (e.modo === 'confirm') e.resolve(v === true);
    else if (e.modo === 'alert') e.resolve();
    else e.resolve(v === false ? null : (v as string | null));
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) responder(estado.modo === 'confirm' ? false : estado.modo === 'prompt' ? null : true); }}>
      <DialogContent className="max-w-md" onEscapeKeyDown={() => responder(estado.modo === 'confirm' ? false : estado.modo === 'prompt' ? null : true)}>
        <DialogHeader>
          <DialogTitle className={estado.modo === 'confirm' && estado.perigo ? 'text-destructive' : undefined}>{estado.titulo}</DialogTitle>
        </DialogHeader>

        {estado.mensagem && <p className="whitespace-pre-line text-sm text-muted-foreground">{estado.mensagem}</p>}

        {estado.modo === 'prompt' && (
          <input ref={inputRef} autoFocus className="w-full rounded border bg-background px-3 py-2 text-sm" placeholder={estado.placeholder}
            value={estado.valor} onChange={(e) => setEstado((s) => (s && s.modo === 'prompt' ? { ...s, valor: e.target.value } : s))}
            onKeyDown={(e) => { if (e.key === 'Enter') responder(estado.valor); }} />
        )}

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
      </DialogContent>
    </Dialog>
  );
}
