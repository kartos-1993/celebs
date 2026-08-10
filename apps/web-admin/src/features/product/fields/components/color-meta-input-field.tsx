import React from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { Pencil, Trash2, ImagePlus, Upload } from 'lucide-react';
import { Checkbox } from '@celebs/shared-ui/components/checkbox';
import { Button } from '@celebs/shared-ui/components/button';
import { Input } from '@celebs/shared-ui/components/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@celebs/shared-ui/components/tooltip';
import type { UiProps } from '../ui-registry';
import {
  LabelWithRequired,
  imageValueKey,
  uploadImageFiles,
  validateFileBasics,
  uploadErrorMessage,
  ImageValue,
} from './shared';

export function useObjectUrl(file: File | string | undefined) {
  const [url, setUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!file) return setUrl(null);
    if (typeof file === 'string') return setUrl(file);
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}

export function ColorMetaItem({
  color,
  namePrefix,
  accept,
  limits,
}: {
  color: string;
  namePrefix: string;
  accept?: string[];
  limits?: { maxImages?: number; maxSize?: number };
}) {
  const { control, setValue, watch, register, trigger, setError, clearErrors } = useFormContext();
  const { field: hot } = useController({ name: `${namePrefix}.hot`, control });
  const swatch: File | string | undefined = watch(`${namePrefix}.swatch`);
  const images: ImageValue[] = watch(`${namePrefix}.images`) ?? [];
  const swatchUrl = useObjectUrl(swatch);
  const [isUploading, setIsUploading] = React.useState(false);
  const [imageUrls, setImageUrls] = React.useState<string[]>([]);
  const imagesHash = (images || []).map((f) => imageValueKey(f)).join(',');

  React.useEffect(() => {
    const urls = (images || []).map((img) =>
      typeof img === 'string' ? img : URL.createObjectURL(img),
    );
    setImageUrls(urls);
    return () => {
      urls.forEach((u) => {
        if (u.startsWith('blob:')) URL.revokeObjectURL(u);
      });
    };
  }, [imagesHash]);

  const safeLimits = limits ?? {};

  React.useEffect(() => {
    register(`${namePrefix}.swatch` as any, {
      validate: (v: any) => {
        if (!v) return true;
        const ms = typeof safeLimits?.maxSize === 'number' ? safeLimits.maxSize : undefined;
        if (typeof ms === 'number' && v instanceof File && v.size > ms)
          return `Swatch must be <= ${Math.round(ms / 1024 / 1024)}MB`;
        return true;
      },
    });
    register(`${namePrefix}.images` as any, {
      validate: (v: any) => {
        const arr: ImageValue[] = Array.isArray(v) ? v : [];
        if (typeof safeLimits?.maxImages === 'number' && arr.length > safeLimits.maxImages)
          return `Max ${safeLimits.maxImages} images`;
        const ms = typeof safeLimits?.maxSize === 'number' ? safeLimits.maxSize : undefined;
        if (typeof ms === 'number' && arr.some((f) => f instanceof File && f.size > ms)) {
          return `Each image must be <= ${Math.round(ms / 1024 / 1024)}MB`;
        }
        return true;
      },
    });
  }, [namePrefix]);

  const onSwatch = async (file: File | null) => {
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

  const onAddImages = async (list: FileList | null) => {
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

  const onReplaceImage = async (idx: number, file: File | null) => {
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

  const onDeleteImage = (idx: number) => {
    const next = images.filter((_, i) => i !== idx);
    setValue(`${namePrefix}.images`, next, {
      shouldDirty: true,
      shouldValidate: true,
    });
    trigger(`${namePrefix}.images`);
  };

  return (
    <div className="rounded border p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="font-medium capitalize">{color}</div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={!!hot.value} onCheckedChange={(v) => hot.onChange(!!v)} />
          <span>Hot</span>
        </label>
      </div>

      <div className="flex items-start gap-4">
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Swatch</div>
          <label className="block h-12 w-12 rounded border overflow-hidden cursor-pointer">
            <input
              type="file"
              className="hidden"
              accept={Array.isArray(accept) ? accept.join(',') : undefined}
              disabled={isUploading}
              onChange={(e) => {
                const input = e.currentTarget;
                void onSwatch(input.files?.[0] ?? null).finally(() => {
                  input.value = '';
                });
              }}
            />
            {swatchUrl ? (
              <img src={swatchUrl} alt={`${color}-swatch`} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full grid place-items-center text-xs text-muted-foreground">
                +
              </div>
            )}
          </label>
        </div>

        <div className="flex-1 space-y-1">
          <div className="text-xs text-muted-foreground">Product images</div>
          <div className="flex flex-wrap items-start gap-2">
            {images.map((_, idx) => {
              const url = imageUrls[idx];
              return (
                <TooltipProvider key={idx}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative group h-16 w-16 rounded border overflow-hidden">
                        {url ? (
                          <img
                            src={url}
                            alt={`${color}-img-${idx}`}
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                        <div className="absolute bottom-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            className="inline-flex h-6 w-6 items-center justify-center rounded bg-white/90 shadow"
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = Array.isArray(accept) ? accept.join(',') : '';
                              input.onchange = (e: any) => {
                                void onReplaceImage(idx, e.target.files?.[0] ?? null);
                              };
                              input.click();
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-6 w-6 items-center justify-center rounded bg-white/90 shadow text-red-600"
                            onClick={() => onDeleteImage(idx)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="p-2">
                      <div className="w-64">
                        {url ? (
                          <img src={url} alt={`preview-${idx}`} className="w-full h-auto rounded" />
                        ) : null}
                        <div className="mt-2 flex justify-end gap-2">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80"
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = Array.isArray(accept) ? accept.join(',') : '';
                              input.onchange = (e: any) => {
                                void onReplaceImage(idx, e.target.files?.[0] ?? null);
                              };
                              input.click();
                            }}
                          >
                            <Pencil className="h-3 w-3" /> Edit
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100"
                            onClick={() => onDeleteImage(idx)}
                          >
                            <Trash2 className="h-3 w-3" /> Delete
                          </button>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
            <label className="grid h-12 w-12 cursor-pointer place-items-center rounded border text-xs text-muted-foreground hover:bg-accent/30">
              <input
                type="file"
                className="hidden"
                accept={Array.isArray(accept) ? accept.join(',') : undefined}
                multiple
                disabled={isUploading}
                onChange={(e) => {
                  const input = e.currentTarget;
                  void onAddImages(input.files).finally(() => {
                    input.value = '';
                  });
                }}
              />
              <ImagePlus className="h-4 w-4" />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ColorMetaInputField({ field }: UiProps) {
  const { watch, setValue, setError, clearErrors, trigger } = useFormContext();
  const colorField: string =
    field.dataSource?.colorField ??
    field.dataSource?.variants?.find((v: any) => /color/i.test(v?.label ?? v?.key))?.key ??
    'color';
  const labelsMap: Record<string, Record<string, string>> = (field.dataSource?.labels as any) ?? {};
  const labelOf = (value: string) => labelsMap?.[colorField]?.[String(value)] ?? String(value);

  const accept: string[] | undefined = Array.isArray(field.rule?.accept)
    ? field.rule?.accept
    : undefined;
  const limits = {
    maxImages: typeof field.rule?.maxItems === 'number' ? field.rule?.maxItems : undefined,
    maxSize: typeof field.rule?.maxSize === 'number' ? field.rule?.maxSize : undefined,
  } as { maxImages?: number; maxSize?: number };

  const selected = watch(colorField);
  const colors: string[] = Array.isArray(selected) ? selected : selected ? [selected] : [];

  const uploadColorImages = async (colorValue: string, list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    const errors: string[] = [];
    const valids: File[] = [];
    incoming.forEach((file) => {
      const err = validateFileBasics(file, {
        accept,
        maxSize: limits.maxSize,
      });
      if (err) errors.push(err);
      else valids.push(file);
    });
    const prefix = `variants.colorMeta.${colorValue}`;
    if (valids.length === 0) {
      if (errors.length) {
        setError(`${prefix}.images` as any, {
          type: 'validate',
          message: errors[0],
        });
      }
      return;
    }
    try {
      const uploadedUrls = await uploadImageFiles(valids);
      const prev: ImageValue[] = watch(`${prefix}.images`) ?? [];
      setValue(`${prefix}.images`, [...prev, ...uploadedUrls], {
        shouldDirty: true,
        shouldValidate: true,
      });
      clearErrors(`${prefix}.images` as any);
      trigger(`${prefix}.images`);
    } catch (error) {
      setError(`${prefix}.images` as any, {
        type: 'upload',
        message: uploadErrorMessage(error),
      });
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <LabelWithRequired required={field.required}>{field.label}</LabelWithRequired>
        {limits.maxImages != null || limits.maxSize != null ? (
          <div className="text-xs text-muted-foreground">
            {limits.maxImages != null ? `Max ${limits.maxImages} images` : ''}
            {limits.maxImages != null && limits.maxSize != null ? ' • ' : ''}
            {limits.maxSize != null
              ? `Max size ~ ${Math.round((limits.maxSize || 0) / 1024 / 1024)}MB`
              : ''}
          </div>
        ) : null}
      </div>
      {colors.length === 0 ? (
        <div className="text-sm text-muted-foreground">Select one or more colors first.</div>
      ) : (
        <div className="space-y-2">
          {colors.map((c) => (
            <div key={c} className="rounded border p-2">
              <div className="flex items-center gap-2">
                <Input value={labelOf(c)} readOnly className="capitalize" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.multiple = true;
                    input.accept = Array.isArray(accept) ? accept.join(',') : '';
                    input.onchange = (e: any) => {
                      void uploadColorImages(c, e.target.files);
                    };
                    input.click();
                  }}
                >
                  +
                </Button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-blue-600 text-sm underline"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.multiple = true;
                    input.accept = Array.isArray(accept) ? accept.join(',') : '';
                    input.onchange = (e: any) => {
                      void uploadColorImages(c, e.target.files);
                    };
                    input.click();
                  }}
                >
                  <Upload className="h-3 w-3" /> Upload
                </button>
                <span className="text-muted-foreground">|</span>
                <button
                  type="button"
                  className="text-blue-600 text-sm underline"
                  onClick={() => {}}
                >
                  Media Center
                </button>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    className="text-red-600"
                    onClick={() => {
                      const updated = colors.filter((x) => x !== c);
                      setValue(colorField, updated, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                      setValue(`variants.colorMeta.${c}`, undefined as any, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="mt-2">
                <ColorMetaItem
                  color={c}
                  namePrefix={`variants.colorMeta.${c}`}
                  accept={accept}
                  limits={limits}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
