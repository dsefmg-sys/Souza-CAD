import { NextResponse } from 'next/server';
import { checarLimiteIA } from '@/lib/ia/rateLimit';
import { firebaseApiKeyServidor, tokenDoHeader, verificarTokenFirebase } from '@/lib/ia/verificarLogin';

// Extrai dados do IMÓVEL/PROPRIETÁRIO de um texto ou documento (PDF/imagem) usando o Gemini.
// Roda NO SERVIDOR: a chave (GOOGLE_GENAI_API_KEY) nunca vai para o navegador.
export const runtime = 'nodejs';

const MODELO = 'gemini-2.5-flash';
// teto do arquivo no SERVIDOR (o navegador já limita a 15MB; base64 infla ~37%, então ~22M chars ≈ 16MB)
const MAX_BASE64 = 22_000_000;

export async function POST(req: Request) {
  const key = process.env.GOOGLE_GENAI_API_KEY;
  if (!key) return NextResponse.json({ erro: 'IA não configurada no servidor (falta GOOGLE_GENAI_API_KEY).' }, { status: 503 });

  // LOGIN OBRIGATÓRIO: quando o Firebase está configurado, só usuário logado gasta a cota da IA.
  // O navegador manda o ID token no Authorization; conferimos com o Google antes de qualquer coisa.
  // Sem Firebase (modo local/dev), segue liberado só com o limite por IP.
  let uid: string | null = null;
  if (firebaseApiKeyServidor()) {
    const v = await verificarTokenFirebase(tokenDoHeader(req));
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
  try {
    const body = await req.json();
    texto = body.texto ?? '';
    arquivo = body.arquivo ?? null;
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
    'Você é um assistente de agrimensura no Brasil. Extraia do texto ou documento fornecido os dados do IMÓVEL e ' +
    'do PROPRIETÁRIO para um georreferenciamento (SIGEF/INCRA). Responda APENAS com um JSON válido, ' +
    'sem markdown e sem comentários, com EXATAMENTE estas chaves (use string vazia quando não achar): ' +
    'denominacao, matricula, cns, codigoImovelIncra, proprietario, cpfProprietario, conjugeProprietario, ' +
    'cpfConjugeProprietario, municipio, comarca, areaAnteriorHa. Não invente dados que não estejam no documento.';

  try {
    const parts: any[] = [{ text: instrucao }];
    
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

    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json' },
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return NextResponse.json({ erro: `A IA respondeu com erro (${r.status}).`, detalhe: t.slice(0, 300) }, { status: 502 });
    }
    const j = await r.json();
    const saida: string = j?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    let dados: Record<string, string> = {};
    try { dados = JSON.parse(saida); }
    catch {
      const m = saida.match(/\{[\s\S]*\}/);
      if (m) { try { dados = JSON.parse(m[0]); } catch { /* deixa vazio */ } }
    }
    return NextResponse.json({ dados });
  } catch (e) {
    return NextResponse.json({ erro: 'Não consegui falar com a IA: ' + ((e as Error).message || 'erro') }, { status: 502 });
  }
}
