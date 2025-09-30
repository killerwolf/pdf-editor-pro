import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import { EditablePage, PageAction } from '../types';
import { UploadIcon, RotateIcon, DownloadIcon, TrashIcon, PlusIcon } from './icons';

// pdf.js is loaded from CDN, declare its type here
declare const pdfjsLib: any;

interface PdfEditorProps {
  files: File[];
  onReset: () => void;
  onAddPdf: (file: File) => void;
}

interface EditablePageWithHighRes extends EditablePage {
  highResUrl?: string;
  sourceFileKey?: string;
}

const EditorHeader: React.FC<{ onReset: () => void; onDownload: () => void; isProcessing: boolean; fileName: string }> = ({ onReset, onDownload, isProcessing, fileName }) => {
  return (
    <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-sm z-10">
      <div className="container mx-auto px-6 py-3 flex justify-between items-center border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-800 hidden sm:block">PDF Editor Pro</h1>
        <p className="text-sm text-gray-600 truncate mx-4" title={fileName}>{fileName}</p>
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

const SidebarThumbnail: React.FC<{
  page: EditablePage;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onRotate: () => void;
  onDelete: () => void;
  dragProps?: React.HTMLAttributes<HTMLDivElement>;
}> = ({ page, index, isSelected, onSelect, onRotate, onDelete, dragProps }) => {
  return (
    <div className="relative group">
      <div
        {...dragProps}
        className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-all border-2 ${
          isSelected ? 'border-blue-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'
        }`}
        onClick={onSelect}
      >
        <div 
          className="pl-1 cursor-pointer"
        >
          <div className="p-1.5">
            {page.isBlank ? (
              <div className="w-full aspect-[3/4] bg-gray-100 rounded flex items-center justify-center border-2 border-dashed border-gray-300">
                <span className="text-gray-500 text-xs font-medium">Blank</span>
              </div>
            ) : (
              <img 
                src={page.thumbnailUrl} 
                alt={`Page {page.pageNumber}`}
                className="w-full aspect-[3/4] object-contain rounded border"
                style={{ transform: `rotate(${page.rotation}deg)` }}
              />
            )}
          </div>
          <div className="flex items-center justify-between p-1.5 pt-0">
            <span className="text-xs font-medium text-gray-700">Page {page.pageNumber}</span>
            <div className="flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRotate();
                }}
                className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                title="Rotate 90°"
              >
                <RotateIcon className="w-3 h-3 text-gray-600" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-1 rounded-full hover:bg-red-100 transition-colors"
                title="Delete Page"
              >
                <TrashIcon className="w-3 h-3 text-red-600" />
              </button>
            </div>
          </div>
          {page.rotation !== 0 && (
            <div className="absolute top-3 right-3 bg-gray-800 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center pointer-events-none">
              {page.rotation}°
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const InsertPageButton: React.FC<{
  onInsert: () => void;
  isVisible: boolean;
}> = ({ onInsert, isVisible }) => {
  return (
    <div className={`flex justify-center py-1 transition-opacity ${isVisible ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
      <button
        onClick={onInsert}
        className="w-6 h-6 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors flex items-center justify-center shadow-md"
        title="Insert blank page here"
      >
        <PlusIcon className="w-3 h-3" />
      </button>
    </div>
  );
};

const SortableThumbnail: React.FC<{
  page: EditablePage;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onRotate: () => void;
  onDelete: () => void;
}> = ({ page, index, isSelected, onSelect, onRotate, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.75 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-2">
      <SidebarThumbnail
        page={page}
        index={index}
        isSelected={isSelected}
        onSelect={onSelect}
        onRotate={onRotate}
        onDelete={onDelete}
        dragProps={{ ...listeners, ...attributes }}
      />
    </div>
  );
};

const PdfEditor: React.FC<PdfEditorProps> = ({ files, onReset, onAddPdf }) => {
  const [pages, setPages] = useState<EditablePage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading PDF...');
  const [isProcessing, setIsProcessing] = useState(false);
  const pdfDocRefs = useRef<Record<string, any>>({}); // pdf-lib document instances keyed by file id
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update page numbers when pages change
  const updatePageNumbers = useCallback((pagesList: EditablePage[]) => {
    return pagesList.map((page, index) => ({
      ...page,
      pageNumber: index + 1
    }));
  }, []);

  useEffect(() => {
    const loadFiles = async () => {
      if (files.length === 0) {
        setPages([]);
        setSelectedPageId(null);
        pdfDocRefs.current = {};
        setLoading(false);
        return;
      }

      setLoading(true);
      const nextDocRefs: Record<string, any> = {};
      const nextPages: EditablePageWithHighRes[] = [];

      try {
        for (const [index, file] of files.entries()) {
          const fileKey = `${file.name}-${file.lastModified}-${file.size}-${index}`;
          setLoadingMessage(`Loading ${file.name}...`);

          const arrayBuffer = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(arrayBuffer);
          nextDocRefs[fileKey] = pdfDoc;

          const pdfjsData = new Uint8Array(arrayBuffer.slice(0));
          const pdfJSDoc = await pdfjsLib.getDocument({ data: pdfjsData }).promise;

          setLoadingMessage(`Generating ${pdfJSDoc.numPages} thumbnails for ${file.name}...`);

          for (let pageIndex = 0; pageIndex < pdfJSDoc.numPages; pageIndex++) {
            const page = await pdfJSDoc.getPage(pageIndex + 1);

            const thumbnailViewport = page.getViewport({ scale: 0.3 });
            const thumbnailCanvas = document.createElement('canvas');
            const thumbnailContext = thumbnailCanvas.getContext('2d');
            thumbnailCanvas.height = thumbnailViewport.height;
            thumbnailCanvas.width = thumbnailViewport.width;
            if (thumbnailContext) {
              await page.render({ canvasContext: thumbnailContext, viewport: thumbnailViewport }).promise;
            }

            const highResViewport = page.getViewport({ scale: 2.0 });
            const highResCanvas = document.createElement('canvas');
            const highResContext = highResCanvas.getContext('2d');
            highResCanvas.height = highResViewport.height;
            highResCanvas.width = highResViewport.width;
            if (highResContext) {
              await page.render({ canvasContext: highResContext, viewport: highResViewport }).promise;
            }

            nextPages.push({
              id: `page-${fileKey}-${pageIndex}`,
              originalIndex: pageIndex,
              sourceFileKey: fileKey,
              rotation: 0,
              thumbnailUrl: thumbnailCanvas.toDataURL('image/jpeg', 0.8),
              highResUrl: highResCanvas.toDataURL('image/jpeg', 0.9),
              isBlank: false,
              pageNumber: pageIndex + 1,
            });
          }
        }

        pdfDocRefs.current = nextDocRefs;
        const ordered = updatePageNumbers(nextPages);
        setPages(ordered);
        setSelectedPageId(ordered[0]?.id ?? null);
      } catch (error) {
        console.error('Failed to load PDF:', error);
        alert('Failed to load PDF. Please select a valid PDF file.');
      } finally {
        setLoading(false);
      }
    };

    loadFiles();
  }, [files, updatePageNumbers]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) {
        return;
      }

      const oldIndex = pages.findIndex(page => page.id === active.id);
      const newIndex = pages.findIndex(page => page.id === over.id);

      if (oldIndex === -1 || newIndex === -1) {
        return;
      }

      const reordered = arrayMove(pages, oldIndex, newIndex);
      setPages(updatePageNumbers(reordered));
    },
    [pages, updatePageNumbers]
  );

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
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      onAddPdf(file);
    } else {
      alert('Please select a valid PDF file.');
    }
    // Reset the input so the same file can be selected again
    event.target.value = '';
  };
  
  const handleDownload = useCallback(async () => {
    if (pdfDocRefs.current.length === 0 || pages.length === 0) {
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
          // Copy original page from the correct source PDF
          const sourceFileKey = pageInfo.sourceFileKey;
          const sourcePdfDoc = sourceFileKey ? pdfDocRefs.current[sourceFileKey] : null;
          if (sourcePdfDoc) {
            const [copiedPage] = await newPdfDoc.copyPages(sourcePdfDoc, [pageInfo.originalIndex]);
            const newPage = newPdfDoc.addPage(copiedPage);
            newPage.setRotation(degrees(pageInfo.rotation));
          }
        }
      }

      const pdfBytes = await newPdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const originalName = files[0]?.name.replace(/\.pdf$/i, '') || 'document';
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
  }, [pages, files]);

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
      <EditorHeader onReset={onReset} onDownload={handleDownload} isProcessing={isProcessing} fileName={files[0]?.name || 'PDF Document'} />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileInputChange}
        className="hidden"
      />
      <div className="flex h-screen pt-16">
        {/* Left Sidebar */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
          <div className="p-3 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-800">Pages</h2>
            <p className="text-xs text-gray-600">{pages.length} page{pages.length !== 1 ? 's' : ''}</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={pages.map(page => page.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {pages.map((page, index) => (
                    <SortableThumbnail
                      key={page.id}
                      page={page}
                      index={index}
                      isSelected={selectedPageId === page.id}
                      onSelect={() => setSelectedPageId(page.id)}
                      onRotate={() => handleRotate(page.id)}
                      onDelete={() => handleDelete(page.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
          
          {/* Add New PDF Button */}
          <div className="p-3 border-t border-gray-200">
            <button
              onClick={handleAddNewPdf}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <PlusIcon className="w-3 h-3" />
              Add New PDF
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-gray-50 flex flex-col overflow-hidden">
          {selectedPage ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="w-full h-full max-w-6xl flex items-center justify-center">
                {selectedPage.isBlank ? (
                  <div className="w-full h-full bg-white border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center shadow-sm">
                    <div className="text-center">
                      <div className="text-4xl text-gray-400 mb-3">📄</div>
                      <h3 className="text-xl font-semibold text-gray-600 mb-2">Blank Page</h3>
                      <p className="text-gray-500 text-sm">This is a blank page that will be included in your PDF</p>
                    </div>
                  </div>
                ) : (
                  <div className="relative bg-white rounded-lg shadow-sm p-2 w-full h-full flex items-center justify-center">
                    <img
                      src={(selectedPage as EditablePageWithHighRes).highResUrl || selectedPage.thumbnailUrl}
                      alt={`Page ${selectedPage.pageNumber}`}
                      className="max-w-full max-h-full w-auto h-auto object-contain"
                      style={{ 
                        transform: `rotate(${selectedPage.rotation}deg)`,
                        maxHeight: 'calc(100vh - 6rem)' // Account for header and padding
                      }}
                    />
                    {selectedPage.rotation !== 0 && (
                      <div className="absolute top-2 right-2 bg-gray-800 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
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
                <div className="text-4xl text-gray-400 mb-3">📄</div>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No Page Selected</h3>
                <p className="text-gray-500 text-sm">Select a page from the sidebar to view it here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default PdfEditor;