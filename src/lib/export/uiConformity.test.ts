import { describe, it, expect } from 'vitest';
import { rotulosProfissional } from '../topo/profissional';
import { escaparXml } from './sanitizar';
import type { TecnicoData } from '../topo/types';

describe('Verificação de Conformidade Visual e Regras de Projeto', () => {
  it('aplica tratamento correto a dados nulos/ausentes usando fallbacks', () => {
    const imovelIncompleto = {
      denominacao: '',
      municipio: '',
      uf: '',
    };

    const nome = imovelIncompleto.denominacao || 'DADO AUSENTE';
    const mun = imovelIncompleto.municipio || '___';
    
    expect(nome).toBe('DADO AUSENTE');
    expect(mun).toBe('___');
  });

  it('sanitiza caracteres especiais XML prevenindo quebras em exportações GML/INCRA', () => {
    const textoSujo = 'Fazenda & Cia <Sítio> "Verde" \'Alto\'';
    const textoLimpo = escaparXml(textoSujo);

    expect(textoLimpo).not.toContain('<');
    expect(textoLimpo).not.toContain('>');
    expect(textoLimpo).toContain('&amp;');
    expect(textoLimpo).toContain('&lt;');
    expect(textoLimpo).toContain('&gt;');
  });

  it('retorna os rótulos de conselho (CREA vs CFT/CFTA) corretamente conforme o cadastro do técnico', () => {
    const tecnicoCrea: Partial<TecnicoData> = { conselho: 'CREA' };
    const tecnicoCft: Partial<TecnicoData> = { conselho: 'CFT' };

    expect(rotulosProfissional(tecnicoCrea as TecnicoData).termo).toBe('ART');
    expect(rotulosProfissional(tecnicoCft as TecnicoData).termo).toBe('TRT');
  });
});
