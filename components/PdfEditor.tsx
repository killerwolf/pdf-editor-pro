import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import { EditablePage, PageAction } from '../types';
import { UploadIcon, RotateIcon, DownloadIcon, TrashIcon, PlusIcon } from './icons';

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

const SidebarThumbnail: React.FC<{
  page: EditablePage;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onRotate: () => void;
  onDelete: () => void;
  onInsertBlank: () => void;
}> = ({ page, index, isSelected, onSelect, onRotate, onDelete, onInsertBlank }) => {
  return (
    <div className="relative group">
      <div
        className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer border-2 ${
          isSelected ? 'border-blue-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'
        }`}
        onClick={onSelect}
      >
        <div className="p-2">
          {page.isBlank ? (
            <div className="w-full h-32 bg-gray-100 rounded flex items-center justify-center border-2 border-dashed border-gray-300">
              <span className="text-gray-500 text-sm font-medium">Blank Page</span>
            </div>
          ) : (
            <img 
              src={page.thumbnailUrl} 
              alt={`Page ${page.pageNumber}`} 
              className="w-full h-32 object-contain rounded border"
              style={{ transform: `rotate(${page.rotation}deg)` }}
            />
          )}
        </div>
        <div className="flex items-center justify-between p-2 pt-0">
          <span className="text-sm font-medium text-gray-700">Page {page.pageNumber}</span>
          <div className="flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRotate();
              }}
              className="p-1.5 rounded-full hover:bg-gray-200 transition-colors"
              title="Rotate 90°"
            >
              <RotateIcon className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 rounded-full hover:bg-red-100 transition-colors"
              title="Delete Page"
            >
              <TrashIcon className="w-4 h-4 text-red-600" />
            </button>
          </div>
        </div>
        {page.rotation !== 0 && (
          <div className="absolute top-3 right-3 bg-gray-800 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center pointer-events-none">
            {page.rotation}°
          </div>
        )}
      </div>
      
      {/* Insert blank page button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onInsertBlank();
        }}
        className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-blue-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-600 flex items-center justify-center"
        title="Insert blank page after this page"
      >
        <PlusIcon className="w-3 h-3" />
      </button>
    </div>
  );
};

const PdfEditor: React.FC<PdfEditorProps> = ({ file, onReset }) => {
  const [pages, setPages] = useState<EditablePage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading PDF...');
  const [isProcessing, setIsProcessing] = useState(false);
  const pdfDocRef = useRef<any>(null); // pdf-lib document instance
  const pdfjsDocRef = useRef<any>(null); // pdf.js document instance

  // Update page numbers when pages change
  const updatePageNumbers = useCallback((pagesList: EditablePage[]) => {
    return pagesList.map((page, index) => ({
      ...page,
      pageNumber: index + 1
    }));
  }, []);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();

        setLoadingMessage('Loading PDF document...');
        
        const pdfjsData = new Uint8Array(arrayBuffer.slice(0));
        const pdfJSDoc = await pdfjsLib.getDocument({ data: pdfjsData }).promise;
        pdfjsDocRef.current = pdfJSDoc;
        pdfDocRef.current = await PDFDocument.load(arrayBuffer);

        setLoadingMessage(`Generating ${pdfJSDoc.numPages} thumbnails...`);

        const pagePromises: Promise<EditablePage>[] = [];
        for (let i = 0; i < pdfJSDoc.numPages; i++) {
          const pageNum = i + 1;
          pagePromises.push(
            (async () => {
              const page = await pdfJSDoc.getPage(pageNum);
              const viewport = page.getViewport({ scale: 0.3 });
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
                isBlank: false,
                pageNumber: i + 1
              };
            })()
          );
        }
        
        const generatedPages = await Promise.all(pagePromises);
        const pagesWithNumbers = updatePageNumbers(generatedPages);
        setPages(pagesWithNumbers);
        
        // Select first page by default
        if (pagesWithNumbers.length > 0) {
          setSelectedPageId(pagesWithNumbers[0].id);
        }

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
  }, [file, updatePageNumbers]);

  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(pages);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    const reorderedPages = updatePageNumbers(items);
    setPages(reorderedPages);
  };

  const handleRotate = (pageId: string) => {
    setPages(prevPages => {
      const updated = prevPages.map(page =>
        page.id === pageId
          ? { ...page, rotation: (page.rotation + 90) % 360 }
          : page
      );
      return updatePageNumbers(updated);
    });
  };

  const handleDelete = (pageId: string) => {
    setPages(prevPages => {
      const filtered = prevPages.filter(page => page.id !== pageId);
      const updated = updatePageNumbers(filtered);
      
      // If we deleted the selected page, select the next available page
      if (selectedPageId === pageId) {
        if (updated.length > 0) {
          setSelectedPageId(updated[0].id);
        } else {
          setSelectedPageId(null);
        }
      }
      
      return updated;
    });
  };

  const handleInsertBlank = (afterIndex: number) => {
    const blankPage: EditablePage = {
      id: `blank-${Date.now()}`,
      originalIndex: -1, // -1 indicates blank page
      rotation: 0,
      thumbnailUrl: '',
      isBlank: true,
      pageNumber: afterIndex + 2
    };

    setPages(prevPages => {
      const newPages = [...prevPages];
      newPages.splice(afterIndex + 1, 0, blankPage);
      return updatePageNumbers(newPages);
    });
  };

  const handleAddNewPdf = () => {
    // This will trigger the file input in the parent component
    onReset();
  };
  
  const handleDownload = useCallback(async () => {
    if (!pdfDocRef.current || pages.length === 0) {
      alert("There are no pages to save. Please add a PDF.");
      return;
    }
    setIsProcessing(true);
    try {
      const newPdfDoc = await PDFDocument.create();
      
      for (const pageInfo of pages) {
        if (pageInfo.isBlank) {
          // Add a blank page
          const blankPage = newPdfDoc.addPage();
          // You can customize the blank page here if needed
        } else {
          // Copy original page
          const originalPage = pdfDocRef.current.getPage(pageInfo.originalIndex);
          const [copiedPage] = await newPdfDoc.copyPages(pdfDocRef.current, [pageInfo.originalIndex]);
          const newPage = newPdfDoc.addPage(copiedPage);
          newPage.setRotation(degrees(pageInfo.rotation));
        }
      }

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

  const selectedPage = pages.find(page => page.id === selectedPageId);

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
      <div className="flex h-screen pt-16">
        {/* Left Sidebar */}
        <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Pages</h2>
            <p className="text-sm text-gray-600">{pages.length} page{pages.length !== 1 ? 's' : ''}</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable 
                droppableId="pages" 
                direction="vertical" 
                isDropDisabled={false} 
                isCombineEnabled={false}
                ignoreContainerClipping={false}
              >
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-3"
                  >
                    {pages.map((page, index) => (
                      <Draggable 
                        key={page.id} 
                        draggableId={page.id} 
                        index={index} 
                        isDragDisabled={false} 
                        isCombineEnabled={false}
                        ignoreContainerClipping={false}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`${snapshot.isDragging ? 'z-50' : ''}`}
                          >
                            <SidebarThumbnail
                              page={page}
                              index={index}
                              isSelected={selectedPageId === page.id}
                              onSelect={() => setSelectedPageId(page.id)}
                              onRotate={() => handleRotate(page.id)}
                              onDelete={() => handleDelete(page.id)}
                              onInsertBlank={() => handleInsertBlank(index)}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
          
          {/* Add New PDF Button */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleAddNewPdf}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Add New PDF
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-white flex flex-col">
          {selectedPage ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="max-w-4xl w-full">
                {selectedPage.isBlank ? (
                  <div className="w-full h-[800px] bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-6xl text-gray-400 mb-4">📄</div>
                      <h3 className="text-2xl font-semibold text-gray-600 mb-2">Blank Page</h3>
                      <p className="text-gray-500">This is a blank page that will be included in your PDF</p>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <img
                      src={selectedPage.thumbnailUrl}
                      alt={`Page ${selectedPage.pageNumber}`}
                      className="w-full h-auto max-h-[800px] object-contain border border-gray-200 rounded-lg shadow-lg"
                      style={{ transform: `rotate(${selectedPage.rotation}deg)` }}
                    />
                    {selectedPage.rotation !== 0 && (
                      <div className="absolute top-4 right-4 bg-gray-800 text-white text-sm font-bold rounded-full h-8 w-8 flex items-center justify-center">
                        {selectedPage.rotation}°
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl text-gray-400 mb-4">📄</div>
                <h3 className="text-2xl font-semibold text-gray-600 mb-2">No Page Selected</h3>
                <p className="text-gray-500">Select a page from the sidebar to view it here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default PdfEditor;