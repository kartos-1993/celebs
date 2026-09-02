import { useCallback, useState } from 'react';

import type { MediaAsset } from '@celebs/shared-types';

import type { PendingConfirm } from '../components/media-center/media-center-dialogs';

import { useCleanupUnusedMedia, useDeleteMediaAsset } from './use-media-assets';

import { toast } from '@/hooks/use-toast';

export function useMediaDeleteCleanup(assets: MediaAsset[], handleBulkDelete: () => Promise<void>) {
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const deleteAssetMut = useDeleteMediaAsset();
  const cleanupMut = useCleanupUnusedMedia();

  const runConfirm = useCallback(async () => {
    if (!pendingConfirm) return;
    if (pendingConfirm.kind === 'delete-asset') {
      await deleteAssetMut.mutateAsync(pendingConfirm.asset.id as string);
      toast({ title: 'Deleted', description: pendingConfirm.asset.originalName });
      return;
    }
    if (pendingConfirm.kind === 'delete-selected') {
      await handleBulkDelete();
      return;
    }
    const unused = assets
      .filter((a) => (a.usageCount ?? 0) === 0)
      .map((a) => a.id)
      .filter((id): id is string => Boolean(id));
    await cleanupMut.mutateAsync({ assetIds: unused });
    toast({ title: 'Success', description: `Cleaned up ${unused.length} assets` });
  }, [pendingConfirm, deleteAssetMut, handleBulkDelete, cleanupMut, assets]);

  const requestDeleteAsset = useCallback((asset: MediaAsset) => {
    if ((asset.usageCount ?? 0) > 0) {
      toast({
        title: 'Action Blocked',
        description: `Used in ${asset.usageCount} products`,
        variant: 'destructive',
      });
      return;
    }
    if (!asset.id) return;
    setPendingConfirm({ kind: 'delete-asset', asset });
  }, []);

  return {
    pendingConfirm,
    setPendingConfirm,
    runConfirm,
    requestDeleteAsset,
    isCleaning: cleanupMut.isPending,
    isDeleting: (id?: string) =>
      Boolean(id) && deleteAssetMut.isPending && deleteAssetMut.variables === id,
  };
}
