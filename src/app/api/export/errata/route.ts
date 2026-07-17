import { NextResponse } from 'next/server';
import { gerarErrataDocx } from '@/lib/export/errata';
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
      imovel,
      tecnico,
      correcoes,
      areaHa,
      acrescimoRT,
      dataExtenso,
      comarca
    } = body;

    const blob = await gerarErrataDocx({
      imovel,
      tecnico,
      correcoes,
      areaHa,
      acrescimoRT,
      dataExtenso,
      comarca
    });

    const buffer = Buffer.from(await blob.arrayBuffer());

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="errata.docx"`,
      },
    });
  } catch (err: unknown) {
    console.error('Erro na geração de errata:', err);
    return NextResponse.json({ erro: (err as Error)?.message || 'Erro ao gerar errata no servidor.' }, { status: 500 });
  }
}
