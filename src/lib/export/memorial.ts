import { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import type { ImovelData, TecnicoData, Confrontante, ResultadoCalculo, Vertex, PessoaQualificada } from '../topo/types';
import { grausParaDMS, convergenciaMeridiana } from '../topo/coords';
import { azimute, distancia, azimuteDMS, numBR, numBRmilhar, formatMatricula } from '../topo/geometry';
import { valoresEfetivos } from '../topo/conferencia';
import { rotulosProfissional } from '../topo/profissional';
import { sanitizarProfundo, sanitizarTexto } from './sanitizar';
import { carregarModelos, preencherModelo } from '../store/modelos';
import { qualificacaoPapelProprietario } from './papelProprietario';
import { compatibilizarWord2007 } from './compatWord2007';
import { obterComarca, formatarTextoMultimunicipal } from '../topo/municipios';
import { iniciarDoNorteHorario } from '../topo/vertices';
import { calcular } from '../topo/calcular';

export function orientarResultadoParaNorte(
  res: ResultadoCalculo,
  cpl: Record<number, string> = {}
): { res: ResultadoCalculo; cpl: Record<number, string> } {
  if (!res || !res.vertices || res.vertices.length < 3) return { res, cpl };
  const ordenados = iniciarDoNorteHorario(res.vertices);
  const saoIguais = ordenados.length === res.vertices.length && ordenados.every((v, i) => v.id === res.vertices[i].id);
  if (saoIguais) return { res, cpl };

  const cplReindexado: Record<number, string> = {};
  ordenados.forEach((v, novoIdx) => {
    const origIdx = res.vertices.findIndex((x) => x.id === v.id);
    if (origIdx >= 0 && cpl[origIdx]) cplReindexado[novoIdx] = cpl[origIdx];
  });

  const resCalculado = calcular(ordenados, cplReindexado);
  return { res: resCalculado, cpl: cplReindexado };
}

function coordTexto(v: Vertex, prefs?: { memorialTipoCoordenada?: 'geodesica' | 'utm' | 'ambas'; memorialLatLonFormat?: 'gms' | 'decimal' }): string {
  const elev = Number.isFinite(v.elevacao) ? v.elevacao : 0;
  const tipo = prefs?.memorialTipoCoordenada ?? 'geodesica';
  const format = prefs?.memorialLatLonFormat ?? 'gms';

  let latStr = '';
  let lonStr = '';
  if (format === 'decimal') {
    latStr = numBR(v.lat, 7) + '°';
    lonStr = numBR(v.lon, 7) + '°';
  } else {
    latStr = grausParaDMS(v.lat, { estilo: 'memorial', casas: 3 });
    lonStr = grausParaDMS(v.lon, { estilo: 'memorial', casas: 3 });
  }

  const utmPart = `Este (E): ${numBR(v.leste, 3)} m, Norte (N): ${numBR(v.norte, 3)} m`;
  const geoPart = `Longitude: ${lonStr}, Latitude: ${latStr}`;

  if (tipo === 'utm') {
    return `${utmPart} e Altitude: ${numBRmilhar(elev)} m`;
  }
  if (tipo === 'ambas') {
    return `${utmPart}, ${geoPart} e Altitude: ${numBRmilhar(elev)} m`;
  }
  return `${geoPart} e Altitude: ${numBRmilhar(elev)} m`;
}

// Descrição do confrontante: vive em confrontanteTexto.ts, compartilhada com a planilha SIGEF
// pra memorial e planilha nunca mais divergirem. Re-exportada aqui pra manter os imports antigos.
import { descreverConfrontante, nomeConfrontante, confrontanteAssina } from './confrontanteTexto';
export { descreverConfrontante, nomeConfrontante, confrontanteAssina };

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
  return `${grausParaDMS(val, { casas: 0 })} ${quad}`;
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
  imovel?: ImovelData,
  zonaUtm?: number,
  preferencias?: {
    memorialTipoCoordenada?: 'geodesica' | 'utm' | 'ambas';
    memorialLatLonFormat?: 'gms' | 'decimal';
  }
): SegmentoTexto[] {
  const { vertices, lados } = res;
  if (vertices.length < 3) return [];
  const mapaC = new Map(confrontantes.map((c) => [c.id, c]));
  const v0 = vertices[0];

  const segs: SegmentoTexto[] = [];
  const push = (t: string, b = false) => { if (t) segs.push(b ? { t, b: true } : { t }); };

  const isUrbano = imovel?.tipoImovel === 'urbano';
  const usarGeodesico = imovel?.tipoAzimute !== 'plano';
  const zona = zonaUtm ?? 23;

  const obterAzimuteEfetivo = (l: typeof lados[0]) => {
    if (!usarGeodesico) {
      return azimute({ e: l.de.leste, n: l.de.norte }, { e: l.para.leste, n: l.para.norte });
    }
    const v = l.de;
    if (v.lat != null && v.lon != null) {
      const cm = convergenciaMeridiana(v.lat, v.lon, zona);
      const azPlano = azimute({ e: l.de.leste, n: l.de.norte }, { e: l.para.leste, n: l.para.norte });
      return (azPlano + cm + 360) % 360;
    }
    return l.azimute;
  };

  const obterDistanciaEfetiva = (l: typeof lados[0]) => {
    if (!usarGeodesico) {
      return distancia({ e: l.de.leste, n: l.de.norte }, { e: l.para.leste, n: l.para.norte });
    }
    return l.distancia;
  };

  if (isUrbano && imovel?.distanciaEsquinaM != null && imovel?.esquinaRua) {
    push('Inicia-se a descrição deste perímetro no vértice ');
    push(v0.codigoSigef, true);
    push(`, situado a ${numBR(imovel.distanciaEsquinaM)} m da esquina formada com a `);
    push(imovel.esquinaRua, true);
    push(`, de coordenadas (${coordTexto(v0, preferencias)}); `);
  } else {
    push('Inicia-se a descrição deste perímetro no vértice ');
    push(v0.codigoSigef, true);
    push(`, de coordenadas (${coordTexto(v0, preferencias)}); `);
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
    else push(` (${coordTexto(l.para, preferencias)})`);
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
      const azEfetivo = obterAzimuteEfetivo(l);
      const direcao = isUrbano
        ? `rumo de ${rumoDMS(azEfetivo)} (azimute de ${azimuteDMS(azEfetivo)})`
        : `azimute de ${azimuteDMS(azEfetivo)}`;
      push(`, com ${direcao} e distância de ${numBR(obterDistanciaEfetiva(l))} m`);
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
        const azEfetivo = obterAzimuteEfetivo(l);
        const direcao = isUrbano
          ? `${rumoDMS(azEfetivo)} (${azimuteDMS(azEfetivo)})`
          : `${azimuteDMS(azEfetivo)}`;
        push(`${direcao} e ${numBR(obterDistanciaEfetiva(l))} m`);
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
    case 'meio-fio': return 'meio-fio';
    case 'calcada': return 'calçada';
    case 'alambrado': return 'alambrado';
    case 'aceiro': return 'aceiro';
    case 'crista': return 'divisor de águas';
    case 'cerca-viva': return 'cerca viva';
    default: return 'linha ideal';
  }
}

