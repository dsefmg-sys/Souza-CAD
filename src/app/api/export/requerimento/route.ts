import { NextResponse } from 'next/server';
import { gerarRequerimentoDocx } from '@/lib/export/requerimento';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      imovel,
      tecnico,
      requerente,
      transmitente,
      areaRealHa,
      dataExtenso,
      tipoAto,
      partesAdicionais,
      comarca,
      correcoes
    } = body;

    const blob = await gerarRequerimentoDocx({
      imovel,
      tecnico,
      requerente,
      transmitente,
      areaRealHa,
      dataExtenso,
      tipoAto,
      partesAdicionais,
      comarca,
      correcoes
    });

    const buffer = Buffer.from(await blob.arrayBuffer());

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="requerimento.docx"`,
      },
    });
  } catch (err: unknown) {
    console.error('Erro na geração de requerimento:', err);
    return NextResponse.json({ erro: (err as Error)?.message || 'Erro ao gerar requerimento no servidor.' }, { status: 500 });
  }
}
