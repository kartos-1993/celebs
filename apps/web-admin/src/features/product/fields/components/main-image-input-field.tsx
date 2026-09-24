import { memo } from 'react';

import { MediaCropDialog } from '../../components/media-crop-dialog';
import { MediaLibraryButton } from '../../components/media-library-button';
import type { UiProps } from '../ui-registry';

import { MultiImageGrid } from './multi-image-grid';
import { FieldError, LabelWithRequired } from './shared';
import { SingleCoverDropzone } from './single-cover-dropzone';
import { useMainImageState } from './use-main-image-state';

export const MainImageInputField = memo(function MainImageInputField({ field }: UiProps) {
  const state = useMainImageState({ field });

  return (
    <div className="space-y-2 col-span-full" data-error-path={field.name}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LabelWithRequired required={field.required}>{field.label}</LabelWithRequired>
          <MediaLibraryButton
            maxSelect={state.maxItems}
            scope="PRODUCT"
            initialSelectedUrls={state.previews.filter((v): v is string => typeof v === 'string')}
            disabled={state.isUploading}
            onSelect={state.handlePickerSelect}
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {state.previews.length}/{state.maxItems} uploaded
        </span>
      </div>

      <MediaCropDialog
        open={state.croppingFile !== null}
        file={state.croppingFile?.file ?? null}
        onCropComplete={state.handleCropComplete}
        onCancel={() => state.setCroppingFile(null)}
      />

      <div className="space-y-3">
        {state.isSingle ? (
          <SingleCoverDropzone
            preview={state.previews[0]}
            isUploading={state.isUploading}
            onReplaceFile={state.onReplaceFile}
            onRemoveFile={state.onRemoveFile}
            onAddFiles={state.onAddFiles}
            handlePickerSelect={state.handlePickerSelect}
            fileInputs={state.fileInputs}
          />
        ) : (
          <MultiImageGrid
            previews={state.previews}
            files={state.files}
            maxItems={state.maxItems}
            isUploading={state.isUploading}
            onReplaceFile={state.onReplaceFile}
            onRemoveFile={state.onRemoveFile}
            onAddFiles={state.onAddFiles}
            fileInputs={state.fileInputs}
          />
        )}

        <div className="text-xs text-muted-foreground">
          Optional when color galleries are set — the first color photo becomes the cover
          automatically.
        </div>
        {field.rule && (
          <div className="text-xs text-muted-foreground">
            Max size:{' '}
            {Math.round(
              (typeof field.rule.maxSize === 'number' ? field.rule.maxSize : 5242880) / 1024 / 1024,
            )}
            MB.
            {Boolean(field.rule.minWidth || field.rule.minHeight) && (
              <>
                {' '}
                • Recommended minimum: {field.rule.minWidth ?? 0}×{field.rule.minHeight ?? 0}px
              </>
            )}
            {Boolean(field.rule.maxWidth || field.rule.maxHeight) && (
              <>
                {' '}
                • Maximum dimensions: {field.rule.maxWidth ?? 0}×{field.rule.maxHeight ?? 0}px
              </>
            )}
          </div>
        )}
      </div>

      <FieldError
        message={
          state.errors?.[field.name]?.message
            ? String(state.errors[field.name]?.message)
            : undefined
        }
      />
    </div>
  );
});
