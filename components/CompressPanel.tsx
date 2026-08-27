import React, { useEffect, useRef, useState } from 'react';
import {
  COMPRESSION_PRESETS,
  formatBytes,
  type CompressionPresetName,
  type CompressionReport,
} from '../utils/compressPdf';
import type { CompressionStatus } from '../hooks/usePdfCompression';
import { CloseIcon, DownloadIcon } from './icons';

interface CompressPanelProps {
  status: CompressionStatus;
  progress: { processed: number; total: number };
  report: CompressionReport | null;
  error: string | null;
  onCompress: (preset: CompressionPresetName) => void;
  onDownload: () => void;
  onClose: () => void;
}

const PRESET_COPY: Record<CompressionPresetName, { label: string; detail: string }> = {
  light: { label: 'Light', detail: 'Barely visible change. Good for printing.' },
  balanced: { label: 'Balanced', detail: 'Best size for the quality. Start here.' },
  strong: { label: 'Strong', detail: 'Smallest file. Images get noticeably softer.' },
};

const Savings: React.FC<{ report: CompressionReport }> = ({ report }) => {
  const saved = report.originalBytes - report.compressedBytes;
  const percent = report.originalBytes > 0 ? (saved / report.originalBytes) * 100 : 0;

  if (report.imagesRecompressed === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface-2 p-4 text-sm text-ink-soft">
        <p className="mb-1 font-medium text-ink">Nothing worth compressing here.</p>
        <p>
          {report.imagesFound === 0
            ? 'This document has no embedded images — its size is in text and fonts, which we leave alone because shrinking them would degrade the document.'
            : 'The images in this document are already well compressed. Re-encoding them would cost quality without saving space.'}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-surface-2 p-4">
      <div className="flex items-baseline justify-between gap-4">
        <div className="tabular text-sm text-ink-soft">
          <span className="line-through">{formatBytes(report.originalBytes)}</span>
          <span aria-hidden="true"> → </span>
          <span className="text-base font-semibold text-ink">
            {formatBytes(report.compressedBytes)}
          </span>
        </div>
        <div className="tabular text-lg font-semibold text-accent">−{percent.toFixed(0)}%</div>
      </div>
      <p className="mt-2 text-xs text-ink-soft">
        {report.imagesRecompressed} of {report.imagesFound} image
        {report.imagesFound === 1 ? '' : 's'} re-encoded. Text and layout are untouched.
      </p>
    </div>
  );
};

export const CompressPanel: React.FC<CompressPanelProps> = ({
  status,
  progress,
  report,
  error,
  onCompress,
  onDownload,
  onClose,
}) => {
  const [preset, setPreset] = useState<CompressionPresetName>('balanced');
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const busy = status === 'working';

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-overlay p-4"
      onMouseDown={event => {
        if (!dialogRef.current?.contains(event.target as Node)) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="compress-title"
        className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-xl"
      >
        <div className="mb-1 flex items-start justify-between gap-4">
          <h2 id="compress-title" className="text-lg font-semibold text-ink">
            Compress PDF
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-m-1 rounded-lg p-1 text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-5 text-sm text-ink-soft">
          Runs entirely on your device. Images are re-encoded; text stays selectable.
        </p>

        <fieldset disabled={busy} className="mb-5 space-y-2">
          <legend className="sr-only">Compression level</legend>
          {(Object.keys(COMPRESSION_PRESETS) as CompressionPresetName[]).map(name => (
            <label
              key={name}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                preset === name
                  ? 'border-accent bg-accent-soft'
                  : 'border-line hover:border-line-strong'
              } ${busy ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              <input
                type="radio"
                name="compression-preset"
                value={name}
                checked={preset === name}
                onChange={() => setPreset(name)}
                className="mt-1 accent-accent"
              />
              <span>
                <span className="block text-sm font-medium text-ink">{PRESET_COPY[name].label}</span>
                <span className="block text-xs text-ink-soft">{PRESET_COPY[name].detail}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {busy && (
          <div className="mb-5">
            <div className="mb-2 flex justify-between text-xs text-ink-soft">
              <span>Compressing…</span>
              <span className="tabular">
                {progress.total > 0 ? `${progress.processed} / ${progress.total} images` : 'Reading'}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full bg-accent transition-[width] duration-200"
                style={{
                  width: progress.total > 0 ? `${(progress.processed / progress.total) * 100}%` : '10%',
                }}
              />
            </div>
          </div>
        )}

        {status === 'error' && error && (
          <p className="mb-5 rounded-lg border border-danger bg-danger-soft p-3 text-sm text-danger">
            {error}
          </p>
        )}

        {status === 'done' && report && (
          <div className="mb-5">
            <Savings report={report} />
          </div>
        )}

        <div className="flex justify-end gap-2">
          {status === 'done' && report && report.imagesRecompressed > 0 ? (
            <>
              <button
                type="button"
                onClick={() => onCompress(preset)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
              >
                Try another level
              </button>
              <button
                type="button"
                onClick={onDownload}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-on transition-colors hover:bg-accent-hover"
              >
                <DownloadIcon className="h-4 w-4" />
                Download
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onCompress(preset)}
              disabled={busy}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-on transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-ink-faint"
            >
              {busy ? 'Compressing…' : status === 'done' ? 'Try another level' : 'Compress'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
