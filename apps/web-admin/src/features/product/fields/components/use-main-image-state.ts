import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { useInvalidateMediaLibrary } from '../../hooks/use-media-assets';
import { isGalleryFilled } from '../../utils/add-product-helpers';
import type { UiProps } from '../ui-registry';

import { ImageValue, imageValueKey, uploadErrorMessage, uploadImageFiles } from './shared';

interface UseMainImageStateProps {
  field: UiProps['field'];
}

export function useMainImageState({ field }: UseMainImageStateProps) {
  const { setValue, watch, register, trigger, formState, setError, clearErrors } = useFormContext();

  const maxItems = useMemo(
    () => (typeof field.rule?.maxItems === 'number' ? field.rule.maxItems : 1),
    [field.rule?.maxItems],
  );
  const isSingle = maxItems === 1;

  const rawFiles = watch(field.name);
  const files: ImageValue[] = useMemo(() => rawFiles ?? [], [rawFiles]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const invalidateMediaLibrary = useInvalidateMediaLibrary();
  const [croppingFile, setCroppingFile] = useState<{ file: File; replaceIndex?: number } | null>(
    null,
  );
  const fileInputs = useRef<Array<HTMLInputElement | null>>([]);
  const filesHash = useMemo(
    () => (files || []).map((file) => imageValueKey(file)).join('|'),
    [files],
  );

  const getDims = useCallback((file: File) => {
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

  const checkAspectRatio = useCallback(
    async (file: File): Promise<{ needsCrop: boolean }> => {
      try {
        const dims = await getDims(file);
        const ratio = dims.w / dims.h;
        return { needsCrop: ratio < 0.7 || ratio > 0.8 };
      } catch {
        return { needsCrop: false };
      }
    },
    [getDims],
  );

  const prevalidateFile = useCallback(
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
        } catch {
          return `Could not inspect ${file.name} dimensions`;
        }
      }
      return null;
    },
    [field.rule, getDims],
  );

  useEffect(() => {
    register(field.name, {
      validate: (v: unknown) => {
        const arr: ImageValue[] = Array.isArray(v) ? (v as ImageValue[]) : [];
        if (!isGalleryFilled(arr)) return `${field.label} is required`;
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

  useEffect(() => {
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

  const onAddFiles = useCallback(
    async (
      e: React.ChangeEvent<HTMLInputElement> | { target: { files: FileList | File[] | null } },
    ) => {
      const raw = Array.from(e.target.files || []);
      if (raw.length === 0) return;

      if ('value' in e.target) {
        e.target.value = '';
      }

      const currentCount = (watch(field.name) ?? []).length;
      const slots = Math.max(0, maxItems - currentCount);

      if (slots === 0) {
        setError(field.name, {
          type: 'validate',
          message: `Maximum allowed is ${maxItems} image(s)`,
        });
        return;
      }

      const targetFiles = raw.slice(0, slots);
      if (raw.length > targetFiles.length) {
        setError(field.name, {
          type: 'validate',
          message: `Only ${targetFiles.length} of ${raw.length} images added — Max ${maxItems}`,
        });
      }
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

      for (const f of valids) {
        const { needsCrop } = await checkAspectRatio(f);
        if (needsCrop) {
          setCroppingFile({ file: f });
          return;
        }
      }

      setIsUploading(true);
      try {
        const uploadedUrls = await uploadImageFiles(valids);
        invalidateMediaLibrary();
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
    },
    [
      watch,
      field.name,
      maxItems,
      prevalidateFile,
      checkAspectRatio,
      setValue,
      clearErrors,
      trigger,
      setError,
      invalidateMediaLibrary,
    ],
  );

  const onReplaceFile = useCallback(
    async (idx: number, f: File | null) => {
      if (!f) return;
      const err = await prevalidateFile(f);
      if (err) {
        setError(field.name, { type: 'validate', message: err });
        return;
      }

      const { needsCrop } = await checkAspectRatio(f);
      if (needsCrop) {
        setCroppingFile({ file: f, replaceIndex: idx });
        return;
      }

      setIsUploading(true);
      try {
        const [uploadedUrl] = await uploadImageFiles([f]);
        invalidateMediaLibrary();
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
    },
    [
      prevalidateFile,
      checkAspectRatio,
      setError,
      field.name,
      watch,
      setValue,
      clearErrors,
      trigger,
      invalidateMediaLibrary,
    ],
  );

  const handleCropComplete = useCallback(
    async (croppedFile: File) => {
      const replaceIdx = croppingFile?.replaceIndex;
      setCroppingFile(null);
      setIsUploading(true);

      try {
        const [uploadedUrl] = await uploadImageFiles([croppedFile]);
        invalidateMediaLibrary();
        const current = (watch(field.name) ?? []) as ImageValue[];
        let next: ImageValue[];

        if (typeof replaceIdx === 'number') {
          next = [...current];
          next[replaceIdx] = uploadedUrl;
        } else {
          next = [...current, uploadedUrl];
        }

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
    },
    [
      croppingFile,
      watch,
      field.name,
      setValue,
      clearErrors,
      trigger,
      setError,
      invalidateMediaLibrary,
    ],
  );

  const onRemoveFile = useCallback(
    (idx: number) => {
      const current = (watch(field.name) ?? []) as ImageValue[];
      const next = current.filter((_, i) => i !== idx);
      setValue(field.name, next, { shouldValidate: true, shouldDirty: true });
      clearErrors(field.name);
      trigger(field.name);
    },
    [watch, field.name, setValue, clearErrors, trigger],
  );

  const handlePickerSelect = useCallback(
    (urls: string[]) => {
      if (!urls.length) return;
      let next: string[];
      if (isSingle) {
        next = [urls[0]];
      } else {
        const currentUrls = (files || []).map((f) => (typeof f === 'string' ? f : ''));
        next = Array.from(new Set([...currentUrls.filter(Boolean), ...urls])).slice(0, maxItems);
      }
      setValue(field.name, next, { shouldDirty: true, shouldValidate: true });
      clearErrors(field.name);
      trigger(field.name);
    },
    [isSingle, files, maxItems, setValue, field.name, clearErrors, trigger],
  );

  return {
    maxItems,
    isSingle,
    files,
    previews,
    isUploading,
    croppingFile,
    setCroppingFile,
    fileInputs,
    onAddFiles,
    onReplaceFile,
    onRemoveFile,
    handleCropComplete,
    handlePickerSelect,
    errors: formState.errors,
  };
}
