import { NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';
import { verifySession } from '@/lib/apiAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = await verifySession(req);
  if (!session) {
    return NextResponse.json({ erro: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { pngBase64 } = body;

    if (!pngBase64) {
      return NextResponse.json({ erro: 'Nenhuma imagem PNG base64 informada.' }, { status: 400 });
    }

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
    pdf.addImage(pngBase64, 'PNG', 0, 0, 420, 297, undefined, 'FAST');
    
    const arrayBuffer = pdf.output('arraybuffer');
    const buffer = Buffer.from(arrayBuffer);

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="planta.pdf"`,
      },
    });
  } catch (err: unknown) {
    console.error('Erro na geração de PDF da planta:', err);
    return NextResponse.json({ erro: (err as Error)?.message || 'Erro ao gerar PDF da planta no servidor.' }, { status: 500 });
  }
}
