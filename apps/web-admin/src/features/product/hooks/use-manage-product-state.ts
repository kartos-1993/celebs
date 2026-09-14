import { useMemo, useState } from 'react';

import type {
  PreviewFilters,
  PreviewStockFilter,
  ProductListItem,
  ProductSortKey,
  ProductStatus,
} from '../types';
import { applyPreviewFilters, sortKeyToParams } from '../utils/product-table-helpers';

import { useDebounce } from '@/hooks/use-debounce';

export const PRODUCT_STATUS_TABS: Array<{ id: ProductStatus | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'pending_review', label: 'Pending Review' },
  { id: 'published', label: 'Active (Published)' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'deactivated', label: 'Deactivated' },
];

export function useManageProductState() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(10);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 350);
  const [sortKey, setSortKeyState] = useState<ProductSortKey>('newest');
  const [previewVendor, setPreviewVendor] = useState('all');
  const [previewCategory, setPreviewCategory] = useState('all');
  const [previewStock, setPreviewStock] = useState<PreviewStockFilter>('all');

  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [archiveTarget, setArchiveTarget] = useState<ProductListItem | null>(null);
  const [isBatchArchiveOpen, setIsBatchArchiveOpen] = useState(false);

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

  const applyPreview = (products: ProductListItem[]) =>
    applyPreviewFilters(products, previewFilters);

  const getSelectionCounts = (products: ProductListItem[]) => {
    const selectedItems = products.filter((p) => p.id && selectedProducts.includes(p.id));
    return {
      selectedItems,
      submittableCount: selectedItems.filter((p) => p.status === 'draft' || p.status === 'rejected')
        .length,
      activatableCount: selectedItems.filter((p) => p.status === 'deactivated').length,
      deactivatableCount: selectedItems.filter((p) => p.status === 'published').length,
    };
  };

  const handleSelectAll = (products: ProductListItem[]) => {
    const validIds = products.map((p) => p.id).filter((id): id is string => Boolean(id));
    setSelectedProducts(
      selectedProducts.length === validIds.length && validIds.length > 0 ? [] : validIds,
    );
  };

  const handleSelectProduct = (id: string, checked: boolean) => {
    setSelectedProducts((prev) => (checked ? [...prev, id] : prev.filter((item) => item !== id)));
  };

  const setSortKey = (key: ProductSortKey) => {
    setSortKeyState(key);
    setPage(1);
  };

  const setPageSize = (size: number) => {
    setPageSizeState(size);
    setPage(1);
  };

  const resetPreviewFilters = () => {
    setPreviewVendor('all');
    setPreviewCategory('all');
    setPreviewStock('all');
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
