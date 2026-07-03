import type { TecnicoData } from './types';

// Decide as siglas certas conforme o conselho do responsável técnico.
// Técnico em agrimensura: registra no CFT/CRT e emite TRT (Termo de Responsabilidade Técnica).
// Engenheiro (agrimensor/civil/agrônomo): registra no CREA e emite ART (Anotação de Responsabilidade
// Técnica). Um app só serve os dois se trocar essas siglas nas peças em vez de fixar "técnico/TRT".

export type Conselho = 'CFT' | 'CREA';

export interface RotulosProfissional {
  /** Conselho (CFT do técnico ou CREA do engenheiro). */
  conselho: Conselho;
  /** Rótulo do nº de registro no conselho — sempre igual ao próprio conselho. */
  registro: Conselho;
  /** Sigla do termo de responsabilidade: TRT (técnico) ou ART (engenheiro). */
  termo: 'TRT' | 'ART';
  /** Nome por extenso do termo, pra textos de ajuda/onboarding. */
  termoExtenso: string;
}

/** Ausência de conselho = CFT (técnico), pra não quebrar projetos e cadastros já existentes. */
export function rotulosProfissional(tec: Pick<TecnicoData, 'conselho'> | undefined | null): RotulosProfissional {
  const eng = tec?.conselho === 'CREA';
  return eng
    ? { conselho: 'CREA', registro: 'CREA', termo: 'ART', termoExtenso: 'Anotação de Responsabilidade Técnica' }
    : { conselho: 'CFT', registro: 'CFT', termo: 'TRT', termoExtenso: 'Termo de Responsabilidade Técnica' };
}
