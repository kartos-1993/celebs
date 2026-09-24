import { useEffect, useMemo, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { useInvalidateMediaLibrary } from '../../hooks/use-media-assets';
import { isGalleryFilled } from '../../utils/add-product-helpers';

import {
  getPathError,
  ImageValue,
  imageValueKey,
  uploadErrorMessage,
  uploadImageFiles,
  validateFileBasics,
} from './shared';

interface UseColorInlineRowStateProps {
  color: string;
  namePrefix: string;
  accept?: string[];
  limits?: { maxImages?: number; maxSize?: number };
}

export function useColorInlineRowState({
  color,
  namePrefix,
  accept,
  limits,
}: UseColorInlineRowStateProps) {
  const { setValue, watch, register, trigger, formState, setError, clearErrors } = useFormContext();
  const swatchUrl: string = watch(`${namePrefix}.swatch`) || '';
  const images: ImageValue[] = watch(`${namePrefix}.images`) || [];
  const [isUploadingSwatch, setIsUploadingSwatch] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const invalidateMediaLibrary = useInvalidateMediaLibrary();

  const safeLimits = useMemo(() => limits || {}, [limits]);
  const maxImages = typeof safeLimits.maxImages === 'number' ? safeLimits.maxImages : undefined;
  const remainingSlots =
    typeof maxImages === 'number' ? Math.max(0, maxImages - images.length) : undefined;
  const canAddMore = typeof remainingSlots !== 'number' || remainingSlots > 0;

  const imagesHash = (images || []).map((file) => imageValueKey(file)).join('|');
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const imagesRef = useRef(images);
  imagesRef.current = images;

  useEffect(() => {
    let active = true;
    const currentImages = imagesRef.current || [];
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

  useEffect(() => {
    register(`${namePrefix}.swatch`);
    register(`${namePrefix}.images`, {
      validate: (v: unknown) => {
        const arr: ImageValue[] = Array.isArray(v) ? (v as ImageValue[]) : [];
        if (!isGalleryFilled(arr)) return `Upload at least one product image for ${color}`;
        if (typeof maxImages === 'number' && arr.length > maxImages)
          return `Max ${maxImages} images`;
        const ms = safeLimits.maxSize;
        if (typeof ms === 'number' && arr.some((f) => f instanceof File && f.size > ms))
          return `Each image must be <= ${Math.round(ms / 1024 / 1024)}MB`;
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

  const uploadSwatch = async (file: File | null) => {
    if (!file) return;
    const err = validateFileBasics(file, { accept, maxSize: safeLimits.maxSize });
    if (err) {
      setError(`${namePrefix}.swatch`, { type: 'validate', message: err });
      return;
    }
    setIsUploadingSwatch(true);
    try {
      const [uploadedUrl] = await uploadImageFiles([file]);
      invalidateMediaLibrary();
      setValue(`${namePrefix}.swatch`, uploadedUrl, { shouldDirty: true, shouldValidate: true });
      clearErrors(`${namePrefix}.swatch`);
      trigger(`${namePrefix}.swatch`);
    } catch (error) {
      setError(`${namePrefix}.swatch`, { type: 'upload', message: uploadErrorMessage(error) });
    } finally {
      setIsUploadingSwatch(false);
    }
  };

  const handleSwatchFromLibrary = (urls: string[]) => {
    const [url] = urls;
    if (!url) return;
    setValue(`${namePrefix}.swatch`, url, { shouldDirty: true, shouldValidate: true });
    clearErrors(`${namePrefix}.swatch`);
    trigger(`${namePrefix}.swatch`);
  };

  const addFiles = async (list: FileList | null) => {
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
    if (incoming.length > target.length) {
      setError(`${namePrefix}.images`, {
        type: 'validate',
        message: `Only ${target.length} of ${incoming.length} images added — Max ${maxImages}`,
      });
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
      invalidateMediaLibrary();
      appendImages(uploadedUrls);
    } catch (error) {
      setError(`${namePrefix}.images`, { type: 'upload', message: uploadErrorMessage(error) });
    } finally {
      setIsUploadingGallery(false);
    }
  };

  const replaceAt = async (idx: number, file: File | null) => {
    if (!file) return;
    const err = validateFileBasics(file, { accept, maxSize: safeLimits.maxSize });
    if (err) {
      setError(`${namePrefix}.images`, { type: 'validate', message: err });
      return;
    }
    setIsUploadingGallery(true);
    try {
      const [uploadedUrl] = await uploadImageFiles([file]);
      invalidateMediaLibrary();
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

  const removeAt = (idx: number) => {
    const next = images.filter((_, i) => i !== idx);
    setValue(`${namePrefix}.images`, next, { shouldDirty: true, shouldValidate: true });
    trigger(`${namePrefix}.images`);
  };

  const fieldErrors = formState.errors;
  const imagesError = getPathError(fieldErrors, `${namePrefix}.images`)?.message;
  const swatchError = getPathError(fieldErrors, `${namePrefix}.swatch`)?.message;
  const rowError = imagesError ?? swatchError;

  return {
    swatchUrl,
    images,
    imagePreviews,
    isUploadingSwatch,
    isUploadingGallery,
    remainingSlots,
    maxImages,
    canAddMore,
    uploadSwatch,
    handleSwatchFromLibrary,
    addFiles,
    replaceAt,
    removeAt,
    appendImages,
    setError,
    rowError,
  };
}
