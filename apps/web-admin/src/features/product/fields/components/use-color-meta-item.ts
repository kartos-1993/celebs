import React from 'react';
import { useFormContext } from 'react-hook-form';

import {
  ImageValue,
  imageValueKey,
  uploadErrorMessage,
  uploadImageFiles,
  validateFileBasics,
} from './shared';
import { useObjectUrl } from './use-object-url';

export interface UseColorMetaItemOptions {
  color: string;
  namePrefix: string;
  accept?: string[];
  limits?: { maxImages?: number; maxSize?: number };
}

export function useColorMetaItem({ color, namePrefix, accept, limits }: UseColorMetaItemOptions) {
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
  const imagesValRef = React.useRef(imagesVal);
  imagesValRef.current = imagesVal;

  React.useEffect(() => {
    let active = true;
    const currentImages = imagesValRef.current || [];
    const urls = currentImages.map((item) =>
      typeof item === 'string' ? item : URL.createObjectURL(item),
    );
    setImagePreviews(urls);
    return () => {
      active = false;
      urls.forEach((url, idx) => {
        if (typeof currentImages[idx] !== 'string') {
          URL.revokeObjectURL(url);
        }
      });
      if (!active) setImagePreviews([]);
    };
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
      setError(`${namePrefix}.images`, { type: 'validate', message: `Max ${maxImages} images` });
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
      if (errors.length) setError(`${namePrefix}.images`, { type: 'validate', message: errors[0] });
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
    setValue(
      `${namePrefix}.images`,
      current.filter((_, i) => i !== idx),
      {
        shouldDirty: true,
        shouldValidate: true,
      },
    );
    trigger(`${namePrefix}.images`);
  };

  const onUpdateColorName = (val: string) => {
    setIsEditingColor(false);
    if (val && val !== color) {
      setValue(`${namePrefix}.name`, val, { shouldDirty: true });
    }
  };

  const onSetSwatchFromUrl = (url?: string) => {
    if (!url) return;
    setValue(`${namePrefix}.swatch`, url, { shouldDirty: true, shouldValidate: true });
    clearErrors(`${namePrefix}.swatch`);
    trigger(`${namePrefix}.swatch`);
  };

  return {
    swatchUrl,
    imagesVal,
    imagePreviews,
    isUploadingSwatch,
    isUploadingGallery,
    isEditingColor,
    setIsEditingColor,
    canAddMore,
    remainingSlots,
    maxImages,
    formErrors: formState.errors,
    onSwatch,
    onAddImages,
    onReplaceImage,
    onRemoveImage,
    appendImages,
    onUpdateColorName,
    onSetSwatchFromUrl,
  };
}
