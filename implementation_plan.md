# Plano de Implementação - Melhorias no Métrica (Souza-CAD)

Este plano detalha as cinco melhorias e correções solicitadas para o sistema Métrica, englobando a formatação do carimbo da planta, auditoria matemática do memorial descritivo, melhorias de usabilidade na barra lateral e controles da planta, e aprimoramento da ferramenta de símbolos.

## User Review Required

Nenhum elemento crítico que precise de atenção do usuário. As melhorias visam sanar inconsistências e aprimorar a usabilidade geral.

## Open Questions

Não há dúvidas abertas. O escopo das modificações é claro e direto.

## Proposed Changes

---

### Componente de Visualização da Planta (Planta e Carimbo)

#### [MODIFY] [Planta.tsx](file:///c:/Users/Darlan%20Souza/Documents/APPS/Metrica/src/components/Planta.tsx)
*   **TextoQuebrado**: Ajustar o componente de quebra de texto para tratar quebras manuais (`\n`) dividindo a string em linhas antes de realizar a quebra automática por limite de caracteres (`larguraChars`).
*   **Tamanho e Espaçamento de Declarações**: Padronizar o tamanho de fonte das três caixas (Proprietários, Laudo Técnico e Confrontantes) no carimbo da folha A3 para usar o tamanho padrão de `8.5` (scaled por `escalaDecl` ou `escalaConf`) e um `lineHeight` de `1.35` para uma aparência harmoniosa e compacta que previne sobreposição.
*   **Edição Interativa do Título**: Mover o handler de duplo clique (`onDoubleClick`) e cursor de texto do grupo interno de textos do título para o grupo pai que engloba também os `<rect>` de fundo do cabeçalho da seção de dados. Isso facilitará muito a ativação da edição pelo usuário.
*   **Modelos de Títulos**: Atualizar `TITULOS_EDUCATIVOS` expandindo a lista de 7 para os 12 modelos padrão cadastrados, fornecendo explicações claras e informativas (tooltips educativas) para cada um deles, orientadas a agrimensores iniciantes.
*   **Consistência dos Lados**: Importar as funções de cálculo planar `azimute`, `distancia` de `geometry` e `convergenciaMeridiana` de `coords` para exibir os azimutes e distâncias efetivos na tabela de roteiro perimétrico da planta (respeitando a configuração `tipoAzimute === 'plano'` ou `'geodesico'`), garantindo simetria absoluta com o memorial gerado.

---

### Módulo de Exportação e Geometria

#### [MODIFY] [geometry.ts](file:///c:/Users/Darlan%20Souza/Documents/APPS/Metrica/src/lib/topo/geometry.ts)
*   **azimuteDMS**: Alterar a formatação de azimutes em DMS para incluir segundos arredondados (exemplo: `154°38'22"`), que é a norma padrão em georreferenciamento de imóveis rurais e urbanos no Brasil.

#### [MODIFY] [memorial.ts](file:///c:/Users/Darlan%20Souza/Documents/APPS/Metrica/src/lib/export/memorial.ts)
*   **rumoDMS**: Configurar o formatador de rumo em DMS para arredondar ao segundo mais próximo (usando `grausParaDMS` com `casas: 0`) para ficar consistente com a nova exibição do azimute e evitar segundos com casas decimais (exemplo: `45°00'00" NE` em vez de `45°00'00,000" NE`).
*   **Narrativa e Tabela**: Introduzir os helpers `obterAzimuteEfetivo` e `obterDistanciaEfetiva` (utilizando coordenadas planares UTM para o modo `'plano'`, e o azimute geodésico corrigido pela convergência / distância SGL para o modo `'geodesico'`). Utilizar essas funções tanto na tabela técnica de roteiro quanto nos parágrafos textuais da descrição do perímetro para garantir consistência matemática total.

---

### Layout da Interface do Usuário

#### [MODIFY] [page.tsx](file:///c:/Users/Darlan%20Souza/Documents/APPS/Metrica/src/app/page.tsx)
*   **Controles da Planta**: Mover os botões que alteram diretamente a planta (mudar tema `plantaDark`, trancar/destrancar folha `folhaTravada`, e o seletor da escala manual `escalaManual`) da barra lateral esquerda para um novo painel flutuante posicionado na área da planta, à direita do alternador principal de MAPA/PLANTA.
*   **Grade da Barra Lateral**: Reorganizar os botões de ferramentas de edição na barra lateral esquerda para ocupar 3 colunas (grid de 3 colunas), reduzindo paddings para garantir que caibam sem problemas visuais. Mover submenus de status/elementos para se expandirem em `col-span-3`.
*   **Ajuste de Tamanhos**: Modificar o painel de alteração de tamanho das fontes no rodapé da barra lateral esquerda adicionando um título nítido em negrito e tornando os rótulos de cada escopo (Tudo, Rótulos, Símbolos, etc.) em negrito para melhor visualização.
*   **Paleta de Símbolos**: Integrar a seleção de símbolos diretamente no layout de modo ativo (quando `modo === 'simbolo'`), exibindo a paleta de forma permanente com o nome e ícone de cada símbolo enquanto a ferramenta estiver ativa para facilitar a inserção múltipla.

---

### Biblioteca de Símbolos

#### [MODIFY] [simbolos.ts](file:///c:/Users/Darlan%20Souza/Documents/APPS/Metrica/src/lib/topo/simbolos.ts)
*   **Estética de Símbolos**: Modernizar as marcações em SVG dos símbolos padrão (`arvore`, `arbusto`, `casa`, `poste`, `pedra`), utilizando elementos gráficos mais profissionais, sombreados, contornos definidos e cores gradientes.

## Verification Plan

### Automated Tests
Para verificar se as mudanças não quebram a integridade dos dados gerados, executaremos a suíte de testes:
```bash
npx vitest run
```

### Manual Verification
1. Abrir a aba **Planta** e verificar se o menu flutuante com controles (trancar folha, alternar tema e seletor de escala 1:X) aparece corretamente ao lado do botão de alternância MAPA/PLANTA.
2. Clicar no botão **Símbolos** na barra lateral, selecionar um símbolo e inseri-lo várias vezes consecutivas na área de desenho sem que o menu recolha automaticamente.
3. Dar duplo clique na caixa de título principal no carimbo e testar a seleção de diferentes modelos de levantamento, observando as dicas explicativas exibidas na caixa.
4. Exportar o **Memorial Descritivo** e conferir se os azimutes e rumos estão formatados com segundos completos (`° ' "`) e se as coordenadas batem matematicamente com os azimutes e distâncias gerados no modo Plano e no modo Geodésico.
