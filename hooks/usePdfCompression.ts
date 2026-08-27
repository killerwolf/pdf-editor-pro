import { useCallback, useEffect, useRef, useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { EditablePage } from '../types';
import { buildMergedPdfBytes, downloadPdfBytes } from '../utils/buildMergedPdf';
import {
  COMPRESSION_PRESETS,
  type CompressionPresetName,
  type CompressionReport,
} from '../utils/compressPdf';
import type { CompressResponse } from '../workers/compressPdf.worker';

export type CompressionStatus = 'idle' | 'working' | 'done' | 'error';

export function usePdfCompression(
  pages: EditablePage[],
  pdfDocRefs: React.RefObject<Record<string, PDFDocument>>,
  documentTitle: string
) {
  const [status, setStatus] = useState<CompressionStatus>('idle');
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const [report, setReport] = useState<CompressionReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const resultRef = useRef<Uint8Array | null>(null);

  const terminate = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  useEffect(() => terminate, [terminate]);

  /** Any edit invalidates a result computed from the previous page list. */
  const reset = useCallback(() => {
    terminate();
    resultRef.current = null;
    setReport(null);
    setError(null);
    setStatus('idle');
    setProgress({ processed: 0, total: 0 });
  }, [terminate]);

  const compress = useCallback(
    async (preset: CompressionPresetName) => {
      terminate();
      resultRef.current = null;
      setReport(null);
      setError(null);
      setProgress({ processed: 0, total: 0 });
      setStatus('working');

      let input: Uint8Array;
      try {
        input = await buildMergedPdfBytes(pages, pdfDocRefs.current);
      } catch (buildError) {
        console.error('Failed to assemble the PDF before compressing:', buildError);
        setError('Could not assemble the document.');
        setStatus('error');
        return;
      }

      const options = COMPRESSION_PRESETS[preset];

      const runOnMainThread = async () => {
        // No worker support: still correct, just less smooth on big files.
        const { compressPdf } = await import('../utils/compressPdf');
        const { canvasImageEncoder } = await import('../utils/imageEncoder');
        try {
          const result = await compressPdf(input, options, canvasImageEncoder, setProgress);
          resultRef.current = result.bytes;
          setReport(result.report);
          setStatus('done');
        } catch (mainError) {
          console.error('Compression failed:', mainError);
          setError('Compression failed on this document.');
          setStatus('error');
        }
      };

      if (typeof Worker === 'undefined') {
        await runOnMainThread();
        return;
      }

      try {
        const worker = new Worker(new URL('../workers/compressPdf.worker.ts', import.meta.url), {
          type: 'module',
        });
        workerRef.current = worker;

        worker.onmessage = (event: MessageEvent<CompressResponse>) => {
          const message = event.data;
          if (message.type === 'progress') {
            setProgress({ processed: message.processed, total: message.total });
          } else if (message.type === 'done') {
            resultRef.current = message.bytes;
            setReport(message.report);
            setStatus('done');
            terminate();
          } else {
            console.error('Compression worker failed:', message.message);
            setError('Compression failed on this document.');
            setStatus('error');
            terminate();
          }
        };

        worker.onerror = () => {
          setError('Compression failed on this document.');
          setStatus('error');
          terminate();
        };

        // The input is transferred, so it must not be touched afterwards.
        worker.postMessage({ bytes: input, options }, [input.buffer as ArrayBuffer]);
      } catch (workerError) {
        console.error('Could not start the compression worker:', workerError);
        await runOnMainThread();
      }
    },
    [pages, pdfDocRefs, terminate]
  );

  const download = useCallback(() => {
    if (!resultRef.current) return;
    downloadPdfBytes(resultRef.current, documentTitle);
  }, [documentTitle]);

  return { status, progress, report, error, compress, download, reset };
}
