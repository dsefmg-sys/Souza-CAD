import { describe, it, expect } from 'vitest';
import { novaGlebaVazia, glebaDe, migrarProjeto } from './glebas';
import type { Projeto } from './types';

const baseProj: Omit<Projeto, 'glebas' | 'vertices' | 'confrontantes' | 'confrontantePorLado'> = {
  id: 'p1', nome: 'Teste', criadoEm: 1, atualizadoEm: 1,
  imovel: {
    denominacao: 'Faz', matricula: '1', cns: '', codigoImovelIncra: '', proprietario: '',
    cpfProprietario: '', tipoPessoa: 'Física', municipio: '', local: '',
    naturezaServico: 'Particular', situacao: 'Imóvel Registrado', naturezaArea: 'Particular',
  },
  zonaUtm: 23, hemisferio: 'S',
};

describe('glebas', () => {
  it('novaGlebaVazia numera a parcela com zero à esquerda', () => {
    expect(novaGlebaVazia(1).parcela).toBe('001');
    expect(novaGlebaVazia(2).denominacao).toBe('Parcela 2');
  });

  it('migra projeto legado (vertices no topo) para glebas[0]', () => {
    const vert = [{ id: 'v1' } as never];
    const legado = { ...baseProj, vertices: vert, confrontantes: [], confrontantePorLado: { 0: 'c1' } } as unknown as Projeto;
    const mig = migrarProjeto(legado);
    expect(mig.glebas).toHaveLength(1);
    expect(mig.glebas[0].vertices).toBe(vert);
    expect(mig.glebas[0].confrontantePorLado).toEqual({ 0: 'c1' });
  });

  it('não mexe em projeto que já tem glebas', () => {
    const g = glebaDe(1, [], [], {}, 'Parcela 1');
    const novo = { ...baseProj, glebas: [g] } as Projeto;
    expect(migrarProjeto(novo).glebas).toBe(novo.glebas);
  });
});
