import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { MediaAsset, MediaScope } from '@celebs/shared-types';

import {
  useInvalidateMediaLibrary,
  useMediaAssets,
  useMediaQuota,
} from '../../hooks/use-media-assets';

import { useDebounce } from '@/hooks/use-debounce';
import { directUploadBatch } from '@/lib/media-upload';

/**
 * Every piece of state and every handler the media picker owns, lifted out of
 * `MediaPickerDialog` so the dialog file is a layout (AGENTS §4 file budget) and
 * this logic is testable without a DOM.
 *
 * Behaviour is unchanged: the same 350ms search debounce, the same content-
 * keyed re-seed, the same hard `maxSelect` cap on every write, and the same
 * switch back to the library tab after a successful upload.
 */

export interface UseMediaPickerStateOptions {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (urls: string[], assets?: MediaAsset[]) => void;
  maxSelect: number;
  initialSelectedUrls: string[];
  scope: MediaScope;
}

export function useMediaPickerState({
  open,
  onOpenChange,
  onSelect,
  maxSelect,
  initialSelectedUrls,
  scope,
}: UseMediaPickerStateOptions) {
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<MediaAsset[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<string[]>(initialSelectedUrls);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchTerm, 350);

  const { data: assetsData, isLoading: isLoadingAssets } = useMediaAssets({
    search: debouncedSearch || undefined,
    scope,
    limit: 30,
  });

  const { data: quota } = useMediaQuota();
  const invalidateMediaLibrary = useInvalidateMediaLibrary();
  const assets = useMemo(() => assetsData?.items || [], [assetsData]);

  // Value-stable seed key: every call site rebuilds `initialSelectedUrls` inline,
  // so the ARRAY identity is new on every parent render and keying the reset on
  // it snapped the seller's selection back mid-pick. Equal contents produce an
  // equal string, so the effect only re-seeds on a real change or a reopen.
  const initialSelectionKey = useMemo(() => initialSelectedUrls.join(' '), [initialSelectedUrls]);

  useEffect(() => {
    if (open) {
      setSelectedUrls(initialSelectedUrls);
      setSelectedAssets([]);
      setActiveTab('library');
      setUploadError(null);
    }
    // `initialSelectionKey` stands in for `initialSelectedUrls` — see above.
  }, [open, initialSelectionKey]);

  const toggleSelectAsset = useCallback(
    (asset: MediaAsset) => {
      setSelectedUrls((prev) => {
        const exists = prev.includes(asset.url);
        if (exists) {
          setSelectedAssets((assetsPrev) => assetsPrev.filter((a) => a.id !== asset.id));
          return prev.filter((u) => u !== asset.url);
        }
        if (prev.length >= maxSelect) return prev;
        setSelectedAssets((assetsPrev) => [...assetsPrev, asset]);
        return [...prev, asset.url];
      });
    },
    [maxSelect],
  );

  const handleConfirmSelection = useCallback(() => {
    onSelect(selectedUrls, selectedAssets);
    onOpenChange(false);
  }, [onSelect, selectedUrls, selectedAssets, onOpenChange]);

  const handleCancel = useCallback(() => onOpenChange(false), [onOpenChange]);

  const handleDirectFilesUpload = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (!fileArray.length) return;
      setIsUploading(true);
      setUploadError(null);
      try {
        const uploadedUrls = await directUploadBatch(fileArray, 'celebs/products', scope);
        // Library grid + quota would otherwise keep showing stale data.
        invalidateMediaLibrary();
        setSelectedUrls((prev) => [...prev, ...uploadedUrls].slice(0, maxSelect));
        setActiveTab('library');
      } catch (err: unknown) {
        setUploadError(err instanceof Error ? err.message : 'Failed to upload images');
      } finally {
        setIsUploading(false);
      }
    },
    [invalidateMediaLibrary, maxSelect, scope],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files?.length) handleDirectFilesUpload(e.dataTransfer.files);
    },
    [handleDirectFilesUpload],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const quotaPct =
    quota && quota.maxBytes > 0
      ? Math.min(100, Math.round((quota.usedBytes / quota.maxBytes) * 100))
      : null;

  return {
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    isLoadingAssets,
    assets,
    selectedUrls,
    isUploading,
    uploadError,
    quotaPct,
    toggleSelectAsset,
    handleConfirmSelection,
    handleCancel,
    handleDrop,
    handleDragOver,
    handleDirectFilesUpload,
  };
}
