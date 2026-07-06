import { NextResponse } from 'next/server';
import { gerarErrataDocx } from '@/lib/export/errata';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
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
  } catch (err: any) {
    console.error('Erro na geração de errata:', err);
    return NextResponse.json({ erro: err?.message || 'Erro ao gerar errata no servidor.' }, { status: 500 });
  }
}
