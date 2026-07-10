import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from './firebaseAdmin';

export const OWNER_EMAIL = 'dsefmg@gmail.com';

export interface Session {
  uid: string;
  email?: string;
  emailVerified: boolean;
  admin: boolean;
}

/**
 * Verifica o ID token do chamador com o Firebase Admin SDK.
 */
export async function verifySession(req: Request): Promise<Session | null> {
  const authHeader = req.headers.get('authorization') || '';
  const idToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!idToken) return null;

  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(idToken, true);
    const email = decoded.email;
    const admin =
      decoded.admin === true ||
      (decoded as unknown as { role?: string }).role === 'admin' ||
      (email || '').toLowerCase() === OWNER_EMAIL;
    return {
      uid: decoded.uid,
      email,
      emailVerified: decoded.email_verified === true,
      admin,
    };
  } catch (err) {
    console.error('Session verification error:', err);
    return null;
  }
}
