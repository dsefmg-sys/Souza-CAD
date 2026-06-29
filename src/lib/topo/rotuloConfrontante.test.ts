import { describe, it, expect } from 'vitest';
import { linhasRotuloConfrontante } from './rotuloConfrontante';
import type { Confrontante } from './types';

const base: Confrontante = { id: 'x', nome: 'Fulano', cpf: '111', matricula: '4919', cns: '' };

describe('linhasRotuloConfrontante', () => {
  it('proprietário: nome, CPF e matrícula', () => {
    const l = linhasRotuloConfrontante(base);
    expect(l[0]).toBe('Nome: Fulano');
    expect(l[1]).toBe('CPF: 111');
    expect(l.some((x) => /Matrícula/.test(x))).toBe(true);
  });

  it('posseiro: sem matrícula, com "possuidor(a)"', () => {
    const l = linhasRotuloConfrontante({ ...base, condicao: 'posseiro' });
    expect(l.some((x) => /possuidor/i.test(x))).toBe(true);
    expect(l.some((x) => /Matrícula/.test(x))).toBe(false);
  });

  it('espólio: prefixo + inventariante', () => {
    const l = linhasRotuloConfrontante({ ...base, condicao: 'espolio', inventarianteNome: 'Beltrano', inventarianteCpf: '222' });
    expect(l[0]).toBe('Espólio de Fulano');
    expect(l.some((x) => /Inventariante: Beltrano/.test(x))).toBe(true);
  });

  it('cônjuge entra como linha extra', () => {
    const l = linhasRotuloConfrontante({ ...base, conjugeNome: 'Cicrana', conjugeCpf: '333' });
    expect(l.some((x) => /Cônjuge: Cicrana/.test(x))).toBe(true);
  });
});
