import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gerarProjetoFicticio } from './projetoFicticio';
import { calcular } from '../topo/calcular';
import { gerarMemorialDocx } from '../export/memorial';
import { montarContentXml } from '../export/sigefOds';
import { validarIntegridadeDocx, validarIntegridadeOds } from '../export/integridade';
import type { TecnicoData } from '../topo/types';

const tecnico: TecnicoData = {
  nome: 'Fulano de Tal', formacao: 'TÉCNICO EM AGRIMENSURA', cft: '00000000000-MG', art: 'CFT0000',
  credenciamentoIncra: 'COIN', cidadeAssinatura: 'Espera Feliz-MG', metodoPosicionamento: 'PG6',
  tipoLimite: 'LA6', contadorMarco: 1, contadorPonto: 1,
};

// Blinda o projeto de demonstração: garante que as peças geradas a partir dele saem VÁLIDAS
// (o botão Demo é o que os testadores vão usar primeiro).
describe('projeto fictício → peças íntegras', () => {
  const f = gerarProjetoFicticio();
  const res = calcular(f.vertices, f.confrontantePorLado);

  it('tem imovel.ficticio e geometria válida', () => {
    expect(f.imovel.ficticio).toBe(true);
    expect(f.vertices.length).toBeGreaterThanOrEqual(3);
    expect(res.areaHa).toBeGreaterThan(0);
  });

  it('memorial gera um .docx íntegro (com marca de dados fictícios)', async () => {
    const blob = await gerarMemorialDocx({ res, imovel: f.imovel, tecnico, confrontantes: f.confrontantes, confrontantePorLado: f.confrontantePorLado });
    const buf = Buffer.from(await blob.arrayBuffer());
    const rel = await validarIntegridadeDocx(buf);
    expect(rel.problemas).toEqual([]);
    // confirma que a marca de dados fictícios entrou no documento
    const zip = await JSZip.loadAsync(buf);
    const xml = await zip.file('word/document.xml')!.async('string');
    expect(xml).toContain('DADOS FICT');
  });

  it('planilha SIGEF gera um .ods íntegro', async () => {
    const tplBytes = readFileSync(resolve(__dirname, '../../../public/templates/sigef.ods'));
    const zip = await JSZip.loadAsync(tplBytes);
    const xmlTpl = await zip.file('content.xml')!.async('string');
    const novo = montarContentXml(xmlTpl, { res, imovel: f.imovel, tecnico, confrontantes: f.confrontantes, confrontantePorLado: f.confrontantePorLado });
    zip.file('content.xml', novo);
    const out = await zip.generateAsync({ type: 'nodebuffer' });
    const rel = await validarIntegridadeOds(out);
    expect(rel.problemas).toEqual([]);
    expect(novo).toContain('(FICTICIO)');
  });
});
