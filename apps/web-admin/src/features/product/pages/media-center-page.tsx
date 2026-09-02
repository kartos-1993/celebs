import { memo, useMemo, useState } from 'react';

import type { MediaAsset } from '@celebs/shared-types';

import { copyToClipboard } from '../components/media-center/media-asset-actions';
import { MediaBatchBar } from '../components/media-center/media-batch-bar';
import { MediaCenterDialogs } from '../components/media-center/media-center-dialogs';
import { MediaCenterGrid } from '../components/media-center/media-center-grid';
import { MediaCenterHeader } from '../components/media-center/media-center-header';
import { MediaCenterToolbar } from '../components/media-center/media-center-toolbar';
import { MediaCreateFolderDialog } from '../components/media-center/media-create-folder-dialog';
import { MediaFolderStrip } from '../components/media-center/media-folder-strip';
import { MediaMoveDialog } from '../components/media-center/media-move-dialog';
import { MediaCropDialog } from '../components/media-crop-dialog';
import { StorageQuotaBar } from '../components/storage-quota-bar';
import {
  useCreateMediaFolder,
  useMediaAssets,
  useMediaFolders,
  useMediaQuota,
} from '../hooks/use-media-assets';
import { useMediaBatchActions } from '../hooks/use-media-batch-actions';
import { useMediaDeleteCleanup } from '../hooks/use-media-delete-cleanup';
import { useMediaUploadCrop } from '../hooks/use-media-upload-crop';

import { useDebounce } from '@/hooks/use-debounce';

/** Daraz-style Media Center — albums + bulk select + move + export */
const MediaCenterPage = memo(function MediaCenterPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [unusedOnly, setUnusedOnly] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isMoveOpen, setIsMoveOpen] = useState(false);

  const debounced = useDebounce(searchTerm, 350);
  const {
    data: assetsData,
    isLoading,
    refetch,
  } = useMediaAssets({
    search: debounced || undefined,
    folderId: selectedFolderId || undefined,
    scope: 'PRODUCT',
    unusedOnly: unusedOnly || undefined,
    limit: 48,
  });
  const { data: quota, isLoading: isLoadingQuota } = useMediaQuota();
  const { data: folders = [] } = useMediaFolders();
  const createFolderMut = useCreateMediaFolder();

  const assets = useMemo(() => assetsData?.items || [], [assetsData]);
  const batch = useMediaBatchActions(assets);
  const uploadCrop = useMediaUploadCrop();
  const deleteCleanup = useMediaDeleteCleanup(assets, batch.handleBulkDelete);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolderMut.mutateAsync({ name: newFolderName.trim() });
    setNewFolderName('');
    setIsCreateOpen(false);
  };

  return (
    <div className="space-y-6">
      <MediaCenterHeader
        isUploading={uploadCrop.isUploading}
        onUpload={uploadCrop.handleUpload}
        onCreateFolder={() => setIsCreateOpen(true)}
      />
      <StorageQuotaBar quota={quota} isLoading={isLoadingQuota} />
      <MediaFolderStrip
        folders={folders}
        selectedFolderId={selectedFolderId}
        onSelect={setSelectedFolderId}
      />
      <div className="flex flex-col gap-4">
        <MediaCenterToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          unusedOnly={unusedOnly}
          onToggleUnused={() => setUnusedOnly((v) => !v)}
          quota={quota}
          onCleanup={() => deleteCleanup.setPendingConfirm({ kind: 'cleanup-unused' })}
          isCleaning={deleteCleanup.isCleaning}
          onRefresh={() => refetch()}
        />
        <MediaCenterGrid
          assets={assets}
          isLoading={isLoading}
          debouncedSearch={debounced}
          unusedOnly={unusedOnly}
          selectedIds={batch.selectedIds}
          onToggleSelect={batch.toggleSelect}
          onPreview={setPreviewAsset}
          onCopy={copyToClipboard}
          onEdit={uploadCrop.handleEdit}
          onDelete={deleteCleanup.requestDeleteAsset}
          isDeleting={deleteCleanup.isDeleting}
        />
        <MediaBatchBar
          selectedCount={batch.selectedIds.size}
          hasSelection={batch.selectedIds.size > 0}
          onSelectAll={batch.handleSelectAll}
          onClear={batch.handleClear}
          onExport={batch.handleExport}
          onMove={() => setIsMoveOpen(true)}
          onDelete={() => deleteCleanup.setPendingConfirm({ kind: 'delete-selected' })}
        />
      </div>
      <MediaCenterDialogs
        previewAsset={previewAsset}
        onPreviewChange={setPreviewAsset}
        onCopy={copyToClipboard}
        pendingConfirm={deleteCleanup.pendingConfirm}
        onConfirmChange={deleteCleanup.setPendingConfirm}
        onConfirm={deleteCleanup.runConfirm}
        quota={quota}
      />
      <MediaCropDialog
        open={uploadCrop.cropTarget !== null}
        target={uploadCrop.cropTarget}
        onCropComplete={uploadCrop.handleCropComplete}
        onCancel={() => uploadCrop.setCropTarget(null)}
      />
      <MediaMoveDialog
        open={isMoveOpen}
        onOpenChange={setIsMoveOpen}
        folders={folders}
        onMove={batch.handleMove}
        isMoving={batch.isMoving}
      />
      <MediaCreateFolderDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        folderName={newFolderName}
        onFolderNameChange={setNewFolderName}
        onCreate={handleCreateFolder}
        isPending={createFolderMut.isPending}
      />
    </div>
  );
});

export default MediaCenterPage;
