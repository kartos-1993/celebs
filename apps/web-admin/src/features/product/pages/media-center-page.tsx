import { memo, useCallback, useMemo, useState } from 'react';

import type { MediaAsset } from '@celebs/shared-types';

import { MediaCenterDialogs } from '../components/media-center/media-center-dialogs';
import { MediaCenterGrid } from '../components/media-center/media-center-grid';
import { MediaCenterHeader } from '../components/media-center/media-center-header';
import { MediaCenterToolbar } from '../components/media-center/media-center-toolbar';
import { StorageQuotaBar } from '../components/storage-quota-bar';
import {
  useCleanupUnusedMedia,
  useDeleteMediaAsset,
  useMediaAssets,
  useMediaQuota,
} from '../hooks/use-media-assets';

import { useDebounce } from '@/hooks/use-debounce';
import { toast } from '@/hooks/use-toast';
import { directUploadBatch, extractApiErrorMessage } from '@/lib/media-upload';

/** Product-only Media Center — folder-less, flat product library. */
const MediaCenterPage = memo(function MediaCenterPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [unusedOnly, setUnusedOnly] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  type PC = { kind: 'delete-asset'; asset: MediaAsset } | { kind: 'cleanup-unused' };
  const [pendingConfirm, setPendingConfirm] = useState<PC | null>(null);
  const debounced = useDebounce(searchTerm, 350);
  const {
    data: assetsData,
    isLoading,
    refetch,
  } = useMediaAssets({
    search: debounced || undefined,
    scope: 'PRODUCT',
    unusedOnly: unusedOnly || undefined,
    limit: 48,
  });
  const { data: quota, isLoading: isLoadingQuota } = useMediaQuota();
  const deleteAssetMut = useDeleteMediaAsset();
  const cleanupMut = useCleanupUnusedMedia();
  const assets = useMemo(() => assetsData?.items || [], [assetsData]);
  const handleUpload = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files);
      if (!arr.length) return;
      setIsUploading(true);
      try {
        await directUploadBatch(arr, 'celebs/products', 'PRODUCT');
        refetch();
        toast({ title: 'Uploaded', description: `${arr.length} file(s) added` });
      } catch (e: unknown) {
        toast({
          title: 'Upload failed',
          description: extractApiErrorMessage(e, 'Failed'),
          variant: 'destructive',
        });
      } finally {
        setIsUploading(false);
      }
    },
    [refetch],
  );
  const copy = useCallback((u: string) => {
    navigator.clipboard.writeText(u);
    toast({ title: 'Copied', description: 'CDN URL copied' });
  }, []);
  const isDeleting = useCallback(
    (id?: string) => Boolean(id) && deleteAssetMut.isPending && deleteAssetMut.variables === id,
    [deleteAssetMut.isPending, deleteAssetMut.variables],
  );
  const runConfirm = useCallback(async () => {
    if (!pendingConfirm) return;
    if (pendingConfirm.kind === 'delete-asset') {
      await deleteAssetMut.mutateAsync(pendingConfirm.asset.id as string);
      toast({ title: 'Deleted', description: pendingConfirm.asset.originalName });
      return;
    }
    const unused = assets
      .filter((a) => (a.usageCount ?? 0) === 0)
      .map((a) => a.id)
      .filter((id): id is string => Boolean(id));
    await cleanupMut.mutateAsync({ assetIds: unused });
    toast({ title: 'Success', description: `Cleaned up ${unused.length} assets` });
  }, [pendingConfirm, deleteAssetMut, cleanupMut, assets]);

  return (
    <div className="space-y-6">
      <MediaCenterHeader isUploading={isUploading} onUpload={handleUpload} />
      <StorageQuotaBar quota={quota} isLoading={isLoadingQuota} />
      <div className="flex flex-col gap-4">
        <MediaCenterToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          unusedOnly={unusedOnly}
          onToggleUnused={() => setUnusedOnly((v) => !v)}
          quota={quota}
          onCleanup={() => setPendingConfirm({ kind: 'cleanup-unused' })}
          isCleaning={cleanupMut.isPending}
          onRefresh={() => refetch()}
        />
        <MediaCenterGrid
          assets={assets}
          isLoading={isLoading}
          debouncedSearch={debounced}
          unusedOnly={unusedOnly}
          onPreview={setPreviewAsset}
          onCopy={copy}
          onDelete={(a) => {
            if ((a.usageCount ?? 0) > 0) {
              toast({
                title: 'Action Blocked',
                description: `Used in ${a.usageCount} products`,
                variant: 'destructive',
              });
              return;
            }
            if (!a.id) return;
            setPendingConfirm({ kind: 'delete-asset', asset: a });
          }}
          isDeleting={isDeleting}
        />
      </div>
      <MediaCenterDialogs
        previewAsset={previewAsset}
        onPreviewChange={setPreviewAsset}
        onCopy={copy}
        pendingConfirm={pendingConfirm}
        onConfirmChange={setPendingConfirm}
        onConfirm={runConfirm}
        quota={quota}
      />
    </div>
  );
});
export default MediaCenterPage;
