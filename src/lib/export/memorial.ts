import {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle,
} from 'docx';
import type { ImovelData, TecnicoData, Confrontante, ResultadoCalculo, Vertex, PessoaQualificada } from '../topo/types';
import { grausParaDMS } from '../topo/coords';
import { azimuteDMS, numBR, numBRmilhar, formatMatricula } from '../topo/geometry';
import { valoresEfetivos } from '../topo/conferencia';
import { sanitizarProfundo, sanitizarTexto } from './sanitizar';
import { carregarModelos, preencherModelo } from '../store/modelos';

function coordTexto(v: Vertex): string {
  const lon = grausParaDMS(v.lon, { estilo: 'memorial', casas: 3 });
  const lat = grausParaDMS(v.lat, { estilo: 'memorial', casas: 3 });
  return `Longitude: ${lon}, Latitude: ${lat} e Altitude: ${numBRmilhar(v.elevacao)} m`;
}

/** Nome do imóvel/pessoa do confrontante já considerando espólio. */
function nomeConfrontante(c: Confrontante): string {
  if ((c.condicao ?? 'proprietario') === 'espolio') {
    return /esp[óo]lio/i.test(c.nome) ? c.nome : `Espólio de ${c.nome}`;
  }
  return c.nome;
}

/** Descrição do confrontante como aparece no texto do memorial. */
export function descreverConfrontante(c: Confrontante | undefined): string {
  if (!c) return 'confrontante não informado';
  if (c.descricaoExtra && c.descricaoExtra.trim()) return c.descricaoExtra.trim();
  const cond = c.condicao ?? 'proprietario';
  const partes: string[] = [];
  if (c.cpf) partes.push(`CPF nº ${c.cpf}`);
  // posseiro não tem matrícula; espólio e proprietário têm
  if (cond !== 'posseiro' && c.matricula) partes.push(`Matrícula nº ${formatMatricula(c.matricula)}`);
  const sufixo = partes.length ? ` (${partes.join(', ')})` : '';
  const base = `${nomeConfrontante(c)}${sufixo}`;
  if (cond === 'posseiro') return `${base}, na condição de possuidor(a)`;
  return base;
}

export function rumoDMS(azimuteGraus: number): string {
  let ang = azimuteGraus % 360;
  if (ang < 0) ang += 360;
  let quad = '';
  let val = 0;
  if (ang >= 0 && ang < 90) {
    quad = 'NE';
    val = ang;
  } else if (ang >= 90 && ang < 180) {
    quad = 'SE';
    val = 180 - ang;
  } else if (ang >= 180 && ang < 270) {
    quad = 'SW';
    val = ang - 180;
  } else {
    quad = 'NW';
    val = 360 - ang;
  }
  return `${grausParaDMS(val)} ${quad}`;
}

/** Um pedaço do texto da narrativa; b = negrito (vértices, tipo de divisa e confrontantes). */
export interface SegmentoTexto { t: string; b?: boolean }

/**
 * Monta a "DESCRIÇÃO DO PERÍMETRO" como segmentos (texto + negrito), no padrão do modelo do dono:
 * começa num vértice, segue agrupando os lados por confrontante e tipo de divisa, fecha no inicial.
 * Os códigos de vértice, o tipo de linha e a qualificação do confrontante saem em negrito.
 */
