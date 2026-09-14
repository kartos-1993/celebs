import React from 'react';
import { ShoppingBag } from 'lucide-react';

import { EmptyState } from '@celebs/shared-ui/components/empty-state';

import type { ProductListItem } from '../../types';

import { ManageProductCard } from './manage-product-card';

interface ManageProductCardsProps {
  products: ProductListItem[];
  isLoading: boolean;
  isFetching: boolean;
  selectedProducts: string[];
  onSelectProduct: (id: string, checked: boolean) => void;
  isSellerOrStaff: boolean;
  canCreate: boolean;
  canEdit: boolean;
  onSubmit: (id: string) => void;
  isSubmitPending: boolean;
  onToggleActivation: (id: string) => void;
  isTogglePending: boolean;
  onSetArchiveTarget: (product: ProductListItem) => void;
  searchQuery: string;
}

/** Mobile products list — cards below md, paired with ManageProductTable. */
export const ManageProductCards: React.FC<ManageProductCardsProps> = ({
  products,
  isLoading,
  isFetching,
  selectedProducts,
  onSelectProduct,
  isSellerOrStaff,
  canCreate,
  canEdit,
  onSubmit,
  isSubmitPending,
  onToggleActivation,
  isTogglePending,
  onSetArchiveTarget,
  searchQuery,
}) => {
  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground md:hidden">
        Loading products...
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="md:hidden">
        <EmptyState
          icon={<ShoppingBag className="h-8 w-8" />}
          title="No products found"
          description={
            searchQuery
              ? `Nothing matches "${searchQuery}". Try a different search or status filter.`
              : 'Try a different status filter, or create your first product.'
          }
        />
      </div>
    );
  }

  return (
    <div className={`space-y-3 transition-opacity md:hidden ${isFetching ? 'opacity-60' : ''}`}>
      {products.map((product) => (
        <ManageProductCard
          key={product.id}
          product={product}
          isSelected={Boolean(product.id && selectedProducts.includes(product.id))}
          onSelectProduct={onSelectProduct}
          isSellerOrStaff={isSellerOrStaff}
          canCreate={canCreate}
          canEdit={canEdit}
          onSubmit={onSubmit}
          isSubmitPending={isSubmitPending}
          onToggleActivation={onToggleActivation}
          isTogglePending={isTogglePending}
          onSetArchiveTarget={onSetArchiveTarget}
        />
      ))}
    </div>
  );
};
