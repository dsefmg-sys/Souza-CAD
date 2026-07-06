import { NextResponse } from 'next/server';
import { checarLimiteIA } from '@/lib/ia/rateLimit';
import { firebaseApiKeyServidor, tokenDoHeader, verificarTokenFirebase } from '@/lib/ia/verificarLogin';

// Ponte para o banco de fotos Pexels. A chave (PEXELS_API_KEY, SEM prefixo NEXT_PUBLIC) fica só
// no servidor e nunca vai para o navegador — assim, rotacionar a chave resolve de vez o vazamento.
// Quem tem chave própria do Pexels continua chamando direto do navegador, sem passar por aqui.
export const runtime = 'nodejs';

export async function GET(req: Request) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return NextResponse.json({ erro: 'Banco de fotos não configurado no servidor (falta PEXELS_API_KEY).' }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim().slice(0, 120);
  if (!q) return NextResponse.json({ erro: 'Informe o que buscar.' }, { status: 400 });

  // mesmo esquema da rota da IA: com Firebase configurado, só usuário logado usa a chave do servidor
  let uid: string | null = null;
  if (firebaseApiKeyServidor()) {
    const v = await verificarTokenFirebase(tokenDoHeader(req));
    if (!v) return NextResponse.json({ erro: 'Entre na sua conta para buscar fotos.' }, { status: 401 });
    uid = v.uid;
  }
  const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'local').split(',')[0].trim();
  const lim = checarLimiteIA(`px:${uid ?? ip}`, { porMinuto: 20, porDia: 300 });
  if (!lim.ok) {
    return NextResponse.json(
      { erro: `Busca de fotos temporariamente limitada (${lim.motivo}).` },
      { status: 429, headers: { 'Retry-After': String(lim.retryAposS ?? 60) } },
    );
  }

  try {
    const r = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=24`, {
      headers: { Authorization: key },
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) return NextResponse.json({ erro: `Pexels respondeu ${r.status}.` }, { status: 502 });
    const j = await r.json();
    const fotos = (Array.isArray(j.photos) ? j.photos : [])
      .map((p: { alt?: string; src?: { medium?: string } }) => ({ titulo: p.alt || '', url: p.src?.medium || '' }))
      .filter((p: { url: string }) => p.url);
    return NextResponse.json({ fotos }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ erro: 'Não consegui consultar o Pexels agora.' }, { status: 502 });
  }
}
