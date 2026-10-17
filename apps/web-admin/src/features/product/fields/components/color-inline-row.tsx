import React from 'react';
import { useFormContext, useFormState } from 'react-hook-form';

import { Spinner } from '@celebs/shared-ui/components/spinner';

import { MediaLibraryButton } from '../../components/media-library-button';
import { useFieldErrorReveal } from '../../hooks/use-submission-state';

import { AddFromFileTile, FieldError, getPathError, imageValueKey, VariantThumb } from './shared';
import { useColorInlineRowState } from './use-color-inline-row-state';

interface ColorInlineRowProps {
  color: string;
  namePrefix: string;
  accept?: string[];
  limits?: { maxImages?: number; maxSize?: number };
}

export function ColorInlineRow({ color, namePrefix, accept, limits }: ColorInlineRowProps) {
  const { control } = useFormContext();
  const { errors } = useFormState({ control });
  const state = useColorInlineRowState({ color, namePrefix, accept, limits });
  const acceptStr = Array.isArray(accept) ? accept.join(',') : undefined;
  // Gated per PATH, `images` first — the same precedence the state hook's merged
  // `rowError` uses, so a Red gallery edit never shows Red's swatch complaint.
  const imagesPath = `${namePrefix}.images`;
  const swatchPath = `${namePrefix}.swatch`;
  const { revealError } = useFieldErrorReveal(control);
  const revealedMessage = (path: string) =>
    revealError(path) ? getPathError(errors, path)?.message : undefined;
  const rowError = revealedMessage(imagesPath) ?? revealedMessage(swatchPath);

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
              onSelect={async (urls) => {
                const capped =
                  typeof state.remainingSlots === 'number'
                    ? urls.slice(0, state.remainingSlots)
                    : urls;
                if (capped.length) state.appendImages(capped);
                if (urls.length > capped.length) {
                  // `appendImages` ends in a `trigger` whose async validation
                  // clears this row's error a microtask later, so a `setError`
                  // written straight after it flashed and vanished while the
                  // dropped images were silently gone. Settle validation FIRST,
                  // then publish the notice naming the drop — the same order
                  // `addFiles` uses for the file-pick path.
                  await state.trigger(`${namePrefix}.images`);
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

      {/* No `pt-*` wrapper: `FieldError` carries its own `mt-1`, so the old
          `pt-1.5` stacked 10px of gap. A full-width stacked block, not a table
          cell, so the message stays in flow where it can be read. */}
      {rowError ? <FieldError message={rowError} /> : null}
    </div>
  );
}
