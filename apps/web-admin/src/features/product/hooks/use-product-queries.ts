/**
 * Product feature — canonical React Query layer.
 * Error toasts are intentionally omitted here: the global QueryCache /
 * MutationCache in main.tsx already surfaces them (opt-out via
 * meta.suppressErrorToast).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
    archiveProduct,
    getProducts,
    getProductReviewQueue,
    reviewProduct,
    submitProductForReview,
    toggleProductActivation,
    type ProductFilterRequest,
    type ReviewProductRequestPayload,
} from '../api';

export const PRODUCT_QUERY_KEYS = {
    all: ['products'] as const,
    list: (params: ProductFilterRequest) =>
        [...PRODUCT_QUERY_KEYS.all, 'list', params] as const,
    reviewQueue: (page: number, limit: number) =>
        [...PRODUCT_QUERY_KEYS.all, 'review-queue', { page, limit }] as const,
    detail: (id: string) => [...PRODUCT_QUERY_KEYS.all, 'detail', id] as const,
};

export function useProductsQuery(filters: ProductFilterRequest, enabled = true) {
    return useQuery({
        queryKey: PRODUCT_QUERY_KEYS.list(filters),
        queryFn: () => getProducts(filters),
        enabled,
        placeholderData: (previousData) => previousData,
    });
}

export function useReviewQueueQuery(page: number, limit = 10, enabled = true) {
    return useQuery({
        queryKey: PRODUCT_QUERY_KEYS.reviewQueue(page, limit),
        queryFn: () => getProductReviewQueue(page, limit),
        enabled,
        placeholderData: (previousData) => previousData,
    });
}

/** Shared mutations with list invalidation + success toasts. */
export function useProductMutations() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.all });
    };

    const toggleActivation = useMutation({
        mutationFn: toggleProductActivation,
        onSuccess: (response) => {
            invalidateAll();
            toast({
                title: 'Status updated',
                description: response.message || 'Product activation status toggled.',
            });
        },
    });

    const archive = useMutation({
        mutationFn: archiveProduct,
        onSuccess: () => {
            invalidateAll();
            toast({
                title: 'Product archived',
                description: 'The product was soft-deleted and hidden from the storefront.',
            });
        },
    });

    const submitForReview = useMutation({
        mutationFn: submitProductForReview,
        onSuccess: () => {
            invalidateAll();
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
            invalidateAll();
            const approved = variables.payload.action === 'approve';
            toast({
                title: approved ? 'Product approved' : 'Product rejected',
                description: approved
                    ? 'Listing published to the customer marketplace.'
                    : 'Structured rejection feedback sent to the vendor.',
            });
        },
    });

    return { toggleActivation, archive, submitForReview, review };
}