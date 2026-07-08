'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // borda clara + anel + sombra forte: garante contraste com o fundo mesmo quando a janela
        // tem cor parecida com a página (ex.: Gestão do Projeto)
        // No celular a janela ganha uma margem lateral (não cola nas bordas) e menos padding, pra
        // parecer feita pra mobile; no desktop mantém o max-w e o respiro maiores.
        'fixed left-1/2 top-1/2 z-50 grid w-[calc(100vw-1rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 gap-3 border-2 border-white/80 dark:border-white/25 ring-1 ring-black/20 bg-background p-4 sm:p-5 shadow-2xl rounded-lg max-h-[92vh] overflow-auto',
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 opacity-70 hover:opacity-100">
        <X className="size-4" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = 'DialogContent';

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1', className)} {...props} />;
}
export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <DialogPrimitive.Title className={cn('text-lg font-semibold', className)} {...props} />;
}
