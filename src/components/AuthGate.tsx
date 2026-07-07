'use client';

import { useState, type ReactNode } from 'react';
import { LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth, entrarGoogle, entrarEmail, cadastrarEmail, traduzErroAuth } from '@/lib/firebase/auth';
import { LogoHorizontal, FundoRedeMarca } from '@/components/Logo';
import IntroVideo from '@/components/IntroVideo';

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

  // Login OBRIGATÓRIO quando há nuvem configurada. Sem Firebase (ambiente sem variáveis), segue local.
  if (!disponivel || user) return <>{children}</>;
  if (carregando) {
    // Tela de carregamento NEUTRA (preta), sem a arte estática — assim nenhuma imagem aparece antes
    // do vídeo de abertura, que também começa no preto. A transição fica limpa: preto → vídeo.
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <span className="text-xs font-medium tracking-wide text-white/40">Carregando…</span>
      </div>
    );
  }

  async function fazer(fn: () => Promise<void>) {
    setErro(''); setOcupado(true);
    try { await fn(); } catch (e) { setErro(traduzErroAuth((e as Error).message)); } finally { setOcupado(false); }
  }

  return (
    <div className="relative flex h-screen items-center justify-center p-4">
      <IntroVideo />
      <FundoRedeMarca />
      <div className="relative z-10 w-full max-w-sm space-y-4 rounded-lg border border-white/10 bg-background/95 p-6 shadow-2xl backdrop-blur-sm">
        <div className="space-y-2 text-center">
          <LogoHorizontal className="mx-auto h-12" />
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
        <p className="text-center text-[11px] text-muted-foreground">
          Entre com sua conta para acessar seus projetos e as configurações da empresa.
        </p>
      </div>
    </div>
  );
}
