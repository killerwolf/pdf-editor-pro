
import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import PdfEditor from './components/PdfEditor';

const App: React.FC = () => {
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  const handleFileSelect = (file: File) => {
    setPdfFiles(prev => {
      const candidateKey = `${file.name}-${file.lastModified}-${file.size}`;
      const exists = prev.find(
        existing => `${existing.name}-${existing.lastModified}-${existing.size}` === candidateKey
      );
      if (exists) return prev;
      return [...prev, file];
    });
  };

  const handleAddPdf = (file: File) => {
    setPdfFiles(prev => [...prev, file]);
  };

  const handleRemoveFile = (index: number) => {
    setPdfFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleClearQueue = () => {
    setPdfFiles([]);
  };

  const handleStartEditing = () => {
    if (pdfFiles.length === 0) return;
    setIsEditing(true);
  };

  const handleReset = () => {
    setPdfFiles([]);
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800 font-sans">
      {isEditing ? (
        <PdfEditor files={pdfFiles} onReset={handleReset} onAddPdf={handleAddPdf} />
      ) : (
        <LandingPage
          files={pdfFiles}
          onFileSelect={handleFileSelect}
          onRemoveFile={handleRemoveFile}
          onClearQueue={handleClearQueue}
          onEditQueue={handleStartEditing}
        />
      )}
    </div>
  );
};

export default App;
