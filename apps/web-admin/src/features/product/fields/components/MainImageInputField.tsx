import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Pencil, Trash2, ImagePlus, Upload } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@celebs/shared-ui/components/tooltip';
import type { UiProps } from '../UiRegistry';
import {
  LabelWithRequired,
  imageValueKey,
  uploadImageFiles,
  validateFileBasics,
  uploadErrorMessage,
  ImageValue,
} from './shared';

export function MainImageInputField({ field }: UiProps) {
  const {
    setValue,
    watch,
    register,
    trigger,
    formState,
    setError,
    clearErrors,
  } = useFormContext();
  const files: ImageValue[] = watch(field.name) ?? [];
  const [previews, setPreviews] = React.useState<string[]>([]);
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputs = React.useRef<Array<HTMLInputElement | null>>([]);
  const filesHash = (files || [])
    .map((file) => imageValueKey(file))
    .join('|');

  const getDims = React.useCallback((file: File) => {
    return new Promise<{ w: number; h: number }>((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || (img as any).width;
        const h = img.naturalHeight || (img as any).height;
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

  const aspectOk = (w: number, h: number) => {
    const rule = field.rule || {};
    const ratioStr: string | undefined = rule.aspectRatio;
    if (!ratioStr) return true;
    const [rw, rh] = ratioStr.split(':').map((n: string) => Number(n) || 0);
    if (!rw || !rh) return true;
    const expected = rw / rh;
    const actual = w / h;
    if (typeof rule.ratioTolerance === 'number') {
      const tol = rule.ratioTolerance;
      return Math.abs(actual - expected) <= tol * expected;
    }
    return true;
  };

  React.useEffect(() => {
    register(field.name as any, {
      validate: (v: any) => {
        const arr: ImageValue[] = Array.isArray(v) ? v : [];
        if (field.required && arr.length === 0)
          return `${field.label} is required`;
        if (
          typeof field.rule?.maxItems === 'number' &&
          arr.length > field.rule.maxItems
        )
          return `Max ${field.rule.maxItems} images`;
        if (
          Array.isArray(field.rule?.accept) &&
          arr.some((f) => f instanceof File && !field.rule.accept.includes(f.type))
        )
          return 'Invalid file type';
        if (
          typeof field.rule?.maxSize === 'number' &&
          arr.some((f) => f instanceof File && f.size > field.rule.maxSize)
        )
          return `Each image must be <= ${Math.round(field.rule.maxSize / 1024 / 1024)}MB`;
        return true;
      },
    });
    const urls = (files || []).map((f) =>
      typeof f === 'string' ? f : URL.createObjectURL(f),
    );
    setPreviews((prev) => {
      prev.forEach((u) => {
        if (u.startsWith('blob:')) URL.revokeObjectURL(u);
      });
      return urls;
    });
    return () => {
      urls.forEach((u) => {
        if (u.startsWith('blob:')) URL.revokeObjectURL(u);
      });
    };
  }, [filesHash]);

  const prevalidateFile = async (f: File): Promise<string | null> => {
    const rule = field.rule || {};
    if (typeof rule?.maxSize === 'number' && f.size > rule.maxSize)
      return `Each image must be <= ${Math.round(rule.maxSize / 1024 / 1024)}MB`;
    if (Array.isArray(rule?.accept) && !rule.accept.includes(f.type))
      return 'Invalid file type';
    if (
      typeof rule?.minWidth === 'number' ||
      typeof rule?.minHeight === 'number' ||
      typeof rule?.maxWidth === 'number' ||
      typeof rule?.maxHeight === 'number' ||
      !!rule?.aspectRatio
    ) {
      try {
        const { w, h } = await getDims(f);
        if (typeof rule.minWidth === 'number' && w < rule.minWidth)
          return `Width must be >= ${rule.minWidth}px`;
        if (typeof rule.minHeight === 'number' && h < rule.minHeight)
          return `Height must be >= ${rule.minHeight}px`;
        if (typeof rule.maxWidth === 'number' && w > rule.maxWidth)
          return `Width must be <= ${rule.maxWidth}px`;
        if (typeof rule.maxHeight === 'number' && h > rule.maxHeight)
          return `Height must be <= ${rule.maxHeight}px`;
        if (!aspectOk(w, h))
          return `Image aspect ratio should be ${rule.aspectRatio}`;
      } catch {
        return 'Could not read image dimensions';
      }
    }
    return null;
  };

  const onAddFiles = async (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    const errors: string[] = [];
    const valids: File[] = [];

    for (const f of incoming) {
      const err = await prevalidateFile(f);
      if (err) errors.push(err);
      else valids.push(f);
    }

    if (valids.length === 0) {
      if (errors.length) {
        setError(field.name as any, {
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
      clearErrors(field.name as any);
      trigger(field.name);
    } catch (error) {
      setError(field.name as any, {
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
      setError(field.name as any, { type: 'validate', message: err });
      return;
    }

    setIsUploading(true);

    try {
      const [uploadedUrl] = await uploadImageFiles([f]);
      const current = (watch(field.name) ?? []) as ImageValue[];
      const next = [...current];
      next[idx] = uploadedUrl;
      setValue(field.name, next, { shouldValidate: true, shouldDirty: true });
      clearErrors(field.name as any);
      trigger(field.name);
    } catch (error) {
      setError(field.name as any, {
        type: 'upload',
        message: uploadErrorMessage(error),
      });
    } finally {
      setIsUploading(false);
    }
  };

  const onDelete = (idx: number) => {
    const next = (files || []).filter((_, i) => i !== idx);
    setValue(field.name, next, { shouldValidate: true, shouldDirty: true });
    trigger(field.name);
  };

  const addInputRef = React.useRef<HTMLInputElement | null>(null);

  return (
    <div className="space-y-2">
      <LabelWithRequired required={field.required}>
        {field.label}
      </LabelWithRequired>
      <div className="rounded border p-3">
        <div className="flex flex-wrap items-start gap-2">
          {previews.map((src, idx) => (
            <TooltipProvider key={idx}>
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <div className="relative group h-20 w-20 rounded border overflow-hidden">
                    <img
                      src={src}
                      alt={`image-${idx}`}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 hidden items-center justify-center gap-2 bg-black/40 group-hover:flex">
                      <button
                        type="button"
                        className="inline-flex h-6 w-6 items-center justify-center rounded bg-white/90 shadow hover:bg-white"
                        onClick={() => fileInputs.current[idx]?.click()}
                        aria-label="Edit image"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-6 w-6 items-center justify-center rounded bg-white/90 shadow hover:bg-white text-red-600"
                        onClick={() => onDelete(idx)}
                        aria-label="Delete image"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <input
                      ref={(el) => {
                        fileInputs.current[idx] = el;
                      }}
                      type="file"
                      accept={
                        Array.isArray(field.rule?.accept)
                          ? field.rule.accept.join(',')
                          : undefined
                      }
                      className="hidden"
                      onChange={(e) =>
                        onReplaceFile(idx, e.target.files?.[0] ?? null)
                      }
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="p-2">
                  <div className="w-64">
                    <img
                      src={src}
                      alt={`preview-${idx}`}
                      className="w-full h-auto rounded"
                    />
                    <div className="mt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80"
                        onClick={() => fileInputs.current[idx]?.click()}
                      >
                        <Pencil className="h-3 w-3" /> Edit
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100"
                        onClick={() => onDelete(idx)}
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
          <label
            className={`grid h-20 w-20 cursor-pointer place-items-center rounded border text-sm text-muted-foreground hover:bg-accent/30 ${
              isUploading ? 'pointer-events-none opacity-60' : ''
            }`}
          >
            <input
              ref={addInputRef}
              type="file"
              className="hidden"
              accept={
                Array.isArray(field.rule?.accept)
                  ? field.rule.accept.join(',')
                  : undefined
              }
              multiple
              disabled={isUploading}
              onChange={(e) => {
                const input = e.currentTarget;
                void onAddFiles(input.files).finally(() => {
                  input.value = '';
                });
              }}
            />
            {isUploading ? (
              <Upload className="h-5 w-5 animate-pulse" />
            ) : (
              <ImagePlus className="h-5 w-5" />
            )}
          </label>
        </div>
        {field.rule?.maxItems != null ||
        Array.isArray(field.rule?.accept) ||
        field.rule?.maxSize != null ||
        field.rule?.aspectRatio ||
        field.rule?.minWidth ||
        field.rule?.minHeight ||
        field.rule?.maxWidth ||
        field.rule?.maxHeight ? (
          <div className="mt-2 text-xs text-muted-foreground">
            {field.rule?.maxItems != null ? (
              <>Max {field.rule.maxItems} images</>
            ) : null}
            {Array.isArray(field.rule?.accept) ? (
              <>
                {' '}
                {field.rule?.maxItems != null ? ' • ' : ''}Accepted:{' '}
                {field.rule.accept.join(', ')}
                {field.rule?.maxSize != null ? (
                  <>
                    {' '}
                    • Max size ~{' '}
                    {Math.round((field.rule?.maxSize || 0) / 1024 / 1024)}MB
                  </>
                ) : null}
              </>
            ) : field.rule?.maxSize != null ? (
              <>
                {' '}
                {field.rule?.maxItems != null ? ' • ' : ''}Max size ~{' '}
                {Math.round((field.rule?.maxSize || 0) / 1024 / 1024)}MB
              </>
            ) : null}
            {field.rule?.aspectRatio ? (
              <> • Recommended aspect ratio: {field.rule.aspectRatio}</>
            ) : null}
            {field.rule?.minWidth || field.rule?.minHeight ? (
              <>
                {' '}
                • Minimum dimensions: {field.rule?.minWidth ?? 0}×
                {field.rule?.minHeight ?? 0}px
              </>
            ) : null}
            {field.rule?.maxWidth || field.rule?.maxHeight ? (
              <>
                {' '}
                • Maximum dimensions: {field.rule?.maxWidth ?? 0}×
                {field.rule?.maxHeight ?? 0}px
              </>
            ) : null}
          </div>
        ) : null}
      </div>
      {formState.errors?.[field.name as any] ? (
        <div className="text-xs text-red-500">
          {(formState.errors as any)[field.name]?.message as string}
        </div>
      ) : null}
    </div>
  );
}
