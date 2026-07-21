// Âncoras aproximadas (lat/lon) para desambiguar o fuso UTM na hora da importação. Não precisa de
// precisão — basta estar a menos de ~3° do local real, já que um fuso errado desloca o ponto 6°.
// Duas camadas: municípios da região de trabalho do dono (mais precisos, ficam em primeiro) e as
// capitais de todos os estados + DF (para o app funcionar em qualquer lugar do Brasil, não só na
// região de Espera Feliz — um agrimensor de outro estado sempre tem uma âncora próxima o bastante).
import { utmParaGeo } from './coords';
import type { ImovelData, CartorioCad } from './types';

export const MUNICIPIOS: Record<string, { lat: number; lon: number }> = {
  // Região do Caparaó e Zona da Mata (MG/ES)
  'espera feliz-mg': { lat: -20.6506, lon: -41.9094 },
  'caparaó-mg': { lat: -20.5269, lon: -41.9050 },
  'alto caparaó-mg': { lat: -20.4186, lon: -41.8772 },
  'caiana-mg': { lat: -20.6936, lon: -41.9550 },
  'carangola-mg': { lat: -20.7300, lon: -42.0300 },
  'fervedouro-mg': { lat: -20.7236, lon: -42.2772 },
  'manhuaçu-mg': { lat: -20.2576, lon: -42.0334 },
  'manhumirim-mg': { lat: -20.0586, lon: -41.9550 },
  'tombos-mg': { lat: -20.9500, lon: -42.0300 },
  'divino-mg': { lat: -20.6233, lon: -42.1469 },
  'muriaé-mg': { lat: -21.1306, lon: -42.3664 },
  'viçosa-mg': { lat: -20.7539, lon: -42.8817 },
  'ubá-mg': { lat: -21.1206, lon: -42.9428 },
  'juiz de fora-mg': { lat: -21.7642, lon: -43.3497 },
  'governador valadares-mg': { lat: -18.8511, lon: -41.9494 },
  'ipatinga-mg': { lat: -19.4686, lon: -42.5369 },
  'uberlândia-mg': { lat: -18.9186, lon: -48.2772 },
  'uberaba-mg': { lat: -19.7483, lon: -47.9319 },
  'montes claros-mg': { lat: -16.7281, lon: -43.8578 },
  'poços de caldas-mg': { lat: -21.7864, lon: -46.5647 },
  'pouso alegre-mg': { lat: -22.2300, lon: -45.9364 },
  'varginha-mg': { lat: -21.5517, lon: -45.4300 },
  'sete lagoas-mg': { lat: -19.4664, lon: -44.2467 },
  'divinópolis-mg': { lat: -20.1444, lon: -44.8908 },
  'barbacena-mg': { lat: -21.2258, lon: -43.7736 },
  'patos de minas-mg': { lat: -18.5789, lon: -46.5181 },
  'teófilo otoni-mg': { lat: -17.8575, lon: -41.5053 },
  'conselheiro lafaiete-mg': { lat: -20.6603, lon: -43.7861 },
  'itajubá-mg': { lat: -22.4258, lon: -45.4528 },
  'passos-mg': { lat: -20.7186, lon: -46.6097 },
  'araguari-mg': { lat: -18.6486, lon: -48.1872 },
  'são joão del rei-mg': { lat: -21.1356, lon: -44.2617 },
  'lavras-mg': { lat: -21.2444, lon: -44.9969 },
  'dores do rio preto-es': { lat: -20.6900, lon: -41.8400 },
  'guaçuí-es': { lat: -20.7760, lon: -41.6790 },
  'ibitirama-es': { lat: -20.5400, lon: -41.6700 },
  'cachoeiro de itapemirim-es': { lat: -20.8489, lon: -41.1128 },
  'colatina-es': { lat: -19.5389, lon: -40.6300 },
  'linhares-es': { lat: -19.3911, lon: -40.0722 },
  'são mateus-es': { lat: -18.7161, lon: -39.8589 },
  'guarapari-es': { lat: -20.6722, lon: -40.4978 },
  'serra-es': { lat: -20.1286, lon: -40.3078 },
  'vila velha-es': { lat: -20.3297, lon: -40.2925 },
  'cariacica-es': { lat: -20.2639, lon: -40.4194 },

  // SP
  'campinas-sp': { lat: -22.9056, lon: -47.0608 },
  'guarulhos-sp': { lat: -23.4538, lon: -46.5333 },
  'são bernardo do campo-sp': { lat: -23.6939, lon: -46.5650 },
  'santo andré-sp': { lat: -23.6639, lon: -46.5383 },
  'osasco-sp': { lat: -23.5325, lon: -46.7917 },
  'ribeirão preto-sp': { lat: -21.1775, lon: -47.8103 },
  'sorocaba-sp': { lat: -23.5017, lon: -47.4581 },
  'são josé dos campos-sp': { lat: -23.1794, lon: -45.8869 },
  'santos-sp': { lat: -23.9608, lon: -46.3339 },
  'são josé do rio preto-sp': { lat: -20.8114, lon: -49.3758 },
  'mogi das cruzes-sp': { lat: -23.5208, lon: -46.1853 },
  'jundiaí-sp': { lat: -23.1864, lon: -46.8844 },
  'piracicaba-sp': { lat: -22.7253, lon: -47.6492 },
  'bauru-sp': { lat: -22.3147, lon: -49.0606 },
  'franca-sp': { lat: -20.5386, lon: -47.4008 },
  'taubaté-sp': { lat: -23.0264, lon: -45.5558 },
  'limeira-sp': { lat: -22.5647, lon: -47.4017 },
  'presidente prudente-sp': { lat: -22.1256, lon: -51.3889 },
  'marília-sp': { lat: -22.2139, lon: -49.9458 },
  'são carlos-sp': { lat: -22.0175, lon: -47.8908 },

  // RJ
  'são gonçalo-rj': { lat: -22.8269, lon: -43.0539 },
  'duque de caxias-rj': { lat: -22.7856, lon: -43.3117 },
  'nova iguaçu-rj': { lat: -22.7592, lon: -43.4511 },
  'niterói-rj': { lat: -22.8833, lon: -43.1036 },
  'campos dos goytacazes-rj': { lat: -21.7550, lon: -41.3250 },
  'petrópolis-rj': { lat: -22.5050, lon: -43.1789 },
  'volta redonda-rj': { lat: -22.5239, lon: -44.1042 },
  'macaé-rj': { lat: -22.3708, lon: -41.7869 },
  'cabo frio-rj': { lat: -22.8789, lon: -42.0186 },
  'resende-rj': { lat: -22.4689, lon: -44.4467 },

  // PR / SC / RS
  'londrina-pr': { lat: -23.3103, lon: -51.1628 },
  'maringá-pr': { lat: -23.4253, lon: -51.9386 },
  'ponta grossa-pr': { lat: -25.0950, lon: -50.1619 },
  'cascavel-pr': { lat: -24.9558, lon: -53.4553 },
  'foz do iguaçu-pr': { lat: -25.5478, lon: -54.5881 },
  'guarapuava-pr': { lat: -25.3906, lon: -51.4628 },
  'joinville-sc': { lat: -26.3039, lon: -48.8458 },
  'blumenau-sc': { lat: -26.9189, lon: -49.0658 },
  'chapecó-sc': { lat: -27.1006, lon: -52.6153 },
  'criciúma-sc': { lat: -28.6775, lon: -49.3697 },
  'itajai-sc': { lat: -26.9078, lon: -48.6619 },
  'caxias do sul-rs': { lat: -29.1681, lon: -51.1794 },
  'canoas-rs': { lat: -29.9178, lon: -51.1836 },
  'pelotas-rs': { lat: -31.7719, lon: -52.3425 },
  'santa maria-rs': { lat: -29.6842, lon: -53.8069 },
  'passo fundo-rs': { lat: -28.2611, lon: -52.4083 },

  // BA / PE / CE / GO / MT / MS / outros
  'feira de santana-ba': { lat: -12.2664, lon: -38.9669 },
  'vitória da conquista-ba': { lat: -14.8661, lon: -40.8394 },
  'juazeiro-ba': { lat: -9.4167, lon: -40.5000 },
  'itabuna-ba': { lat: -14.7858, lon: -39.2803 },
  'ilhéus-ba': { lat: -14.7889, lon: -39.0494 },
  'caruaru-pe': { lat: -8.2839, lon: -35.9761 },
  'petrolina-pe': { lat: -9.3889, lon: -40.5028 },
  'juazeiro do norte-ce': { lat: -7.2131, lon: -39.3153 },
  'sobral-ce': { lat: -3.6861, lon: -40.3497 },
  'aparecida de goiânia-go': { lat: -16.8239, lon: -49.2439 },
  'anápolis-go': { lat: -16.3267, lon: -48.9528 },
  'rio verde-go': { lat: -17.7922, lon: -50.9192 },
  'rondonópolis-mt': { lat: -16.4678, lon: -54.6372 },
  'sinop-mt': { lat: -11.8642, lon: -55.5025 },
  'dourados-ms': { lat: -22.2231, lon: -54.8064 },
  'três lagoas-ms': { lat: -20.7511, lon: -51.6783 },
  'santarém-pa': { lat: -2.4431, lon: -54.7083 },
  'marabá-pa': { lat: -5.3686, lon: -49.1178 },
  'imperatriz-ma': { lat: -5.5264, lon: -47.4725 },
  'campina grande-pb': { lat: -7.2217, lon: -35.8817 },
  'mossoró-rn': { lat: -5.1883, lon: -37.3442 },
  'araguaína-to': { lat: -7.1925, lon: -48.2042 },
  'ji-paraná-ro': { lat: -10.8828, lon: -61.9519 },

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

function normalizarChave(s: string): string {
  return (s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s\/_]+/g, '-')
    .replace(/-+/g, '-');
}

