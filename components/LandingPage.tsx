
import React, { useState, useRef } from 'react';
import { UploadIcon, LightningIcon, ShieldIcon, CheckIcon, FileIcon, TrashIcon } from './icons';

interface LandingPageProps {
  onFileSelect: (file: File) => void;
  onRemoveFile: (index: number) => void;
  onClearQueue: () => void;
  onEditQueue: () => void;
  files: File[];
}

const Header: React.FC = () => {
  return (
    <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-sm z-10">
      <div className="container mx-auto px-6 py-3 flex justify-between items-center border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-800">PDF Editor Pro</h1>
      </div>
    </header>
  );
};

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-lg transition-shadow duration-300">
    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-5">
      {icon}
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600 text-sm leading-relaxed">{children}</p>
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
      Array.from(e.dataTransfer.files).forEach(file => {
        if (file.type === 'application/pdf') {
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
      Array.from(e.target.files).forEach(file => {
        if (file.type === 'application/pdf') {
          onFileSelect(file);
        }
      });
    }
  };

  return (
    <div className="bg-white/70 border border-gray-200 rounded-3xl shadow-sm p-8 transition-all duration-300">
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-300 ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white/60'
        }`}
      >
        <div className="flex items-center justify-center h-14 w-14 rounded-full bg-gray-100 mb-5 mx-auto">
          <UploadIcon className="w-7 h-7 text-gray-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Drag PDFs here</h3>
        <p className="text-sm text-gray-500 mb-5">or click to browse</p>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf"
          multiple
          className="hidden"
        />
        <button
          onClick={handleButtonClick}
          className="bg-gray-800 text-white font-medium py-2.5 px-5 rounded-lg hover:bg-gray-900 transition-colors inline-flex items-center gap-2"
        >
          <FileIcon className="w-5 h-5" />
          Choose files
        </button>
        <p className="text-xs text-gray-400 mt-4">Secure & local • Up to 50MB per file • Drop multiple PDFs at once</p>
      </div>

      <div className="mt-6 border-t border-gray-200 pt-6">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Queue ({files.length} file{files.length === 1 ? '' : 's'})</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClearQueue();
            }}
            className={`flex items-center gap-1 ${files.length === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-gray-800'}`}
            disabled={files.length === 0}
          >
            <TrashIcon className="w-4 h-4" /> Clear all
          </button>
        </div>

        <div className="mt-3 border border-gray-200 rounded-2xl bg-white/70 min-h-[84px] max-h-40 overflow-y-auto p-3 flex flex-wrap gap-2 content-start">
          {files.length === 0 ? (
            <p className="text-xs text-gray-400 mx-auto my-auto">Queue is empty. Drop PDFs to get started.</p>
          ) : (
            files.map((file, index) => (
              <div
                key={`${file.name}-${file.lastModified}`}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl shadow-xs text-sm text-gray-700 max-w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="truncate max-w-[180px]">{file.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFile(index);
                  }}
                  className="text-xs text-gray-400 hover:text-red-500"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onEditQueue();
          }}
          disabled={files.length === 0}
          className={`w-full mt-4 py-3 rounded-xl font-medium transition-colors ${
            files.length === 0
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-gray-900 text-white hover:bg-gray-800'
          }`}
        >
          Go edit {files.length > 0 ? `(${files.length})` : ''}
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
          <div className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full mb-4">
            Your PDF command center — no installs, no uploads
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6 tracking-tight">
            Fix, reorder, and export PDFs in minutes
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-6">
            PDF Editor Pro helps you clean up messy scans, merge contracts, insert blank pages, or rotate that sideways slide deck — all securely inside your browser.
          </p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-sm text-gray-500 mb-12">
            <div className="flex items-center gap-2">
              <LightningIcon className="w-4 h-4 text-gray-400" /> drag pages to reorder instantly
            </div>
            <div className="hidden md:block h-4 w-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <ShieldIcon className="w-4 h-4 text-gray-400" /> documents stay on your device
            </div>
            <div className="hidden md:block h-4 w-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <CheckIcon className="w-4 h-4 text-gray-400" /> export a polished PDF in one click
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
