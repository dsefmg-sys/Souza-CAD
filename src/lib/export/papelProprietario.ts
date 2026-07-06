import type { PapelProprietario } from '../topo/types';

// Texto ÚNICO da qualificação de um titular por papel — usado pelo memorial, pela anuência e pela
// planta, pra as peças do mesmo processo contarem a mesma história.

/** Linha "Na condição de ..." conforme o papel; null quando é proprietário pleno (sem qualificação extra). */
export function qualificacaoPapelProprietario(papel?: PapelProprietario): string | null {
  switch (papel) {
    case 'condomino': return 'Na condição de condômino(a) / coproprietário(a)';
    case 'usufrutuario': return 'Na condição de usufrutuário(a)';
    case 'nu-proprietario': return 'Na condição de nu-proprietário(a)';
    case 'inventariante': return 'Na condição de inventariante do espólio';
    default: return null;
  }
}

/** Rótulo curto do papel (para o carimbo/assinatura da planta). */
export function rotuloPapelProprietario(papel?: PapelProprietario): string {
  switch (papel) {
    case 'condomino': return 'Condômino(a)';
    case 'usufrutuario': return 'Usufrutuário(a)';
    case 'nu-proprietario': return 'Nu-proprietário(a)';
    case 'inventariante': return 'Inventariante do espólio';
    default: return 'Proprietário(a)';
  }
}
