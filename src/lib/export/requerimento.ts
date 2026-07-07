import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import type { ImovelData, TecnicoData, PessoaQualificada, CorrecaoErrata, NaturezaCorrecao } from '../topo/types';
import { numBR, numBRmilhar } from '../topo/geometry';
import { valorPorExtenso } from '../topo/extenso';
import { rotulosProfissional } from '../topo/profissional';
import { sanitizarProfundo } from './sanitizar';
import { carregarModelos, preencherModelo, preencherModeloParagrafos } from '../store/modelos';
import { compatibilizarWord2007 } from './compatWord2007';

export type TipoAtoRequerimento = 'venda' | 'doacao' | 'unificacao' | 'desmembramento' | 'usucapiao';

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
};

function fraseContextoAto(tipo: TipoAtoRequerimento): string {
  switch (tipo) {
    case 'doacao':
      return 'considerando que o mesmo é objeto de doação ao requerente';
    case 'unificacao':
      return 'considerando que o requerente promove a unificação deste imóvel com outro(s) de sua propriedade';
    case 'desmembramento':
      return 'considerando que o requerente promove o desmembramento de parte deste imóvel';
    case 'usucapiao':
      return 'considerando que o requerente busca o reconhecimento da usucapião sobre o imóvel';
    case 'venda':
    default:
      return 'considerando que o mesmo encontra-se em processo de transmissão ao requerente';
  }
}

