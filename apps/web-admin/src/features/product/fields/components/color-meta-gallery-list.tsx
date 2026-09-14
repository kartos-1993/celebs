import React from 'react';

import { Spinner } from '@celebs/shared-ui/components/spinner';

import { MediaLibraryButton } from '../../components/media-library-button';

import { AddFromFileTile, ImageValue, VariantThumb } from './shared';

export interface ColorMetaGalleryListProps {
  color: string;
  imagePreviews: string[];
  imagesVal: ImageValue[];
  acceptStr?: string;
  isUploading: boolean;
  canAddMore: boolean;
  remainingSlots?: number;
  maxImages?: number;
  onReplaceImage: (idx: number, file: File | null) => void;
  onRemoveImage: (idx: number) => void;
  onAddImages: (files: FileList | null) => void;
  onLibrarySelect: (urls: string[]) => void;
}

export const ColorMetaGalleryList: React.FC<ColorMetaGalleryListProps> = ({
  color,
  imagePreviews,
  imagesVal,
  acceptStr,
  isUploading,
  canAddMore,
  remainingSlots,
  maxImages,
  onReplaceImage,
  onRemoveImage,
  onAddImages,
  onLibrarySelect,
}) => {
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      {imagePreviews.map((src, idx) => (
        <VariantThumb
          key={idx}
          src={src}
          alt={`${color} ${idx + 1}`}
          accept={acceptStr}
          disabled={isUploading}
          onReplace={(file) => onReplaceImage(idx, file)}
          onRemove={() => onRemoveImage(idx)}
        />
      ))}
      {isUploading ? (
        <span className="grid h-12 w-12 place-items-center rounded-md border border-dashed border-border">
          <Spinner size="sm" className="text-primary" />
        </span>
      ) : (
        canAddMore && (
          <AddFromFileTile
            testId={`color-gallery-upload-${color}`}
            accept={acceptStr}
            multiple
            onFiles={(files) => onAddImages(files)}
          />
        )
      )}
      {canAddMore ? (
        <MediaLibraryButton
          maxSelect={typeof remainingSlots === 'number' ? Math.max(1, remainingSlots) : 8}
          scope="PRODUCT"
          initialSelectedUrls={imagesVal.filter((v): v is string => typeof v === 'string')}
          onSelect={onLibrarySelect}
        />
      ) : null}
      {!canAddMore ? (
        <span className="text-xs text-muted-foreground">Max {maxImages} reached</span>
      ) : null}
    </div>
  );
};
