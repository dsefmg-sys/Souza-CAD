import type { ModoTratamentoAusente } from '../topo/types';

export interface CampoFaltante {
  label: string;
  ausente: boolean;
}

export interface EscolherOpcao<T extends string = string> {
  chave: T;
  label: string;
  variant?: 'default' | 'destructive' | 'outline';
}

export interface EscolherConfig<T extends string = string> {
  titulo: string;
  mensagem: string;
  opcoes: EscolherOpcao<T>[];
  cancelLabel?: string;
}

/**
 * Pergunta interativamente ao usuário como tratar os campos em branco antes de gerar um documento:
 * 1. Marcar com "DADO AUSENTE" em vermelho no documento;
 * 2. Omitir dados e ajustar o texto fluidamente (sem lacunas quebradas);
 * 3. Cancelar para voltar e preencher.
 */
export async function perguntarTratamentoAusentes(
  campos: CampoFaltante[],
  escolher: <T extends string>(config: EscolherConfig<T>) => Promise<T | null>
): Promise<ModoTratamentoAusente | 'cancelar'> {
  const faltantes = campos.filter((c) => c.ausente).map((c) => c.label);
  if (faltantes.length === 0) return 'omitir'; // Sem ausências

  const listaStr = faltantes.join(', ');
  const resposta = await escolher({
    titulo: 'Campos Não Preenchidos no Cadastro',
    mensagem: `Os seguintes campos estão em branco: ${listaStr}.\n\n` +
      `Posso marcar os campos faltantes com "DADO AUSENTE" em vermelho no documento, ou prefere omiti-los e ajustar o texto de forma fluida sem deixar lacunas?`,
    opcoes: [
      { chave: 'dado_ausente', label: 'Sim, marcar com DADO AUSENTE (vermelho)', variant: 'destructive' },
      { chave: 'omitir', label: 'Não, omitir dados e ajustar o texto', variant: 'default' },
    ],
    cancelLabel: 'Voltar e preencher',
  });

  if (resposta === 'dado_ausente') return 'dado_ausente';
  if (resposta === 'omitir') return 'omitir';
  return 'cancelar';
}
