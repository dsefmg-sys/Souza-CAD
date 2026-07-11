# Segurança — Métrica (Souza CAD)

Modelo de segurança do app e registro da blindagem feita na fase de finalização. Leitura
obrigatória antes de mexer em login, regras do Firestore, cobrança ou rotas de servidor.

## Como o acesso é decidido (visão geral)

- **Quem é o dono do produto (master):** o e-mail `dsefmg@gmail.com`. Definido em dois lugares que
  precisam concordar: `firestore.rules` (função `ehMaster()`) e `src/lib/apiAuth.ts` (`OWNER_EMAIL`).
- **Isolamento por conta:** cada usuário só lê/escreve `users/{seuUid}/**`. Um auxiliar vinculado
  lê/escreve os dados do RT porque o perfil dele (`perfisUso/{auxUid}`) tem `workspaceUid` apontando
  pro uid do RT. **Esse campo é a chave de todo o acesso cruzado** — por isso ele é guardado a ferro.
- **Empresa:** `empresas/{donoUid}` guarda papéis (`membros`: admin/membro) e cobrança. Id do doc é
  sempre o uid do dono. Cobrança é por empresa, não por pessoa.
- **Servidor (rotas /api):** confere o ID token do Firebase (`verifySession`) antes de agir. Segredos
  (Mercado Pago, SMTP, Gemini) só existem no servidor, nunca no navegador.

## A regra de ouro do `workspaceUid`

Um perfil só pode ter `workspaceUid` apontando pra outra conta se existir um **convite real** pra ele
(`convites/{meuEmail}` criado pelo dono daquela empresa). Isso vale **na criação E na atualização** do
perfil (`firestore.rules`, coleção `perfisUso`). Sem as duas, a proteção é furada: bastava uma conta
nova, ou apagar o próprio perfil e recriar, pra cair na regra de criação e apontar pra vítima —
ganhando leitura e escrita nos dados dela via `users/{uid}`. Se um dia mexer nessa regra, mantenha o
mesmo guarda nos dois (create e update), e rode o teste (`npm run test:firestore-rules`).

## Fluxo de auxiliar (pedido + aprovação)

O auxiliar **não se vincula sozinho**. Ele registra um pedido em `solicitacoesVinculo/{seuEmail}`. O
dono vê o pedido na tela de Equipe e, ao **Aprovar**, o app cria um convite comum — a única via que o
Firestore aceita pra ligar o `workspaceUid`. No próximo login do auxiliar, o convite é consumido e o
vínculo liga. Antes disso existia um autovínculo instantâneo por e-mail (qualquer um digitava o
e-mail de um RT e caía dentro dos dados dele): foi removido, junto com a rota `/api/vinculo/por-email`
que servia de buscador e-mail→uid.

## Segredos e onde ficam

- **Chave da IA (Gemini):** `config/segredos` (só o master lê/escreve). O servidor lê pelo Admin SDK.
  **Nunca** volte a gravar em `config/app` — esse doc é de leitura livre pra qualquer autenticado, e a
  chave crua vazaria pra qualquer cliente.
- **SMTP:** `config/emailSmtp` (mesmo esquema, só o master).
- **Mercado Pago / service account:** só variáveis de ambiente do servidor.
- **`config/app`:** leitura livre pra qualquer autenticado — use SÓ pra coisa pública (WhatsApp de
  suporte, URL do app, links de vídeo, flags de recurso). Jamais senha ou chave.

## Cobrança

O valor da cobrança é lido do banco no servidor (`perfisUso.mensalidade`), não do navegador — antes
dava pra adulterar o `amount` e pagar R$1. O webhook do Mercado Pago valida a assinatura HMAC e busca
o pagamento de novo na API antes de marcar "pago" (fonte de verdade). Ver `src/app/api/mp/`.

## Pendências conhecidas (decisão do dono)

1. **Bloqueio por atraso ainda é só no navegador.** As regras do Firestore não checam pagamento, então
   um usuário técnico consegue continuar usando/lendo os dados mesmo atrasado. Endurecer isso nas
   regras é arriscado (relógio fora de hora, tolerância, isento, master, offline) e pode travar cliente
   pagante — por isso ficou de fora até uma decisão consciente. Ver `verificarBloqueioFaturamento`.
2. **Lista de preços por cliente exposta.** `config/assinatura.atribuicoes` (e-mail de cada cliente +
   nível de desconto) fica no doc de leitura livre. Fechar isso exige espelhar o nível de cada um no
   próprio `perfisUso` (que ele já pode ler) e mover o mapa geral pra um doc só-master — mudança que
   toca a tela de Planos e o painel, então ficou pra uma etapa dedicada pra não errar preço.
3. **E-mail não é obrigatoriamente verificado.** Login por e-mail/senha não confirma o e-mail; como os
   convites são por e-mail, convém exigir verificação antes de aceitar convite/pedido.
4. **Dono não consegue forçar o desvínculo de um auxiliar** (só o próprio auxiliar se desvincula).

## Antes de publicar mudança de regras

Editar `firestore.rules` **não basta**. As regras só passam a valer depois de:

```
firebase deploy --only firestore:rules
```

que é ação do dono (conta Firebase). Enquanto esse deploy não roda, o banco continua com as regras
antigas — inclusive o furo do `workspaceUid`. Rode antes: `npm run test:firestore-rules` (precisa de
Java 21+ e do emulador do Firebase).
