# Handoff — Métrica (repo Souza-CAD) — 2026-07-06

Documento de passagem de bastão. Estado atual, o que falta, e onde mexer. Feito por uma sessão de IA
pra outra continuar. `main` está publicada (último commit relevante: `c5abf60`).

## Como o projeto funciona (essencial)
- Publicar = `git push origin main` (o host constrói sozinho no push). Remote: `dsefmg-sys/Souza-CAD`.
- Antes de subir, SEMPRE: `npx tsc --noEmit` && `npx vitest run` && `npm run build` (todos limpos).
- Regras do Firestore: editar `firestore.rules` NÃO basta — precisa `firebase deploy --only firestore:rules`
  (ação do dono; conta firebase). Há uma correção JÁ COMMITADA aguardando esse deploy (ver item 4).
- COLISÃO DE DUAS IAs: às vezes outra sessão edita o MESMO repo ao mesmo tempo. NUNCA use `git add -A`
  (arrasta WIP da outra IA pro seu commit). Use `git add <arquivos específicos>`. Rode `git status` e
  `git diff --stat` ANTES e DEPOIS de commitar; se aparecer arquivo que você não editou, investigue.
  Arquivos podem mudar entre um read e o próximo. `git reset --hard` costuma ser bloqueado pelo guardrail.
- Estilo de resposta ao dono: conversa natural (ele ouve por TTS), sem emojis, sem jargão. Terminar
  sempre com "concluído x / y" ou "etapa x / y feita".

## PENDENTE — em ordem sugerida

### 1. Bloqueio por pagamento atrasado (dono JÁ CONFIRMOU a lógica) — NÃO iniciado
Objetivo: cliente com pagamento atrasado recebe aviso ao abrir o app contando 7 dias, depois o app trava.
Lógica confirmada pelo dono:
- Quando o admin (master) marca um cliente como `atrasado`, gravar a DATA daquele momento
  (novo campo `atrasadoDesde: number` em `PerfilUso`, `src/lib/store/perfilUso.ts`).
- Ao abrir o app, se `statusPagamento === 'atrasado'`: diasRestantes = 7 - floor((agora - atrasadoDesde)/dia).
  Mostrar aviso "Seu acesso será encerrado em X dias" (7,6,5,4,3,2,1). Em <= 0, TRAVAR a tela com
  mensagem de pagamento pendente.
- O MASTER (`dsefmg@gmail.com`, `souMaster()`) NUNCA é bloqueado.
- Se "Ocultar cobrança" (`ocultarCobranca`) estiver ligado, NINGUÉM é bloqueado nem vê aviso.
Onde mexer: `PerfilUso` (+campo e set no `atualizarPerfilUsoPorAdmin`), o painel admin que marca status
(`PainelMasterSaaS.tsx` / a coluna FATURAMENTO), e um gate no cliente (perto do `AuthGate`/carregamento
em `page.tsx`) que lê o próprio `perfisUso`, mostra o aviso e trava. Ver [[produto-comercial]] no plano.

### 2. Mercado Pago — importar do Gestor V5 — NÃO iniciado (o MAIOR)
Dono quer que o cliente pague pelo Mercado Pago. Disse que o app "Gestor V5" (pasta
`../Gestor V5` em APPS) JÁ tem isso implementado, incluindo o TOKEN. Caminho: abrir o Gestor V5, ver
como está o fluxo de pagamento + credenciais, e portar pra cá (trazer o token também). Há um MCP
`mercadopago` (precisa de auth, o dono autoriza) e um agente `mercadopago:mp-integration-expert` +
skills (mp-integrate, mp-webhooks, mp-test-setup, mp-review). Empreitada dedicada; casar com o item 1
(o botão de pagar aparece na tela de bloqueio). Confirmar com o dono a fonte do token.

### 3. Caixa de seleção na PLANTA (o mapa JÁ está pronto) — parcial
No MAPA (commit `c5abf60`) a caixa arrastada no modo `multi` já pega objetos além de vértices
(`objSelMulti` em page.tsx; `adicionarMultiObj`; destaque âmbar; apagar em lote com contagem;
curva de nível fica de fora). FALTA a mesma coisa na PLANTA (SVG, `Planta.tsx`): não há rubber-band lá.
Adicionar um arraste-retângulo no modo `multi` da planta que chame `adicionarMulti` (vértices) e
`adicionarMultiObj` (objetos) — a infra do page.tsx já existe, é só a interação SVG na planta.

