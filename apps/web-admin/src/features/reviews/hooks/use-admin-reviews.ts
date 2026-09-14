import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchAdminReviewsApi, REVIEW_ADMIN_QUERY_KEYS, updateReviewStatusApi } from '../api';
import type { AdminReviewQueryParams, ReviewStatus } from '../types';

export function useAdminReviews(params: AdminReviewQueryParams) {
  return useQuery({
    queryKey: REVIEW_ADMIN_QUERY_KEYS.list(params),
    queryFn: () => fetchAdminReviewsApi(params),
    staleTime: 1000 * 60 * 2,
  });
}

export function useUpdateReviewStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reviewId, status }: { reviewId: string; status: ReviewStatus }) =>
      updateReviewStatusApi(reviewId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REVIEW_ADMIN_QUERY_KEYS.all });
    },
  });
}
