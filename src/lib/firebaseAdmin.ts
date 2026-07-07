import { getApps, initializeApp, applicationDefault, cert, type App } from 'firebase-admin/app';

/**
 * App admin compartilhado para rotas de servidor. Usa a service account do App
 * Hosting (ADC) ou FIREBASE_SERVICE_ACCOUNT quando presente. Inicializa uma única
 * vez por instância (getApps()[0]).
 */
export function getAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'souza-cad';
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return initializeApp({
      credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
      projectId,
    });
  }
  return initializeApp({ credential: applicationDefault(), projectId });
}
