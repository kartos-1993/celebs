import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  Copy,
  ExternalLink,
  FileText,
  Folder,
  FolderPlus,
  Image as ImageIcon,
  Images,
  LayoutGrid,
  Megaphone,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
} from 'lucide-react';

import type { MediaAsset, MediaScope } from '@celebs/shared-types';
import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import { ConfirmDialog } from '@celebs/shared-ui/components/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@celebs/shared-ui/components/dialog';
import { Input } from '@celebs/shared-ui/components/input';
import { PageHeader } from '@celebs/shared-ui/components/page-header';
import { Spinner } from '@celebs/shared-ui/components/spinner';

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

import { useDebounce } from '@/hooks/use-debounce';
import { toast } from '@/hooks/use-toast';
import { directUploadBatch, extractApiErrorMessage } from '@/lib/media-upload';
import { cn } from '@/lib/utils';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/** Library sections — scope-driven, Daraz-style top-level navigation. */
const LIBRARY_SECTIONS: Array<{
  value: MediaScope | 'ALL';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: 'ALL', label: 'All', icon: LayoutGrid },
  { value: 'PRODUCT', label: 'Products', icon: Images },
  { value: 'KYC', label: 'Documents', icon: FileText },
  { value: 'BRANDING', label: 'Branding', icon: Folder },
  { value: 'MARKETING', label: 'Marketing', icon: Megaphone },
];

