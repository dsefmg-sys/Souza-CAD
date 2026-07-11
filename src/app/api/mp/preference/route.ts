import { NextRequest, NextResponse } from 'next/server';
import { Preference } from 'mercadopago';
import { getFirestore } from 'firebase-admin/firestore';
import { verifySession } from '@/lib/apiAuth';
import { getMercadoPagoClient } from '@/lib/mercadopago';
import { getAdminApp } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

function reqOrigin(req: NextRequest): string {
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('host') || '';
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  const session = await verifySession(req);
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  // Cobrança é POR EMPRESA (Etapa 2b): só o DONO gera pagamento — um colaborador/auxiliar vinculado
  // a outra conta (workspaceUid apontando pra fora) não pode pagar em nome de outra empresa.
  // Aproveita a mesma leitura do perfil pra pegar o VALOR autoritativo (mensalidade definida pelo
  // master), em vez de confiar no valor que o navegador manda — senão dava pra pagar R$1 e sair
  // marcado como em dia.
  let mensalidadeServidor: number | undefined;
  try {
    const perfilSnap = await getFirestore(getAdminApp()).collection('perfisUso').doc(session.uid).get();
    const perfilData = perfilSnap.exists ? perfilSnap.data() : undefined;
    const workspaceUid = perfilData?.workspaceUid as string | undefined;
    if (workspaceUid && workspaceUid !== session.uid) {
      return NextResponse.json({ error: 'Só o responsável pela empresa pode gerar a cobrança. Peça pra ele assinar.' }, { status: 403 });
    }
    const m = Number(perfilData?.mensalidade);
    if (Number.isFinite(m) && m > 0) mensalidadeServidor = m;
  } catch { /* falha ao checar não deve travar quem realmente pode pagar — segue com o padrão */ }

  const client = getMercadoPagoClient();
  if (!client) {
    return NextResponse.json(
      { error: 'Mercado Pago não está configurado no servidor (MP_ACCESS_TOKEN ausente).' },
      { status: 503 }
    );
  }

  // O valor NÃO vem mais do corpo da requisição (o navegador podia adulterar): usa a mensalidade
  // lida do banco e, na falta dela, o valor do plano Autônomo. Ignora qualquer `amount` do cliente.
  const amount = mensalidadeServidor ?? 129;
  const origin = reqOrigin(req);

  try {
    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        items: [{
          id: 'mensalidade',
          title: 'Mensalidade Souza CAD',
          quantity: 1,
          unit_price: Math.round(amount * 100) / 100,
          currency_id: 'BRL',
        }],
        payer: {
          email: session.email || undefined,
        },
        external_reference: session.uid,
        back_urls: {
          success: `${origin}/`,
          failure: `${origin}/`,
          pending: `${origin}/`,
        },
        auto_return: 'approved',
      },
    });

    return NextResponse.json({
      id: result.id,
      init_point: result.init_point,
      sandbox_init_point: result.sandbox_init_point,
    });
  } catch (e: unknown) {
    console.error('[mp/preference] erro ao criar preferência:', (e as Error)?.message || e);
    return NextResponse.json(
      { error: 'Falha ao criar preferência de pagamento.', detail: (e as Error)?.message },
      { status: 502 }
    );
  }
}