export function construirNarrativaSegmentos(
  res: ResultadoCalculo,
  confrontantes: Confrontante[],
  confrontantePorLado: Record<number, string>,
  imovel?: ImovelData
): SegmentoTexto[] {
  const { vertices, lados } = res;
  if (vertices.length < 3) return [];
  const mapaC = new Map(confrontantes.map((c) => [c.id, c]));
  const v0 = vertices[0];

  const segs: SegmentoTexto[] = [];
  const push = (t: string, b = false) => { if (t) segs.push(b ? { t, b: true } : { t }); };

  const isUrbano = imovel?.tipoImovel === 'urbano';

  if (isUrbano && imovel?.distanciaEsquinaM != null && imovel?.esquinaRua) {
    push('Inicia-se a descrição deste perímetro no vértice ');
    push(v0.codigoSigef, true);
    push(`, situado a ${numBR(imovel.distanciaEsquinaM)} m da esquina formada com a `);
    push(imovel.esquinaRua, true);
    push(`, de coordenadas (${coordTexto(v0)}); `);
  } else {
    push('Inicia-se a descrição deste perímetro no vértice ');
    push(v0.codigoSigef, true);
    push(`, de coordenadas (${coordTexto(v0)}); `);
  }

  // agrupa lados consecutivos por (confrontante + tipo de divisa). Uma nova "passada" começa
  // quando muda o confrontante OU o tipo de linha (cerca, córrego, linha ideal...).
  type Run = { confrontanteId: string | null; representacao: string; ladoIdx: number[] };
  const runs: Run[] = [];
  lados.forEach((l, i) => {
    const cid = confrontantePorLado[i] ?? l.confrontanteId ?? null;
    const rep = l.de.representacao || 'linha-ideal';
    const ultima = runs[runs.length - 1];
    if (ultima && ultima.confrontanteId === cid && ultima.representacao === rep) ultima.ladoIdx.push(i);
    else runs.push({ confrontanteId: cid, representacao: rep, ladoIdx: [i] });
  });

  const totalLados = lados.length;
  const emitirDestino = (i: number) => {
    const l = lados[i];
    push(' até o vértice ');
    push(l.para.codigoSigef, true);
    if (i === totalLados - 1) push(', ponto inicial da descrição deste perímetro');
    else push(` (${coordTexto(l.para)})`);
  };

  let confAnterior: string | null = null;
  runs.forEach((run, rIdx) => {
    const c = run.confrontanteId ? mapaC.get(run.confrontanteId) : undefined;
    const mesmoConf = run.confrontanteId != null && run.confrontanteId === confAnterior;
    push('deste, segue por ');
    push(seguePor(run.representacao), true);
    push(', ');
    if (mesmoConf) push('ainda confrontando com o mesmo');
    else { push('confrontando com '); push(descreverConfrontante(c), true); }

    if (run.ladoIdx.length === 1) {
      const l = lados[run.ladoIdx[0]];
      const direcao = isUrbano
        ? `rumo de ${rumoDMS(l.azimute)} (azimute de ${azimuteDMS(l.azimute)})`
        : `azimute de ${azimuteDMS(l.azimute)}`;
      push(`, com ${direcao} e distância de ${numBR(l.distancia)} m`);
      emitirDestino(run.ladoIdx[0]);
    } else {
      if (isUrbano) {
        push(', com os seguintes rumos, azimutes e distâncias: ');
      } else {
        push(', com os seguintes azimutes e distâncias: ');
      }
      run.ladoIdx.forEach((i, k) => {
        if (k > 0) push(k === run.ladoIdx.length - 1 ? (i === totalLados - 1 ? '; e finalmente ' : '; e ') : '; ');
        const l = lados[i];
        const direcao = isUrbano
          ? `${rumoDMS(l.azimute)} (${azimuteDMS(l.azimute)})`
          : `${azimuteDMS(l.azimute)}`;
        push(`${direcao} e ${numBR(l.distancia)} m`);
        emitirDestino(i);
      });
    }
    confAnterior = run.confrontanteId;
    if (rIdx < runs.length - 1) push('; ');
  });

  push('.');
  return segs;
}

/** Versão em texto puro (sem negrito) — usada em testes e onde basta a string. */
export function construirNarrativa(
  res: ResultadoCalculo,
  confrontantes: Confrontante[],
  confrontantePorLado: Record<number, string>
): string {
  return construirNarrativaSegmentos(res, confrontantes, confrontantePorLado).map((s) => s.t).join('');
}

/** Como o memorial descreve a linha que "segue por", conforme o tipo de divisa. */
function seguePor(representacao: string): string {
  switch (representacao) {
    case 'cerca': return 'cerca';
    case 'muro': return 'muro';
    case 'vala': return 'vala';
    case 'estrada': return 'estrada';
    case 'corrego':
    case 'rio':
    case 'acude': return 'corpo de água';
    default: return 'linha ideal';
  }
}

