'use client';

import { useEffect } from 'react';
import { aplicarEscalaFonte } from '@/lib/store/preferencias';

/**
 * Aplica o tema salvo (claro/escuro) e o tamanho do texto em QUALQUER página, no
 * carregamento. Antes, só a tela principal aplicava o tema, então Dados/Config (e recargas)
 * voltavam para o claro.
 */
export default function ThemeInit() {
  useEffect(() => {
    try {
      const t = localStorage.getItem('metrica.tema');
      // padrão é ESCURO: só fica claro se o usuário escolheu explicitamente "claro"
      document.documentElement.classList.toggle('dark', t !== 'claro');
    } catch { document.documentElement.classList.add('dark'); }
    aplicarEscalaFonte();
  }, []);
  return null;
}
