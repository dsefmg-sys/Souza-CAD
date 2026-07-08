// Inicialização do Firebase (cliente) — só ativa se as variáveis de ambiente estiverem
// configuradas. Enquanto não houver backend, o app segue 100% local (IndexedDB).
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { initializeFirestore, getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

const cfg = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDkIEzusmveqZ_vs0S0-U9lILz0Zx3shwA",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "souza-cad.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "souza-cad",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "souza-cad.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "292996249771",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:292996249771:web:38058a1ba7521db11e1fee",
};

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
