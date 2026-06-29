import { NextResponse } from 'next/server';
import { parseGmlParcelas } from '@/lib/io/sigefVizinhos';

// Proxy de servidor para o WFS de parcelas certificadas do INCRA (Acervo Fundiário).
// O navegador não pode chamar o INCRA direto (sem CORS); o servidor faz a ponte.
// Busca SOMENTE por bounding box (área ao redor do imóvel) para não sobrecarregar o serviço.

const TEMAS: Record<string, string> = {
  mg: 'certificada_sigef_particular_mg',
  es: 'certificada_sigef_particular_es',
};

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const uf = (searchParams.get('uf') || 'mg').toLowerCase();
  const bbox = searchParams.get('bbox'); // minLon,minLat,maxLon,maxLat (EPSG:4326)
  const tema = TEMAS[uf];
  if (!tema || !bbox) return NextResponse.json({ erro: 'Parâmetros inválidos (uf/bbox).' }, { status: 400 });

  const partes = bbox.split(',').map(Number);
  if (partes.length !== 4 || !partes.every(Number.isFinite)) {
    return NextResponse.json({ erro: 'bbox inválido.' }, { status: 400 });
  }
  const [minLon, minLat, maxLon, maxLat] = partes;
  // trava de segurança: bbox no máximo ~0,5° (~50 km) para evitar baixar o estado inteiro
  if (maxLon - minLon > 0.5 || maxLat - minLat > 0.5 || maxLon <= minLon || maxLat <= minLat) {
    return NextResponse.json({ erro: 'Área grande demais — aproxime do imóvel.' }, { status: 400 });
  }

  const url = `https://acervofundiario.incra.gov.br/i3geo/ogc.php?tema=${tema}`
    + `&SERVICE=WFS&VERSION=1.0.0&REQUEST=GetFeature&TYPENAME=${tema}`
    + `&MAXFEATURES=500&BBOX=${minLon},${minLat},${maxLon},${maxLat}`;

  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(25000), headers: { Accept: 'application/xml' } });
    if (!r.ok) return NextResponse.json({ erro: `INCRA respondeu ${r.status}.` }, { status: 502 });
    const gml = await r.text();
    const parcelas = parseGmlParcelas(gml);
    return NextResponse.json({ parcelas }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ erro: 'Não consegui consultar o INCRA agora.' }, { status: 502 });
  }
}
