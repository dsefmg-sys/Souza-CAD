import { NextResponse } from 'next/server';

// Extrai dados do IMÓVEL/PROPRIETÁRIO de um texto ou documento (PDF/imagem) usando o Gemini.
// Roda NO SERVIDOR: a chave (GOOGLE_GENAI_API_KEY) nunca vai para o navegador.
export const runtime = 'nodejs';

const MODELO = 'gemini-1.5-flash';

export async function POST(req: Request) {
  const key = process.env.GOOGLE_GENAI_API_KEY;
  if (!key) return NextResponse.json({ erro: 'IA não configurada no servidor (falta GOOGLE_GENAI_API_KEY).' }, { status: 503 });

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
