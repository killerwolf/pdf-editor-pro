import { useCallback, useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { EditablePage } from '../types';
import { buildMergedPdfBytes, downloadPdfBytes } from '../utils/buildMergedPdf';

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
      const pdfBytes = await buildMergedPdfBytes(pages, pdfDocRefs.current);
      downloadPdfBytes(pdfBytes, documentTitle);
    } catch (error) {
      console.error('Failed to save PDF:', error);
      alert('An error occurred while saving the PDF.');
    } finally {
      setIsProcessing(false);
    }
  }, [pages, documentTitle, pdfDocRefs]);

  return { handleDownload, isProcessing };
}
