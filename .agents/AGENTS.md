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

## Mapeamento Arquitetural para Desenvolvedores e Agentes IA
Para garantir edições rápidas, precisas e econômicas, consulte este mapa de componentes:

### 1. Estado Principal e Aplicação (`src/app/page.tsx`)
- **`vertices`**: Lista de vértices do imóvel principal (`Vertex[]`).
- **`objetos`**: Elementos de desenho vetorial (`ObjetoDesenho[]`: polilinhas, cotas, textos, símbolos).
- **`plantaConfig`**: Configuração de renderização da prancha A3/A0 (`PlantaConfig` em `types.ts`).
- **`objPersonalizarId`**: ID do objeto sendo editado via modal de propriedades.
- **`vista`**: `'planta'` (Prancha A3/A0 SVG) ou `'mapa'` (Editor 2D Leaflet).

### 2. Renderizadores do Palco
- **`src/components/Planta.tsx`**: Renderiza a prancha oficial SVG. Trata carimbo, faixas inferiores (situação, convenções, coordenadas), rosa dos ventos, escala gráfica, MDR 3D e rótulos.
- **`src/components/MapEditor.tsx`**: Visualização 2D GIS com Leaflet.
- **`src/components/Map3DViewer.tsx`**: Motor 3D. Calcula triangulação TIN, curvas de nível 3D, volumes de terraplanagem (corte/aterro por primas triangulares) e realiza captura com fundo transparente.
- **`src/components/ObjetoPersonalizarModal.tsx`**: Modal de propriedades para double-click em elementos da planta (MDR, Rosa, Escala, Polígonos SIGEF, Linhas, Cotas, Textos).

### 3. Módulos de Exportação (`src/lib/export/`)
- **`memorial.ts`**: Narrativa perimétrica e tabelas de memorial descritivo DOCX.
- **`requerimento.ts`**: Requerimentos cartorários com suporte a dados incompletos (`DADO AUSENTE` / `___`).
- **`declaracoes.ts`**: Declarações de respeito de limites, posse, espólio e incapacidade.
- **`sigefOds.ts`**: Planilha ODS para credenciamento SIGEF/INCRA.

### 4. Regras Geodésicas do Projeto
- **Vértice Inicial**: O percurso perimétrico no memorial descritivo deve iniciar por padrão no vértice mais ao Norte ($\max \text{Norte}$), usando $\max \text{Leste}$ para desempate.
- **Resiliência de Documentos**: Requerimentos e peças técnicas devem ser gerados mesmo com formulários parcialmente preenchidos, destacando campos faltantes para preenchimento manual posterior.

