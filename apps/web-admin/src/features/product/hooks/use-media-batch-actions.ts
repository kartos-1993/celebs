import { useCallback, useState } from 'react';

import type { MediaAsset } from '@celebs/shared-types';

import { useDeleteMediaAsset, useMoveMediaAssets } from './use-media-assets';

import { toast } from '@/hooks/use-toast';

export function useMediaBatchActions(assets: MediaAsset[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const deleteAssetMut = useDeleteMediaAsset();
  const moveMut = useMoveMediaAssets();

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(
    () =>
      setSelectedIds(new Set(assets.map((a) => a.id).filter((id): id is string => Boolean(id)))),
    [assets],
  );

  const handleClear = useCallback(() => setSelectedIds(new Set()), []);

  const handleExport = useCallback(() => {
    const selected = assets.filter((a) => selectedIds.has(a.id || ''));
    if (!selected.length) return;
    const csv = ['name,url', ...selected.map((a) => `"${a.originalName}","${a.url}"`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product-images.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: `${selected.length} URLs exported` });
  }, [assets, selectedIds]);

  const handleMove = useCallback(
    async (targetFolderId: string | null) => {
      const ids = Array.from(selectedIds);
      if (!ids.length) return;
      await moveMut.mutateAsync({ assetIds: ids, targetFolderId });
      setSelectedIds(new Set());
      toast({ title: 'Moved', description: `${ids.length} images moved` });
    },
    [selectedIds, moveMut],
  );

  const handleBulkDelete = useCallback(async () => {
    const deletable = assets.filter(
      (a) => selectedIds.has(a.id || '') && (a.usageCount ?? 0) === 0,
    );
    if (!deletable.length) {
      toast({
        title: 'Cannot delete',
        description: 'Selected images are in use or none selected',
        variant: 'destructive',
      });
      return;
    }
    for (const a of deletable) await deleteAssetMut.mutateAsync(a.id as string);
    setSelectedIds(new Set());
    toast({ title: 'Deleted', description: `${deletable.length} images deleted` });
  }, [assets, selectedIds, deleteAssetMut]);

  return {
    selectedIds,
    toggleSelect,
    handleSelectAll,
    handleClear,
    handleExport,
    handleMove,
    handleBulkDelete,
    isMoving: moveMut.isPending,
  };
}
