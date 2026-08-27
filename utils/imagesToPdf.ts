import { PDFDocument } from 'pdf-lib';

/**
 * Turning image files into PDF pages.
 *
 * Converted images become ordinary single-page PDFs, which lets them flow
 * through the rest of the editor — thumbnails, reordering, rotation,
 * export — without any of it needing to know they started as images.
 */

/** Longest edge of a generated page, in points (the long edge of A4). */
const MAX_PAGE_EDGE = 842;

export const isSupportedImage = (file: File): boolean => file.type.startsWith('image/');

/**
 * pdf-lib embeds JPEG and PNG natively; anything else the browser can
 * decode (WebP, AVIF, GIF…) is re-encoded to JPEG through a canvas first.
 */
const toEmbeddable = async (
  file: File
): Promise<{ bytes: Uint8Array; kind: 'jpg' | 'png' } | null> => {
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (file.type === 'image/jpeg' || file.type === 'image/jpg') return { bytes, kind: 'jpg' };
  if (file.type === 'image/png') return { bytes, kind: 'png' };

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(new Blob([bytes as BlobPart], { type: file.type }));
  } catch {
    return null;
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    // Formats with alpha would otherwise composite onto black.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0);
    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', 0.92)
    );
    if (!blob) return null;
    return { bytes: new Uint8Array(await blob.arrayBuffer()), kind: 'jpg' };
  } finally {
    bitmap.close();
  }
};

/**
 * Wraps one image in a single-page PDF whose page matches the image's
 * aspect ratio, scaled so the longest edge is a printable A4 edge.
 */
export const imageFileToPdfBytes = async (file: File): Promise<Uint8Array | null> => {
  const embeddable = await toEmbeddable(file);
  if (!embeddable) return null;

  const doc = await PDFDocument.create();
  const image =
    embeddable.kind === 'jpg'
      ? await doc.embedJpg(embeddable.bytes)
      : await doc.embedPng(embeddable.bytes);

  const scale = Math.min(1, MAX_PAGE_EDGE / Math.max(image.width, image.height));
  const width = image.width * scale;
  const height = image.height * scale;

  const page = doc.addPage([width, height]);
  page.drawImage(image, { x: 0, y: 0, width, height });

  return doc.save();
};
