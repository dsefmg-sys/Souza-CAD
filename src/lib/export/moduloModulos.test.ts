import { describe, it, expect } from 'vitest';
import { ImovelData, EscritorioData, TecnicoData } from '../topo/types';
import { gerarPdfLTCA, gerarPdfFinanciamento, gerarPdfPRADA, gerarDocxLaudoAmbiental } from './meioAmbiente';
import { gerarPdfLaudoUsucapiao, gerarPdfAtaPosse, gerarDocxLaudoUsucapiao, gerarDocxAtaPosse } from './usucapiao';
import { gerarPdfLaudoAvaliacao, gerarDocxAvaliacaoImovel } from './avaliacao';
import { gerarPdfPeticaoUsucapiao, gerarPdfNotificacaoExtrajudicial, gerarDocxParecerJuridico } from './juridico';
import { gerarPdfCRF, gerarPdfPRF, gerarDocxLaudoReurb } from './reurb';
import { gerarPdfMemorialLoteamento, gerarPdfLaudoInfraestrutura, gerarDocxQuadroLoteamento } from './loteamento';
import { gerarPdfLaudoAptidao, gerarPdfCronogramaFinanceiro, gerarDocxLaudoAptidao, gerarDocxCronogramaFinanceiro, gerarDocxProjetoCreditoRural } from './creditoRural';
import { gerarContratoLoteDocx } from './contratoLote';

const IMOVEL_TESTE: any = {
  denominacao: 'Fazenda Santa Maria',
  matricula: '1234',
  cns: '01.234-5',
  codigoImovelIncra: '950123456789',
  proprietario: 'Antônio de Oliveira',
  cpfProprietario: '111.222.333-44',
  tipoPessoa: 'Física',
  municipio: 'Espera Feliz-MG',
  local: 'Córrego Frio, Espera Feliz-MG',
  naturezaServico: 'Particular',
  situacao: 'Imóvel Registrado',
  naturezaArea: 'Particular'
};

const ESCRITORIO_TESTE: any = {
  nome: 'Topografia Ventania Ltda',
  cnpj: '12.345.678/0001-99',
  crea: '98765-D/MG',
  corPrimaria: '#15803d',
  corSecundaria: '#ea580c'
};

const TECNICO_TESTE: any = {
  nome: 'Carlos Silva',
  conselho: 'CREA',
  cft: '123456/MG',
  cpf: '222.333.444-55'
};

