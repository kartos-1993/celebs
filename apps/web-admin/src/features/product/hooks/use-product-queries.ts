/**
 * Product feature — canonical React Query layer.
 * Error toasts are intentionally omitted here: the global QueryCache /
 * MutationCache in main.tsx already surfaces them (opt-out via
 * meta.suppressErrorToast).
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  archiveProduct,
  createProduct,
  getProductReviewQueue,
  getProducts,
  PRODUCT_QUERY_KEYS,
  reviewProduct,
  submitProductForReview,
  toggleProductActivation,
  updateProduct,
} from '../api';
import type {
  CreateProductRequest,
  ProductFilterRequest,
  ReviewProductRequestPayload,
  UpdateProductRequest,
} from '../types';

import { useToast } from '@/hooks/use-toast';

/**
 * Legacy alias — the canonical factory lives in `../api` (FSD §9). Kept so
 * call sites in this feature that import the name from here keep compiling;
 * this is the SAME object identity, so cache keys cannot drift.
 */
export { PRODUCT_QUERY_KEYS };

export function useProductSelectorQuery(search?: string, enabled = true) {
  return useQuery({
    queryKey: PRODUCT_QUERY_KEYS.selector(search),
    queryFn: () => getProducts({ search: search || undefined, limit: 20 }),
    enabled,
  });
}

export function useProductsQuery(filters: ProductFilterRequest, enabled = true) {
  return useQuery({
    queryKey: PRODUCT_QUERY_KEYS.list(filters),
    queryFn: () => getProducts(filters),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useReviewQueueQuery(page: number, limit = 10, enabled = true) {
  return useQuery({
    queryKey: PRODUCT_QUERY_KEYS.reviewQueue(page, limit),
    queryFn: () => getProductReviewQueue(page, limit),
    enabled,
    placeholderData: keepPreviousData,
  });
}

/** Shared mutations with list invalidation + success toasts. */
export function useProductMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidateLists = () => {
    queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.lists() });
    queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.reviewQueues() });
  };

  const toggleActivation = useMutation({
    mutationFn: toggleProductActivation,
    onSuccess: (response) => {
      invalidateLists();
      toast({
        title: 'Status updated',
        description: response.message || 'Product activation status toggled.',
      });
    },
  });

  const archive = useMutation({
    mutationFn: archiveProduct,
    onSuccess: () => {
      invalidateLists();
      toast({
        title: 'Product archived',
        description: 'The product was soft-deleted and hidden from the storefront.',
      });
    },
  });

  const submitForReview = useMutation({
    mutationFn: submitProductForReview,
    onSuccess: () => {
      invalidateLists();
      toast({
        title: 'Submitted for review',
        description: 'The product has been queued for admin review.',
      });
    },
  });

  const review = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReviewProductRequestPayload }) =>
      reviewProduct(id, payload),
    onSuccess: (_response, variables) => {
      invalidateLists();
      const approved = variables.payload.action === 'approve';
      toast({
        title: approved ? 'Product approved' : 'Product rejected',
        description: approved
          ? 'Listing published to the customer marketplace.'
          : 'Structured rejection feedback sent to the vendor.',
      });
    },
  });

  const create = useMutation({
    mutationFn: (payload: CreateProductRequest) => createProduct(payload),
    onSuccess: () => {
      invalidateLists();
    },
  });

  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateProductRequest }) =>
      updateProduct(id, payload),
    onSuccess: (_response, variables) => {
      invalidateLists();
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.detail(variables.id) });
    },
  });

  return { toggleActivation, archive, submitForReview, review, create, update };
}
