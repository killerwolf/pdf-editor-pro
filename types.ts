
export interface EditablePage {
  id: string;
  originalIndex: number;
  sourceFileKey?: string;
  rotation: number;
  thumbnailUrl: string;
  isBlank?: boolean;
  blankContent?: string;
  pageNumber: number; // Display page number (1-based)
}

export interface PageAction {
  type: 'rotate' | 'delete' | 'addBlank' | 'insertBlank';
  pageId?: string;
  insertAfterIndex?: number;
}