### 4. Deploy das regras do Firestore (ação do DONO) — código pronto, falta deploy
Correção do bug "Erro ao salvar dados administrativos" já commitada (master agora tem `write` em
`perfisUso/{uid}` no `firestore.rules`, commit `29efc94`). SÓ VALE após o dono rodar:
`firebase deploy --only firestore:rules`.

### 5. Painel de ajuste rápido no DUPLO CLIQUE — só o VÉRTICE está pronto
Feito (commit `7177c85`): duplo clique num vértice (mapa e planta) abre painel com ALTITUDE editável +
tipo M/P/V + coordenadas (`painelElem` em page.tsx; `onDblClickVertice` no MapEditor/Planta). FALTA:
- SEGMENTO/divisa → comprimento (m) + azimute + tipo da divisa + confrontante do lado. (No mapa não há
  elemento por-aresta; a planta tem `onContextMenuDivisa` por segmento — usar de referência.)
- OBJETO (polilinha/retângulo/arco/cota/texto) → cor/espessura + comprimento/área.

### 6. Curvas de nível — refinos pedidos — parcial
Feito: suavização (Chaikin, `curvasNivel.ts`), engrenagem de ajustes, cor AUTOMÁTICA (branca no mapa,
cinza na planta), não-editável (não arrasta pontos). FALTA:
- CORES SEPARADAS pra linha FINA e MESTRA (hoje só há "cor automática" ou UMA "cor fixa"; o dono quer
  escolher a fina e a grossa separadamente). Mexer na engrenagem (page.tsx `gerarCurvasNivel` +
  estados `curvaCor`) e passar cor por-linha em `novaCurvaNivel` (já aceita cor por linha).
- "CARA DE CURVA DE NÍVEL": dono acha que ainda falta algo. Provável: COTA (número da altitude) escrita
  sobre as linhas MESTRAS — toque de carta topográfica. Mexe no renderer da polilinha (Planta/MapEditor).
- SUGESTÃO DE INTERVALO INTELIGENTE: hoje `intervaloSugerido` (curvasNivel.ts) só usa o desnível/12.
  O dono quer que considere TAMBÉM o TAMANHO do imóvel (extensão horizontal), pra densidade de linhas
  boa em qualquer relevo/área.

### 7. Layout dos botões (mensagem do dono) — NÃO iniciado
- Botão MOVER deve ir pra perto do AÇÕES (desfazer/refazer); as setas de desfazer/refazer ocupam
  espaço demais, diminuir. Onde o MOVER está hoje, colocar o modo ORTO. (page.tsx, coluna de
  ferramentas / `BotaoAcoes`.)

### 8. Exportar editor de DXF + Estúdio (Canva) pro Gestor V5 — NÃO iniciado
Dono quer copiar o `DxfEditorModal` e o `EstudioModal` (mini-Canva) pra dentro do app Gestor V5
(`../Gestor V5`). Outra IA vai integrar lá. Aproveitar pra ver se o Gestor V5 tem algo bom pra trazer
pro Métrica. São módulos isolados (motor separado da casca) — ver [[modularidade-ferramentas-universais]].

## Limites conhecidos / a confirmar
- Desfazer: cobre vértices, objetos, ignorados, confrontantePorLado e `plantaConfig` (posições/tamanhos/
  textos da planta). NÃO cobre o tamanho do rótulo de confrontante (`tamRotulo` mora no registro do
  confrontante, fora do histórico). Incluir depois se o dono quiser.
- Ferramentas "selecionar vários" e "apagar": revisadas no código, wiring correto no modo mapa. Dono
  teve impressão de que falhavam — se confirmar, precisa de passos de repro (qual tela/botão).
- Centralização dos textos de declaração/laudo/confrontantes (commit `fce6f6f`): é visual; se alguma
  caixa ainda parecer alta/baixa, pedir print e ajustar os `centrarEmAltura` (132 e 70) em Planta.tsx.

## Commits desta leva (referência)
1148742 modo Médio + escalas + atalhos + dicas · 14a3c7a esconde camadas · 041f286 papéis legais ·
f04faf4 curvas suavizadas · ddbbad1 engrenagem curvas · 44eee30 retângulo+arco · 70c5b81 cor auto curva ·
7177c85 duplo clique vértice · ab9593c curva não-editável · 483bf93 desfazer completo · fce6f6f textos
centrados · 29efc94 Foco folha + regra Firestore · c5abf60 caixa de seleção pega objetos (mapa).
