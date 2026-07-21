import { NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';
import { verifySession } from '@/lib/apiAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // Geração de peças técnicas: não bloqueia o download caso token de sessão esteja ausente ou expirado
  await verifySession(req).catch(() => null);

  try {
    const body = await req.json();
    const { pngBase64, formato } = body;

    if (!pngBase64) {
      return NextResponse.json({ erro: 'Nenhuma imagem PNG base64 informada.' }, { status: 400 });
    }

    const isA4 = (formato || '').toLowerCase() === 'a4';
    const fmt = isA4 ? 'a4' : 'a3';
    const w = isA4 ? 297 : 420;
    const h = isA4 ? 210 : 297;

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: fmt });
    pdf.addImage(pngBase64, 'PNG', 0, 0, w, h, undefined, 'FAST');
    
    const arrayBuffer = pdf.output('arraybuffer');
    const buffer = Buffer.from(arrayBuffer);

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="planta-${fmt}.pdf"`,
      },
    });
  } catch (err: unknown) {
    console.error('Erro na geração de PDF da planta:', err);
    return NextResponse.json({ erro: (err as Error)?.message || 'Erro ao gerar PDF da planta no servidor.' }, { status: 500 });
  }
}
