'use client';

import { useEffect } from 'react';

/**
 * Aplica o tema salvo (claro/escuro) em QUALQUER página, no carregamento. Antes, só a tela
 * principal aplicava o tema, então Dados/Config (e recargas) voltavam para o claro.
 */
export default function ThemeInit() {
  useEffect(() => {
    try {
      const t = localStorage.getItem('metrica.tema');
      document.documentElement.classList.toggle('dark', t === 'escuro');
    } catch { /* ignore */ }
  }, []);
  return null;
}
