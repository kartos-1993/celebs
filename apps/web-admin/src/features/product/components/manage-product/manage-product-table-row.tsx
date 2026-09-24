import React from 'react';
import { Calendar } from 'lucide-react';

import type { AdminProductListItem } from '@celebs/shared-types';
import { Badge } from '@celebs/shared-ui/components/badge';
import { Checkbox } from '@celebs/shared-ui/components/checkbox';
import { TableCell, TableRow } from '@celebs/shared-ui/components/table';

import {
  formatShortDate,
  getCategoryImage,
  getCategoryName,
  getInitials,
  getProductCover,
  getProductStock,
  getVendorDisplay,
} from '../../utils/product-table-helpers';

import { ManageProductRowActions } from './manage-product-row-actions';
import { statusBadgeVariant, statusLabels } from './product-status';

interface ManageProductTableRowProps {
  product: AdminProductListItem;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  isSellerOrStaff: boolean;
  canCreate: boolean;
  canEdit: boolean;
  onSubmit: (id: string) => void;
  isSubmitPending: boolean;
  onToggleActivation: (id: string) => void;
  isTogglePending: boolean;
  onSetArchiveTarget: (product: AdminProductListItem) => void;
}

export const ManageProductTableRow: React.FC<ManageProductTableRowProps> = ({
  product,
  isSelected,
  onSelect,
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
  const price = Number(product.price ?? 0);
  const status = product.status ?? 'draft';
  const vendor = getVendorDisplay(product);
  const stock = getProductStock(product);
  const coverImage = getProductCover(product);
  const categoryImage = getCategoryImage(product);
  const updated = formatShortDate(
    (product as { updatedAt?: unknown }).updatedAt ??
      (product as { createdAt?: unknown }).createdAt,
  );

  return (
    <TableRow data-state={isSelected ? 'selected' : undefined}>
      <TableCell>
        <Checkbox checked={isSelected} onCheckedChange={(checked) => onSelect(!!checked)} />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <img
            src={coverImage}
            alt={product.name ?? 'Product'}
            className="h-8 w-8 shrink-0 rounded-md border bg-muted object-cover"
            onError={(e) => {
              const target = e.currentTarget;
              target.onerror = null;
              target.src = '/placeholder.svg';
            }}
          />
          <div className="min-w-0">
            <div className="max-w-55 truncate text-sm font-semibold tracking-tight leading-tight text-foreground">
              {product.name ?? 'Untitled'}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap items-center gap-1">
          {categoryImage ? (
            <img
              src={categoryImage}
              alt=""
              aria-hidden="true"
              className="h-5 w-5 shrink-0 rounded border bg-muted object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : null}
          <Badge variant="secondary">{getCategoryName(product)}</Badge>
          <Badge variant={statusBadgeVariant(status)}>{statusLabels[status] ?? status}</Badge>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {getInitials(vendor)}
          </span>
          <span className="max-w-32 truncate text-sm text-foreground">{vendor}</span>
        </div>
      </TableCell>
      <TableCell className="text-right font-mono text-xs tabular-nums">{stock}</TableCell>
      <TableCell className="text-right font-mono text-xs tabular-nums">
        Rs. {price.toLocaleString()}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="whitespace-nowrap">{updated}</span>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <ManageProductRowActions
          product={product}
          isSellerOrStaff={isSellerOrStaff}
          canCreate={canCreate}
          canEdit={canEdit}
          onSubmit={onSubmit}
          isSubmitPending={isSubmitPending}
          onToggleActivation={onToggleActivation}
          isTogglePending={isTogglePending}
          onSetArchiveTarget={onSetArchiveTarget}
        />
      </TableCell>
    </TableRow>
  );
};
