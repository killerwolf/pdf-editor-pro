import { useCallback, useState } from 'react';
import { PDFDocument, PDFPage, degrees, rgb } from 'pdf-lib';
import { EditablePage } from '../types';
import { groupPagesBySource } from '../utils/exportGrouping';

export function usePdfExport(
  pages: EditablePage[],
  pdfDocRefs: React.RefObject<Record<string, PDFDocument>>,
  documentTitle: string
) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDownload = useCallback(async () => {
    if (Object.keys(pdfDocRefs.current).length === 0 && pages.every(p => p.isBlank)) {
      alert('There are no pages to save. Please add a PDF.');
      return;
    }
    setIsProcessing(true);
    try {
      const newPdfDoc = await PDFDocument.create();

      const pagesBySource = groupPagesBySource(pages);
      const copiedByPageId = new Map<string, PDFPage>();
      for (const [fileKey, sourcePages] of pagesBySource) {
        const sourcePdfDoc = pdfDocRefs.current[fileKey];
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
          const content = pageInfo.blankContent?.replace(/<br\s*\/?>(\n)?/gi, '\n').replace(/<[^>]+>/g, '') || '';
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

      const pdfBytes = await newPdfDoc.save();
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const safeTitle = (documentTitle || 'document').replace(/[\\/:*?"<>|]+/g, '-');
      link.download = `${safeTitle}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Failed to save PDF:', error);
      alert('An error occurred while saving the PDF.');
    } finally {
      setIsProcessing(false);
    }
  }, [pages, documentTitle, pdfDocRefs]);

  return { handleDownload, isProcessing };
}
