import React from 'react';
import { DownloadIcon } from './icons';
import { Logo } from './Logo';

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
    <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-sm z-10">
      <div className="container mx-auto px-6 py-3 flex justify-between items-center border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <Logo size={24} />
            <h1 className="text-xl font-bold text-gray-800">PDF Editor Pro</h1>
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
                className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400"
                autoFocus
              />
            ) : (
              <button
                onClick={onRenameStart}
                className="px-2 py-1 text-sm text-gray-700 bg-white border border-transparent rounded-md hover:border-gray-300 transition-colors"
              >
                {documentTitle}
              </button>
            )}
            {!isRenaming && (
              <span className="absolute left-0 top-full mt-1 whitespace-nowrap text-xs text-white bg-gray-700 rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                Click to rename
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          <button onClick={onDownload} disabled={isProcessing} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-800 border border-transparent rounded-lg hover:bg-gray-900 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">
            <DownloadIcon className="w-4 h-4" />
            {isProcessing ? 'Saving...' : 'Save & Download'}
          </button>
        </div>
      </div>
    </header>
  );
};
