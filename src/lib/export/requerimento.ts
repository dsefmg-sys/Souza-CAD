import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import type { ImovelData, TecnicoData, PessoaQualificada, CorrecaoErrata, NaturezaCorrecao } from '../topo/types';
import { numBR, numBRmilhar } from '../topo/geometry';
import { valorPorExtenso } from '../topo/extenso';
import { rotulosProfissional } from '../topo/profissional';
import { sanitizarProfundo } from './sanitizar';
import { carregarModelos, preencherModelo, preencherModeloParagrafos } from '../store/modelos';
import { compatibilizarWord2007 } from './compatWord2007';
import { obterComarca } from '../topo/municipios';

export type TipoAtoRequerimento = 'venda' | 'doacao' | 'unificacao' | 'desmembramento' | 'usucapiao' | 'retificacao';

import type { ModoTratamentoAusente } from '../topo/types';

export interface RequerimentoInput {
  imovel: ImovelData;
  tecnico: TecnicoData;
  requerente: PessoaQualificada;
  transmitente: PessoaQualificada;
  areaRealHa: number;     // área levantada (efetiva)
  comarca?: string;       // padrão = município do imóvel
  dataExtenso?: string;   // ex.: "17 de março de 2026"
  /** Tipo do ato que motiva a retificação — muda os rótulos das partes e o texto de contextualização. Padrão: 'venda'. */
  tipoAto?: TipoAtoRequerimento;
  /** Múltiplos atos selecionados (ex.: ['retificacao', 'desmembramento']). */
  tiposAtos?: TipoAtoRequerimento[];
  /** Partes adicionais (mais de um donatário/coproprietário) além de requerente/transmitente. */
  partesAdicionais?: PessoaQualificada[];
  correcoes?: CorrecaoErrata[];
  permitirIncompleto?: boolean;
  modoTratamentoAusente?: ModoTratamentoAusente;
}

const ROTULOS_ATO: Record<TipoAtoRequerimento, { requerente: string; transmitente: string; assinaReq: string; assinaTrans: string }> = {
  venda: {
    requerente: 'REQUERENTE (ADQUIRENTE / COMPRADOR)',
    transmitente: 'PROPRIETÁRIO REGISTRAL (TRANSMITENTE / VENDEDOR)',
    assinaReq: '(Requerente / Adquirente)',
    assinaTrans: '(Proprietário Registral / Transmitente)',
  },
  doacao: {
    requerente: 'REQUERENTE (DONATÁRIO)',
    transmitente: 'DOADOR (PROPRIETÁRIO REGISTRAL)',
    assinaReq: '(Requerente / Donatário)',
    assinaTrans: '(Doador / Proprietário Registral)',
  },
  unificacao: {
    requerente: 'REQUERENTE (PROPRIETÁRIO)',
    transmitente: 'COPROPRIETÁRIO / CÔNJUGE (SE HOUVER)',
    assinaReq: '(Requerente / Proprietário)',
    assinaTrans: '(Coproprietário / Cônjuge)',
  },
  desmembramento: {
    requerente: 'REQUERENTE (PROPRIETÁRIO)',
    transmitente: 'COPROPRIETÁRIO / CÔNJUGE (SE HOUVER)',
    assinaReq: '(Requerente / Proprietário)',
    assinaTrans: '(Coproprietário / Cônjuge)',
  },
  usucapiao: {
    requerente: 'REQUERENTE (USUCAPIENTE)',
    transmitente: 'TITULAR REGISTRAL / CONFRONTANTE (SE HOUVER)',
    assinaReq: '(Requerente / Usucapiente)',
    assinaTrans: '(Titular registral / Confrontante)',
  },
  retificacao: {
    requerente: 'REQUERENTE (PROPRIETÁRIO)',
    transmitente: 'CÔNJUGE / COPROPRIETÁRIO (SE HOUVER)',
    assinaReq: '(Requerente / Proprietário)',
    assinaTrans: '(Cônjuge / Coproprietário)',
  },
};

