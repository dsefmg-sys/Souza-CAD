import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { checarLimiteIA } from '@/lib/ia/rateLimit';
import { firebaseApiKeyServidor, tokenDoHeader, verificarTokenFirebase } from '@/lib/ia/verificarLogin';
import { getAdminApp } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

const MODELO = 'gemini-2.5-flash';
const MAX_BASE64 = 22_000_000;
let cachedKey: string | null = null;
let lastFetched = 0;
const CACHE_KEY_MS = 60_000 * 10; // 10 min

async function obterGeminiApiKey(): Promise<string | null> {
  const envKey = process.env.GOOGLE_GENAI_API_KEY;
  if (envKey) return envKey;

  const agora = Date.now();
  if (cachedKey && (agora - lastFetched < CACHE_KEY_MS)) {
    return cachedKey;
  }

  try {
    const db = getFirestore(getAdminApp());
    const seg = await db.collection('config').doc('segredos').get();
    const dbKey = (seg.exists ? (seg.data()?.geminiApiKey as string | undefined) : undefined)
      || (await db.collection('config').doc('app').get().then((s) => (s.exists ? (s.data()?.geminiApiKey as string | undefined) : undefined)).catch(() => undefined));
    if (dbKey) {
      cachedKey = dbKey;
      lastFetched = agora;
      return dbKey;
    }
  } catch (e) {
    console.error('Erro ao obter geminiApiKey (Admin SDK):', e);
  }
  return null;
}

export async function POST(req: Request) {
  const authToken = tokenDoHeader(req);
  const key = await obterGeminiApiKey();
  if (!key) return NextResponse.json({ erro: 'IA não configurada no servidor (falta chave do Gemini).' }, { status: 503 });

  let uid: string | null = null;
  if (firebaseApiKeyServidor()) {
    const v = await verificarTokenFirebase(authToken);
    if (!v) return NextResponse.json({ erro: 'Entre na sua conta para usar a IA.' }, { status: 401 });
    uid = v.uid;
  }

  const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'local').split(',')[0].trim();
  const lim = checarLimiteIA(uid ? `uid:${uid}` : ip);
  if (!lim.ok) {
    return NextResponse.json(
      { erro: `Uso da IA temporariamente limitado (${lim.motivo}). Tente novamente em instantes.` },
      { status: 429, headers: { 'Retry-After': String(lim.retryAposS ?? 60) } },
    );
  }

  let arquivo: { data: string; mimeType: string } | null = null;
  try {
    const body = await req.json();
    arquivo = body.arquivo ?? null;
  } catch { /* corpo inválido */ }

  if (!arquivo) {
    return NextResponse.json({ erro: 'Envie um arquivo PDF/Imagem para a IA resumir.' }, { status: 400 });
  }

  if (typeof arquivo.data !== 'string' || arquivo.data.length > MAX_BASE64) {
    return NextResponse.json({ erro: 'Arquivo grande demais. Envie um PDF/imagem de até ~15MB.' }, { status: 413 });
  }
  const tipoOk = /^(application\/pdf|image\/(png|jpe?g|webp))$/i.test(arquivo.mimeType || '');
  if (!tipoOk) {
    return NextResponse.json({ erro: 'Tipo de arquivo não aceito. Use PDF, PNG, JPG ou WEBP.' }, { status: 415 });
  }

  const instrucao =
    'Você é um assistente especialista em agrimensura e registro de imóveis no Brasil. ' +
    'Faça um resumo analítico, estruturado e conciso (usando tópicos limpos) do documento anexado ' +
    '(que pode ser uma certidão de inteiro teor, matrícula ou escritura). ' +
    'Identifique e resuma de forma muito clara as seguintes informações fundamentais para o agrimensor:\n' +
    '1. PROPRIETÁRIOS E DADOS PESSOAIS: Quem é o proprietário atual e anteriores relevantes (nomes, CPFs/CNPJs, estado civil).\n' +
    '2. DADOS DO IMÓVEL: Área registrada (em ha ou m²), limites descritos, confrontantes oficiais mencionados e número da matrícula/registro.\n' +
    '3. ÔNUS E GRAVAMES: Há hipotecas, penhoras, indisponibilidades, servidões, cláusulas restritivas ou ações judiciais averbadas?\n' +
    '4. OBSERVAÇÕES TÉCNICAS: Qualquer dado georreferenciado, memorial descritivo citado, ou exigências cartoriais anteriores.\n' +
    'Escreva de forma profissional, direta e organizada em tópicos. Não utilize jargões vagos e seja específico com números, nomes e datas citados no documento. Limite a resposta a no máximo 450 palavras.';

  try {
    type ParteGemini = { text: string } | { inlineData: { mimeType: string; data: string } };
    const parts: ParteGemini[] = [{ text: instrucao }];
    
    const cleanData = arquivo.data.includes(';base64,') 
      ? arquivo.data.split(';base64,')[1] 
      : arquivo.data;
    parts.push({
      inlineData: {
        mimeType: arquivo.mimeType,
        data: cleanData
      }
    });

    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0.15 },
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      let mensagemErro = `A IA respondeu com erro (${r.status}).`;
      if (r.status === 429) {
        mensagemErro = 'A IA atingiu o limite de requisições do Google Gemini (Erro 429). Aguarde um minuto ou configure sua própria Chave de API nas configurações do sistema.';
      }
      return NextResponse.json({ erro: mensagemErro, detalhe: t.slice(0, 300) }, { status: r.status });
    }
    const j = await r.json();
    const resumo: string = j?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return NextResponse.json({ resumo });
  } catch (e) {
    return NextResponse.json({ erro: 'Não consegui falar com a IA: ' + ((e as Error).message || 'erro') }, { status: 502 });
  }
}
