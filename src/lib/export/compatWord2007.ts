/**
 * Pós-processamento do .docx para compatibilidade com Word 2007 (versão 12).
 *
 * A biblioteca `docx` v9 gera documentos com compatibilityMode=15 (Word 2013) e namespaces
 * pós-2007 (w14, w15, w16*, wp14, mc). O Word 2007 não reconhece essas extensões e acusa
 * "problema no conteúdo" ao abrir o arquivo. Este módulo abre o ZIP, ajusta os XMLs e
 * reconstrói o pacote para que o mesmo .docx abra sem erro em qualquer versão ≥ Word 2007.
 */
import JSZip from 'jszip';

/**
 * Namespaces que o Word 2007 (ECMA-376 1ª edição) não conhece.
 * Se declarados, o Word 2007 tenta validá-los e falha.
 */
const NS_POS_2007 = [
  'w14', 'w15', 'w16', 'w16cex', 'w16cid', 'w16sdtdh', 'w16se',
  'wp14', 'wpc', 'wpi', 'wpg', 'wps',
  'cx', 'cx1', 'cx2', 'cx3', 'cx4', 'cx5', 'cx6', 'cx7', 'cx8',
];

/** Remove declarações xmlns:xxx="..." dos namespaces pós-2007. */
function removerDeclaracoesNs(xml: string): string {
  for (const ns of NS_POS_2007) {
    // xmlns:w14="http://..." → remove
    xml = xml.replace(new RegExp(`\\s+xmlns:${ns}="[^"]*"`, 'g'), '');
  }
  return xml;
}

/** Remove mc:Ignorable="..." e a declaração xmlns:mc="...". */
function removerMcIgnorable(xml: string): string {
  xml = xml.replace(/\s+mc:Ignorable="[^"]*"/g, '');
  xml = xml.replace(/\s+xmlns:mc="[^"]*"/g, '');
  return xml;
}

/** Troca compatibilityMode de qualquer valor para 12 (Word 2007). */
function ajustarCompatibilityMode(xml: string): string {
  return xml.replace(
    /<w:compatSetting\s+w:val="[^"]*"\s+w:name="compatibilityMode"\s+w:uri="[^"]*"\s*\/>/,
    '<w:compatSetting w:val="12" w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word"/>',
  );
}

/** Partes do ZIP que o Word 2007 não precisa e que a lib gera vazias. */
const PARTES_REMOVIVEIS = [
  'word/comments.xml',
  'word/_rels/comments.xml.rels',
  'word/_rels/endnotes.xml.rels',
  'word/_rels/footnotes.xml.rels',
  'word/_rels/fontTable.xml.rels',
];

/** Remove atributos e elementos com namespaces pós-2007 para evitar XML inválido. */
function removerAtributosETagsPos2007(xml: string): string {
  for (const ns of NS_POS_2007) {
    // Remove atributos como w14:paraId="..." ou w15:var="..."
    xml = xml.replace(new RegExp(`\\s+${ns}:[a-zA-Z0-9]+="[^"]*"`, 'g'), '');
    
    // Remove tags vazias autocompletadas ex: <w14:paraId />
    xml = xml.replace(new RegExp(`<${ns}:[a-zA-Z0-9]+[^>]*\\/>`, 'g'), '');
    
    // Remove tags com conteúdo ex: <w14:paraId>...</w14:paraId>
    xml = xml.replace(new RegExp(`<${ns}:[a-zA-Z0-9]+[^>]*>[\\s\\S]*?<\\/${ns}:[a-zA-Z0-9]+>`, 'g'), '');
  }
  return xml;
}

/**
 * Recebe um Blob de .docx gerado pela lib `docx` e devolve um Blob compatível com Word 2007.
 * O processamento é idempotente — rodar duas vezes produz o mesmo resultado.
 */
export async function compatibilizarWord2007(blob: Blob): Promise<Blob> {
  const buf = await blob.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);

  // 1) Remover partes desnecessárias
  for (const parte of PARTES_REMOVIVEIS) {
    zip.remove(parte);
  }

  // 2) Atualizar [Content_Types].xml para não referenciar partes removidas
  const ctFile = zip.file('[Content_Types].xml');
  if (ctFile) {
    let ct = await ctFile.async('string');
    ct = ct.replace(/<Override[^>]*PartName="\/word\/comments\.xml"[^>]*\/>/g, '');
    zip.file('[Content_Types].xml', ct);
  }

  // 3) Atualizar word/_rels/document.xml.rels para não referenciar comments.xml
  const docRels = zip.file('word/_rels/document.xml.rels');
  if (docRels) {
    let rels = await docRels.async('string');
    rels = rels.replace(/<Relationship[^>]*Target="comments\.xml"[^>]*\/>/g, '');
    zip.file('word/_rels/document.xml.rels', rels);
  }

  // 4) Processar todos os XMLs: remover namespaces pós-2007 e mc:Ignorable
  const arquivos = Object.keys(zip.files);
  for (const nome of arquivos) {
    if (zip.files[nome].dir) continue;
    if (!nome.endsWith('.xml') && !nome.endsWith('.rels')) continue;
    // Não tocar nos .rels que não são XML de Word
    if (nome === '[Content_Types].xml' || nome.endsWith('.rels')) {
      // Já processamos acima; pular
      continue;
    }

    let xml = await zip.files[nome].async('string');
    xml = removerDeclaracoesNs(xml);
    xml = removerMcIgnorable(xml);
    xml = removerAtributosETagsPos2007(xml);

    // settings.xml: ajustar compatibilityMode
    if (nome === 'word/settings.xml') {
      xml = ajustarCompatibilityMode(xml);
    }

    zip.file(nome, xml);
  }

  // 5) Reconstrói o ZIP
  const novoBuf = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return novoBuf;
}
