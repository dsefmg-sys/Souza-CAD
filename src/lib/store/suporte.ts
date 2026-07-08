import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db as fdb, auth, firebaseConfigurado } from '../firebase/client';

// WhatsApp de suporte do SaaS: configurado só pelo usuário MASTER (dono do produto) e visível
// pra todos os clientes. Guardado num doc global do Firestore (config/app) com cache local;
// se o número não estiver configurado, o botão de suporte simplesmente não aparece.

const CACHE = 'metrica.whatsappSuporte';
const MASTERS = ['dsefmg@gmail.com'];

export function souMaster(): boolean {
  if (!firebaseConfigurado) return true; // sem login configurado, o app é do próprio dono
  const email = auth()?.currentUser?.email ?? '';
  return MASTERS.includes(email.toLowerCase());
}

/** Número em formato livre (só dígitos contam). Vazio = suporte desativado. */
export async function carregarWhatsappSuporte(): Promise<string> {
  if (firebaseConfigurado) {
    try {
      const s = await getDoc(doc(fdb()!, 'config', 'app'));
      const num = (s.exists() ? String(s.data()?.whatsappSuporte ?? '') : '');
      try { localStorage.setItem(CACHE, num); } catch { /* ignore */ }
      return num;
    } catch { /* offline/regras — cai pro cache */ }
  }
  try { return localStorage.getItem(CACHE) ?? ''; } catch { return ''; }
}

export async function salvarWhatsappSuporte(numero: string): Promise<void> {
  const num = numero.trim();
  try { localStorage.setItem(CACHE, num); } catch { /* ignore */ }
  if (firebaseConfigurado) {
    await setDoc(doc(fdb()!, 'config', 'app'), { whatsappSuporte: num }, { merge: true });
  }
}

/** Link wa.me pronto, ou null quando não há número configurado. */
export function linkWhatsapp(numero: string): string | null {
  const dig = numero.replace(/\D/g, '');
  if (dig.length < 10) return null;
  return `https://wa.me/${dig.startsWith('55') ? dig : `55${dig}`}`;
}

const CACHE_GEMINI = 'metrica.geminiApiKey';

export async function carregarGeminiApiKey(): Promise<string> {
  if (firebaseConfigurado) {
    try {
      const s = await getDoc(doc(fdb()!, 'config', 'app'));
      const key = (s.exists() ? String(s.data()?.geminiApiKey ?? '') : '');
      try { localStorage.setItem(CACHE_GEMINI, key); } catch { /* ignore */ }
      return key;
    } catch { /* fallback to cache */ }
  }
  try { return localStorage.getItem(CACHE_GEMINI) ?? ''; } catch { return ''; }
}

export async function salvarGeminiApiKey(key: string): Promise<void> {
  const cleanKey = key.trim();
  try { localStorage.setItem(CACHE_GEMINI, cleanKey); } catch { /* ignore */ }
  if (firebaseConfigurado) {
    await setDoc(doc(fdb()!, 'config', 'app'), { geminiApiKey: cleanKey }, { merge: true });
  }
}

const CACHE_APP_URL = 'metrica.appUrl';
const DEFAULT_APP_URL = 'https://souzacad--souza-cad.us-east4.hosted.app/';

export async function carregarAppUrl(): Promise<string> {
  if (firebaseConfigurado) {
    try {
      const s = await getDoc(doc(fdb()!, 'config', 'app'));
      const url = (s.exists() ? String(s.data()?.appUrl ?? '') : '');
      if (url) {
        try { localStorage.setItem(CACHE_APP_URL, url); } catch { /* ignore */ }
        return url;
      }
    } catch { /* fallback to cache */ }
  }
  try { return localStorage.getItem(CACHE_APP_URL) ?? DEFAULT_APP_URL; } catch { return DEFAULT_APP_URL; }
}

export async function salvarAppUrl(url: string): Promise<void> {
  const cleanUrl = url.trim();
  try { localStorage.setItem(CACHE_APP_URL, cleanUrl); } catch { /* ignore */ }
  if (firebaseConfigurado) {
    await setDoc(doc(fdb()!, 'config', 'app'), { appUrl: cleanUrl }, { merge: true });
  }
}
