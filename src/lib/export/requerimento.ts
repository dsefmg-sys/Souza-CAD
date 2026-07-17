import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import type { ImovelData, TecnicoData, PessoaQualificada, CorrecaoErrata, NaturezaCorrecao } from '../topo/types';
import { numBR, numBRmilhar } from '../topo/geometry';
import { valorPorExtenso } from '../topo/extenso';
import { rotulosProfissional } from '../topo/profissional';
import { sanitizarProfundo } from './sanitizar';
import { carregarModelos, preencherModelo, preencherModeloParagrafos } from '../store/modelos';
import { compatibilizarWord2007 } from './compatWord2007';

export type TipoAtoRequerimento = 'venda' | 'doacao' | 'unificacao' | 'desmembramento' | 'usucapiao' | 'retificacao';

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
  /** Partes adicionais (mais de um donatário/coproprietário) além de requerente/transmitente. */
  partesAdicionais?: PessoaQualificada[];
  correcoes?: CorrecaoErrata[];
  permitirIncompleto?: boolean;
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

function blocoPessoa(p: PessoaQualificada): Paragraph[] {
  const out = [
    campo('Nome:', p.nome),
    campo('RG:', `${p.rg || '—'}   CPF: ${p.cpf || '—'}`),
    campo('Nacionalidade:', p.nacionalidade || 'Brasileira'),
    campo('Naturalidade:', p.naturalidade),
    campo('Data de Nascimento:', p.dataNascimento),
    campo('Filiação:', p.filiacao),
    campo('Profissão:', p.profissao),
    campo('Estado Civil:', p.estadoCivil),
  ];
  if (p.conjugeNome || p.conjugeCpf) {
    out.push(campo('Cônjuge:', p.conjugeNome));
    out.push(campo('RG:', `${p.conjugeRg || '—'}   CPF: ${p.conjugeCpf || '—'}`));
  }
  out.push(campo('Residente e domiciliado em:', p.endereco));
  out.push(campo('Cidade/UF:', p.cidadeUf));
  out.push(campo('CEP:', p.cep));
  return out;
}


