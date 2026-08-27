
import React, { useState, useRef } from 'react';
import { UploadIcon, LightningIcon, ShieldIcon, CheckIcon, FileIcon, TrashIcon } from './icons';
import { Wordmark } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { isAcceptedUpload } from '../utils/acceptedUploads';

interface LandingPageProps {
  onFileSelect: (file: File) => void;
  onRemoveFile: (index: number) => void;
  onClearQueue: () => void;
  onEditQueue: () => void;
  files: File[];
}

const Header: React.FC = () => {
  return (
    <header className="fixed top-0 left-0 right-0 bg-surface/85 backdrop-blur-sm z-10">
      <div className="container mx-auto px-6 py-3 flex justify-between items-center border-b border-line">
        {/* Not an <h1>: the hero headline below owns that, and two h1s on a
            page the SEO strategy depends on is a real cost. */}
        <Wordmark size={28} />
        <ThemeToggle />
      </div>
    </header>
  );
};

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="bg-surface p-8 rounded-2xl shadow-sm hover:shadow-lg transition-shadow duration-300">
    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-surface-2 mb-5">
      {icon}
    </div>
    <h3 className="text-lg font-semibold text-ink mb-2">{title}</h3>
    <p className="text-ink-soft text-sm leading-relaxed">{children}</p>
  </div>
);

const FileDropzone: React.FC<{
  onFileSelect: (file: File) => void;
  onRemoveFile: (index: number) => void;
  onClearQueue: () => void;
  onEditQueue: () => void;
  files: File[];
}> = ({ onFileSelect, onRemoveFile, onClearQueue, onEditQueue, files }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach((file: File) => {
        if (isAcceptedUpload(file)) {
          onFileSelect(file);
        }
      });
      e.dataTransfer.clearData();
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach((file: File) => {
        if (isAcceptedUpload(file)) {
          onFileSelect(file);
        }
      });
    }
  };

  if (files.length === 0) {
    return (
      <div className="bg-surface/70 border border-line rounded-3xl shadow-sm p-8 transition-all duration-300">
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-300 ${
            isDragging ? 'border-accent bg-accent-soft' : 'border-line-strong bg-surface/60'
          }`}
        >
          <div className="flex items-center justify-center h-14 w-14 rounded-full bg-surface-2 mb-5 mx-auto">
            <UploadIcon className="w-7 h-7 text-ink-soft" />
          </div>
          <h3 className="text-lg font-semibold text-ink mb-2">Drag PDFs or images here</h3>
          <p className="text-sm text-ink-soft mb-5">or click to browse</p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,image/*"
            multiple
            className="hidden"
          />
          <button
            onClick={handleButtonClick}
            className="bg-accent text-accent-on font-medium py-2.5 px-5 rounded-lg hover:bg-accent-hover transition-colors inline-flex items-center gap-2"
          >
            <FileIcon className="w-5 h-5" />
            Choose files
          </button>
          <p className="text-xs text-ink-faint mt-4">Stays on your device • PDF, JPG, PNG • Drop as many as you like</p>
        </div>
      </div>
    );
  }

  const dropzoneProps = {
    onDragEnter: handleDragEnter,
    onDragLeave: handleDragLeave,
    onDragOver: handleDragOver,
    onDrop: handleDrop,
  };

  return (
    <div className="bg-surface/70 border border-line rounded-3xl shadow-sm p-6 transition-all duration-300 space-y-5">
      <div
        {...dropzoneProps}
        className={`rounded-2xl border-2 border-dashed px-5 py-6 transition-colors ${
          isDragging ? 'border-accent bg-accent-soft' : 'border-line-strong bg-surface/70'
        }`}
      >
        <div className="flex items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-surface-2">
              <UploadIcon className="w-6 h-6 text-ink-soft" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold text-ink">Add more files</h3>
              <p className="text-xs text-ink-soft">Drag PDFs or images here, or click to select from your computer.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <button onClick={handleButtonClick} className="text-ink-soft hover:text-ink">
              Add files
            </button>
            <button onClick={onClearQueue} className="text-ink-faint hover:text-danger">
              Clear all
            </button>
          </div>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,image/*"
          multiple
          className="hidden"
        />
      </div>

      <div className="border border-line rounded-2xl bg-surface/85 p-4 max-h-40 overflow-y-auto space-y-2">
        {files.map((file, index) => (
          <div
            key={`${file.name}-${file.lastModified}-${file.size}-${index}`}
            className="flex items-center justify-between text-sm text-ink"
          >
            <div className="flex items-center gap-3 truncate">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-surface-2 text-xs font-medium text-ink-soft">
                {index + 1}
              </span>
              <div className="truncate">
                <p className="truncate max-w-[220px]">{file.name}</p>
                <p className="text-xs text-ink-faint">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            </div>
            <button
              onClick={() => onRemoveFile(index)}
              className="text-xs text-ink-faint hover:text-danger"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={onEditQueue}
          className="px-5 py-3 rounded-xl font-medium bg-accent-hover text-accent-on hover:bg-accent transition-colors"
        >
          Go edit ({files.length})
        </button>
      </div>
    </div>
  );
};

const LandingPage: React.FC<LandingPageProps> = ({ onFileSelect, onRemoveFile, onClearQueue, onEditQueue, files }) => {
  return (
    <>
      <Header />
      <main className="container mx-auto px-6 pt-32 pb-16">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-block bg-accent-soft text-accent text-xs font-semibold px-3 py-1 rounded-full mb-4">
            Your PDF command center — no installs, no uploads
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-ink mb-6 tracking-tight">
            Fix, reorder, and export PDFs in minutes
          </h1>
          <p className="text-lg text-ink-soft max-w-2xl mx-auto mb-6">
            SqribPDF helps you clean up messy scans, merge contracts, insert blank pages, or rotate that sideways slide deck — all securely inside your browser.
          </p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-sm text-ink-soft mb-12">
            <div className="flex items-center gap-2">
              <LightningIcon className="w-4 h-4 text-ink-faint" /> drag pages to reorder instantly
            </div>
            <div className="hidden md:block h-4 w-px bg-surface-3" />
            <div className="flex items-center gap-2">
              <ShieldIcon className="w-4 h-4 text-ink-faint" /> documents stay on your device
            </div>
            <div className="hidden md:block h-4 w-px bg-surface-3" />
            <div className="flex items-center gap-2">
              <CheckIcon className="w-4 h-4 text-ink-faint" /> export a polished PDF in one click
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto mb-16">
          <FileDropzone
            onFileSelect={onFileSelect}
            onRemoveFile={onRemoveFile}
            onClearQueue={onClearQueue}
            onEditQueue={onEditQueue}
            files={files}
          />
        </div>
        
      </main>
    </>
  );
};

export default LandingPage;
