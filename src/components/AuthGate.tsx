'use client';

import { useState, type ReactNode } from 'react';
import { LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth, entrarGoogle, entrarEmail, cadastrarEmail, traduzErroAuth } from '@/lib/firebase/auth';

/**
 * Exige login na entrada quando o Firebase está configurado. Sem nuvem (sem variáveis), libera
 * direto em modo local. Há uma saída discreta "usar sem login (local)" para nunca travar o dono
 * caso os provedores ainda não estejam ativos no console.
 */
export default function AuthGate({ children }: { children: ReactNode }) {
  const { user, carregando, disponivel } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [local, setLocal] = useState(false);

  // Sem Firebase configurado → segue local. Logado ou escolheu local → entra.
  if (!disponivel || user || local) return <>{children}</>;
  if (carregando) {
    return <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">Carregando…</div>;
  }

  async function fazer(fn: () => Promise<void>) {
    setErro(''); setOcupado(true);
    try { await fn(); } catch (e) { setErro(traduzErroAuth((e as Error).message)); } finally { setOcupado(false); }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-lg border bg-background p-6 shadow-lg">
        <div className="space-y-1 text-center">
          <div className="text-lg font-semibold">Souza CAD</div>
          <p className="text-xs text-muted-foreground">Entre para acessar seus projetos e cadastros na nuvem.</p>
        </div>
        <Button className="w-full" disabled={ocupado} onClick={() => fazer(entrarGoogle)}><LogIn /> Entrar com Google</Button>
        <div className="text-center text-xs text-muted-foreground">ou com e-mail</div>
        <div className="space-y-2">
          <div className="space-y-1"><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="space-y-1"><Label>Senha</Label><Input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} /></div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" className="flex-1" disabled={ocupado} onClick={() => fazer(() => entrarEmail(email, senha))}>Entrar</Button>
            <Button size="sm" variant="outline" className="flex-1" disabled={ocupado} onClick={() => fazer(() => cadastrarEmail(email, senha))}>Criar conta</Button>
          </div>
        </div>
        {erro && <p className="text-xs text-destructive">{erro}</p>}
        <button className="block w-full text-center text-[11px] text-muted-foreground hover:underline" onClick={() => setLocal(true)}>
          usar sem login (somente neste navegador)
        </button>
      </div>
    </div>
  );
}
