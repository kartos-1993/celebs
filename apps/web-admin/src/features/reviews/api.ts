import type { IApiResponse } from '@celebs/shared-types';

import type {
  AdminReviewItem,
  AdminReviewListResponse,
  AdminReviewQueryParams,
  ReviewStatus,
} from './types';

import { axiosClient } from '@/lib/axios/axios-client';

export const REVIEW_ADMIN_QUERY_KEYS = {
  all: ['admin-reviews'] as const,
  list: (params: AdminReviewQueryParams) =>
    [...REVIEW_ADMIN_QUERY_KEYS.all, 'list', params] as const,
};

export async function fetchAdminReviewsApi(
  params: AdminReviewQueryParams,
): Promise<IApiResponse<AdminReviewListResponse>> {
  const query: Record<string, unknown> = {
    page: params.page ?? 1,
    limit: params.limit ?? 10,
  };

  if (params.status && params.status !== 'ALL') {
    query.status = params.status;
  }
  if (params.rating) {
    query.rating = params.rating;
  }
  if (params.search) {
    query.search = params.search;
  }
  if (params.storeId) {
    query.storeId = params.storeId;
  }

  const response = await axiosClient.get<IApiResponse<AdminReviewListResponse>>('/reviews/admin', {
    params: query,
  });
  return response.data;
}

export async function updateReviewStatusApi(
  reviewId: string,
  status: ReviewStatus,
): Promise<IApiResponse<AdminReviewItem>> {
  const response = await axiosClient.patch<IApiResponse<AdminReviewItem>>(
    `/reviews/${reviewId}/status`,
    { status },
  );
  return response.data;
}