const INFO_TECNICAS =
  'As coordenadas dos vértices descritos neste memorial foram determinadas por meio de ' +
  'levantamento topográfico georreferenciado ao Sistema Geodésico Brasileiro, adotando-se o ' +
  'datum SIRGAS2000, mediante utilização de tecnologia GNSS de dupla frequência, com ' +
  'equipamentos compatíveis com a precisão exigida pelas normas técnicas vigentes. O ' +
  'levantamento foi executado a partir de base geodésica determinada por métodos de ' +
  'posicionamento por satélite, sendo os demais vértices obtidos por técnicas de ' +
  'posicionamento relativo, assegurando coerência geométrica, confiabilidade dos dados e ' +
  'compatibilidade com os padrões adotados pelo Incra para fins de certificação, quando ' +
  'aplicável. As distâncias, perímetro e área do imóvel foram calculados a partir das ' +
  'coordenadas dos vértices levantados, em sistema de referência adequado ao levantamento realizado.';

const OBSERVACOES =
  'OBSERVAÇÕES: 1. O presente memorial descritivo reflete fielmente a situação física e ' +
  'geométrica do imóvel na data do levantamento, destinando-se à individualização de área ' +
  'para fins de regularização registral, sem prejuízo de eventual complementação ou ' +
  'adequação técnica caso venha a ser exigida certificação junto aos órgãos competentes. ' +
  '2. A planta anexa é parte integrante deste memorial descritivo.';

function p(text: string, opts: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; size?: number } = {}) {
  return new Paragraph({
    alignment: opts.align ?? AlignmentType.JUSTIFIED,
    spacing: { after: 120 },
    children: [new TextRun({ text, bold: opts.bold, size: opts.size ?? 22 })],
  });
}

// keepNext/keepLines em todo parágrafo do bloco: impede o Word de cortar a página entre o traço
// de assinatura e o nome, ou entre uma linha de dado e a próxima (bloco sempre atômico).
function assinatura(linhas: string[], boldPrimeira = false) {
  const filhos = [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 360 }, keepNext: true, keepLines: true, children: [new TextRun({ text: '________________________________________', size: 22 })] }),
  ];
  linhas.forEach((l, i) =>
    filhos.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 }, keepNext: true, keepLines: true, children: [new TextRun({ text: l, bold: boldPrimeira && i === 0, size: 22 })] }))
  );
  return filhos;
}

/** Célula da tabela de cabeçalho: rótulo em negrito + valor. */
function celulaCab(rotulo: string, valor: string): TableCell {
  return new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    margins: { top: 30, bottom: 30, left: 90, right: 90 },
    children: [new Paragraph({ children: [
      new TextRun({ text: `${rotulo} `, bold: true, size: 20 }),
      new TextRun({ text: valor || '—', size: 20 }),
    ] })],
  });
}

/** Tabela de identificação no topo do memorial (com bordas), como no modelo do dono. */
function tabelaCabecalho(imovel: ImovelData, areaHa: number, perimetro: number): Table {
  const isUrbano = imovel.tipoImovel === 'urbano';
  const labelArea = isUrbano ? 'Área SGL (m²):' : 'Área SGL (ha):';
  const valArea = isUrbano ? `${numBR(areaHa * 10000)} m²` : `${numBR(areaHa, 4)} ha`;
  
  const idMunicipal = isUrbano && imovel.inscricaoMunicipal
    ? ` / Insc.: ${imovel.inscricaoMunicipal}`
    : '';

  const border = () => ({ style: BorderStyle.SINGLE, size: 4, color: '000000' });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: border(),
      bottom: border(),
      left: border(),
      right: border(),
      insideHorizontal: border(),
      insideVertical: border(),
    },
    rows: [
      new TableRow({ children: [celulaCab(isUrbano ? 'Imóvel/Lote:' : 'Imóvel:', imovel.denominacao), celulaCab('Matrícula:', `${imovel.matricula}${idMunicipal}`)] }),
      new TableRow({ children: [celulaCab('Proprietário(a):', imovel.proprietario), celulaCab(labelArea, valArea)] }),
      new TableRow({ children: [celulaCab('Local:', imovel.local), celulaCab('Perímetro (m):', `${numBR(perimetro)} m`)] }),
    ],
  });
}

