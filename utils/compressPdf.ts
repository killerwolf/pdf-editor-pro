import {
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFRawStream,
  decodePDFRawStream,
} from 'pdf-lib';

/**
 * Client-side PDF compression.
 *
 * Strategy: re-encode the embedded raster images and leave everything else
 * alone. Images are where the bulk of a heavy PDF lives, and rewriting only
 * them means text stays selectable, vectors stay sharp and the document
 * structure is untouched — unlike the "rasterise every page" shortcut, which
 * shrinks well but destroys the document.
 *
 * Everything runs on the caller's machine. The encoder is injected so the
 * same logic drives an OffscreenCanvas inside a worker or a plain canvas on
 * the main thread.
 */

export interface CompressionOptions {
  /** JPEG quality, 0..1. */
  quality: number;
  /** Longest edge, in pixels, an image is allowed to keep. */
  maxDimension: number;
}

export const COMPRESSION_PRESETS = {
  light: { quality: 0.82, maxDimension: 2400 },
  balanced: { quality: 0.65, maxDimension: 1800 },
  strong: { quality: 0.45, maxDimension: 1200 },
} as const satisfies Record<string, CompressionOptions>;

export type CompressionPresetName = keyof typeof COMPRESSION_PRESETS;

export interface EncodedImage {
  bytes: Uint8Array;
  width: number;
  height: number;
}

/**
 * Decodes `bytes` (a complete image file, or raw samples described by
 * `raw`), downsamples it to `maxDimension` and returns JPEG bytes.
 * Returns null when the image cannot be decoded.
 */
export type ImageEncoder = (
  bytes: Uint8Array,
  options: CompressionOptions & {
    /** Present when the source is raw samples rather than an image file. */
    raw?: { width: number; height: number; channels: 1 | 3 };
  }
) => Promise<EncodedImage | null>;

export type SkipReason =
  | 'too-small'
  | 'stencil-mask'
  | 'unsupported-filter'
  | 'unsupported-colorspace'
  | 'decode-failed'
  | 'no-gain';

export interface CompressionReport {
  originalBytes: number;
  compressedBytes: number;
  imagesFound: number;
  imagesRecompressed: number;
  skipped: Partial<Record<SkipReason, number>>;
}

export interface CompressProgress {
  processed: number;
  total: number;
}

/** Below this, an image is not worth the CPU or the risk of a visible loss. */
const MIN_IMAGE_BYTES = 24 * 1024;

const nameOf = (dict: PDFDict, key: string): string | undefined =>
  dict.get(PDFName.of(key))?.toString();

const numberOf = (dict: PDFDict, key: string): number | undefined => {
  const value = dict.get(PDFName.of(key));
  return value instanceof PDFNumber ? value.asNumber() : undefined;
};

interface ImageCandidate {
  ref: ReturnType<PDFDocument['context']['nextRef']>;
  stream: PDFRawStream;
  dict: PDFDict;
}

const collectImages = (doc: PDFDocument): ImageCandidate[] => {
  const found: ImageCandidate[] = [];
  for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    const dict = obj.dict;
    if (nameOf(dict, 'Subtype') !== '/Image') continue;
    found.push({ ref, stream: obj, dict });
  }
  return found;
};

/**
 * Works out how to hand an image to the encoder.
 *
 * JPEG streams are already a complete image file, so the browser can decode
 * them directly. Flate streams hold raw samples, which we inflate and
 * describe; only plain 8-bit grey and RGB are handled, because anything
 * else (indexed palettes, ICC profiles, CMYK sample data) needs a colour
 * pipeline we would rather not guess at.
 */
