/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { AlertCircle, ImagePlus, Trash2, Upload } from 'lucide-react';

import { Label } from '@celebs/shared-ui/components/label';
export {
  type ImageValue,
  imageValueKey,
  rulesFrom,
  uploadErrorMessage,
  uploadImageFiles,
  validateFileBasics,
} from './shared-utils';

export function LabelWithRequired({
  children,
  required,
  htmlFor,
}: {
  children: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <Label htmlFor={htmlFor} className="font-medium">
      <span>{children}</span>
      {required ? <span className="ml-1 text-destructive">*</span> : null}
    </Label>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="mt-1 flex items-start gap-1 text-xs font-medium text-destructive"
    >
      <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

interface ErrorLike {
  message?: string;
  type?: string;
}

/**
 * React Hook Form stores errors as a NESTED tree (`errors.a.b.c.message`),
 * while fields registered under dynamic paths (e.g. `variants.colorMeta.Red.images`)
 * only know their dotted path. Resolve the path segment by segment.
 */
export function getPathError(
  errors: unknown,
  path: string,
): ErrorLike | undefined {
  if (!errors || typeof errors !== 'object') return undefined;
  const resolved = path
    .split('.')
    .reduce<unknown>((acc, key) => {
      if (acc === null || acc === undefined || typeof acc !== 'object') return undefined;
      return (acc as Record<string, unknown>)[key];
    }, errors);
  if (resolved && typeof resolved === 'object' && 'message' in (resolved as ErrorLike)) {
    return resolved as ErrorLike;
  }
  return undefined;
}

// ── Compact image tiles shared by color variant rows ────────────────────────

const TILE = 'h-12 w-12';

export function VariantThumb({
  src,
  alt,
  accept,
  disabled,
  onReplace,
  onRemove,
}: {
  src: string;
  alt: string;
  accept?: string;
  disabled?: boolean;
  onReplace: (file: File | null) => void;
  onRemove: () => void;
}) {
  return (
    <div className={`group relative ${TILE} shrink-0 overflow-hidden rounded-md border bg-accent/20`}>
      <img src={src} alt={alt} className="h-full w-full object-cover" />
      <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
        <label className="grid h-6 w-6 cursor-pointer place-items-center rounded bg-white/90 text-black" title="Replace">
          <input
            type="file"
            className="hidden"
            accept={accept}
            disabled={disabled}
            onChange={(e) => {
              const input = e.currentTarget;
              onReplace(input.files?.[0] || null);
              input.value = '';
            }}
          />
          <Upload className="h-3 w-3" />
        </label>
        <button
          type="button"
          title="Remove"
          className="grid h-6 w-6 place-items-center rounded bg-white/90 text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export function AddFromFileTile({
  accept,
  multiple,
  disabled,
  testId,
  onFiles,
}: {
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  testId?: string;
  onFiles: (files: FileList | null) => void;
}) {
  return (
    <label
      className={`grid ${TILE} shrink-0 cursor-pointer place-items-center rounded-md border border-dashed border-border text-muted-foreground transition-colors hover:border-primary/60 hover:bg-accent/30`}
      title="Upload from device"
    >
      <input
        type="file"
        data-testid={testId}
        className="hidden"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(e) => {
          const input = e.currentTarget;
          onFiles(input.files);
          input.value = '';
        }}
      />
      <ImagePlus className="h-4 w-4" />
    </label>
  );
}


