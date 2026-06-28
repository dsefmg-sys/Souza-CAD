# Deploy — Souza CAD

## Hospedagem: Vercel (recomendado)
Next.js roda nativamente na Vercel, sem configuração.

1. Em vercel.com, "Add New → Project" e importe o repositório `dsefmg-sys/Souza-CAD`.
2. Framework: Next.js (detecta sozinho). Build: `next build`. Sem ajustes.
3. Deploy. A Vercel dá uma URL `*.vercel.app`.

### Subdomínio próprio (recomendado): `souzacad.souza-solucoes-agro.com.br`
1. No projeto da Vercel → Settings → Domains → adicione `souzacad.souza-solucoes-agro.com.br`.
2. No painel DNS do domínio `souza-solucoes-agro.com.br`, crie um registro **CNAME**:
   - Nome/host: `souzacad`
   - Valor: `cname.vercel-dns.com`
3. Aguardar a propagação. A Vercel emite o HTTPS automaticamente.
   (Deixe `NEXT_PUBLIC_BASE_PATH` **vazio** para subdomínio.)

### Alternativa: servir num caminho `…/souzacad`
Só se quiser `souza-solucoes-agro.com.br/souzacad` no mesmo site (mais complexo, exige proxy/
rewrite no site principal). Nesse caso defina `NEXT_PUBLIC_BASE_PATH=/souzacad` nas variáveis.

## Backend de nuvem: Firebase (Firestore + Auth)
Hoje o app guarda tudo **localmente** (IndexedDB) e funciona sem nuvem. Para sincronizar projetos
e cadastros entre dispositivos e ter login/multiusuário:

1. Crie um projeto no Firebase console; ative **Firestore** e **Authentication** (e-mail/senha ou Google).
2. Em Project settings → Web app, copie a config e preencha as variáveis `NEXT_PUBLIC_FIREBASE_*`
   (ver `.env.example`) na Vercel (Settings → Environment Variables) e no `.env.local` para dev.
3. O módulo `src/lib/firebase/client.ts` ativa o Firebase automaticamente quando as variáveis
   existem (`firebaseConfigurado`). Próximo passo de código: uma camada `store/cloud` que espelha
   `projetos`/cadastros no Firestore por usuário (o banco de pontos por credenciado vira por conta).

## CONECTADO — projeto Firebase `souza-cad`
O app já tem login (Google + e-mail/senha) e salva **projetos e cadastros no Firestore** quando
logado (`users/{uid}/...`); sem login, fica tudo local (IndexedDB). Config local em `.env.local`
(não versionado). Passos para ativar de fato:

1. **Ativar provedores de login** no Firebase console → Authentication → Sign-in method:
   habilite **Google** e **E-mail/senha**.
2. **Domínios autorizados** (Authentication → Settings → Authorized domains): adicione
   `localhost`, o domínio da Vercel (`*.vercel.app`) e `souzacad.souza-solucoes-agro.com.br`.
3. **Publicar as regras do Firestore** (segurança por usuário): com o firebase-tools instalado,
   ```
   firebase login
   firebase deploy --only firestore:rules
   ```
4. **Vercel**: em Settings → Environment Variables, copie as mesmas variáveis `NEXT_PUBLIC_FIREBASE_*`
   do `.env.local`.

## Por que Vercel + Firebase
- Vercel: melhor experiência para Next.js, deploy e subdomínio triviais.
- Firebase: mesmo ecossistema dos outros apps do escritório; Firestore para dados + Auth para login.
