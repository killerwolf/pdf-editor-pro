import type { EncodedImage, ImageEncoder } from './compressPdf';

/**
 * Canvas-backed JPEG encoder used by {@link compressPdf}.
 *
 * Prefers OffscreenCanvas, which is what lets the whole compression run
 * inside a worker; falls back to a detached <canvas> on the main thread for
 * browsers without it.
 */

const hasOffscreen = () => typeof OffscreenCanvas !== 'undefined';

const rawToImageData = (
  bytes: Uint8Array,
  width: number,
  height: number,
  channels: 1 | 3
): ImageData => {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel++) {
    const src = pixel * channels;
    const dst = pixel * 4;
    if (channels === 1) {
      const grey = bytes[src];
      rgba[dst] = grey;
      rgba[dst + 1] = grey;
      rgba[dst + 2] = grey;
    } else {
      rgba[dst] = bytes[src];
      rgba[dst + 1] = bytes[src + 1];
      rgba[dst + 2] = bytes[src + 2];
    }
    rgba[dst + 3] = 255;
  }
  return new ImageData(rgba, width, height);
};

const encodeCanvas = async (
  draw: (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) => void,
  width: number,
  height: number,
  quality: number
): Promise<Uint8Array | null> => {
  if (hasOffscreen()) {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    draw(ctx);
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
    return new Uint8Array(await blob.arrayBuffer());
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  draw(ctx);
  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, 'image/jpeg', quality)
  );
  if (!blob) return null;
  return new Uint8Array(await blob.arrayBuffer());
};

export const canvasImageEncoder: ImageEncoder = async (bytes, options): Promise<EncodedImage | null> => {
  const { quality, maxDimension, raw } = options;

  const source = raw
    ? rawToImageData(bytes, raw.width, raw.height, raw.channels)
    : new Blob([bytes as BlobPart], { type: 'image/jpeg' });

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(source as ImageBitmapSource);
  } catch {
    return null;
  }

  try {
    const longestEdge = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, maxDimension / longestEdge);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const encoded = await encodeCanvas(
      ctx => {
        // JPEG has no alpha; painting white first keeps transparent source
        // pixels from turning black.
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(bitmap, 0, 0, width, height);
      },
      width,
      height,
      quality
    );

    return encoded ? { bytes: encoded, width, height } : null;
  } finally {
    // Large scans chew through memory fast; releasing here is what keeps a
    // 100 MB document from taking the tab down.
    bitmap.close();
  }
};
