import { PDFDocument } from 'pdf-lib';
import { formatRange, type PageRange } from './pageRanges';
import type { ZipEntry } from './zip';

/**
 * Producing new documents out of an assembled PDF: extracting a selection,
 * splitting into several files, or bursting into one file per page.
 *
 * All of it runs against the already-merged bytes, so whatever reordering
 * and rotation the user did in the editor is what gets split.
 */

const sanitize = (name: string): string => (name || 'document').replace(/[\\/:*?"<>|]+/g, '-');

/** Builds one PDF containing `indices` (0-based) in the order given. */
export const extractPages = async (
  sourceBytes: Uint8Array,
  indices: number[]
): Promise<Uint8Array> => {
  const source = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
  const output = await PDFDocument.create();
  const copied = await output.copyPages(source, indices);
  copied.forEach(page => output.addPage(page));
  return output.save();
};

/** One PDF per range, named after the range it covers. */
export const splitByRanges = async (
  sourceBytes: Uint8Array,
  ranges: PageRange[],
  documentTitle: string,
  onProgress?: (done: number, total: number) => void
): Promise<ZipEntry[]> => {
  const base = sanitize(documentTitle);
  const entries: ZipEntry[] = [];

  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i];
    const indices: number[] = [];
    for (let page = range.start; page <= range.end; page++) indices.push(page - 1);
    entries.push({
      name: `${base} ${formatRange(range)}.pdf`,
      bytes: await extractPages(sourceBytes, indices),
    });
    onProgress?.(i + 1, ranges.length);
  }

  return entries;
};

/** One PDF per page, zero-padded so files sort correctly in a file manager. */
export const splitEveryPage = async (
  sourceBytes: Uint8Array,
  documentTitle: string,
  onProgress?: (done: number, total: number) => void
): Promise<ZipEntry[]> => {
  const source = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
  const pageCount = source.getPageCount();
  const base = sanitize(documentTitle);
  const width = String(pageCount).length;
  const entries: ZipEntry[] = [];

  for (let index = 0; index < pageCount; index++) {
    const output = await PDFDocument.create();
    const [page] = await output.copyPages(source, [index]);
    output.addPage(page);
    entries.push({
      name: `${base} ${String(index + 1).padStart(width, '0')}.pdf`,
      bytes: await output.save(),
    });
    onProgress?.(index + 1, pageCount);
  }

  return entries;
};
