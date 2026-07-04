// Controle de abuso da IA — primeira linha de defesa contra loop/uso indevido que torraria a cota
// (e o dinheiro) da chave do Gemini. Janela deslizante em memória, por cliente (IP), com teto por
// minuto e por dia. Observação honesta: em serverless a memória é por instância e zera em cold
// start, então não é à prova de tudo; para proteção forte usa-se App Check/Firestore. Mas isto já
// barra o abuso óbvio (rajadas e loops) de graça e sem dependência nova.

interface Registro { minuto: number[]; dia: number[] }
const mapa = new Map<string, Registro>();

export interface LimiteResultado { ok: boolean; motivo?: string; retryAposS?: number }

export interface LimiteOpts { porMinuto?: number; porDia?: number }

/** Registra uma chamada da chave (IP) e diz se está dentro do limite. */
export function checarLimiteIA(chave: string, opts: LimiteOpts = {}): LimiteResultado {
  const porMinuto = opts.porMinuto ?? 8;
  const porDia = opts.porDia ?? 60;
  const agora = Date.now();
  const umMin = agora - 60_000;
  const umDia = agora - 86_400_000;

  const r = mapa.get(chave) ?? { minuto: [], dia: [] };
  r.minuto = r.minuto.filter((t) => t > umMin);
  r.dia = r.dia.filter((t) => t > umDia);

  if (r.minuto.length >= porMinuto) { mapa.set(chave, r); return { ok: false, motivo: 'muitas leituras em pouco tempo', retryAposS: 60 }; }
  if (r.dia.length >= porDia) { mapa.set(chave, r); return { ok: false, motivo: 'limite diário de leituras atingido', retryAposS: 3600 }; }

  r.minuto.push(agora);
  r.dia.push(agora);
  mapa.set(chave, r);

  // faxina leve: evita o mapa crescer sem fim quando muitos IPs param de usar
  if (mapa.size > 5000) {
    for (const [k, v] of mapa) { if (v.dia.filter((t) => t > umDia).length === 0) mapa.delete(k); }
  }
  return { ok: true };
}
