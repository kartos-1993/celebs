import React, { memo, useCallback, useMemo, useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@celebs/shared-ui/components/tabs';
import {
  Check,
  Folder,
  Image as ImageIcon,
  Loader2,
  Search,
  UploadCloud,
} from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { directUploadBatch } from '@/lib/media-upload';
import { cn } from '@/lib/utils';
import type { MediaAsset, MediaScope } from '@celebs/shared-types';
import { useMediaAssets, useMediaFolders, useMediaQuota } from '../hooks/use-media-assets';
import { StorageQuotaBar } from './storage-quota-bar';

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-bold">Media Center DAM</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Select from your cloud media library or upload new high-resolution images.
              </DialogDescription>
            </div>
            <Badge variant="secondary" className="text-xs font-normal">
              {selectedUrls.length} / {maxSelect} selected
            </Badge>
          </div>

          <div className="pt-2">
            <StorageQuotaBar quota={quota} />
          </div>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(val: string) => setActiveTab(val as 'library' | 'upload')}
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="px-4 pt-2 border-b border-border/40 bg-muted/30">
            <TabsList className="grid w-64 grid-cols-2">
              <TabsTrigger value="library" className="text-xs">
                Media Library
              </TabsTrigger>
              <TabsTrigger value="upload" className="text-xs">
                Upload New
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="library" className="flex-1 flex min-h-0 m-0">
            <div className="w-48 border-r border-border/40 p-3 flex flex-col gap-1 overflow-y-auto bg-muted/10">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase px-2 mb-1">
                Folders
              </span>
              <button
                type="button"
                className={cn(
                  'flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors',
                  selectedFolderId === null
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted',
                )}
                onClick={() => setSelectedFolderId(null)}
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Folder className="h-3.5 w-3.5" /> All Assets
                </span>
                <span className="text-[10px] text-muted-foreground">{assets.length}</span>
              </button>
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  className={cn(
                    'flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors',
                    selectedFolderId === folder.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted',
                  )}
                  onClick={() => setSelectedFolderId(folder.id)}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <Folder className="h-3.5 w-3.5" /> {folder.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {folder.assetCount ?? 0}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex-1 flex flex-col min-h-0 p-4 gap-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search media by filename..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
              </div>

              {isLoadingAssets ? (
                <div className="grid grid-cols-4 gap-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="aspect-square rounded-lg bg-muted/40 animate-pulse" />
                  ))}
                </div>
              ) : assets.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                  <ImageIcon className="h-10 w-10 stroke-1 mb-2 opacity-40" />
                  <p className="text-sm font-medium">No media assets found</p>
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
                <div className="flex-1 overflow-y-auto grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2.5 p-1">
                  {assets.map((asset) => {
                    const isSelected = selectedUrls.includes(asset.url);
                    return (
                      <div
                        key={asset.id}
                        onClick={() => toggleSelectAsset(asset)}
                        className={`group relative aspect-square rounded-lg border overflow-hidden cursor-pointer transition-all ${
                          isSelected
                            ? 'border-primary ring-2 ring-primary ring-offset-1 bg-primary/5'
                            : 'border-border/60 hover:border-foreground/40 bg-muted/20'
                        }`}
                      >
                        <img
                          src={asset.url}
                          alt={asset.originalName}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-[10px] text-white font-medium px-1 text-center truncate max-w-[90%]">
                            {asset.originalName}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center shadow-md">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                        )}
                        {(asset.usageCount ?? 0) > 0 && (
                          <span className="absolute bottom-1 left-1 bg-black/70 text-[9px] text-white px-1 py-0.2 rounded font-mono">
                            {asset.usageCount}x
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 2: UPLOAD */}
          <TabsContent value="upload" className="flex-1 p-6 flex flex-col items-center justify-center m-0">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="w-full max-w-lg border-2 border-dashed border-border/80 hover:border-primary rounded-2xl p-8 flex flex-col items-center justify-center gap-3 text-center transition-colors bg-card/50"
            >
              <div className="p-3 rounded-full bg-primary/10 text-primary">
                {isUploading ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <UploadCloud className="h-8 w-8" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Drag &amp; drop images here
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Supports JPEG, PNG, WebP, AVIF up to 10MB each
                </p>
              </div>

              {uploadError && (
                <p className="text-xs text-destructive font-medium">{uploadError}</p>
              )}

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

        <DialogFooter className="p-3 px-4 border-t border-border/40 bg-muted/20 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {selectedUrls.length} image{selectedUrls.length !== 1 ? 's' : ''} chosen
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={selectedUrls.length === 0}
              onClick={handleConfirmSelection}
            >
              Insert {selectedUrls.length > 0 ? `(${selectedUrls.length})` : ''}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
