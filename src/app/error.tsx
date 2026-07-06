'use client';

// Rede de segurança da ROTA (padrão do Next App Router): se algo inesperado quebrar durante o
// render, em vez de tela branca aparece este aviso claro, com "tentar de novo" (reaproveita o
// estado, sem recarregar) e "recarregar a página". O trabalho local não se perde: o app salva um
// rascunho no navegador ao sair, e os projetos ficam no banco. Aditivo — não altera o editor.
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('Erro na rota:', error); }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <div className="max-w-md space-y-3">
        <h1 className="text-lg font-bold text-foreground">Algo inesperado aconteceu</h1>
        <p className="text-sm text-muted-foreground">
          O app encontrou um erro nesta tela, mas o resto continua no lugar. Seu trabalho não se perdeu:
          o projeto fica salvo e há um rascunho local. Tente retomar; se não voltar, recarregue a página.
        </p>
        {error?.message && (
          <p className="rounded-sm border bg-muted/40 px-2 py-1 text-left text-[11px] text-muted-foreground break-words">
            Detalhe técnico: {error.message}
          </p>
        )}
        <div className="flex justify-center gap-2 pt-1">
          <button onClick={() => reset()} className="rounded-md border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted">
            Tentar de novo
          </button>
          <button onClick={() => { if (typeof window !== 'undefined') window.location.reload(); }} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
            Recarregar a página
          </button>
        </div>
      </div>
    </div>
  );
}
