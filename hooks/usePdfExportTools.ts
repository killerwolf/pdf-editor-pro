import { useCallback, useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { EditablePage } from '../types';
import { buildMergedPdfBytes, downloadPdfBytes } from '../utils/buildMergedPdf';
import { parsePageRanges } from '../utils/pageRanges';
import { extractPages, splitByRanges, splitEveryPage } from '../utils/splitPdf';
import { renderPagesToImages, type ImageFormat } from '../utils/pdfToImages';
import { createZip, downloadZip } from '../utils/zip';

export type ExportMode = 'extract' | 'ranges' | 'pages' | 'images';

export interface ExportSettings {
  mode: ExportMode;
  /** Range expression, used by the extract and ranges modes. */
  rangeInput: string;
  imageFormat: ImageFormat;
  imageScale: number;
}

export type ExportToolStatus = 'idle' | 'working' | 'done' | 'error';

export interface ExportOutcome {
  /** What the user ended up with, for the confirmation line. */
  fileCount: number;
  totalBytes: number;
  asZip: boolean;
}

const sanitize = (name: string): string => (name || 'document').replace(/[\\/:*?"<>|]+/g, '-');

export function usePdfExportTools(
  pages: EditablePage[],
  pdfDocRefs: React.RefObject<Record<string, PDFDocument>>,
  documentTitle: string
) {
  const [status, setStatus] = useState<ExportToolStatus>('idle');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [outcome, setOutcome] = useState<ExportOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStatus('idle');
    setProgress({ done: 0, total: 0 });
    setOutcome(null);
    setError(null);
  }, []);

  const run = useCallback(
    async (settings: ExportSettings) => {
      setStatus('working');
      setError(null);
      setOutcome(null);
      setProgress({ done: 0, total: 0 });

      try {
        const source = await buildMergedPdfBytes(pages, pdfDocRefs.current);
        const base = sanitize(documentTitle);
        const trackProgress = (done: number, total: number) => setProgress({ done, total });

        if (settings.mode === 'extract') {
          const parsed = parsePageRanges(settings.rangeInput, pages.length);
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.indices.length === 0) throw new Error('Choose at least one page.');

          const bytes = await extractPages(source, parsed.indices);
          downloadPdfBytes(bytes, `${base} (extract)`);
          setOutcome({ fileCount: 1, totalBytes: bytes.length, asZip: false });
          setStatus('done');
          return;
        }

        const entries =
          settings.mode === 'ranges'
            ? await (async () => {
                const parsed = parsePageRanges(settings.rangeInput, pages.length);
                if (parsed.error) throw new Error(parsed.error);
                if (parsed.ranges.length === 0) throw new Error('Enter at least one range.');
                return splitByRanges(source, parsed.ranges, documentTitle, trackProgress);
              })()
            : settings.mode === 'pages'
              ? await splitEveryPage(source, documentTitle, trackProgress)
              : await renderPagesToImages(
                  source,
                  documentTitle,
                  { format: settings.imageFormat, scale: settings.imageScale },
                  trackProgress
                );

        if (entries.length === 0) throw new Error('Nothing to export.');

        const zip = createZip(entries);
        downloadZip(zip, `${base}${settings.mode === 'images' ? ' (images)' : ' (split)'}`);
        setOutcome({ fileCount: entries.length, totalBytes: zip.length, asZip: true });
        setStatus('done');
      } catch (thrown) {
        console.error('Export failed:', thrown);
        setError(thrown instanceof Error ? thrown.message : 'Export failed.');
        setStatus('error');
      }
    },
    [pages, pdfDocRefs, documentTitle]
  );

  return { status, progress, outcome, error, run, reset };
}