describe('Módulos Adicionais - Exporters', () => {
  describe('Módulo Ambiental', () => {
    it('deve gerar PDF do laudo LTCA com sucesso', () => {
      const doc = gerarPdfLTCA(IMOVEL_TESTE, ESCRITORIO_TESTE, TECNICO_TESTE, {
        vegetacao: 'Cerrado denso',
        conservacao: 'Preservado',
        corposAgua: 'Nascente e ribeirão',
        appEstimada: '3.42',
        fauna: 'Diversas aves registradas',
        diagnostico: 'Imóvel em conformidade ambiental'
      });
      expect(doc).toBeDefined();
      expect(doc.internal.pages.length).toBeGreaterThan(1);
    });

    it('deve gerar PDF do projeto de Financiamento', () => {
      const doc = gerarPdfFinanciamento(IMOVEL_TESTE, ESCRITORIO_TESTE, TECNICO_TESTE, {
        instituicao: 'Banco do Brasil',
        linhaCredito: 'ABC+ Sustentável',
        atividade: 'Recuperação de Pastagem',
        valor: '180.000,00',
        cronograma: 'Mês 1: preparo. Mês 2: plantio.'
      });
      expect(doc).toBeDefined();
    });

    it('deve gerar PDF do plano PRADA', () => {
      const doc = gerarPdfPRADA(IMOVEL_TESTE, ESCRITORIO_TESTE, TECNICO_TESTE, {
        declividade: '15%',
        recomposicao: true,
        acoes: 'Cercamento e plantio'
      });
      expect(doc).toBeDefined();
    });
  });

  describe('Módulo de Usucapião', () => {
    it('deve gerar PDF de Laudo de Usucapião', () => {
      const doc = gerarPdfLaudoUsucapiao(IMOVEL_TESTE, ESCRITORIO_TESTE, TECNICO_TESTE, {
        tempoPosse: '15 anos',
        origemPosse: 'Posse mansa e pacífica',
        tipoUsucapiao: 'Extraordinária',
        detalhesPosse: 'Imóvel cercado e produtivo',
        anuenteVizinhos: true
      });
      expect(doc).toBeDefined();
    });

    it('deve gerar ata de posse', () => {
      const doc = gerarPdfAtaPosse(IMOVEL_TESTE, ESCRITORIO_TESTE, TECNICO_TESTE, {
        tempoPosse: '15 anos',
        origemPosse: 'Posse mansa',
        tipoUsucapiao: 'Ordinária',
        detalhesPosse: 'Posse qualificada',
        anuenteVizinhos: true
      });
      expect(doc).toBeDefined();
    });
  });

  describe('Módulo de Avaliação de Imóveis', () => {
    it('deve gerar PDF de Avaliação de Imóvel', () => {
      const doc = gerarPdfLaudoAvaliacao(IMOVEL_TESTE, ESCRITORIO_TESTE, TECNICO_TESTE, {
        tipoImovel: 'rural',
        aptidaoSolo: 'Alta aptidão',
        conservacaoEdif: 'Bom estado',
        valorUnitario: '40.000,00',
        benfeitorias: 'Casa sede e barracão',
        metodologia: 'Comparativo direto'
      });
      expect(doc).toBeDefined();
    });
  });

  describe('Módulo Jurídico', () => {
    it('deve gerar petição inicial de usucapião', () => {
      const doc = gerarPdfPeticaoUsucapiao(IMOVEL_TESTE, ESCRITORIO_TESTE, TECNICO_TESTE, {
        foroComarca: 'Carangola-MG',
        advogadoNome: 'Dr. Roberto de Souza',
        advogadoOab: '999.888/MG',
        qualificacaoFatos: 'Posse contínua',
        direitoFundamento: 'Artigo 1238'
      });
      expect(doc).toBeDefined();
    });

    it('deve gerar notificação extrajudicial', () => {
      const doc = gerarPdfNotificacaoExtrajudicial(IMOVEL_TESTE, ESCRITORIO_TESTE, TECNICO_TESTE, {
        foroComarca: 'Carangola-MG',
        advogadoNome: 'Dr. Roberto',
        advogadoOab: '12345/MG',
        qualificacaoFatos: 'Posse',
        direitoFundamento: 'Art. 1238',
        confrontanteNome: 'Sebastião Silva',
        confrontanteQualificacao: 'Confrontante Norte'
      });
      expect(doc).toBeDefined();
    });
  });

  describe('Módulo de REURB', () => {
    it('deve gerar PDF de CRF e PRF', () => {
      const docCrf = gerarPdfCRF(IMOVEL_TESTE, ESCRITORIO_TESTE, TECNICO_TESTE, {
        modalidadeReurb: 'REURB-S',
        decretoMunicipal: 'Decreto 123',
        classificacaoSocial: 'Baixa renda',
        infraBasica: 'Agua e luz',
        fundamentoReurb: 'Lei 13465'
      });
      const docPrf = gerarPdfPRF(IMOVEL_TESTE, ESCRITORIO_TESTE, TECNICO_TESTE, {
        modalidadeReurb: 'REURB-S',
        decretoMunicipal: 'Decreto 123',
        classificacaoSocial: 'Baixa renda',
        infraBasica: 'Agua e luz',
        fundamentoReurb: 'Lei 13465'
      });
      expect(docCrf).toBeDefined();
      expect(docPrf).toBeDefined();
    });
  });

  describe('Módulo de Loteamento & Infraestrutura', () => {
    it('deve gerar PDF de memorial de loteamento e laudo de infraestrutura', () => {
      const docMem = gerarPdfMemorialLoteamento(IMOVEL_TESTE, ESCRITORIO_TESTE, TECNICO_TESTE, {
        numeroLotes: '80',
        areaVerde: '3500',
        areaRuas: '6000',
        volCorte: '1200',
        volAterro: '900',
        infraAgua: true,
        infraEsgoto: true,
        infraLuz: true,
        infraDrenagem: true
      });
      const docInfra = gerarPdfLaudoInfraestrutura(IMOVEL_TESTE, ESCRITORIO_TESTE, TECNICO_TESTE, {
        numeroLotes: '80',
        areaVerde: '3500',
        areaRuas: '6000',
        volCorte: '1200',
        volAterro: '900',
        infraAgua: true,
        infraEsgoto: true,
        infraLuz: true,
        infraDrenagem: true
      });
      expect(docMem).toBeDefined();
      expect(docInfra).toBeDefined();
    });
  });

  describe('Módulo de Crédito Rural & Agropecuário', () => {
    it('deve gerar PDF de Laudo de Aptidão de Solo e Cronograma Físico-Financeiro', () => {
      const docApt = gerarPdfLaudoAptidao(IMOVEL_TESTE, ESCRITORIO_TESTE, TECNICO_TESTE, {
        aptidaoSolo: 'Classe II (Alta Aptidão)',
        culturaPrincipal: 'Café Conilon / Pimenta do Reino',
        capacidadePastagem: '2.5 U.A./ha',
        finalidadeCredito: 'Custeio Agrícola Pronaf',
        cronogramaEtapas: [
          { id: '1', etapa: 'Preparo de solo e calagem', mes: 1, valor: 15000 },
          { id: '2', etapa: 'Aquisição de mudas selecionadas', mes: 2, valor: 35000 },
          { id: '3', etapa: 'Adubação de plantio e tratos', mes: 3, valor: 12000 }
        ]
      });
      const docCron = gerarPdfCronogramaFinanceiro(IMOVEL_TESTE, ESCRITORIO_TESTE, TECNICO_TESTE, {
        aptidaoSolo: 'Classe II (Alta Aptidão)',
        culturaPrincipal: 'Café Conilon / Pimenta do Reino',
        capacidadePastagem: '2.5 U.A./ha',
        finalidadeCredito: 'Custeio Agrícola Pronaf',
        cronogramaEtapas: [
          { id: '1', etapa: 'Preparo de solo e calagem', mes: 1, valor: 15000 },
          { id: '2', etapa: 'Aquisição de mudas selecionadas', mes: 2, valor: 35000 },
          { id: '3', etapa: 'Adubação de plantio e tratos', mes: 3, valor: 12000 }
        ]
      });
      expect(docApt).toBeDefined();
      expect(docCron).toBeDefined();
    });

    it('deve gerar DOCX de Laudo, Cronograma e Projeto Completo de Crédito Rural', async () => {
      const dadosCredito = {
        aptidaoSolo: 'Classe II',
        culturaPrincipal: 'Soja',
        capacidadePastagem: '2.0 U.A.',
        finalidadeCredito: 'Investimento',
        linhaCredito: 'PRONAMP',
        agenteFinanceiro: 'Banco do Brasil',
        cronogramaEtapas: [{ id: '1', etapa: 'Preparo', mes: 1, valor: 50000 }]
      };
      const blobApt = await gerarDocxLaudoAptidao(IMOVEL_TESTE, ESCRITORIO_TESTE, TECNICO_TESTE, dadosCredito);
      const blobCron = await gerarDocxCronogramaFinanceiro(IMOVEL_TESTE, ESCRITORIO_TESTE, TECNICO_TESTE, dadosCredito);
      const blobProj = await gerarDocxProjetoCreditoRural(IMOVEL_TESTE, ESCRITORIO_TESTE, TECNICO_TESTE, dadosCredito);
      expect(blobApt).toBeDefined();
      expect(blobCron).toBeDefined();
      expect(blobProj).toBeDefined();
    });
  });

  describe('Exportação Editável Word (.docx) dos Módulos Extras', () => {
    it('deve gerar DOCX dos laudos de Usucapião, Avaliação, Jurídico, REURB, Loteamento e Meio Ambiente', async () => {
      const dadosUsucapiao = { tempoPosse: '15 anos', origemPosse: 'Posse Mansa', tipoUsucapiao: 'Extraordinária', detalhesPosse: 'Cercado', anuenteVizinhos: true };
      const dadosJuridico = { foroComarca: 'Comarca', advogadoNome: 'Dr. Roberto', advogadoOab: '12345/MG', qualificacaoFatos: 'Fatos', direitoFundamento: 'Direito' };
      const blobUsucapiao = await gerarDocxLaudoUsucapiao(IMOVEL_TESTE, ESCRITORIO_TESTE, TECNICO_TESTE, dadosUsucapiao);
      const blobAta = await gerarDocxAtaPosse(IMOVEL_TESTE, ESCRITORIO_TESTE, TECNICO_TESTE, dadosUsucapiao);
      const blobAvaliacao = await gerarDocxAvaliacaoImovel(IMOVEL_TESTE, ESCRITORIO_TESTE, TECNICO_TESTE, { tipoImovel: 'rural', aptidaoSolo: 'Boa', conservacaoEdif: 'Boa', valorUnitario: '50000', benfeitorias: 'Casa', metodologia: 'Direto' });
      const blobJuridico = await gerarDocxParecerJuridico(IMOVEL_TESTE, ESCRITORIO_TESTE, TECNICO_TESTE, dadosJuridico);
      const blobReurb = await gerarDocxLaudoReurb(IMOVEL_TESTE, ESCRITORIO_TESTE, TECNICO_TESTE, { modalidadeReurb: 'REURB-S', decretoMunicipal: 'Dec 123', classificacaoSocial: 'Baixa Renda', infraBasica: 'Agua', fundamentoReurb: 'Lei 13.465' });
      const blobLoteamento = await gerarDocxQuadroLoteamento(IMOVEL_TESTE, ESCRITORIO_TESTE, TECNICO_TESTE, { numeroLotes: '50', areaVerde: '1000', areaRuas: '2000', volCorte: '500', volAterro: '400', infraAgua: true, infraEsgoto: true, infraLuz: true, infraDrenagem: true });
      const blobAmbiental = await gerarDocxLaudoAmbiental(IMOVEL_TESTE, ESCRITORIO_TESTE, TECNICO_TESTE, { vegetacao: 'Cerrado', conservacao: 'Preservado', corposAgua: 'Córrego', appEstimada: '2.0', fauna: 'Aves', diagnostico: 'Conforme' });

      expect(blobUsucapiao).toBeDefined();
      expect(blobAta).toBeDefined();
      expect(blobAvaliacao).toBeDefined();
      expect(blobJuridico).toBeDefined();
      expect(blobReurb).toBeDefined();
      expect(blobLoteamento).toBeDefined();
      expect(blobAmbiental).toBeDefined();
    });
  });

  describe('Módulo Comercial - Promessa de Venda por Lote (DOCX)', () => {
    it('deve gerar Document de promessa de compra e venda de lote', () => {
      const loteTeste = {
        id: 'lote-1',
        denominacao: 'Lote 15 Quadra B',
        vertices: [
          { id: '1', nome: 'P1', leste: 0, norte: 0, altitude: 100 },
          { id: '2', nome: 'P2', leste: 20, norte: 0, altitude: 100 },
          { id: '3', nome: 'P3', leste: 20, norte: 30, altitude: 100 },
          { id: '4', nome: 'P4', leste: 0, norte: 30, altitude: 100 }
        ],
        precoVenda: 120000,
        compradorNome: 'Mário de Andrade',
        compradorCpf: '333.444.555-66',
        sinalEntrada: 20000,
        parcelasQtd: 60,
        jurosMensais: 1.0,
        sistemaAmortizacao: 'price'
      };
      
      const doc = gerarContratoLoteDocx(IMOVEL_TESTE, loteTeste as any, TECNICO_TESTE);
      expect(doc).toBeDefined();
    });
  });
});