const MediaCenterPage = memo(function MediaCenterPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedScope, setSelectedScope] = useState<MediaScope | 'ALL'>('ALL');
  const [unusedOnly, setUnusedOnly] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  type PendingConfirm =
    | { kind: 'delete-folder'; folderId: string }
    | { kind: 'delete-asset'; asset: MediaAsset }
    | { kind: 'cleanup-unused' };
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);

  const debouncedSearch = useDebounce(searchTerm, 350);
  const activeScope = selectedScope === 'ALL' ? undefined : selectedScope;

  const {
    data: assetsData,
    isLoading: isLoadingAssets,
    refetch: refetchAssets,
  } = useMediaAssets({
    search: debouncedSearch || undefined,
    folderId: selectedFolderId || undefined,
    scope: activeScope,
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
  // Only show the skeleton on first load — never when data already exists
  const showInitialSkeleton = isLoadingAssets && assets.length === 0;

  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) return;
    try {
      await createFolderMutation.mutateAsync({ name: newFolderName.trim() });
      setNewFolderName('');
      setIsFolderDialogOpen(false);
      toast({ title: 'Success', description: 'Folder created successfully' });
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: extractApiErrorMessage(err, 'Failed to create folder'),
        variant: 'destructive',
      });
    }
  }, [newFolderName, createFolderMutation]);

  const handleDeleteFolder = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingConfirm({ kind: 'delete-folder', folderId: id });
  }, []);

  const handleDeleteAsset = useCallback((asset: MediaAsset) => {
    if ((asset.usageCount ?? 0) > 0) {
      toast({
        title: 'Action Blocked',
        description: `Cannot delete asset: actively used in ${asset.usageCount} products.`,
        variant: 'destructive',
      });
      return;
    }
    if (!asset.id) return;
    setPendingConfirm({ kind: 'delete-asset', asset });
  }, []);

  const handleCleanupUnused = useCallback(() => {
    if (!quota?.unlinkedAssetCount) return;
    const unusedAssets = assets.filter((a) => (a.usageCount ?? 0) === 0);
    const assetIds = unusedAssets
      .map((a) => a.id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);
    if (!assetIds.length) {
      toast({ title: 'Notice', description: 'No unlinked assets on current page' });
      return;
    }
    setPendingConfirm({ kind: 'cleanup-unused' });
  }, [assets, quota]);

  /** Executes the pending destructive action; throws keep the dialog open. */
  const runConfirmedAction = useCallback(async () => {
    if (!pendingConfirm) return;

    if (pendingConfirm.kind === 'delete-folder') {
      try {
        await deleteFolderMutation.mutateAsync(pendingConfirm.folderId);
        if (selectedFolderId === pendingConfirm.folderId) setSelectedFolderId(null);
        toast({ title: 'Success', description: 'Folder deleted' });
      } catch (err: unknown) {
        toast({
          title: 'Error',
          description: extractApiErrorMessage(err, 'Failed to delete folder'),
          variant: 'destructive',
        });
        throw err;
      }
      return;
    }

    if (pendingConfirm.kind === 'delete-asset') {
      const { asset } = pendingConfirm;
      try {
        await deleteAssetMutation.mutateAsync(asset.id as string);
        toast({ title: 'Deleted', description: asset.originalName });
      } catch (err: unknown) {
        toast({
          title: 'Error',
          description: extractApiErrorMessage(err, 'Failed to delete asset'),
          variant: 'destructive',
        });
        throw err;
      }
      return;
    }

    // cleanup-unused
    const unusedAssets = assets.filter((a) => (a.usageCount ?? 0) === 0);
    const assetIds = unusedAssets
      .map((a) => a.id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);
    try {
      await cleanupUnusedMutation.mutateAsync({ assetIds });
      toast({
        title: 'Success',
        description: `Cleaned up ${assetIds.length} unused assets`,
      });
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: extractApiErrorMessage(err, 'Failed to clean up unused assets'),
        variant: 'destructive',
      });
      throw err;
    }
  }, [
    pendingConfirm,
    deleteFolderMutation,
    selectedFolderId,
    deleteAssetMutation,
    cleanupUnusedMutation,
    assets,
  ]);

  const handleUploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (!fileArray.length) return;

      setIsUploading(true);
      try {
        await directUploadBatch(fileArray, 'celebs/products', activeScope ?? 'PRODUCT');
        refetchAssets();
        toast({
          title: 'Uploaded',
          description: `${fileArray.length} file${fileArray.length !== 1 ? 's' : ''} added to your library`,
        });
      } catch (err: unknown) {
        toast({
          title: 'Upload failed',
          description: extractApiErrorMessage(err, 'Files could not be uploaded. Try again.'),
          variant: 'destructive',
        });
      } finally {
        setIsUploading(false);
      }
    },
    [activeScope, refetchAssets],
  );

  const copyUrlToClipboard = useCallback((url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: 'Copied', description: 'CDN URL copied to clipboard' });
  }, []);

  const isDeletingAsset = useCallback(
    (id?: string) =>
      Boolean(id) && deleteAssetMutation.isPending && deleteAssetMutation.variables === id,
    [deleteAssetMutation.isPending, deleteAssetMutation.variables],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Media Center"
        description="Your cloud library — product images and documents, powered by Cloudflare R2."
        actions={
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
                  <Spinner size="sm" className="mr-1.5" /> Uploading…
                </>
              ) : (
                <>
                  <UploadCloud className="mr-1.5 h-4 w-4" /> Upload
                </>
              )}
            </Button>
          </label>
        }
      />

      {/* Quota Bar */}
      <StorageQuotaBar quota={quota} isLoading={isLoadingQuota} />

      {/* Library sections */}
      <div className="flex flex-wrap items-center gap-1.5">
        {LIBRARY_SECTIONS.map(({ value, label, icon: Icon }) => {
          const isActive = selectedScope === value;
          return (
            <Button
              key={value}
              type="button"
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedScope(value)}
              className={cn(
                'h-8 rounded-full px-3.5 text-xs',
                isActive ? '' : 'border-border/70 text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="mr-1.5 h-3.5 w-3.5" />
              {label}
            </Button>
          );
        })}
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left Sidebar: Folders */}
        <aside className="lg:col-span-1 rounded-2xl border border-border/70 bg-card shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 px-3.5 py-2.5">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Folders
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              title="New folder"
              onClick={() => setIsFolderDialogOpen(true)}
            >
              <FolderPlus className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
          <div className="p-2">
            <button
              type="button"
              className={cn(
                'flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                selectedFolderId === null
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-accent',
              )}
              onClick={() => setSelectedFolderId(null)}
            >
              <span className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                All Folders
              </span>
              <span className="text-xs opacity-80">{quota?.totalAssetCount ?? 0}</span>
            </button>

            {isLoadingFolders ? (
              <div className="flex justify-center py-4">
                <Spinner size="sm" className="text-muted-foreground" />
              </div>
            ) : (
              folders.map((f) => (
                <div
                  key={f.id}
                  onClick={() => setSelectedFolderId(f.id)}
                  className={cn(
                    'group flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                    selectedFolderId === f.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-accent',
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2 truncate">
                    <Folder className="h-4 w-4 shrink-0" />
                    <span className="truncate">{f.name}</span>
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 hover:text-destructive"
                    onClick={(e) => handleDeleteFolder(f.id, e)}
                    disabled={deleteFolderMutation.isPending}
                  >
                    {deleteFolderMutation.isPending ? (
                      <Spinner size="sm" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Right Area: Assets Grid & Filter Toolbar */}
        <div className="flex flex-col gap-4 lg:col-span-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card p-3 shadow-xs">
            <div className="relative min-w-[200px] max-w-sm flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 pl-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={unusedOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUnusedOnly(!unusedOnly)}
                className="h-9 text-xs"
              >
                {unusedOnly ? 'Showing Unused' : 'Filter Unused'}
              </Button>

              {quota && quota.unlinkedAssetCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCleanupUnused}
                  disabled={cleanupUnusedMutation.isPending}
                  className="h-9 border-warning/40 text-xs text-warning hover:bg-warning/10"
                >
                  {cleanupUnusedMutation.isPending ? (
                    <Spinner size="sm" className="mr-1" />
                  ) : (
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                  )}
                  {cleanupUnusedMutation.isPending
                    ? 'Cleaning…'
                    : `Clean Unused (${quota.unlinkedAssetCount})`}
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => refetchAssets()}
                title="Refresh"
                className="h-9 w-9 text-muted-foreground"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Grid */}
          {showInitialSkeleton ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-xl border border-border/50">
                  <div className="aspect-square animate-pulse bg-muted/40" />
                  <div className="space-y-1.5 p-2.5">
                    <div className="h-3 w-3/4 animate-pulse rounded bg-muted/40" />
                    <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted/30" />
                  </div>
                </div>
              ))}
            </div>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-border/70 bg-card/40 p-12 text-center">
              <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
              <h3 className="text-sm font-semibold text-foreground">Nothing here yet</h3>
              <p className="max-w-xs text-xs text-muted-foreground">
                {debouncedSearch || unusedOnly || selectedFolderId
                  ? 'No assets match the current filters.'
                  : `Upload files to fill your ${
                      LIBRARY_SECTIONS.find((s) => s.value === selectedScope)?.label ?? ''
                    } library.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
              {assets.map((asset) => {
                const deleting = isDeletingAsset(asset.id);
                return (
                  <div
                    key={asset.id}
                    className={cn(
                      'group relative flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-xs transition-all hover:border-primary/40 hover:shadow-sm',
                      deleting && 'opacity-50',
                    )}
                  >
                    <div
                      className="relative aspect-square w-full cursor-pointer overflow-hidden bg-muted/20"
                      onClick={() => setPreviewAsset(asset)}
                    >
                      <img
                        src={asset.url}
                        alt={asset.originalName}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-8 w-8 rounded-full shadow-md"
                          title="Copy CDN URL"
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
                          title="Open in new tab"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(asset.url, '_blank');
                          }}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {typeof asset.usageCount === 'number' && asset.usageCount > 0 ? (
                        <Badge className="absolute bottom-2 left-2 bg-black/80 font-mono text-xs text-white">
                          {asset.usageCount}× used
                        </Badge>
                      ) : asset.usageCount === 0 ? (
                        <Badge
                          variant="outline"
                          className="absolute bottom-2 left-2 border-warning/40 bg-warning/10 text-xs text-warning"
                        >
                          Unlinked
                        </Badge>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-between gap-1 border-t border-border/40 p-2.5">
                      <div className="flex min-w-0 flex-col truncate">
                        <span
                          className="truncate text-xs font-medium text-foreground"
                          title={asset.originalName}
                        >
                          {asset.originalName}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {formatBytes(asset.sizeBytes ?? 0)} •{' '}
                          {LIBRARY_SECTIONS.find((s) => s.value === asset.scope)?.label ??
                            asset.scope}
                        </span>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteAsset(asset)}
                        disabled={(asset.usageCount ?? 0) > 0 || deleting}
                        title={
                          (asset.usageCount ?? 0) > 0
                            ? 'Cannot delete: actively linked'
                            : 'Delete asset'
                        }
                      >
                        {deleting ? <Spinner size="sm" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                );
              })}
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
              placeholder="Folder name (e.g., Summer 2026 Lookbook)"
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
            <Button
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim() || createFolderMutation.isPending}
            >
              {createFolderMutation.isPending ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Creating…
                </>
              ) : (
                'Create'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Image Preview */}
      <Dialog open={Boolean(previewAsset)} onOpenChange={() => setPreviewAsset(null)}>
        <DialogContent className="max-w-3xl overflow-hidden border-0 bg-black/90 p-0">
          {previewAsset && (
            <div className="flex flex-col">
              <div className="relative flex max-h-[75vh] items-center justify-center p-4">
                <img
                  src={previewAsset.url}
                  alt={previewAsset.originalName}
                  className="max-h-[70vh] w-auto rounded-lg object-contain shadow-2xl"
                />
              </div>
              <div className="flex items-center justify-between border-t border-border bg-card p-4">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    {previewAsset.originalName}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(previewAsset.sizeBytes ?? 0)} • {previewAsset.mimeType} •{' '}
                    {LIBRARY_SECTIONS.find((s) => s.value === previewAsset.scope)?.label ??
                      previewAsset.scope}
                  </p>
                </div>
                <Button size="sm" onClick={() => copyUrlToClipboard(previewAsset.url)}>
                  <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy CDN URL
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Standard confirmation for destructive actions */}
      <ConfirmDialog
        open={pendingConfirm !== null}
        onOpenChange={(open) => {
          if (!open) setPendingConfirm(null);
        }}
        destructive
        confirmLabel={pendingConfirm?.kind === 'cleanup-unused' ? 'Clean up' : 'Delete'}
        title={
          pendingConfirm?.kind === 'delete-folder'
            ? 'Delete this folder?'
            : pendingConfirm?.kind === 'delete-asset'
              ? `Delete "${pendingConfirm.asset.originalName}"?`
              : `Clean up ${quota?.unlinkedAssetCount ?? 0} unused assets?`
        }
        description={
          pendingConfirm?.kind === 'delete-folder'
            ? 'Assets inside will remain in your library and move to the root view.'
            : pendingConfirm?.kind === 'delete-asset'
              ? 'This permanently removes the file from cloud storage. This action cannot be undone.'
              : `${formatBytes(quota?.unlinkedSizeBytes ?? 0)} of unlinked files will be permanently deleted. This action cannot be undone.`
        }
        onConfirm={runConfirmedAction}
      />
    </div>
  );
});

export default MediaCenterPage;
