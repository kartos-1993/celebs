import { memo } from 'react';

import { MediaCropDialog } from '../../components/media-crop-dialog';
import { MediaLibraryButton } from '../../components/media-library-button';
import { useFieldErrorReveal } from '../../hooks/use-submission-state';
import type { UiProps } from '../ui-registry';

import { MultiImageGrid } from './multi-image-grid';
import { FieldError, LabelWithRequired } from './shared';
import { asAcceptList } from './shared-utils';
import { SingleCoverDropzone } from './single-cover-dropzone';
import { useMainImageState } from './use-main-image-state';

export const MainImageInputField = memo(function MainImageInputField({ field, control }: UiProps) {
  const state = useMainImageState({ field });
  // Inline errors are gated per FIELD, never per form: this cover anchor speaks
  // up on a submit attempt or once the cover field itself has been touched —
  // never because a sibling field was worked on.
  const { revealError } = useFieldErrorReveal(control);
  // The dropzones take the rule's MIME list (`accept?: string[]`) and resolve
  // the `accept` attribute themselves via `resolveAcceptAttr`, so they get the
  // list, not the hook's already-joined `state.acceptAttr` string. Both paths
  // render the identical attribute: a field's `rule.accept` allowlist reaches
  // the DOM, with `image/*` only as the no-rule fallback.
  const acceptList = asAcceptList(field.rule?.accept);
  const coverError = state.errors?.[field.name]?.message;
  const visibleError = coverError && revealError(field.name) ? String(coverError) : undefined;

  return (
    // `tabIndex={-1}`: this container is the cover field's error anchor, and
    // `form-focus`'s `element.focus()` is a no-op on a plain <div> — the
    // seller would be scrolled to the field and left with focus on <body>.
    // Out of the tab order, focusable programmatically.
    <div className="space-y-2 col-span-full" data-error-path={field.name} tabIndex={-1}>
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
            accept={acceptList}
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
            accept={acceptList}
            onReplaceFile={state.onReplaceFile}
            onRemoveFile={state.onRemoveFile}
            onAddFiles={state.onAddFiles}
            fileInputs={state.fileInputs}
          />
        )}

        <div className="text-xs leading-relaxed text-muted-foreground">
          Shared gallery for every colour. The first image here is the product cover; leave it empty
          to use the first colour photo instead. Per-colour galleries never override it.
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

      <FieldError message={visibleError} />
    </div>
  );
});
