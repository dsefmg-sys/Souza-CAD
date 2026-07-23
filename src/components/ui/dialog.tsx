import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;

export interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  onMinimize?: () => void;
}

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, onMinimize, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-[5000] bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // borda clara + anel + sombra forte: garante contraste com o fundo mesmo quando a janela
        // tem cor parecida com a página (ex.: Gestão do Projeto)
        'mobile-conforto fixed left-1/2 top-1/2 z-[5000] grid w-[calc(100vw-1rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 gap-3 border-2 border-white/80 dark:border-white/25 ring-1 ring-black/20 bg-background p-4 sm:p-5 shadow-2xl rounded-lg max-h-[92vh] overflow-auto',
        className
      )}
      {...props}
    >
      {children}
      <div className="absolute right-3.5 top-3.5 flex items-center gap-1 z-50">
        {onMinimize && (
          <button
            type="button"
            onClick={onMinimize}
            className="p-1 rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-muted/70 transition-colors"
            title="Minimizar janela (manter na barra de lembretes no rodapé)"
          >
            <Minus className="size-4" />
          </button>
        )}
        <DialogPrimitive.Close className="p-1 rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-muted/70 transition-colors">
          <X className="size-4" />
        </DialogPrimitive.Close>
      </div>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = 'DialogContent';

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1 pr-12 sm:pr-14', className)} {...props} />;
}
export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <DialogPrimitive.Title className={cn('text-lg font-semibold pr-12 sm:pr-14', className)} {...props} />;
}
