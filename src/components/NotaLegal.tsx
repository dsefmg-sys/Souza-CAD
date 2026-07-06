'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Scale } from 'lucide-react';
import { DISCLAIMER_LEGAL, INSIGHTS_LEGAIS } from '@/lib/legal/educacao';
import { carregarPreferencias } from '@/lib/store/preferencias';

/**
 * Nota de EDUCAÇÃO LEGAL, no ponto da ação. Mostra uma explicação curta (via `chave` do catálogo
 * INSIGHTS_LEGAIS, ou via `children`) e SEMPRE o aviso legal padrão — é apoio, não parecer jurídico.
 * Some quando o usuário desliga "dicas educativas" nas Configurações (a menos que `sempre`), pra
 * não poluir a tela de quem já domina.
 */
export default function NotaLegal({ chave, children, sempre = false }: { chave?: string; children?: ReactNode; sempre?: boolean }) {
  const [mostrar, setMostrar] = useState<boolean | null>(null);
  useEffect(() => { setMostrar(sempre || carregarPreferencias().mostrarDicasEducativas); }, [sempre]);

  if (mostrar === false) return null;
  const texto = children ?? (chave ? INSIGHTS_LEGAIS[chave] : null);
  if (!texto) return null;

  return (
    <div className="flex items-start gap-1.5 rounded-sm border border-amber-500/30 bg-amber-500/5 p-2 text-[10px] leading-snug">
      <Scale className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
      <div className="space-y-1">
        <div className="text-foreground/90">{texto}</div>
        <div className="text-[9px] italic text-muted-foreground">{DISCLAIMER_LEGAL}</div>
      </div>
    </div>
  );
}
