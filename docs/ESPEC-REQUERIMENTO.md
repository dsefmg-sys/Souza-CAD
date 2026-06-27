# Especificação — Requerimento ao Cartório (averbação de georreferenciamento)

Fonte: modelo "REQUERIMENTO DE AVERBAÇÃO DE GEORREFERENCIAMENTO COM RETIFICAÇÃO DE ÁREA"
(Art. 176 §3º/§4º e Art. 213, II, Lei 6.015/73 c/c Decreto 4.449/02).

Documento .docx gerado reaproveitando os dados já cadastrados de proprietário e imóvel,
mais campos novos de qualificação das pessoas.

## Estrutura do documento
1. Título + base legal.
2. Endereçamento: "Oficial do Cartório de Registro de Imóveis da Comarca de {município}".
3. **REQUERENTE (ADQUIRENTE/COMPRADOR)** — qualificação completa.
4. **PROPRIETÁRIO REGISTRAL (TRANSMITENTE/VENDEDOR)** — qualificação completa.
5. DO REQUERIMENTO (texto fixo).
6. DA IDENTIFICAÇÃO DO IMÓVEL: "imóvel rural denominado {denominação}, no município
   {município}, matrícula nº {matrícula}, Livro nº 2, em nome de {proprietário}."
7. DO LEVANTAMENTO E DA RETIFICAÇÃO: área anterior (da matrícula) {áreaAnterior} ha → área
   real {área SGL} ha; técnico (nome, CFT, INCRA: COIN).
8. DOS CONFRONTANTES (texto fixo de declarações).
9. DA RESPONSABILIDADE TÉCNICA (texto fixo, §14 art. 213).
10. DO VALOR DO IMÓVEL: R$ {valor} ({valor por extenso}).
11. DO PEDIDO (texto fixo).
12. Local/data + ASSINATURAS (requerente, proprietário, técnico).

## Dados reaproveitados (já existem)
- imóvel: denominação, município, matrícula, proprietário (= transmitente).
- área real = área SGL (calculada ou reconciliada com o SIGEF).
- técnico: nome, CFT, credenciamento INCRA (Configurações).

## Campos NOVOS necessários
### Qualificação de pessoa (para requerente e proprietário/transmitente)
nome, RG, CPF, nacionalidade, naturalidade, data de nascimento, filiação, profissão,
estado civil, cônjuge (nome, RG, CPF), endereço (residência), cidade/UF, CEP.
→ Estender o cadastro de Proprietário (ou um cadastro de "Pessoa") com esses campos, para
   reusar tanto como requerente quanto como transmitente.

### Imóvel
- áreaAnterior (ha) — a área que consta na matrícula (para a retificação).
- valorImovel (R$) + valor por extenso (gerar automático a partir do número).

## Observação
O requerimento pode ser do tipo "com retificação de área" (este modelo) e provavelmente outras
variações (sem transmissão, só averbação). Começar por este e generalizar depois.
