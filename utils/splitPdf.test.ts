import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { extractPages, splitByRanges, splitEveryPage } from './splitPdf';

const documentOfPages = async (count: number): Promise<Uint8Array> => {
  const doc = await PDFDocument.create();
  for (let i = 0; i < count; i++) doc.addPage([200, 200]);
  return doc.save();
};

const pageCountOf = async (bytes: Uint8Array): Promise<number> =>
  (await PDFDocument.load(bytes)).getPageCount();

describe('extractPages', () => {
  it('keeps only the requested pages', async () => {
    const source = await documentOfPages(8);
    expect(await pageCountOf(await extractPages(source, [0, 1, 5]))).toBe(3);
  });

  it('honours the order it is given', async () => {
    const source = await documentOfPages(3);
    // Distinct sizes make the resulting order observable.
    const doc = await PDFDocument.create();
    doc.addPage([100, 100]);
    doc.addPage([200, 200]);
    doc.addPage([300, 300]);
    const reordered = await extractPages(await doc.save(), [2, 0]);
    const out = await PDFDocument.load(reordered);
    expect(out.getPage(0).getWidth()).toBe(300);
    expect(out.getPage(1).getWidth()).toBe(100);
    expect(source.length).toBeGreaterThan(0);
  });
});

describe('splitByRanges', () => {
  it('produces one file per range, named after it', async () => {
    const source = await documentOfPages(10);
    const entries = await splitByRanges(
      source,
      [
        { start: 1, end: 3 },
        { start: 8, end: 8 },
      ],
      'Report'
    );

    expect(entries.map(e => e.name)).toEqual(['Report 1-3.pdf', 'Report 8.pdf']);
    expect(await pageCountOf(entries[0].bytes)).toBe(3);
    expect(await pageCountOf(entries[1].bytes)).toBe(1);
  });

  it('strips characters that are illegal in file names', async () => {
    const entries = await splitByRanges(await documentOfPages(2), [{ start: 1, end: 1 }], 'a/b:c');
    expect(entries[0].name).toBe('a-b-c 1.pdf');
  });

  it('reports progress per range', async () => {
    const seen: string[] = [];
    await splitByRanges(
      await documentOfPages(4),
      [
        { start: 1, end: 1 },
        { start: 2, end: 2 },
      ],
      'doc',
      (done, total) => seen.push(`${done}/${total}`)
    );
    expect(seen).toEqual(['1/2', '2/2']);
  });
});

describe('splitEveryPage', () => {
  it('emits one single-page file per page', async () => {
    const entries = await splitEveryPage(await documentOfPages(3), 'doc');
    expect(entries).toHaveLength(3);
    for (const entry of entries) {
      expect(await pageCountOf(entry.bytes)).toBe(1);
    }
  });

  it('zero-pads names so files sort correctly past ten pages', async () => {
    const entries = await splitEveryPage(await documentOfPages(12), 'doc');
    expect(entries[0].name).toBe('doc 01.pdf');
    expect(entries[11].name).toBe('doc 12.pdf');
  });
});
