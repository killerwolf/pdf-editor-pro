import React, { useEffect, useMemo, useRef, useState } from 'react';
import { formatBytes } from '../utils/compressPdf';
import { parsePageRanges } from '../utils/pageRanges';
import { IMAGE_EXPORT_PRESETS, type ImageFormat } from '../utils/pdfToImages';
import type { ExportMode, ExportOutcome, ExportToolStatus, ExportSettings } from '../hooks/usePdfExportTools';
import { CloseIcon } from './icons';

interface ExportPanelProps {
  pageCount: number;
  status: ExportToolStatus;
  progress: { done: number; total: number };
  outcome: ExportOutcome | null;
  error: string | null;
  onRun: (settings: ExportSettings) => void;
  onClose: () => void;
}

const MODES: { value: ExportMode; label: string; detail: string }[] = [
  { value: 'extract', label: 'Extract pages', detail: 'One PDF containing just the pages you pick.' },
  { value: 'ranges', label: 'Split into ranges', detail: 'A separate PDF per range, zipped together.' },
  { value: 'pages', label: 'One PDF per page', detail: 'Every page becomes its own file, zipped.' },
  { value: 'images', label: 'Pages as images', detail: 'Render each page to PNG or JPG, zipped.' },
];

export const ExportPanel: React.FC<ExportPanelProps> = ({
  pageCount,
  status,
  progress,
  outcome,
  error,
  onRun,
  onClose,
}) => {
  const [mode, setMode] = useState<ExportMode>('extract');
  const [rangeInput, setRangeInput] = useState('');
  const [imageFormat, setImageFormat] = useState<ImageFormat>('png');
  const [imageScale, setImageScale] = useState<number>(IMAGE_EXPORT_PRESETS.screen.scale);

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

  const needsRange = mode === 'extract' || mode === 'ranges';
  const parsed = useMemo(
    () => parsePageRanges(rangeInput, pageCount),
    [rangeInput, pageCount]
  );

  const busy = status === 'working';
  const rangeInvalid = needsRange && (parsed.error !== null || parsed.indices.length === 0);

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
        aria-labelledby="export-title"
        className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-xl"
      >
        <div className="mb-1 flex items-start justify-between gap-4">
          <h2 id="export-title" className="text-lg font-semibold text-ink">
            Split &amp; export
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
          {pageCount} page{pageCount === 1 ? '' : 's'} in this document. Everything is produced on
          your device.
        </p>

        <fieldset disabled={busy} className="mb-4 space-y-2">
          <legend className="sr-only">What to export</legend>
          {MODES.map(option => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                mode === option.value
                  ? 'border-accent bg-accent-soft'
                  : 'border-line hover:border-line-strong'
              } ${busy ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              <input
                type="radio"
                name="export-mode"
                value={option.value}
                checked={mode === option.value}
                onChange={() => setMode(option.value)}
                className="mt-1 accent-accent"
              />
              <span>
                <span className="block text-sm font-medium text-ink">{option.label}</span>
                <span className="block text-xs text-ink-soft">{option.detail}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {needsRange && (
          <div className="mb-4">
            <label htmlFor="export-range" className="mb-1 block text-sm font-medium text-ink">
              Pages
            </label>
            <input
              id="export-range"
              type="text"
              value={rangeInput}
              onChange={event => setRangeInput(event.target.value)}
              disabled={busy}
              placeholder={pageCount > 3 ? '1-3, 7' : '1'}
              aria-invalid={parsed.error !== null}
              aria-describedby="export-range-help"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint"
            />
            <p
              id="export-range-help"
              className={`mt-1 text-xs ${parsed.error ? 'text-danger' : 'text-ink-soft'}`}
            >
              {parsed.error ??
                (parsed.indices.length > 0
                  ? `${parsed.indices.length} page${parsed.indices.length === 1 ? '' : 's'} selected.`
                  : 'Single pages and ranges, separated by commas.')}
            </p>
          </div>
        )}

        {mode === 'images' && (
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="image-format" className="mb-1 block text-sm font-medium text-ink">
                Format
              </label>
              <select
                id="image-format"
                value={imageFormat}
                onChange={event => setImageFormat(event.target.value as ImageFormat)}
                disabled={busy}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
              >
                <option value="png">PNG — sharp text</option>
                <option value="jpeg">JPG — smaller files</option>
              </select>
            </div>
            <div>
              <label htmlFor="image-scale" className="mb-1 block text-sm font-medium text-ink">
                Resolution
              </label>
              <select
                id="image-scale"
                value={imageScale}
                onChange={event => setImageScale(Number(event.target.value))}
                disabled={busy}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
              >
                {Object.entries(IMAGE_EXPORT_PRESETS).map(([key, preset]) => (
                  <option key={key} value={preset.scale}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {busy && (
          <div className="mb-4">
            <div className="mb-2 flex justify-between text-xs text-ink-soft">
              <span>Working…</span>
              <span className="tabular">
                {progress.total > 0 ? `${progress.done} / ${progress.total}` : 'Preparing'}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full bg-accent transition-[width] duration-200"
                style={{
                  width: progress.total > 0 ? `${(progress.done / progress.total) * 100}%` : '10%',
                }}
              />
            </div>
          </div>
        )}

        {status === 'error' && error && (
          <p className="mb-4 rounded-lg border border-danger bg-danger-soft p-3 text-sm text-danger">
            {error}
          </p>
        )}

        {status === 'done' && outcome && (
          <p className="mb-4 rounded-lg border border-line bg-surface-2 p-3 text-sm text-ink-soft">
            Downloaded {outcome.fileCount} file{outcome.fileCount === 1 ? '' : 's'}
            {outcome.asZip ? ' as a zip' : ''} —{' '}
            <span className="tabular">{formatBytes(outcome.totalBytes)}</span>.
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onRun({ mode, rangeInput, imageFormat, imageScale })}
            disabled={busy || rangeInvalid}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-on transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-ink-faint"
          >
            {busy ? 'Working…' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
};
