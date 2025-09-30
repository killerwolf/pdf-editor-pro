
export interface EditablePage {
  id: string;
  originalIndex: number;
  sourceFileIndex?: number; // Index of the source PDF file
  rotation: number;
  thumbnailUrl: string;
  isBlank?: boolean;
  pageNumber: number; // Display page number (1-based)
}

export interface PageAction {
  type: 'rotate' | 'delete' | 'addBlank' | 'insertBlank';
  pageId?: string;
  insertAfterIndex?: number;
}
