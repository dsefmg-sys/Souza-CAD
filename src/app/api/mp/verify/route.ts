import { NextRequest, NextResponse } from 'next/server';
import { Payment } from 'mercadopago';
import { verifySession } from '@/lib/apiAuth';
import { getMercadoPagoClient } from '@/lib/mercadopago';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await verifySession(req);
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const paymentId = searchParams.get('payment_id');
  
  if (!paymentId) {
    return NextResponse.json({ error: 'Falta o ID do pagamento.' }, { status: 400 });
  }

  const client = getMercadoPagoClient();
  if (!client) {
    return NextResponse.json(
      { error: 'Mercado Pago não está configurado no servidor (MP_ACCESS_TOKEN ausente).' },
      { status: 503 }
    );
  }

  try {
    const payment = await new Payment(client).get({ id: paymentId });
    if (payment.status === 'approved' && payment.external_reference === session.uid) {
      return NextResponse.json({ success: true, paymentId });
    }
    return NextResponse.json({ success: false, status: payment.status });
  } catch (e: any) {
    console.error('[mp/verify] erro ao verificar pagamento:', e?.message || e);
    return NextResponse.json({ error: 'Erro ao processar verificação de pagamento.' }, { status: 500 });
  }
}
