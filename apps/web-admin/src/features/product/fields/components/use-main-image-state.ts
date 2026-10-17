import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { useInvalidateMediaLibrary } from '../../hooks/use-media-assets';
import { isGalleryFilled } from '../../utils/add-product-helpers';
import { collectCoverError } from '../../utils/add-product-validation';
import type { UiProps } from '../ui-registry';

import { ImageValue, imageValueKey, uploadErrorMessage, uploadImageFiles } from './shared';
import {
  asAcceptList,
  asByteLimit,
  checkUrlDimensions,
  hasDimensionRule,
  isHttpUrl,
  isUrlValue,
  mergeUniqueUrls,
  probeImageDimensions,
  resolveAcceptAttr,
  takeSingleUrl,
  toImageValues,
  validateFileBasics,
  validateLibraryUrl,
} from './shared-utils';

interface UseMainImageStateProps {
  field: UiProps['field'];
}

/**
 * The cover is only REQUIRED when the field says required AND nothing else
 * satisfies it. `collectCoverError` is the single source of truth for "this
 * product has a cover" — it already accepts a full colour gallery as one — so
 * the field rule asks it instead of re-implementing the gallery walk. Without
 * this, a product whose colour galleries are all filled still carried a
 * permanent "Main Product Image is required" on a field marked required.
 */
function isCoverRequired(
  field: UiProps['field'],
  images: ImageValue[],
  values: Record<string, unknown>,
): boolean {
  if (!field.required || isGalleryFilled(images)) return false;
  return collectCoverError({ values, schemaFields: [field] }).length > 0;
}

