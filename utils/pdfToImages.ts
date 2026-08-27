import * as pdfjsLib from 'pdfjs-dist';
import type { ZipEntry } from './zip';

/**
 * Rendering PDF pages out as image files.
 *
 * Uses the same pdf.js instance the editor already renders thumbnails with,
 * so the worker is configured once by usePdfPages and reused here.
 */

export type ImageFormat = 'png' | 'jpeg';

export interface RenderOptions {
  format: ImageFormat;
  /** Render scale; 2 is roughly 144 DPI for a standard page. */
  scale: number;
}

export const IMAGE_EXPORT_PRESETS = {
  screen: { scale: 1.5, label: 'Screen', detail: 'Smaller files, fine on a display.' },
  print: { scale: 3, label: 'Print', detail: 'High resolution, much larger files.' },
} as const;

const sanitize = (name: string): string => (name || 'document').replace(/[\\/:*?"<>|]+/g, '-');

const canvasToBytes = async (
  canvas: HTMLCanvasElement,
  format: ImageFormat
): Promise<Uint8Array | null> => {
  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, format === 'png' ? 'image/png' : 'image/jpeg', 0.9)
  );
  return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
};

export const renderPagesToImages = async (
  sourceBytes: Uint8Array,
  documentTitle: string,
  options: RenderOptions,
  onProgress?: (done: number, total: number) => void
): Promise<ZipEntry[]> => {
  // pdf.js takes ownership of the buffer it is handed, and the caller still
  // needs the original bytes afterwards.
  const loadingTask = pdfjsLib.getDocument({ data: sourceBytes.slice() });
  const doc = await loadingTask.promise;
  const base = sanitize(documentTitle);
  const width = String(doc.numPages).length;
  const entries: ZipEntry[] = [];

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: options.scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const context = canvas.getContext('2d');
    if (!context) continue;

    // JPEG has no alpha, so an unpainted background would come out black.
    if (options.format === 'jpeg') {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    await page.render({ canvas, canvasContext: context, viewport }).promise;

    const bytes = await canvasToBytes(canvas, options.format);
    if (bytes) {
      entries.push({
        name: `${base} ${String(pageNumber).padStart(width, '0')}.${options.format === 'png' ? 'png' : 'jpg'}`,
        bytes,
      });
    }

    // Let the canvas be collected before the next page allocates another.
    canvas.width = 0;
    canvas.height = 0;

    onProgress?.(pageNumber, doc.numPages);
  }

  // Tears down the pdf.js worker for this document rather than leaving it
  // alive for the rest of the session.
  await loadingTask.destroy();
  return entries;
};
