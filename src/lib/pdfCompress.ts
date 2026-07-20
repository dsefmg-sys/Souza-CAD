/**
 * Compressão e Manipulação de PDF no cliente (navegador).
 *
 * Funcionalidades:
 *   1. Compressão inteligente com preservação visual (downscale + re-codificação JPEG).
 *   2. Fusão / Junção de PDFs (Merge).
 *   3. Divisão / Seleção de Páginas (Split / Extract).
 *
 * Tudo roda localmente no navegador — 100% privado, sem tráfego desnecessário na nuvem.
 */

import { PDFDocument } from 'pdf-lib';

export interface CompressPdfOptions {
  /** Peso máximo desejado em bytes. Se null/0, usa preset equilibrado. */
  targetBytes?: number | null;
  /** Nível de qualidade: 'alta' (100% DPI), 'media' (equilibrado), 'maxima_compressao' (~100 DPI) */
  presetQuality?: 'alta' | 'media' | 'maxima_compressao';
  /** Callback de progresso (mensagens para UI). */
  onProgress?: (message: string) => void;
}

export interface CompressPdfResult {
  bytes: Uint8Array;
  initialBytes: number;
  finalBytes: number;
  percentualEconomia: number;
  reachedTarget: boolean;
  scale: number;
  quality: number;
}

const PRESETS_QUALITY = {
  alta: { d: 0.9, q: 0.8 },
  media: { d: 0.75, q: 0.68 },
  maxima_compressao: { d: 0.5, q: 0.5 },
};

const BASE_RENDER_SCALE = 2.0;
const MAX_BASE_SIDE_PX = 2200;

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Falha ao codificar página.'))),
      'image/jpeg',
      quality,
    );
  });
}

interface RenderedPage {
  canvas: HTMLCanvasElement;
  widthPt: number;
  heightPt: number;
}

async function encodeAtPreset(
  pages: RenderedPage[],
  preset: { d: number; q: number },
): Promise<{ blobs: Blob[]; totalBytes: number }> {
  const blobs: Blob[] = [];
  let totalBytes = 0;
  const work = document.createElement('canvas');
  const ctx = work.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível para compressão.');

  for (const page of pages) {
    const w = Math.max(1, Math.round(page.canvas.width * preset.d));
    const h = Math.max(1, Math.round(page.canvas.height * preset.d));
    work.width = w;
    work.height = h;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(page.canvas, 0, 0, w, h);
    const blob = await canvasToJpegBlob(work, preset.q);
    blobs.push(blob);
    totalBytes += blob.size;
  }
  return { blobs, totalBytes };
}

async function buildPdf(pages: RenderedPage[], blobs: Blob[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (let i = 0; i < pages.length; i++) {
    const bytes = new Uint8Array(await blobs[i].arrayBuffer());
    const img = await out.embedJpg(bytes);
    const page = out.addPage([pages[i].widthPt, pages[i].heightPt]);
    page.drawImage(img, { x: 0, y: 0, width: pages[i].widthPt, height: pages[i].heightPt });
  }
  return out.save({ useObjectStreams: true });
}

/** Comprime um arquivo PDF no cliente reduzindo peso mantendo legibilidade. */
export async function compressPdf(
  file: File,
  options: CompressPdfOptions = {},
): Promise<CompressPdfResult> {
  const { targetBytes, presetQuality = 'media', onProgress } = options;
  const initialBytes = file.size;

  onProgress?.('Carregando biblioteca PDF...');
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pages: RenderedPage[] = [];

  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      onProgress?.(`Renderizando página ${i}/${pdf.numPages}...`);
      const page = await pdf.getPage(i);
      const unit = page.getViewport({ scale: 1 });
      let scale = BASE_RENDER_SCALE;
      const longest = Math.max(unit.width, unit.height) * scale;
      if (longest > MAX_BASE_SIDE_PX) scale *= MAX_BASE_SIDE_PX / longest;

      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Não foi possível preparar o canvas.');
      await page.render({ canvasContext: ctx, viewport } as any).promise;
      pages.push({ canvas, widthPt: unit.width, heightPt: unit.height });
    }
  } finally {
    (pdf as any).destroy?.();
  }

  const preset = PRESETS_QUALITY[presetQuality] || PRESETS_QUALITY.media;
  onProgress?.('Comprimindo páginas...');
  const { blobs } = await encodeAtPreset(pages, preset);

  onProgress?.('Gerando PDF otimizado...');
  const bytes = await buildPdf(pages, blobs);
  const finalBytes = bytes.byteLength;
  const percentualEconomia = Math.max(0, Math.round(((initialBytes - finalBytes) / initialBytes) * 100));

  return {
    bytes,
    initialBytes,
    finalBytes,
    percentualEconomia,
    reachedTarget: targetBytes ? finalBytes <= targetBytes : true,
    scale: preset.d,
    quality: preset.q,
  };
}

/** Junta múltiplos arquivos PDF em um só documento. */
export async function unirPdfs(files: File[], onProgress?: (msg: string) => void): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  for (let i = 0; i < files.length; i++) {
    onProgress?.(`Processando arquivo ${i + 1}/${files.length}...`);
    const fileBytes = await files[i].arrayBuffer();
    const pdf = await PDFDocument.load(fileBytes);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  onProgress?.('Gerando documento final unificado...');
  return mergedPdf.save();
}

/** Extrai páginas específicas de um PDF. */
export async function extrairPaginasPdf(
  file: File,
  paginasIndices: number[],
  onProgress?: (msg: string) => void
): Promise<Uint8Array> {
  onProgress?.('Carregando PDF...');
  const fileBytes = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(fileBytes);
  const newDoc = await PDFDocument.create();

  onProgress?.('Copiando páginas selecionadas...');
  const copiedPages = await newDoc.copyPages(srcDoc, paginasIndices);
  copiedPages.forEach((page) => newDoc.addPage(page));

  return newDoc.save();
}
