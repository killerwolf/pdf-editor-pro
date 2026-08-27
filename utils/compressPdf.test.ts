import { PDFDict, PDFDocument, PDFName, PDFNumber, PDFRawStream } from 'pdf-lib';
import { describe, expect, it, vi } from 'vitest';
import { compressPdf, type ImageEncoder } from './compressPdf';

/**
 * Builds a PDF carrying one image XObject with the given dictionary entries
 * and payload. The payload is never decoded here — the encoder is injected —
 * so fake bytes are enough to exercise the stream surgery.
 */
const pdfWithImage = async (
  payload: Uint8Array,
  entries: Record<string, unknown> = {}
): Promise<Uint8Array> => {
  const doc = await PDFDocument.create();
  doc.addPage();

  const dict = PDFDict.withContext(doc.context);
  dict.set(PDFName.of('Type'), PDFName.of('XObject'));
  dict.set(PDFName.of('Subtype'), PDFName.of('Image'));
  dict.set(PDFName.of('Width'), PDFNumber.of(1600));
  dict.set(PDFName.of('Height'), PDFNumber.of(1200));
  dict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'));
  dict.set(PDFName.of('ColorSpace'), PDFName.of('DeviceRGB'));
  dict.set(PDFName.of('BitsPerComponent'), PDFNumber.of(8));
  dict.set(PDFName.of('Length'), PDFNumber.of(payload.length));
  for (const [key, value] of Object.entries(entries)) {
    dict.set(PDFName.of(key), value as never);
  }

  doc.context.register(PDFRawStream.of(dict, payload));
  return doc.save();
};

const findImageDict = async (bytes: Uint8Array): Promise<PDFDict | null> => {
  const doc = await PDFDocument.load(bytes);
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (obj instanceof PDFRawStream && obj.dict.get(PDFName.of('Subtype'))?.toString() === '/Image') {
      return obj.dict;
    }
  }
  return null;
};

const encoderReturning = (size: number, width = 800, height = 600): ImageEncoder =>
  vi.fn(async () => ({ bytes: new Uint8Array(size).fill(7), width, height }));

const bigPayload = (size = 200 * 1024) => new Uint8Array(size).fill(1);

describe('compressPdf', () => {
  it('re-encodes a large image and reports the saving', async () => {
    const input = await pdfWithImage(bigPayload());
    const encode = encoderReturning(20 * 1024);

    const { bytes, report } = await compressPdf(
      input,
      { quality: 0.65, maxDimension: 1800 },
      encode
    );

    expect(encode).toHaveBeenCalledTimes(1);
    expect(report.imagesFound).toBe(1);
    expect(report.imagesRecompressed).toBe(1);
    expect(report.compressedBytes).toBeLessThan(report.originalBytes);
    expect(bytes.length).toBeLessThan(input.length);
  });

  it('rewrites the image dictionary to match the JPEG the canvas produced', async () => {
    // A CMYK source would render as garbage if the dictionary kept saying
    // DeviceCMYK after the canvas handed back 8-bit RGB.
    const input = await pdfWithImage(bigPayload(), {
      ColorSpace: PDFName.of('DeviceCMYK'),
      Decode: PDFName.of('SomeDecodeArray'),
    });

    const { bytes } = await compressPdf(
      input,
      { quality: 0.65, maxDimension: 1800 },
      encoderReturning(20 * 1024, 900, 675)
    );

    const dict = await findImageDict(bytes);
    expect(dict).not.toBeNull();
    expect(dict!.get(PDFName.of('ColorSpace'))?.toString()).toBe('/DeviceRGB');
    expect(dict!.get(PDFName.of('Filter'))?.toString()).toBe('/DCTDecode');
    expect(dict!.get(PDFName.of('Width'))?.toString()).toBe('900');
    expect(dict!.get(PDFName.of('Height'))?.toString()).toBe('675');
    expect(dict!.get(PDFName.of('Decode'))).toBeUndefined();
  });

  it('leaves small images alone', async () => {
    const input = await pdfWithImage(new Uint8Array(4 * 1024).fill(1));
    const encode = encoderReturning(512);

    const { report } = await compressPdf(input, { quality: 0.65, maxDimension: 1800 }, encode);

    expect(encode).not.toHaveBeenCalled();
    expect(report.imagesRecompressed).toBe(0);
    expect(report.skipped['too-small']).toBe(1);
  });

  it('keeps the original image when re-encoding would not save anything', async () => {
    const payload = bigPayload();
    const input = await pdfWithImage(payload);

    const { bytes, report } = await compressPdf(
      input,
      { quality: 0.65, maxDimension: 1800 },
      encoderReturning(payload.length + 1)
    );

    expect(report.imagesRecompressed).toBe(0);
    expect(report.skipped['no-gain']).toBe(1);

    const dict = await findImageDict(bytes);
    expect(dict!.get(PDFName.of('Width'))?.toString()).toBe('1600');
  });

  it('skips stencil masks and formats a canvas round-trip would worsen', async () => {
    const stencil = await pdfWithImage(bigPayload(), { ImageMask: PDFName.of('true') });
    const jbig2 = await pdfWithImage(bigPayload(), { Filter: PDFName.of('JBIG2Decode') });
    const encode = encoderReturning(1024);

    const stencilReport = (
      await compressPdf(stencil, { quality: 0.65, maxDimension: 1800 }, encode)
    ).report;
    const jbig2Report = (await compressPdf(jbig2, { quality: 0.65, maxDimension: 1800 }, encode))
      .report;

    expect(encode).not.toHaveBeenCalled();
    expect(stencilReport.skipped['stencil-mask']).toBe(1);
    expect(jbig2Report.skipped['unsupported-filter']).toBe(1);
  });

  it('returns the untouched document when there is nothing to compress', async () => {
    const doc = await PDFDocument.create();
    doc.addPage();
    const input = await doc.save();

    const { bytes, report } = await compressPdf(
      input,
      { quality: 0.65, maxDimension: 1800 },
      encoderReturning(10)
    );

    expect(report.imagesFound).toBe(0);
    expect(report.imagesRecompressed).toBe(0);
    expect(report.compressedBytes).toBe(report.originalBytes);
    expect(bytes).toBe(input);
  });

  it('reports progress across every image it examines', async () => {
    const input = await pdfWithImage(bigPayload());
    const onProgress = vi.fn();

    await compressPdf(
      input,
      { quality: 0.65, maxDimension: 1800 },
      encoderReturning(1024),
      onProgress
    );

    expect(onProgress).toHaveBeenCalledWith({ processed: 0, total: 1 });
    expect(onProgress).toHaveBeenLastCalledWith({ processed: 1, total: 1 });
  });
});
