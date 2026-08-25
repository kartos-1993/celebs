import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Folder, Image as ImageIcon, Search, UploadCloud } from 'lucide-react';

import type { MediaAsset, MediaScope } from '@celebs/shared-types';
import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@celebs/shared-ui/components/dialog';
import { Input } from '@celebs/shared-ui/components/input';
import { Spinner } from '@celebs/shared-ui/components/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@celebs/shared-ui/components/tabs';

import { useMediaAssets, useMediaFolders, useMediaQuota } from '../hooks/use-media-assets';

import { useDebounce } from '@/hooks/use-debounce';
import { directUploadBatch } from '@/lib/media-upload';
import { cn } from '@/lib/utils';

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
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedScope] = useState<MediaScope | undefined>(scope);
  const [selectedAssets, setSelectedAssets] = useState<MediaAsset[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<string[]>(initialSelectedUrls);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchTerm, 350);

  const { data: assetsData, isLoading: isLoadingAssets } = useMediaAssets({
    search: debouncedSearch || undefined,
    folderId: selectedFolderId || undefined,
    scope: selectedScope,
    limit: 30,
  });

  const { data: folders = [] } = useMediaFolders();
  const { data: quota } = useMediaQuota();

  const assets = useMemo(() => assetsData?.items || [], [assetsData]);

  // Re-sync the selection each time the dialog opens so stale picks from a
  // previous session never linger in state.
  useEffect(() => {
    if (open) {
      setSelectedUrls(initialSelectedUrls ?? []);
      setSelectedAssets([]);
      setActiveTab('library');
      setUploadError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggleSelectAsset = useCallback(
    (asset: MediaAsset) => {
      setSelectedUrls((prev) => {
        const exists = prev.includes(asset.url);
        if (exists) {
          setSelectedAssets((assetsPrev) => assetsPrev.filter((a) => a.id !== asset.id));
          return prev.filter((u) => u !== asset.url);
        }

        if (prev.length >= maxSelect) {
          return prev;
        }

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
        const uploadedUrls = await directUploadBatch(fileArray, 'celebs/products');
        setSelectedUrls((prev) => {
          const combined = [...prev, ...uploadedUrls];
          return combined.slice(0, maxSelect);
        });
        setActiveTab('library');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to upload images';
        setUploadError(msg);
      } finally {
        setIsUploading(false);
      }
    },
    [maxSelect],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleDirectFilesUpload(e.dataTransfer.files);
      }
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
        <DialogHeader className="shrink-0 space-y-0 border-b border-border/50 p-4 pb-3">
          <div className="flex items-center justify-between gap-4 pr-8">
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold">Media Library</DialogTitle>
              <DialogDescription className="mt-0.5 text-xs text-muted-foreground">
                Pick from your cloud library or upload new images.
              </DialogDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {typeof quotaPct === 'number' ? (
                <span
                  className={cn(
                    'hidden text-xs text-muted-foreground sm:inline',
                    quotaPct > 90 && 'font-medium text-warning',
                  )}
                  title="Storage used"
                >
                  Storage {quotaPct}%
                </span>
              ) : null}
              <Badge variant="secondary" className="text-xs font-normal tabular-nums">
                {selectedUrls.length} / {maxSelect}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(val: string) => setActiveTab(val as 'library' | 'upload')}
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
            {activeTab === 'library' && selectedUrls.length >= maxSelect ? (
              <span className="text-xs font-medium text-warning">
                Selection limit reached ({maxSelect})
              </span>
            ) : null}
          </div>

          <TabsContent value="library" className="m-0 flex min-h-0 flex-1 overflow-hidden">
            {/* Folders sidebar */}
            <aside className="hidden w-44 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border/40 bg-muted/10 p-2 sm:flex">
              <span className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Folders
              </span>
              <Button
                type="button"
                variant="ghost"
                className={cn(
                  'flex h-auto w-full items-center justify-between rounded-md px-2 py-1.5 text-xs',
                  selectedFolderId === null
                    ? 'bg-primary/10 font-medium text-primary hover:bg-primary/10'
                    : 'text-muted-foreground hover:bg-muted',
                )}
                onClick={() => setSelectedFolderId(null)}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <Folder className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">All Assets</span>
                </span>
              </Button>
              {folders.map((folder) => (
                <Button
                  key={folder.id}
                  type="button"
                  variant="ghost"
                  className={cn(
                    'flex h-auto w-full items-center justify-between rounded-md px-2 py-1.5 text-xs',
                    selectedFolderId === folder.id
                      ? 'bg-primary/10 font-medium text-primary hover:bg-primary/10'
                      : 'text-muted-foreground hover:bg-muted',
                  )}
                  onClick={() => setSelectedFolderId(folder.id)}
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <Folder className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{folder.name}</span>
                  </span>
                  <span className="ml-1 text-[10px] tabular-nums opacity-70">
                    {folder.assetCount ?? 0}
                  </span>
                </Button>
              ))}
            </aside>

            {/* Assets area */}
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="shrink-0 p-3 pb-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by filename..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
              </div>

              {isLoadingAssets ? (
                <div className="grid shrink-0 grid-cols-3 gap-3 p-3 pt-1 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="aspect-square animate-pulse rounded-lg bg-muted/40" />
                  ))}
                </div>
              ) : assets.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground">
                  <ImageIcon className="mb-2 h-10 w-10 stroke-1 opacity-40" />
                  <p className="text-sm font-medium">No media found</p>
                  <p className="mt-0.5 text-xs">Try another search or upload new images.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 text-xs"
                    onClick={() => setActiveTab('upload')}
                  >
                    Upload Image
                  </Button>
                </div>
              ) : (
                <div className="min-h-0 flex-1 overflow-y-auto p-3 pt-1">
                  <div className="grid auto-rows-max grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                    {assets.map((asset) => {
                      const isSelected = selectedUrls.includes(asset.url);
                      return (
                        <button
                          key={asset.id}
                          type="button"
                          title={asset.originalName}
                          aria-pressed={isSelected}
                          disabled={!isSelected && selectedUrls.length >= maxSelect}
                          onClick={() => toggleSelectAsset(asset)}
                          className={cn(
                            'group relative block aspect-square w-full overflow-hidden rounded-lg border text-left transition-all',
                            isSelected
                              ? 'border-primary ring-2 ring-primary ring-offset-1'
                              : 'border-border/60 hover:border-foreground/40',
                            !isSelected && selectedUrls.length >= maxSelect
                              ? 'cursor-not-allowed opacity-40'
                              : 'cursor-pointer',
                          )}
                        >
                          <img
                            src={asset.url}
                            alt={asset.originalName}
                            loading="lazy"
                            className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                          <div
                            className={cn(
                              'absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-3 text-[10px] font-medium text-white',
                              isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                            )}
                          >
                            {asset.originalName}
                          </div>
                          {isSelected ? (
                            <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
                              <Check className="h-3 w-3 stroke-[3]" />
                            </span>
                          ) : null}
                          {(asset.usageCount ?? 0) > 0 ? (
                            <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1 py-px font-mono text-[10px] leading-4 text-white">
                              {asset.usageCount}x
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 2: UPLOAD */}
          <TabsContent
            value="upload"
            className="m-0 flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-6"
          >
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="flex w-full max-w-md flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border/80 bg-card/50 p-8 text-center transition-colors hover:border-primary"
            >
              <div className="rounded-full bg-primary/10 p-3 text-primary">
                {isUploading ? <Spinner size="xl" /> : <UploadCloud className="h-8 w-8" />}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Drag &amp; drop images here
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Supports JPEG, PNG, WebP, AVIF up to 10MB each
                </p>
              </div>

              {uploadError ? (
                <p className="text-xs font-medium text-destructive">{uploadError}</p>
              ) : null}

              <label>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  disabled={isUploading}
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) handleDirectFilesUpload(e.target.files);
                  }}
                />
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  disabled={isUploading}
                  className="pointer-events-none"
                >
                  {isUploading ? 'Uploading...' : 'Browse Files'}
                </Button>
              </label>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="shrink-0 items-center justify-between gap-2 border-t border-border/40 bg-muted/20 p-3 sm:justify-between">
          <div className="text-xs text-muted-foreground">
            {selectedUrls.length} image{selectedUrls.length !== 1 ? 's' : ''} selected
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={selectedUrls.length === 0} onClick={handleConfirmSelection}>
              Insert {selectedUrls.length > 0 ? `(${selectedUrls.length})` : ''}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
