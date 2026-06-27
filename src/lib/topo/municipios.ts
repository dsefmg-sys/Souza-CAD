// Âncoras aproximadas (lat/lon) de municípios da região de trabalho, para desambiguar o fuso
// UTM na divisa 23/24. Não precisa de precisão — basta estar a menos de ~3° do local real,
// já que um fuso errado desloca o ponto 6°. Ampliável com a base completa do IBGE depois.
export const MUNICIPIOS: Record<string, { lat: number; lon: number }> = {
  'espera feliz-mg': { lat: -20.6506, lon: -41.9094 },
  'caparaó-mg': { lat: -20.5269, lon: -41.9050 },
  'alto caparaó-mg': { lat: -20.4186, lon: -41.8772 },
  'caiana-mg': { lat: -20.6936, lon: -41.9550 },
  'carangola-mg': { lat: -20.7300, lon: -42.0300 },
  'fervedouro-mg': { lat: -20.7236, lon: -42.2772 },
  'manhuaçu-mg': { lat: -20.2576, lon: -42.0334 },
  'manhumirim-mg': { lat: -20.0586, lon: -41.9550 },
  'tombos-mg': { lat: -20.9500, lon: -42.0300 },
  'dores do rio preto-es': { lat: -20.6900, lon: -41.8400 },
  'guaçuí-es': { lat: -20.7760, lon: -41.6790 },
  'ibitirama-es': { lat: -20.5400, lon: -41.6700 },
  'divino-mg': { lat: -20.6233, lon: -42.1469 },
};

function normaliza(s: string): string {
  return (s || '').trim().toLowerCase();
}

/** Devolve a âncora do município (se conhecido). Aceita com ou sem UF. */
export function ancoraMunicipio(nome: string): { lat: number; lon: number } | null {
  const n = normaliza(nome);
  if (MUNICIPIOS[n]) return MUNICIPIOS[n];
  // tenta casar só pelo nome (sem UF)
  const semUf = n.replace(/-[a-z]{2}$/, '');
  for (const [k, v] of Object.entries(MUNICIPIOS)) {
    if (k.replace(/-[a-z]{2}$/, '') === semUf) return v;
  }
  return null;
}
