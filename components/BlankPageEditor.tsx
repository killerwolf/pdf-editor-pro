import React, { useRef } from 'react';

interface BlankPageEditorProps {
  content: string;
  onChange: (html: string) => void;
}

const applyFormatting = (command: string) => {
  if (document) {
    document.execCommand(command, false);
  }
};

export const BlankPageEditor: React.FC<BlankPageEditorProps> = ({ content, onChange }) => {
  const editorRef = useRef<HTMLDivElement | null>(null);

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => applyFormatting('bold')}
          className="px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-100"
        >
          Bold
        </button>
        <button
          onClick={() => applyFormatting('italic')}
          className="px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-100"
        >
          Italic
        </button>
        <button
          onClick={() => applyFormatting('underline')}
          className="px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-100"
        >
          Underline
        </button>
        <button
          onClick={() => applyFormatting('insertUnorderedList')}
          className="px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-100"
        >
          • List
        </button>
      </div>
      <div className="flex-1 bg-white border border-gray-200 rounded-lg shadow-sm p-6 overflow-auto">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className="min-h-[400px] outline-none text-gray-800 text-base leading-relaxed"
          style={{
            direction: 'ltr',
            textAlign: 'left',
            unicodeBidi: 'normal',
            writingMode: 'horizontal-tb',
          }}
          dir="ltr"
          onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    </>
  );
};
