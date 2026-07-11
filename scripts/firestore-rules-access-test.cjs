const fs = require('fs');
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require('@firebase/rules-unit-testing');
const {
  doc,
  deleteDoc,
  getDoc,
  setDoc,
} = require('firebase/firestore');

async function main() {
  const testEnv = await initializeTestEnvironment({
    projectId: 'souza-cad-rules-test',
    firestore: {
      rules: fs.readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: Number(process.env.FIRESTORE_EMULATOR_PORT || 8080),
    },
  });

  try {
    await testEnv.clearFirestore();

    // Semente (regras desligadas). ownerA e ownerB são donos de empresas separadas;
    // helperA foi convidado/vinculado ao workspace de ownerA; newHelper ainda não foi.
    // Alguns docs saem DE PROPÓSITO sem um campo opcional (workspaceUid, _uid) — é
    // exatamente o caso que travava a regra com erro de avaliação antes do conserto.
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      // perfisUso: ownerA/ownerB SEM workspaceUid (donos normais, não são "ajudante" de ninguém).
      await setDoc(doc(db, 'perfisUso/ownerA'), { email: 'ownerA@x.com' });
      await setDoc(doc(db, 'perfisUso/ownerB'), { email: 'ownerB@x.com' });
      await setDoc(doc(db, 'perfisUso/helperA'), { email: 'helperA@x.com', workspaceUid: 'ownerA' });

      await setDoc(doc(db, 'empresas/ownerA'), { donoUid: 'ownerA', membros: { ownerA: 'admin', helperA: 'membro' } });
      await setDoc(doc(db, 'empresas/ownerB'), { donoUid: 'ownerB', membros: { ownerB: 'admin' } });

      await setDoc(doc(db, 'convites/ajudante@x.com'), { empresaUid: 'ownerA' });

      await setDoc(doc(db, 'users/ownerA'), { nome: 'Owner A' });
      await setDoc(doc(db, 'users/ownerB'), { nome: 'Owner B' });

      await setDoc(doc(db, 'credenciados/cred1'), { _uid: 'ownerA', pontos: 10 });
      // Doc SEM _uid (caso real: registro antigo/incompleto) — não pode travar a regra.
      await setDoc(doc(db, 'credenciados/semDono'), { pontos: 5 });

      await setDoc(doc(db, 'config/app'), { whatsapp: '5500000000' });
    });

    const anonDb = testEnv.unauthenticatedContext().firestore();
    const masterDb = testEnv.authenticatedContext('master', { email: 'dsefmg@gmail.com' }).firestore();
    const ownerADb = testEnv.authenticatedContext('ownerA', { email: 'ownerA@x.com' }).firestore();
    const ownerBDb = testEnv.authenticatedContext('ownerB', { email: 'ownerB@x.com' }).firestore();
    const helperADb = testEnv.authenticatedContext('helperA', { email: 'helperA@x.com' }).firestore();
    const newHelperDb = testEnv.authenticatedContext('newHelper', { email: 'ajudante@x.com' }).firestore();

    // ---- config: qualquer autenticado lê; só o master escreve ----
    await assertSucceeds(getDoc(doc(ownerADb, 'config/app')));
    await assertFails(getDoc(doc(anonDb, 'config/app')));
    await assertFails(setDoc(doc(ownerADb, 'config/app'), { whatsapp: 'hack' }));
    await assertSucceeds(setDoc(doc(masterDb, 'config/app'), { whatsapp: '5599999999' }, { merge: true }));

    // ---- config/emailSmtp: SÓ o master (nem os outros autenticados) ----
    await assertFails(getDoc(doc(ownerADb, 'config/emailSmtp')));
    await assertSucceeds(setDoc(doc(masterDb, 'config/emailSmtp'), { user: 'x@gmail.com' }));

    // ---- perfisUso: cada um o próprio; dono do workspace LÊ (não escreve) o do ajudante
    // vinculado; um perfil sem workspaceUid (caso normal) não trava a regra pra quem
    // tenta ler o de OUTRO sem ter vínculo nenhum. ----
    await assertSucceeds(getDoc(doc(ownerADb, 'perfisUso/ownerA')));
    await assertFails(getDoc(doc(ownerADb, 'perfisUso/ownerB'))); // sem vínculo nenhum
    await assertFails(getDoc(doc(ownerBDb, 'perfisUso/ownerA'))); // idem, e ownerA não tem workspaceUid (campo ausente)
    await assertSucceeds(getDoc(doc(ownerADb, 'perfisUso/helperA'))); // dono do workspace lê o do ajudante vinculado
    await assertFails(setDoc(doc(ownerADb, 'perfisUso/helperA'), { x: 1 })); // só leitura, não escreve o de outro
    await assertSucceeds(setDoc(doc(masterDb, 'perfisUso/ownerA'), { plano: 'pro' }, { merge: true })); // master edita qualquer um

    // ---- convites: só o convidado (pelo e-mail) ou o dono da empresa leem/apagam ----
    await assertSucceeds(getDoc(doc(newHelperDb, 'convites/ajudante@x.com'))); // é o convidado
    await assertSucceeds(getDoc(doc(ownerADb, 'convites/ajudante@x.com'))); // é quem convidou
    await assertFails(getDoc(doc(ownerBDb, 'convites/ajudante@x.com'))); // não tem nada a ver
    await assertSucceeds(setDoc(doc(ownerADb, 'convites/outro@x.com'), { empresaUid: 'ownerA' }));
    await assertFails(setDoc(doc(ownerADb, 'convites/outro2@x.com'), { empresaUid: 'ownerB' })); // não forja empresa alheia
    await assertSucceeds(deleteDoc(doc(newHelperDb, 'convites/ajudante@x.com'))); // convidado recusa/apaga o próprio convite

    // ---- empresas: dono e membros (via mapa `membros`) leem; quem é de fora não ----
    await assertSucceeds(getDoc(doc(ownerADb, 'empresas/ownerA')));
    await assertSucceeds(getDoc(doc(helperADb, 'empresas/ownerA'))); // é membro
    await assertFails(getDoc(doc(ownerBDb, 'empresas/ownerA'))); // não é dono nem membro
    // Convidado se autoADICIONA como 'membro' (só a própria chave, só esse campo).
    await assertSucceeds(setDoc(doc(newHelperDb, 'empresas/ownerA'), {
      membros: { ownerA: 'admin', helperA: 'membro', newHelper: 'membro' },
    }, { merge: true }));
    // Não consegue se auto-promover a 'admin' (preserva as chaves já existentes — só
    // adiciona a própria, senão o "sumiço" das outras chaves já falharia por outro motivo).
    await assertFails(setDoc(doc(ownerBDb, 'empresas/ownerA'), {
      membros: { ownerA: 'admin', helperA: 'membro', newHelper: 'membro', ownerB: 'admin' },
    }, { merge: true }));

    // ---- users: dono lê/escreve o próprio; ajudante vinculado (workspaceUid) lê/escreve o do
    // workspace; sem vínculo, nada. ----
    await assertSucceeds(getDoc(doc(ownerADb, 'users/ownerA')));
    await assertFails(getDoc(doc(ownerBDb, 'users/ownerA')));
    await assertSucceeds(getDoc(doc(helperADb, 'users/ownerA'))); // vinculado ao workspace de ownerA

    // ---- credenciados: só o próprio (_uid); doc sem _uid (legado) não trava a regra,
    // só nega limpo pra quem não é o master. ----
    await assertSucceeds(getDoc(doc(ownerADb, 'credenciados/cred1')));
    await assertFails(getDoc(doc(ownerBDb, 'credenciados/cred1')));
    await assertFails(getDoc(doc(ownerADb, 'credenciados/semDono')));
    await assertSucceeds(getDoc(doc(masterDb, 'credenciados/semDono')));
    // Caso de novo cadastro (documento não existe e resource == null)
    await assertSucceeds(getDoc(doc(ownerADb, 'credenciados/naoExistente')));

    // Restrição de atualização de workspaceUid (anti-escalação de privilégios)
    await assertFails(setDoc(doc(helperADb, 'perfisUso/helperA'), { workspaceUid: 'ownerB' }, { merge: true })); // helperA não tem convite para ownerB
    await assertSucceeds(setDoc(doc(newHelperDb, 'perfisUso/newHelper'), { workspaceUid: 'ownerA' }, { merge: true })); // newHelper tem convite para ownerA
    await assertSucceeds(setDoc(doc(helperADb, 'perfisUso/helperA'), { workspaceUid: 'helperA' }, { merge: true })); // voltar a si mesmo é permitido
    await assertSucceeds(setDoc(doc(helperADb, 'perfisUso/helperA'), { rtNome: 'Nome Modificado' }, { merge: true })); // alterar outros campos sem mudar workspaceUid é permitido

    // Anti-escalação NA CRIAÇÃO (o furo que existia): uma conta nova, SEM convite, não pode nascer
    // já apontando o workspaceUid pra vítima. Antes a regra de create só checava o uid e deixava
    // passar — dando leitura/escrita nos dados da vítima via users/{uid}.
    const atacanteDb = testEnv.authenticatedContext('atacante', { email: 'atacante@x.com' }).firestore();
    await assertFails(setDoc(doc(atacanteDb, 'perfisUso/atacante'), { email: 'atacante@x.com', workspaceUid: 'ownerA' })); // sem convite: criação negada
    await assertSucceeds(setDoc(doc(atacanteDb, 'perfisUso/atacante'), { email: 'atacante@x.com' })); // criar o próprio perfil (sem vínculo) segue permitido
    await assertFails(getDoc(doc(atacanteDb, 'users/ownerA'))); // e, sem vínculo válido, não enxerga os dados da vítima

    // Solicitação de vínculo: o auxiliar só registra pedido em nome próprio; o dono-alvo lê, terceiros não.
    await assertSucceeds(setDoc(doc(atacanteDb, 'solicitacoesVinculo/atacante@x.com'), { solicitanteUid: 'atacante', solicitanteEmail: 'atacante@x.com', alvoEmail: 'ownerA@x.com', criadoEm: 1 }));
    await assertFails(setDoc(doc(atacanteDb, 'solicitacoesVinculo/outro@x.com'), { solicitanteUid: 'atacante', solicitanteEmail: 'atacante@x.com', alvoEmail: 'ownerA@x.com', criadoEm: 1 })); // id tem que ser o próprio e-mail
    await assertSucceeds(getDoc(doc(ownerADb, 'solicitacoesVinculo/atacante@x.com'))); // o RT-alvo vê o pedido endereçado a ele
    await assertFails(getDoc(doc(ownerBDb, 'solicitacoesVinculo/atacante@x.com'))); // quem não é o alvo não vê

    console.log('Firestore rules access tests passed (Metrica).');
  } finally {
    await testEnv.cleanup();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
