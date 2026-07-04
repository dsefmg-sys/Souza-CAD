/**
 * Pós-processamento do .docx para compatibilidade com Word 2007 (versão 12).
 *
 * A biblioteca `docx` v9 gera documentos com compatibilityMode=15 (Word 2013) e namespaces
 * pós-2007 (w14, w15, w16*, wp14, mc). O Word 2007 não reconhece essas extensões e acusa
 * "problema no conteúdo" ao abrir o arquivo. Este módulo abre o ZIP, ajusta os XMLs e
 * reconstrói o pacote para que o mesmo .docx abra sem erro in qualquer versão ≥ Word 2007.
 */
import JSZip from 'jszip';

/**
 * Namespaces pós-2007 que o Word 2007 (ECMA-376 1ª edição) não conhece.
 * Usamos para fazer a limpeza de atributos e tags filhas pós-2007.
 */
const NS_POS_2007 = [
  'w14', 'w15', 'w16', 'w16cex', 'w16cid', 'w16sdtdh', 'w16se',
  'wp14', 'wpc', 'wpi', 'wpg', 'wps',
  'cx', 'cx1', 'cx2', 'cx3', 'cx4', 'cx5', 'cx6', 'cx7', 'cx8',
  'aink', 'am3d', 've',
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

/** Remove atributos e elementos com namespaces pós-2007 para evitar XML inválido. */
function removerAtributosETagsPos2007(xml: string): string {
  for (const ns of NS_POS_2007) {
    // Remove atributos como w14:paraId="..." ou w15:var="..."
    xml = xml.replace(new RegExp(`\\s+${ns}:[a-zA-Z0-9]+="[^"]*"`, 'g'), '');
    
    // Remove tags vazias autocompletadas ex: <w14:paraId /> ou <w14:textId />
    xml = xml.replace(new RegExp(`<${ns}:[a-zA-Z0-9]+[^>]*\\/>`, 'g'), '');
  }
  return xml;
}

/** Partes do ZIP que o Word 2007 não precisa e que a lib gera vazias. */
const PARTES_REMOVIVEIS = [
  'word/comments.xml',
  'word/_rels/comments.xml.rels',
  'word/_rels/endnotes.xml.rels',
  'word/_rels/footnotes.xml.rels',
  'word/_rels/fontTable.xml.rels',
];

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
      continue;
    }

    let xml = await zip.files[nome].async('string');

    // Substituição direta das tags raiz para forçar apenas namespaces clássicos e seguros
    if (nome === 'word/document.xml') {
      xml = xml.replace(/<w:document[^>]*>/, '<w:document xmlns:ve="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml">');
    } else if (nome === 'word/styles.xml') {
      xml = xml.replace(/<w:styles[^>]*>/, '<w:styles xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">');
    } else if (nome === 'word/numbering.xml') {
      xml = xml.replace(/<w:numbering[^>]*>/, '<w:numbering xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">');
    } else if (nome === 'word/settings.xml') {
      xml = xml.replace(/<w:settings[^>]*>/, '<w:settings xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml">');
    }

    xml = removerDeclaracoesNs(xml);
    xml = removerMcIgnorable(xml);
    xml = removerAtributosETagsPos2007(xml);

    // settings.xml: ajustar compatibilityMode
    if (nome === 'word/settings.xml') {
      xml = ajustarCompatibilityMode(xml);
    }

    zip.file(nome, xml);
  }

  // 5) Gerar o novo ZIP
  return await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}
