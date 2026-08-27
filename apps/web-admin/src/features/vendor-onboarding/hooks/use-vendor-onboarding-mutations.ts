import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  resubmitForReview,
  submitVendorForReview,
  updateVendorBusinessInfo,
  updateVendorDocuments,
  updateVendorProfile,
  updateVendorWarehouse,
  VENDOR_ONBOARDING_QUERY_KEYS,
} from '../api';

import { useAuthContext } from '@/context/auth-provider';

/**
 * Encapsulates Step 1 (Store Profile) mutation with query cache invalidation.
 */
export function useUpdateProfileMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const { refetch } = useAuthContext();

  return useMutation({
    mutationFn: updateVendorProfile,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: VENDOR_ONBOARDING_QUERY_KEYS.all,
      });
      refetch();
      onSuccess?.();
    },
  });
}

/**
 * Encapsulates Step 2 (Warehouse Address) mutation with query cache invalidation.
 */
export function useUpdateWarehouseMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const { refetch } = useAuthContext();

  return useMutation({
    mutationFn: updateVendorWarehouse,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: VENDOR_ONBOARDING_QUERY_KEYS.all,
      });
      refetch();
      onSuccess?.();
    },
  });
}

/**
 * Encapsulates Step 3 (KYC Documents) mutation with query cache invalidation.
 */
export function useUpdateDocumentsMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const { refetch } = useAuthContext();

  return useMutation({
    mutationFn: updateVendorDocuments,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: VENDOR_ONBOARDING_QUERY_KEYS.all,
      });
      refetch();
      onSuccess?.();
    },
  });
}

/**
 * Encapsulates Step 4 (Legal Business Info) mutation with query cache invalidation.
 */
export function useUpdateBusinessInfoMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const { refetch } = useAuthContext();

  return useMutation({
    mutationFn: updateVendorBusinessInfo,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: VENDOR_ONBOARDING_QUERY_KEYS.all,
      });
      refetch();
      onSuccess?.();
    },
  });
}

/**
 * Encapsulates Step 5 (Initial Application Submission) mutation.
 */
export function useSubmitVendorMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const { refetch } = useAuthContext();

  return useMutation({
    mutationFn: submitVendorForReview,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: VENDOR_ONBOARDING_QUERY_KEYS.all,
      });
      refetch();
      onSuccess?.();
    },
  });
}

/**
 * Encapsulates Step 5 (Resubmission for Rejected vendors) mutation.
 */
export function useResubmitVendorMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const { refetch } = useAuthContext();

  return useMutation({
    mutationFn: resubmitForReview,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: VENDOR_ONBOARDING_QUERY_KEYS.all,
      });
      refetch();
      onSuccess?.();
    },
  });
}