/** Assinatura de uma pessoa e, se houver, do seu cônjuge logo abaixo. */
function assinaturaComConjuge(linhas: string[], conjugeNome?: string, conjugeCpf?: string): Paragraph[] {
  const out = assinatura(linhas);
  if (conjugeNome && conjugeNome.trim()) {
    out.push(...assinatura([`Cônjuge: ${conjugeNome}`, `CPF: ${conjugeCpf || '—'}`]));
  }
  return out;
}

export interface MemorialInput {
  res: ResultadoCalculo;
  imovel: ImovelData;
  tecnico: TecnicoData;
  confrontantes: Confrontante[];
  confrontantePorLado: Record<number, string>;
  dataExtenso?: string; // ex.: "Sábado, 20 de Dezembro de 2025"
  requerente?: PessoaQualificada;
  transmitente?: PessoaQualificada;
}

export async function gerarMemorialDocx(inputBruto: MemorialInput): Promise<Blob> {
  const input = sanitizarProfundo(inputBruto);
  const { res, imovel, tecnico, confrontantes, confrontantePorLado, requerente, transmitente } = input;
  // Defesa final: nunca gerar memorial com lacuna de código de vértice.
  const semCodigo = res.vertices.filter((v) => !v.codigoSigef).length;
  if (semCodigo > 0) throw new Error(`${semCodigo} vértice(s) sem código. Renumere os vértices antes de gerar o memorial.`);
  const narrativaSegs = construirNarrativaSegmentos(res, confrontantes, confrontantePorLado, imovel);

  const children: (Paragraph | Table)[] = [];

  // Aviso de dados fictícios (projeto de demonstração)
  if (imovel.ficticio) {
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [
      new TextRun({ text: '*** DADOS FICTÍCIOS — DOCUMENTO DE DEMONSTRAÇÃO, SEM VALIDADE LEGAL ***', bold: true, size: 20, color: 'B91C1C' }),
    ] }));
  }

  // Modelos de texto personalizáveis (declarações). {variáveis} trocadas pelos dados reais.
  const efMod = valoresEfetivos(res, imovel);
  const modelos = carregarModelos();
  const varsModelo: Record<string, string> = {
    proprietario: imovel.proprietario || '', cpf: imovel.cpfProprietario || '', denominacao: imovel.denominacao || '',
    matricula: imovel.matricula || '', municipio: imovel.municipio || '', area: `${numBR(efMod.areaHa, 4)} ha`,
    perimetro: `${numBR(efMod.perimetro)} m`, tecnico: tecnico.nome || '', cft: tecnico.cft || '', cidade: tecnico.cidadeAssinatura || '',
  };
  const mod = (chave: keyof typeof modelos) => sanitizarTexto(preencherModelo(modelos[chave], varsModelo));

  // Título
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 220 }, children: [
    new TextRun({ text: 'MEMORIAL DESCRITIVO', bold: true, size: 28 }),
  ] }));

  // Cabeçalho em tabela (usa os valores oficiais do SIGEF quando o usuário escolheu reconciliar)
  const ef = valoresEfetivos(res, imovel);
  children.push(tabelaCabecalho(imovel, ef.areaHa, ef.perimetro));

  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 280, after: 160 }, children: [new TextRun({ text: 'DESCRIÇÃO DO PERÍMETRO', bold: true, size: 24 })] }));
  children.push(new Paragraph({
    alignment: AlignmentType.JUSTIFIED, spacing: { after: 120 },
    children: narrativaSegs.map((s) => new TextRun({ text: s.t, bold: s.b, size: 22 })),
  }));

  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 240, after: 120 }, children: [new TextRun({ text: 'INFORMAÇÕES TÉCNICAS', bold: true, size: 24 })] }));
  children.push(p(INFO_TECNICAS));
  children.push(p(OBSERVACOES));

  // Data e assinatura do técnico
  const data = input.dataExtenso ? `, ${input.dataExtenso}` : '';
  children.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 240, after: 40 }, children: [new TextRun({ text: `${tecnico.cidadeAssinatura}${data}.`, size: 22 })] }));
  assinatura([
    tecnico.nome.toUpperCase(),
    tecnico.formacao,
    `CFT: ${tecnico.cft}`,
    `TRT nº ${imovel.numeroTrt || tecnico.art}`,
    `Credenciamento INCRA: ${tecnico.credenciamentoIncra}`,
  ], true).forEach((c) => children.push(c));

  // Bloco proprietários (com cônjuge, se houver)
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 360, after: 80 }, children: [new TextRun({ text: 'PROPRIETÁRIOS', bold: true, size: 24 })] }));
  children.push(p(mod('declProprietario')));
  
  const propLinhas = [
    `Nome: ${imovel.proprietario}`,
    `CPF: ${imovel.cpfProprietario}`,
  ];
  if (transmitente?.rg) {
    propLinhas.push(`RG: ${transmitente.rg}`);
  }
  propLinhas.push(`Imóvel de Matrícula: ${imovel.matricula}`);

  const conjugePropNome = imovel.conjugeProprietario || transmitente?.conjugeNome || undefined;
  const conjugePropCpf = imovel.cpfConjugeProprietario || transmitente?.conjugeCpf || undefined;

  assinaturaComConjuge(propLinhas, conjugePropNome, conjugePropCpf).forEach((c) => children.push(c));

  // Bloco comprador (se houver)
  if (imovel.comprador) {
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 360, after: 80 }, children: [new TextRun({ text: 'COMPRADORES', bold: true, size: 24 })] }));
    children.push(p(mod('declProprietario')));
    
    const compLinhas = [
      `Nome: ${imovel.comprador}`,
      `CPF: ${imovel.cpfComprador || '—'}`,
    ];
    if (requerente?.rg) {
      compLinhas.push(`RG: ${requerente.rg}`);
    }

    const conjugeCompNome = requerente?.conjugeNome || undefined;
    const conjugeCompCpf = requerente?.conjugeCpf || undefined;

    assinaturaComConjuge(compLinhas, conjugeCompNome, conjugeCompCpf).forEach((c) => children.push(c));
  }

  // Bloco confrontantes (respeita posseiro/espólio e cônjuge)
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 360, after: 80 }, children: [new TextRun({ text: 'CONFRONTANTES', bold: true, size: 24 })] }));
  children.push(p(mod('declConfrontantes')));
  confrontantes.forEach((c) => {
    if (!c.nome) return;
    blocoAssinaturaConfrontante(c).forEach((x) => children.push(x));
  });

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Arial' } } } },
    sections: [{
      properties: { page: { margin: { top: 1133, bottom: 1133, left: 1133, right: 1133 } } },
      children,
    }],
  });
  return Packer.toBlob(doc);
}

/** Linhas de assinatura de um confrontante conforme a condição (proprietário/posseiro/espólio). */
function blocoAssinaturaConfrontante(c: Confrontante): Paragraph[] {
  const cond = c.condicao ?? 'proprietario';
  if (cond === 'espolio') {
    const nome = /esp[óo]lio/i.test(c.nome) ? c.nome : `Espólio de ${c.nome}`;
    const linhas = [
      `Inventariante: ${c.inventarianteNome || '—'}`,
      `CPF: ${c.inventarianteCpf || '—'}`,
      nome,
    ];
    if (c.matricula) linhas.push(`Imóvel de Matrícula: ${formatMatricula(c.matricula)}`);
    return assinatura(linhas);
  }
  if (cond === 'posseiro') {
    return assinaturaComConjuge([
      `Nome: ${c.nome}`,
      `CPF: ${c.cpf}`,
      'Na condição de possuidor(a)',
    ], c.conjugeNome, c.conjugeCpf);
  }
  return assinaturaComConjuge([
    `Nome: ${c.nome}`,
    `CPF: ${c.cpf}`,
    `Imóvel de Matrícula: ${formatMatricula(c.matricula)}`,
  ], c.conjugeNome, c.conjugeCpf);
}
