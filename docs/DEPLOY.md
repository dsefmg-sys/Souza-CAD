# Deploy — Souza CAD

## Hospedagem real: Firebase App Hosting (não Vercel)
Este documento antes descrevia um plano de usar a Vercel — isso NUNCA foi usado de fato. O deploy
real é 100% Firebase: backend `souzacad` (App Hosting), projeto `souza-cad`, conectado direto ao
repositório GitHub `dsefmg-sys/Souza-CAD`. Cada push na branch `main` dispara um novo build/rollout
automaticamente — não precisa de nenhum passo manual de deploy.

URL do backend: `https://souzacad--souza-cad.us-east4.hosted.app` (o subdomínio próprio
`souzacad.souza-solucoes-agro.com.br` aponta pra cá via DNS, fora deste repositório).

Conferir backends conectados: `firebase apphosting:backends:list`.

## Variáveis de ambiente e segredos: `apphosting.yaml`
Ao contrário da Vercel (que tem um painel próprio de env vars), o Firebase App Hosting lê as
variáveis do arquivo `apphosting.yaml`, versionado neste repositório. Duas categorias:

- **Valores públicos/não sensíveis**: ficam em texto puro no próprio `apphosting.yaml`
  (`variable: NOME` + `value: "..."`). Ex.: `SMTP_HOST`, `SMTP_USER`.
- **Segredos** (senha, chave privada): NUNCA em texto puro no arquivo. Ficam no Secret Manager do
  Google Cloud, e o `apphosting.yaml` só referencia o nome do segredo:
  ```yaml
  - variable: NOME_DA_VARIAVEL
    secret: NOME_DO_SEGREDO
  ```
  Para criar/atualizar um segredo:
  ```
  firebase apphosting:secrets:set NOME_DO_SEGREDO --data-file -
  ```
  (cole o valor e feche a entrada — em terminal interativo dá pra digitar direto; via script, use
  um heredoc ou pipe pra não deixar o segredo em nenhum arquivo). Depois adicione a referência
  `secret:` no `apphosting.yaml` manualmente (o CLI às vezes falha ao tentar editar o YAML sozinho
  em ambiente não-interativo, mas o segredo já fica criado e liberado do mesmo jeito).

Segredos hoje configurados: `SMTP_PASS_SECRET` (senha de app do Gmail que dispara os e-mails do
SaaS) e `FIREBASE_SERVICE_ACCOUNT` (credencial do Firebase Admin SDK — autoriza o servidor a
verificar login de admin, disparar e-mail e confirmar pagamentos do Mercado Pago).

## Variáveis públicas do Firebase (`NEXT_PUBLIC_FIREBASE_*`)
As mesmas do `.env.local` (ver `.env.example`) também precisam estar em `apphosting.yaml` como
valores públicos — são a config do app cliente (Firestore/Auth), não segredo.

## Backend de nuvem: Firebase (Firestore + Auth)
Sem login, o app funciona 100% local (IndexedDB). Logado, projetos e cadastros vão pro Firestore
(`users/{uid}/...`). Passos de configuração no Firebase console:

1. **Provedores de login** (Authentication → Sign-in method): Google e E-mail/senha habilitados.
2. **Domínios autorizados** (Authentication → Settings → Authorized domains): `localhost`, o domínio
   do App Hosting (`*.hosted.app`) e `souzacad.souza-solucoes-agro.com.br`.
3. **Publicar as regras do Firestore** (segurança por usuário) depois de qualquer mudança em
   `firestore.rules`:
   ```
   firebase login
   firebase deploy --only firestore:rules
   ```
   Isso é uma ação separada do deploy do app — mudar `firestore.rules` no repositório e dar push
   NÃO publica a regra sozinho, precisa rodar esse comando à parte.

## Por que Firebase App Hosting (não Vercel)
Um único ecossistema pra hospedagem + Firestore + Auth + Secret Manager, sem precisar sincronizar
configuração entre duas plataformas diferentes.
