// Verificação de login NO SERVIDOR para rotas que gastam cota (IA, fotos).
// O navegador manda o ID token do Firebase no header Authorization; aqui conferimos o token
// direto com o Google (endpoint accounts:lookup do Identity Toolkit), usando a MESMA API key
// pública do projeto — não precisa de firebase-admin nem de chave secreta nova.
// Cache curto em memória evita reconferir o mesmo token a cada chamada.

interface TokenOk { uid: string; ate: number }
const cache = new Map<string, TokenOk>();
const CACHE_MS = 5 * 60_000;

/** API key do Firebase (também disponível no servidor, apesar do prefixo NEXT_PUBLIC). */
export function firebaseApiKeyServidor(): string | undefined {
  return process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
}

/** Extrai o token do header Authorization ("Bearer xxx"). */
export function tokenDoHeader(req: Request): string {
  const h = req.headers.get('authorization') || '';
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '';
}

/**
 * Confere o ID token do Firebase com o Google e devolve o uid, ou null se inválido/expirado.
 * Falha de REDE do Google (não do token) também devolve null — quem chama decide a mensagem.
 */
export async function verificarTokenFirebase(idToken: string): Promise<{ uid: string } | null> {
  if (!idToken || idToken.length > 4096) return null;
  const key = firebaseApiKeyServidor();
  if (!key) return null;

  const agora = Date.now();
  const c = cache.get(idToken);
  if (c && c.ate > agora) return { uid: c.uid };

  try {
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const uid: string | undefined = j?.users?.[0]?.localId;
    if (!uid) return null;

    // faxina leve do cache antes de inserir
    if (cache.size > 1000) {
      for (const [k, v] of cache) { if (v.ate <= agora) cache.delete(k); }
    }
    cache.set(idToken, { uid, ate: agora + CACHE_MS });
    return { uid };
  } catch {
    return null;
  }
}
