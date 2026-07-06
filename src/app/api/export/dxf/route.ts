import { NextResponse } from 'next/server';
import { exportarDxf } from '@/lib/io/dxf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { vertices, opts } = body;

    const dxfString = exportarDxf(vertices, opts);

    return new Response(dxfString, {
      status: 200,
      headers: {
        'Content-Type': 'application/dxf',
        'Content-Disposition': `attachment; filename="desenho.dxf"`,
      },
    });
  } catch (err: any) {
    console.error('Erro na geração de DXF:', err);
    return NextResponse.json({ erro: err?.message || 'Erro ao gerar arquivo DXF no servidor.' }, { status: 500 });
  }
}
