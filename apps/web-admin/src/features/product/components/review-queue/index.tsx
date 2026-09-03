import { useCallback, useMemo, useState } from 'react';
import { ShieldCheck, ShoppingBag } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@celebs/shared-ui/components/card';
import { EmptyState } from '@celebs/shared-ui/components/empty-state';
import { PageHeader } from '@celebs/shared-ui/components/page-header';

import type { ProductFilterRequest, ReviewProductRequestPayload } from '../../api';
import {
  useProductMutations,
  useProductsQuery,
  useReviewQueueQuery,
} from '../../hooks/use-product-queries';

import { PreviewModal } from './preview-modal';
import { QueueCards } from './queue-cards';
import { QueueTable } from './queue-table';
import { RejectionDialog } from './rejection-dialog';
import type { ProductQueueItem } from './types';

import { FilterBar, FilterSearch, SegmentedTabs } from '@/components/filter-bar';
import { useDebounce } from '@/hooks/use-debounce';

const PAGE_SIZE = 10;

export default function ReviewProductQueue() {
  const [activeTab, setActiveTab] = useState<'pending' | 'published' | 'rejected'>('pending');
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 350);
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedProduct, setSelectedProduct] = useState<ProductQueueItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);

  const isPendingTab = activeTab === 'pending';

  const listFilters = useMemo<ProductFilterRequest>(
    () => ({
      status: activeTab === 'published' ? 'published' : 'rejected',
      search: debouncedSearch || undefined,
      page: currentPage,
      limit: PAGE_SIZE,
    }),
    [activeTab, debouncedSearch, currentPage],
  );

  const queueQuery = useReviewQueueQuery(currentPage, PAGE_SIZE, isPendingTab);
  const listQuery = useProductsQuery(listFilters, !isPendingTab);

  const activeQuery = isPendingTab ? queueQuery : listQuery;
  const products = (activeQuery.data?.data?.products ?? []) as ProductQueueItem[];
  const total = activeQuery.data?.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Superadmin Review Queue"
        description="Daraz & SHEIN quality control station with live customer PDP simulation and structured feedback."
      />

      {/* Search & Queue Filter */}
      <FilterBar>
        {!isPendingTab && (
          <FilterSearch
            value={searchInput}
            onChange={(value) => {
              setSearchInput(value);
              setCurrentPage(1);
            }}
            placeholder="Search by title, brand or vendor..."
          />
        )}
        <SegmentedTabs
          className={!isPendingTab ? '' : 'sm:ml-auto'}
          options={[
            { value: 'pending', label: 'Pending Review' },
            { value: 'published', label: 'Published' },
            { value: 'rejected', label: 'Rejected' },
          ]}
          value={activeTab}
          onChange={(value) => {
            setActiveTab(value);
            setCurrentPage(1);
            setSearchInput('');
          }}
        />
        <div className="text-sm text-muted-foreground flex items-center gap-2 sm:ml-2">
          <ShieldCheck className="w-4 h-4 text-success shrink-0" />
          <span className="whitespace-nowrap">
            Total: <span className="font-semibold text-foreground">{total}</span>
          </span>
        </div>
      </FilterBar>

      {/* Queue table */}
      <Card>
        <CardHeader>
          <CardTitle className="capitalize">
            {isPendingTab ? 'Pending QC Approvals' : `${activeTab} Listings`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeQuery.isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <span className="text-muted-foreground">Evaluating product review queue...</span>
            </div>
          ) : products.length === 0 ? (
            <EmptyState
              icon={<ShoppingBag className="h-8 w-8" />}
              title="No product listings in this queue"
              description={
                debouncedSearch
                  ? `Nothing matches "${debouncedSearch}".`
                  : 'New submissions will appear here as sellers submit products for review.'
              }
            />
          ) : (
            <>
              <QueueTable
                products={products}
                activeTab={activeTab}
                isFetching={activeQuery.isFetching}
                isReviewPending={review.isPending}
                onPreview={openPreview}
                onApprove={handleApprove}
                onReject={openReject}
              />
              <QueueCards
                products={products}
                activeTab={activeTab}
                isFetching={activeQuery.isFetching}
                isReviewPending={review.isPending}
                onPreview={openPreview}
                onApprove={handleApprove}
                onReject={openReject}
              />
            </>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((previous) => Math.max(previous - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((previous) => Math.min(previous + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Structured rejection dialog (keyed to reset state per product) */}
      {selectedProduct && (
        <RejectionDialog
          key={`reject-${selectedProduct.id}`}
          open={isRejectOpen}
          onOpenChange={setIsRejectOpen}
          isSubmitting={review.isPending}
          onSubmit={handleRejectSubmit}
        />
      )}

      {/* Comprehensive PDP & QC inspection modal */}
      {selectedProduct && (
        <PreviewModal
          key={`preview-${selectedProduct.id}`}
          product={selectedProduct}
          open={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          isSubmitting={review.isPending}
          onApprove={handleApprove}
          onReject={openReject}
        />
      )}
    </div>
  );
}
