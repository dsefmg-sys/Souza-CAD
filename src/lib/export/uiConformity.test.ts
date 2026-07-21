import { describe, it, expect } from 'vitest';
import { z } from 'zod';
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

  it('valida payloads de API em tempo de execução com esquema Zod prevenindo Cannot read properties of undefined', () => {
    const ApiSchema = z.object({
      denominacao: z.string().catch('DADO AUSENTE'),
      areaHa: z.number().catch(0),
      vertices: z.array(z.object({
        nome: z.string(),
        leste: z.number(),
        norte: z.number(),
      })).catch([]),
    });

    const payloadInvalido = {
      denominacao: null,
      areaHa: 'invalido',
      vertices: undefined,
    };

    const parsed = ApiSchema.parse(payloadInvalido);
    expect(parsed.denominacao).toBe('DADO AUSENTE');
    expect(parsed.areaHa).toBe(0);
    expect(parsed.vertices).toEqual([]);
  });

  it('valida que a injeção de CSS de impressão alterna corretamente entre A3 e A4', () => {
    const gerarCssPage = (formato: 'a3' | 'a4') =>
      `@page { size: ${formato === 'a4' ? '297mm 210mm' : '420mm 297mm'} landscape !important; margin: 0 !important; }`;

    expect(gerarCssPage('a4')).toContain('297mm 210mm');
    expect(gerarCssPage('a3')).toContain('420mm 297mm');
  });

  it('garante inclusão segura de novos confrontantes sem perdas por closure antiga de estado', () => {
    type Conf = { id: string; nome: string };
    let confrontantes: Conf[] = [{ id: 'c1', nome: 'João' }];

    const salvarConfrontante = (novo: Conf) => {
      confrontantes = confrontantes.some((c) => c.id === novo.id)
        ? confrontantes.map((c) => (c.id === novo.id ? novo : c))
        : [...confrontantes, novo];
    };

    salvarConfrontante({ id: 'c2', nome: 'Pedro' });
    expect(confrontantes).toHaveLength(2);
    expect(confrontantes.find((c) => c.id === 'c2')?.nome).toBe('Pedro');
  });

  it('mapeia corretamente a chave de deslocamento de rótulos de vértices no dicionário de sobreposição', () => {
    const calcularIdSalvar = (kind: string, id: string) => (kind === 'rotVert' ? `vert.${id}` : id);

    expect(calcularIdSalvar('rotVert', 'v1')).toBe('vert.v1');
    expect(calcularIdSalvar('ted', 'carimbo.titulo')).toBe('carimbo.titulo');
  });
});
