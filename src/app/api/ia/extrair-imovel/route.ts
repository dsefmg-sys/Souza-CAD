import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { checarLimiteIA } from '@/lib/ia/rateLimit';
import { firebaseApiKeyServidor, tokenDoHeader, verificarTokenFirebase } from '@/lib/ia/verificarLogin';
import { getAdminApp } from '@/lib/firebaseAdmin';

// Extrai dados do IMÓVEL/PROPRIETÁRIO de um texto ou documento (PDF/imagem) usando o Gemini.
// Roda NO SERVIDOR: a chave (GOOGLE_GENAI_API_KEY) nunca vai para o navegador.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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

  // Fallback: chave colada pelo master no painel. Lida pelo Admin SDK (passa por cima das regras),
  // de config/segredos — documento fechado, que só o master lê. Antes isto vinha de config/app via
  // REST com o token do usuário, mas config/app é de leitura livre: a chave ficava exposta a
  // qualquer cliente logado. Mantemos a leitura de config/app só como retaguarda de migração.
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

  // LOGIN OBRIGATÓRIO: quando o Firebase está configurado, só usuário logado gasta a cota da IA.
  // O navegador manda o ID token no Authorization; conferimos com o Google antes de qualquer coisa.
  // Sem Firebase (modo local/dev), segue liberado só com o limite por IP.
  let uid: string | null = null;
  if (firebaseApiKeyServidor()) {
    const v = await verificarTokenFirebase(authToken);
    if (!v) return NextResponse.json({ erro: 'Entre na sua conta para usar a IA.' }, { status: 401 });
    uid = v.uid;
  }

  // ANTI-ABUSO: limita por usuário (ou IP, no modo local) por minuto e por dia, pra um
  // loop/rajada não torrar a cota.
  const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'local').split(',')[0].trim();
  const lim = checarLimiteIA(uid ? `uid:${uid}` : ip);
  if (!lim.ok) {
    return NextResponse.json(
      { erro: `Uso da IA temporariamente limitado (${lim.motivo}). Tente novamente em instantes.` },
      { status: 429, headers: { 'Retry-After': String(lim.retryAposS ?? 60) } },
    );
  }

  let texto = '';
  let arquivo: { data: string; mimeType: string } | null = null;
  let modo = 'todos';
  try {
    const body = await req.json();
    texto = body.texto ?? '';
    arquivo = body.arquivo ?? null;
    modo = body.modo ?? 'todos';
  } catch { /* corpo inválido */ }

  if ((!texto || texto.trim().length < 10) && !arquivo) {
    return NextResponse.json({ erro: 'Envie um texto ou envie um arquivo PDF/Imagem para a IA extrair.' }, { status: 400 });
  }

  // conferência de tamanho e tipo NO SERVIDOR (não confiar só no navegador)
  if (arquivo) {
    if (typeof arquivo.data !== 'string' || arquivo.data.length > MAX_BASE64) {
      return NextResponse.json({ erro: 'Arquivo grande demais. Envie um PDF/imagem de até ~15MB.' }, { status: 413 });
    }
    const tipoOk = /^(application\/pdf|image\/(png|jpe?g|webp))$/i.test(arquivo.mimeType || '');
    if (!tipoOk) {
      return NextResponse.json({ erro: 'Tipo de arquivo não aceito. Use PDF, PNG, JPG ou WEBP.' }, { status: 415 });
    }
  }

  const instrucao =
    'Você é um especialista em georreferenciamento e agrimensura no Brasil. Extraia do texto ou documento fornecido:' +
    ' 1. Os dados do IMÓVEL e do PROPRIETÁRIO (denominacao, matricula, cns, codigoImovelIncra, proprietario, cpfProprietario, conjugeProprietario, cpfConjugeProprietario, municipio, comarca, areaAnteriorHa).' +
    ' 2. Se houver memorial descritivo, certidão, tabela de coordenadas ou lista de pontos UTM/geodésicos no documento, extraia a lista de VÉRTICES no array "vertices" com os objetos: { "nome": string, "norte": number, "leste": number, "elevacao": number }.' +
    ' Responda APENAS com um JSON válido na estrutura: { "denominacao": "...", "matricula": "...", "cns": "...", "codigoImovelIncra": "...", "proprietario": "...", "cpfProprietario": "...", "conjugeProprietario": "...", "cpfConjugeProprietario": "...", "municipio": "...", "comarca": "...", "areaAnteriorHa": "...", "vertices": [ { "nome": "P-01", "norte": 7450000.123, "leste": 650000.456, "elevacao": 520.5 } ] }.' +
    ' Se um campo cadastral não for encontrado use "". Se não houver vértices, use []. Não invente números fictícios.';

  try {
    type ParteGemini = { text: string } | { inlineData: { mimeType: string; data: string } };
    const parts: ParteGemini[] = [{ text: instrucao }];
    
    if (arquivo) {
      const cleanData = arquivo.data.includes(';base64,') 
        ? arquivo.data.split(';base64,')[1] 
        : arquivo.data;
      parts.push({
        inlineData: {
          mimeType: arquivo.mimeType,
          data: cleanData
        }
      });
    }
    
    if (texto) {
      parts.push({ text: `TEXTO:\n"""${texto.slice(0, 15000)}"""` });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 55000);

    let r: Response;
    try {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-goog-api-key': key },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json' },
        }),
      });
    } finally {
      clearTimeout(timer);
    }

    if (!r.ok) {
      const t = await r.text();
      let mensagemErro = `A IA respondeu com erro (${r.status}).`;
      if (r.status === 429) {
        mensagemErro = 'A IA atingiu o limite de requisições do Google Gemini (Erro 429). Aguarde um minuto ou configure sua própria Chave de API nas configurações do sistema.';
      } else if (r.status === 503 || r.status === 504) {
        mensagemErro = 'O servidor da IA do Google Gemini está temporariamente sobrecarregado (Erro 503/504). Tente novamente em alguns segundos.';
      }
      return NextResponse.json({ erro: mensagemErro, detalhe: t.slice(0, 300) }, { status: r.status });
    }
    const j = await r.json();
    const saida: string = j?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    let dados: Record<string, unknown> = {};
    try { dados = JSON.parse(saida); }
    catch {
      const m = saida.match(/\{[\s\S]*\}/);
      if (m) { try { dados = JSON.parse(m[0]); } catch { /* deixa vazio */ } }
    }
    return NextResponse.json({ dados });
  } catch (e) {
    const isAbort = (e as Error)?.name === 'AbortError';
    const status = isAbort ? 504 : 502;
    const msg = isAbort
      ? 'O processamento da IA demorou mais do que o limite permitido (Timeout de 55s). Tente com um documento menor ou envie novamente.'
      : 'Não consegui falar com a IA: ' + ((e as Error).message || 'erro');
    return NextResponse.json({ erro: msg }, { status });
  }
}

