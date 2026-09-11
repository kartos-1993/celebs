import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchProductReviewGalleryApi,
  fetchProductReviewsApi,
  fetchProductReviewSummaryApi,
  fetchToReviewItems,
  REVIEW_QUERY_KEYS,
  submitReviewApi,
  toggleReviewLikeApi,
} from '../api';
import type { SubmitReviewPayload } from '../types';

import { ORDER_QUERY_KEYS } from '@/features/orders/api';

export function useToReviewItems(enabled = true) {
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: REVIEW_QUERY_KEYS.toReview(),
    queryFn: () => fetchToReviewItems(1, 20),
    enabled,
    staleTime: 1000 * 60 * 2,
  });

  return {
    items: data ?? [],
    loading: isLoading,
    refreshing: isRefetching,
    refetch,
  };
}

export function useSubmitReviewMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SubmitReviewPayload) => submitReviewApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REVIEW_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.summaryCounts() });
    },
  });
}

export function useProductReviews(
  productId: string,
  page = 1,
  limit = 10,
  rating?: number,
  hasImages?: boolean,
) {
  return useQuery({
    queryKey: [...REVIEW_QUERY_KEYS.productReviews(productId, page), { rating, hasImages }],
    queryFn: () => fetchProductReviewsApi(productId, page, limit, rating, hasImages),
    enabled: !!productId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useProductReviewSummary(productId: string) {
  return useQuery({
    queryKey: REVIEW_QUERY_KEYS.productSummary(productId),
    queryFn: () => fetchProductReviewSummaryApi(productId),
    enabled: !!productId,
    staleTime: 1000 * 60 * 10,
  });
}

export function useProductReviewGallery(productId: string) {
  return useQuery({
    queryKey: REVIEW_QUERY_KEYS.productGallery(productId),
    queryFn: () => fetchProductReviewGalleryApi(productId, 1, 40),
    enabled: !!productId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useToggleReviewLikeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reviewId: string) => toggleReviewLikeApi(reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REVIEW_QUERY_KEYS.all });
    },
  });
}
