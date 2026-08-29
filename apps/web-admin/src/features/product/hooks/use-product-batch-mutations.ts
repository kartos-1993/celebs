import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { archiveProduct, submitProductForReview, toggleProductActivation } from '../api';
import type { ProductListItem } from '../types';

import { PRODUCT_QUERY_KEYS } from './use-product-queries';

import { useToast } from '@/hooks/use-toast';

export function useProductBatchMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  const invalidateLists = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.lists() }),
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.reviewQueues() }),
    ]);
  };

  const handleBatchSubmit = async (selectedItems: ProductListItem[], onSuccess: () => void) => {
    const targets = selectedItems.filter(
      (p) => Boolean(p.id) && (p.status === 'draft' || p.status === 'rejected'),
    );
    if (targets.length === 0) return;

    setIsBatchProcessing(true);
    try {
      const results = await Promise.allSettled(
        targets.map((product) => submitProductForReview(product.id!)),
      );
      const successful = results.filter((r) => r.status === 'fulfilled').length;
      await invalidateLists();
      onSuccess();
      toast({
        title: 'Batch submission complete',
        description: `Successfully submitted ${successful} of ${targets.length} product(s) for review.`,
      });
    } catch (_err) {
      toast({
        title: 'Batch submission failed',
        description: 'Failed to submit some products for review.',
        variant: 'destructive',
      });
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleBatchToggleStatus = async (
    type: 'activate' | 'deactivate',
    selectedItems: ProductListItem[],
    onSuccess: () => void,
  ) => {
    const targetStatus = type === 'activate' ? 'deactivated' : 'published';
    const targets = selectedItems.filter((p) => Boolean(p.id) && p.status === targetStatus);
    if (targets.length === 0) return;

    setIsBatchProcessing(true);
    try {
      const results = await Promise.allSettled(
        targets.map((product) => toggleProductActivation(product.id!)),
      );
      const successful = results.filter((r) => r.status === 'fulfilled').length;
      await invalidateLists();
      onSuccess();
      toast({
        title: `Batch ${type} complete`,
        description: `Successfully ${type}d ${successful} of ${targets.length} product(s).`,
      });
    } catch (_err) {
      toast({
        title: `Batch ${type} failed`,
        description: `Failed to ${type} some products.`,
        variant: 'destructive',
      });
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleBatchArchiveConfirm = async (selectedProductIds: string[], onSuccess: () => void) => {
    if (selectedProductIds.length === 0) return;

    setIsBatchProcessing(true);
    try {
      const results = await Promise.allSettled(selectedProductIds.map((id) => archiveProduct(id)));
      const successful = results.filter((r) => r.status === 'fulfilled').length;
      await invalidateLists();
      onSuccess();
      toast({
        title: 'Batch archive complete',
        description: `Successfully archived ${successful} product(s).`,
      });
    } catch (_err) {
      toast({
        title: 'Batch archive failed',
        description: 'Failed to archive some products.',
        variant: 'destructive',
      });
    } finally {
      setIsBatchProcessing(false);
    }
  };

  return {
    isBatchProcessing,
    handleBatchSubmit,
    handleBatchToggleStatus,
    handleBatchArchiveConfirm,
  };
}