export async function gerarRequerimentoDocx(inputBruto: RequerimentoInput): Promise<Blob> {
  const input = sanitizarProfundo(inputBruto);
  const { imovel, tecnico, requerente, transmitente, areaRealHa, permitirIncompleto } = input;
  
  const f = (val?: string) => {
    if (permitirIncompleto && (!val || !val.trim() || val === '—')) return 'DADO AUSENTE';
    return val || '';
  };

  const fPessoa = (p: PessoaQualificada): PessoaQualificada => {
    if (!permitirIncompleto) return p;
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

  const tipo = input.tipoAto ?? 'venda';
  const rotOriginal = ROTULOS_ATO[tipo];
  const rot = imovel.regimeTerra === 'posse' ? {
    requerente: rotuloPosse(rotOriginal.requerente),
    transmitente: rotuloPosse(rotOriginal.transmitente),
    assinaReq: rotuloPosse(rotOriginal.assinaReq),
    assinaTrans: rotuloPosse(rotOriginal.assinaTrans),
  } : rotOriginal;
  const comarca = input.comarca || imovel.municipio || '—';
  const c: Paragraph[] = [];

  // Modelos de texto editáveis (declarações e responsabilidade). {variáveis} trocadas pelos dados reais.
  const modelos = carregarModelos();
  const varsModelo: Record<string, string> = {
    proprietario: f(imovel.proprietario), cpf: f(imovel.cpfProprietario), denominacao: f(imovel.denominacao),
    matricula: f(imovel.matricula), cns: f(imovel.cns), municipio: f(imovel.municipio), comarca,
    area: `${numBR(areaRealHa, 4)} ha`, areaAnterior: imovel.areaAnterior != null ? `${numBR(imovel.areaAnterior, 4)} ha` : (permitirIncompleto ? 'DADO AUSENTE' : ''),
    codigoIncra: f(imovel.codigoImovelIncra), tecnico: f(tecnico.nome), cft: f(tecnico.cft),
    numeroTrt: f(imovel.numeroTrt || tecnico.art), cidade: f(imovel.municipio || tecnico.cidadeAssinatura), data: f(input.dataExtenso),
  };

  if (imovel.ficticio) {
    c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: '*** DADOS FICTÍCIOS — DOCUMENTO DE DEMONSTRAÇÃO, SEM VALIDADE LEGAL ***', bold: true, size: 20, color: 'B91C1C' })] }));
  }
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: 'REQUERIMENTO DE AVERBAÇÃO DE GEORREFERENCIAMENTO COM RETIFICAÇÃO DE ÁREA', bold: true, size: 24 })] }));
  c.push(par('(Art. 176, §3º e §4º, e Art. 213, II, da Lei 6.015/73 c/c Decreto 4.449/02)', AlignmentType.CENTER));
  c.push(par(`Ilustríssimo Senhor(a) Oficial do Cartório de Registro de Imóveis da Comarca de ${comarca},`));

  const mostrarTransmitente = tipo !== 'retificacao' || !!transmitente.nome?.trim() || permitirIncompleto;

  c.push(titulo(rot.requerente));
  blocoPessoa(reqClonado).forEach((x) => c.push(x));

  if (mostrarTransmitente) {
    c.push(titulo(rot.transmitente));
    blocoPessoa(transClonado).forEach((x) => c.push(x));
  }

  partesAdicionais.forEach((p, i) => {
    let papelRotulo = `PARTE ADICIONAL ${i + 1}`;
    if (p.papel === 'requerente') {
      papelRotulo = tipo === 'venda' ? 'COMPRADOR / ADQUIRENTE ADICIONAL' : tipo === 'doacao' ? 'DONATÁRIO ADICIONAL' : 'REQUERENTE / COPROPRIETÁRIO ADICIONAL';
    } else if (p.papel === 'transmitente') {
      papelRotulo = tipo === 'venda' ? 'VENDEDOR / TRANSMITENTE ADICIONAL' : tipo === 'doacao' ? 'DOADOR ADICIONAL' : 'COPROPRIETÁRIO / TRANSMITENTE ADICIONAL';
    }
    c.push(titulo(papelRotulo));
    blocoPessoa(p).forEach((x) => c.push(x));
  });

  c.push(titulo('DO REQUERIMENTO'));
  let reqTextoRaw = '';
  if (tipo === 'doacao') reqTextoRaw = modelos.requerimentoDoacao;
  else if (tipo === 'unificacao') reqTextoRaw = modelos.requerimentoUnificacao;
  else if (tipo === 'desmembramento') reqTextoRaw = modelos.requerimentoDesmembramento;
  else if (tipo === 'usucapiao') reqTextoRaw = modelos.requerimentoUsucapiao;
  else if (tipo === 'retificacao') reqTextoRaw = modelos.requerimentoRetificacao;
  else reqTextoRaw = modelos.requerimentoVenda;

  c.push(par(preencherModelo(reqTextoRaw, varsModelo)));

  c.push(titulo('DA IDENTIFICAÇÃO DO IMÓVEL'));
  const origens = (imovel.matriculasOrigem ?? []).filter((m) => m.trim());
  const donoNome = (tipo === 'retificacao' && !transmitente.nome?.trim() && !permitirIncompleto)
    ? (reqClonado.nome || f(imovel.proprietario))
    : (transClonado.nome || f(imovel.proprietario));

  if (tipo === 'unificacao' && origens.length > 0) {
    c.push(par(`O imóvel resulta da unificação das matrículas nº ${origens.join(', nº ')}, situado no município de ${varsModelo.municipio}, passando a constituir uma só matrícula sob nº ${varsModelo.matricula}, Livro nº 2, em nome de ${donoNome}.`));
  } else if (imovel.regimeTerra === 'posse') {
    c.push(par(`O imóvel rural denominado ${varsModelo.denominacao}, situado no município de ${varsModelo.municipio}, é detido sob regime de posse por ${donoNome}${varsModelo.matricula && varsModelo.matricula !== 'DADO AUSENTE' ? `, com referência ao registro/transcrição nº ${varsModelo.matricula}` : ' (sem matrícula registrada)'}.`));
  } else {
    c.push(par(`O imóvel rural denominado ${varsModelo.denominacao}, situado no município de ${varsModelo.municipio}, encontra-se registrado neste Cartório sob a matrícula nº ${varsModelo.matricula}, Livro nº 2, em nome de ${donoNome}.`));
  }

  c.push(titulo('DO LEVANTAMENTO E DA RETIFICAÇÃO'));
  const areaAnt = imovel.areaAnterior != null ? `${numBR(imovel.areaAnterior, 4)}` : (permitirIncompleto ? 'DADO AUSENTE' : '—');
  c.push(par(`O imóvel possui, conforme registro anterior, área de ${areaAnt} hectares. Após a realização de levantamento topográfico georreferenciado, executado pelo profissional habilitado:`));
  const rotProf = rotulosProfissional(tecnico);
  c.push(campo('Nome:', f(tecnico.nome)));
  c.push(campo(`${rotProf.registro}:`, `${f(tecnico.cft)} - Código INCRA (SIGEF): ${f(tecnico.credenciamentoIncra)}`));
  c.push(par(`apurou-se que a área real do imóvel corresponde a ${numBR(areaRealHa, 4)} hectares, divergindo da área constante na matrícula, razão pela qual se requer a devida retificação.`));

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

  c.push(titulo('DA RESPONSABILIDADE TÉCNICA'));
  c.push(par(preencherModelo(modelos.requerimentoResponsabilidade, varsModelo)));

  c.push(titulo('DO VALOR DO IMÓVEL'));
  if (imovel.valorImovel != null && imovel.valorImovel > 0) {
    c.push(par(`Declaram, para fins fiscais e de cálculo dos emolumentos, que o valor do imóvel é de: R$ ${numBRmilhar(imovel.valorImovel)} (${valorPorExtenso(imovel.valorImovel)}).`));
  } else {
    const valImovelStr = permitirIncompleto ? 'DADO AUSENTE' : '_______';
    c.push(par(`Declaram, para fins fiscais e de cálculo dos emolumentos, que o valor do imóvel é de: R$ ${valImovelStr} (${valImovelStr === 'DADO AUSENTE' ? 'DADO AUSENTE' : '____________'}).`));
  }

  const finalidadePedido = tipo === 'venda' || tipo === 'doacao'
    ? 'para viabilizar o registro da futura transmissão da propriedade'
    : tipo === 'usucapiao'
      ? 'para instruir o pedido de reconhecimento da usucapião do imóvel'
      : 'para regularizar a base tabular do imóvel perante este Cartório';
  c.push(titulo('DO PEDIDO'));
  c.push(par(`Diante do exposto, requerem: a averbação do georreferenciamento do imóvel; a retificação da área e da descrição constante da matrícula, adequando-a à realidade física; a consequente regularização da base tabular do imóvel ${finalidadePedido}.`));
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

  assina([reqClonado.nome, rot.assinaReq]);
  if (mostrarTransmitente) {
    assina([transClonado.nome, rot.assinaTrans]);
  }
  partesAdicionais.forEach((p) => {
    let papelAssinatura = '(Parte adicional)';
    if (p.papel === 'requerente') {
      papelAssinatura = tipo === 'venda' ? '(Adquirente / Comprador Adicional)' : tipo === 'doacao' ? '(Donatário Adicional)' : '(Requerente Adicional)';
    } else if (p.papel === 'transmitente') {
      papelAssinatura = tipo === 'venda' ? '(Transmitente / Vendedor Adicional)' : tipo === 'doacao' ? '(Doador Adicional)' : '(Transmitente Adicional)';
    }
    assina([p.nome, papelAssinatura]);
  });
  assina([f(tecnico.nome), `${rotProf.registro} ${f(tecnico.cft)} - INCRA: ${f(tecnico.credenciamentoIncra)}`]);

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Arial' } } } },
    sections: [{ properties: { page: { margin: { top: 1133, bottom: 1133, left: 1133, right: 1133 } } }, children: c }],
  });
  const blob = await Packer.toBlob(doc);
  return compatibilizarWord2007(blob);
}
