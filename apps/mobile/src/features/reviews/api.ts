import type { IApiResponse } from '@celebs/shared-types';

import type {
  ProductReviewSummary,
  ReviewGalleryItem,
  ReviewItem,
  SubmitReviewPayload,
  ToReviewItem,
} from './types';

import { apiClient } from '@/api/client';
import { handleApiResponse } from '@/api/response';

export const REVIEW_QUERY_KEYS = {
  all: ['reviews'] as const,
  toReview: () => [...REVIEW_QUERY_KEYS.all, 'to-review'] as const,
  productReviews: (productId: string, page = 1) =>
    [...REVIEW_QUERY_KEYS.all, 'product', productId, { page }] as const,
  productSummary: (productId: string) => [...REVIEW_QUERY_KEYS.all, 'summary', productId] as const,
  productGallery: (productId: string) => [...REVIEW_QUERY_KEYS.all, 'gallery', productId] as const,
};

export async function fetchToReviewItems(page = 1, limit = 20): Promise<ToReviewItem[]> {
  const payload = await handleApiResponse(
    apiClient.get<IApiResponse<ToReviewItem[]>>('/reviews/to-review', {
      params: { page, limit },
    }),
  );
  return Array.isArray(payload) ? payload : [];
}

export async function submitReviewApi(payload: SubmitReviewPayload): Promise<ReviewItem> {
  const data = await handleApiResponse(
    apiClient.post<IApiResponse<ReviewItem>>('/reviews', payload),
  );
  return data;
}

export async function fetchProductReviewsApi(
  productId: string,
  page = 1,
  limit = 10,
  rating?: number,
  hasImages?: boolean,
): Promise<ReviewItem[]> {
  const payload = await handleApiResponse(
    apiClient.get<IApiResponse<ReviewItem[]>>(`/reviews/products/${productId}`, {
      params: { page, limit, rating, hasImages },
    }),
  );
  return Array.isArray(payload) ? payload : [];
}

export async function fetchProductReviewSummaryApi(
  productId: string,
): Promise<ProductReviewSummary | null> {
  const data = await handleApiResponse(
    apiClient.get<IApiResponse<ProductReviewSummary>>(`/reviews/products/${productId}/summary`),
  );
  return data ?? null;
}

export async function fetchProductReviewGalleryApi(
  productId: string,
  page = 1,
  limit = 30,
): Promise<ReviewGalleryItem[]> {
  const payload = await handleApiResponse(
    apiClient.get<IApiResponse<ReviewGalleryItem[]>>(`/reviews/products/${productId}/gallery`, {
      params: { page, limit },
    }),
  );
  return Array.isArray(payload) ? payload : [];
}

export async function toggleReviewLikeApi(
  reviewId: string,
): Promise<{ liked: boolean; helpfulCount: number }> {
  const data = await handleApiResponse(
    apiClient.post<IApiResponse<{ liked: boolean; helpfulCount: number }>>(
      `/reviews/${reviewId}/likes`,
    ),
  );
  return data ?? { liked: false, helpfulCount: 0 };
}
