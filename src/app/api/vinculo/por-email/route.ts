import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { verifySession, OWNER_EMAIL } from '@/lib/apiAuth';
import { getAdminApp } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

// Resolve um e-mail pro uid da conta correspondente — necessário porque o SDK de cliente do
// Firebase não permite procurar usuário por e-mail (só o Admin SDK consegue). Usada pelo cadastro
// "Auxiliar" (PrimeiroAcessoModal): o auxiliar digita o e-mail do RT/empresa que ajuda e o vínculo
// liga na hora, sem precisar aprovação — decisão do dono (10/07/2026).
export async function POST(req: Request) {
  const session = await verifySession(req);
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  let body: { emailAlvo?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const emailAlvo = (body.emailAlvo || '').trim().toLowerCase();
  if (!emailAlvo || !emailAlvo.includes('@')) {
    return NextResponse.json({ error: 'Informe um e-mail válido.' }, { status: 400 });
  }
  if (emailAlvo === (session.email || '').toLowerCase()) {
    return NextResponse.json({ error: 'Esse é o seu próprio e-mail.' }, { status: 400 });
  }
  // O e-mail do dono do produto nunca pode ser alvo de autovínculo — só ele convida, pela própria
  // tela de Equipe (criarConvite), nunca o contrário. Protege a conta master de qualquer um digitar
  // esse e-mail e ganhar acesso a dados de clientes.
  if (emailAlvo === OWNER_EMAIL) {
    return NextResponse.json({ error: 'Não é possível se vincular a este e-mail.' }, { status: 403 });
  }

  try {
    const usuario = await getAuth(getAdminApp()).getUserByEmail(emailAlvo);
    return NextResponse.json({ uid: usuario.uid });
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err?.code === 'auth/user-not-found') {
      return NextResponse.json({ error: 'Esse e-mail ainda não tem cadastro no Souza CAD.' }, { status: 404 });
    }
    console.error('[vinculo/por-email] erro ao buscar usuário:', e);
    return NextResponse.json({ error: 'Erro ao procurar esse e-mail.' }, { status: 500 });
  }
}