// Tipografia do memorial: Arial 12 pt (tamanho 24 em meios-pontos) em TODO o corpo —
// padrão de peça técnica de cartório. Só o título principal sobe pra 14 pt.
const CORPO = 24;

function p(text: string, opts: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; size?: number } = {}) {
  const lines = (text || '').split('\n');
  const runChildren: TextRun[] = [];
  lines.forEach((line, index) => {
    if (index > 0) {
      runChildren.push(new TextRun({ break: 1 }));
    }
    runChildren.push(new TextRun({ text: line, bold: opts.bold, size: opts.size ?? CORPO }));
  });
  return new Paragraph({
    alignment: opts.align ?? AlignmentType.JUSTIFIED,
    spacing: { after: 200 },
    children: runChildren,
  });
}

// keepNext/keepLines em todo parágrafo do bloco: impede o Word de cortar a página entre o traço
// de assinatura e o nome, ou entre uma linha de dado e a próxima (bloco sempre atômico).
function assinatura(linhas: string[], boldPrimeira = false) {
  const filhos = [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 640 }, keepNext: true, keepLines: true, children: [new TextRun({ text: '________________________________________', size: CORPO })] }),
  ];
  linhas.forEach((l, i) =>
    filhos.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, keepNext: true, keepLines: true, children: [new TextRun({ text: l, bold: boldPrimeira && i === 0, size: CORPO })] }))
  );
  return filhos;
}

