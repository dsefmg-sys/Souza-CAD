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
