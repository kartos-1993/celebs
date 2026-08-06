import React from 'react';
import { useFormContext, useController } from 'react-hook-form';
import { Pencil, Trash2, ImagePlus, Upload } from 'lucide-react';
import { Input } from '@celebs/shared-ui/components/input';
import type { FieldSpec, UiProps } from '../ui-registry';
import {
  LabelWithRequired,
  imageValueKey,
  uploadImageFiles,
  validateFileBasics,
  uploadErrorMessage,
  ImageValue,
} from './shared';

export function ColorInlineRow({
  color,
  namePrefix,
  accept,
  limits,
}: {
  color: string;
  namePrefix: string;
  accept?: string[];
  limits: { maxImages?: number; maxSize?: number };
}) {
  const {
    watch,
    setValue,
    trigger,
    register,
    formState,
    setError,
    clearErrors,
  } = useFormContext();
  const safeLimits = limits ?? {};
  const swatch: File | string | undefined = watch(`${namePrefix}.swatch`);
  const swatchUrl = React.useMemo(() => {
    if (!swatch) return null;
    if (typeof swatch === 'string') return swatch;
    return URL.createObjectURL(swatch);
  }, [swatch]);
  const images: ImageValue[] = watch(`${namePrefix}.images`) ?? [];
  const [isUploading, setIsUploading] = React.useState(false);
  const [urls, setUrls] = React.useState<string[]>([]);
  const imagesHash = (images || [])
    .map((f) => imageValueKey(f))
    .join(',');

  React.useEffect(() => {
    const next = (images || []).map((f) =>
      typeof f === 'string' ? f : URL.createObjectURL(f),
    );
    setUrls(next);
    return () => {
      next.forEach((u) => {
        if (u.startsWith('blob:')) URL.revokeObjectURL(u);
      });
    };
  }, [imagesHash]);

  React.useEffect(() => {
    register(`${namePrefix}.swatch` as any, {
      validate: (v: any) => {
        if (!v) return true;
        const ms =
          typeof safeLimits?.maxSize === 'number'
            ? safeLimits.maxSize
            : undefined;
        if (typeof ms === 'number' && v instanceof File && v.size > ms)
          return `Swatch must be <= ${Math.round(ms / 1024 / 1024)}MB`;
        return true;
      },
    });
    register(`${namePrefix}.images` as any, {
      validate: (v: any) => {
        const arr: ImageValue[] = Array.isArray(v) ? v : [];
        if (
          typeof safeLimits?.maxImages === 'number' &&
          arr.length > safeLimits.maxImages
        )
          return `Max ${safeLimits.maxImages} images`;
        const ms =
          typeof safeLimits?.maxSize === 'number'
            ? safeLimits.maxSize
            : undefined;
        if (
          typeof ms === 'number' &&
          arr.some((f) => f instanceof File && f.size > ms)
        )
          return `Each image must be <= ${Math.round(ms / 1024 / 1024)}MB`;
        return true;
      },
    });
  }, [namePrefix]);

  const uploadSwatch = async (file: File | null) => {
    if (!file) return;
    const err = validateFileBasics(file, {
      accept,
      maxSize: safeLimits.maxSize,
    });
    if (err) {
      setError(`${namePrefix}.swatch` as any, {
        type: 'validate',
        message: err,
      });
      return;
    }
    setIsUploading(true);
    try {
      const [uploadedUrl] = await uploadImageFiles([file]);
      setValue(`${namePrefix}.swatch`, uploadedUrl, {
        shouldDirty: true,
        shouldValidate: true,
      });
      clearErrors(`${namePrefix}.swatch` as any);
      trigger(`${namePrefix}.swatch`);
    } catch (error) {
      setError(`${namePrefix}.swatch` as any, {
        type: 'upload',
        message: uploadErrorMessage(error),
      });
    } finally {
      setIsUploading(false);
    }
  };

  const addFiles = async (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    const errors: string[] = [];
    const valids: File[] = [];
    incoming.forEach((file) => {
      const err = validateFileBasics(file, {
        accept,
        maxSize: safeLimits.maxSize,
      });
      if (err) errors.push(err);
      else valids.push(file);
    });
    if (valids.length === 0) {
      if (errors.length) {
        setError(`${namePrefix}.images` as any, {
          type: 'validate',
          message: errors[0],
        });
      }
      return;
    }
    setIsUploading(true);
    try {
      const uploadedUrls = await uploadImageFiles(valids);
      const current = (watch(`${namePrefix}.images`) ?? []) as ImageValue[];
      const next = [...current, ...uploadedUrls];
      setValue(`${namePrefix}.images`, next, {
        shouldDirty: true,
        shouldValidate: true,
      });
      clearErrors(`${namePrefix}.images` as any);
      trigger(`${namePrefix}.images`);
    } catch (error) {
      setError(`${namePrefix}.images` as any, {
        type: 'upload',
        message: uploadErrorMessage(error),
      });
    } finally {
      setIsUploading(false);
    }
  };

  const replaceAt = async (idx: number, file: File | null) => {
    if (!file) return;
    const err = validateFileBasics(file, {
      accept,
      maxSize: safeLimits.maxSize,
    });
    if (err) {
      setError(`${namePrefix}.images` as any, {
        type: 'validate',
        message: err,
      });
      return;
    }
    setIsUploading(true);
    try {
      const [uploadedUrl] = await uploadImageFiles([file]);
      const current = (watch(`${namePrefix}.images`) ?? []) as ImageValue[];
      const next = [...current];
      next[idx] = uploadedUrl;
      setValue(`${namePrefix}.images`, next, {
        shouldDirty: true,
        shouldValidate: true,
      });
      clearErrors(`${namePrefix}.images` as any);
      trigger(`${namePrefix}.images`);
    } catch (error) {
      setError(`${namePrefix}.images` as any, {
        type: 'upload',
        message: uploadErrorMessage(error),
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeAt = (idx: number) => {
    const next = images.filter((_, i) => i !== idx);
    setValue(`${namePrefix}.images`, next, {
      shouldDirty: true,
      shouldValidate: true,
    });
    trigger(`${namePrefix}.images`);
  };

  return (
    <div className="flex items-start gap-4 rounded border p-3">
      <div className="w-28">
        <div className="text-xs text-muted-foreground mb-1">Color Image</div>
        <label className="block h-8 w-8 rounded border overflow-hidden cursor-pointer">
          <input
            type="file"
            className="hidden"
            accept={Array.isArray(accept) ? accept.join(',') : undefined}
            onChange={(e) => {
              const input = e.currentTarget;
              void uploadSwatch(input.files?.[0] ?? null).finally(() => {
                input.value = '';
              });
            }}
          />
          {swatchUrl ? (
            <img
              src={swatchUrl}
              alt={`${color}-swatch`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full grid place-items-center text-xs text-muted-foreground">
              +
            </div>
          )}
        </label>
      </div>

      <div className="w-40">
        <div className="text-xs text-muted-foreground mb-1">Color</div>
        <Input value={color} readOnly className="capitalize" />
      </div>

      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Color Product Images
          </div>
          <div className="flex items-center gap-2 text-sm">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-blue-600 underline"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.multiple = true;
                input.accept = Array.isArray(accept) ? accept.join(',') : '';
                input.onchange = (e: any) => {
                  void addFiles(e.target.files);
                };
                input.click();
              }}
            >
              <Upload className="h-3 w-3" /> Upload
            </button>
            <span className="text-muted-foreground">|</span>
            <button
              type="button"
              className="text-blue-600 underline"
              onClick={() => {}}
            >
              Media Center
            </button>
          </div>
        </div>
        <div className="min-h-[56px] w-full rounded border border-dashed p-2">
          <div className="flex flex-wrap items-start gap-2">
            {urls.map((src, idx) => (
              <div
                key={idx}
                className="group relative h-12 w-12 overflow-hidden rounded border"
              >
                {src ? (
                  <img src={src} className="h-full w-full object-cover" />
                ) : null}
                <div className="absolute inset-0 hidden items-center justify-center gap-2 bg-black/40 group-hover:flex">
                  <button
                    type="button"
                    className="h-6 w-6 rounded bg-white/90 grid place-items-center"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = Array.isArray(accept)
                        ? accept.join(',')
                        : '';
                      input.onchange = (e: any) => {
                        void replaceAt(idx, e.target.files?.[0] ?? null);
                      };
                      input.click();
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    className="h-6 w-6 rounded bg-white/90 grid place-items-center text-red-600"
                    onClick={() => removeAt(idx)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
            <label className="grid h-12 w-12 cursor-pointer place-items-center rounded border text-xs text-muted-foreground hover:bg-accent/30">
              <input
                type="file"
                className="hidden"
                accept={Array.isArray(accept) ? accept.join(',') : undefined}
                multiple
                disabled={isUploading}
                onChange={(e) => {
                  const input = e.currentTarget;
                  void addFiles(input.files).finally(() => {
                    input.value = '';
                  });
                }}
              />
              {isUploading ? (
                <Upload className="h-4 w-4 animate-pulse" />
              ) : (
                <ImagePlus className="h-4 w-4" />
              )}
            </label>
          </div>
          {(formState.errors as any)?.[`${namePrefix}.images`] ? (
            <div className="text-xs text-red-500 mt-1">
              {
                (formState.errors as any)[`${namePrefix}.images`]
                  ?.message as string
              }
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ColorInlineInputField({ field }: UiProps) {
  const { watch } = useFormContext();
  const colorField: string =
    field.dataSource?.colorField ??
    field.dataSource?.variants?.find((v: any) =>
      /color/i.test(v?.label ?? v?.key),
    )?.key ??
    'color';
  const labelsMap: Record<string, Record<string, string>> = (field.dataSource
    ?.labels as any) ?? {};
  const labelOf = (value: string) =>
    labelsMap?.[colorField]?.[String(value)] ?? String(value);
  const accept: string[] | undefined = Array.isArray(field.rule?.accept)
    ? field.rule.accept
    : undefined;
  const limits = {
    maxImages:
      typeof field.rule?.maxItems === 'number'
        ? field.rule.maxItems
        : undefined,
    maxSize:
      typeof field.rule?.maxSize === 'number' ? field.rule.maxSize : undefined,
  } as { maxImages?: number; maxSize?: number };
  const selected = watch(colorField);
  const colors: string[] = Array.isArray(selected)
    ? selected
    : selected
      ? [selected]
      : [];
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <LabelWithRequired required={field.required}>
          {field.label}
        </LabelWithRequired>
        {limits.maxImages != null ? (
          <span className="text-xs text-muted-foreground">
            Max {limits.maxImages} images for each variant
          </span>
        ) : null}
      </div>
      {colors.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          Select one or more colors first.
        </div>
      ) : (
        <div className="space-y-2">
          {colors.map((c) => (
            <ColorInlineRow
              key={c}
              color={labelOf(c)}
              namePrefix={`variants.colorMeta.${c}`}
              accept={accept}
              limits={limits}
            />
          ))}
        </div>
      )}
    </div>
  );
}
