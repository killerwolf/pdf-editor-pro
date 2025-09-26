
import React, { useState, useCallback, useRef } from 'react';
import { UploadIcon, LightningIcon, ShieldIcon, CheckIcon, FileIcon } from './icons';

interface LandingPageProps {
  onFileSelect: (file: File) => void;
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

const FileDropzone: React.FC<{ onFileSelect: (file: File) => void }> = ({ onFileSelect }) => {
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
      if(e.dataTransfer.files[0].type === "application/pdf") {
          onFileSelect(e.dataTransfer.files[0]);
      } else {
          alert("Please drop a PDF file.");
      }
      e.dataTransfer.clearData();
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`bg-white/50 border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
        isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
      }`}
    >
      <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-6 mx-auto">
        <UploadIcon className="w-8 h-8 text-gray-500" />
      </div>
      <h3 className="text-xl font-semibold text-gray-800 mb-2">Drop your PDF here</h3>
      <p className="text-gray-500 mb-6">or click to browse your computer</p>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf" className="hidden" />
      <button 
        onClick={handleButtonClick}
        className="bg-gray-800 text-white font-medium py-3 px-6 rounded-lg hover:bg-gray-900 transition-colors flex items-center gap-2 mx-auto"
      >
        <FileIcon className="w-5 h-5" />
        Choose PDF File
      </button>
      <p className="text-xs text-gray-500 mt-6">Supports PDF files up to 50MB • Completely secure and private</p>
    </div>
  );
};

const LandingPage: React.FC<LandingPageProps> = ({ onFileSelect }) => {
  return (
    <>
      <Header />
      <main className="container mx-auto px-6 pt-32 pb-16">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-block bg-yellow-100 text-yellow-800 text-xs font-semibold px-3 py-1 rounded-full mb-4">
            <span role="img" aria-label="star">⭐</span> Professional PDF Editor
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6 tracking-tight">
            Transform Your <br /> PDF Workflow
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-12">
            Enterprise-grade PDF editing tools that work entirely in your browser. Edit, merge, and optimize documents with professional precision.
          </p>
        </div>

        <div className="max-w-3xl mx-auto mb-20">
          <FileDropzone onFileSelect={onFileSelect} />
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <FeatureCard icon={<LightningIcon className="w-6 h-6 text-gray-600" />} title="Lightning Fast">
            Process documents instantly with optimized client-side performance
          </FeatureCard>
          <FeatureCard icon={<ShieldIcon className="w-6 h-6 text-gray-600" />} title="100% Secure">
            Your documents never leave your browser - complete privacy guaranteed
          </FeatureCard>
          <FeatureCard icon={<CheckIcon className="w-6 h-6 text-gray-600" />} title="Professional Quality">
            Enterprise-grade tools for perfect document manipulation
          </FeatureCard>
        </div>
        
      </main>
    </>
  );
};

export default LandingPage;
