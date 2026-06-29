'use client';

import { useEffect, useState } from 'react';
import {
  GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut as fbSignOut, onAuthStateChanged, type User,
} from 'firebase/auth';
import { auth, firebaseConfigurado } from './client';

export { firebaseConfigurado };

export async function entrarGoogle(): Promise<void> {
  const a = auth();
  if (!a) throw new Error('Firebase não configurado.');
  await signInWithPopup(a, new GoogleAuthProvider());
}
export async function entrarEmail(email: string, senha: string): Promise<void> {
  const a = auth();
  if (!a) throw new Error('Firebase não configurado.');
  await signInWithEmailAndPassword(a, email, senha);
}
export async function cadastrarEmail(email: string, senha: string): Promise<void> {
  const a = auth();
  if (!a) throw new Error('Firebase não configurado.');
  await createUserWithEmailAndPassword(a, email, senha);
}
export async function sair(): Promise<void> {
  const a = auth();
  if (a) await fbSignOut(a);
}

/** Traduz os erros mais comuns do Firebase Auth em dicas acionáveis. */
export function traduzErroAuth(msg: string): string {
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

/** Hook do usuário atual. `carregando` enquanto o Firebase resolve a sessão inicial. */
export function useAuth(): { user: User | null; carregando: boolean; disponivel: boolean } {
  const [user, setUser] = useState<User | null>(null);
  const [carregando, setCarregando] = useState(firebaseConfigurado);
  useEffect(() => {
    const a = auth();
    if (!a) { setCarregando(false); return; }
    const off = onAuthStateChanged(a, (u) => { setUser(u); setCarregando(false); });
    return () => off();
  }, []);
  return { user, carregando, disponivel: firebaseConfigurado };
}