const prepareSource = (
  candidate: ImageCandidate
):
  | { kind: 'file'; bytes: Uint8Array }
  | { kind: 'raw'; bytes: Uint8Array; width: number; height: number; channels: 1 | 3 }
  | { skip: SkipReason } => {
  const { dict, stream } = candidate;

  if (dict.get(PDFName.of('ImageMask'))) return { skip: 'stencil-mask' };

  const filter = nameOf(dict, 'Filter');
  const width = numberOf(dict, 'Width');
  const height = numberOf(dict, 'Height');
  if (!width || !height) return { skip: 'unsupported-filter' };

  if (filter === '/DCTDecode') {
    return { kind: 'file', bytes: stream.getContents() };
  }

  if (filter === '/FlateDecode') {
    const colorSpace = nameOf(dict, 'ColorSpace');
    const bpc = numberOf(dict, 'BitsPerComponent');
    if (bpc !== 8) return { skip: 'unsupported-colorspace' };
    const channels = colorSpace === '/DeviceRGB' ? 3 : colorSpace === '/DeviceGray' ? 1 : 0;
    if (channels === 0) return { skip: 'unsupported-colorspace' };

    let decoded: Uint8Array;
    try {
      decoded = decodePDFRawStream(stream).decode();
    } catch {
      return { skip: 'decode-failed' };
    }
    if (decoded.length < width * height * channels) return { skip: 'decode-failed' };
    return { kind: 'raw', bytes: decoded, width, height, channels: channels as 1 | 3 };
  }

  // JPX, CCITT, JBIG2 and friends: either already compact or lossy formats
  // a canvas round-trip would make worse.
  return { skip: 'unsupported-filter' };
};

export const compressPdf = async (
  input: Uint8Array,
  options: CompressionOptions,
  encode: ImageEncoder,
  onProgress?: (progress: CompressProgress) => void
): Promise<{ bytes: Uint8Array; report: CompressionReport }> => {
  const doc = await PDFDocument.load(input, { ignoreEncryption: true });
  const candidates = collectImages(doc);

  const report: CompressionReport = {
    originalBytes: input.length,
    compressedBytes: input.length,
    imagesFound: candidates.length,
    imagesRecompressed: 0,
    skipped: {},
  };

  const skip = (reason: SkipReason) => {
    report.skipped[reason] = (report.skipped[reason] ?? 0) + 1;
  };

  for (let index = 0; index < candidates.length; index++) {
    const candidate = candidates[index];
    onProgress?.({ processed: index, total: candidates.length });

    const originalBytes = candidate.stream.getContents();
    if (originalBytes.length < MIN_IMAGE_BYTES) {
      skip('too-small');
      continue;
    }

    const source = prepareSource(candidate);
    if ('skip' in source) {
      skip(source.skip);
      continue;
    }

    let encoded: EncodedImage | null;
    try {
      encoded = await encode(
        source.bytes,
        source.kind === 'raw'
          ? {
              ...options,
              raw: { width: source.width, height: source.height, channels: source.channels },
            }
          : options
      );
    } catch {
      encoded = null;
    }

    if (!encoded) {
      skip('decode-failed');
      continue;
    }

    // Re-encoding is only ever worth it if the result is actually smaller.
    if (encoded.bytes.length >= originalBytes.length) {
      skip('no-gain');
      continue;
    }

    const newDict = candidate.dict.clone(doc.context);
    newDict.set(PDFName.of('Width'), PDFNumber.of(encoded.width));
    newDict.set(PDFName.of('Height'), PDFNumber.of(encoded.height));
    newDict.set(PDFName.of('Length'), PDFNumber.of(encoded.bytes.length));
    newDict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'));
    // The canvas always hands back 8-bit RGB, so the dictionary has to say
    // so — a leftover /DeviceCMYK or /Indexed entry would render as garbage.
    newDict.set(PDFName.of('ColorSpace'), PDFName.of('DeviceRGB'));
    newDict.set(PDFName.of('BitsPerComponent'), PDFNumber.of(8));
    newDict.delete(PDFName.of('DecodeParms'));
    newDict.delete(PDFName.of('Decode'));

    doc.context.assign(candidate.ref, PDFRawStream.of(newDict, encoded.bytes));
    report.imagesRecompressed++;
  }

  onProgress?.({ processed: candidates.length, total: candidates.length });

  const saved = await doc.save({ useObjectStreams: true });
  // A document with nothing worth re-encoding can still come out marginally
  // larger; handing back the original is the honest result.
  if (saved.length >= input.length && report.imagesRecompressed === 0) {
    report.compressedBytes = input.length;
    return { bytes: input, report };
  }

  report.compressedBytes = saved.length;
  return { bytes: saved, report };
};

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};
