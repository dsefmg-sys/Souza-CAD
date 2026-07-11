// Âncoras aproximadas (lat/lon) para desambiguar o fuso UTM na hora da importação. Não precisa de
// precisão — basta estar a menos de ~3° do local real, já que um fuso errado desloca o ponto 6°.
// Duas camadas: municípios da região de trabalho do dono (mais precisos, ficam em primeiro) e as
// capitais de todos os estados + DF (para o app funcionar em qualquer lugar do Brasil, não só na
// região de Espera Feliz — um agrimensor de outro estado sempre tem uma âncora próxima o bastante).
import { utmParaGeo } from './coords';

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

  // Capitais dos 26 estados + Distrito Federal (cobertura nacional, precisão de cidade-âncora).
  'rio branco-ac': { lat: -9.9754, lon: -67.8249 },
  'maceió-al': { lat: -9.6658, lon: -35.7350 },
  'macapá-ap': { lat: 0.0389, lon: -51.0664 },
  'manaus-am': { lat: -3.1190, lon: -60.0217 },
  'salvador-ba': { lat: -12.9718, lon: -38.5011 },
  'fortaleza-ce': { lat: -3.7172, lon: -38.5433 },
  'brasília-df': { lat: -15.7942, lon: -47.8822 },
  'vitória-es': { lat: -20.3155, lon: -40.3128 },
  'goiânia-go': { lat: -16.6869, lon: -49.2648 },
  'são luís-ma': { lat: -2.5307, lon: -44.3068 },
  'cuiabá-mt': { lat: -15.6014, lon: -56.0979 },
  'campo grande-ms': { lat: -20.4697, lon: -54.6201 },
  'belo horizonte-mg': { lat: -19.9167, lon: -43.9345 },
  'belém-pa': { lat: -1.4558, lon: -48.4902 },
  'joão pessoa-pb': { lat: -7.1195, lon: -34.8450 },
  'curitiba-pr': { lat: -25.4284, lon: -49.2733 },
  'recife-pe': { lat: -8.0476, lon: -34.8770 },
  'teresina-pi': { lat: -5.0892, lon: -42.8019 },
  'rio de janeiro-rj': { lat: -22.9068, lon: -43.1729 },
  'natal-rn': { lat: -5.7945, lon: -35.2110 },
  'porto alegre-rs': { lat: -30.0346, lon: -51.2177 },
  'porto velho-ro': { lat: -8.7619, lon: -63.9039 },
  'boa vista-rr': { lat: 2.8235, lon: -60.6758 },
  'florianópolis-sc': { lat: -27.5954, lon: -48.5480 },
  'são paulo-sp': { lat: -23.5505, lon: -46.6333 },
  'aracaju-se': { lat: -10.9472, lon: -37.0731 },
  'palmas-to': { lat: -10.2491, lon: -48.3243 },
};

function normaliza(s: string): string {
  return (s || '').trim().toLowerCase();
}

/**
 * Detecta o fuso UTM da coordenada SEM precisar do município: testa cada fuso permitido, converte
 * (E,N) para lat/lon e fica com o fuso cujo ponto cai mais perto de QUALQUER âncora conhecida.
 * Como o fuso errado joga o ponto ~6° (centenas de km) para fora, a escolha é segura — MAS só
 * funciona perto de alguma âncora da lista (por isso agora ela cobre as capitais do Brasil todo,
 * não só a região de trabalho). A zona NÃO pode ser recuperada só do par Leste/Norte sem
 * referência nenhuma (a mesma coordenada é geometricamente válida em todo fuso) — daí a
 * importância de ter sempre uma âncora por perto.
 */
export function detectarFusoPorRegiao(
  leste: number, norte: number, hemisferio: 'N' | 'S', fusosPermitidos: number[] = [23, 24]
): { zona: number; distancia: number } {
  const anchors = Object.values(MUNICIPIOS);
  let melhor = fusosPermitidos[0] ?? 23;
  let melhorD = Infinity;
  for (const z of fusosPermitidos) {
    if (z < 1 || z > 60) continue;
    const { lat, lon } = utmParaGeo(leste, norte, z, hemisferio);
    for (const a of anchors) {
      const d = Math.hypot(lon - a.lon, lat - a.lat);
      if (d < melhorD) { melhorD = d; melhor = z; }
    }
  }
  return { zona: melhor, distancia: melhorD };
}

/**
 * Formata um nome de município "Cidade-UF", capitalizando corretamente cada palavra
 * e mantendo as partículas de ligação ("de", "da", "do", etc.) em minúsculas.
 */
export function formatarNome(s: string): string {
  const lastHyphen = s.lastIndexOf('-');
  if (lastHyphen === -1) return s;
  const cidadeRaw = s.slice(0, lastHyphen);
  const ufRaw = s.slice(lastHyphen + 1);

  const cidade = cidadeRaw
    .split(' ')
    .map((word) => {
      if (word.length <= 3 && /^(de|do|da|dos|das|e)$/i.test(word)) return word.toLowerCase();
      if (word.includes('-')) {
        return word.split('-').map(w => {
          if (w.length <= 3 && /^(de|do|da|dos|das|e)$/i.test(w)) return w.toLowerCase();
          return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        }).join('-');
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');

  return `${cidade}-${ufRaw.toUpperCase()}`;
}

/**
 * Extrai a UF (sigla de 2 letras) do campo de município, que é gravado no formato "Cidade-UF"
 * (ex.: "Cuiabá-MT" → "MT"). Devolve em maiúsculas, ou null quando não há sufixo de UF. Serve para
 * ligar/desligar recursos por estado (ex.: padrão INTERMAT só quando o imóvel é de Mato Grosso).
 */
export function ufDoMunicipio(municipio: string | undefined): string | null {
  const m = (municipio || '').trim().match(/-\s*([A-Za-z]{2})\s*$/);
  if (!m) return null;
  const uf = m[1].toUpperCase();
  const ufs = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
  return ufs.includes(uf) ? uf : null;
}

/** Devolve a âncora do município (se conhecido). Aceita com ou sem UF. */
export function ancoraMunicipio(nome: string): { lat: number; lon: number } | null {
  const n = normaliza(nome);
  if (MUNICIPIOS[n]) return MUNICIPIOS[n];
  // tenta casar só pelo nome (sem UF)
  const ufs = 'ac|al|ap|am|ba|ce|df|es|go|ma|mt|ms|mg|pa|pb|pr|pe|pi|rj|rn|rs|ro|rr|sc|sp|se|to';
  const semUf = n.replace(new RegExp(`-(${ufs})$`), '');
  for (const [k, v] of Object.entries(MUNICIPIOS)) {
    const kSemUf = k.replace(new RegExp(`-(${ufs})$`), '');
    if (kSemUf === semUf) return v;
  }
  return null;
}
