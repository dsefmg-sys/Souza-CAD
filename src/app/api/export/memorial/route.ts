import { NextResponse } from 'next/server';
import { gerarMemorialDocx } from '@/lib/export/memorial';
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
    const {
      res,
      imovel,
      tecnico,
      confrontantes,
      confrontantePorLado,
      dataExtenso,
      requerente,
      transmitente,
      partesAdicionais,
      zonaUtm,
      modo
    } = body;

    const blob = await gerarMemorialDocx({
      res,
      imovel,
      tecnico,
      confrontantes,
      confrontantePorLado,
      dataExtenso,
      requerente,
      transmitente,
      partesAdicionais,
      zonaUtm,
      modo
    });

    const buffer = Buffer.from(await blob.arrayBuffer());

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="memorial.docx"`,
      },
    });
  } catch (err: unknown) {
    console.error('Erro na geração de memorial:', err);
    return NextResponse.json({ erro: (err as Error)?.message || 'Erro ao gerar memorial descritivo no servidor.' }, { status: 500 });
  }
}
