import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Plus, X, UploadCloud, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@celebs/shared-ui/components/button';
import type { UiProps } from '../ui-registry';
import {
  imageValueKey,
  uploadImageFiles,
  uploadErrorMessage,
  ImageValue,
} from './shared';

export function MainImageInputField({ field }: UiProps) {
  const { setValue, watch, register, trigger, formState, setError, clearErrors } = useFormContext();
  const rawFiles = watch(field.name);
  const files: ImageValue[] = React.useMemo(() => rawFiles ?? [], [rawFiles]);
  const [previews, setPreviews] = React.useState<string[]>([]);
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputs = React.useRef<Array<HTMLInputElement | null>>([]);
  const filesHash = (files || []).map((file) => imageValueKey(file)).join('|');

  const getDims = React.useCallback((file: File) => {
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

  const prevalidateFile = React.useCallback(
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
        } catch (_e) {
          return `Could not inspect ${file.name} dimensions`;
        }
      }
      return null;
    },
    [field.rule, getDims],
  );

  React.useEffect(() => {
    register(field.name, {
      validate: (v: unknown) => {
        const arr: ImageValue[] = Array.isArray(v) ? (v as ImageValue[]) : [];
        if (field.required && arr.length === 0) return `${field.label} is required`;
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

  React.useEffect(() => {
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

  const onAddFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Array.from(e.target.files || []);
    if (raw.length === 0) return;

    e.target.value = '';

    const currentCount = (watch(field.name) ?? []).length;
    const max = typeof field.rule?.maxItems === 'number' ? field.rule.maxItems : 1;
    const slots = Math.max(0, max - currentCount);

    if (slots === 0) {
      setError(field.name, {
        type: 'validate',
        message: `Maximum allowed is ${max} image(s)`,
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
  };

  const onReplaceFile = async (idx: number, f: File | null) => {
    if (!f) return;
    const err = await prevalidateFile(f);

    if (err) {
      setError(field.name, { type: 'validate', message: err });
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
  };

  const onRemoveFile = (idx: number) => {
    const current = (watch(field.name) ?? []) as ImageValue[];
    const next = current.filter((_, i) => i !== idx);
    setValue(field.name, next, { shouldValidate: true, shouldDirty: true });
    clearErrors(field.name);
    trigger(field.name);
  };

  const maxItems = typeof field.rule?.maxItems === 'number' ? field.rule.maxItems : 1;
  const isSingle = maxItems === 1;

  return (
    <div className="space-y-2 col-span-full">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-foreground">
          {field.label}
          {field.required ? <span className="ml-1 text-red-500">*</span> : null}
        </label>
        <span className="text-[11px] text-muted-foreground">
          {previews.length}/{maxItems} uploaded
        </span>
      </div>

      <div className="space-y-3">
        {/* Single File Mode */}
        {isSingle ? (
          <div className="relative">
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
              <button
                type="button"
                onClick={() => fileInputs.current[0]?.click()}
                disabled={isUploading}
                className="w-full h-36 rounded-xl border border-dashed bg-muted/10 hover:bg-muted/30 transition-colors flex flex-col items-center justify-center p-4 text-center cursor-pointer border-muted-foreground/30 hover:border-primary/50"
              >
                {isUploading ? (
                  <div className="flex flex-col items-center gap-2 text-primary">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="text-xs font-semibold">Uploading Image...</span>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-xs font-bold text-foreground">Click to upload image</span>
                    <span className="text-[11px] text-muted-foreground mt-0.5">
                      JPG, PNG, WEBP supported
                    </span>
                  </>
                )}
              </button>
            )}
            <input
              ref={(el) => { fileInputs.current[0] = el; }}
              type="file"
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
                  ref={(el) => { fileInputs.current[idx] = el; }}
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
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                ) : (
                  <>
                    <Plus className="h-5 w-5 text-muted-foreground mb-1" />
                    <span className="text-xs font-semibold text-foreground">Add Image</span>
                  </>
                )}
                <input
                  type="file"
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
          <div className="text-[11px] text-muted-foreground">
            Max size: {Math.round(((typeof field.rule.maxSize === 'number' ? field.rule.maxSize : 5242880) / 1024 / 1024))}MB.
            {field.rule.minWidth || field.rule.minHeight ? (
              <>
                {' '}
                • Recommended minimum:{' '}
                {field.rule.minWidth ?? 0}×{field.rule.minHeight ?? 0}px
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

      {formState.errors?.[field.name]?.message ? (
        <div className="text-xs text-red-500">
          {String(formState.errors[field.name]?.message)}
        </div>
      ) : null}
    </div>
  );
}