export function useMainImageState({ field }: UseMainImageStateProps) {
  const { setValue, watch, getValues, register, trigger, formState, setError, clearErrors } =
    useFormContext();

  const maxItems = useMemo(
    () => (typeof field.rule?.maxItems === 'number' ? field.rule.maxItems : 1),
    [field.rule?.maxItems],
  );
  const isSingle = maxItems === 1;
  // acceptAttr is the file-input `accept` string derived from field.rule.accept;
  // `image/*` is only the fallback for a field with no accept rule.
  const acceptAttr = useMemo(
    () => resolveAcceptAttr(asAcceptList(field.rule?.accept)),
    [field.rule?.accept],
  );

  const rawFiles = watch(field.name);
  const files: ImageValue[] = useMemo(() => toImageValues(rawFiles), [rawFiles]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const invalidateMediaLibrary = useInvalidateMediaLibrary();
  const [croppingFile, setCroppingFile] = useState<{ file: File; replaceIndex?: number } | null>(
    null,
  );
  const fileInputs = useRef<Array<HTMLInputElement | null>>([]);
  const filesHash = useMemo(() => files.map((file) => imageValueKey(file)).join('|'), [files]);

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
      const basics = validateFileBasics(file, {
        accept: asAcceptList(rule.accept),
        maxSize: asByteLimit(rule.maxSize),
      });
      if (basics === 'Invalid file type') return `${file.name} is not an accepted image format`;
      if (basics && !basics.includes(file.name)) return `${file.name}: ${basics}`;
      if (basics) return basics;

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
    const accept = asAcceptList(field.rule?.accept);
    const maxItems = asByteLimit(field.rule?.maxItems);
    register(field.name, {
      validate: (v: unknown) => {
        const arr = toImageValues(v);
        if (isCoverRequired(field, arr, getValues())) return `${field.label} is required`;
        if (typeof maxItems === 'number' && arr.length > maxItems) return `Max ${maxItems} images`;
        if (accept && arr.some((f) => f instanceof File && !accept.includes(f.type))) {
          return 'One or more files have invalid formats';
        }
        return true;
      },
    });
  }, [register, getValues, field]);

  useEffect(() => {
    let active = true;
    const urls = files.map((item) => (typeof item === 'string' ? item : URL.createObjectURL(item)));
    setPreviews(urls);

    return () => {
      active = false;
      urls.forEach((url, idx) => {
        if (typeof files[idx] !== 'string') {
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
      const dropped = raw.slice(slots);
      const overflowMessage =
        dropped.length > 0
          ? `Only ${targetFiles.length} of ${raw.length} images added — Max ${maxItems} (${dropped.map((f) => f.name).join(', ')} not added)`
          : null;
      if (overflowMessage) {
        setError(field.name, { type: 'validate', message: overflowMessage });
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
        const current = toImageValues(watch(field.name));
        const next = [...current, ...uploadedUrls];
        // COVER ORDER CANONICAL CONTRACT (client + server share this rule,
        // see shared-utils): cover = mainImages[0] ?? first color's first
        // gallery image. This is the size-only branch (no color gallery), so
        // these URLs ARE the cover list and their order is the cover order —
        // which is why the overflow tail is refused with an error above
        // instead of being silently sliced off.
        setValue(field.name, next, { shouldValidate: true, shouldDirty: true });
        // Settle validation BEFORE writing the overflow notice: both setValue's
        // shouldValidate and trigger() clear a manual error asynchronously, so
        // a setError issued first is wiped a microtask later.
        await trigger(field.name);
        if (overflowMessage) {
          setError(field.name, { type: 'validate', message: overflowMessage });
        } else {
          clearErrors(field.name);
        }
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
      const current = toImageValues(watch(field.name));
      if (!Number.isInteger(idx) || idx < 0 || idx >= current.length) {
        setError(field.name, {
          type: 'validate',
          message: `Cannot replace image at position ${idx} — only ${current.length} image(s) present`,
        });
        return;
      }
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
        const current = toImageValues(watch(field.name));
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
      // Re-check the cropped output against maxSize/accept/dimensions before
      // upload: the crop canvas re-encodes bytes, so size/type can change.
      const cropErr = await prevalidateFile(croppedFile);
      if (cropErr) {
        setCroppingFile(null);
        setError(field.name, { type: 'validate', message: cropErr });
        return;
      }
      setCroppingFile(null);
      setIsUploading(true);

      try {
        const [uploadedUrl] = await uploadImageFiles([croppedFile]);
        invalidateMediaLibrary();
        const current = toImageValues(watch(field.name));
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
      prevalidateFile,
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
      const current = toImageValues(watch(field.name));
      const next = current.filter((_, i) => i !== idx);
      setValue(field.name, next, { shouldValidate: true, shouldDirty: true });
      clearErrors(field.name);
      trigger(field.name);
    },
    [watch, field.name, setValue, clearErrors, trigger],
  );

  const handlePickerSelect = useCallback(
    async (urls: string[]) => {
      if (!urls.length) return;
      const rule = field.rule || {};
      // Library/URL picks run the same accept validation as file picks
      // (via extension — no File header exists for remote URLs). Remote
      // bytes are unknowable client-side, so maxSize is enforced by the
      // server at confirm time; dimensions are decoded when ruled.
      const urlErrors: string[] = [];
      const validUrls: string[] = [];
      for (const url of urls) {
        if (!isHttpUrl(url)) {
          urlErrors.push(`"${url}" is not a valid image URL`);
          continue;
        }
        const acceptErr = validateLibraryUrl(url, { accept: asAcceptList(rule.accept) });
        if (acceptErr) {
          urlErrors.push(acceptErr);
          continue;
        }
        validUrls.push(url);
      }
      if (urlErrors.length > 0) {
        setError(field.name, { type: 'validate', message: urlErrors[0] });
        return;
      }
      if (hasDimensionRule(rule)) {
        for (const url of validUrls) {
          try {
            const dims = await probeImageDimensions(url);
            const dimErr = checkUrlDimensions(url, dims, rule);
            if (dimErr) urlErrors.push(dimErr);
          } catch (error) {
            urlErrors.push(
              error instanceof Error ? error.message : `Could not inspect ${url} dimensions`,
            );
          }
        }
        if (urlErrors.length > 0) {
          setError(field.name, { type: 'validate', message: urlErrors[0] });
          return;
        }
      }
      let next: string[];
      let dropped: string[] = [];
      // COVER ORDER CANONICAL CONTRACT: this is the size-only branch, so
      // `next[0]` IS the cover. Library picks keep first-seen order, and
      // anything that does not fit maxItems is reported below rather than
      // silently truncated.
      if (isSingle) {
        next = takeSingleUrl(validUrls);
        dropped = validUrls.slice(next.length);
      } else {
        const currentUrls = files.filter(isUrlValue);
        next = mergeUniqueUrls(currentUrls, validUrls, maxItems);
        const kept = new Set(next);
        dropped = validUrls.filter((u) => !kept.has(u));
      }
      setValue(field.name, next, { shouldDirty: true, shouldValidate: true });
      // Same ordering rule as the file path: await the validation settle
      // first, otherwise the async validation clears the "not added" notice.
      await trigger(field.name);
      if (dropped.length > 0) {
        setError(field.name, {
          type: 'validate',
          message: `Only ${next.length} of ${next.length + dropped.length} images kept — Max ${maxItems} (${dropped.join(', ')} not added)`,
        });
      } else {
        clearErrors(field.name);
      }
    },
    [isSingle, files, maxItems, setValue, field.name, clearErrors, trigger, setError, field.rule],
  );

  return {
    maxItems,
    isSingle,
    acceptAttr,
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
