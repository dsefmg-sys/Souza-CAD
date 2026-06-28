import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import JSZip from 'jszip';
import { Packer } from 'docx';
import { parseTxt, pontosDePerimetro } from '../topo/parseTxt';
import { montarVertices } from '../topo/vertices';
import { montarConfrontantes } from '../topo/confrontantes';
import { calcular } from '../topo/calcular';
import { detectarZona } from '../topo/coords';
import type { ImovelData, TecnicoData } from '../topo/types';
import { montarContentXml, montarContentXmlGlebas } from './sigefOds';
import { construirNarrativa, gerarMemorialDocx } from './memorial';
import { gerarRequerimentoDocx } from './requerimento';
import type { PessoaQualificada } from '../topo/types';

const PESSOA_VAZIA: PessoaQualificada = {
  nome: '', rg: '', cpf: '', nacionalidade: 'Brasileira', naturalidade: '', dataNascimento: '',
  filiacao: '', profissao: '', estadoCivil: '', conjugeNome: '', conjugeRg: '', conjugeCpf: '',
  endereco: '', cidadeUf: '', cep: '',
};

const TXT = readFileSync(resolve(__dirname, '../topo/__fixtures__/ventania.txt'), 'latin1');
const OUT = resolve(__dirname, '../../../', 'node-out');

const tecnico: TecnicoData = {
  nome: 'Darlan Gonçalves de Souza',
  formacao: 'TÉCNICO EM AGRIMENSURA',
  cft: '12287132600-MG',
  art: 'CFT2505318024',
  credenciamentoIncra: 'COIN',
  cidadeAssinatura: 'Espera Feliz-MG',
  metodoPosicionamento: 'PG6',
  tipoLimite: 'LA6',
  contadorMarco: 17,
  contadorPonto: 55,
};

const imovel: ImovelData = {
  denominacao: 'Fazenda Ventania',
  matricula: '3470',
  cns: '03.886-9',
  codigoImovelIncra: '9501143617043',
  proprietario: 'Juraci Francisco de Sales',
  cpfProprietario: '282.125.096-72',
  tipoPessoa: 'Física',
  municipio: 'Espera Feliz-MG',
  local: 'Córrego Ventania, Espera Feliz-MG',
  naturezaServico: 'Particular',
  situacao: 'Imóvel Registrado',
  naturezaArea: 'Particular',
};

function preparar() {
  const pontos = parseTxt(TXT);
  const perim = pontosDePerimetro(pontos);
  const zona = detectarZona(perim[0].leste, perim[0].norte, 'S');
  const vertices = montarVertices(perim, zona, 'S', tecnico);
  const { confrontantes, confrontantePorLado } = montarConfrontantes(vertices);
  // preenche dados dos confrontantes (faithful ao modelo)
  for (const c of confrontantes) {
    if (/valderis/i.test(c.nome)) { c.cpf = '305.441.307-15'; c.matricula = '5476'; c.cns = '03.886-9'; }
    else if (/adilson/i.test(c.nome)) { c.cpf = '305.441.307-15'; c.matricula = '3289'; c.cns = '03.886-9'; }
    else if (/lobato/i.test(c.nome)) { c.cpf = '002.044.676-40'; c.matricula = '285'; c.cns = '03.886-9'; }
    else if (/claudio/i.test(c.nome)) { c.cpf = '038.313.046-88'; c.matricula = '4919'; c.cns = '03.886-9'; }
  }
  const res = calcular(vertices, confrontantePorLado);
  return { res, vertices, confrontantes, confrontantePorLado };
}

