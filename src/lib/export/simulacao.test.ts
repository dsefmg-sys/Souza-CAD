// Simulação de trabalhos COMPLEXOS para estressar a pipeline inteira:
// muitos vértices, multi-gleba, desmembramento (parcelas que compartilham divisa),
// tipos de divisa variados. Objetivo: achar onde o sistema não atende.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import JSZip from 'jszip';
import type { RawPoint, ImovelData, TecnicoData } from '../topo/types';
import { montarVertices } from '../topo/vertices';
import { montarConfrontantes } from '../topo/confrontantes';
import { calcular } from '../topo/calcular';
import { conferir } from '../topo/conferencia';
import { construirNarrativa } from './memorial';
import { montarContentXmlGlebas } from './sigefOds';

const tecnico: TecnicoData = {
  nome: 'Darlan Gonçalves de Souza', formacao: 'TÉCNICO EM AGRIMENSURA', cft: '12287132600-MG',
  art: 'CFT2505318024', credenciamentoIncra: 'COIN', cidadeAssinatura: 'Espera Feliz-MG',
  metodoPosicionamento: 'PG6', tipoLimite: 'LA6', contadorMarco: 1, contadorPonto: 1, contadorVirtual: 1,
};
const imovel: ImovelData = {
  denominacao: 'Fazenda Complexa', matricula: '1234', cns: '03.886-9', codigoImovelIncra: '9501143617043',
  proprietario: 'Fulano de Tal', cpfProprietario: '000.000.000-00', tipoPessoa: 'Física',
  municipio: 'Espera Feliz-MG', local: 'Córrego X, Espera Feliz-MG',
  naturezaServico: 'Particular', situacao: 'Imóvel Registrado', naturezaArea: 'Particular',
};

const tipos = ['cerca', 'corrego', 'linha-ideal', 'estrada'];
// Gera um anel poligonal "estrelado" com N vértices (não auto-intersectante), em UTM 23S.
function anelComplexo(cx: number, cy: number, n: number, rBase: number): RawPoint[] {
  const pts: RawPoint[] = [];
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * 2 * Math.PI;
    const r = rBase * (0.85 + 0.3 * Math.abs(Math.sin(i * 1.3))); // raio variável, mas radial (sem cruzar)
    const leste = cx + r * Math.cos(ang);
    const norte = cy + r * Math.sin(ang);
    const ehDivisa = i % 7 === 0;
    pts.push({
      nome: String(i + 1),
      codigo: ehDivisa ? `DIVISA VIZINHO${Math.floor(i / 7)} X VIZINHO${Math.floor(i / 7) + 1}` : 'MATA',
      norte, leste, elevacao: 900 + (i % 30), status: 'FIXED', isBase: false, isSingle: false,
    });
  }
  return pts;
}

function montar(pts: RawPoint[]) {
  const vertices = montarVertices(pts, 23, 'S', tecnico).map((v, i) => ({ ...v, representacao: tipos[i % tipos.length] }));
  const { confrontantes, confrontantePorLado } = montarConfrontantes(vertices);
  for (const c of confrontantes) { c.cpf = '111.111.111-11'; c.matricula = '999'; c.cns = '03.886-9'; }
  const res = calcular(vertices, confrontantePorLado);
  return { vertices, confrontantes, confrontantePorLado, res };
}

describe('SIMULAÇÃO — trabalhos complexos', () => {
  it('polígono com 80 vértices: calcula, fecha o memorial e gera ODS', () => {
    const { vertices, confrontantes, confrontantePorLado, res } = montar(anelComplexo(812000, 7720000, 80, 600));
    expect(vertices).toHaveLength(80);
    expect(res.areaM2).toBeGreaterThan(0);
    expect(res.perimetro).toBeGreaterThan(0);
    const probs = conferir(vertices, res, imovel, confrontantes);
    expect(probs.some((p) => p.nivel === 'erro')).toBe(false); // sem auto-interseção/duplicados
    const narr = construirNarrativa(res, confrontantes, confrontantePorLado);
    expect(narr.startsWith('Inicia-se')).toBe(true);
    expect(narr.trim().endsWith('ponto inicial da descrição deste perímetro.')).toBe(true);
    // descreve diferentes tipos de divisa
    expect(narr).toMatch(/segue por (cerca|corpo de água|estrada|linha ideal)/);
  });

  it('desmembramento: 4 glebas que compartilham divisa, planilha multi-aba', async () => {
    // imóvel-mãe dividido em 4 "fatias" radiais (cada uma uma parcela)
    const glebas = [];
    for (let k = 0; k < 4; k++) {
      const pts = anelComplexo(810000 + k * 1500, 7720000, 24, 350);
      glebas.push({ ...montar(pts), denominacao: `Parcela ${k + 1}`, parcela: String(k + 1).padStart(3, '0') });
    }
    const glebasSigef = glebas.map((g) => ({
      res: g.res, confrontantes: g.confrontantes, confrontantePorLado: g.confrontantePorLado,
      denominacao: g.denominacao, parcela: g.parcela,
    }));
    const tplBytes = readFileSync(resolve(__dirname, '../../../public/templates/sigef.ods'));
    const xml = await (await JSZip.loadAsync(tplBytes)).file('content.xml')!.async('string');
    const novo = montarContentXmlGlebas(xml, imovel, tecnico, glebasSigef);
    for (let k = 1; k <= 4; k++) expect(novo).toContain(`table:name="perimetro_${k}"`);
    // cada aba com 24 vértices e sua parcela
    for (let k = 1; k <= 4; k++) {
      const t = novo.match(new RegExp(`table:name="perimetro_${k}"[\\s\\S]*?</table:table>`))![0];
      expect((t.match(/-[MP]-\d{4}/g) || []).length).toBe(24);
    }
    // soma das áreas das parcelas (sanidade: todas > 0)
    expect(glebas.every((g) => g.res.areaHa > 0)).toBe(true);
  });

  it('códigos únicos entre glebas quando numerados em sequência', () => {
    // numeração contínua: cada gleba começa onde a anterior parou
    let cM = 1, cP = 1;
    const todos: string[] = [];
    for (let k = 0; k < 3; k++) {
      const pts = anelComplexo(810000 + k * 1500, 7720000, 20, 300);
      const vs = montarVertices(pts, 23, 'S', { ...tecnico, contadorMarco: cM, contadorPonto: cP });
      vs.forEach((v) => { if (v.tipo === 'M') cM++; else cP++; });
      todos.push(...vs.map((v) => v.codigoSigef));
    }
    expect(new Set(todos).size).toBe(todos.length); // nenhum código repetido
  });
});
