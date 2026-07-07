# Diretrizes e Padrões de Projeto do Souza-CAD

Este documento define regras de desenvolvimento e arquitetura específicas para o repositório Souza-CAD.

## Diretrizes de Interface e UX
1. **Prevenção de Perda de Dados em Diálogos**: Editores de palco (DXF, Estúdio) ou modais com inputs complexos devem interceptar `onOpenChange` e exigir confirmação do usuário se houver modificações ativas, evitando descarte acidental por cliques externos ou tecla Escape.
2. **Heurística de Nome de Municípios**: A formatação e divisão de nomes de municípios para o padrão "Cidade-UF" deve localizar a UF dividindo a string a partir do último hífen (`lastIndexOf('-')`). Mantenha partículas de ligação em português (`de`, `da`, `do`, `dos`, `das`, `e`) em minúsculo.

## Diretrizes Geodésicas e de Cálculo
1. **Robustez de Altitude no ECEF**: A conversão para o elipsoide geocêntrico (SGL) deve validar a altitude via `Number.isFinite(h)` e aplicar o fallback de `0` caso seja inválida, prevenindo áreas e perímetros que resultem em `NaN`.
2. **Deduplicação de Coordenadas nas Curvas**: Pontos para triangulação Delaunay devem ser deduplicados espacialmente por suas coordenadas planas (com tolerância de 1mm) para evitar triângulos de área zero.

## Diretrizes de Segurança e Integração
1. **Firestore - Novas Entidades**: As regras de segurança para documentos de credenciamento devem permitir leitura caso o documento seja nulo (`resource == null`), prevenindo erros de permissão negada (`permission-denied`) em novos cadastros.
2. **Sanitização de XML/GML**: Todo texto extraído de GMLs públicos do INCRA deve passar por limpeza de escapes XML completos (`&amp;`, `&quot;`, `&apos;`, `&lt;`, `&gt;`).