function formatarListaAtos(atos: TipoAtoRequerimento[]): string {
  const NOMES: Record<TipoAtoRequerimento, string> = {
    retificacao: 'RETIFICAÇÃO DE ÁREA',
    venda: 'COMPRA E VENDA',
    doacao: 'DOAÇÃO',
    unificacao: 'REMEMBRAMENTO (UNIFICAÇÃO)',
    desmembramento: 'DESMEMBRAMENTO DE GLEBA',
    usucapiao: 'RECONHECIMENTO DE USUCAPIÃO',
  };
  const nomes = atos.map((a) => NOMES[a] || a.toUpperCase());
  if (nomes.length === 1) return nomes[0];
  if (nomes.length === 2) return `${nomes[0]} E ${nomes[1]}`;
  return `${nomes.slice(0, -1).join(', ')} E ${nomes[nomes.length - 1]}`;
}

/**
 * Troca os rótulos de "propriedade" por "posse" quando o imóvel é de posse (não registrado).
 * Cobre todas as variações de caixa numa passada só. A forma composta ("coproprietário") é tratada
 * ANTES da simples, virando "compossuidor" (com+possuidor, o termo correto), senão sairia "copossuidor".
 * Assim o cabeçalho e a linha de assinatura ficam sempre iguais.
 */
function rotuloPosse(s: string): string {
  return s
    .replace(/COPROPRIETÁRIO/g, 'COMPOSSUIDOR')
    .replace(/Coproprietário/g, 'Compossuidor')
    .replace(/PROPRIETÁRIO/g, 'POSSUIDOR')
    .replace(/Proprietário/g, 'Possuidor')
    .replace(/proprietário/g, 'possuidor');
}


function titulo(t: string) {
  return new Paragraph({ spacing: { before: 200, after: 80 }, children: [new TextRun({ text: t, bold: true, size: 22 })] });
}
function par(t: string, align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.JUSTIFIED) {
  const children: TextRun[] = [];
  const parts = (t || '').split(/(DADO AUSENTE)/g);
  parts.forEach(p => {
    if (p === 'DADO AUSENTE') {
      children.push(new TextRun({ text: p, size: 22, color: 'FF0000', bold: true }));
    } else {
      children.push(new TextRun({ text: p, size: 22 }));
    }
  });
  return new Paragraph({ alignment: align, spacing: { after: 100 }, children });
}
function campo(rotulo: string, valor: string) {
  const v = valor || '—';
  const children = [new TextRun({ text: `${rotulo} `, bold: true, size: 22 })];
  if (v.includes('DADO AUSENTE')) {
    const parts = v.split(/(DADO AUSENTE)/g);
    parts.forEach(p => {
      if (p === 'DADO AUSENTE') {
        children.push(new TextRun({ text: p, size: 22, color: 'FF0000', bold: true }));
      } else {
        children.push(new TextRun({ text: p, size: 22 }));
      }
    });
  } else {
    children.push(new TextRun({ text: v, size: 22 }));
  }
  return new Paragraph({ spacing: { after: 20 }, children });
}

