/**
 * Parsing for the page-range syntax people already expect from print
 * dialogs: "1-3, 7, 10-12".
 */

export interface PageRange {
  /** 1-based, inclusive. */
  start: number;
  /** 1-based, inclusive. */
  end: number;
}

export interface ParsedRanges {
  ranges: PageRange[];
  /** All covered pages as 0-based indices, de-duplicated and ordered. */
  indices: number[];
  error: string | null;
}

const EMPTY: ParsedRanges = { ranges: [], indices: [], error: null };

/**
 * Parses a range expression against a document of `pageCount` pages.
 *
 * Returns a human-readable `error` rather than throwing, because this runs
 * on every keystroke in the export panel and the message is shown inline.
 */
export const parsePageRanges = (input: string, pageCount: number): ParsedRanges => {
  const trimmed = input.trim();
  if (!trimmed) return EMPTY;

  const ranges: PageRange[] = [];
  const seen = new Set<number>();

  for (const rawPart of trimmed.split(',')) {
    const part = rawPart.trim();
    if (!part) continue;

    const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(part);
    if (!match) {
      return { ...EMPTY, error: `"${part}" is not a page or a range like 2-5.` };
    }

    const start = Number(match[1]);
    const end = match[2] === undefined ? start : Number(match[2]);

    if (start < 1 || end < 1) {
      return { ...EMPTY, error: 'Pages start at 1.' };
    }
    if (start > end) {
      return { ...EMPTY, error: `"${part}" runs backwards — try ${end}-${start}.` };
    }
    if (end > pageCount) {
      return {
        ...EMPTY,
        error: `This document has ${pageCount} page${pageCount === 1 ? '' : 's'}, so ${end} is out of range.`,
      };
    }

    ranges.push({ start, end });
    for (let page = start; page <= end; page++) seen.add(page - 1);
  }

  if (ranges.length === 0) return EMPTY;

  return {
    ranges,
    indices: [...seen].sort((a, b) => a - b),
    error: null,
  };
};

/** Renders a range the way it would be typed, for use in file names. */
export const formatRange = ({ start, end }: PageRange): string =>
  start === end ? `${start}` : `${start}-${end}`;