/** Identificação no topo do memorial: linhas simples de texto (rótulo em negrito), sem tabela nem moldura. */
function cabecalhoTabelaDocx(imovel: ImovelData, areaHa: number, perimetro: number, tecnico: TecnicoData): Table {
  const isUrbano = imovel.tipoImovel === 'urbano';
  const labelArea = isUrbano ? 'Área SGL (m²):' : 'Área SGL (ha):';
  const valArea = isUrbano ? `${numBR(areaHa * 10000)} m²` : `${numBR(areaHa, 4)} ha`;

  const idMunicipal = isUrbano && imovel.inscricaoMunicipal
    ? ` / Insc.: ${imovel.inscricaoMunicipal}`
    : '';
  const valMatricula = imovel.regimeTerra === 'posse' || !imovel.matricula 
    ? (imovel.matricula || 'Posse (Sem Matrícula)')
    : `${imovel.matricula || '—'}${idMunicipal}`;
  const valProprietario = (imovel.proprietario || imovel.posseiro || '—').trim();
  const labelProprietario = imovel.regimeTerra === 'posse' || !imovel.proprietario ? 'Possuidor(a):' : 'Proprietário(a):';

  const rot = rotulosProfissional(tecnico);
  const termoVal = imovel.numeroTrt || tecnico.art || '';

  const borderNone = { style: BorderStyle.NONE, size: 0, color: 'auto' };
  const bordersNone = {
    top: borderNone,
    bottom: borderNone,
    left: borderNone,
    right: borderNone,
  };

  const celula = (rotulo: string, valor: string, pctWidth: number) => new TableCell({
    width: { size: pctWidth, type: WidthType.PERCENTAGE },
    borders: bordersNone,
    children: [
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({ text: `${rotulo} `, bold: true, size: CORPO }),
          new TextRun({ text: valor || '—', size: CORPO }),
        ],
      }),
    ],
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          celula(isUrbano ? 'Imóvel/Lote:' : 'Imóvel:', imovel.denominacao || '—', 60),
          celula(imovel.regimeTerra === 'posse' || !imovel.matricula ? 'Situação jurídica:' : 'Matrícula:', valMatricula, 40),
        ],
      }),
      new TableRow({
        children: [
          celula(labelArea, valArea, 60),
          celula('Perímetro (m):', `${numBR(perimetro)} m`, 40),
        ],
      }),
      new TableRow({
        children: [
          celula(labelProprietario, valProprietario, 60),
          celula(`${rot.termo}:`, termoVal, 40),
        ],
      }),
    ],
  });
}

/** Assinatura de uma pessoa e, se houver, do seu cônjuge logo abaixo. */
function assinaturaComConjuge(linhas: string[], conjugeNome?: string, conjugeCpf?: string): Paragraph[] {
  const out = assinatura(linhas);
  const resOut: Paragraph[] = [...out];
  if (conjugeNome && conjugeNome.trim()) {
    assinatura([`Cônjuge: ${conjugeNome}`, `CPF: ${conjugeCpf || '—'}`]).forEach(p => resOut.push(p));
  }
  return resOut;
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
  /** Mais de um comprador/donatário/coproprietário do lado do REQUERENTE (ex.: casal que não são
   *  cônjuges, herdeiros comprando juntos) — cada um sai com sua própria linha de assinatura. */
  partesAdicionais?: PessoaQualificada[];
  zonaUtm?: number;
  /** 'servidao' gera o memorial descritivo de área de servidão/faixa de domínio (título e abertura próprios). */
  modo?: 'normal' | 'servidao';
  preferencias?: {
    memorialTipoCoordenada?: 'geodesica' | 'utm' | 'ambas';
    memorialLatLonFormat?: 'gms' | 'decimal';
  };
}

