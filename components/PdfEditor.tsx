import React, { useCallback, useRef, useState } from 'react';
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
  arrayMove,
} from '@dnd-kit/sortable';
import { EditablePage } from '../types';
import { UploadIcon, PlusIcon } from './icons';
import { EditorHeader } from './EditorHeader';
import { SortableThumbnail } from './SortableThumbnail';
import { BlankPageEditor } from './BlankPageEditor';
import { usePdfPages } from '../hooks/usePdfPages';
import { usePdfExport } from '../hooks/usePdfExport';

interface PdfEditorProps {
  files: File[];
  onReset: () => void;
  onAddPdf: (file: File) => void;
}

interface EditablePageWithHighRes extends EditablePage {
  highResUrl?: string;
  sourceFileKey?: string;
}

const PdfEditor: React.FC<PdfEditorProps> = ({ files, onReset, onAddPdf }) => {
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [documentTitle, setDocumentTitle] = useState<string>('Untitled document');
  const [isRenaming, setIsRenaming] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const { pages, setPages, loading, loadingMessage, pdfDocRefs, updatePageNumbers } = usePdfPages(
    files,
    selectedPageId,
    setSelectedPageId,
    documentTitle,
    setDocumentTitle
  );

  const { handleDownload, isProcessing } = usePdfExport(pages, pdfDocRefs, documentTitle);

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
    [pages, updatePageNumbers, setPages]
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

  const handleAddBlankAtEnd = () => {
    const blankPage: EditablePage = {
      id: `blank-${Date.now()}`,
      originalIndex: -1,
      rotation: 0,
      thumbnailUrl: '',
      isBlank: true,
      blankContent: '',
      pageNumber: pages.length + 1,
    };
    setPages(prev => updatePageNumbers([...prev, blankPage]));
    setSelectedPageId(blankPage.id);
  };

  const handleBlankContentChange = useCallback((pageId: string, html: string) => {
    // Ensure the content has proper LTR direction
    const cleanHtml = html.replace(/dir="[^"]*"/g, '').replace(/style="[^"]*direction[^"]*"/g, '');
    setPages(prev => prev.map(page => (page.id === pageId ? { ...page, blankContent: cleanHtml } : page)));
  }, [setPages]);

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

  const handleRenameStart = () => {
    setIsRenaming(true);
    setTimeout(() => {
      renameInputRef.current?.focus();
    }, 0);
  };

  const handleRenameChange = (value: string) => {
    setDocumentTitle(value);
  };

  const handleRenameSubmit = () => {
    setIsRenaming(false);
    setDocumentTitle(documentTitle);
  };

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
      <EditorHeader
        documentTitle={documentTitle}
        isRenaming={isRenaming}
        onRenameStart={() => {
          setIsRenaming(true);
          setTimeout(() => renameInputRef.current?.select(), 0);
        }}
        onRenameChange={value => setDocumentTitle(value)}
        renameInputRef={renameInputRef}
        onRenameSubmit={() => {
          setIsRenaming(false);
          if (!documentTitle.trim()) {
            setDocumentTitle('Untitled document');
          }
        }}
        onDownload={handleDownload}
        isProcessing={isProcessing}
      />
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
          <div className="p-3 border-t border-gray-200 space-y-2">
            <button
              onClick={handleAddNewPdf}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <UploadIcon className="w-3 h-3" />
              Upload other PDF
            </button>
            <button
              onClick={handleAddBlankAtEnd}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <PlusIcon className="w-3 h-3" />
              Insert blank page
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-gray-50 flex flex-col overflow-hidden">
          {selectedPage ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="w-full h-full max-w-4xl flex flex-col gap-4">
                {selectedPage.isBlank ? (
                  <BlankPageEditor
                    content={selectedPage.blankContent || ''}
                    onChange={(html) => handleBlankContentChange(selectedPage.id, html)}
                  />
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
