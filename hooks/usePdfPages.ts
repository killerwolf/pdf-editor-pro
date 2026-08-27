import { useCallback, useEffect, useRef, useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { EditablePage } from '../types';
import { imageFileToPdfBytes, isSupportedImage } from '../utils/imagesToPdf';

pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker;

interface EditablePageWithHighRes extends EditablePage {
  highResUrl?: string;
  sourceFileKey?: string;
}

/**
 * Loads the given files into pdf-lib documents and pdf.js-rendered pages,
 * keeping already-loaded files cached across re-renders (keyed by
 * name-lastModified-size) so removing one file doesn't reload the rest.
 */
export function usePdfPages(
  files: File[],
  selectedPageId: string | null,
  setSelectedPageId: (id: string | null) => void,
  documentTitle: string,
  setDocumentTitle: (title: string) => void
) {
  const [pages, setPages] = useState<EditablePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading PDF...');
  const pdfDocRefs = useRef<Record<string, PDFDocument>>({});
  const processedFileKeysRef = useRef<Set<string>>(new Set());

  const updatePageNumbers = useCallback((pagesList: EditablePage[]) => {
    return pagesList.map((page, index) => ({
      ...page,
      pageNumber: index + 1,
    }));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadFiles = async () => {
      if (files.length === 0) {
        processedFileKeysRef.current.clear();
        pdfDocRefs.current = {};
        setPages([]);
        setSelectedPageId(null);
        setLoading(false);
        return;
      }

      // Remove pages whose source file is no longer present
      const currentKeys = new Set(files.map(file => `${file.name}-${file.lastModified}-${file.size}`));
      setPages(prev => {
        const filtered = prev.filter(page => !page.sourceFileKey || currentKeys.has(page.sourceFileKey));
        return filtered.length === prev.length ? prev : updatePageNumbers(filtered);
      });
      processedFileKeysRef.current.forEach(key => {
        if (!currentKeys.has(key)) {
          processedFileKeysRef.current.delete(key);
          delete pdfDocRefs.current[key];
        }
      });

      const newFiles = files.filter(file => {
        const key = `${file.name}-${file.lastModified}-${file.size}`;
        return !processedFileKeysRef.current.has(key);
      });

      if (newFiles.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        for (const file of newFiles) {
          const fileKey = `${file.name}-${file.lastModified}-${file.size}`;
          setLoadingMessage(`Loading ${file.name}...`);

          // Images are wrapped into a one-page PDF up front, so everything
          // downstream — thumbnails, reordering, export — treats them as
          // ordinary pages.
          let sourceBytes: Uint8Array;
          if (isSupportedImage(file)) {
            const converted = await imageFileToPdfBytes(file);
            if (!converted) {
              console.warn(`Could not read ${file.name} as an image; skipping it.`);
              processedFileKeysRef.current.add(fileKey);
              continue;
            }
            sourceBytes = converted;
          } else {
            sourceBytes = new Uint8Array(await file.arrayBuffer());
          }

          const pdfDoc = await PDFDocument.load(sourceBytes);
          pdfDocRefs.current[fileKey] = pdfDoc;

          // pdf.js takes ownership of the buffer it is given.
          const pdfJSDoc = await pdfjsLib.getDocument({ data: sourceBytes.slice() }).promise;
          setLoadingMessage(`Generating ${pdfJSDoc.numPages} thumbnails for ${file.name}...`);

          const generatedPages: EditablePageWithHighRes[] = [];

          for (let pageIndex = 0; pageIndex < pdfJSDoc.numPages; pageIndex++) {
            const page = await pdfJSDoc.getPage(pageIndex + 1);

            const thumbnailViewport = page.getViewport({ scale: 0.3 });
            const thumbnailCanvas = document.createElement('canvas');
            const thumbnailContext = thumbnailCanvas.getContext('2d');
            thumbnailCanvas.height = thumbnailViewport.height;
            thumbnailCanvas.width = thumbnailViewport.width;
            if (thumbnailContext) {
              await page.render({ canvas: thumbnailCanvas, canvasContext: thumbnailContext, viewport: thumbnailViewport }).promise;
            }

            const highResViewport = page.getViewport({ scale: 2.0 });
            const highResCanvas = document.createElement('canvas');
            const highResContext = highResCanvas.getContext('2d');
            highResCanvas.height = highResViewport.height;
            highResCanvas.width = highResViewport.width;
            if (highResContext) {
              await page.render({ canvas: highResCanvas, canvasContext: highResContext, viewport: highResViewport }).promise;
            }

            generatedPages.push({
              id: `page-${fileKey}-${pageIndex}-${Date.now()}`,
              originalIndex: pageIndex,
              sourceFileKey: fileKey,
              rotation: 0,
              thumbnailUrl: thumbnailCanvas.toDataURL('image/jpeg', 0.8),
              highResUrl: highResCanvas.toDataURL('image/jpeg', 0.9),
              isBlank: false,
              pageNumber: 0, // Will be updated by updatePageNumbers
            });
          }

          if (cancelled) return;

          setPages(prev => updatePageNumbers([...prev, ...generatedPages]));
          if (!selectedPageId && generatedPages.length > 0) {
            setSelectedPageId(generatedPages[0].id);
          }

          processedFileKeysRef.current.add(fileKey);
        }
      } catch (error) {
        console.error('Failed to load PDF:', error);
        alert('Failed to load PDF. Please select a valid PDF file.');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }

      if (!documentTitle || documentTitle === 'Untitled document') {
        const firstFile = files[0];
        if (firstFile) {
          const baseName = firstFile.name.replace(/\.[^.]+$/, '');
          setDocumentTitle(baseName);
        }
      }
    };

    loadFiles();

    return () => {
      cancelled = true;
    };
    // documentTitle/setDocumentTitle intentionally omitted: this effect only
    // reads documentTitle to decide whether to default it, and re-running on
    // every title change would refetch already-loaded files.
  }, [files, selectedPageId, updatePageNumbers]);

  return { pages, setPages, loading, loadingMessage, pdfDocRefs, updatePageNumbers };
}
