import React, { memo, useCallback, useMemo, useState } from 'react';
import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@celebs/shared-ui/components/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@celebs/shared-ui/components/dialog';
import { Input } from '@celebs/shared-ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@celebs/shared-ui/components/select';
import {
  Copy,
  ExternalLink,
  Folder,
  FolderPlus,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { toast } from '@/hooks/use-toast';
import { directUploadBatch } from '@/lib/media-upload';
import type { MediaAsset, MediaScope } from '@celebs/shared-types';
import { StorageQuotaBar } from '../components/storage-quota-bar';
import {
  useCleanupUnusedMedia,
  useCreateMediaFolder,
  useDeleteMediaAsset,
  useDeleteMediaFolder,
  useMediaAssets,
  useMediaFolders,
  useMediaQuota,
} from '../hooks/use-media-assets';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

const MediaCenterPage = memo(function MediaCenterPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedScope, setSelectedScope] = useState<MediaScope | undefined>(undefined);
  const [unusedOnly, setUnusedOnly] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const debouncedSearch = useDebounce(searchTerm, 350);

  const {
    data: assetsData,
    isLoading: isLoadingAssets,
    refetch: refetchAssets,
  } = useMediaAssets({
    search: debouncedSearch || undefined,
    folderId: selectedFolderId || undefined,
    scope: selectedScope,
    unusedOnly: unusedOnly || undefined,
    limit: 48,
  });

  const { data: folders = [], isLoading: isLoadingFolders } = useMediaFolders();
  const { data: quota, isLoading: isLoadingQuota } = useMediaQuota();

  const createFolderMutation = useCreateMediaFolder();
  const deleteFolderMutation = useDeleteMediaFolder();
  const deleteAssetMutation = useDeleteMediaAsset();
  const cleanupUnusedMutation = useCleanupUnusedMedia();

  const assets = useMemo(() => assetsData?.items || [], [assetsData]);

  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) return;
    try {
      await createFolderMutation.mutateAsync({ name: newFolderName.trim() });
      setNewFolderName('');
      setIsFolderDialogOpen(false);
      toast({ title: 'Success', description: 'Folder created successfully' });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to create folder',
        variant: 'destructive',
      });
    }
  }, [newFolderName, createFolderMutation]);

  const handleDeleteFolder = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!window.confirm('Delete this folder? Assets inside will remain in root library.')) return;
      try {
        await deleteFolderMutation.mutateAsync(id);
        if (selectedFolderId === id) setSelectedFolderId(null);
        toast({ title: 'Success', description: 'Folder deleted' });
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to delete folder',
          variant: 'destructive',
        });
      }
    },
    [deleteFolderMutation, selectedFolderId],
  );

  const handleDeleteAsset = useCallback(
    async (asset: MediaAsset) => {
      if ((asset.usageCount ?? 0) > 0) {
        toast({
          title: 'Action Blocked',
          description: `Cannot delete asset: actively used in ${asset.usageCount} products.`,
          variant: 'destructive',
        });
        return;
      }
      if (!asset.id) return;
      if (!window.confirm(`Delete ${asset.originalName} permanently?`)) return;

      try {
        await deleteAssetMutation.mutateAsync(asset.id);
        toast({ title: 'Success', description: 'Asset deleted permanently' });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to delete asset';
        toast({
          title: 'Error',
          description: msg,
          variant: 'destructive',
        });
      }
    },
    [deleteAssetMutation],
  );

  const handleCleanupUnused = useCallback(async () => {
    if (!quota?.unlinkedAssetCount) return;
    const confirmPrompt = window.confirm(
      `Clean up ${quota.unlinkedAssetCount} unused draft assets (${formatBytes(quota.unlinkedSizeBytes)})? This action cannot be undone.`,
    );
    if (!confirmPrompt) return;

    try {
      const unusedAssets = assets.filter((a) => (a.usageCount ?? 0) === 0);
      const assetIds = unusedAssets
        .map((a) => a.id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0);
      if (!assetIds.length) {
        toast({ title: 'Notice', description: 'No unlinked assets on current page' });
        return;
      }
      await cleanupUnusedMutation.mutateAsync({ assetIds });
      toast({
        title: 'Success',
        description: `Cleaned up ${assetIds.length} unused assets`,
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to clean up unused assets',
        variant: 'destructive',
      });
    }
  }, [assets, cleanupUnusedMutation, quota]);

  const handleUploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (!fileArray.length) return;

      setIsUploading(true);
      try {
        await directUploadBatch(fileArray, 'celebs/products');
        refetchAssets();
        toast({
          title: 'Upload Successful',
          description: `Uploaded ${fileArray.length} assets to Cloudflare R2`,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        toast({
          title: 'Upload Failed',
          description: msg,
          variant: 'destructive',
        });
      } finally {
        setIsUploading(false);
      }
    },
    [refetchAssets],
  );

  const copyUrlToClipboard = useCallback((url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: 'Copied', description: 'CDN URL copied to clipboard' });
  }, []);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Digital Asset Management (DAM)
          </h1>
          <p className="text-sm text-muted-foreground">
            Multi-tenant media storage powered by Cloudflare R2 presigned streaming pipeline.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/avif"
              disabled={isUploading}
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleUploadFiles(e.target.files);
              }}
            />
            <Button size="sm" disabled={isUploading} className="pointer-events-none cursor-pointer">
              {isUploading ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Uploading...
                </>
              ) : (
                <>
                  <UploadCloud className="mr-1.5 h-4 w-4" /> Upload Media
                </>
              )}
            </Button>
          </label>
        </div>
      </div>

      {/* Quota Bar */}
      <StorageQuotaBar quota={quota} isLoading={isLoadingQuota} />

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left Sidebar: Folders */}
        <Card className="lg:col-span-1 border-border/60 bg-card/60 shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Folders
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsFolderDialogOpen(true)}
            >
              <FolderPlus className="h-4 w-4 text-muted-foreground" />
            </Button>
          </CardHeader>
          <CardContent className="p-2 flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setSelectedFolderId(null)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                selectedFolderId === null
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                All Assets
              </div>
              <span className="text-[11px] opacity-80">{quota?.totalAssetCount ?? 0}</span>
            </button>

            {isLoadingFolders ? (
              <div className="py-4 flex justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              folders.map((f) => (
                <div
                  key={f.id}
                  onClick={() => setSelectedFolderId(f.id)}
                  className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                    selectedFolderId === f.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Folder className="h-4 w-4 shrink-0" />
                    <span className="truncate">{f.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 hover:text-destructive"
                    onClick={(e) => handleDeleteFolder(f.id, e)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right Area: Assets Grid & Filter Toolbar */}
        <div className="flex flex-col gap-4 lg:col-span-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/60 p-3 shadow-sm">
            <div className="flex flex-1 items-center gap-2 min-w-[200px] max-w-sm">
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assets by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 pl-9 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={selectedScope || 'ALL'}
                onValueChange={(val) =>
                  setSelectedScope(val === 'ALL' ? undefined : (val as MediaScope))
                }
              >
                <SelectTrigger className="h-9 w-32 text-xs">
                  <SelectValue placeholder="All Scopes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Scopes</SelectItem>
                  <SelectItem value="PRODUCT">Product</SelectItem>
                  <SelectItem value="BRANDING">Branding</SelectItem>
                  <SelectItem value="KYC">KYC</SelectItem>
                  <SelectItem value="MARKETING">Marketing</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant={unusedOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUnusedOnly(!unusedOnly)}
                className="text-xs h-9"
              >
                {unusedOnly ? 'Showing Unused' : 'Filter Unused'}
              </Button>

              {quota && quota.unlinkedAssetCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCleanupUnused}
                  className="text-xs h-9 border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Clean Unused ({quota.unlinkedAssetCount})
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => refetchAssets()}
                className="h-9 w-9 text-muted-foreground"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Grid */}
          {isLoadingAssets ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 p-12 border border-dashed rounded-2xl bg-card/30 text-center">
              <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
              <div>
                <h3 className="text-sm font-semibold text-foreground">No media assets found</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Upload images or clear active search filters to view your library.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className="group relative flex flex-col rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm hover:shadow-md hover:border-primary/40 transition-all"
                >
                  <div
                    className="relative aspect-square w-full bg-muted/20 overflow-hidden cursor-pointer"
                    onClick={() => setPreviewAsset(asset)}
                  >
                    <img
                      src={asset.url}
                      alt={asset.originalName}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 rounded-full shadow-md"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyUrlToClipboard(asset.url);
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 rounded-full shadow-md"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(asset.url, '_blank');
                        }}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {(asset.usageCount ?? 0) > 0 ? (
                      <Badge className="absolute bottom-2 left-2 bg-black/80 text-[10px] font-mono text-white">
                        {asset.usageCount}x in PDP
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="absolute bottom-2 left-2 bg-amber-500/10 border-amber-500/40 text-[10px] text-amber-600 dark:text-amber-400"
                      >
                        Unlinked
                      </Badge>
                    )}
                  </div>

                  <div className="p-2.5 flex items-center justify-between gap-1 border-t border-border/40">
                    <div className="truncate flex flex-col">
                      <span
                        className="text-xs font-medium text-foreground truncate"
                        title={asset.originalName}
                      >
                        {asset.originalName}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatBytes(asset.sizeBytes ?? 0)} • {asset.scope}
                      </span>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => handleDeleteAsset(asset)}
                      title={
                        (asset.usageCount ?? 0) > 0
                          ? 'Cannot delete: actively linked'
                          : 'Delete asset'
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dialog: Create Folder */}
      <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Media Folder</DialogTitle>
            <DialogDescription>
              Organize your product catalogs, campaigns, and lookbooks.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Folder Name (e.g., Summer 2026 Lookbook)"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFolderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Image Preview */}
      <Dialog open={Boolean(previewAsset)} onOpenChange={() => setPreviewAsset(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black/90 border-0">
          {previewAsset && (
            <div className="flex flex-col">
              <div className="relative max-h-[75vh] flex items-center justify-center p-4">
                <img
                  src={previewAsset.url}
                  alt={previewAsset.originalName}
                  className="max-h-[70vh] w-auto object-contain rounded-lg shadow-2xl"
                />
              </div>
              <div className="p-4 bg-card border-t border-border flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    {previewAsset.originalName}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(previewAsset.sizeBytes ?? 0)} • {previewAsset.mimeType} • Scope:{' '}
                    {previewAsset.scope}
                  </p>
                </div>
                <Button size="sm" onClick={() => copyUrlToClipboard(previewAsset.url)}>
                  <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy CDN URL
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
});

export default MediaCenterPage;
