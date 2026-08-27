import React from 'react';
import { DownloadIcon } from './icons';
import { Wordmark } from './Logo';
import { ThemeToggle } from './ThemeToggle';

interface EditorHeaderProps {
  documentTitle: string;
  isRenaming: boolean;
  onRenameStart: () => void;
  onRenameChange: (value: string) => void;
  renameInputRef: React.RefObject<HTMLInputElement | null>;
  onRenameSubmit: () => void;
  onDownload: () => void;
  isProcessing: boolean;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  documentTitle,
  isRenaming,
  onRenameStart,
  onRenameChange,
  renameInputRef,
  onRenameSubmit,
  onDownload,
  isProcessing,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 bg-surface/85 backdrop-blur-sm z-10">
      <div className="container mx-auto px-6 py-3 flex justify-between items-center border-b border-line">
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex">
            <Wordmark size={24} />
          </div>
          <div className="relative group">
            {isRenaming ? (
              <input
                ref={renameInputRef}
                defaultValue={documentTitle}
                onBlur={onRenameSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onRenameSubmit();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    onRenameSubmit();
                  }
                }}
                onChange={(e) => onRenameChange(e.target.value)}
                className="px-2 py-1 text-sm border border-line-strong rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
                autoFocus
              />
            ) : (
              <button
                onClick={onRenameStart}
                className="px-2 py-1 text-sm text-ink bg-surface border border-transparent rounded-md hover:border-line-strong transition-colors"
              >
                {documentTitle}
              </button>
            )}
            {!isRenaming && (
              <span className="absolute left-0 top-full mt-1 whitespace-nowrap text-xs text-paper bg-ink rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                Click to rename
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <ThemeToggle />
          <button onClick={onDownload} disabled={isProcessing} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-accent-on bg-accent border border-transparent rounded-lg hover:bg-accent-hover transition-colors disabled:bg-ink-faint disabled:cursor-not-allowed">
            <DownloadIcon className="w-4 h-4" />
            {isProcessing ? 'Saving...' : 'Save & Download'}
          </button>
        </div>
      </div>
    </header>
  );
};
