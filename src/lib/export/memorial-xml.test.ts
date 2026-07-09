import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { gerarProjetoFicticio } from '../demo/projetoFicticio';
import { calcular } from '../topo/calcular';
import { gerarMemorialDocx } from './memorial';
import type { TecnicoData } from '../topo/types';

const tec: TecnicoData = {
  nome: 'Fulano de Tal', formacao: 'TÉCNICO EM AGRIMENSURA', cft: '000-MG', art: 'CFT0',
  credenciamentoIncra: 'COIN', cidadeAssinatura: 'Espera Feliz-MG', metodoPosicionamento: 'PG6',
  tipoLimite: 'LA6', contadorMarco: 1, contadorPonto: 1,
};

// Guarda contra o bug recorrente do memorial "não abre / problema no conteúdo": o document.xml do
// .docx precisa estar bem formado E sem NENHUM caractere que o XML 1.0 proíbe (controles,
// surrogates soltos, não-caracteres). É esse tipo de caractere que faz o Word acusar corrupção.
describe('memorial: document.xml sem caractere inválido de XML', () => {
  it('não contém controles proibidos, surrogates soltos, e tem parágrafos balanceados', async () => {
    const f = gerarProjetoFicticio();
    const res = calcular(f.vertices, f.confrontantePorLado);
    const blob = await gerarMemorialDocx({ res, imovel: f.imovel, tecnico: tec, confrontantes: f.confrontantes, confrontantePorLado: f.confrontantePorLado });
    const zip = await JSZip.loadAsync(Buffer.from(await blob.arrayBuffer()));
    const xml = await zip.file('word/document.xml')!.async('string');

     
    const proibido = xml.match(/[\x00-\x08\x0B\x0C\x0E-\x1F￾￿]/);
    expect(proibido, proibido ? `caractere proibido U+${proibido[0].charCodeAt(0).toString(16)}` : '').toBeNull();

    expect(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(xml)).toBe(false); // surrogate alto solto
    expect(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(xml)).toBe(false); // surrogate baixo solto

    const abre = (xml.match(/<w:p[ >]/g) || []).length;
    const fecha = (xml.match(/<\/w:p>/g) || []).length;
    expect(abre).toBe(fecha);
  });
});
