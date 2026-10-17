import { useEffect, useMemo, useState } from 'react';

import type { AdminProductListItem, ProductStatus } from '@celebs/shared-types';

import type { PreviewFilters, PreviewStockFilter, ProductSortKey } from '../types';
import { applyPreviewFilters, sortKeyToParams } from '../utils/product-table-helpers';

import { useListQueryState } from '@/common/hooks/use-list-query-state';
import { useDebounce } from '@/hooks/use-debounce';

export const PRODUCT_STATUS_TABS: Array<{ id: ProductStatus | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'pending_review', label: 'Pending Review' },
  { id: 'published', label: 'Active (Published)' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'deactivated', label: 'Deactivated' },
];

const PRODUCT_TABS = [
  'all',
  'draft',
  'pending_review',
  'published',
  'rejected',
  'deactivated',
] as const;
const PRODUCT_SORTS = ['newest', 'price-asc', 'price-desc', 'name-asc'] as const;
const PREVIEW_KEYS = ['vendor', 'category', 'stock'] as const;

export function useManageProductState() {
  const listQuery = useListQueryState({
    defaultTab: 'all' as ProductStatus | 'all',
    allowedTabs: PRODUCT_TABS,
    defaultSort: 'newest' as ProductSortKey,
    allowedSorts: PRODUCT_SORTS,
    extraKeys: PREVIEW_KEYS,
  });
  const page = listQuery.page;
  const setPage = listQuery.setPage;
  const pageSize = listQuery.limit;
  const filterStatus = listQuery.tab;
  const sortKey = listQuery.sort;
  const [searchInput, setSearchInput] = useState(listQuery.q);
  const debouncedSearch = useDebounce(searchInput, 350);
  const previewVendor = listQuery.extras.vendor ?? 'all';
  const previewCategory = listQuery.extras.category ?? 'all';
  const previewStock = (listQuery.extras.stock ?? 'all') as PreviewStockFilter;

  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [archiveTarget, setArchiveTarget] = useState<AdminProductListItem | null>(null);
  const [isBatchArchiveOpen, setIsBatchArchiveOpen] = useState(false);

  useEffect(() => {
    if (debouncedSearch.trim() !== listQuery.q) listQuery.setQ(debouncedSearch);
  }, [debouncedSearch, listQuery]);

  useEffect(() => {
    if (listQuery.q !== searchInput) setSearchInput(listQuery.q);
  }, [listQuery.q, searchInput]);

  const filterParams = useMemo(
    () => ({
      page,
      limit: pageSize,
      search: debouncedSearch || undefined,
      status: filterStatus === 'all' ? undefined : (filterStatus as ProductStatus),
      ...sortKeyToParams(sortKey),
    }),
    [page, pageSize, debouncedSearch, filterStatus, sortKey],
  );

  const previewFilters: PreviewFilters = useMemo(
    () => ({ vendor: previewVendor, category: previewCategory, stock: previewStock }),
    [previewVendor, previewCategory, previewStock],
  );

  const applyPreview = (products: AdminProductListItem[]) =>
    applyPreviewFilters(products, previewFilters);

  const getSelectionCounts = (products: AdminProductListItem[]) => {
    const selectedItems = products.filter((p) => p.id && selectedProducts.includes(p.id));
    return {
      selectedItems,
      submittableCount: selectedItems.filter((p) => p.status === 'draft' || p.status === 'rejected')
        .length,
      activatableCount: selectedItems.filter((p) => p.status === 'deactivated').length,
      deactivatableCount: selectedItems.filter((p) => p.status === 'published').length,
    };
  };

  const handleSelectAll = (products: AdminProductListItem[]) => {
    const validIds = products.map((p) => p.id).filter((id): id is string => Boolean(id));
    setSelectedProducts(
      selectedProducts.length === validIds.length && validIds.length > 0 ? [] : validIds,
    );
  };

  const handleSelectProduct = (id: string, checked: boolean) => {
    setSelectedProducts((prev) => (checked ? [...prev, id] : prev.filter((item) => item !== id)));
  };

  const setFilterStatus = (value: string) => listQuery.setTab(value as ProductStatus | 'all');

  const setSortKey = (key: ProductSortKey) => listQuery.setSort(key);

  const setPageSize = (size: number) => listQuery.setLimit(size);

  const setPreviewVendor = (value: string) => listQuery.setExtra('vendor', value);
  const setPreviewCategory = (value: string) => listQuery.setExtra('category', value);
  const setPreviewStock = (value: PreviewStockFilter) => listQuery.setExtra('stock', value);

  const resetPreviewFilters = () => {
    listQuery.setExtras({ vendor: 'all', category: 'all', stock: 'all' });
  };

  const previewActive =
    previewVendor !== 'all' || previewCategory !== 'all' || previewStock !== 'all';

  return {
    page,
    setPage,
    pageSize,
    setPageSize,
    filterStatus,
    setFilterStatus,
    searchInput,
    setSearchInput,
    debouncedSearch,
    sortKey,
    setSortKey,
    previewVendor,
    setPreviewVendor,
    previewCategory,
    setPreviewCategory,
    previewStock,
    setPreviewStock,
    previewFilters,
    applyPreview,
    resetPreviewFilters,
    previewActive,
    selectedProducts,
    setSelectedProducts,
    archiveTarget,
    setArchiveTarget,
    isBatchArchiveOpen,
    setIsBatchArchiveOpen,
    filterParams,
    getSelectionCounts,
    handleSelectAll,
    handleSelectProduct,
  };
}
