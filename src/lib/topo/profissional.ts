import type { TecnicoData } from './types';

// Decide as siglas certas conforme o conselho do responsável técnico.
// Técnico em agrimensura: registra no CFT/CRT e emite TRT (Termo de Responsabilidade Técnica).
// Engenheiro (agrimensor/civil/agrônomo): registra no CREA e emite ART (Anotação de Responsabilidade
// Técnica). Um app só serve os dois se trocar essas siglas nas peças em vez de fixar "técnico/TRT".

export type Conselho = 'CFT' | 'CREA' | 'CFTA' | 'CFT+CREA' | 'CFTA+CREA';

export interface RotulosProfissional {
  /** Conselho (CFT do técnico, CFTA do técnico agrícola ou CREA do engenheiro). */
  conselho: Conselho;
  /** Rótulo do nº de registro no conselho — sempre igual ao próprio conselho ou combinado. */
  registro: string;
  /** Sigla do termo de responsabilidade: TRT (técnico), ART (engenheiro) ou combinados. */
  termo: string;
  /** Nome por extenso do termo, pra textos de ajuda/onboarding. */
  termoExtenso: string;
}

/** Ausência de conselho = CFT (técnico), pra não quebrar projetos e cadastros já existentes. */
export function rotulosProfissional(tec: Pick<TecnicoData, 'conselho'> | undefined | null): RotulosProfissional {
  if (tec?.conselho === 'CREA') {
    return { conselho: 'CREA', registro: 'CREA', termo: 'ART', termoExtenso: 'Anotação de Responsabilidade Técnica' };
  }
  if (tec?.conselho === 'CFTA') {
    return { conselho: 'CFTA', registro: 'CFTA', termo: 'TRT', termoExtenso: 'Termo de Responsabilidade Técnica' };
  }
  if (tec?.conselho === 'CFT+CREA') {
    return { conselho: 'CFT+CREA', registro: 'CFT/CREA', termo: 'TRT/ART', termoExtenso: 'Termo ou Anotação de Responsabilidade Técnica' };
  }
  if (tec?.conselho === 'CFTA+CREA') {
    return { conselho: 'CFTA+CREA', registro: 'CFTA/CREA', termo: 'TRT/ART', termoExtenso: 'Termo ou Anotação de Responsabilidade Técnica' };
  }
  return { conselho: 'CFT', registro: 'CFT', termo: 'TRT', termoExtenso: 'Termo de Responsabilidade Técnica' };
}
