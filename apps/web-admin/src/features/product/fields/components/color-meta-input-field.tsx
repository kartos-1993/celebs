import React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import { Input } from '@celebs/shared-ui/components/input';
import { Spinner } from '@celebs/shared-ui/components/spinner';

import { MediaLibraryButton } from '../../components/media-library-button';
import type { UiProps } from '../ui-registry';

import {
  AddFromFileTile,
  FieldError,
  getPathError,
  ImageValue,
  imageValueKey,
  LabelWithRequired,
  uploadErrorMessage,
  uploadImageFiles,
  validateFileBasics,
  VariantThumb,
} from './shared';
import { useObjectUrl } from './use-object-url';

function joinAccept(accept?: string[]) {
  return Array.isArray(accept) ? accept.join(',') : undefined;
}

export function ColorMetaItem({
  color,
  namePrefix,
  accept,
  limits,
  onRemove,
}: {
  color: string;
  namePrefix: string;
  accept?: string[];
  limits?: { maxImages?: number; maxSize?: number };
  onRemove?: () => void;
}) {
  const { setValue, watch, register, trigger, formState, setError, clearErrors } = useFormContext();
  const swatchVal: ImageValue | undefined = watch(`${namePrefix}.swatch`);
  const imagesVal: ImageValue[] = watch(`${namePrefix}.images`) || [];
  const [isUploadingSwatch, setIsUploadingSwatch] = React.useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = React.useState(false);
  const [isEditingColor, setIsEditingColor] = React.useState(false);

  const swatchUrl = useObjectUrl(swatchVal);
  const safeLimits = React.useMemo(() => limits || {}, [limits]);
  const maxImages = typeof safeLimits.maxImages === 'number' ? safeLimits.maxImages : undefined;
  const remainingSlots =
    typeof maxImages === 'number' ? Math.max(0, maxImages - imagesVal.length) : undefined;
  const canAddMore = typeof remainingSlots !== 'number' || remainingSlots > 0;

  const imagesHash = (imagesVal || []).map((file) => imageValueKey(file)).join('|');
  const [imagePreviews, setImagePreviews] = React.useState<string[]>([]);

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
        if (arr.length === 0) return `Upload at least one product image for ${color}`;
        if (typeof maxImages === 'number' && arr.length > maxImages)
          return `Max ${maxImages} images`;
        const ms = typeof safeLimits?.maxSize === 'number' ? safeLimits.maxSize : undefined;
        if (typeof ms === 'number' && arr.some((f) => f instanceof File && f.size > ms)) {
          return `Each image must be <= ${Math.round(ms / 1024 / 1024)}MB`;
        }
        return true;
      },
    });
  }, [register, namePrefix, safeLimits, maxImages, color]);

  const appendImages = (urls: string[]) => {
    const next = [...((watch(`${namePrefix}.images`) ?? []) as ImageValue[]), ...urls];
    setValue(`${namePrefix}.images`, next, { shouldDirty: true, shouldValidate: true });
    clearErrors(`${namePrefix}.images`);
    trigger(`${namePrefix}.images`);
  };

  const onSwatch = async (file: File | null) => {
    if (!file) return;
    const err = validateFileBasics(file, { accept, maxSize: safeLimits.maxSize });
    if (err) {
      setError(`${namePrefix}.swatch`, { type: 'validate', message: err });
      return;
    }
    setIsUploadingSwatch(true);
    try {
      const [uploadedUrl] = await uploadImageFiles([file]);
      setValue(`${namePrefix}.swatch`, uploadedUrl, { shouldDirty: true, shouldValidate: true });
      clearErrors(`${namePrefix}.swatch`);
      trigger(`${namePrefix}.swatch`);
    } catch (error) {
      setError(`${namePrefix}.swatch`, { type: 'upload', message: uploadErrorMessage(error) });
    } finally {
      setIsUploadingSwatch(false);
    }
  };

  const onAddImages = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const incoming = Array.from(list);
    const slots = typeof remainingSlots === 'number' ? remainingSlots : incoming.length;
    const target = incoming.slice(0, slots);

    if (target.length === 0) {
      setError(`${namePrefix}.images`, {
        type: 'validate',
        message: `Max ${maxImages} images`,
      });
      return;
    }

    const errors: string[] = [];
    const valids: File[] = [];
    target.forEach((file) => {
      const err = validateFileBasics(file, { accept, maxSize: safeLimits.maxSize });
      if (err) errors.push(err);
      else valids.push(file);
    });
    if (valids.length === 0) {
      if (errors.length) {
        setError(`${namePrefix}.images`, { type: 'validate', message: errors[0] });
      }
      return;
    }
    setIsUploadingGallery(true);
    try {
      const uploadedUrls = await uploadImageFiles(valids);
      appendImages(uploadedUrls);
    } catch (error) {
      setError(`${namePrefix}.images`, { type: 'upload', message: uploadErrorMessage(error) });
    } finally {
      setIsUploadingGallery(false);
    }
  };

  const onReplaceImage = async (idx: number, file: File | null) => {
    if (!file) return;
    const err = validateFileBasics(file, { accept, maxSize: safeLimits.maxSize });
    if (err) {
      setError(`${namePrefix}.images`, { type: 'validate', message: err });
      return;
    }
    setIsUploadingGallery(true);
    try {
      const [uploadedUrl] = await uploadImageFiles([file]);
      const current = (watch(`${namePrefix}.images`) ?? []) as ImageValue[];
      const next = [...current];
      next[idx] = uploadedUrl;
      setValue(`${namePrefix}.images`, next, { shouldDirty: true, shouldValidate: true });
      clearErrors(`${namePrefix}.images`);
      trigger(`${namePrefix}.images`);
    } catch (error) {
      setError(`${namePrefix}.images`, { type: 'upload', message: uploadErrorMessage(error) });
    } finally {
      setIsUploadingGallery(false);
    }
  };

  const onRemoveImage = (idx: number) => {
    const current = (watch(`${namePrefix}.images`) ?? []) as ImageValue[];
    const next = current.filter((_, i) => i !== idx);
    setValue(`${namePrefix}.images`, next, { shouldDirty: true, shouldValidate: true });
    trigger(`${namePrefix}.images`);
  };

  const handleSwatchFromLibrary = (urls: string[]) => {
    const [url] = urls;
    if (!url) return;
    setValue(`${namePrefix}.swatch`, url, { shouldDirty: true, shouldValidate: true });
    clearErrors(`${namePrefix}.swatch`);
    trigger(`${namePrefix}.swatch`);
  };

  const handleGalleryFromLibrary = (urls: string[]) => {
    const capped = typeof remainingSlots === 'number' ? urls.slice(0, remainingSlots) : urls;
    if (!capped.length) return;
    appendImages(capped);
  };

  const fieldErrors = formState.errors;
  const swatchErr = getPathError(fieldErrors, `${namePrefix}.swatch`)?.message;
  const imagesErr = getPathError(fieldErrors, `${namePrefix}.images`)?.message;
  const acceptStr = joinAccept(accept);
  const rowError = imagesErr ?? swatchErr;

  return (
    <div className="px-3 py-2.5" data-error-path={`${namePrefix}.images`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {/* Swatch — click to upload */}
        <label
          className="relative block h-11 w-11 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-border/70 bg-accent/20 transition-colors hover:border-primary/50"
          title={swatchUrl ? 'Replace swatch image' : 'Upload swatch image'}
        >
          <input
            type="file"
            data-testid={`color-swatch-upload-${color}`}
            className="hidden"
            accept={acceptStr}
            disabled={isUploadingSwatch}
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              e.target.value = '';
              void onSwatch(f);
            }}
          />
          {swatchUrl ? (
            <img src={swatchUrl} alt={`${color} swatch`} className="h-full w-full object-cover" />
          ) : (
            <span className="grid h-full w-full place-items-center text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
              Swatch
            </span>
          )}
          {isUploadingSwatch ? (
            <span className="absolute inset-0 grid place-items-center bg-black/60">
              <Spinner size="sm" className="text-white" />
            </span>
          ) : null}
        </label>

        {/* Name */}
        {isEditingColor ? (
          <Input
            type="text"
            defaultValue={color}
            autoFocus
            className="h-8 w-32 text-xs"
            onBlur={(e) => {
              const val = e.target.value.trim();
              setIsEditingColor(false);
              if (val && val !== color) {
                setValue(`${namePrefix}.name`, val, { shouldDirty: true });
              }
            }}
          />
        ) : (
          <>
            <span className="flex items-center gap-1 text-sm font-medium text-foreground">
              {color}
              <button
                type="button"
                title="Rename color"
                className="text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setIsEditingColor(true)}
              >
                <Pencil className="h-3 w-3" />
              </button>
            </span>
            {!swatchUrl ? (
              <MediaLibraryButton
                label="Set swatch"
                maxSelect={1}
                scope="PRODUCT"
                initialSelectedUrls={[]}
                disabled={isUploadingSwatch}
                onSelect={handleSwatchFromLibrary}
              />
            ) : null}
          </>
        )}

        {/* Product images */}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {imagePreviews.map((src, idx) => (
            <VariantThumb
              key={idx}
              src={src}
              alt={`${color} ${idx + 1}`}
              accept={acceptStr}
              disabled={isUploadingGallery}
              onReplace={(file) => void onReplaceImage(idx, file)}
              onRemove={() => onRemoveImage(idx)}
            />
          ))}
          {isUploadingGallery ? (
            <span className="grid h-12 w-12 place-items-center rounded-md border border-dashed border-border">
              <Spinner size="sm" className="text-primary" />
            </span>
          ) : (
            canAddMore && (
              <AddFromFileTile
                testId={`color-gallery-upload-${color}`}
                accept={acceptStr}
                multiple
                onFiles={(files) => void onAddImages(files)}
              />
            )
          )}
          {canAddMore ? (
            <MediaLibraryButton
              maxSelect={typeof remainingSlots === 'number' ? Math.max(1, remainingSlots) : 8}
              scope="PRODUCT"
              initialSelectedUrls={imagesVal.filter((v): v is string => typeof v === 'string')}
              onSelect={handleGalleryFromLibrary}
            />
          ) : null}
          {!canAddMore ? (
            <span className="text-[11px] text-muted-foreground">Max {maxImages} reached</span>
          ) : null}
        </div>

        {/* Meta */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {imagesVal.length}
            {maxImages != null ? ` / ${maxImages}` : ''}
          </span>
          {onRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              title={`Remove ${color}`}
              onClick={onRemove}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      </div>

      {rowError ? (
        <div className="pt-1.5">
          <FieldError message={rowError} />
        </div>
      ) : null}
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
        <div className="rounded-xl border border-dashed border-border/70 px-4 py-5 text-center text-xs text-muted-foreground">
          Select one or more colors first — each color gets its own swatch and product images.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-background">
          <div className="divide-y divide-border/60">
            {colors.map((c) => (
              <ColorMetaItem
                key={c}
                color={labelOf(c)}
                namePrefix={`variants.colorMeta.${c}`}
                accept={accept}
                limits={limits}
                onRemove={() => {
                  const updated = colors.filter((x) => x !== c);
                  setValue(colorField, updated, { shouldDirty: true, shouldValidate: true });
                  setValue(`variants.colorMeta.${c}`, undefined, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
