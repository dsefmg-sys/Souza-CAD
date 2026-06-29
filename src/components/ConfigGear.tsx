'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Settings, LogOut } from 'lucide-react';
import { useAuth, sair } from '@/lib/firebase/auth';

/** Engrenagem flutuante (canto inferior esquerdo): Configurações + Sair (logout). */
export default function ConfigGear() {
  const { user, disponivel } = useAuth();
  const [aberto, setAberto] = useState(false);
  return (
    <div className="no-print fixed bottom-3 left-3 z-[1100]">
      {aberto && (
        <>
          <div className="fixed inset-0" onClick={() => setAberto(false)} />
          <div className="absolute bottom-12 left-0 w-56 rounded-md border bg-background p-1 shadow-lg">
            {disponivel && user && (
              <div className="truncate border-b px-2 py-1 text-[11px] text-muted-foreground" title={user.email ?? ''}>{user.email}</div>
            )}
            <Link href="/configuracoes" onClick={() => setAberto(false)}
              className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent">
              <Settings className="size-4" /> Configurações
            </Link>
            {disponivel && user && (
              <button onClick={async () => { setAberto(false); await sair(); }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-destructive hover:bg-accent">
                <LogOut className="size-4" /> Sair
              </button>
            )}
          </div>
        </>
      )}
      <button onClick={() => setAberto((o) => !o)} title="Configurações e conta"
        className="flex size-10 items-center justify-center rounded-full border bg-background/95 text-muted-foreground shadow-md hover:text-foreground [&_svg]:size-5">
        <Settings />
      </button>
    </div>
  );
}
