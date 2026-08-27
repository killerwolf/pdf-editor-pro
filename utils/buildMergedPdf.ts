import { PDFDocument, PDFPage, degrees, rgb } from 'pdf-lib';
import { EditablePage } from '../types';
import { groupPagesBySource } from './exportGrouping';

/**
 * Assembles the edited page list into a single PDF and returns its bytes.
 *
 * Extracted from the download flow so compression can run over the same
 * assembled document rather than re-implementing the merge.
 */
export const buildMergedPdfBytes = async (
  pages: EditablePage[],
  sourceDocs: Record<string, PDFDocument>
): Promise<Uint8Array> => {
  const newPdfDoc = await PDFDocument.create();

  const pagesBySource = groupPagesBySource(pages);
  const copiedByPageId = new Map<string, PDFPage>();
  for (const [fileKey, sourcePages] of pagesBySource) {
    const sourcePdfDoc = sourceDocs[fileKey];
    if (!sourcePdfDoc) continue;
    const copied = await newPdfDoc.copyPages(
      sourcePdfDoc,
      sourcePages.map(p => p.originalIndex)
    );
    copied.forEach((page, i) => copiedByPageId.set(sourcePages[i].id, page));
  }

  for (const pageInfo of pages) {
    if (pageInfo.isBlank) {
      const blankPage = newPdfDoc.addPage();
      const { width, height } = blankPage.getSize();
      const content =
        pageInfo.blankContent?.replace(/<br\s*\/?>(\n)?/gi, '\n').replace(/<[^>]+>/g, '') || '';
      if (content.trim().length > 0) {
        blankPage.drawText(content, {
          x: 50,
          y: height - 80,
          size: 14,
          color: rgb(0, 0, 0),
          lineHeight: 18,
          maxWidth: width - 100,
        });
      }
    } else {
      const copiedPage = copiedByPageId.get(pageInfo.id);
      if (copiedPage) {
        const newPage = newPdfDoc.addPage(copiedPage);
        newPage.setRotation(degrees(pageInfo.rotation));
      }
    }
  }

  return newPdfDoc.save();
};

/** Triggers a browser download for the given PDF bytes. */
export const downloadPdfBytes = (bytes: Uint8Array, documentTitle: string) => {
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  const safeTitle = (documentTitle || 'document').replace(/[\\/:*?"<>|]+/g, '-');
  link.download = `${safeTitle}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};