function titulo(t: string) {
  return new Paragraph({ spacing: { before: 200, after: 80 }, children: [new TextRun({ text: t, bold: true, size: 22 })] });
}
function par(t: string, align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.JUSTIFIED) {
  return new Paragraph({ alignment: align, spacing: { after: 100 }, children: [new TextRun({ text: t, size: 22 })] });
}
function campo(rotulo: string, valor: string) {
  return new Paragraph({ spacing: { after: 20 }, children: [
    new TextRun({ text: `${rotulo} `, bold: true, size: 22 }),
    new TextRun({ text: valor || '—', size: 22 }),
  ] });
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

function txtRequerimento(tipo: TipoAtoRequerimento): string {
  return (
    'O requerente, em conjunto com o proprietário registral acima qualificado, vem, ' +
    'respeitosamente, à presença de Vossa Senhoria, com fundamento no art. 176, §3º e §4º, e ' +
    'art. 213, inciso II, da Lei nº 6.015/73, com redação dada pela Lei nº 10.931/04, c/c o ' +
    'Decreto nº 4.449/02, requerer a averbação do georreferenciamento com retificação da área e ' +
    'da descrição do imóvel rural, visando a adequação da descrição tabular à realidade física ' +
    `do imóvel, ${fraseContextoAto(tipo)}.`
  );
}

export async function gerarRequerimentoDocx(inputBruto: RequerimentoInput): Promise<Blob> {
  const input = sanitizarProfundo(inputBruto);
  const { imovel, tecnico, requerente, transmitente, areaRealHa } = input;
  const tipo = input.tipoAto ?? 'venda';
  const rotOriginal = ROTULOS_ATO[tipo];
  const rot = imovel.regimeTerra === 'posse' ? {
    requerente: rotOriginal.requerente.replace('PROPRIETÁRIO', 'POSSUIDOR'),
    transmitente: rotOriginal.transmitente.replace('PROPRIETÁRIO', 'POSSUIDOR'),
    assinaReq: rotOriginal.assinaReq.replace('Proprietário', 'Possuidor'),
    assinaTrans: rotOriginal.assinaTrans.replace('Proprietário', 'Possuidor'),
  } : rotOriginal;
  const comarca = input.comarca || imovel.municipio || '—';
  const c: Paragraph[] = [];

  // Modelos de texto editáveis (declarações e responsabilidade). {variáveis} trocadas pelos dados reais.
  const modelos = carregarModelos();
  const varsModelo: Record<string, string> = {
    proprietario: imovel.proprietario || '', cpf: imovel.cpfProprietario || '', denominacao: imovel.denominacao || '',
    matricula: imovel.matricula || '', cns: imovel.cns || '', municipio: imovel.municipio || '', comarca,
    area: `${numBR(areaRealHa, 4)} ha`, areaAnterior: imovel.areaAnterior != null ? `${numBR(imovel.areaAnterior, 4)} ha` : '',
    codigoIncra: imovel.codigoImovelIncra || '', tecnico: tecnico.nome || '', cft: tecnico.cft || '',
    numeroTrt: imovel.numeroTrt || tecnico.art || '', cidade: tecnico.cidadeAssinatura || '', data: input.dataExtenso || '',
  };

  if (imovel.ficticio) {
    c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: '*** DADOS FICTÍCIOS — DOCUMENTO DE DEMONSTRAÇÃO, SEM VALIDADE LEGAL ***', bold: true, size: 20, color: 'B91C1C' })] }));
  }
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: 'REQUERIMENTO DE AVERBAÇÃO DE GEORREFERENCIAMENTO COM RETIFICAÇÃO DE ÁREA', bold: true, size: 24 })] }));
  c.push(par('(Art. 176, §3º e §4º, e Art. 213, II, da Lei 6.015/73 c/c Decreto 4.449/02)', AlignmentType.CENTER));
  c.push(par(`Ilustríssimo Senhor(a) Oficial do Cartório de Registro de Imóveis da Comarca de ${comarca},`));

  c.push(titulo(rot.requerente));
  blocoPessoa(requerente).forEach((x) => c.push(x));

  c.push(titulo(rot.transmitente));
  blocoPessoa(transmitente).forEach((x) => c.push(x));

  const partesAdicionais = (input.partesAdicionais ?? []).filter((p) => p.nome?.trim());
  partesAdicionais.forEach((p, i) => {
    c.push(titulo(`PARTE ADICIONAL ${i + 1}`));
    blocoPessoa(p).forEach((x) => c.push(x));
  });

  c.push(titulo('DO REQUERIMENTO'));
  c.push(par(txtRequerimento(tipo)));

  c.push(titulo('DA IDENTIFICAÇÃO DO IMÓVEL'));
  const origens = (imovel.matriculasOrigem ?? []).filter((m) => m.trim());
  if (tipo === 'unificacao' && origens.length > 0) {
    c.push(par(`O imóvel resulta da unificação das matrículas nº ${origens.join(', nº ')}, situado no município de ${imovel.municipio || '—'}, passando a constituir uma só matrícula sob nº ${imovel.matricula || '—'}, Livro nº 2, em nome de ${transmitente.nome || imovel.proprietario || '—'}.`));
  } else if (imovel.regimeTerra === 'posse') {
    c.push(par(`O imóvel rural denominado ${imovel.denominacao || '—'}, situado no município de ${imovel.municipio || '—'}, é detido sob regime de posse por ${transmitente.nome || imovel.proprietario || '—'}${imovel.matricula ? `, com referência ao registro/transcrição nº ${imovel.matricula}` : ' (sem matrícula registrada)'}.`));
  } else {
    c.push(par(`O imóvel rural denominado ${imovel.denominacao || '—'}, situado no município de ${imovel.municipio || '—'}, encontra-se registrado neste Cartório sob a matrícula nº ${imovel.matricula || '—'}, Livro nº 2, em nome de ${transmitente.nome || imovel.proprietario || '—'}.`));
  }

  c.push(titulo('DO LEVANTAMENTO E DA RETIFICAÇÃO'));
  const areaAnt = imovel.areaAnterior != null ? `${numBR(imovel.areaAnterior, 4)}` : '—';
  c.push(par(`O imóvel possui, conforme registro anterior, área de ${areaAnt} hectares. Após a realização de levantamento topográfico georreferenciado, executado pelo profissional habilitado:`));
  const rotProf = rotulosProfissional(tecnico);
  c.push(campo('Nome:', tecnico.nome));
  c.push(campo(`${rotProf.registro}:`, `${tecnico.cft} - Código INCRA (SIGEF): ${tecnico.credenciamentoIncra}`));
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
    c.push(par('Declaram, para fins fiscais e de cálculo dos emolumentos, que o valor do imóvel é de: R$ _______ (____________).'));
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
  // keepNext/keepLines: impede o Word de cortar a página entre o traço de assinatura e o nome.
  const assina = (linhas: string[]) => {
    c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 300 }, keepNext: true, keepLines: true, children: [new TextRun({ text: '____________________________________', size: 22 })] }));
    linhas.forEach((l) => c.push(new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, keepLines: true, children: [new TextRun({ text: l, size: 22 })] })));
  };
  assina([requerente.nome, rot.assinaReq]);
  assina([transmitente.nome, rot.assinaTrans]);
  partesAdicionais.forEach((p) => assina([p.nome, '(Parte adicional)']));
  assina([tecnico.nome, `${rotProf.registro} ${tecnico.cft} - INCRA: ${tecnico.credenciamentoIncra}`]);

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Times New Roman' } } } },
    sections: [{ properties: { page: { margin: { top: 1133, bottom: 1133, left: 1133, right: 1133 } } }, children: c }],
  });
  const blob = await Packer.toBlob(doc);
  return compatibilizarWord2007(blob);
}
