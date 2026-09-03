import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';

import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import { Card } from '@celebs/shared-ui/components/card';
import { Checkbox } from '@celebs/shared-ui/components/checkbox';
import { EmptyState } from '@celebs/shared-ui/components/empty-state';

import type { ProductListItem } from '../../types';

import { statusBadgeVariant, statusLabels } from './product-status';

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
      {products.map((product) => {
        if (!product.id) return null;
        const productId = product.id;
        const price = Number(product.price ?? 0);
        const status = product.status ?? 'draft';
        const isSelected = selectedProducts.includes(productId);
        return (
          <Card key={productId} className="space-y-3 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => onSelectProduct(productId, !!checked)}
                aria-label={`Select ${product.name ?? 'product'}`}
                className="mt-1 shrink-0"
              />
              <img
                src={product.mainImages?.[0] || '/placeholder.svg'}
                alt={product.name ?? 'Product'}
                className="h-14 w-14 shrink-0 rounded-lg border bg-muted object-cover"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.onerror = null;
                  target.src = '/placeholder.svg';
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-foreground">
                  {product.name ?? 'Untitled'}
                </div>
                {product.brand && (
                  <div className="truncate text-xs text-muted-foreground">
                    Brand: {product.brand}
                  </div>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge variant={statusBadgeVariant(status)}>
                    {statusLabels[status] ?? status}
                  </Badge>
                </div>
              </div>
              <div className="shrink-0 text-right text-sm font-semibold text-foreground">
                Rs. {price.toLocaleString()}
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              {product.vendorName || 'Independent Seller'}
            </div>

            <div className="flex flex-wrap gap-2">
              {isSellerOrStaff && canCreate && (status === 'draft' || status === 'rejected') && (
                <Button
                  size="sm"
                  className="h-9 flex-1"
                  disabled={isSubmitPending}
                  onClick={() => onSubmit(productId)}
                >
                  Submit
                </Button>
              )}
              {isSellerOrStaff &&
                canEdit &&
                (status === 'published' || status === 'deactivated') && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 flex-1"
                    disabled={isTogglePending}
                    onClick={() => onToggleActivation(productId)}
                  >
                    {status === 'published' ? 'Deactivate' : 'Activate'}
                  </Button>
                )}
              <Button size="sm" variant="outline" className="h-9 flex-1" asChild>
                <Link to={`/products/edit/${productId}`}>Edit</Link>
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-9 flex-1"
                onClick={() => onSetArchiveTarget(product)}
              >
                Archive
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
