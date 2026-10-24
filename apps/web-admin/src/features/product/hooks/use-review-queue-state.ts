import { useCallback, useEffect, useMemo, useState } from 'react';

import type { ProductQueueItem } from '../components/review-queue/types';
import type { ProductFilterRequest, ReviewProductRequestPayload } from '../types';

import { useProductMutations, useProductsQuery, useReviewQueueQuery } from './use-product-queries';

import { useListQueryState } from '@/common/hooks/use-list-query-state';
import { useDebounce } from '@/hooks/use-debounce';

export type ReviewQueueTab = 'pending' | 'published' | 'rejected';

export const REVIEW_QUEUE_TABS: Array<{ value: ReviewQueueTab; label: string }> = [
  { value: 'pending', label: 'Pending Review' },
  { value: 'published', label: 'Published' },
  { value: 'rejected', label: 'Rejected' },
];

const REVIEW_TABS = ['pending', 'published', 'rejected'] as const;
const REVIEW_SORTS = ['newest'] as const;

export function useReviewQueueState() {
  const listQueryState = useListQueryState({
    defaultTab: 'pending' as ReviewQueueTab,
    allowedTabs: REVIEW_TABS,
    defaultSort: 'newest',
    allowedSorts: REVIEW_SORTS,
  });

  const activeTab = listQueryState.tab as ReviewQueueTab;
  const page = listQueryState.page;
  const setPage = listQueryState.setPage;
  const pageSize = listQueryState.limit;
  const [searchInput, setSearchInput] = useState(listQueryState.q);
  const debouncedSearch = useDebounce(searchInput, 350);

  useEffect(() => {
    if (debouncedSearch.trim() !== listQueryState.q) listQueryState.setQ(debouncedSearch);
  }, [debouncedSearch, listQueryState.q, listQueryState.setQ]);

  useEffect(() => {
    if (listQueryState.q !== searchInput) setSearchInput(listQueryState.q);
  }, [listQueryState.q]);

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
  const productsQuery = useProductsQuery(listFilters, !isPendingTab);

  const activeQuery = isPendingTab ? queueQuery : productsQuery;
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
    listQueryState.setTab(tab);
  };

  const setPageSize = (size: number) => {
    listQueryState.setLimit(size);
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
