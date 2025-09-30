
import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import PdfEditor from './components/PdfEditor';

const App: React.FC = () => {
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);

  const handleFileSelect = (file: File) => {
    setPdfFiles([file]);
  };

  const handleAddPdf = (file: File) => {
    setPdfFiles(prev => [...prev, file]);
  };

  const handleReset = () => {
    setPdfFiles([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800 font-sans">
      {pdfFiles.length > 0 ? (
        <PdfEditor files={pdfFiles} onReset={handleReset} onAddPdf={handleAddPdf} />
      ) : (
        <LandingPage onFileSelect={handleFileSelect} />
      )}
    </div>
  );
};

export default App;