function normaliza(s: string): string {
  return (s || '').trim().toLowerCase();
}

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

export function ufDoMunicipio(municipio: string | undefined): string | null {
  const m = (municipio || '').trim();
  if (!m) return null;
  const lastHyphen = m.lastIndexOf('-');
  const lastSlash = m.lastIndexOf('/');
  const idx = Math.max(lastHyphen, lastSlash);
  const candidate = idx !== -1 ? m.slice(idx + 1).trim().toUpperCase() : m.toUpperCase();
  const ufs = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
  return ufs.includes(candidate) ? candidate : null;
}

export const CAPITAIS_UF: Record<string, { lat: number; lon: number }> = {
  AC: { lat: -9.9754, lon: -67.8249 },
  AL: { lat: -9.6658, lon: -35.7350 },
  AP: { lat: 0.0389, lon: -51.0664 },
  AM: { lat: -3.1190, lon: -60.0217 },
  BA: { lat: -12.9718, lon: -38.5011 },
  CE: { lat: -3.7172, lon: -38.5433 },
  DF: { lat: -15.7942, lon: -47.8822 },
  ES: { lat: -20.3155, lon: -40.3128 },
  GO: { lat: -16.6869, lon: -49.2648 },
  MA: { lat: -2.5307, lon: -44.3068 },
  MT: { lat: -15.6014, lon: -56.0979 },
  MS: { lat: -20.4697, lon: -54.6201 },
  MG: { lat: -19.9167, lon: -43.9345 },
  PA: { lat: -1.4558, lon: -48.4902 },
  PB: { lat: -7.1195, lon: -34.8450 },
  PR: { lat: -25.4284, lon: -49.2733 },
  PE: { lat: -8.0476, lon: -34.8770 },
  PI: { lat: -5.0892, lon: -42.8019 },
  RJ: { lat: -22.9068, lon: -43.1729 },
  RN: { lat: -5.7945, lon: -35.2110 },
  RS: { lat: -30.0346, lon: -51.2177 },
  RO: { lat: -8.7619, lon: -63.9039 },
  RR: { lat: 2.8235, lon: -60.6758 },
  SC: { lat: -27.5954, lon: -48.5480 },
  SP: { lat: -23.5505, lon: -46.6333 },
  SE: { lat: -10.9472, lon: -37.0731 },
  TO: { lat: -10.2491, lon: -48.3243 },
};

