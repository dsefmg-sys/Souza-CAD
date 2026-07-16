// Inicialização do Firebase (cliente) — só ativa se as variáveis de ambiente estiverem
// configuradas. Enquanto não houver backend, o app segue 100% local (IndexedDB).
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { initializeFirestore, getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

// Os fallbacks abaixo são o PROJETO "souza-cad" do dono do app, expostos aqui APENAS pra
// que o app ainda funcione quando o desenvolvedor esquece de copiar `.env.example` pra
// `.env.local`. NUNCA exponha uma API key de outro projeto aqui — a segurança do Firebase
// vem das REGRAS DO FIRESTORE (servidor), não de esconder a key do client. Em produção,
// copie `.env.example` → `.env.local` e preencha com as vars do seu projeto Firebase.
const cfg = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDkIEzusmveqZ_vs0S0-U9lILz0Zx3shwA',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'souza-cad.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'souza-cad',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'souza-cad.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '292996249771',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:292996249771:web:38058a1ba7521db11e1fee',
};

// Aviso em dev se o desenvolvedor esqueceu de configurar .env.local. Em produção, isso
// seria estranho (deploys sempre devem ter as envs setadas) — daí o `typeof window` check.
if (typeof window !== 'undefined' && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    '[Firebase] NEXT_PUBLIC_FIREBASE_API_KEY não está definida. O app vai usar o projeto ' +
    'padrão "souza-cad" como fallback — funciona, mas suas alterações não vão pro SEU ' +
    'projeto Firebase. Copie .env.example → .env.local e preencha com as vars do seu projeto.'
  );
}

/** True quando o Firebase está configurado (variáveis presentes). */
export const firebaseConfigurado = Boolean(cfg.apiKey && cfg.projectId);

let _app: FirebaseApp | null = null;
export function firebaseApp(): FirebaseApp | null {
  if (!firebaseConfigurado) return null;
  if (!_app) _app = getApps()[0] ?? initializeApp(cfg as Record<string, string>);
  return _app;
}
let _db: Firestore | null = null;
export function db(): Firestore | null {
  const a = firebaseApp();
  if (!a) return null;
  if (!_db) {
    // ignoreUndefinedProperties: o Firestore rejeita campos undefined; nossos projetos têm
    // campos opcionais (requerente, transmitente, posRotulo...). Isso evita erro ao salvar.
    try { _db = initializeFirestore(a, { ignoreUndefinedProperties: true }); }
    catch { _db = getFirestore(a); }
  }
  return _db;
}
export function auth(): Auth | null {
  const a = firebaseApp();
  return a ? getAuth(a) : null;
}
