import { describe, expect, it } from 'vitest';
import { formatRange, parsePageRanges } from './pageRanges';

describe('parsePageRanges', () => {
  it('reads single pages, ranges and combinations', () => {
    expect(parsePageRanges('2', 10).indices).toEqual([1]);
    expect(parsePageRanges('1-3', 10).indices).toEqual([0, 1, 2]);
    expect(parsePageRanges('1-3, 7', 10).indices).toEqual([0, 1, 2, 6]);
  });

  it('tolerates loose spacing', () => {
    expect(parsePageRanges('  1 - 3 ,7 , ', 10).indices).toEqual([0, 1, 2, 6]);
  });

  it('de-duplicates and orders overlapping ranges', () => {
    expect(parsePageRanges('5, 1-3, 2-4', 10).indices).toEqual([0, 1, 2, 3, 4]);
  });

  it('keeps the ranges as written, so split file names match the input', () => {
    const { ranges } = parsePageRanges('4-6, 1', 10);
    expect(ranges).toEqual([
      { start: 4, end: 6 },
      { start: 1, end: 1 },
    ]);
  });

  it('treats an empty expression as no selection rather than an error', () => {
    const parsed = parsePageRanges('   ', 10);
    expect(parsed.indices).toEqual([]);
    expect(parsed.error).toBeNull();
  });

  it('explains what is wrong instead of throwing', () => {
    expect(parsePageRanges('abc', 10).error).toContain('not a page or a range');
    expect(parsePageRanges('0', 10).error).toContain('start at 1');
    expect(parsePageRanges('7-3', 10).error).toContain('runs backwards');
    expect(parsePageRanges('9-12', 10).error).toContain('10 pages');
  });

  it('reports no indices whenever it reports an error', () => {
    expect(parsePageRanges('1-3, oops', 10).indices).toEqual([]);
  });
});

describe('formatRange', () => {
  it('collapses a single-page range', () => {
    expect(formatRange({ start: 4, end: 4 })).toBe('4');
    expect(formatRange({ start: 4, end: 9 })).toBe('4-9');
  });
});
