// Catálogo das camadas do Acervo Fundiário do INCRA (i3geo/WFS) por estado atendido.
// Salvo aqui de propósito para servir a buscas automáticas (vizinhos certificados) e usos futuros.
// Base do serviço: https://acervofundiario.incra.gov.br/i3geo/ogc.php?tema=<base>_<uf>

export const INCRA_UFS = ['mg', 'es', 'rj'] as const;
export type IncraUf = (typeof INCRA_UFS)[number];

/** Temas (camadas) disponíveis, sufixados por UF para formar o nome completo. */
export const INCRA_TEMAS_BASE = [
  'certificada_sigef_particular',
  'certificada_sigef_publico',
  'imoveiscertificados_privado',
  'imoveiscertificados_publico',
  'parcelageo',
  'assentamentos',
  'reconhecimento',
  'quilombolas',
] as const;
export type IncraTemaBase = (typeof INCRA_TEMAS_BASE)[number];

export function temaIncra(base: IncraTemaBase, uf: IncraUf): string {
  return `${base}_${uf}`;
}

/** Conjunto de todos os nomes válidos (allowlist da rota de servidor). */
export const INCRA_TEMAS_VALIDOS: ReadonlySet<string> = new Set(
  INCRA_UFS.flatMap((uf) => INCRA_TEMAS_BASE.map((b) => `${b}_${uf}`)),
);

/** Limites aproximados (lon/lat) de cada estado, para só consultar a UF que cobre a região. */
export const INCRA_UF_BOUNDS: Record<IncraUf, { minLon: number; minLat: number; maxLon: number; maxLat: number }> = {
  mg: { minLon: -51.05, minLat: -22.95, maxLon: -39.84, maxLat: -14.23 },
  es: { minLon: -41.90, minLat: -21.32, maxLon: -39.65, maxLat: -17.85 },
  rj: { minLon: -44.92, minLat: -23.40, maxLon: -40.95, maxLat: -20.74 },
};

/** Temas usados para descobrir confrontantes (parcelas/imóveis certificados). */
export const TEMAS_CONFRONTANTE: IncraTemaBase[] = [
  'certificada_sigef_particular',
  'certificada_sigef_publico',
];

/** UFs cujo retângulo intersecta o bbox informado (para não consultar estado fora da região). */
export function ufsNoBbox(minLon: number, minLat: number, maxLon: number, maxLat: number): IncraUf[] {
  return INCRA_UFS.filter((uf) => {
    const b = INCRA_UF_BOUNDS[uf];
    return !(maxLon < b.minLon || minLon > b.maxLon || maxLat < b.minLat || minLat > b.maxLat);
  });
}
