import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import { EditablePage } from '../types';
import { UploadIcon, RotateIcon, DownloadIcon, TrashIcon } from './icons';

// pdf.js is loaded from CDN, declare its type here
declare const pdfjsLib: any;

interface PdfEditorProps {
  file: File;
  onReset: () => void;
}

const EditorHeader: React.FC<{ onReset: () => void; onDownload: () => void; isProcessing: boolean; fileName: string }> = ({ onReset, onDownload, isProcessing, fileName }) => {
  return (
    <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-sm z-10">
      <div className="container mx-auto px-6 py-3 flex justify-between items-center border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-800 hidden sm:block">PDF Editor Pro</h1>
        <p className="text-sm text-gray-600 truncate mx-4" title={fileName}>{fileName}</p>
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          <button onClick={onReset} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
            <UploadIcon className="w-4 h-4" />
            <span className="hidden sm:inline">New PDF</span>
          </button>
          <button onClick={onDownload} disabled={isProcessing} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-800 border border-transparent rounded-lg hover:bg-gray-900 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">
            <DownloadIcon className="w-4 h-4" />
            {isProcessing ? 'Saving...' : 'Save & Download'}
          </button>
        </div>
      </div>
    </header>
  );
};

const PdfEditor: React.FC<PdfEditorProps> = ({ file, onReset }) => {
  const [pages, setPages] = useState<EditablePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading PDF...');
  const [isProcessing, setIsProcessing] = useState(false);
  const pdfDocRef = useRef<any>(null); // pdf-lib document instance

  useEffect(() => {
    const loadPdf = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();

        setLoadingMessage('Loading PDF document...');
        
        const pdfjsData = new Uint8Array(arrayBuffer.slice(0));
        const pdfJSDoc = await pdfjsLib.getDocument({ data: pdfjsData }).promise;
        pdfDocRef.current = await PDFDocument.load(arrayBuffer);

        setLoadingMessage(`Generating ${pdfJSDoc.numPages} thumbnails...`);

        const pagePromises: Promise<EditablePage>[] = [];
        for (let i = 0; i < pdfJSDoc.numPages; i++) {
          const pageNum = i + 1;
          pagePromises.push(
            (async () => {
              const page = await pdfJSDoc.getPage(pageNum);
              const viewport = page.getViewport({ scale: 0.5 });
              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d');
              canvas.height = viewport.height;
              canvas.width = viewport.width;

              if (context) {
                await page.render({ canvasContext: context, viewport: viewport }).promise;
              }
              
              return {
                id: `page-${i}`,
                originalIndex: i,
                rotation: 0,
                thumbnailUrl: canvas.toDataURL('image/jpeg', 0.8),
              };
            })()
          );
        }
        
        const generatedPages = await Promise.all(pagePromises);
        setPages(generatedPages);

      } catch (error) {
        console.error('Failed to load PDF:', error);
        alert('Failed to load PDF. Please select a valid PDF file.');
        onReset();
      } finally {
        setLoading(false);
      }
    };
    
    loadPdf();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    const items = Array.from(pages);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setPages(items);
  };

  const handleRotate = (pageId: string) => {
    setPages(prevPages =>
      prevPages.map(page =>
        page.id === pageId
          ? { ...page, rotation: (page.rotation + 90) % 360 }
          : page
      )
    );
  };

  const handleDelete = (pageId: string) => {
    setPages(prevPages => prevPages.filter(page => page.id !== pageId));
  };
  
  const handleDownload = useCallback(async () => {
      if (!pdfDocRef.current || pages.length === 0) {
        alert("There are no pages to save. Please add a PDF.");
        return;
      }
      setIsProcessing(true);
      try {
          const newPdfDoc = await PDFDocument.create();
          const pageIndices = pages.map(p => p.originalIndex);
          
          // Filter out indices that might be invalid if original doc is weird
          const validIndices = pageIndices.filter(i => i < pdfDocRef.current.getPageCount());
          if (validIndices.length === 0) {
             alert("No valid pages to copy.");
             setIsProcessing(false);
             return;
          }

          const copiedPages = await newPdfDoc.copyPages(pdfDocRef.current, validIndices);

          pages.forEach((pageInfo, index) => {
              const newPage = newPdfDoc.addPage(copiedPages[index]);
              newPage.setRotation(degrees(pageInfo.rotation));
          });

          const pdfBytes = await newPdfDoc.save();
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          const originalName = file.name.replace(/\.pdf$/i, '');
          link.download = `${originalName}_edited.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);

      } catch(error) {
          console.error("Failed to save PDF:", error);
          alert("An error occurred while saving the PDF.");
      } finally {
          setIsProcessing(false);
      }
  }, [pages, file.name]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-gray-800"></div>
        <p className="mt-4 text-lg text-gray-600">{loadingMessage}</p>
      </div>
    );
  }

  return (
    <>
      <EditorHeader onReset={onReset} onDownload={handleDownload} isProcessing={isProcessing} fileName={file.name} />
      <main className="pt-24 pb-12">
        {pages.length > 0 ? (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="pages" direction="horizontal">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="container mx-auto px-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6"
                >
                  {pages.map((page, index) => (
                    <Draggable key={page.id} draggableId={page.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow relative group ${snapshot.isDragging ? 'shadow-2xl scale-105' : ''}`}
                        >
                          <div className="p-2">
                            <img src={page.thumbnailUrl} alt={`Page ${page.originalIndex + 1}`} className="w-full rounded-md border" />
                          </div>
                          <div className="flex items-center justify-between p-2 pt-0">
                            <span className="text-sm font-medium text-gray-700">Page {index + 1}</span>
                            <div className="flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleRotate(page.id)}
                                className="p-1.5 rounded-full hover:bg-gray-200 transition-colors"
                                title="Rotate 90°"
                              >
                                <RotateIcon className="w-5 h-5 text-gray-600" />
                              </button>
                              <button
                                onClick={() => handleDelete(page.id)}
                                className="p-1.5 rounded-full hover:bg-red-100 transition-colors"
                                title="Delete Page"
                              >
                                <TrashIcon className="w-5 h-5 text-red-600" />
                              </button>
                            </div>
                          </div>
                          {page.rotation !== 0 && (
                              <div className="absolute top-3 right-3 bg-gray-800 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center pointer-events-none">
                                  {page.rotation}°
                              </div>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        ) : (
          <div className="container mx-auto px-6 text-center">
            <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">All pages have been deleted</h2>
              <p className="text-gray-600 mb-6">Your document is currently empty. Please upload a new PDF to continue editing.</p>
              <button onClick={onReset} className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-gray-800 border border-transparent rounded-lg hover:bg-gray-900 transition-colors mx-auto">
                <UploadIcon className="w-5 h-5" />
                Upload New PDF
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
};

export default PdfEditor;
