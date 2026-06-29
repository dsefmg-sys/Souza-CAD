'use client';

import { useState } from 'react';
import { LogIn, LogOut, Cloud, CloudOff } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth, entrarGoogle, entrarEmail, cadastrarEmail, sair } from '@/lib/firebase/auth';

/** Traduz os erros mais comuns do Firebase Auth em dicas acionáveis. */
function traduzErroAuth(msg: string): string {
  const m = (msg || '').toLowerCase();
  if (m.includes('operation-not-allowed') || m.includes('configuration-not-found') || m.includes('identitytoolkit'))
    return 'Login ainda não ativado no Firebase. No console: Authentication → Sign-in method → ative E-mail/senha e Google.';
  if (m.includes('unauthorized-domain'))
    return 'Este endereço não está autorizado. No console: Authentication → Settings → Authorized domains, adicione o domínio.';
  if (m.includes('popup-blocked') || m.includes('popup-closed'))
    return 'O navegador bloqueou a janela do Google. Libere os pop-ups e tente de novo.';
  if (m.includes('invalid-credential') || m.includes('wrong-password') || m.includes('user-not-found'))
    return 'E-mail ou senha incorretos.';
  if (m.includes('email-already-in-use'))
    return 'Esse e-mail já tem conta. Use "Entrar".';
  if (m.includes('weak-password'))
    return 'A senha precisa ter ao menos 6 caracteres.';
  if (m.includes('invalid-email'))
    return 'E-mail inválido.';
  return msg.replace('Firebase: ', '');
}

export default function AuthBar({ onMudou }: { onMudou?: () => void }) {
  const { user, carregando, disponivel } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  if (!disponivel) {
    return <span className="flex items-center gap-1 text-xs text-muted-foreground" title="Sem nuvem — dados salvos só neste navegador"><CloudOff className="size-3.5" /> Local</span>;
  }
  if (carregando) return <span className="text-xs text-muted-foreground">…</span>;

  async function fazer(fn: () => Promise<void>) {
    setErro('');
    try { await fn(); setAberto(false); onMudou?.(); }
    catch (e) { setErro(traduzErroAuth((e as Error).message)); }
  }

  if (user) {
    return (
      <span className="flex items-center gap-2 text-xs">
        <Cloud className="size-3.5 text-primary" />
        <span className="max-w-[140px] truncate text-muted-foreground" title={user.email ?? ''}>{user.email}</span>
        <Button size="sm" variant="ghost" onClick={() => fazer(async () => { await sair(); })} title="Sair"><LogOut /></Button>
      </span>
    );
  }

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setAberto(true)}><LogIn /> Entrar</Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Entrar na nuvem</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Com login, seus projetos e cadastros ficam salvos na nuvem e abrem em qualquer aparelho.</p>
          <Button onClick={() => fazer(entrarGoogle)} className="w-full">Entrar com Google</Button>
          <div className="my-1 text-center text-xs text-muted-foreground">ou com e-mail</div>
          <div className="space-y-2">
            <div className="space-y-1"><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="space-y-1"><Label>Senha</Label><Input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} /></div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" className="flex-1" onClick={() => fazer(() => entrarEmail(email, senha))}>Entrar</Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={() => fazer(() => cadastrarEmail(email, senha))}>Criar conta</Button>
            </div>
          </div>
          {erro && <p className="text-xs text-destructive">{erro}</p>}
        </DialogContent>
      </Dialog>
    </>
  );
}
