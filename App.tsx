
import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import PdfEditor from './components/PdfEditor';

const App: React.FC = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const handleFileSelect = (file: File) => {
    setPdfFile(file);
  };

  const handleReset = () => {
    setPdfFile(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800 font-sans">
      {pdfFile ? (
        <PdfEditor file={pdfFile} onReset={handleReset} />
      ) : (
        <LandingPage onFileSelect={handleFileSelect} />
      )}
    </div>
  );
};

export default App;
