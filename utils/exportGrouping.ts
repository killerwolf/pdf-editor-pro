import { EditablePage } from '../types';

/**
 * Groups non-blank pages by their source file, preserving each source's
 * page order. Used to batch pdf-lib's copyPages per source document:
 * pdf-lib only dedupes shared resources (fonts, images) within a single
 * copyPages call, so copying one page at a time re-embeds them N times
 * and bloats the exported file.
 */
export function groupPagesBySource(pages: EditablePage[]): Map<string, EditablePage[]> {
  const pagesBySource = new Map<string, EditablePage[]>();
  for (const pageInfo of pages) {
    if (pageInfo.isBlank || !pageInfo.sourceFileKey) continue;
    const bucket = pagesBySource.get(pageInfo.sourceFileKey) ?? [];
    bucket.push(pageInfo);
    pagesBySource.set(pageInfo.sourceFileKey, bucket);
  }
  return pagesBySource;
}