/**
 * Devolve as coordenadas lat/lon de um município ou de sua UF (capital) usando a heurística do projeto.
 */
export function obterCoordenadasMunicipioOuUf(
  municipioStr?: string,
  ufStr?: string
): { lat: number; lon: number; origem: 'Município' | 'Estado' } | null {
  const m = (municipioStr || '').trim();
  const u = (ufStr || '').trim().toUpperCase();

  if (m) {
    const keyNorm = normalizarChave(m);
    // 1. Tentar busca exata por chave normalizada
    for (const [k, coords] of Object.entries(MUNICIPIOS)) {
      if (normalizarChave(k) === keyNorm) {
        return { ...coords, origem: 'Município' };
      }
    }
    // 2. Tentar casar pelo nome da cidade
    const ufExt = ufDoMunicipio(m) || (u.length === 2 ? u : null);
    const cidNorm = normalizarChave(m.split(/[-/]/)[0] || '');
    if (cidNorm) {
      for (const [k, coords] of Object.entries(MUNICIPIOS)) {
        const [kCid, kUf] = k.split('-');
        if (normalizarChave(kCid) === cidNorm) {
          if (!ufExt || (kUf && kUf.toUpperCase() === ufExt.toUpperCase())) {
            return { ...coords, origem: 'Município' };
          }
        }
      }
    }
  }

  const ufExtraida = ufDoMunicipio(m) || (u.length === 2 ? u : null);
  if (ufExtraida && CAPITAIS_UF[ufExtraida]) {
    return { ...CAPITAIS_UF[ufExtraida], origem: 'Estado' };
  }

  return null;
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

/**
 * Resolve a comarca correta do imóvel segundo a hierarquia inteligente de fontes:
 * 1. `imovel.comarca` (comarca digitada especificamente para este imóvel)
 * 2. `cartorio.municipio` (município do Cartório de Registro de Imóveis selecionado por CNS)
 * 3. `padroesComarca` (comarca padrão configurada nas opções do escritório/sistema)
 * 4. `imovel.municipio` (fallback final caso nenhuma fonte anterior esteja preenchida)
 */
export function obterComarca(
  imovel?: Partial<ImovelData> | null,
  padroesComarca?: string | null,
  cartorios?: CartorioCad[] | null
): string {
  if (imovel?.comarca?.trim()) {
    return formatarNome(imovel.comarca.trim());
  }
  if (imovel?.cns && cartorios?.length) {
    const cart = cartorios.find((c) => c.cns === imovel.cns);
    if (cart?.municipio?.trim()) {
      return formatarNome(cart.municipio.trim());
    }
  }
  if (padroesComarca?.trim()) {
    return formatarNome(padroesComarca.trim());
  }
  if (imovel?.municipio?.trim()) {
    return formatarNome(imovel.municipio.trim());
  }
  return '—';
}
