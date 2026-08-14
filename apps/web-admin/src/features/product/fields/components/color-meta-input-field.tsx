import React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Pencil, Trash2, ImagePlus, Upload } from 'lucide-react';
import { Button } from '@celebs/shared-ui/components/button';
import { Input } from '@celebs/shared-ui/components/input';
import type { UiProps } from '../ui-registry';
import {
  LabelWithRequired,
  imageValueKey,
  uploadImageFiles,
  validateFileBasics,
  uploadErrorMessage,
  ImageValue,
} from './shared';
import { useObjectUrl } from './use-object-url';

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
  const { setValue, watch, register, trigger, formState, setError, clearErrors } = useFormContext();
  const swatchVal: ImageValue | undefined = watch(`${namePrefix}.swatch`);
  const imagesVal: ImageValue[] = watch(`${namePrefix}.images`) || [];
  const [isUploading, setIsUploading] = React.useState(false);
  const [isEditingColor, setIsEditingColor] = React.useState(false);

  const swatchUrl = useObjectUrl(swatchVal);

  const imagesHash = (imagesVal || []).map((file) => imageValueKey(file)).join('|');
  const [imagePreviews, setImagePreviews] = React.useState<string[]>([]);
  const safeLimits = React.useMemo(() => limits || {}, [limits]);

  React.useEffect(() => {
    let active = true;
    const urls = (imagesVal || []).map((item) =>
      typeof item === 'string' ? item : URL.createObjectURL(item),
    );
    setImagePreviews(urls);
    return () => {
      active = false;
      urls.forEach((url, idx) => {
        if (typeof imagesVal?.[idx] !== 'string') {
          URL.revokeObjectURL(url);
        }
      });
      if (!active) setImagePreviews([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagesHash]);

  React.useEffect(() => {
    register(`${namePrefix}.swatch`, {
      validate: (v: unknown) => {
        if (!v) return true;
        const ms = typeof safeLimits?.maxSize === 'number' ? safeLimits.maxSize : undefined;
        if (typeof ms === 'number' && v instanceof File && v.size > ms)
          return `Swatch must be <= ${Math.round(ms / 1024 / 1024)}MB`;
        return true;
      },
    });
    register(`${namePrefix}.images`, {
      validate: (v: unknown) => {
        const arr: ImageValue[] = Array.isArray(v) ? (v as ImageValue[]) : [];
        if (typeof safeLimits?.maxImages === 'number' && arr.length > safeLimits.maxImages)
          return `Max ${safeLimits.maxImages} images`;
        const ms = typeof safeLimits?.maxSize === 'number' ? safeLimits.maxSize : undefined;
        if (typeof ms === 'number' && arr.some((f) => f instanceof File && f.size > ms)) {
          return `Each image must be <= ${Math.round(ms / 1024 / 1024)}MB`;
        }
        return true;
      },
    });
  }, [register, namePrefix, safeLimits]);

  const onSwatch = async (file: File | null) => {
    if (!file) return;
    const err = validateFileBasics(file, {
      accept,
      maxSize: safeLimits.maxSize,
    });
    if (err) {
      setError(`${namePrefix}.swatch`, {
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
      clearErrors(`${namePrefix}.swatch`);
      trigger(`${namePrefix}.swatch`);
    } catch (error) {
      setError(`${namePrefix}.swatch`, {
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
        setError(`${namePrefix}.images`, {
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
      clearErrors(`${namePrefix}.images`);
      trigger(`${namePrefix}.images`);
    } catch (error) {
      setError(`${namePrefix}.images`, {
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
      setError(`${namePrefix}.images`, {
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
      clearErrors(`${namePrefix}.images`);
      trigger(`${namePrefix}.images`);
    } catch (error) {
      setError(`${namePrefix}.images`, {
        type: 'upload',
        message: uploadErrorMessage(error),
      });
    } finally {
      setIsUploading(false);
    }
  };

  const onRemoveImage = (idx: number) => {
    const current = (watch(`${namePrefix}.images`) ?? []) as ImageValue[];
    const next = current.filter((_, i) => i !== idx);
    setValue(`${namePrefix}.images`, next, {
      shouldDirty: true,
      shouldValidate: true,
    });
    trigger(`${namePrefix}.images`);
  };

  const fieldErrors = formState.errors as Record<string, { message?: string }> | undefined;
  const swatchErr = fieldErrors?.[`${namePrefix}.swatch`]?.message;
  const imagesErr = fieldErrors?.[`${namePrefix}.images`]?.message;

  return (
    <div className="space-y-2 rounded border p-3 bg-background">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isEditingColor ? (
            <Input
              type="text"
              defaultValue={color}
              className="h-7 w-32 text-xs"
              onBlur={(e) => {
                const val = e.target.value.trim();
                setIsEditingColor(false);
                if (val && val !== color) {
                  setValue(`${namePrefix}.name`, val, { shouldDirty: true });
                }
              }}
            />
          ) : (
            <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
              {color}
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setIsEditingColor(true)}
              >
                <Pencil className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        {/* Swatch Image */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Color Swatch Image</label>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded border overflow-hidden bg-accent/20 flex items-center justify-center shrink-0">
              {swatchUrl ? (
                <img src={swatchUrl} alt={color} className="h-full w-full object-cover" />
              ) : (
                <span className="text-[10px] text-muted-foreground font-medium">None</span>
              )}
            </div>
            <label className="cursor-pointer">
              <input
                type="file"
                data-testid={`color-swatch-upload-${color}`}
                className="hidden"
                accept={Array.isArray(accept) ? accept.join(',') : undefined}
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  e.target.value = '';
                  void onSwatch(f);
                }}
              />
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs" asChild>
                <span>Upload</span>
              </Button>
            </label>
            {swatchVal ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-red-600"
                onClick={() => setValue(`${namePrefix}.swatch`, undefined, { shouldDirty: true })}
              >
                Clear
              </Button>
            ) : null}
          </div>
          {swatchErr ? <div className="text-xs text-red-500">{String(swatchErr)}</div> : null}
        </div>

        {/* Gallery Images */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Gallery Images</label>
          <div className="flex flex-wrap items-center gap-2">
            {imagePreviews.map((src, idx) => (
              <div
                key={idx}
                className="group relative h-10 w-10 rounded border overflow-hidden bg-accent/20"
              >
                <img src={src} alt={`${color} ${idx + 1}`} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <label className="grid h-5 w-5 cursor-pointer place-items-center rounded bg-white/90 text-black">
                    <input
                      type="file"
                      className="hidden"
                      accept={Array.isArray(accept) ? accept.join(',') : undefined}
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        e.target.value = '';
                        void onReplaceImage(idx, f);
                      }}
                    />
                    <Upload className="h-2.5 w-2.5" />
                  </label>
                  <button
                    type="button"
                    className="h-5 w-5 rounded bg-white/90 grid place-items-center text-red-600"
                    onClick={() => onRemoveImage(idx)}
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                </div>
              </div>
            ))}
            <label className="grid h-10 w-10 cursor-pointer place-items-center rounded border text-xs text-muted-foreground hover:bg-accent/30">
              <input
                type="file"
                data-testid={`color-gallery-upload-${color}`}
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
              {isUploading ? (
                <Upload className="h-3.5 w-3.5 animate-pulse" />
              ) : (
                <ImagePlus className="h-3.5 w-3.5" />
              )}
            </label>
          </div>
          {imagesErr ? <div className="text-xs text-red-500">{String(imagesErr)}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function ColorMetaInputField({ field }: UiProps) {
  const { setValue } = useFormContext();
  const dsVariants = Array.isArray(field.dataSource?.variants) ? field.dataSource.variants : [];
  const colorField: string =
    (field.dataSource?.colorField as string | undefined) ??
    (dsVariants as Array<{ label?: string; key?: string }>).find((v) =>
      /color/i.test(v?.label ?? v?.key ?? ''),
    )?.key ??
    'color';
  const labelsMap: Record<string, Record<string, string>> = (field.dataSource?.labels as Record<
    string,
    Record<string, string>
  >) ?? {};
  const labelOf = (value: string) => labelsMap?.[colorField]?.[String(value)] ?? String(value);
  const accept: string[] | undefined = Array.isArray(field.rule?.accept)
    ? (field.rule.accept as string[])
    : undefined;
  const limits = {
    maxImages: typeof field.rule?.maxItems === 'number' ? field.rule.maxItems : undefined,
    maxSize: typeof field.rule?.maxSize === 'number' ? field.rule.maxSize : undefined,
  } as { maxImages?: number; maxSize?: number };
  const selected = useWatch({ name: colorField });
  const colors: string[] = Array.isArray(selected)
    ? (selected as string[])
    : selected
      ? [String(selected)]
      : [];

  return (
    <div className="space-y-2 col-span-full">
      <div className="flex items-center gap-2 text-sm">
        <LabelWithRequired required={field.required}>{field.label}</LabelWithRequired>
        {limits.maxImages != null ? (
          <span className="text-xs text-muted-foreground">
            Max {limits.maxImages} images for each variant
          </span>
        ) : null}
      </div>

      {colors.length === 0 ? (
        <div className="text-sm text-muted-foreground">Select one or more colors first.</div>
      ) : (
        <div className="space-y-2">
          {colors.map((c) => (
            <div key={c} className="rounded border p-2">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="font-semibold text-xs text-foreground">{labelOf(c)}</div>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    className="text-xs text-red-600"
                    onClick={() => {
                      const updated = colors.filter((x) => x !== c);
                      setValue(colorField, updated, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                      setValue(`variants.colorMeta.${c}`, undefined, {
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
                  color={labelOf(c)}
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
