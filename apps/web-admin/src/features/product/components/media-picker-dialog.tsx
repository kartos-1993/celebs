import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';

import type { MediaAsset, MediaScope } from '@celebs/shared-types';
import { Dialog, DialogContent } from '@celebs/shared-ui/components/dialog';
import { Tabs, TabsList, TabsTrigger } from '@celebs/shared-ui/components/tabs';

import { useMediaAssets, useMediaQuota } from '../hooks/use-media-assets';

import { MediaPickerFooter } from './media-picker/media-picker-footer';
import { MediaPickerHeader } from './media-picker/media-picker-header';
import { MediaPickerLibraryTab } from './media-picker/media-picker-library-tab';
import { MediaPickerUploadTab } from './media-picker/media-picker-upload-tab';

import { useDebounce } from '@/hooks/use-debounce';
import { directUploadBatch } from '@/lib/media-upload';

interface MediaPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (urls: string[], assets?: MediaAsset[]) => void;
  maxSelect?: number;
  initialSelectedUrls?: string[];
  scope?: MediaScope;
}

export const MediaPickerDialog = memo(function MediaPickerDialog({
  open,
  onOpenChange,
  onSelect,
  maxSelect = 8,
  initialSelectedUrls = [],
  scope = 'PRODUCT',
}: MediaPickerDialogProps) {
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
  const assets = useMemo(() => assetsData?.items || [], [assetsData]);

  useEffect(() => {
    if (open) {
      setSelectedUrls(initialSelectedUrls ?? []);
      setSelectedAssets([]);
      setActiveTab('library');
      setUploadError(null);
    }
  }, [open, initialSelectedUrls]);

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

  const handleDirectFilesUpload = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (!fileArray.length) return;
      setIsUploading(true);
      setUploadError(null);
      try {
        const uploadedUrls = await directUploadBatch(fileArray, 'celebs/products', scope);
        setSelectedUrls((prev) => [...prev, ...uploadedUrls].slice(0, maxSelect));
        setActiveTab('library');
      } catch (err: unknown) {
        setUploadError(err instanceof Error ? err.message : 'Failed to upload images');
      } finally {
        setIsUploading(false);
      }
    },
    [maxSelect, scope],
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] w-[95vw] max-w-5xl flex-col gap-0 overflow-hidden p-0">
        <MediaPickerHeader
          quotaPct={quotaPct}
          selectedCount={selectedUrls.length}
          maxSelect={maxSelect}
        />
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as 'library' | 'upload')}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/40 bg-muted/30 px-4 py-2">
            <TabsList className="h-8">
              <TabsTrigger value="library" className="h-7 px-3 text-xs">
                Library
              </TabsTrigger>
              <TabsTrigger value="upload" className="h-7 px-3 text-xs">
                Upload New
              </TabsTrigger>
            </TabsList>
            {activeTab === 'library' && selectedUrls.length >= maxSelect && (
              <span className="text-xs font-medium text-warning">
                Selection limit reached ({maxSelect})
              </span>
            )}
          </div>
          <MediaPickerLibraryTab
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            isLoading={isLoadingAssets}
            assets={assets}
            selectedUrls={selectedUrls}
            maxSelect={maxSelect}
            onToggleSelect={toggleSelectAsset}
            onGoToUpload={() => setActiveTab('upload')}
          />
          <MediaPickerUploadTab
            isUploading={isUploading}
            uploadError={uploadError}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onFilesSelected={handleDirectFilesUpload}
          />
        </Tabs>
        <MediaPickerFooter
          selectedCount={selectedUrls.length}
          onCancel={() => onOpenChange(false)}
          onConfirm={handleConfirmSelection}
        />
      </DialogContent>
    </Dialog>
  );
});
