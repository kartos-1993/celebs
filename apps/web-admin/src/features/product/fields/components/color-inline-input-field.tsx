import React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { ImagePlus, Trash2, Upload } from 'lucide-react';

import { Spinner } from '@celebs/shared-ui/components/spinner';

import type { UiProps } from '../ui-registry';

import {
  ImageValue,
  imageValueKey,
  LabelWithRequired,
  uploadErrorMessage,
  uploadImageFiles,
  validateFileBasics,
} from './shared';

interface ColorInlineRowProps {
  color: string;
  namePrefix: string;
  accept?: string[];
  limits?: { maxImages?: number; maxSize?: number };
}

function ColorInlineRow({ color, namePrefix, accept, limits }: ColorInlineRowProps) {
  const { setValue, watch, register, trigger, formState, setError, clearErrors } = useFormContext();
  const swatchUrl: string = watch(`${namePrefix}.swatch`) || '';
  const images: ImageValue[] = watch(`${namePrefix}.images`) || [];
  const [isUploadingSwatch, setIsUploadingSwatch] = React.useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = React.useState(false);
  const [swatchPreview, setSwatchPreview] = React.useState<string>('');
  const [imagePreviews, setImagePreviews] = React.useState<string[]>([]);
  const safeLimits = React.useMemo(() => limits || {}, [limits]);

  React.useEffect(() => {
    if (typeof swatchUrl === 'string') {
      setSwatchPreview(swatchUrl);
    }
  }, [swatchUrl]);

  const imagesHash = (images || []).map((file) => imageValueKey(file)).join('|');
  React.useEffect(() => {
    let active = true;
    const urls = (images || []).map((item) =>
      typeof item === 'string' ? item : URL.createObjectURL(item),
    );
    setImagePreviews(urls);
    return () => {
      active = false;
      urls.forEach((url, idx) => {
        if (typeof images?.[idx] !== 'string') {
          URL.revokeObjectURL(url);
        }
      });
      if (!active) setImagePreviews([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagesHash]);

  React.useEffect(() => {
    register(`${namePrefix}.swatch`);
    register(`${namePrefix}.images`, {
      validate: (v: unknown) => {
        const arr: ImageValue[] = Array.isArray(v) ? (v as ImageValue[]) : [];
        if (typeof safeLimits.maxImages === 'number' && arr.length > safeLimits.maxImages)
          return `Max ${safeLimits.maxImages} images`;
        const ms = safeLimits.maxSize;
        if (typeof ms === 'number' && arr.some((f) => f instanceof File && f.size > ms))
          return `Each image must be <= ${Math.round(ms / 1024 / 1024)}MB`;
        return true;
      },
    });
  }, [register, namePrefix, safeLimits]);

  const uploadSwatch = async (file: File | null) => {
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
    setIsUploadingSwatch(true);
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
      setIsUploadingSwatch(false);
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
        setError(`${namePrefix}.images`, {
          type: 'validate',
          message: errors[0],
        });
      }
      return;
    }
    setIsUploadingGallery(true);
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
      setIsUploadingGallery(false);
    }
  };

  const replaceAt = async (idx: number, file: File | null) => {
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
    setIsUploadingGallery(true);
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
      setIsUploadingGallery(false);
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

  const fieldErrors = formState.errors as Record<string, { message?: string }> | undefined;
  const imagesError = fieldErrors?.[`${namePrefix}.images`]?.message;

  return (
    <div className="flex items-start gap-4 rounded border p-3">
      <div className="w-28">
        <div className="text-xs text-muted-foreground mb-1">Color Image</div>
        <label className="block h-8 w-8 rounded border overflow-hidden cursor-pointer">
          <input
            type="file"
            className="hidden"
            accept={Array.isArray(accept) ? accept.join(',') : undefined}
            disabled={isUploadingSwatch}
            onChange={(e) => {
              const input = e.currentTarget;
              const file = input.files?.[0] || null;
              void uploadSwatch(file).finally(() => {
                input.value = '';
              });
            }}
          />
          {swatchPreview ? (
            <div className="relative h-full w-full">
              <img src={swatchPreview} alt={color} className="h-full w-full object-cover" />
              {isUploadingSwatch && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Spinner size="sm" className="text-white" />
                </div>
              )}
            </div>
          ) : (
            <div className="grid h-full w-full place-items-center bg-accent text-xs text-muted-foreground relative">
              {isUploadingSwatch ? (
                <Spinner size="sm" className="text-primary" />
              ) : (
                'Img'
              )}
            </div>
          )}
        </label>
      </div>

      <div className="flex-1">
        <div className="text-sm font-semibold mb-1">{color}</div>
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Gallery Images</div>
          <div className="flex flex-wrap items-center gap-2">
            {imagePreviews.map((src, idx) => (
              <div
                key={idx}
                className="group relative h-12 w-12 rounded border overflow-hidden bg-accent/20"
              >
                <img src={src} alt={`${color} ${idx + 1}`} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <label className="grid h-6 w-6 cursor-pointer place-items-center rounded bg-white/90 text-black">
                    <input
                      type="file"
                      className="hidden"
                      accept={Array.isArray(accept) ? accept.join(',') : undefined}
                      disabled={isUploadingGallery}
                      onChange={(e) => {
                        const input = e.currentTarget;
                        const file = input.files?.[0] || null;
                        void replaceAt(idx, file).finally(() => {
                          input.value = '';
                        });
                      }}
                    />
                    <Upload className="h-3 w-3" />
                  </label>
                  <button
                    type="button"
                    className="h-6 w-6 rounded bg-white/90 grid place-items-center text-destructive"
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
                disabled={isUploadingGallery}
                onChange={(e) => {
                  const input = e.currentTarget;
                  void addFiles(input.files).finally(() => {
                    input.value = '';
                  });
                }}
              />
              {isUploadingGallery ? (
                <div className="flex flex-col items-center justify-center text-primary gap-0.5">
                  <Spinner size="sm" />
                  <span className="text-xs font-medium">Uploading</span>
                </div>
              ) : (
                <ImagePlus className="h-4 w-4" />
              )}
            </label>
          </div>
          {imagesError ? (
            <div className="text-xs text-destructive mt-1">{String(imagesError)}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ColorInlineInputField({ field }: UiProps) {
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
    <div className="space-y-2">
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
