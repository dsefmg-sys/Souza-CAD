'use client';

import { useState, type ReactNode } from 'react';
import { LogIn, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth, entrarGoogle, entrarEmail, cadastrarEmail, traduzErroAuth } from '@/lib/firebase/auth';
import { LogoHorizontal, FundoRedeMarca } from '@/components/Logo';
import { useModoEntrada, definirModoEntrada } from '@/lib/store/loginSkip';
import IntroVideo from '@/components/IntroVideo';

/**
 * Porta de entrada quando o Firebase está configurado. Fluxo em duas telas:
 *  1) BOAS-VINDAS (tela verde): explica o valor da conta e oferece dois caminhos —
 *     "Iniciar" (abre o login) e "Iniciar sem login" (entra direto no app).
 *  2) LOGIN: Google ou e-mail/senha.
 * Sem nuvem (sem variáveis do Firebase), libera direto em modo local. Quem entra sem
 * login vê um aviso na barra inferior do app pedindo pra criar a conta.
 */
export default function AuthGate({ children }: { children: ReactNode }) {
  const { user, carregando, disponivel } = useAuth();
  const modo = useModoEntrada();
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

  async function validarEFazer(fn: () => Promise<void>) {
    if (!email.trim() || !senha.trim()) {
      setErro('Por favor, preencha o e-mail e a senha.');
      return;
    }
    await fazer(fn);
  }

  // TELA 1 — BOAS-VINDAS (verde). Mensagem de apresentação + caminho de entrada.
  if (modo === 'boasVindas') {
    return (
      <div className="relative flex h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-800 via-green-700 to-emerald-900 p-4">
        <div className="relative z-10 w-full max-w-md space-y-6 text-center">
          <LogoHorizontal className="mx-auto h-14" />
          <h1 className="text-2xl font-bold text-white">Bem-vindo ao Souza CAD</h1>
          <p className="text-sm leading-relaxed text-emerald-50/90">
            Através da sua conta de usuário, você poderá gerenciar seus projetos de qualquer lugar
            que estiver, e todas as suas configurações serão salvas, para que você faça o melhor uso
            do software. Você encontrará também um botão de suporte e um campo para sugerir melhorias.
          </p>
          <div className="flex flex-col gap-3 pt-2">
            <Button
              className="w-full bg-emerald-300 text-emerald-950 hover:bg-emerald-200"
              disabled={ocupado}
              onClick={() => { setErro(''); definirModoEntrada('login'); }}
            >
              <LogIn /> Iniciar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // TELA 2 — LOGIN.
  return (
    <div className="relative flex h-screen items-center justify-center p-4">
      <IntroVideo />
      <FundoRedeMarca />
      <div className="relative z-10 w-full max-w-sm space-y-4 rounded-lg border border-white/10 bg-background/95 p-6 shadow-2xl backdrop-blur-sm">
        <div className="space-y-2 text-center">
          <LogoHorizontal className="mx-auto h-12" />
          <p className="text-xs text-muted-foreground">Entre para acessar seus projetos e cadastros na nuvem.</p>
        </div>
        <Button className="w-full" disabled={ocupado} onClick={() => fazer(entrarGoogle)}><LogIn /> Cadastrar / Entrar com Google</Button>
        <div className="text-center text-xs text-muted-foreground">ou com e-mail</div>
        <div className="space-y-2">
          <div className="space-y-1"><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="space-y-1"><Label>Senha</Label><Input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} /></div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" className="flex-1" disabled={ocupado} onClick={() => validarEFazer(() => entrarEmail(email.trim(), senha))}>Entrar</Button>
            <Button size="sm" variant="outline" className="flex-1" disabled={ocupado} onClick={() => validarEFazer(() => cadastrarEmail(email.trim(), senha))}>Criar conta</Button>
          </div>
        </div>
        {erro && <p className="text-xs text-destructive">{erro}</p>}
        <button type="button" className="flex w-full items-center justify-center gap-1 text-center text-[11px] text-muted-foreground hover:text-foreground" onClick={() => { setErro(''); definirModoEntrada('boasVindas'); }}>
          <ArrowLeft className="size-3" /> Voltar
        </button>
      </div>
    </div>
  );
}
