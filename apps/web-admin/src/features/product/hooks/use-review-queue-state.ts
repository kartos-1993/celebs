import { useCallback, useMemo, useState } from 'react';

import type { ProductFilterRequest, ReviewProductRequestPayload } from '../api';
import type { ProductQueueItem } from '../components/review-queue/types';

import { useProductMutations, useProductsQuery, useReviewQueueQuery } from './use-product-queries';

import { useDebounce } from '@/hooks/use-debounce';

export type ReviewQueueTab = 'pending' | 'published' | 'rejected';

export const REVIEW_QUEUE_TABS: Array<{ value: ReviewQueueTab; label: string }> = [
  { value: 'pending', label: 'Pending Review' },
  { value: 'published', label: 'Published' },
  { value: 'rejected', label: 'Rejected' },
];

export function useReviewQueueState() {
  const [activeTab, setActiveTabState] = useState<ReviewQueueTab>('pending');
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 350);
  const [page, setPageState] = useState(1);
  const [pageSize, setPageSizeState] = useState(10);

  const [selectedProduct, setSelectedProduct] = useState<ProductQueueItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);

  const isPendingTab = activeTab === 'pending';

  const listFilters = useMemo<ProductFilterRequest>(
    () => ({
      status: activeTab === 'published' ? 'published' : 'rejected',
      search: debouncedSearch || undefined,
      page,
      limit: pageSize,
    }),
    [activeTab, debouncedSearch, page, pageSize],
  );

  const queueQuery = useReviewQueueQuery(page, pageSize, isPendingTab);
  const listQuery = useProductsQuery(listFilters, !isPendingTab);

  const activeQuery = isPendingTab ? queueQuery : listQuery;
  const products = (activeQuery.data?.data?.products ?? []) as ProductQueueItem[];
  const total = activeQuery.data?.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const { review } = useProductMutations();

  const handleApprove = (id: string) => {
    review.mutate(
      { id, payload: { action: 'approve' } },
      { onSuccess: () => setIsPreviewOpen(false) },
    );
  };

  const handleRejectSubmit = useCallback(
    (payload: ReviewProductRequestPayload) => {
      if (!selectedProduct) return;
      review.mutate(
        { id: selectedProduct.id, payload },
        {
          onSuccess: () => {
            setIsRejectOpen(false);
            setIsPreviewOpen(false);
            setSelectedProduct(null);
          },
        },
      );
    },
    [selectedProduct, review],
  );

  const openPreview = (product: ProductQueueItem) => {
    setSelectedProduct(product);
    setIsPreviewOpen(true);
  };

  const openReject = (product: ProductQueueItem) => {
    setSelectedProduct(product);
    setIsRejectOpen(true);
  };

  const setActiveTab = (tab: ReviewQueueTab) => {
    setActiveTabState(tab);
    setPageState(1);
    setSearchInput('');
  };

  const setPage = (newPage: number) => setPageState(newPage);

  const setPageSize = (size: number) => {
    setPageSizeState(size);
    setPageState(1);
  };

  return {
    activeTab,
    setActiveTab,
    searchInput,
    setSearchInput,
    debouncedSearch,
    page,
    setPage,
    pageSize,
    setPageSize,
    isPendingTab,
    products,
    total,
    totalPages,
    isLoading: activeQuery.isLoading,
    isFetching: activeQuery.isFetching,
    isReviewPending: review.isPending,
    selectedProduct,
    isPreviewOpen,
    setIsPreviewOpen,
    isRejectOpen,
    setIsRejectOpen,
    handleApprove,
    handleRejectSubmit,
    openPreview,
    openReject,
  };
}
