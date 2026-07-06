// Camada de EDUCAÇÃO LEGAL do app: textos curtos que ajudam o agrimensor a entender o aspecto
// jurídico de cada ponto (papéis das partes, tipos de ato, exigências das peças...). Princípio
// inegociável: é APOIO, não parecer jurídico. Nunca afirmar interpretação de lei como verdade
// absoluta; sempre lembrar que a legislação muda e varia por estado/comarca, e que a conformidade
// legal é responsabilidade do profissional. Ver [[educacao-legal-plano]].

/** Aviso curto, SEMPRE visível junto de qualquer nota legal. */
export const DISCLAIMER_LEGAL =
  'Apoio informativo, não parecer jurídico. A legislação muda e varia por estado e comarca — confira ' +
  'sempre as normas vigentes (e um profissional do Direito em caso de dúvida). A conformidade legal é ' +
  'responsabilidade do agrimensor.';

/**
 * Catálogo de explicações legais curtas, por tema. Cada texto diz o QUE observar, sem afirmar como
 * verdade fechada. O DISCLAIMER acompanha na exibição.
 */
export const INSIGHTS_LEGAIS: Record<string, string> = {
  condomino:
    'Imóvel em condomínio tem mais de um titular. Em regra, todos os condôminos assinam as peças; para ' +
    'a anuência de divisa, o §10 do art. 213 da Lei 6.015/73 costuma admitir que a anuência de um ' +
    'condômino supra a dos demais. Verifique a exigência do seu cartório.',
  usufruto:
    'Havendo usufruto, o usufrutuário (quem usa o imóvel) e o nu-proprietário (quem tem a propriedade) ' +
    'têm interesses distintos. Em geral, ambos assinam. Informe o nu-proprietário para que ele entre ' +
    'com assinatura própria nas peças.',
  espolio:
    'Imóvel de pessoa falecida (espólio) é representado pelo inventariante, que assina pelas partes. Sem ' +
    'o nome do inventariante a assinatura sairia em branco — por isso o app exige esse dado.',
  posseiro:
    'Posseiro é quem exerce a posse sem matrícula. A peça o descreve como possuidor(a), sem número de ' +
    'matrícula. A regularização da posse (usucapião, legitimação) segue rito próprio.',
  papelProprietario:
    'O papel de cada titular (proprietário, condômino, usufrutuário, nu-proprietário, inventariante) ' +
    'muda como ele é qualificado e como assina o memorial, a planta e a anuência.',
  divisaLimite:
    'O SIGEF classifica cada divisa como limite ARTIFICIAL (LA — cerca, muro, marco) ou NATURAL (LN — ' +
    'rio, córrego, crista). A tolerância de precisão exigida é diferente: os artificiais costumam ser mais ' +
    'rígidos que os naturais. Escolha o tipo que corresponde ao que realmente existe em campo.',
  requerimento:
    'A averbação do georreferenciamento com retificação de área apoia-se, em regra, nos arts. 176, §3º e ' +
    '§4º, e 213 da Lei 6.015/73 (Lei de Registros Públicos). O rito e as exigências (firmas reconhecidas, ' +
    'anuências) variam por cartório — confirme antes de protocolar.',
  usucapiao:
    'A usucapião extrajudicial (art. 216-A da Lei 6.015/73) corre no cartório, com ata notarial, planta, ' +
    'memorial e anuências. É rito distinto da retificação comum; confirme os requisitos com o cartório e, ' +
    'quando necessário, com advogado.',
  servidao:
    'Servidão é um direito de uso sobre imóvel de outrem (passagem, rede de energia, adutora, estrada). ' +
    'Descreve-se a faixa e identificam-se o imóvel serviente e o beneficiário. Verifique o título que ' +
    'institui a servidão.',
  cns:
    'O CNS é o Código Nacional da Serventia — identifica o cartório de forma única no país. Conferir o CNS ' +
    'certo evita apontar o registro para a serventia errada.',
  validadePeca:
    'Para o cartório aceitar, costuma-se exigir: assinatura de TODOS os proprietários e confrontantes com ' +
    'FIRMA reconhecida; anuência expressa de cada confrontante; ausência de sobreposição ou invasão; e ' +
    'representação adequada de incapazes (menores, interditos) e de espólios (inventariante). O app confere ' +
    'a parte técnica; as exigências formais variam por cartório — confirme antes de protocolar.',
  incapazes:
    'Confrontante ou titular incapaz (menor de idade, interdito) precisa de representação/assistência legal ' +
    'e, muitas vezes, de autorização judicial para anuir. Não colha a assinatura direta nesses casos sem ' +
    'verificar o rito aplicável.',
};
