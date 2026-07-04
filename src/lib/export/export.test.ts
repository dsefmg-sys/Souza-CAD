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
import { construirNarrativa, construirNarrativaSegmentos, descreverConfrontante, gerarMemorialDocx } from './memorial';
import type { Confrontante } from '../topo/types';
import { gerarRequerimentoDocx } from './requerimento';
import type { PessoaQualificada } from '../topo/types';
import { gerarKML } from './kml';
import { pontoNoPoligono, segmentosSeCruzam, analisarSobreposicoes } from '../topo/confrontacaoCheck';

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

  it('segmentos da narrativa: códigos de vértice e confrontante saem em negrito; texto bate com a string', () => {
    const { res, confrontantes, confrontantePorLado } = preparar();
    const segs = construirNarrativaSegmentos(res, confrontantes, confrontantePorLado);
    // o texto puro (join dos segmentos) é idêntico à versão string
    expect(segs.map((s) => s.t).join('')).toBe(construirNarrativa(res, confrontantes, confrontantePorLado));
    // o 1º código de vértice é um segmento em negrito
    const v0 = res.vertices[0].codigoSigef;
    expect(segs.some((s) => s.b && s.t === v0)).toBe(true);
    // algum confrontante aparece em negrito como descrição completa
    expect(segs.some((s) => s.b && /CPF nº/.test(s.t))).toBe(true);
  });

  it('posseiro: descrição com "possuidor(a)" e sem matrícula', () => {
    const c: Confrontante = { id: 'x', nome: 'José Possuidor', cpf: '111', matricula: '999', cns: '', condicao: 'posseiro' };
    const t = descreverConfrontante(c);
    expect(t).toContain('na condição de possuidor(a)');
    expect(t).not.toContain('Matrícula');
  });

  it('espólio: descrição prefixada com "Espólio de"', () => {
    const c: Confrontante = { id: 'y', nome: 'Maria Falecida', cpf: '222', matricula: '777', cns: '', condicao: 'espolio' };
    const t = descreverConfrontante(c);
    expect(t.startsWith('Espólio de Maria Falecida')).toBe(true);
    expect(t).toContain('Matrícula nº');
  });

  it('memorial com cônjuge e espólio gera .docx sem erro', async () => {
    const { res, confrontantes, confrontantePorLado } = preparar();
    confrontantes[0] = { ...confrontantes[0], condicao: 'espolio', inventarianteNome: 'Inv. Fulano', inventarianteCpf: '333' };
    if (confrontantes[1]) confrontantes[1] = { ...confrontantes[1], conjugeNome: 'Cônjuge Beltrana', conjugeCpf: '444' };
    const imovelConj: ImovelData = { ...imovel, conjugeProprietario: 'Esposa do Dono', cpfConjugeProprietario: '555' };
    const blob = await gerarMemorialDocx({ res, imovel: imovelConj, tecnico, confrontantes, confrontantePorLado });
    expect((await blob.arrayBuffer()).byteLength).toBeGreaterThan(2000);
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

  it('identificação: cada campo cai na célula certa, inclusive município (template em branco)', async () => {
    const { res, confrontantes, confrontantePorLado } = preparar();
    const tplBytes = readFileSync(resolve(__dirname, '../../../public/templates/sigef.ods'));
    const zip = await JSZip.loadAsync(tplBytes);
    const xml = await zip.file('content.xml')!.async('string');
    const novo = montarContentXml(xml, { res, imovel, tecnico, confrontantes, confrontantePorLado });
    // isola a aba identificacao e confere as linhas-chave
    const k = novo.indexOf('table:name="identificacao"');
    const ini = novo.lastIndexOf('<table:table ', k);
    const fim = novo.indexOf('</table:table>', k);
    const idt = novo.slice(ini, fim);
    const rows = idt.match(/<table:table-row[\s\S]*?<\/table:table-row>/g)!;
    const txt = (s: string) => (s.match(/<text:p>([\s\S]*?)<\/text:p>/g) || []).map((m) => m.replace(/<[^>]+>/g, ''));
    expect(txt(rows[5])).toContain(imovel.proprietario);   // Nome
    expect(txt(rows[14])).toContain(imovel.matricula);     // Matrícula
    expect(txt(rows[16])).toContain(imovel.municipio);     // Município (era o bug)
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

describe('KML exporter', () => {
  it('gera string XML KML com coordenadas do polígono e marcadores de vértice', () => {
    const { res } = preparar();
    res.vertices[0] = { ...res.vertices[0], lat: -20.12345, lon: -42.54321, elevacao: 800 };
    res.vertices[1] = { ...res.vertices[1], lat: -20.12355, lon: -42.54311, elevacao: 810 };
    res.vertices[2] = { ...res.vertices[2], lat: -20.12365, lon: -42.54331, elevacao: 820 };
    
    const xml = gerarKML(res.vertices, imovel);
    
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<kml xmlns="http://www.opengis.net/kml/2.2">');
    expect(xml).toContain('<Polygon>');
    expect(xml).toContain('-42.54321,-20.12345,800');
    expect(xml).toContain('<Point>');
  });
});

describe('Análise de Sobreposição', () => {
  it('verifica contensão de ponto em polígono (Ray Casting)', () => {
    const square = [
      { leste: 0, norte: 0 },
      { leste: 10, norte: 0 },
      { leste: 10, norte: 10 },
      { leste: 0, norte: 10 },
    ];
    expect(pontoNoPoligono({ leste: 5, norte: 5 }, square)).toBe(true);
    expect(pontoNoPoligono({ leste: 15, norte: 5 }, square)).toBe(false);
  });

  it('verifica se segmentos se cruzam corretamente', () => {
    const a = { leste: 0, norte: 5 };
    const b = { leste: 10, norte: 5 };
    const c = { leste: 5, norte: 0 };
    const d = { leste: 5, norte: 10 };
    expect(segmentosSeCruzam(a, b, c, d)).toBe(true);

    const e = { leste: 0, norte: 0 };
    const f = { leste: 10, norte: 0 };
    const g = { leste: 0, norte: 5 };
    const h = { leste: 10, norte: 5 };
    expect(segmentosSeCruzam(e, f, g, h)).toBe(false);

    expect(segmentosSeCruzam(e, f, f, g)).toBe(false);
  });

  it('analisa sobreposição completa entre polígonos', () => {
    const { res } = preparar();
    res.vertices[0] = { ...res.vertices[0], leste: 10, norte: 10 };
    res.vertices[1] = { ...res.vertices[1], leste: 20, norte: 10 };
    res.vertices[2] = { ...res.vertices[2], leste: 20, norte: 20 };
    res.vertices[3] = { ...res.vertices[3], leste: 10, norte: 20 };
    const cleanVertices = res.vertices.slice(0, 4);

    const vizinhoLonge = {
      nome: 'Vizinho A',
      pts: [
        { leste: 100, norte: 100 },
        { leste: 120, norte: 100 },
        { leste: 120, norte: 120 },
      ],
    };

    const vizinhoSobreposto = {
      nome: 'Vizinho B',
      pts: [
        { leste: 15, norte: 15 },
        { leste: 25, norte: 15 },
        { leste: 25, norte: 25 },
      ],
    };

    const diag1 = analisarSobreposicoes(cleanVertices, [vizinhoLonge]);
    expect(diag1[0].temSobreposicao).toBe(false);
    expect(diag1[0].tipo).toBe('OK');

    const diag2 = analisarSobreposicoes(cleanVertices, [vizinhoSobreposto]);
    expect(diag2[0].temSobreposicao).toBe(true);
    expect(diag2[0].tipo).toBe('PERIGO');
  });

  it('calcula azimutes geodésicos com convergência meridiana quando tipoAzimute = geodesico', () => {
    const { res, confrontantes, confrontantePorLado } = preparar();
    // Força coordenadas de Espera Feliz-MG (Zona 23, longitude ~ -41.9)
    res.vertices[0] = { ...res.vertices[0], lat: -20.650, lon: -41.908, leste: 200000, norte: 8000000 };
    res.vertices[1] = { ...res.vertices[1], lat: -20.640, lon: -41.908, leste: 200000, norte: 8001000 };
    res.vertices[2] = { ...res.vertices[2], lat: -20.640, lon: -41.918, leste: 199000, norte: 8001000 };
    
    // Azimutes planos puros (de quadrícula)
    const imovelPlano: ImovelData = { ...imovel, tipoAzimute: 'plano' };
    const segsPlano = construirNarrativaSegmentos(res, confrontantes, confrontantePorLado, imovelPlano, 23);
    
    // Azimutes geodésicos (com convergência meridiana aplicada)
    const imovelGeo: ImovelData = { ...imovel, tipoAzimute: 'geodesico' };
    const segsGeo = construirNarrativaSegmentos(res, confrontantes, confrontantePorLado, imovelGeo, 23);
    
    // Verifica que as descrições diferem
    const textoPlano = segsPlano.map(s => s.t).join(' ');
    const textoGeo = segsGeo.map(s => s.t).join(' ');
    expect(textoPlano).not.toBe(textoGeo);
  });
});
