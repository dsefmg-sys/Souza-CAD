# Especificação da Planta (A3) — extraída dos modelos do escritório

Fonte: plantas reais geradas pelo Métrica TOPO (DETE: Planta A/ABC/AD; Claudinho).
Formato: **A3 paisagem (420 × 297 mm)**.

## Layout geral
- Coluna de desenho (~70% esquerda) + coluna de carimbo/título (~30% direita).
- Faixa inferior da coluna de desenho: Observações | Informações de Coordenadas | CONVENÇÕES | bloco de projeção + nortes.

## Coluna de desenho
- Polígono do imóvel com vértices nomeados (COIN-M-####, COIN-P-####).
- **Rótulo de confrontante por divisa**, posicionado do lado de fora da linha, com linha de
  assinatura por cima: `Nome: ... / CPF: ... / Matrícula nº ...`.
- **Grade de coordenadas** UTM ao fundo, com rótulos nas margens: `E 195.000,0000 m`,
  `N 7.718.600,0000 m` (passo regular, ex. 200 m).
- **Barra de escala gráfica** (0,20,40,...,200 m) + escala numérica (ex. 1/4000).
- **Texto central** com dados da gleba (ex.: "Imóvel: Em formação / Área a destacar das
  Matrículas nº 2426 e nº 2966 / Área: 4,4820 ha / proprietários").
- **Três nortes**: NQ (quadrícula), NM (magnético), NV (verdadeiro) + ângulos d, c. Rosa dos ventos.
- **Planta de situação**: recorte do polígono sobre satélite (inset).

## Bloco "Informações de Coordenadas" (vértice de referência)
Campos: Vértice (ex. COIN-M-0001), Lat. (20°36'08.631" S), Long. (41°55'28.528" W),
Declinação magnética (-00°05'07.561101"), Variação anual (01°01'47.658727"),
SGR - SIRGAS2000, MC (39°), CM, K (1.000748550 — fator de escala/convergência).

## CONVENÇÕES (legenda) — com representação gráfica por tipo
- Vértices Tipo M (símbolo próprio)
- Vértices Tipo P (símbolo próprio)
- Linha ideal
- Cerca
- Estrada
- Açude
(estender conforme manual SIGEF: Tipo V, córrego, etc.)

## Coluna de carimbo / título
Campos do bloco de título:
- Título: "Levantamento Planimétrico Georreferenciado" | Folha: "Única"
- PROPRIEDADE
- PROPRIETÁRIOS (pode haver doador/donatário)
- MUNICÍPIO(S)
- MAT./TRANSC.
- TRT n°
- ÁREA TOTAL (ha)
- PERÍMETRO (m)
- DATA
- ESCALA (ex. 1 / 4000)

Blocos de assinatura/declaração:
- "Assinatura do Proprietário" + bloco PROPRIETÁRIO(S) (texto de atesto).
- "Assinatura do Responsável Técnico" + LAUDO TÉCNICO (texto de atesto).
- "Declaração dos Confrontantes" + CONFRONTANTES (texto de anuência §10 art. 213 LRP).
- Linhas de assinatura: Prop. (nome+CPF) | Resp. Téc. (nome+CFT+INCRA).

## Carimbo do escritório (dados fixos — vão em Configurações)
```
SOUZA GESTÃO FUNDIÁRIA
Agrimensura e Georreferenciamento
CNPJ 45.539.408/0001-74
Rua Doutor José Paixão 1400, Sala 02 Santa Inês, Espera Feliz
Tel./WhatsApp: (32) 99911-6227
```
Responsável técnico:
```
DARLAN GONÇALVES DE SOUZA
TÉCNICO EM AGRIMENSURA
CFT nº 12287132600-MG
ART/TRT: CFT2505318024
Credenciamento INCRA: COIN
```
(+ espaço para LOGOTIPO do escritório.)

## Observações de domínio
- DETE está na zona **24S** (MC -39, Easting ~195.000); Claudinho na **23S** (MC -45).
  Espera Feliz fica sobre a divisa 23/24 — auto-detecção de zona é essencial.
- Multi-gleba: cada gleba foi gerada como ODS separado (1 aba `perimetro_1` cada). O SIGEF
  também aceita múltiplas parcelas (`perimetro_2`, ...) num único arquivo — suportar ambos.
