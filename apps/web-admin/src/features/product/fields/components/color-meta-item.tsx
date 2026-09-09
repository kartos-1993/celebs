import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import { Input } from '@celebs/shared-ui/components/input';

import { ColorMetaGalleryList } from './color-meta-gallery-list';
import { ColorMetaSwatchTile } from './color-meta-swatch-tile';
import { FieldError, getPathError } from './shared';
import { useColorMetaItem } from './use-color-meta-item';

export interface ColorMetaItemProps {
  color: string;
  namePrefix: string;
  accept?: string[];
  limits?: { maxImages?: number; maxSize?: number };
  onRemove?: () => void;
}

export function ColorMetaItem({ color, namePrefix, accept, limits, onRemove }: ColorMetaItemProps) {
  const {
    swatchUrl,
    imagesVal,
    imagePreviews,
    isUploadingSwatch,
    isUploadingGallery,
    isEditingColor,
    setIsEditingColor,
    canAddMore,
    remainingSlots,
    maxImages,
    formErrors,
    onSwatch,
    onAddImages,
    onReplaceImage,
    onRemoveImage,
    appendImages,
    onUpdateColorName,
    onSetSwatchFromUrl,
  } = useColorMetaItem({ color, namePrefix, accept, limits });

  const acceptStr = Array.isArray(accept) ? accept.join(',') : undefined;
  const swatchErr = getPathError(formErrors, `${namePrefix}.swatch`)?.message;
  const imagesErr = getPathError(formErrors, `${namePrefix}.images`)?.message;
  const rowError = imagesErr ?? swatchErr;

  return (
    <div className="px-3 py-2.5" data-error-path={`${namePrefix}.images`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <ColorMetaSwatchTile
          color={color}
          swatchUrl={swatchUrl}
          isUploading={isUploadingSwatch}
          acceptStr={acceptStr}
          onSelectFile={(f) => void onSwatch(f)}
          onSelectLibrary={(urls) => onSetSwatchFromUrl(urls[0])}
        />

        {isEditingColor ? (
          <Input
            type="text"
            defaultValue={color}
            autoFocus
            className="h-8 w-32 text-xs"
            onBlur={(e) => onUpdateColorName(e.target.value.trim())}
          />
        ) : (
          <span className="flex items-center gap-1 text-sm font-medium text-foreground">
            {color}
            <button
              type="button"
              title="Rename color"
              className="text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setIsEditingColor(true)}
            >
              <Pencil className="h-3 w-3" />
            </button>
          </span>
        )}

        <ColorMetaGalleryList
          color={color}
          imagePreviews={imagePreviews}
          imagesVal={imagesVal}
          acceptStr={acceptStr}
          isUploading={isUploadingGallery}
          canAddMore={canAddMore}
          remainingSlots={remainingSlots}
          maxImages={maxImages}
          onReplaceImage={(idx, f) => void onReplaceImage(idx, f)}
          onRemoveImage={onRemoveImage}
          onAddImages={(files) => void onAddImages(files)}
          onLibrarySelect={(urls) => {
            const capped =
              typeof remainingSlots === 'number' ? urls.slice(0, remainingSlots) : urls;
            if (capped.length) appendImages(capped);
          }}
        />

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span className="text-xs tabular-nums text-muted-foreground">
            {imagesVal.length}
            {maxImages != null ? ` / ${maxImages}` : ''}
          </span>
          {onRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              title={`Remove ${color}`}
              onClick={onRemove}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      </div>

      {rowError ? (
        <div className="pt-1.5">
          <FieldError message={rowError} />
        </div>
      ) : null}
    </div>
  );
}
