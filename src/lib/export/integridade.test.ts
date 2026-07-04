import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import JSZip from 'jszip';
import { parseTxt, pontosDePerimetro } from '../topo/parseTxt';
import { montarVertices } from '../topo/vertices';
import { montarConfrontantes } from '../topo/confrontantes';
import { calcular } from '../topo/calcular';
import { detectarZona } from '../topo/coords';
import type { ImovelData, TecnicoData } from '../topo/types';
import { gerarMemorialDocx } from './memorial';
import { montarContentXml } from './sigefOds';
import { validarIntegridadeDocx, validarIntegridadeOds, validarIntegridadeZip } from './integridade';

const TXT = readFileSync(resolve(__dirname, '../topo/__fixtures__/ventania.txt'), 'latin1');

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
  const res = calcular(vertices, confrontantePorLado);
  return { res, vertices, confrontantes, confrontantePorLado };
}

describe('validarIntegridadeZip', () => {
  it('memorial gerado é um .docx íntegro (partes obrigatórias + XML bem formado)', async () => {
    const { res, confrontantes, confrontantePorLado } = preparar();
    const blob = await gerarMemorialDocx({ res, imovel, tecnico, confrontantes, confrontantePorLado });
    const buf = Buffer.from(await blob.arrayBuffer());
    const rel = await validarIntegridadeDocx(buf);
    expect(rel.problemas).toEqual([]);
    expect(rel.ok).toBe(true);
  });

  it('planilha SIGEF gerada é um .ods íntegro', async () => {
    const { res, confrontantes, confrontantePorLado } = preparar();
    const tplBytes = readFileSync(resolve(__dirname, '../../../public/templates/sigef.ods'));
    const zip = await JSZip.loadAsync(tplBytes);
    const xml = await zip.file('content.xml')!.async('string');
    const novo = montarContentXml(xml, { res, imovel, tecnico, confrontantes, confrontantePorLado });
    zip.file('content.xml', novo);
    const out = await zip.generateAsync({ type: 'nodebuffer' });
    const rel = await validarIntegridadeOds(out);
    expect(rel.problemas).toEqual([]);
    expect(rel.ok).toBe(true);
  });

  it('acusa parte obrigatória ausente num zip incompleto', async () => {
    const zip = new JSZip();
    zip.file('alguma_coisa.txt', 'oi');
    const buf = await zip.generateAsync({ type: 'nodebuffer' });
    const rel = await validarIntegridadeZip(buf, { partesObrigatorias: ['word/document.xml'], partesXml: [] });
    expect(rel.ok).toBe(false);
    expect(rel.problemas[0]).toMatch(/word\/document\.xml/);
  });

  it('acusa XML malformado (tag desbalanceada)', async () => {
    const zip = new JSZip();
    zip.file('word/document.xml', '<w:p><w:r>texto</w:r>'); // falta fechar <w:p>
    const buf = await zip.generateAsync({ type: 'nodebuffer' });
    const rel = await validarIntegridadeZip(buf, { partesObrigatorias: [], partesXml: ['word/document.xml'] });
    expect(rel.ok).toBe(false);
    expect(rel.problemas.some((p) => /w:p.*desbalanceadas/.test(p))).toBe(true);
  });
});

describe('compatibilidade Word 2007', () => {
  it('memorial gerado tem compatibilityMode=12 (Word 2007)', async () => {
    const { res, confrontantes, confrontantePorLado } = preparar();
    const blob = await gerarMemorialDocx({ res, imovel, tecnico, confrontantes, confrontantePorLado });
    const buf = Buffer.from(await blob.arrayBuffer());
    const zip = await JSZip.loadAsync(buf);
    const settings = await zip.file('word/settings.xml')!.async('string');
    expect(settings).toContain('w:val="12"');
    expect(settings).toContain('compatibilityMode');
  });

  it('memorial gerado não contém namespaces pós-Word 2007 (w14, w15, w16*)', async () => {
    const { res, confrontantes, confrontantePorLado } = preparar();
    const blob = await gerarMemorialDocx({ res, imovel, tecnico, confrontantes, confrontantePorLado });
    const buf = Buffer.from(await blob.arrayBuffer());
    const zip = await JSZip.loadAsync(buf);
    const nomes = Object.keys(zip.files).filter((n) => n.endsWith('.xml'));
    for (const nome of nomes) {
      const xml = await zip.files[nome].async('string');
      expect(xml).not.toMatch(/xmlns:w14="/);
      expect(xml).not.toMatch(/xmlns:w15="/);
      expect(xml).not.toMatch(/xmlns:w16/);
      expect(xml).not.toMatch(/mc:Ignorable/);
    }
  });

  it('memorial gerado não inclui comments.xml desnecessário', async () => {
    const { res, confrontantes, confrontantePorLado } = preparar();
    const blob = await gerarMemorialDocx({ res, imovel, tecnico, confrontantes, confrontantePorLado });
    const buf = Buffer.from(await blob.arrayBuffer());
    const zip = await JSZip.loadAsync(buf);
    expect(zip.file('word/comments.xml')).toBeNull();
  });
});
