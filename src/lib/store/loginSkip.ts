'use client';

import { useSyncExternalStore } from 'react';

/**
 * Controlador simples e compartilhado da porta de entrada (AuthGate). Fica fora do React
 * pra que a barra inferior do app (dentro de page.tsx) também consiga comandá-lo:
 *  - 'boasVindas' → tela verde de apresentação
 *  - 'login'      → formulário de login
 *  - 'semLogin'   → entrou sem login; o app libera e mostra o aviso pra criar a conta
 * A barra inferior lê este modo pra decidir o aviso e, ao clicar, manda direto pro 'login'.
 */
export type ModoEntrada = 'login' | 'semLogin';

let modo: ModoEntrada = 'login';
const inscritos = new Set<() => void>();

export function definirModoEntrada(valor: ModoEntrada): void {
  if (modo === valor) return;
  modo = valor;
  inscritos.forEach((f) => f());
}

export function useModoEntrada(): ModoEntrada {
  return useSyncExternalStore(
    (cb) => { inscritos.add(cb); return () => inscritos.delete(cb); },
    () => modo,
    () => 'login',
  );
}
