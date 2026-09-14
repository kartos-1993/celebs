import { ShoppingBag } from 'lucide-react';

import { Badge } from '@celebs/shared-ui/components/badge';
import { EmptyState } from '@celebs/shared-ui/components/empty-state';
import { PageHeader } from '@celebs/shared-ui/components/page-header';

import { useReviewQueueState } from '../../hooks/use-review-queue-state';

import { PreviewModal } from './preview-modal';
import { QueueCards } from './queue-cards';
import { QueueFilterBar } from './queue-filter-bar';
import { QueueTable } from './queue-table';
import { RejectionDialog } from './rejection-dialog';

import { DataTablePagination } from '@/components/data-table-pagination';

export default function ReviewProductQueue() {
  const state = useReviewQueueState();

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            Review Queue
            <Badge variant="secondary" className="font-mono tabular-nums">
              {state.total}
            </Badge>
          </span>
        }
      />

      <div className="space-y-4">
        <QueueFilterBar
          activeTab={state.activeTab}
          onTab={state.setActiveTab}
          searchInput={state.searchInput}
          onSearch={(value) => {
            state.setSearchInput(value);
            state.setPage(1);
          }}
          showSearch={!state.isPendingTab}
        />

        {state.isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <span className="text-muted-foreground">Evaluating product review queue...</span>
          </div>
        ) : state.products.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="h-8 w-8" />}
            title="No product listings in this queue"
            description={
              state.debouncedSearch
                ? `Nothing matches "${state.debouncedSearch}".`
                : 'New submissions will appear here as sellers submit products for review.'
            }
          />
        ) : (
          <>
            <QueueTable
              products={state.products}
              activeTab={state.activeTab}
              isFetching={state.isFetching}
              isReviewPending={state.isReviewPending}
              onPreview={state.openPreview}
              onApprove={state.handleApprove}
              onReject={state.openReject}
            />
            <QueueCards
              products={state.products}
              activeTab={state.activeTab}
              isFetching={state.isFetching}
              isReviewPending={state.isReviewPending}
              onPreview={state.openPreview}
              onApprove={state.handleApprove}
              onReject={state.openReject}
            />
          </>
        )}

        <DataTablePagination
          page={state.page}
          totalPages={state.totalPages}
          total={state.total}
          pageSize={state.pageSize}
          onPageChange={state.setPage}
          onPageSizeChange={state.setPageSize}
        />
      </div>

      {state.selectedProduct && (
        <RejectionDialog
          key={`reject-${state.selectedProduct.id}`}
          open={state.isRejectOpen}
          onOpenChange={state.setIsRejectOpen}
          isSubmitting={state.isReviewPending}
          onSubmit={state.handleRejectSubmit}
        />
      )}

      {state.selectedProduct && (
        <PreviewModal
          key={`preview-${state.selectedProduct.id}`}
          product={state.selectedProduct}
          open={state.isPreviewOpen}
          onOpenChange={state.setIsPreviewOpen}
          isSubmitting={state.isReviewPending}
          onApprove={state.handleApprove}
          onReject={state.openReject}
        />
      )}
    </div>
  );
}
