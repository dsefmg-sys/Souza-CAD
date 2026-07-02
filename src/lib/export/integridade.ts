import JSZip from 'jszip';

export interface RelatorioIntegridade {
  ok: boolean;
  problemas: string[];
}

/** Conta aberturas (ignorando tags autofecháveis, ex. `<table:table-cell/>`) e fechamentos de uma tag. */
function contarTag(xml: string, tag: string): { abertas: number; fechadas: number } {
  const ocorrencias = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?/?>`, 'g')) || [];
  const abertas = ocorrencias.filter((m) => !m.endsWith('/>')).length;
  const fechadas = (xml.match(new RegExp(`</${tag}>`, 'g')) || []).length;
  return { abertas, fechadas };
}

function validarXmlBemFormado(xml: string, nomeParte: string): string[] {
  const problemas: string[] = [];
  const ampSolto = xml.match(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g);
  if (ampSolto) problemas.push(`${nomeParte}: ${ampSolto.length} caractere(s) "&" sem escape correto`);
  for (const tag of ['w:p', 'w:r', 'w:tbl', 'w:tr', 'w:tc', 'table:table', 'table:table-row', 'table:table-cell']) {
    const { abertas, fechadas } = contarTag(xml, tag);
    if (abertas !== fechadas) problemas.push(`${nomeParte}: tags <${tag}> desbalanceadas (${abertas} abertas, ${fechadas} fechadas)`);
  }
  return problemas;
}

/** Abre um .docx/.ods (zip) e confere as partes obrigatórias + XML bem formado nas partes indicadas. */
export async function validarIntegridadeZip(
  buf: Buffer | ArrayBuffer | Uint8Array,
  opts: { partesObrigatorias: string[]; partesXml: string[] },
): Promise<RelatorioIntegridade> {
  const problemas: string[] = [];
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buf);
  } catch {
    return { ok: false, problemas: ['Arquivo não é um zip válido'] };
  }
  for (const parte of opts.partesObrigatorias) {
    if (!zip.file(parte)) problemas.push(`Parte obrigatória ausente: ${parte}`);
  }
  for (const parte of opts.partesXml) {
    const arq = zip.file(parte);
    if (!arq) continue;
    const xml = await arq.async('string');
    problemas.push(...validarXmlBemFormado(xml, parte));
  }
  return { ok: problemas.length === 0, problemas };
}

export function validarIntegridadeDocx(buf: Buffer | ArrayBuffer | Uint8Array): Promise<RelatorioIntegridade> {
  return validarIntegridadeZip(buf, {
    partesObrigatorias: ['[Content_Types].xml', '_rels/.rels', 'word/document.xml'],
    partesXml: ['word/document.xml'],
  });
}

export function validarIntegridadeOds(buf: Buffer | ArrayBuffer | Uint8Array): Promise<RelatorioIntegridade> {
  return validarIntegridadeZip(buf, {
    partesObrigatorias: ['mimetype', 'content.xml'],
    partesXml: ['content.xml'],
  });
}