export async function gerarMemorialDocx(inputBruto: MemorialInput): Promise<Blob> {
  const input = sanitizarProfundo(inputBruto);
  const { res: resBruto, imovel, tecnico, confrontantes, confrontantePorLado: cplBruto, requerente, transmitente, partesAdicionais, zonaUtm, preferencias } = input;
  const { res, cpl: confrontantePorLado } = orientarResultadoParaNorte(resBruto, cplBruto);
  // Defesa final: nunca gerar memorial com lacuna de código de vértice.
  const semCodigo = res.vertices.filter((v) => !v.codigoSigef).length;
  if (semCodigo > 0) throw new Error(`${semCodigo} vértice(s) sem código. Renumere os vértices antes de gerar o memorial.`);
  const narrativaSegs = construirNarrativaSegmentos(res, confrontantes, confrontantePorLado, imovel, zonaUtm, preferencias);

  const children: (Paragraph | Table)[] = [];

  // Aviso de dados fictícios (projeto de demonstração)
  if (imovel.ficticio) {
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [
      new TextRun({ text: '*** DADOS FICTÍCIOS — DOCUMENTO DE DEMONSTRAÇÃO, SEM VALIDADE LEGAL ***', bold: true, size: 20, color: 'B91C1C' }),
    ] }));
  }

  // Modelos de texto personalizáveis (declarações). {variáveis} trocadas pelos dados reais.
  const efMod = valoresEfetivos(res, imovel);
  // MODO PLANO: a narrativa usa distâncias planas (UTM), então o perímetro declarado precisa ser
  // a soma DESSAS distâncias — antes saía o perímetro SGL e o documento se contradizia (a soma
  // dos lados do texto não fechava com o perímetro do cabeçalho). A área segue sendo a SGL
  // (oficial do SIGEF) e o cabeçalho já a rotula como "Área SGL". Valor oficial reconciliado
  // do SIGEF, quando escolhido, continua prevalecendo.
  if (imovel.tipoAzimute === 'plano' && efMod.fontePerimetro === 'calculado') {
    efMod.perimetro = res.lados.reduce(
      (s, l) => s + distancia({ e: l.de.leste, n: l.de.norte }, { e: l.para.leste, n: l.para.norte }), 0);
  }
  const modelos = carregarModelos();
  const varsModelo: Record<string, string> = {
    proprietario: imovel.tipoPessoa === 'Espólio' && imovel.inventarianteNome
      ? `Espólio de ${imovel.proprietario || imovel.posseiro || ''}, representado por seu inventariante ${imovel.inventarianteNome}`
      : (imovel.proprietario || imovel.posseiro || ''),
    cpf: imovel.tipoPessoa === 'Espólio' && imovel.inventarianteCpf
      ? `${imovel.cpfProprietario || '—'} (De Cujus) e CPF do Inventariante: ${imovel.inventarianteCpf}`
      : (imovel.cpfProprietario || ''),
    denominacao: imovel.denominacao || '',
    matricula: imovel.regimeTerra === 'posse' || !imovel.matricula ? (imovel.matricula || 'Posse (Sem Matrícula)') : (imovel.matricula || ''), cns: imovel.cns || '', municipio: formatarTextoMultimunicipal(imovel.municipio || '').preambuloPeca || imovel.municipio || '', comarca: obterComarca(imovel),
    area: `${numBR(efMod.areaHa, 4)} ha`, areaAnterior: imovel.areaAnterior != null ? `${numBR(imovel.areaAnterior, 4)} ha` : '',
    perimetro: `${numBR(efMod.perimetro)} m`, codigoIncra: imovel.codigoImovelIncra || '',
    tecnico: tecnico.nome || '', cft: tecnico.cft || '', numeroTrt: imovel.numeroTrt || tecnico.art || '',
    cidade: imovel.municipio || tecnico.cidadeAssinatura || '', data: input.dataExtenso || '',
  };
  const mod = (chave: keyof typeof modelos) => sanitizarTexto(preencherModelo(modelos[chave], varsModelo));

  // Título (servidão tem título próprio)
  const ehServidao = input.modo === 'servidao';
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 220 }, children: [
    new TextRun({ text: ehServidao ? 'MEMORIAL DESCRITIVO DE SERVIDÃO' : 'MEMORIAL DESCRITIVO', bold: true, size: 28 }),
  ] }));

  // Identificação em tabela de duas colunas (valores oficiais do SIGEF quando reconciliado; no modo
  // plano o perímetro já foi trocado acima pela soma das distâncias planas da narrativa)
  children.push(cabecalhoTabelaDocx(imovel, efMod.areaHa, efMod.perimetro, tecnico));

  // Variante INTERMAT (Mato Grosso): referência ao órgão estadual + parágrafo de finalidade próprio,
  // logo abaixo do cabeçalho. O restante do memorial (perímetro, tabelas, assinaturas) é o mesmo do
  // padrão INCRA, porque o INTERMAT reaproveita a peça certificada pelo Incra.
  if (imovel.padraoMemorial === 'intermat') {
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 60 }, children: [
      new TextRun({ text: 'INSTITUTO DE TERRAS DE MATO GROSSO — INTERMAT', bold: true, size: CORPO }),
    ] }));
    children.push(p(mod('memorialIntermatFinalidade')));
  }

  // Abertura própria da servidão (texto editável), antes da descrição do perímetro.
  if (ehServidao) {
    children.push(p(mod('servidaoIntro')));
  }

  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 280, after: 160 }, children: [new TextRun({ text: ehServidao ? 'DESCRIÇÃO DO PERÍMETRO DA SERVIDÃO' : 'DESCRIÇÃO DO PERÍMETRO', bold: true, size: 24 })] }));
  children.push(new Paragraph({
    alignment: AlignmentType.JUSTIFIED, spacing: { after: 120 },
    children: narrativaSegs.map((s) => new TextRun({ text: s.t, bold: s.b, size: CORPO })),
  }));

  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 240, after: 120 }, children: [new TextRun({ text: 'INFORMAÇÕES TÉCNICAS', bold: true, size: 24 })] }));
  // Imóvel urbano usa o texto próprio (sem menção a INCRA/área rural); rural usa o padrão.
  const ehUrbano = imovel.tipoImovel === 'urbano';
  children.push(p(mod(ehUrbano ? 'memorialInfoTecnicasUrbano' : 'memorialInfoTecnicas')));

  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 240, after: 120 }, children: [new TextRun({ text: 'OBSERVAÇÕES:', bold: true, size: 24 })] }));
  children.push(p(mod(ehUrbano ? 'memorialObservacoesUrbano' : 'memorialObservacoes').replace(/^\s*OBSERVAÇÕES:\s*/i, '')));

  // Data e assinatura do técnico
  const data = input.dataExtenso ? `, ${input.dataExtenso}` : '';
  const cidadeAss = imovel.municipio || tecnico.cidadeAssinatura || '';
  children.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 240, after: 40 }, children: [new TextRun({ text: `${cidadeAss}${data}.`, size: CORPO })] }));
  const rot = rotulosProfissional(tecnico);
  assinatura([
    (tecnico.nome || '').toUpperCase(),
    tecnico.formacao,
    `${rot.registro}: ${tecnico.cft}`,
    `Credenciamento INCRA: ${tecnico.credenciamentoIncra}`,
  ], true).forEach((c) => children.push(c));

  // Bloco proprietários/possuidores (com cônjuge, se houver)
  const tituloBloco = imovel.regimeTerra === 'posse' ? 'POSSUIDORES' : 'PROPRIETÁRIOS';
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 360, after: 80 }, children: [new TextRun({ text: tituloBloco, bold: true, size: 24 })] }));
  children.push(p(mod('declProprietario')));
  
  const propLinhas = [];
  if (imovel.tipoPessoa === 'Espólio') {
    propLinhas.push(`Espólio de ${imovel.proprietario}`);
    propLinhas.push(`Representado por seu inventariante: ${imovel.inventarianteNome || 'DADO AUSENTE'}`);
    propLinhas.push(`CPF do Inventariante: ${imovel.inventarianteCpf || 'DADO AUSENTE'}`);
    if (imovel.inventarianteRg) propLinhas.push(`RG do Inventariante: ${imovel.inventarianteRg}`);
  } else {
    propLinhas.push(`Nome: ${imovel.proprietario}`);
    propLinhas.push(`CPF: ${imovel.cpfProprietario}`);
    if (transmitente?.rg) {
      propLinhas.push(`RG: ${transmitente.rg}`);
    }
  }
  propLinhas.push(imovel.matricula ? `Imóvel de Matrícula: ${imovel.matricula}` : 'Imóvel de Posse (sem matrícula)');
  const qualifPrincipal = qualificacaoPapelProprietario(imovel.papelProprietario);
  if (qualifPrincipal) propLinhas.push(qualifPrincipal);

  const conjugePropNome = imovel.conjugeProprietario || transmitente?.conjugeNome || undefined;
  const conjugePropCpf = imovel.cpfConjugeProprietario || transmitente?.conjugeCpf || undefined;

  assinaturaComConjuge(propLinhas, conjugePropNome, conjugePropCpf).forEach((c) => children.push(c));

  // Demais titulares (condôminos, nu-proprietário, inventariante...): cada um com a sua assinatura.
  for (const parte of imovel.proprietariosAdicionais ?? []) {
    if (!parte.nome?.trim()) continue;
    const linhas = [`Nome: ${parte.nome}`, `CPF: ${parte.cpf || '—'}`, imovel.matricula ? `Imóvel de Matrícula: ${imovel.matricula}` : 'Imóvel de Posse (sem matrícula)'];
    const q = qualificacaoPapelProprietario(parte.papel);
    if (q) linhas.push(q);
    assinaturaComConjuge(linhas, parte.conjugeNome, parte.conjugeCpf).forEach((c) => children.push(c));
  }

  // Bloco comprador (se houver) — mais os compradores/donatários/coproprietários ADICIONAIS
  // (partesAdicionais, ex.: casal que não são cônjuges, herdeiros comprando juntos), cada um com
  // sua própria assinatura, no mesmo espírito do loop de proprietariosAdicionais acima.
  const partesCompradorValidas = (partesAdicionais ?? []).filter((p) => p.nome?.trim());
  if (imovel.comprador || partesCompradorValidas.length > 0) {
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 360, after: 80 }, children: [new TextRun({ text: 'COMPRADORES', bold: true, size: 24 })] }));
    children.push(p(mod('declProprietario')));

    if (imovel.comprador) {
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

    for (const parte of partesCompradorValidas) {
      const linhas = [`Nome: ${parte.nome}`, `CPF: ${parte.cpf || '—'}`];
      if (parte.rg) linhas.push(`RG: ${parte.rg}`);
      assinaturaComConjuge(linhas, parte.conjugeNome, parte.conjugeCpf).forEach((c) => children.push(c));
    }
  }

  // Bloco confrontantes (respeita posseiro/espólio e cônjuge)
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 360, after: 80 }, children: [new TextRun({ text: 'CONFRONTANTES', bold: true, size: 24 })] }));
  children.push(p(mod('declConfrontantes')));
  confrontantes.forEach((c) => {
    // Bem público (estrada, rio...) não assina — sem titular pra colher assinatura.
    if (!confrontanteAssina(c)) return;
    blocoAssinaturaConfrontante(c).forEach((x) => children.push(x));
  });

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Arial', size: CORPO } } } },
    sections: [{
      properties: { page: { margin: { top: 1133, bottom: 1133, left: 1133, right: 1133 } } },
      children,
    }],
  });
  const blob = await Packer.toBlob(doc);
  return compatibilizarWord2007(blob);
}

