import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { verifySession } from '@/lib/apiAuth';
import { getAdminApp } from '@/lib/firebaseAdmin';
import { enviarEmailSmtp } from '@/lib/server/emailSmtp';

export const runtime = 'nodejs';

const APP_URL_PADRAO = 'https://souzacad--souza-cad.us-east4.hosted.app/';

// Ao contrário de /api/saas/enviar-email (só o master, pra comunicados em massa), esta rota é pra
// QUALQUER usuário logado avisar por e-mail alguém que ele acabou de convidar pro seu workspace
// (ConfiguracoesModal, aba Equipe) — o convite em si (o registro que faz a pessoa entrar sozinha
// ao logar) já existe e funciona sem isso; este e-mail é só o aviso, pra a pessoa convidada saber
// que precisa entrar no app com aquele e-mail específico.
export async function POST(req: Request) {
  const session = await verifySession(req);
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  let body: { paraEmail?: string; empresaNome?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const paraEmail = (body.paraEmail || '').trim();
  const empresaNome = (body.empresaNome || 'a empresa').trim();
  if (!paraEmail || !paraEmail.includes('@')) {
    return NextResponse.json({ error: 'E-mail do convidado inválido.' }, { status: 400 });
  }

  let appUrl = APP_URL_PADRAO;
  try {
    const snap = await getFirestore(getAdminApp()).collection('config').doc('app').get();
    const url = snap.exists ? String(snap.data()?.appUrl ?? '') : '';
    if (url) appUrl = url;
  } catch { /* fica no padrão */ }

  const remetenteNome = session.email || 'Um colega';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
      <h2 style="color: #0a1f14;">Você foi convidado para o Souza CAD</h2>
      <p><strong>${remetenteNome}</strong> convidou você para colaborar em <strong>${empresaNome}</strong> no Souza CAD.</p>
      <p>Para entrar automaticamente no espaço de trabalho dessa empresa, acesse o link abaixo e faça login (ou crie sua conta) usando exatamente este e-mail: <strong>${paraEmail}</strong>.</p>
      <p style="margin: 24px 0;">
        <a href="${appUrl}" style="background: #059669; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold;">Acessar o Souza CAD</a>
      </p>
      <p style="font-size: 12px; color: #6b7280;">Se você não esperava este convite, pode ignorar este e-mail.</p>
    </div>
  `;

  try {
    const { enviado } = await enviarEmailSmtp({ to: paraEmail, subject: `${remetenteNome} convidou você para o Souza CAD`, html });
    return NextResponse.json({ success: true, enviado });
  } catch (e: unknown) {
    console.error('[convite/enviar-email] erro ao enviar:', (e as Error)?.message || e);
    // O convite (registro no Firestore) já existe e funciona sem este e-mail — por isso não
    // devolvemos erro fatal pro cliente, só avisamos que o e-mail em si não saiu.
    return NextResponse.json({ success: true, enviado: false, aviso: 'Convite salvo, mas não consegui mandar o e-mail.' });
  }
}
