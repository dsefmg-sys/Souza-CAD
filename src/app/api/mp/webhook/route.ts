import { NextRequest, NextResponse } from 'next/server';
import { Payment } from 'mercadopago';
import { getFirestore } from 'firebase-admin/firestore';
import { getMercadoPagoClient } from '@/lib/mercadopago';
import { validarAssinaturaMP } from '@/lib/mp/validarWebhook';
import { getAdminApp } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

// Notificação assíncrona do Mercado Pago: ao contrário de mp/verify (que depende do NAVEGADOR do
// cliente voltar da tela de pagamento pra confirmar), esta rota é chamada pelo próprio Mercado Pago
// direto no servidor — continua funcionando mesmo se o cliente fechar a aba antes de voltar.
// mp/preference e mp/verify e o fluxo em page.tsx que lê ?payment_id da URL continuam intocados: o
// webhook é a fonte de verdade que garante consistência; o retorno pelo navegador é só o atalho de
// UX que já mostra "pago" na hora pro cliente, sem esperar a notificação chegar.

// Isolado de propósito: hoje resolve pra `perfisUso/{uid}` (pagamento por pessoa). Quando a Etapa 2
// (empresas com cobrança por empresa) existir, só esta função muda pra resolver `empresaId` — o
// resto da rota (validar assinatura, buscar o pagamento, idempotência) não precisa mudar.
function resolverAlvoCobranca(externalReference: string): { tipo: 'uid'; id: string } {
  return { tipo: 'uid', id: externalReference };
}

export async function POST(req: NextRequest) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[mp/webhook] MP_WEBHOOK_SECRET ausente no ambiente.');
    return NextResponse.json({ error: 'Webhook não configurado no servidor.' }, { status: 503 });
  }

  const xSignature = req.headers.get('x-signature');
  const xRequestId = req.headers.get('x-request-id');
  const { searchParams } = new URL(req.url);

  let body: { type?: string; topic?: string; data?: { id?: string } } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const topico = body.type || body.topic || searchParams.get('type') || searchParams.get('topic') || '';
  const dataId = body.data?.id || searchParams.get('data.id') || searchParams.get('id');

  if (!dataId) {
    return NextResponse.json({ error: 'Notificação sem data.id.' }, { status: 400 });
  }

  if (!validarAssinaturaMP({ xSignature, xRequestId, dataId, secret })) {
    console.error('[mp/webhook] assinatura inválida — possível fraude ou secret desatualizado.');
    return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 401 });
  }

  // Só tratamos pagamentos hoje; outros tópicos (ex.: assinaturas recorrentes) respondem 200 sem
  // processar, pra o Mercado Pago não ficar re-tentando à toa por até ~24h.
  if (topico && topico !== 'payment') {
    return NextResponse.json({ ok: true });
  }

  const client = getMercadoPagoClient();
  if (!client) {
    console.error('[mp/webhook] MP_ACCESS_TOKEN ausente no ambiente.');
    return NextResponse.json({ error: 'Mercado Pago não está configurado no servidor.' }, { status: 503 });
  }

  try {
    // Regra de ouro do Mercado Pago: nunca confiar no status que vem dentro da notificação —
    // buscar o pagamento de novo pela API antes de decidir qualquer coisa.
    const payment = await new Payment(client).get({ id: dataId });
    if (payment.status !== 'approved') {
      return NextResponse.json({ ok: true, status: payment.status });
    }
    if (!payment.external_reference) {
      console.error('[mp/webhook] pagamento aprovado sem external_reference:', payment.id);
      return NextResponse.json({ ok: true });
    }

    const alvo = resolverAlvoCobranca(payment.external_reference);
    const db = getFirestore(getAdminApp());
    const paymentIdStr = String(payment.id);

    // Trava de idempotência: o Mercado Pago pode reenviar a mesma notificação mais de uma vez.
    const registroRef = db.doc(`perfisUso/${alvo.id}/pagamentosMP/${paymentIdStr}`);
    const jaRegistrado = await registroRef.get();
    if (jaRegistrado.exists) {
      return NextResponse.json({ ok: true, ja_processado: true });
    }

    const agora = Date.now();
    await db.doc(`perfisUso/${alvo.id}`).set({
      statusPagamento: 'pago',
      atrasadoDesde: null,
      ultimoPagamentoId: paymentIdStr,
      ultimoPagamentoEm: agora,
    }, { merge: true });

    await registroRef.set({
      paymentId: paymentIdStr,
      status: payment.status,
      valor: payment.transaction_amount ?? null,
      dataAprovacao: payment.date_approved ?? null,
      externalReference: payment.external_reference,
      criadoEm: agora,
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error('[mp/webhook] erro ao processar notificação:', (e as Error)?.message || e);
    // Responde 200 mesmo em erro interno (depois de validar a assinatura) — evita reentrega em
    // loop do Mercado Pago; o erro fica logado pra investigação manual.
    return NextResponse.json({ ok: true, erro_interno: true });
  }
}
