import React from 'react';

import { Spinner } from '@celebs/shared-ui/components/spinner';

import { MediaLibraryButton } from '../../components/media-library-button';

import { AddFromFileTile, FieldError, imageValueKey, VariantThumb } from './shared';
import { useColorInlineRowState } from './use-color-inline-row-state';

interface ColorInlineRowProps {
  color: string;
  namePrefix: string;
  accept?: string[];
  limits?: { maxImages?: number; maxSize?: number };
}

export function ColorInlineRow({ color, namePrefix, accept, limits }: ColorInlineRowProps) {
  const state = useColorInlineRowState({ color, namePrefix, accept, limits });
  const acceptStr = Array.isArray(accept) ? accept.join(',') : undefined;

  return (
    <div className="px-3 py-2.5" data-error-path={`${namePrefix}.images`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {/* Swatch — click to upload */}
        <label
          className="relative block h-11 w-11 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-border/70 bg-accent/20 transition-colors hover:border-primary/50"
          title={state.swatchUrl ? 'Replace swatch image' : 'Upload swatch image'}
        >
          <input
            type="file"
            className="hidden"
            accept={acceptStr}
            disabled={state.isUploadingSwatch}
            onChange={(e) => {
              const input = e.currentTarget;
              const file = input.files?.[0] || null;
              input.value = '';
              void state.uploadSwatch(file);
            }}
          />
          {state.swatchUrl ? (
            <img src={state.swatchUrl} alt={color} className="h-full w-full object-cover" />
          ) : (
            <span className="grid h-full w-full place-items-center text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
              Swatch
            </span>
          )}
          {state.isUploadingSwatch && (
            <span className="absolute inset-0 grid place-items-center bg-black/60">
              <Spinner size="sm" className="text-white" />
            </span>
          )}
        </label>

        {/* Name + optional swatch library pick */}
        <span className="text-sm font-medium text-foreground">{color}</span>
        {!state.swatchUrl && (
          <MediaLibraryButton
            label="Set swatch"
            maxSelect={1}
            scope="PRODUCT"
            initialSelectedUrls={[]}
            disabled={state.isUploadingSwatch}
            onSelect={state.handleSwatchFromLibrary}
          />
        )}

        {/* Product images */}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {state.imagePreviews.map((src, idx) => (
            <VariantThumb
              key={imageValueKey(state.images[idx] ?? src)}
              src={src}
              alt={`${color} ${idx + 1}`}
              accept={acceptStr}
              disabled={state.isUploadingGallery}
              onReplace={(file) => void state.replaceAt(idx, file)}
              onRemove={() => state.removeAt(idx)}
            />
          ))}
          {state.isUploadingGallery ? (
            <span className="grid h-12 w-12 place-items-center rounded-md border border-dashed border-border">
              <Spinner size="sm" className="text-primary" />
            </span>
          ) : (
            state.canAddMore && (
              <AddFromFileTile
                accept={acceptStr}
                multiple
                onFiles={(files) => void state.addFiles(files)}
              />
            )
          )}
          {state.canAddMore && (
            <MediaLibraryButton
              maxSelect={
                typeof state.remainingSlots === 'number' ? Math.max(1, state.remainingSlots) : 8
              }
              scope="PRODUCT"
              initialSelectedUrls={state.images.filter((v): v is string => typeof v === 'string')}
              onSelect={(urls) => {
                const capped =
                  typeof state.remainingSlots === 'number'
                    ? urls.slice(0, state.remainingSlots)
                    : urls;
                if (capped.length) state.appendImages(capped);
                if (urls.length > capped.length) {
                  state.setError(`${namePrefix}.images`, {
                    type: 'validate',
                    message: `Only ${capped.length} of ${urls.length} images added — Max ${state.maxImages}`,
                  });
                }
              }}
            />
          )}
          {!state.canAddMore && (
            <span className="text-xs text-muted-foreground">Max {state.maxImages} reached</span>
          )}
        </div>

        {/* Meta */}
        <div className="ml-auto shrink-0">
          <span className="text-xs tabular-nums text-muted-foreground">
            {state.images.length}
            {state.maxImages != null ? ` / ${state.maxImages}` : ''}
          </span>
        </div>
      </div>

      {state.rowError && (
        <div className="pt-1.5">
          <FieldError message={state.rowError} />
        </div>
      )}
    </div>
  );
}
