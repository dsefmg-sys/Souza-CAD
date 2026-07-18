import { useState, useEffect } from 'react';

/**
 * Hook para detectar telas estreitas (ex.: smartphones / mobile portrait < 768px).
 */
export function useTelaEstreita(): boolean {
  const [telaEstreita, setTelaEstreita] = useState(false);

  useEffect(() => {
    const check = () => setTelaEstreita(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return telaEstreita;
}
