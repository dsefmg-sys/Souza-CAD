/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { POST } from './route';
import { verifySession } from '@/lib/apiAuth';
import { enviarEmailSmtp } from '@/lib/server/emailSmtp';

vi.mock('@/lib/apiAuth', () => ({
  verifySession: vi.fn(),
}));

vi.mock('@/lib/server/emailSmtp', () => ({
  enviarEmailSmtp: vi.fn(),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn().mockReturnValue({
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ appUrl: 'https://exemplo.com' }),
        }),
      }),
    }),
  }),
}));

vi.mock('@/lib/firebaseAdmin', () => ({
  getAdminApp: vi.fn(),
}));

describe('API Route: /api/convite/enviar-email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna 401 se nao houver sessao valida', async () => {
    vi.mocked(verifySession).mockResolvedValue(null);

    const req = new Request('http://localhost/api/convite/enviar-email', {
      method: 'POST',
      body: JSON.stringify({ paraEmail: 'colaborador@exemplo.com' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Não autorizado.');
  });

  it('retorna 400 se o e-mail for no formato invalido', async () => {
    vi.mocked(verifySession).mockResolvedValue({ uid: 'user_123', email: 'remetente@exemplo.com' } as any);

    const req = new Request('http://localhost/api/convite/enviar-email', {
      method: 'POST',
      headers: { 'x-forwarded-for': '1.2.3.4' },
      body: JSON.stringify({ paraEmail: 'email_sem_dominio' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('E-mail do convidado com formato inválido.');
  });

  it('envia e-mail com sucesso para formato valido', async () => {
    vi.mocked(verifySession).mockResolvedValue({ uid: 'user_123', email: 'remetente@exemplo.com' } as any);
    vi.mocked(enviarEmailSmtp).mockResolvedValue({ enviado: true });

    const req = new Request('http://localhost/api/convite/enviar-email', {
      method: 'POST',
      headers: { 'x-forwarded-for': '1.2.3.5' },
      body: JSON.stringify({ paraEmail: 'colaborador@exemplo.com', empresaNome: 'Minha Empresa' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.enviado).toBe(true);
    expect(enviarEmailSmtp).toHaveBeenCalled();
  });

  it('aplica rate limiting para requisiçoes em excesso', async () => {
    vi.mocked(verifySession).mockResolvedValue({ uid: 'user_123', email: 'remetente@exemplo.com' } as any);
    vi.mocked(enviarEmailSmtp).mockResolvedValue({ enviado: true });

    const clientIp = '1.2.3.6';

    const callApi = async () => {
      const req = new Request('http://localhost/api/convite/enviar-email', {
        method: 'POST',
        headers: { 'x-forwarded-for': clientIp },
        body: JSON.stringify({ paraEmail: 'colaborador@exemplo.com' }),
      });
      return await POST(req);
    };

    // 1º envio: ok
    const res1 = await callApi();
    expect(res1.status).toBe(200);

    // 2º envio: ok
    const res2 = await callApi();
    expect(res2.status).toBe(200);

    // 3º envio: ok
    const res3 = await callApi();
    expect(res3.status).toBe(200);

    // 4º envio: deve falhar com 429
    const res4 = await callApi();
    expect(res4.status).toBe(429);
    const data = await res4.json();
    expect(data.error).toContain('Muitos e-mails enviados.');
  });
});
