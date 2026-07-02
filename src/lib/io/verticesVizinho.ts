// Leitura do arquivo de vértices de um imóvel VIZINHO já certificado (CSV/TXT baixado manualmente
// pelo agrimensor do Distribuidor de Coordenadas do Acervo Fundiário — exige login gov.br do
// próprio usuário, por isso não dá para automatizar: ele baixa e sobe o arquivo aqui). Aceita
// coordenada geográfica (lat/lon) OU UTM (leste/norte), conforme o mapeamento de colunas definido
// em Configurações (mesmo mecanismo do TXT do GNSS — ver ImportTxtConfigModal).

import type { CampoVerticeVizinho, ImportVerticesVizinhoConfig } from '../topo/types';
import { utmParaGeo } from '../topo/coords';

export interface VerticeVizinhoLido {
  nome: string;
  lat: number;
  lon: number;
  elevacao?: number;
}

function separadorRegex(sep: ImportVerticesVizinhoConfig['separador']): RegExp {
  if (sep === 'tab') return /\t/;
  if (sep === 'espaco') return /\s+/;
  if (sep === ',') return /,/;
  return /;/;
}

function numero(s: string | undefined, decimal: '.' | ','): number {
  if (s == null) return NaN;
  let t = s.trim();
  if (decimal === ',') t = t.replace(/\./g, '').replace(',', '.');
  return parseFloat(t);
}

/**
 * Lê o arquivo do vizinho segundo a configuração de colunas. `zona`/`hemisferio` só são usados
 * se as colunas mapeadas forem UTM (leste/norte) — precisam reprojetar para lat/lon.
 */
export function parseVerticesVizinho(
  conteudo: string,
  cfg: ImportVerticesVizinhoConfig,
  zona: number,
  hemisferio: 'N' | 'S'
): VerticeVizinhoLido[] {
  const re = separadorRegex(cfg.separador);
  const linhas = conteudo.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!linhas.length) return [];
  const corpo = cfg.temCabecalho ? linhas.slice(1) : linhas;

  const indiceDe = (campo: CampoVerticeVizinho) => cfg.colunas.indexOf(campo);
  const iNome = indiceDe('nome');
  const iLat = indiceDe('latitude');
  const iLon = indiceDe('longitude');
  const iLeste = indiceDe('leste');
  const iNorte = indiceDe('norte');
  const iElev = indiceDe('elevacao');
  const usaGeo = iLat >= 0 && iLon >= 0;
  const usaUtm = iLeste >= 0 && iNorte >= 0;

  const out: VerticeVizinhoLido[] = [];
  for (const linha of corpo) {
    const f = linha.split(re);
    let lat: number, lon: number;
    if (usaGeo) {
      lat = numero(f[iLat], cfg.decimal);
      lon = numero(f[iLon], cfg.decimal);
    } else if (usaUtm) {
      const leste = numero(f[iLeste], cfg.decimal);
      const norte = numero(f[iNorte], cfg.decimal);
      if (!isFinite(leste) || !isFinite(norte)) continue;
      const g = utmParaGeo(leste, norte, zona, hemisferio);
      lat = g.lat; lon = g.lon;
    } else continue;
    if (!isFinite(lat) || !isFinite(lon)) continue;

    const nome = (iNome >= 0 ? f[iNome] ?? '' : '').trim();
    const elevacao = iElev >= 0 ? numero(f[iElev], cfg.decimal) : NaN;
    out.push({ nome, lat, lon, ...(isFinite(elevacao) ? { elevacao } : {}) });
  }
  return out;
}
