import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Plus, RefreshCw, UploadCloud, X } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import { Spinner } from '@celebs/shared-ui/components/spinner';

import { MediaCropDialog } from '../../components/media-crop-dialog';
import { MediaLibraryButton } from '../../components/media-library-button';
import type { UiProps } from '../ui-registry';

import { FieldError, ImageValue, imageValueKey, LabelWithRequired,uploadErrorMessage, uploadImageFiles } from './shared';

export const MainImageInputField = memo(function MainImageInputField({ field }: UiProps) {
  const { setValue, watch, register, trigger, formState, setError, clearErrors } = useFormContext();

  const maxItems = useMemo(
    () => (typeof field.rule?.maxItems === 'number' ? field.rule.maxItems : 1),
    [field.rule?.maxItems],
  );
  const isSingle = maxItems === 1;

  const rawFiles = watch(field.name);
  const files: ImageValue[] = useMemo(() => rawFiles ?? [], [rawFiles]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [croppingFile, setCroppingFile] = useState<{ file: File; replaceIndex?: number } | null>(
    null,
  );
  const fileInputs = useRef<Array<HTMLInputElement | null>>([]);
  const filesHash = useMemo(
    () => (files || []).map((file) => imageValueKey(file)).join('|'),
    [files],
  );

  const getDims = useCallback((file: File) => {
    return new Promise<{ w: number; h: number }>((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || (img as HTMLImageElement).width;
        const h = img.naturalHeight || (img as HTMLImageElement).height;
        URL.revokeObjectURL(url);
        resolve({ w, h });
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(e);
      };
      img.src = url;
    });
  }, []);

  const checkAspectRatio = useCallback(
    async (file: File): Promise<{ needsCrop: boolean }> => {
      try {
        const dims = await getDims(file);
        const ratio = dims.w / dims.h;
        // Standard 3:4 is 0.75; accept reasonable tolerance between 0.70 and 0.80
        return { needsCrop: ratio < 0.70 || ratio > 0.80 };
      } catch {
        return { needsCrop: false };
      }
    },
    [getDims],
  );

  const prevalidateFile = useCallback(
    async (file: File) => {
      const rule = field.rule || {};
      if (typeof rule.maxSize === 'number' && file.size > rule.maxSize) {
        return `${file.name} exceeds max size ${Math.round(rule.maxSize / 1024 / 1024)}MB`;
      }
      if (Array.isArray(rule.accept) && !rule.accept.includes(file.type)) {
        return `${file.name} is not an accepted image format`;
      }

      if (rule.minWidth || rule.minHeight || rule.maxWidth || rule.maxHeight) {
        try {
          const dims = await getDims(file);
          const minW = typeof rule.minWidth === 'number' ? rule.minWidth : undefined;
          const minH = typeof rule.minHeight === 'number' ? rule.minHeight : undefined;
          const maxW = typeof rule.maxWidth === 'number' ? rule.maxWidth : undefined;
          const maxH = typeof rule.maxHeight === 'number' ? rule.maxHeight : undefined;
          if (typeof minW === 'number' && dims.w < minW) return `${file.name} width < ${minW}px`;
          if (typeof minH === 'number' && dims.h < minH) return `${file.name} height < ${minH}px`;
          if (typeof maxW === 'number' && dims.w > maxW) return `${file.name} width > ${maxW}px`;
          if (typeof maxH === 'number' && dims.h > maxH) return `${file.name} height > ${maxH}px`;
        } catch {
          return `Could not inspect ${file.name} dimensions`;
        }
      }
      return null;
    },
    [field.rule, getDims],
  );

  useEffect(() => {
    register(field.name, {
      validate: (v: unknown) => {
        const arr: ImageValue[] = Array.isArray(v) ? (v as ImageValue[]) : [];
        // Main product image is always mandatory regardless of schema flags
        if (arr.length === 0) return `${field.label} is required`;
        if (typeof field.rule?.maxItems === 'number' && arr.length > field.rule.maxItems)
          return `Max ${field.rule.maxItems} images`;
        if (
          Array.isArray(field.rule?.accept) &&
          arr.some((f) => f instanceof File && !(field.rule?.accept as string[]).includes(f.type))
        ) {
          return 'One or more files have invalid formats';
        }
        return true;
      },
    });
  }, [register, field.name, field.required, field.label, field.rule]);

  useEffect(() => {
    let active = true;

    const urls = (files || []).map((item) =>
      typeof item === 'string' ? item : URL.createObjectURL(item),
    );
    setPreviews(urls);

    return () => {
      active = false;
      urls.forEach((url, idx) => {
        if (typeof files?.[idx] !== 'string') {
          URL.revokeObjectURL(url);
        }
      });
      if (!active) setPreviews([]);
    };
  }, [filesHash, files]);

  const onAddFiles = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = Array.from(e.target.files || []);
      if (raw.length === 0) return;

      e.target.value = '';

      const currentCount = (watch(field.name) ?? []).length;
      const slots = Math.max(0, maxItems - currentCount);

      if (slots === 0) {
        setError(field.name, {
          type: 'validate',
          message: `Maximum allowed is ${maxItems} image(s)`,
        });
        return;
      }

      const targetFiles = raw.slice(0, slots);
      const valids: File[] = [];
      const errors: string[] = [];

      for (const f of targetFiles) {
        const err = await prevalidateFile(f);
        if (err) errors.push(err);
        else valids.push(f);
      }

      if (valids.length === 0) {
        if (errors.length) {
          setError(field.name, {
            type: 'validate',
            message: errors[0],
          });
        }
        return;
      }

      // Check if any valid image needs 3:4 cropping
      for (const f of valids) {
        const { needsCrop } = await checkAspectRatio(f);
        if (needsCrop) {
          setCroppingFile({ file: f });
          return;
        }
      }

      setIsUploading(true);

      try {
        const uploadedUrls = await uploadImageFiles(valids);
        const current = (watch(field.name) ?? []) as ImageValue[];
        const next = [...current, ...uploadedUrls];
        setValue(field.name, next, { shouldValidate: true, shouldDirty: true });
        clearErrors(field.name);
        trigger(field.name);
      } catch (error) {
        setError(field.name, {
          type: 'upload',
          message: uploadErrorMessage(error),
        });
      } finally {
        setIsUploading(false);
      }
    },
    [
      watch,
      field.name,
      maxItems,
      prevalidateFile,
      checkAspectRatio,
      setValue,
      clearErrors,
      trigger,
      setError,
    ],
  );

  const onReplaceFile = useCallback(
    async (idx: number, f: File | null) => {
      if (!f) return;
      const err = await prevalidateFile(f);

      if (err) {
        setError(field.name, { type: 'validate', message: err });
        return;
      }

      const { needsCrop } = await checkAspectRatio(f);
      if (needsCrop) {
        setCroppingFile({ file: f, replaceIndex: idx });
        return;
      }

      setIsUploading(true);

      try {
        const [uploadedUrl] = await uploadImageFiles([f]);
        const current = (watch(field.name) ?? []) as ImageValue[];
        const next = [...current];
        next[idx] = uploadedUrl;
        setValue(field.name, next, { shouldValidate: true, shouldDirty: true });
        clearErrors(field.name);
        trigger(field.name);
      } catch (error) {
        setError(field.name, {
          type: 'upload',
          message: uploadErrorMessage(error),
        });
      } finally {
        setIsUploading(false);
      }
    },
    [
      prevalidateFile,
      checkAspectRatio,
      setError,
      field.name,
      watch,
      setValue,
      clearErrors,
      trigger,
    ],
  );

  const handleCropComplete = useCallback(
    async (croppedFile: File) => {
      const replaceIdx = croppingFile?.replaceIndex;
      setCroppingFile(null);
      setIsUploading(true);

      try {
        const [uploadedUrl] = await uploadImageFiles([croppedFile]);
        const current = (watch(field.name) ?? []) as ImageValue[];
        let next: ImageValue[];

        if (typeof replaceIdx === 'number') {
          next = [...current];
          next[replaceIdx] = uploadedUrl;
        } else {
          next = [...current, uploadedUrl];
        }

        setValue(field.name, next, { shouldValidate: true, shouldDirty: true });
        clearErrors(field.name);
        trigger(field.name);
      } catch (error) {
        setError(field.name, {
          type: 'upload',
          message: uploadErrorMessage(error),
        });
      } finally {
        setIsUploading(false);
      }
    },
    [croppingFile, watch, field.name, setValue, clearErrors, trigger, setError],
  );

  const onRemoveFile = useCallback(
    (idx: number) => {
      const current = (watch(field.name) ?? []) as ImageValue[];
      const next = current.filter((_, i) => i !== idx);
      setValue(field.name, next, { shouldValidate: true, shouldDirty: true });
      clearErrors(field.name);
      trigger(field.name);
    },
    [watch, field.name, setValue, clearErrors, trigger],
  );

  const handlePickerSelect = useCallback(
    (urls: string[]) => {
      if (!urls.length) return;
      let next: string[];
      if (isSingle) {
        next = [urls[0]];
      } else {
        const currentUrls = (files || []).map((f) => (typeof f === 'string' ? f : ''));
        next = Array.from(new Set([...currentUrls.filter(Boolean), ...urls])).slice(0, maxItems);
      }
      setValue(field.name, next, { shouldDirty: true, shouldValidate: true });
      clearErrors(field.name);
      trigger(field.name);
    },
    [isSingle, files, maxItems, setValue, field.name, clearErrors, trigger],
  );

  return (
      <div className="space-y-2 col-span-full" data-error-path={field.name}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LabelWithRequired required={field.required}>{field.label}</LabelWithRequired>
            <MediaLibraryButton
              maxSelect={maxItems}
              scope="PRODUCT"
              initialSelectedUrls={previews.filter((v): v is string => typeof v === 'string')}
              disabled={isUploading}
              onSelect={handlePickerSelect}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {previews.length}/{maxItems} uploaded
          </span>
        </div>

        <MediaCropDialog
          open={croppingFile !== null}
          file={croppingFile?.file ?? null}
          onCropComplete={handleCropComplete}
          onCancel={() => setCroppingFile(null)}
        />


      <div className="space-y-3">
        {/* Single File Mode */}
        {isSingle ? (
          <div className="space-y-2">
            {previews[0] ? (
              <div className="group relative w-full h-44 rounded-xl border bg-muted/20 overflow-hidden">
                <img
                  src={previews[0]}
                  alt="Product Main Preview"
                  className="w-full h-full object-contain p-2"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-8 gap-1 text-xs"
                    onClick={() => fileInputs.current[0]?.click()}
                    disabled={isUploading}
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Replace
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="h-8 gap-1 text-xs"
                    onClick={() => onRemoveFile(0)}
                    disabled={isUploading}
                  >
                    <X className="h-3.5 w-3.5" /> Remove
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => fileInputs.current[0]?.click()}
                  disabled={isUploading}
                  className="h-auto w-full flex-row items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/10 hover:bg-muted/30 px-4 py-3 text-center cursor-pointer border-muted-foreground/30 hover:border-primary/50"
                >
                  {isUploading ? (
                    <>
                      <Spinner size="sm" className="text-primary" />
                      <span className="text-xs font-semibold text-primary">Uploading…</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                      <span className="text-sm font-medium text-foreground">Click to upload</span>
                      <span className="text-xs text-muted-foreground">· PNG, JPG or WEBP</span>
                    </>
                  )}
                </Button>
                {!isUploading ? (
                  <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    Already have assets?
                    <MediaLibraryButton
                      maxSelect={1}
                      scope="PRODUCT"
                      initialSelectedUrls={previews.filter(
                        (v): v is string => typeof v === 'string',
                      )}
                      onSelect={handlePickerSelect}
                    />
                  </p>
                ) : null}
              </>
            )}
            <input
              ref={(el) => {
                fileInputs.current[0] = el;
              }}
              type="file"
              data-testid="main-image-upload-input"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                e.target.value = '';
                if (previews[0]) onReplaceFile(0, f);
                else onAddFiles(e);
              }}
            />
          </div>
        ) : (
          /* Multi File Grid Mode */
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {previews.map((src, idx) => (
              <div
                key={idx}
                className="group relative h-28 rounded-xl border bg-muted/20 overflow-hidden"
              >
                <img src={src} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => fileInputs.current[idx]?.click()}
                    disabled={isUploading}
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onRemoveFile(idx)}
                    disabled={isUploading}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <input
                  ref={(el) => {
                    fileInputs.current[idx] = el;
                  }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    e.target.value = '';
                    onReplaceFile(idx, f);
                  }}
                />
              </div>
            ))}

            {previews.length < maxItems && (
              <label className="h-28 rounded-xl border border-dashed bg-muted/10 hover:bg-muted/30 transition-colors flex flex-col items-center justify-center cursor-pointer border-muted-foreground/30 hover:border-primary/50 text-center p-2">
                {isUploading ? (
                  <Spinner size="lg" className="text-primary" />
                ) : (
                  <>
                    <Plus className="h-5 w-5 text-muted-foreground mb-1" />
                    <span className="text-xs font-semibold text-foreground">Add Image</span>
                  </>
                )}
                <input
                  type="file"
                  data-testid="main-image-upload-input"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={onAddFiles}
                  disabled={isUploading}
                />
              </label>
            )}
          </div>
        )}

        {/* Specifications Footer */}
        {field.rule ? (
          <div className="text-xs text-muted-foreground">
            Max size:{' '}
            {Math.round(
              (typeof field.rule.maxSize === 'number' ? field.rule.maxSize : 5242880) / 1024 / 1024,
            )}
            MB.
            {field.rule.minWidth || field.rule.minHeight ? (
              <>
                {' '}
                • Recommended minimum: {field.rule.minWidth ?? 0}×{field.rule.minHeight ?? 0}px
              </>
            ) : null}
            {field.rule.maxWidth || field.rule.maxHeight ? (
              <>
                {' '}
                • Maximum dimensions: {field.rule.maxWidth ?? 0}×{field.rule.maxHeight ?? 0}px
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <FieldError
        message={
          formState.errors?.[field.name]?.message
            ? String(formState.errors[field.name]?.message)
            : undefined
        }
      />
    </div>
  );
});
