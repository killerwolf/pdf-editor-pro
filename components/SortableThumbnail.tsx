import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { EditablePage } from '../types';
import { SidebarThumbnail } from './SidebarThumbnail';

interface SortableThumbnailProps {
  page: EditablePage;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onRotate: () => void;
  onDelete: () => void;
}

export const SortableThumbnail: React.FC<SortableThumbnailProps> = ({
  page,
  index,
  isSelected,
  onSelect,
  onRotate,
  onDelete,
}) => {
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
