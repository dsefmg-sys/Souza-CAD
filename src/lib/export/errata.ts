import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import type { ImovelData, TecnicoData, CorrecaoErrata, NaturezaCorrecao } from '../topo/types';
import { numBR } from '../topo/geometry';
import { rotulosProfissional } from '../topo/profissional';
import { sanitizarProfundo } from './sanitizar';
import { carregarModelos, preencherModelo } from '../store/modelos';
import { compatibilizarWord2007 } from './compatWord2007';

export interface ErrataInput {
  imovel: ImovelData;
  tecnico: TecnicoData;
  correcoes: CorrecaoErrata[];
  areaHa: number;
  comarca?: string;        // padrão = município do imóvel
  assunto?: string;        // padrão = retificação de georreferenciamento
  acrescimoRT?: string;    // se preenchido, vira a seção "Acréscimo de Responsabilidade Técnica"
  dataExtenso?: string;    // ex.: "5 de junho de 2026"
}

const ASSUNTO_PADRAO = 'Retificação de dados em processo de Georreferenciamento e Retificação de Área.';

function par(runs: TextRun[], align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.JUSTIFIED, after = 120) {
  return new Paragraph({ alignment: align, spacing: { after }, children: runs });
}
function t(texto: string, opts: { bold?: boolean; size?: number } = {}) {
  return new TextRun({ text: texto, bold: opts.bold, size: opts.size ?? 22 });
}
function secao(n: number, titulo: string) {
  return new Paragraph({ spacing: { before: 160, after: 60 }, children: [new TextRun({ text: `${n}. ${titulo}`, bold: true, size: 22 })] });
}

