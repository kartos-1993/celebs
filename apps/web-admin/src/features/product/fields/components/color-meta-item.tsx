import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Trash2 } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';

import { useFieldErrorReveal } from '../../hooks/use-submission-state';

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
    canAddMore,
    remainingSlots,
    maxImages,
    formErrors,
    onSwatch,
    onAddImages,
    onReplaceImage,
    onRemoveImage,
    appendImages,
    onSetSwatchFromUrl,
  } = useColorMetaItem({ color, namePrefix, accept, limits });

  const acceptStr = Array.isArray(accept) ? accept.join(',') : undefined;
  // Each message is gated on ITS OWN path: touching Red's gallery must not
  // surface Red's swatch complaint, and Blue stays silent either way.
  const { control } = useFormContext();
  const { revealError } = useFieldErrorReveal(control);
  const swatchPath = `${namePrefix}.swatch`;
  const imagesPath = `${namePrefix}.images`;
  const swatchErr = revealError(swatchPath)
    ? getPathError(formErrors, swatchPath)?.message
    : undefined;
  const imagesErr = revealError(imagesPath)
    ? getPathError(formErrors, imagesPath)?.message
    : undefined;
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

        {/* The colour NAME is the axis value, not an editable row field: the
            payload reads it from the colour axis (`add-product-payload.ts`), so
            a per-row rename wrote `<prefix>.name`, which nothing ever read —
            the edit vanished and the photos stayed under the original key.
            Rename the colour on the Color axis above instead. */}
        <span className="text-sm font-medium text-foreground">{color}</span>

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

      {/* No `pt-*` wrapper: `FieldError` already carries its own `mt-1`, and the
          old `pt-1.5` stacked 10px of gap under the swatch row. This is a
          full-width stacked block, not a table cell, so the message stays in
          flow where it can actually be read. */}
      {rowError ? <FieldError message={rowError} /> : null}
    </div>
  );
}
