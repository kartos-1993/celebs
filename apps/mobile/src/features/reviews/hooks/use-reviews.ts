import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchProductReviewGalleryApi,
  fetchProductReviewsApi,
  fetchProductReviewSummaryApi,
  fetchToReviewItems,
  REVIEW_QUERY_KEYS,
  submitReviewApi,
  toggleReviewLikeApi,
  uploadReviewImageApi,
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

export function useSubmitReviewWithImages() {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  const mutation = useMutation({
    mutationFn: async (
      payload: Omit<SubmitReviewPayload, 'images'> & { localImageUris?: string[] },
    ) => {
      let finalImages: string[] = [];
      const localUris = payload.localImageUris || [];

      if (localUris.length > 0) {
        setIsUploading(true);
        try {
          finalImages = await Promise.all(
            localUris.map(async (uri, idx) => {
              if (uri.startsWith('http://') || uri.startsWith('https://')) {
                return uri;
              }
              const filename = `review_${Date.now()}_${idx}.jpg`;
              return uploadReviewImageApi(uri, filename, 'image/jpeg');
            }),
          );
        } finally {
          setIsUploading(false);
        }
      }

      return submitReviewApi({
        orderItemId: payload.orderItemId,
        rating: payload.rating,
        fitRating: payload.fitRating,
        comment: payload.comment,
        images: finalImages,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REVIEW_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.summaryCounts() });
    },
  });

  return {
    ...mutation,
    isUploading,
    isSubmitting: isUploading || mutation.isPending,
  };
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
