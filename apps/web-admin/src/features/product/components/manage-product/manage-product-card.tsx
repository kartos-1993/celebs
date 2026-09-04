import React from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import { Card } from '@celebs/shared-ui/components/card';
import { Checkbox } from '@celebs/shared-ui/components/checkbox';

import type { ProductListItem } from '../../types';
import {
  formatShortDate,
  getCategoryName,
  getProductStock,
  getVendorDisplay,
} from '../../utils/product-table-helpers';

import { statusBadgeVariant, statusLabels } from './product-status';

interface ManageProductCardProps {
  product: ProductListItem;
  isSelected: boolean;
  onSelectProduct: (id: string, checked: boolean) => void;
  isSellerOrStaff: boolean;
  canCreate: boolean;
  canEdit: boolean;
  onSubmit: (id: string) => void;
  isSubmitPending: boolean;
  onToggleActivation: (id: string) => void;
  isTogglePending: boolean;
  onSetArchiveTarget: (product: ProductListItem) => void;
}

export const ManageProductCard: React.FC<ManageProductCardProps> = ({
  product,
  isSelected,
  onSelectProduct,
  isSellerOrStaff,
  canCreate,
  canEdit,
  onSubmit,
  isSubmitPending,
  onToggleActivation,
  isTogglePending,
  onSetArchiveTarget,
}) => {
  if (!product.id) return null;
  const productId = product.id;
  const price = Number(product.price ?? 0);
  const status = product.status ?? 'draft';
  const stock = getProductStock(product);
  const updated = formatShortDate(
    (product as { updatedAt?: unknown }).updatedAt ??
      (product as { createdAt?: unknown }).createdAt,
  );

  return (
    <Card className="space-y-3 p-4 shadow-sm">
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
          <div className="truncate text-sm font-medium leading-tight">
            {product.name ?? 'Untitled'}
          </div>
          {product.brand && (
            <div className="truncate text-xs text-muted-foreground">{product.brand}</div>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <Badge variant="secondary">{getCategoryName(product)}</Badge>
            <Badge variant={statusBadgeVariant(status)}>{statusLabels[status] ?? status}</Badge>
          </div>
        </div>
        <div className="shrink-0 text-right font-mono text-sm tabular-nums">
          Rs. {price.toLocaleString()}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="min-w-0 truncate">
          {getVendorDisplay(product)} · Updated {updated}
        </span>
        <span className="shrink-0 font-mono tabular-nums">Stock {stock}</span>
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
        {isSellerOrStaff && canEdit && (status === 'published' || status === 'deactivated') && (
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
};