export async function gerarErrataDocx(inputBruto: ErrataInput): Promise<Blob> {
  const input = sanitizarProfundo(inputBruto);
  const { imovel, tecnico, correcoes, areaHa } = input;
  // UF vem do município do imóvel (ex.: "Espera Feliz-MG" → "MG"); não fica mais chumbado em MG.
  const uf = ((imovel.municipio || '').match(/-\s*([A-Za-z]{2})\s*$/)?.[1] || '').toUpperCase();
  const comarca = (input.comarca || imovel.municipio || '—').replace(/\s*-\s*[A-Za-z]{2}\s*$/i, '').trim();
  const rot = rotulosProfissional(tecnico);
  const formacao = tecnico.formacao || 'Responsável Técnico';
  const modelos = carregarModelos();
  const nomeUpper = (tecnico.nome || '').toUpperCase();
  const denom = imovel.denominacao || '—';
  const area = `${numBR(areaHa, 4)} ha`;
  const local = imovel.local || imovel.municipio || '';
  const c: Paragraph[] = [];

  // Cabeçalho
  if (imovel.ficticio) {
    c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: '*** DADOS FICTÍCIOS — DOCUMENTO DE DEMONSTRAÇÃO, SEM VALIDADE LEGAL ***', bold: true, size: 20, color: 'B91C1C' })] }));
  }
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 }, children: [new TextRun({ text: 'ERRATA FORMAL DE MEMORIAL DESCRITIVO E PROJETO TÉCNICO', bold: true, size: 24 })] }));
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new TextRun({ text: `AO OFICIAL DE REGISTRO DE IMÓVEIS DA COMARCA DE ${comarca.toUpperCase()}${uf ? ` – ${uf}` : ''}`, bold: true, size: 22 })] }));

  // Referência
  c.push(par([
    t('Ref.: ', { bold: true }),
    t(`Imóvel: ${denom}`),
    t(` | Matrícula: ${imovel.matricula || '—'}`),
    t(` | Proprietário(s): ${imovel.proprietario || '—'}`),
    t(` | Assunto: ${input.assunto || ASSUNTO_PADRAO}`),
  ]));

  // Parágrafo de abertura
  c.push(par([
    t('Eu, '), t(nomeUpper, { bold: true }),
    t(`, ${formacao}, inscrito no ${rot.registro} sob o nº ${tecnico.cft || '—'}, responsável técnico pelos serviços de agrimensura do imóvel rural denominado ${denom}, com área de ${area}${local ? `, localizado no ${local}` : ''}, venho por meio desta apresentar ERRATA FORMAL para retificação de informações constantes na planta e no memorial descritivo anteriormente apresentados.`),
  ]));

  // Seção 1: correções agrupadas por natureza
  let n = 1;
  const TITULOS_NATUREZA: Record<NaturezaCorrecao, string> = {
    imovel: 'Retificação de Dados de Identificação do Imóvel',
    pessoais: 'Retificação de Qualificação Pessoal dos Proprietários',
    confrontantes: 'Retificação de Dados de Confrontantes e Registros',
    geometria: 'Retificação de Elementos Geométricos e Vértices',
    outros: 'Outras Retificações e Esclarecimentos',
  };

  const naturezasOrdenadas: NaturezaCorrecao[] = ['imovel', 'pessoais', 'confrontantes', 'geometria', 'outros'];

  const agrupadas: Record<NaturezaCorrecao, CorrecaoErrata[]> = {
    imovel: [],
    pessoais: [],
    confrontantes: [],
    geometria: [],
    outros: [],
  };

  for (const cor of correcoes) {
    const nat = cor.natureza || 'outros';
    if (agrupadas[nat]) {
      agrupadas[nat].push(cor);
    } else {
      agrupadas.outros.push(cor);
    }
  }

  const temCorrecoes = correcoes.length > 0;

  if (!temCorrecoes) {
    c.push(secao(n++, 'Retificações Solicitadas'));
    c.push(par([t('Para fins de correta averbação e para evitar a necessidade de reconfecção de peças gráficas e novas colheitas de assinaturas, onde constam dados divergentes, leia-se conforme a correção abaixo:')]));
    c.push(par([t('(nenhuma correção informada)')]));
  } else {
    for (const nat of naturezasOrdenadas) {
      const lista = agrupadas[nat];
      if (lista.length === 0) continue;

      c.push(secao(n++, TITULOS_NATUREZA[nat]));
      c.push(par([t('Para fins de correta averbação e para evitar a necessidade de reconfecção de peças gráficas, onde constam dados divergentes, leia-se conforme a retificação abaixo:')]));
      for (const cor of lista) {
        c.push(par([
          t(`${cor.onde}: `, { bold: true }),
          t('Onde se lê '), t(cor.constava || '—'),
          t(', leia-se: '), t(cor.passa || '—', { bold: true }), t('.'),
        ], AlignmentType.JUSTIFIED, 60));
      }
    }
  }

  // Seção opcional: acréscimo de responsabilidade técnica
  if (input.acrescimoRT?.trim()) {
    c.push(secao(n++, 'Acréscimo de Informação de Responsabilidade Técnica'));
    c.push(par([t('Fica devidamente registrado e acrescido ao processo o número de registro profissional correspondente: '), t(input.acrescimoRT.trim(), { bold: true })]));
  }

  // Ratificação (texto editável nos modelos; {area} trocada pelo valor real)
  c.push(secao(n++, 'Considerações Finais e Ratificação'));
  c.push(par([t(preencherModelo(modelos.errataRatificacao, { area }))]));

  // Data e assinatura
  const localAssina = `${comarca}${uf ? ` - ${uf}` : ''}`;
  const data = input.dataExtenso ? `${localAssina}, ${input.dataExtenso}.` : `${localAssina}, ____ de __________ de ______.`;
  c.push(new Paragraph({ spacing: { before: 240, after: 320 }, keepNext: true, keepLines: true, children: [t(data)] }));
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, keepLines: true, children: [new TextRun({ text: nomeUpper, bold: true, size: 22 })] }));
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, keepLines: true, children: [t(formacao)] }));
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, keepLines: true, children: [t(`${rot.registro} ${tecnico.cft || '—'}`)] }));

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Times New Roman' } } } },
    sections: [{ properties: { page: { margin: { top: 1133, bottom: 1133, left: 1133, right: 1133 } } }, children: c }],
  });
  const blob = await Packer.toBlob(doc);
  return compatibilizarWord2007(blob);
}
