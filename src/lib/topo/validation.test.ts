import { describe, it, expect } from 'vitest';
import { cpfValido, cnpjValido, cpfOuCnpjValido } from './validation';

describe('cpfValido', () => {
  it('valida CPFs corretos', () => {
    // CPFs gerados aleatoriamente válidos para teste
    expect(cpfValido('111.444.777-35')).toBe(true);
    expect(cpfValido('11144477735')).toBe(true);
    expect(cpfValido('529.982.247-25')).toBe(true);
  });

  it('detecta CPFs inválidos', () => {
    expect(cpfValido('111.444.777-36')).toBe(false);
    expect(cpfValido('12345678900')).toBe(false);
    expect(cpfValido('000.000.000-00')).toBe(false);
    expect(cpfValido('111.111.111-11')).toBe(false);
    expect(cpfValido('abc')).toBe(false);
    expect(cpfValido('')).toBe(false);
  });
});

describe('cnpjValido', () => {
  it('valida CNPJs corretos', () => {
    expect(cnpjValido('11.222.333/0001-81')).toBe(true);
    expect(cnpjValido('11222333000181')).toBe(true);
  });

  it('detecta CNPJs inválidos', () => {
    expect(cnpjValido('11.222.333/0001-80')).toBe(false);
    expect(cnpjValido('11.111.111/1111-11')).toBe(false);
    expect(cnpjValido('123')).toBe(false);
    expect(cnpjValido('')).toBe(false);
  });
});

describe('cpfOuCnpjValido', () => {
  it('valida CPF (11 dígitos) e CNPJ (14 dígitos) conforme o tamanho', () => {
    expect(cpfOuCnpjValido('111.444.777-35')).toBe(true);
    expect(cpfOuCnpjValido('11.222.333/0001-81')).toBe(true);
  });

  it('reprova documentos inválidos de qualquer tamanho', () => {
    expect(cpfOuCnpjValido('111.111.111-11')).toBe(false);
    expect(cpfOuCnpjValido('11.111.111/1111-11')).toBe(false);
  });
});
