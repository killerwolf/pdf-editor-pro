import React from 'react';
import { EditablePage } from '../types';
import { RotateIcon, TrashIcon } from './icons';

interface SidebarThumbnailProps {
  page: EditablePage;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onRotate: () => void;
  onDelete: () => void;
  dragProps?: React.HTMLAttributes<HTMLDivElement>;
}

export const SidebarThumbnail: React.FC<SidebarThumbnailProps> = ({
  page,
  isSelected,
  onSelect,
  onRotate,
  onDelete,
  dragProps,
}) => {
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
