import { useMemo, useState } from 'react';

import type { ProductListItem, ProductStatus } from '../types';

import { useDebounce } from '@/hooks/use-debounce';

const PAGE_SIZE = 10;

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
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 350);

  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showHelpNotification, setShowHelpNotification] = useState(true);
  const [archiveTarget, setArchiveTarget] = useState<ProductListItem | null>(null);
  const [isBatchArchiveOpen, setIsBatchArchiveOpen] = useState(false);

  const filterParams = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: debouncedSearch || undefined,
      status: filterStatus === 'all' ? undefined : (filterStatus as ProductStatus),
    }),
    [page, debouncedSearch, filterStatus],
  );

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

  return {
    page,
    setPage,
    filterStatus,
    setFilterStatus,
    searchInput,
    setSearchInput,
    debouncedSearch,
    selectedProducts,
    setSelectedProducts,
    showHelpNotification,
    setShowHelpNotification,
    archiveTarget,
    setArchiveTarget,
    isBatchArchiveOpen,
    setIsBatchArchiveOpen,
    filterParams,
    getSelectionCounts,
    handleSelectAll,
    handleSelectProduct,
    pageSize: PAGE_SIZE,
  };
}