function blocoPessoa(p: PessoaQualificada, modo: ModoTratamentoAusente = 'dado_ausente', imovel?: ImovelData): Paragraph[] {
  const tem = (v?: string) => !!(v && v.trim() && v !== '—' && v !== 'DADO AUSENTE');
  const out: Paragraph[] = [];

  if (imovel && imovel.tipoPessoa === 'Espólio' && imovel.proprietario && p.nome === imovel.proprietario) {
    const invNome = imovel.inventarianteNome || 'DADO AUSENTE';
    const invCpf = imovel.inventarianteCpf || 'DADO AUSENTE';
    const invRg = imovel.inventarianteRg || 'DADO AUSENTE';
    const invNac = imovel.inventarianteNacionalidade || 'Brasileira';
    const invEst = imovel.inventarianteEstadoCivil || 'DADO AUSENTE';
    out.push(campo('Nome:', `Espólio de ${imovel.proprietario}, representado por seu inventariante ${invNome}`));
    out.push(campo('RG do Inventariante:', invRg));
    out.push(campo('CPF do Inventariante:', invCpf));
    out.push(campo('Nacionalidade do Inventariante:', invNac));
    out.push(campo('Estado Civil do Inventariante:', invEst));
    if (p.cpf) {
      out.push(campo('CPF do De Cujus:', p.cpf));
    }
    if (tem(p.endereco) || modo === 'dado_ausente') out.push(campo('Residente e domiciliado em:', p.endereco));
    if (tem(p.cidadeUf) || modo === 'dado_ausente') out.push(campo('Cidade/UF:', p.cidadeUf));
    if (tem(p.cep) || modo === 'dado_ausente') out.push(campo('CEP:', p.cep));
    return out;
  }

  if (tem(p.nome) || modo === 'dado_ausente') out.push(campo('Nome:', p.nome || 'DADO AUSENTE'));

  const rgVal = p.rg || (modo === 'dado_ausente' ? 'DADO AUSENTE' : '—');
  out.push(campo('RG:', rgVal));

  const cpfVal = p.cpf || (modo === 'dado_ausente' ? 'DADO AUSENTE' : '—');
  out.push(campo('CPF:', cpfVal));

  const nacVal = p.nacionalidade || 'Brasileira';
  out.push(campo('Nacionalidade:', nacVal));

  if (tem(p.naturalidade) || modo === 'dado_ausente') {
    out.push(campo('Naturalidade:', p.naturalidade));
  }
  if (tem(p.dataNascimento) || modo === 'dado_ausente') {
    out.push(campo('Data de Nascimento:', p.dataNascimento));
  }
  if (tem(p.filiacao) || modo === 'dado_ausente') {
    out.push(campo('Filiação:', p.filiacao));
  }

  const profVal = p.profissao || (modo === 'dado_ausente' ? 'DADO AUSENTE' : '—');
  out.push(campo('Profissão:', profVal));

  if (tem(p.estadoCivil) || modo === 'dado_ausente') {
    out.push(campo('Estado Civil:', p.estadoCivil || 'DADO AUSENTE'));
  }

  if (tem(p.conjugeNome) || tem(p.conjugeCpf) || (modo === 'dado_ausente' && (p.conjugeNome || p.conjugeCpf))) {
    const cNome = p.conjugeNome || 'DADO AUSENTE';
    const cCpf = p.conjugeCpf || 'DADO AUSENTE';
    const cRg = p.conjugeRg || 'DADO AUSENTE';
    out.push(campo('Cônjuge:', cNome));
    out.push(campo('RG Cônjuge:', cRg));
    out.push(campo('CPF Cônjuge:', cCpf));
  }

  if (tem(p.endereco) || modo === 'dado_ausente') out.push(campo('Residente e domiciliado em:', p.endereco));
  if (tem(p.cidadeUf) || modo === 'dado_ausente') out.push(campo('Cidade/UF:', p.cidadeUf));
  if (tem(p.cep) || modo === 'dado_ausente') out.push(campo('CEP:', p.cep));

  return out;
}


