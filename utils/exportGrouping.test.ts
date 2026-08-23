import { describe, expect, it } from 'vitest';
import { EditablePage } from '../types';
import { groupPagesBySource } from './exportGrouping';

const page = (overrides: Partial<EditablePage>): EditablePage => ({
  id: 'id',
  originalIndex: 0,
  rotation: 0,
  thumbnailUrl: '',
  pageNumber: 1,
  ...overrides,
});

describe('groupPagesBySource', () => {
  it('groups pages by sourceFileKey, preserving order within each group', () => {
    const pages: EditablePage[] = [
      page({ id: 'a1', sourceFileKey: 'a.pdf', originalIndex: 0 }),
      page({ id: 'b1', sourceFileKey: 'b.pdf', originalIndex: 0 }),
      page({ id: 'a2', sourceFileKey: 'a.pdf', originalIndex: 1 }),
    ];

    const grouped = groupPagesBySource(pages);

    expect([...grouped.keys()]).toEqual(['a.pdf', 'b.pdf']);
    expect(grouped.get('a.pdf')?.map(p => p.id)).toEqual(['a1', 'a2']);
    expect(grouped.get('b.pdf')?.map(p => p.id)).toEqual(['b1']);
  });

  it('skips blank pages even if they carry a sourceFileKey', () => {
    const pages: EditablePage[] = [
      page({ id: 'blank', sourceFileKey: 'a.pdf', isBlank: true }),
      page({ id: 'real', sourceFileKey: 'a.pdf' }),
    ];

    const grouped = groupPagesBySource(pages);

    expect(grouped.get('a.pdf')?.map(p => p.id)).toEqual(['real']);
  });

  it('skips pages with no sourceFileKey', () => {
    const pages: EditablePage[] = [page({ id: 'orphan' })];

    const grouped = groupPagesBySource(pages);

    expect(grouped.size).toBe(0);
  });

  it('returns an empty map for no pages', () => {
    expect(groupPagesBySource([]).size).toBe(0);
  });

  it('handles duplicated pages from the same source (same originalIndex, different ids)', () => {
    const pages: EditablePage[] = [
      page({ id: 'dup1', sourceFileKey: 'a.pdf', originalIndex: 2 }),
      page({ id: 'dup2', sourceFileKey: 'a.pdf', originalIndex: 2 }),
    ];

    const grouped = groupPagesBySource(pages);

    expect(grouped.get('a.pdf')?.map(p => p.id)).toEqual(['dup1', 'dup2']);
  });
});