describe('memorial', () => {
  it('narrativa segue o modelo (início, linha ideal, fechamento)', () => {
    const { res, confrontantes, confrontantePorLado } = preparar();
    const txt = construirNarrativa(res, confrontantes, confrontantePorLado);
    expect(txt).toMatch(/^Inicia-se a descrição deste perímetro no vértice COIN-[MP]-\d{4}, de coordenadas \(Longitude:/);
    expect(txt).toContain('segue por linha ideal, confrontando com');
    expect(txt).toContain('com os seguintes azimutes e distâncias:');
    expect(txt).toContain('e finalmente');
    expect(txt.trim().endsWith('ponto inicial da descrição deste perímetro.')).toBe(true);
  });

  it('RECUSA gerar com vértice sem código (defesa contra documento inválido)', async () => {
    const { res, confrontantes, confrontantePorLado } = preparar();
    const resSemCodigo = { ...res, vertices: res.vertices.map((v, i) => (i === 0 ? { ...v, codigoSigef: '' } : v)) };
    await expect(gerarMemorialDocx({
      res: resSemCodigo, imovel, tecnico, confrontantes, confrontantePorLado,
    })).rejects.toThrow(/sem código/);
  });

  it('descreve o tipo de divisa ("segue por cerca") e "ainda confrontando com o mesmo"', () => {
    const { res, confrontantes, confrontantePorLado } = preparar();
    // muda só o 1º lado para cerca: vira passada própria, e o resto do mesmo confrontante
    // segue como "ainda confrontando com o mesmo".
    res.vertices[0] = { ...res.vertices[0], representacao: 'cerca' };
    res.lados[0] = { ...res.lados[0], de: res.vertices[0] };
    const txt = construirNarrativa(res, confrontantes, confrontantePorLado);
    expect(txt).toContain('segue por cerca');
    expect(txt).toContain('ainda confrontando com o mesmo');
    expect(txt).toContain('com azimute de'); // trecho de lado único no singular
  });

  it('gera o .docx', async () => {
    const { res, confrontantes, confrontantePorLado } = preparar();
    const blob = await gerarMemorialDocx({
      res, imovel, tecnico, confrontantes, confrontantePorLado,
      dataExtenso: 'Sábado, 20 de Dezembro de 2025',
    });
    const buf = Buffer.from(await blob.arrayBuffer());
    expect(buf.length).toBeGreaterThan(2000);
    mkdirSync(OUT, { recursive: true });
    writeFileSync(resolve(OUT, 'memorial_out.docx'), buf);
  });
});

describe('requerimento', () => {
  it('gera o .docx reaproveitando imóvel/proprietário/área/valor', async () => {
    const { res } = preparar();
    const requerente: PessoaQualificada = { ...PESSOA_VAZIA, nome: 'Wesley Comprador', cpf: '111.111.111-11' };
    const transmitente: PessoaQualificada = { ...PESSOA_VAZIA, nome: imovel.proprietario, cpf: imovel.cpfProprietario };
    const blob = await gerarRequerimentoDocx({
      imovel: { ...imovel, areaAnterior: 3.5, valorImovel: 350000 },
      tecnico, requerente, transmitente, areaRealHa: res.areaHa, dataExtenso: '17 de março de 2026',
    });
    const buf = Buffer.from(await blob.arrayBuffer());
    expect(buf.length).toBeGreaterThan(3000);
    mkdirSync(OUT, { recursive: true });
    writeFileSync(resolve(OUT, 'requerimento_out.docx'), buf);
  });
});

describe('sigef ods', () => {
  it('preenche o template: novos vértices, sem dados antigos, identificação atualizada', async () => {
    const { res, confrontantes, confrontantePorLado } = preparar();
    const tplBytes = readFileSync(resolve(__dirname, '../../../public/templates/sigef.ods'));
    const zip = await JSZip.loadAsync(tplBytes);
    const xml = await zip.file('content.xml')!.async('string');
    const novo = montarContentXml(xml, { res, imovel, tecnico, confrontantes, confrontantePorLado });

    // contém os 11 códigos de vértice gerados
    for (const v of res.vertices) expect(novo).toContain(v.codigoSigef);
    // a tabela de perímetro tem exatamente 11 linhas de dados
    const perimTbl = novo.match(/table:name="perimetro_1"[\s\S]*?<\/table:table>/)![0];
    const dados = perimTbl.match(/-[MP]-\d{4}/g) || [];
    expect(dados.length).toBe(11);
    // identificação preservou os valores (são os mesmos do modelo)
    expect(novo).toContain('Fazenda Ventania');
    expect(novo).toContain('9501143617043');

    // regrava um .ods real para inspeção
    zip.file('content.xml', novo);
    const out = await zip.generateAsync({ type: 'nodebuffer' });
    mkdirSync(OUT, { recursive: true });
    writeFileSync(resolve(OUT, 'sigef_out.ods'), out);
  });

  it('multi-gleba: gera uma aba perimetro_N por gleba', async () => {
    const { res, confrontantes, confrontantePorLado } = preparar();
    const tplBytes = readFileSync(resolve(__dirname, '../../../public/templates/sigef.ods'));
    const zip = await JSZip.loadAsync(tplBytes);
    const xml = await zip.file('content.xml')!.async('string');
    const glebas = [
      { res, confrontantes, confrontantePorLado, denominacao: 'Parcela 1', parcela: '001' },
      { res, confrontantes, confrontantePorLado, denominacao: 'Parcela 2', parcela: '002' },
    ];
    const novo = montarContentXmlGlebas(xml, imovel, tecnico, glebas);
    expect(novo).toContain('table:name="perimetro_1"');
    expect(novo).toContain('table:name="perimetro_2"');
    expect(novo).toContain('002');
    // cada aba tem 11 vértices
    const t1 = novo.match(/table:name="perimetro_1"[\s\S]*?<\/table:table>/)![0];
    const t2 = novo.match(/table:name="perimetro_2"[\s\S]*?<\/table:table>/)![0];
    expect((t1.match(/-[MP]-\d{4}/g) || []).length).toBe(11);
    expect((t2.match(/-[MP]-\d{4}/g) || []).length).toBe(11);
    // grava .ods real de 2 glebas para inspeção
    zip.file('content.xml', novo);
    const out = await zip.generateAsync({ type: 'nodebuffer' });
    mkdirSync(OUT, { recursive: true });
    writeFileSync(resolve(OUT, 'sigef_2glebas.ods'), out);
  });

  it('planilha separada (gleba única) tem só perimetro_1, com a parcela da gleba', async () => {
    const { res, confrontantes, confrontantePorLado } = preparar();
    const tplBytes = readFileSync(resolve(__dirname, '../../../public/templates/sigef.ods'));
    const zip = await JSZip.loadAsync(tplBytes);
    const xml = await zip.file('content.xml')!.async('string');
    const novo = montarContentXmlGlebas(xml, imovel, tecnico, [{ res, confrontantes, confrontantePorLado, denominacao: 'Parcela 2', parcela: '002' }]);
    expect(novo).toContain('table:name="perimetro_1"');
    expect(novo).not.toContain('table:name="perimetro_2"');
    const t1 = novo.match(/table:name="perimetro_1"[\s\S]*?<\/table:table>/)![0];
    expect(t1).toContain('002');
  });

  it('usa o tipo de limite e o método de cada vértice', async () => {
    const { res, confrontantes, confrontantePorLado } = preparar();
    // ajusta um vértice para limite natural e ponto virtual
    res.vertices[0] = { ...res.vertices[0], tipoLimite: 'LN1', metodo: 'PT8', tipo: 'V' };
    const tplBytes = readFileSync(resolve(__dirname, '../../../public/templates/sigef.ods'));
    const zip = await JSZip.loadAsync(tplBytes);
    const xml = await zip.file('content.xml')!.async('string');
    const novo = montarContentXml(xml, { res, imovel, tecnico, confrontantes, confrontantePorLado });
    expect(novo).toContain('LN1');
    expect(novo).toContain('PT8');
  });
});
