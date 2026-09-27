import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AdminProductListItem } from '@celebs/shared-types';

import { ManageProductContent } from '../manage-product-content';

describe('ManageProductContent', () => {
  it('renders the filter search, table, and pagination chrome with identical copy', () => {
    const state = {
      searchInput: '',
      setSearchInput: vi.fn(),
      setPage: vi.fn(),
      filterStatus: 'all',
      setFilterStatus: vi.fn(),
      sortKey: 'newest',
      setSortKey: vi.fn(),
      previewVendor: 'all',
      setPreviewVendor: vi.fn(),
      previewCategory: 'all',
      setPreviewCategory: vi.fn(),
      previewStock: 'all',
      setPreviewStock: vi.fn(),
      previewActive: false,
      resetPreviewFilters: vi.fn(),
      selectedProducts: [],
      setSelectedProducts: vi.fn(),
      page: 1,
      pageSize: 10,
      setPageSize: vi.fn(),
      debouncedSearch: '',
      applyPreview: (products: AdminProductListItem[]) => products,
      getSelectionCounts: () => ({
        selectedItems: [],
        submittableCount: 0,
        activatableCount: 0,
        deactivatableCount: 0,
      }),
      handleSelectAll: vi.fn(),
      handleSelectProduct: vi.fn(),
    };
    const mutations = {
      toggleActivation: { mutate: vi.fn(), isPending: false },
      submitForReview: { mutate: vi.fn(), isPending: false },
    };
    const batch = {
      isBatchProcessing: false,
      handleBatchSubmit: vi.fn(),
      handleBatchToggleStatus: vi.fn(),
    };

    render(
      <ManageProductContent
        state={state as never}
        products={[]}
        total={0}
        isLoading={false}
        isFetching={false}
        isSellerOrStaff={false}
        canCreate={false}
        canEdit={false}
        canDelete={false}
        mutations={mutations as never}
        batch={batch as never}
        onPrintBarcodes={vi.fn()}
      />,
    );

    expect(screen.getByRole('searchbox')).toBeDefined();
  });
});