/** Linhas de assinatura de um confrontante conforme a condição. */
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
    const isCnpj = c.cpf && c.cpf.replace(/\D/g, '').length > 11;
    const labelDoc = isCnpj ? 'CNPJ' : 'CPF';
    const linhas = [
      `Nome: ${c.nome}`,
      `${labelDoc}: ${c.cpf}`,
    ];
    if (c.estadoCivil) linhas.push(`Estado Civil: ${c.estadoCivil}`);
    linhas.push('Na condição de possuidor(a)');
    return assinaturaComConjuge(linhas, c.conjugeNome, c.conjugeCpf);
  }
  // Linha de qualificação extra por condição (condômino / usufrutuário).
  const linhaCondicao = cond === 'condomino' ? 'Na condição de condômino(a)'
    : cond === 'usufrutuario' ? 'Na condição de usufrutuário(a)'
    : null;
  const isCnpj = c.cpf && c.cpf.replace(/\D/g, '').length > 11;
  const labelDoc = isCnpj ? 'CNPJ' : 'CPF';
  const linhas = [
    `Nome: ${c.nome}`,
    `${labelDoc}: ${c.cpf}`,
    `Imóvel de Matrícula: ${formatMatricula(c.matricula)}`,
  ];
  if (c.estadoCivil) linhas.push(`Estado Civil: ${c.estadoCivil}`);
  if (linhaCondicao) linhas.push(linhaCondicao);
  const out = assinaturaComConjuge(linhas, c.conjugeNome, c.conjugeCpf);
  // Usufruto: o nu-proprietário assina JUNTO (assinatura própria), se informado.
  if (cond === 'usufrutuario' && c.nuProprietarioNome?.trim()) {
    assinaturaComConjuge([
      `Nome: ${c.nuProprietarioNome}`,
      `CPF: ${c.nuProprietarioCpf || '—'}`,
      'Na condição de nu-proprietário(a)',
    ]).forEach((p) => out.push(p));
  }
  return out;
}
