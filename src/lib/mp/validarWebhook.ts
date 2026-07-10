import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Confere a assinatura HMAC-SHA256 que o Mercado Pago manda no header `x-signature`
 * (formato `ts=<timestamp>,v1=<hash_hex>`), conforme a documentação oficial de webhooks.
 * String assinada: `id:<dataId>;request-id:<xRequestId>;ts:<ts>;`.
 *
 * Separada da rota de propósito: função pura, sem `Request`/`Response`, testável sem simular HTTP.
 */
export function validarAssinaturaMP(params: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
  secret: string;
}): boolean {
  const { xSignature, xRequestId, dataId, secret } = params;
  if (!xSignature || !xRequestId || !dataId || !secret) return false;

  const partes: Record<string, string> = {};
  for (const par of xSignature.split(',')) {
    const [chave, ...resto] = par.split('=');
    if (chave) partes[chave.trim()] = resto.join('=').trim();
  }
  const ts = partes.ts;
  const v1 = partes.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const esperado = createHmac('sha256', secret).update(manifest).digest('hex');

  const bufEsperado = Buffer.from(esperado, 'hex');
  const bufRecebido = Buffer.from(v1, 'hex');
  if (bufEsperado.length !== bufRecebido.length) return false;
  return timingSafeEqual(bufEsperado, bufRecebido);
}
