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

const CACHE_YOUTUBE = 'metrica.youtubePlaylistUrl';

/** Link da playlist de vídeos-tutorial no YouTube, configurado pelo master. Vazio = botão some. */
export async function carregarYoutubePlaylist(): Promise<string> {
  if (firebaseConfigurado) {
    try {
      const s = await getDoc(doc(fdb()!, 'config', 'app'));
      const url = (s.exists() ? String(s.data()?.youtubePlaylistUrl ?? '') : '');
      try { localStorage.setItem(CACHE_YOUTUBE, url); } catch { /* ignore */ }
      return url;
    } catch { /* offline/regras — cai pro cache */ }
  }
  try { return localStorage.getItem(CACHE_YOUTUBE) ?? ''; } catch { return ''; }
}

export async function salvarYoutubePlaylist(url: string): Promise<void> {
  const cleanUrl = url.trim();
  try { localStorage.setItem(CACHE_YOUTUBE, cleanUrl); } catch { /* ignore */ }
  if (firebaseConfigurado) {
    await setDoc(doc(fdb()!, 'config', 'app'), { youtubePlaylistUrl: cleanUrl }, { merge: true });
  }
}

// Credenciais de SMTP pra disparo de e-mail do painel administrativo (comunicados aos clientes do
// SaaS): guardadas num doc SEPARADO (config/emailSmtp), não no config/app geral — porque config/app
// é lido por QUALQUER usuário autenticado (ver firestore.rules), e uma senha de e-mail não pode
// ficar exposta assim. config/emailSmtp só o master lê/escreve. Sem cache local: são credenciais
// sensíveis, mais seguro reler da nuvem toda vez que o painel abre do que deixar salvo no navegador.
export interface ConfigSmtp {
  host?: string;
  port?: string;
  user?: string;
  pass?: string;
  from?: string;
}

export async function carregarConfigSmtp(): Promise<ConfigSmtp> {
  if (!firebaseConfigurado) return {};
  try {
    const s = await getDoc(doc(fdb()!, 'config', 'emailSmtp'));
    return s.exists() ? (s.data() as ConfigSmtp) : {};
  } catch { return {}; }
}

export async function salvarConfigSmtp(cfg: ConfigSmtp): Promise<void> {
  if (!firebaseConfigurado) return;
  await setDoc(doc(fdb()!, 'config', 'emailSmtp'), {
    host: (cfg.host || '').trim(),
    port: (cfg.port || '').trim(),
    user: (cfg.user || '').trim(),
    pass: (cfg.pass || '').trim(),
    from: (cfg.from || '').trim(),
  });
}

// Modo 3D (visualização de relevo): recurso opcional que o MASTER liga/desliga pra todos os clientes.
// Padrão DESLIGADO — enquanto amadurece, não aparece o botão de 3D pra ninguém a menos que o master ative.
const CACHE_MODO3D = 'metrica.modo3dAtivado';

export async function carregarModo3dAtivado(): Promise<boolean> {
  if (firebaseConfigurado) {
    try {
      const s = await getDoc(doc(fdb()!, 'config', 'app'));
      const v = s.exists() ? s.data()?.modo3dAtivado : undefined;
      if (typeof v === 'boolean') {
        try { localStorage.setItem(CACHE_MODO3D, v ? '1' : '0'); } catch { /* ignore */ }
        return v;
      }
    } catch { /* offline/regras — cai pro cache */ }
  }
  try { return localStorage.getItem(CACHE_MODO3D) === '1'; } catch { return false; }
}

export async function salvarModo3dAtivado(ativo: boolean): Promise<void> {
  try { localStorage.setItem(CACHE_MODO3D, ativo ? '1' : '0'); } catch { /* ignore */ }
  if (firebaseConfigurado) {
    await setDoc(doc(fdb()!, 'config', 'app'), { modo3dAtivado: ativo }, { merge: true });
  }
}
