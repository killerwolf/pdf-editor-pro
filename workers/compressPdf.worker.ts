/// <reference lib="webworker" />
import { compressPdf, type CompressionOptions, type CompressionReport } from '../utils/compressPdf';
import { canvasImageEncoder } from '../utils/imageEncoder';

export type CompressRequest = {
  bytes: Uint8Array;
  options: CompressionOptions;
};

export type CompressResponse =
  | { type: 'progress'; processed: number; total: number }
  | { type: 'done'; bytes: Uint8Array; report: CompressionReport }
  | { type: 'error'; message: string };

const post = (message: CompressResponse, transfer?: Transferable[]) => {
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(message, transfer ?? []);
};

self.onmessage = async (event: MessageEvent<CompressRequest>) => {
  const { bytes, options } = event.data;
  try {
    const { bytes: out, report } = await compressPdf(
      bytes,
      options,
      canvasImageEncoder,
      ({ processed, total }) => post({ type: 'progress', processed, total })
    );
    // Transfer rather than copy: the output can be tens of megabytes.
    post({ type: 'done', bytes: out, report }, [out.buffer as ArrayBuffer]);
  } catch (error) {
    post({ type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};