export async function gerarRequerimentoDocx(inputBruto: RequerimentoInput): Promise<Blob> {
  const input = sanitizarProfundo(inputBruto);
  const { imovel, tecnico, requerente, transmitente, areaRealHa, permitirIncompleto } = input;
  const modo: ModoTratamentoAusente = input.modoTratamentoAusente ?? (permitirIncompleto ? 'dado_ausente' : 'omitir');
  
  const f = (val?: string) => {
    if (modo === 'dado_ausente' && (!val || !val.trim() || val === '—')) return 'DADO AUSENTE';
    return val || '';
  };

  const fPessoa = (p: PessoaQualificada): PessoaQualificada => {
    if (modo !== 'dado_ausente') return p;
    return {
      ...p,
      nome: f(p.nome),
      rg: f(p.rg),
      cpf: f(p.cpf),
      nacionalidade: f(p.nacionalidade || 'Brasileira'),
      naturalidade: f(p.naturalidade),
      dataNascimento: f(p.dataNascimento),
      filiacao: f(p.filiacao),
      profissao: f(p.profissao),
      estadoCivil: f(p.estadoCivil),
      endereco: f(p.endereco),
      cidadeUf: f(p.cidadeUf),
      cep: f(p.cep),
      conjugeNome: p.conjugeNome || p.conjugeCpf ? f(p.conjugeNome) : '',
      conjugeCpf: p.conjugeNome || p.conjugeCpf ? f(p.conjugeCpf) : '',
    };
  };


  const reqClonado = fPessoa(requerente);
  const transClonado = fPessoa(transmitente);
  const partesAdicionais = (input.partesAdicionais ?? []).map(fPessoa).filter((p) => p.nome?.trim());

  const atos: TipoAtoRequerimento[] = (input.tiposAtos && input.tiposAtos.length > 0)
    ? input.tiposAtos
    : [input.tipoAto ?? 'venda'];

  const tipoPrioritario = atos.find((a) => a === 'venda' || a === 'doacao' || a === 'usucapiao') || atos[0];
  const rotOriginal = ROTULOS_ATO[tipoPrioritario];
  const rot = imovel.regimeTerra === 'posse' ? {
    requerente: rotuloPosse(rotOriginal.requerente),
    transmitente: rotuloPosse(rotOriginal.transmitente),
    assinaReq: rotuloPosse(rotOriginal.assinaReq),
    assinaTrans: rotuloPosse(rotOriginal.assinaTrans),
  } : rotOriginal;
  const comarca = input.comarca || obterComarca(imovel);
  const c: Paragraph[] = [];

  // Cálculo de divergência de área entre registro antigo e medição apurada
  const areaAntVal = imovel.areaAnterior != null ? imovel.areaAnterior : null;
  const diffHa = areaAntVal != null ? areaRealHa - areaAntVal : 0;
  const diffM2 = diffHa * 10000;
  const diffPct = (areaAntVal != null && areaAntVal > 0) ? (diffHa / areaAntVal) * 100 : 0;

  const strDiffHa = `${diffHa >= 0 ? '+' : ''}${numBR(diffHa, 4)} ha`;
  const strDiffM2 = `${diffM2 >= 0 ? '+' : ''}${numBR(diffM2, 2)} m²`;
  const strDiffPct = `${diffPct >= 0 ? '+' : ''}${numBR(diffPct, 2)}%`;

  // Modelos de texto editáveis (declarações e responsabilidade). {variáveis} trocadas pelos dados reais.
  const modelos = carregarModelos();
  const varsModelo: Record<string, string> = {
    proprietario: imovel.tipoPessoa === 'Espólio' && imovel.inventarianteNome
      ? `Espólio de ${f(imovel.proprietario)}, representado por seu inventariante ${f(imovel.inventarianteNome)}`
      : f(imovel.proprietario),
    cpf: imovel.tipoPessoa === 'Espólio' && imovel.inventarianteCpf
      ? `${f(imovel.cpfProprietario)} (De Cujus) e CPF do Inventariante: ${f(imovel.inventarianteCpf)}`
      : f(imovel.cpfProprietario),
    denominacao: f(imovel.denominacao),
    matricula: f(imovel.matricula), cns: f(imovel.cns), municipio: f(imovel.municipio), comarca,
    area: `${numBR(areaRealHa, 4)} ha`,
    areaAnterior: areaAntVal != null ? `${numBR(areaAntVal, 4)} ha` : (permitirIncompleto ? 'DADO AUSENTE' : ''),
    areaDiferenca: strDiffHa,
    areaDiferencaM2: strDiffM2,
    areaDiferencaPct: strDiffPct,
    codigoIncra: f(imovel.codigoImovelIncra), tecnico: f(tecnico.nome), cft: f(tecnico.cft),
    numeroTrt: f(imovel.numeroTrt || tecnico.art), cidade: f(imovel.municipio || tecnico.cidadeAssinatura), data: f(input.dataExtenso),
  };

  if (imovel.ficticio) {
    c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: '*** DADOS FICTÍCIOS — DOCUMENTO DE DEMONSTRAÇÃO, SEM VALIDADE LEGAL ***', bold: true, size: 20, color: 'B91C1C' })] }));
  }

  const tituloDocumento = (atos.length === 1 && atos[0] === 'retificacao')
    ? 'REQUERIMENTO DE AVERBAÇÃO DE GEORREFERENCIAMENTO COM RETIFICAÇÃO DE ÁREA'
    : `REQUERIMENTO DE AVERBAÇÃO DE GEORREFERENCIAMENTO CUMULADO COM ${formatarListaAtos(atos)}`;

  c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: tituloDocumento, bold: true, size: 24 })] }));
  c.push(par('(Art. 176, §3º e §4º, e Art. 213, II, da Lei 6.015/73 c/c Decreto 4.449/02)', AlignmentType.CENTER));
  c.push(par(`Ilustríssimo Senhor(a) Oficial do Cartório de Registro de Imóveis da Comarca de ${comarca},`));

  const mostrarTransmitente = tipoPrioritario !== 'retificacao' || !!transmitente.nome?.trim() || permitirIncompleto;

  const requerentes = [reqClonado, ...partesAdicionais.filter((p) => p.papel === 'requerente' || (!p.papel && tipoPrioritario === 'venda'))];
  const transmitentes = [transClonado, ...partesAdicionais.filter((p) => p.papel === 'transmitente')];

  const rotRequerente = requerentes.length > 1
    ? (tipoPrioritario === 'venda' ? 'REQUERENTES (ADQUIRENTES / COMPRADORES)' : tipoPrioritario === 'doacao' ? 'REQUERENTES (DONATÁRIOS)' : 'REQUERENTES (PROPRIETÁRIOS / POSSUIDORES)')
    : rot.requerente;

  c.push(titulo(rotRequerente));
  requerentes.forEach((p, idx) => {
    if (idx > 0) c.push(new Paragraph({ spacing: { before: 140 } }));
    blocoPessoa(p, modo, imovel).forEach((x) => c.push(x));
  });

  if (mostrarTransmitente && transmitentes.length > 0) {
    const rotTransmitente = transmitentes.length > 1
      ? (tipoPrioritario === 'venda' ? 'PROPRIETÁRIOS REGISTRAIS (TRANSMITENTES / VENDEDORES)' : tipoPrioritario === 'doacao' ? 'DOADORES (PROPRIETÁRIOS REGISTRAIS)' : 'PROPRIETÁRIOS REGISTRAIS')
      : rot.transmitente;

    c.push(titulo(rotTransmitente));
    transmitentes.forEach((p, idx) => {
      if (idx > 0) c.push(new Paragraph({ spacing: { before: 140 } }));
      blocoPessoa(p, modo, imovel).forEach((x) => c.push(x));
    });
  }

  c.push(titulo('DO REQUERIMENTO'));
  for (const ato of atos) {
    let reqTextoRaw = '';
    if (ato === 'doacao') reqTextoRaw = modelos.requerimentoDoacao;
    else if (ato === 'unificacao') reqTextoRaw = modelos.requerimentoUnificacao;
    else if (ato === 'desmembramento') reqTextoRaw = modelos.requerimentoDesmembramento;
    else if (ato === 'usucapiao') reqTextoRaw = modelos.requerimentoUsucapiao;
    else if (ato === 'retificacao') reqTextoRaw = modelos.requerimentoRetificacao;
    else reqTextoRaw = modelos.requerimentoVenda;

    c.push(par(preencherModelo(reqTextoRaw, varsModelo)));
  }

  c.push(titulo('DA IDENTIFICAÇÃO DO IMÓVEL'));
  const origens = (imovel.matriculasOrigem ?? []).filter((m) => m.trim());
  const propOuPosse = (imovel.proprietario || imovel.posseiro || '').trim();
  const donoNome = (tipoPrioritario === 'retificacao' && !transmitente.nome?.trim() && !permitirIncompleto)
    ? (reqClonado.nome || f(propOuPosse))
    : (transClonado.nome || f(propOuPosse));
  const ehPosse = imovel.regimeTerra === 'posse' || !imovel.matricula;

  if (atos.includes('unificacao') && origens.length > 0) {
    c.push(par(`O imóvel resulta da unificação das matrículas nº ${origens.join(', nº ')}, situado no município de ${varsModelo.municipio}, passando a constituir uma só matrícula sob nº ${varsModelo.matricula}, Livro nº 2, em nome de ${donoNome}.`));
  } else if (ehPosse) {
    c.push(par(`O imóvel rural denominado ${varsModelo.denominacao}, situado no município de ${varsModelo.municipio}, é detido sob regime de posse por ${donoNome}${varsModelo.matricula && varsModelo.matricula !== 'DADO AUSENTE' && varsModelo.matricula !== 'Posse Sem Matrícula' ? `, com referência ao registro/transcrição nº ${varsModelo.matricula}` : ' (área de posse, sem matrícula registrada)'}.`));
  } else {
    c.push(par(`O imóvel rural denominado ${varsModelo.denominacao}, situado no município de ${varsModelo.municipio}, encontra-se registrado neste Cartório sob a matrícula nº ${varsModelo.matricula}, Livro nº 2, em nome de ${donoNome}.`));
  }

  c.push(titulo('DO LEVANTAMENTO E DA RETIFICAÇÃO DE ÁREA'));
  const areaAntStr = areaAntVal != null ? `${numBR(areaAntVal, 4)}` : (permitirIncompleto ? 'DADO AUSENTE' : '—');
  c.push(par(`O imóvel possui, conforme registro constante na matrícula/transcrição nº ${varsModelo.matricula}, a área descrita de ${areaAntStr} hectares. Após a realização de levantamento topográfico georreferenciado ao Sistema Geodésico Brasileiro (SIRGAS 2000), executado pelo profissional credenciado:`));
  const rotProf = rotulosProfissional(tecnico);
  c.push(campo('Nome:', f(tecnico.nome)));
  c.push(campo(`${rotProf.registro}:`, `${f(tecnico.cft)} - Código INCRA (SIGEF): ${f(tecnico.credenciamentoIncra)}`));

  if (areaAntVal != null && Math.abs(diffHa) > 0.0001) {
    const tipoDivergencia = diffHa > 0 ? 'aumento' : 'redução';
    c.push(par(
      `apurou-se que a área real apurada do imóvel corresponde a ${numBR(areaRealHa, 4)} hectares (${numBR(areaRealHa * 10000, 2)} m²), ` +
      `apresentando uma divergência métrica de ${strDiffHa} (${strDiffM2}, correspondente a uma variação de ${strDiffPct}) ` +
      `em relação à área anteriormente registrada (${numBR(areaAntVal, 4)} ha), ocorrendo um ${tipoDivergencia} decorrente do aprimoramento das técnicas de medição geodésica e precisão de limites perimétricos.\n\n` +
      `Diante do exposto e comprovado pelas peças técnicas anexas (Planta, Memorial Descritivo e Certificação SIGEF/INCRA), ` +
      `requer-se a Vossa Senhoria a devida averbação dos novos limites perimétricos e a RETIFICAÇÃO DA ÁREA do imóvel, ` +
      `nos termos do Art. 213, inciso II, da Lei nº 6.015/1973 (Lei de Registros Públicos).`
    ));
  } else {
    c.push(par(
      `apurou-se que a área real apurada do imóvel corresponde a ${numBR(areaRealHa, 4)} hectares, a qual requer a devida averbação e retificação dos limites perimétricos georreferenciados nos termos do Art. 213, II, da Lei nº 6.015/1973.`
    ));
  }

  c.push(titulo('DOS CONFRONTANTES'));
  preencherModeloParagrafos(modelos.requerimentoConfrontantes, varsModelo).forEach((t) => c.push(par(t)));

  if (input.correcoes && input.correcoes.length > 0) {
    c.push(titulo('DA RETIFICAÇÃO DE DADOS DE MATRÍCULA E DADOS MATERIAIS'));
    c.push(par('Requer-se igualmente, a fim de sanar contradições e atualizar a qualificação registral do imóvel e das partes no mesmo ato de retificação de área, as seguintes retificações de dados materiais:'));
    
    const TITULOS_NATUREZA: Record<NaturezaCorrecao, string> = {
      imovel: 'Identificação do Imóvel:',
      pessoais: 'Qualificação Pessoal dos Proprietários:',
      confrontantes: 'Dados de Confrontantes e Registros:',
      geometria: 'Elementos Geométricos e Vértices:',
      outros: 'Outros Detalhes e Esclarecimentos:',
    };

    const naturezasOrdenadas: NaturezaCorrecao[] = ['imovel', 'pessoais', 'confrontantes', 'geometria', 'outros'];
    const agrupadas: Record<NaturezaCorrecao, CorrecaoErrata[]> = {
      imovel: [], pessoais: [], confrontantes: [], geometria: [], outros: [],
    };
    for (const cor of input.correcoes) {
      const nat = cor.natureza || 'outros';
      if (agrupadas[nat]) {
        agrupadas[nat].push(cor);
      } else {
        agrupadas.outros.push(cor);
      }
    }

    for (const nat of naturezasOrdenadas) {
      const lista = agrupadas[nat];
      if (lista.length === 0) continue;
      c.push(new Paragraph({ spacing: { before: 80, after: 40 }, children: [new TextRun({ text: TITULOS_NATUREZA[nat], bold: true, size: 22 })] }));
      for (const cor of lista) {
        c.push(new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 60 },
          children: [
            new TextRun({ text: `· ${cor.onde}: `, bold: true, size: 22 }),
            new TextRun({ text: 'Onde se lê ', size: 22 }),
            new TextRun({ text: cor.constava || '—', size: 22 }),
            new TextRun({ text: ', leia-se: ', size: 22 }),
            new TextRun({ text: cor.passa || '—', bold: true, size: 22 }),
            new TextRun({ text: '.', size: 22 }),
          ]
        }));
      }
    }
  }

  const respTexto = preencherModelo(modelos.requerimentoResponsabilidade, varsModelo);
  const temTituloProprio = respTexto.trim().startsWith('DA RESPONSABILIDADE');
  if (!temTituloProprio) {
    c.push(titulo('DA RESPONSABILIDADE TÉCNICA'));
  }
  preencherModeloParagrafos(modelos.requerimentoResponsabilidade, varsModelo).forEach((t) => {
    const limpo = t.trim();
    if (!limpo) return;
    if (temTituloProprio && limpo.startsWith('DA RESPONSABILIDADE')) {
      c.push(titulo(limpo));
    } else {
      c.push(par(limpo));
    }
  });

  c.push(titulo('DO VALOR DO IMÓVEL'));
  if (imovel.valorImovel != null && imovel.valorImovel > 0) {
    c.push(par(`Declaram, para fins fiscais e de cálculo dos emolumentos, que o valor do imóvel é de: R$ ${numBRmilhar(imovel.valorImovel)} (${valorPorExtenso(imovel.valorImovel)}).`));
  } else {
    const valImovelStr = permitirIncompleto ? 'DADO AUSENTE' : '_______';
    c.push(par(`Declaram, para fins fiscais e de cálculo dos emolumentos, que o valor do imóvel é de: R$ ${valImovelStr} (${valImovelStr === 'DADO AUSENTE' ? 'DADO AUSENTE' : '____________'}).`));
  }

  c.push(titulo('DO PEDIDO'));
  const itensPedidos: string[] = [
    'a averbação do georreferenciamento do imóvel ao Sistema Geodésico Brasileiro (SIRGAS 2000)',
    'a retificação da área e da descrição constante da matrícula, adequando-a à realidade física apurada',
  ];
  if (atos.includes('unificacao')) {
    itensPedidos.push('o remembramento e unificação das matrículas de origem sob uma nova matrícula única');
  }
  if (atos.includes('desmembramento')) {
    itensPedidos.push('o desmembramento da parcela destacada com a abertura da respectiva matrícula independente');
  }
  if (atos.includes('venda')) {
    itensPedidos.push('o registro do título de transmissão de propriedade por compra e venda em favor do adquirente');
  }
  if (atos.includes('doacao')) {
    itensPedidos.push('o registro do título de doação em favor do donatário');
  }
  if (atos.includes('usucapiao')) {
    itensPedidos.push('o processamento e o reconhecimento da usucapião extrajudicial com a devida transposição registral');
  }
  itensPedidos.push('a consequente regularização da base tabular do imóvel perante este Cartório de Registro de Imóveis');

  if (requerentes.length > 1) {
    const detalhesFracoes = requerentes.map((r) => {
      const fVal = r.fracaoIdeal !== undefined && r.fracaoIdeal !== ''
        ? r.fracaoIdeal
        : String(Math.round((100 / requerentes.length) * 100) / 100);
      return `${r.nome || 'DADO AUSENTE'} (${fVal}%)`;
    }).join(', ');
    itensPedidos.push(`Os adquirentes adquirem o imóvel em Condomínio Pro Indiviso cabendo a cada um a respectiva fração ideal, conforme segue: ${detalhesFracoes}`);
  }

  const textoPedidosFormatted = itensPedidos.map((p, idx) => ` (${idx + 1}) ${p};`).join('');
  c.push(par(`Diante do exposto, requerem a Vossa Senhoria:${textoPedidosFormatted}`));
  c.push(par('Nestes termos, pede deferimento.'));

  const data = input.dataExtenso ? `${comarca}, ${input.dataExtenso}.` : `${comarca}, ____ de __________ de ______.`;
  c.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 240, after: 200 }, children: [new TextRun({ text: data, size: 22 })] }));

  c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 }, children: [new TextRun({ text: 'ASSINATURAS', bold: true, size: 22 })] }));
  
  const assina = (linhas: string[]) => {
    c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 300 }, keepNext: true, keepLines: true, children: [new TextRun({ text: '____________________________________', size: 22 })] }));
    linhas.forEach((l) => {
      const runs: TextRun[] = [];
      const parts = (l || '').split(/(DADO AUSENTE)/g);
      parts.forEach(p => {
        if (p === 'DADO AUSENTE') {
          runs.push(new TextRun({ text: p, size: 22, color: 'FF0000', bold: true }));
        } else {
          runs.push(new TextRun({ text: p, size: 22 }));
        }
      });
      c.push(new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, keepLines: true, children: runs }));
    });
  };

  const assinaPessoa = (p: PessoaQualificada, rotuloPapel: string) => {
    if (imovel.tipoPessoa === 'Espólio' && imovel.proprietario && p.nome === imovel.proprietario) {
      assina([
        `Espólio de ${imovel.proprietario}`,
        `Representado pelo Inventariante: ${imovel.inventarianteNome || 'DADO AUSENTE'}`,
        rotuloPapel
      ]);
    } else {
      assina([p.nome, rotuloPapel]);
    }
  };

  requerentes.forEach((p) => {
    assinaPessoa(p, rot.assinaReq);
  });
  if (mostrarTransmitente) {
    transmitentes.forEach((p) => {
      assinaPessoa(p, rot.assinaTrans);
    });
  }
  assina([f(tecnico.nome), `${rotProf.registro} ${f(tecnico.cft)} - INCRA: ${f(tecnico.credenciamentoIncra)}`]);

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Arial' } } } },
    sections: [{ properties: { page: { margin: { top: 1133, bottom: 1133, left: 1133, right: 1133 } } }, children: c }],
  });
  const blob = await Packer.toBlob(doc);
  return compatibilizarWord2007(blob);
}
