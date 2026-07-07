import { MercadoPagoConfig } from 'mercadopago';

/**
 * Cliente do Mercado Pago para uso EXCLUSIVO no servidor (API routes).
 * O Access Token é lido do ambiente/secret `MP_ACCESS_TOKEN`.
 */
export function getMercadoPagoClient(): MercadoPagoConfig | null {
  let accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) return null;
  
  accessToken = accessToken.trim().replace(/^["']|["']$/g, '').trim();
  if (!accessToken) return null;

  return new MercadoPagoConfig({
    accessToken,
    options: { timeout: 8000 },
  });
}
