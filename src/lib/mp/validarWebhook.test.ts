import { describe, it, expect } from 'vitest';
import { createHmac } from 'crypto';
import { validarAssinaturaMP } from './validarWebhook';

const SECRET = 'segredo-de-teste';
const DATA_ID = '123456789';
const REQUEST_ID = 'req-abc-123';
const TS = '1700000000000';

function assinar(dataId: string, requestId: string, ts: string, secret: string): string {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  return createHmac('sha256', secret).update(manifest).digest('hex');
}

describe('validarAssinaturaMP', () => {
  it('aceita uma assinatura válida', () => {
    const v1 = assinar(DATA_ID, REQUEST_ID, TS, SECRET);
    const ok = validarAssinaturaMP({
      xSignature: `ts=${TS},v1=${v1}`,
      xRequestId: REQUEST_ID,
      dataId: DATA_ID,
      secret: SECRET,
    });
    expect(ok).toBe(true);
  });

  it('rejeita quando o hash foi adulterado', () => {
    const v1 = assinar(DATA_ID, REQUEST_ID, TS, SECRET);
    const adulterado = v1.slice(0, -2) + (v1.slice(-2) === '00' ? '11' : '00');
    const ok = validarAssinaturaMP({
      xSignature: `ts=${TS},v1=${adulterado}`,
      xRequestId: REQUEST_ID,
      dataId: DATA_ID,
      secret: SECRET,
    });
    expect(ok).toBe(false);
  });

  it('rejeita quando o timestamp foi trocado (assinatura não bate mais)', () => {
    const v1 = assinar(DATA_ID, REQUEST_ID, TS, SECRET);
    const ok = validarAssinaturaMP({
      xSignature: `ts=9999999999999,v1=${v1}`,
      xRequestId: REQUEST_ID,
      dataId: DATA_ID,
      secret: SECRET,
    });
    expect(ok).toBe(false);
  });

  it('rejeita quando o data.id não bate com o que foi assinado', () => {
    const v1 = assinar(DATA_ID, REQUEST_ID, TS, SECRET);
    const ok = validarAssinaturaMP({
      xSignature: `ts=${TS},v1=${v1}`,
      xRequestId: REQUEST_ID,
      dataId: 'outro-id-qualquer',
      secret: SECRET,
    });
    expect(ok).toBe(false);
  });

  it('rejeita quando falta o header x-signature', () => {
    const ok = validarAssinaturaMP({
      xSignature: null,
      xRequestId: REQUEST_ID,
      dataId: DATA_ID,
      secret: SECRET,
    });
    expect(ok).toBe(false);
  });

  it('rejeita quando falta o header x-request-id', () => {
    const v1 = assinar(DATA_ID, REQUEST_ID, TS, SECRET);
    const ok = validarAssinaturaMP({
      xSignature: `ts=${TS},v1=${v1}`,
      xRequestId: null,
      dataId: DATA_ID,
      secret: SECRET,
    });
    expect(ok).toBe(false);
  });

  it('rejeita quando o secret usado pra assinar é diferente do configurado', () => {
    const v1 = assinar(DATA_ID, REQUEST_ID, TS, 'segredo-errado');
    const ok = validarAssinaturaMP({
      xSignature: `ts=${TS},v1=${v1}`,
      xRequestId: REQUEST_ID,
      dataId: DATA_ID,
      secret: SECRET,
    });
    expect(ok).toBe(false);
  });

  it('rejeita x-signature sem os campos ts/v1 (formato inesperado)', () => {
    const ok = validarAssinaturaMP({
      xSignature: 'algo-fora-do-padrao',
      xRequestId: REQUEST_ID,
      dataId: DATA_ID,
      secret: SECRET,
    });
    expect(ok).toBe(false);
  });
});
