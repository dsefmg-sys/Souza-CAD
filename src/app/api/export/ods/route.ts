import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { gerarSigefOds, gerarSigefOdsSeparadas, type GlebaSigef } from '@/lib/export/sigefOds';
import { verifySession } from '@/lib/apiAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // Geração de peças técnicas: não bloqueia o download caso token de sessão esteja ausente ou expirado
  await verifySession(req).catch(() => null);

  try {
    const body = await req.json();
    const {
      tipo,
      res,
      imovel,
      tecnico,
      confrontantes,
      confrontantePorLado,
      glebas,
      modeloProprioBase64, // Optional custom template in Base64
      linhasEditadas
    } = body;

    // Load template
    let templateBytes: Uint8Array;
    if (modeloProprioBase64) {
      const binaryString = atob(modeloProprioBase64);
      const len = binaryString.length;
      templateBytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        templateBytes[i] = binaryString.charCodeAt(i);
      }
    } else {
      const filePath = path.join(process.cwd(), 'public', 'templates', 'sigef.ods');
      templateBytes = new Uint8Array(fs.readFileSync(filePath));
    }

    let resultBlob: Blob;
    let contentType = 'application/vnd.oasis.opendocument.spreadsheet';
    let filename = 'sigef.ods';

    const enrichedGlebas = glebas?.map((g: GlebaSigef) => ({ ...g, imoveisCadastrados: body.imoveisCadastrados }));

    if (tipo === 'separadas') {
      resultBlob = await gerarSigefOdsSeparadas(templateBytes, imovel, tecnico, enrichedGlebas);
      contentType = 'application/zip';
      filename = 'sigef_glebas.zip';
    } else {
      resultBlob = await gerarSigefOds({
        templateBytes,
        res,
        imovel,
        tecnico,
        confrontantes,
        confrontantePorLado,
        glebas: enrichedGlebas,
        imoveisCadastrados: body.imoveisCadastrados,
        linhasEditadas
      });
    }

    const buffer = Buffer.from(await resultBlob.arrayBuffer());

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    console.error('Erro na geração de planilha ODS:', err);
    return NextResponse.json({ erro: (err as Error)?.message || 'Erro ao gerar planilha SIGEF (ODS) no servidor.' }, { status: 500 });
  }
}
