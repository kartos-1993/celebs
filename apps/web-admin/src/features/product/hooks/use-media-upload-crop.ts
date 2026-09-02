import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type { MediaAsset } from '@celebs/shared-types';

import type { CropTarget } from '../components/media-crop/crop-canvas';
import { MEDIA_QUERY_KEYS } from '../media-query-keys';

import { PRODUCT_QUERY_KEYS } from './use-product-queries';

import { toast } from '@/hooks/use-toast';
import { directUploadBatch, directUploadFile, extractApiErrorMessage } from '@/lib/media-upload';

export function useMediaUploadCrop() {
  const [isUploading, setIsUploading] = useState(false);
  const [cropTarget, setCropTarget] = useState<CropTarget | null>(null);
  const queryClient = useQueryClient();

  const handleUpload = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files);
      if (!arr.length) return;
      setIsUploading(true);
      try {
        await directUploadBatch(arr, 'celebs/products', 'PRODUCT');
        queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEYS.assetsRoot });
        queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.all });
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
    [queryClient],
  );

  const handleEdit = useCallback((asset: MediaAsset) => {
    if (!asset.url) {
      toast({
        title: 'Cannot edit',
        description: 'Asset does not have a valid URL',
        variant: 'destructive',
      });
      return;
    }
    setCropTarget({
      id: asset.id,
      key: asset.key,
      url: asset.url,
      name: asset.originalName || 'image.webp',
      folderId: asset.folderId,
    });
  }, []);

  const handleCropComplete = useCallback(
    async (croppedFile: File, overwrite?: boolean) => {
      const target = cropTarget;
      setCropTarget(null);
      setIsUploading(true);
      try {
        if (overwrite && target?.key) {
          // Editing existing asset -> overwrite existing asset in place
          await directUploadFile(croppedFile, 'celebs/products', 'PRODUCT', target.key);
          toast({ title: 'Updated', description: `"${croppedFile.name}" updated successfully` });
        } else {
          // New file or Save as Copy -> catalog as new asset
          await directUploadBatch([croppedFile], 'celebs/products', 'PRODUCT');
          toast({
            title: target?.key ? 'Saved as Copy' : 'Saved',
            description: `"${croppedFile.name}" added to media gallery`,
          });
        }
        queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEYS.assetsRoot });
        queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.all });
      } catch (e: unknown) {
        toast({
          title: 'Save failed',
          description: extractApiErrorMessage(e, 'Failed'),
          variant: 'destructive',
        });
      } finally {
        setIsUploading(false);
      }
    },
    [cropTarget, queryClient],
  );

  return {
    isUploading,
    cropTarget,
    setCropTarget,
    handleUpload,
    handleEdit,
    handleCropComplete,
  };
}
