/**
 * Limites de tamanho por tipo de arquivo de importação.
 *
 * DXF pode vir com MUITAS entidades (projetos de mineração, loteamentos grandes) e passar de
 * 100MB sem susto. GML/XML do INCRA costuma ser menor, mas shapefiles zipados (com .dbf, .shx,
 * .prj) podem chegar a 50MB. KML/GeoJSON são texto e raramente passam de 20MB. Os limites
 * são propositalmente generosos pra cobrir o uso real, mas cortam arquivos obviamente
 * grandes que travariam o navegador.
 *
 * Se você precisa subir um arquivo maior (ex: um DXF de 150MB legítimo), ajuste o limite
 * correspondente aqui. Lembre que processar 150MB de DXF no navegador pode levar minutos
 * e travar a aba.
 */

const LIMITE_BYTES = {
  txt: 20 * 1024 * 1024,         // 20 MB — arquivos de ponto GNSS são minúsculos
  csv: 20 * 1024 * 1024,         // 20 MB
  dxf: 150 * 1024 * 1024,        // 150 MB — topografia pode gerar DXFs grandes
  gml: 50 * 1024 * 1024,         // 50 MB
  xml: 50 * 1024 * 1024,         // 50 MB
  kml: 20 * 1024 * 1024,         // 20 MB
  geojson: 20 * 1024 * 1024,     // 20 MB
  json: 20 * 1024 * 1024,        // 20 MB (GeoJSON, backup, modelos)
  shp: 100 * 1024 * 1024,        // 100 MB (shapefile zipado)
  zip: 100 * 1024 * 1024,        // 100 MB (shapefile)
  pdf: 30 * 1024 * 1024,         // 30 MB (peças técnicas)
  image: 30 * 1024 * 1024,        // 30 MB (foto de documento, etc)
} as const;

export type CategoriaArquivo = keyof typeof LIMITE_BYTES;

function extensaoParaCategoria(nome: string): CategoriaArquivo {
  const m = nome.toLowerCase().match(/\.([a-z0-9]+)$/);
  const ext = m?.[1] ?? 'txt';
  if (ext in LIMITE_BYTES) return ext as CategoriaArquivo;
  // fallback: usa o maior limite conservador (txt, 20MB)
  return 'txt';
}

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

// Exportada também (não só usada internamente) porque o chamador pode querer exibir o tamanho
// formatado mesmo quando a validação passou (ex: "Arquivo de 1.5 MB importado com sucesso").
export { formatarTamanho };

export interface ResultadoValidacao {
  ok: boolean;
  /** Mensagem amigável de erro, vazia se ok. */
  erro: string;
  /** Tamanho do arquivo (sempre preenchido, mesmo em erro, pra mostrar pro usuário). */
  tamanhoFormatado: string;
  /** Limite aplicado, em bytes (sempre preenchido). */
  limiteFormatado: string;
  /** Categoria inferida pela extensão — útil pra logs. */
  categoria: CategoriaArquivo;
}

/**
 * Valida o tamanho de um arquivo contra o limite da sua categoria. Retorna `{ ok, erro, ... }`
 * em vez de lançar — o chamador só precisa mostrar pro usuário ou abortar a importação.
 *
 * Não valida TIPO/CONTEÚDO do arquivo (extensão já é validada pelo `accept` do file picker).
 * O objetivo aqui é só evitar que um DXF de 1GB trave a aba do navegador.
 */
export function validarTamanhoArquivo(arquivo: File): ResultadoValidacao {
  const categoria = extensaoParaCategoria(arquivo.name);
  const limite = LIMITE_BYTES[categoria];
  const tamanhoFormatado = formatarTamanho(arquivo.size);
  const limiteFormatado = formatarTamanho(limite);
  if (arquivo.size > limite) {
    return {
      ok: false,
      erro: `O arquivo "${arquivo.name}" (${tamanhoFormatado}) é maior que o limite de ${limiteFormatado} para ${categoria.toUpperCase()}. Se for legítimo, ajuste o limite em src/lib/io/validarArquivo.ts.`,
      tamanhoFormatado,
      limiteFormatado,
      categoria,
    };
  }
  return { ok: true, erro: '', tamanhoFormatado, limiteFormatado, categoria };
}
