import { useEffect, useMemo, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { useInvalidateMediaLibrary } from '../../hooks/use-media-assets';
import { isGalleryFilled } from '../../utils/add-product-helpers';

import {
  ImageValue,
  imageValueKey,
  uploadErrorMessage,
  uploadImageFiles,
  validateFileBasics,
} from './shared';
import { getPathError, isHttpUrl, toImageValues, validateLibraryUrl } from './shared-utils';

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
        const arr = toImageValues(v);
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
    // COVER ORDER CANONICAL CONTRACT: cover = mainImages[0] ??
    // first-color-gallery-image — appended gallery images feed that fallback
    // in first-seen order; truncation below must error (never silent slice).
    const incoming = urls.filter(Boolean);
    const invalid = incoming.find((u) => !isHttpUrl(u) || validateLibraryUrl(u, { accept }));
    if (invalid) {
      setError(`${namePrefix}.images`, {
        type: 'validate',
        message: validateLibraryUrl(invalid, { accept }) ?? `"${invalid}" is not a valid image URL`,
      });
      return;
    }
    const current = toImageValues(watch(`${namePrefix}.images`)).filter(
      (v) => v !== '' && v !== null && v !== undefined,
    );
    if (typeof maxImages === 'number' && current.length + incoming.length > maxImages) {
      const room = Math.max(0, maxImages - current.length);
      const dropped = incoming.slice(room);
      setError(`${namePrefix}.images`, {
        type: 'validate',
        message: `Only ${room} of ${incoming.length} images kept — Max ${maxImages} (${dropped.join(', ')} not added)`,
      });
      return;
    }
    const next = [...current, ...incoming];
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
    // Library picks get the same accept/URL validation as file picks — a
    // swatch typed by URL is exactly the same field value.
    const acceptErr = isHttpUrl(url)
      ? validateLibraryUrl(url, { accept })
      : `"${url}" is not a valid image URL`;
    if (acceptErr) {
      setError(`${namePrefix}.swatch`, { type: 'validate', message: acceptErr });
      return;
    }
    setValue(`${namePrefix}.swatch`, url, { shouldDirty: true, shouldValidate: true });
    clearErrors(`${namePrefix}.swatch`);
    trigger(`${namePrefix}.swatch`);
  };

  const addFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const incoming = Array.from(list);
    const slots = typeof remainingSlots === 'number' ? remainingSlots : incoming.length;
    const target = incoming.slice(0, slots);
    const droppedFiles = incoming.slice(slots);

    if (target.length === 0) {
      setError(`${namePrefix}.images`, {
        type: 'validate',
        message: `Max ${maxImages} images`,
      });
      return;
    }
    const overflowMessage =
      droppedFiles.length > 0
        ? `Only ${target.length} of ${incoming.length} images added — Max ${maxImages} (${droppedFiles.map((f) => f.name).join(', ')} not added)`
        : null;
    if (overflowMessage) {
      setError(`${namePrefix}.images`, { type: 'validate', message: overflowMessage });
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
      // Settle validation before writing the overflow notice (which names the
      // dropped files): the async validation from setValue/trigger would
      // otherwise clear it a microtask later.
      if (overflowMessage) {
        await trigger(`${namePrefix}.images`);
        setError(`${namePrefix}.images`, { type: 'validate', message: overflowMessage });
      }
    } catch (error) {
      setError(`${namePrefix}.images`, { type: 'upload', message: uploadErrorMessage(error) });
    } finally {
      setIsUploadingGallery(false);
    }
  };

  const replaceAt = async (idx: number, file: File | null) => {
    if (!file) return;
    const current = toImageValues(watch(`${namePrefix}.images`));
    if (!Number.isInteger(idx) || idx < 0 || idx >= current.length) {
      setError(`${namePrefix}.images`, {
        type: 'validate',
        message: `Cannot replace image at position ${idx} — only ${current.length} image(s) present`,
      });
      return;
    }
    if (typeof maxImages === 'number' && idx >= maxImages) {
      setError(`${namePrefix}.images`, {
        type: 'validate',
        message: `Cannot replace image at position ${idx} — Max ${maxImages} images`,
      });
      return;
    }
    const err = validateFileBasics(file, { accept, maxSize: safeLimits.maxSize });
    if (err) {
      setError(`${namePrefix}.images`, { type: 'validate', message: err });
      return;
    }
    setIsUploadingGallery(true);
    try {
      const [uploadedUrl] = await uploadImageFiles([file]);
      invalidateMediaLibrary();
      const current = toImageValues(watch(`${namePrefix}.images`));
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
