import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar } from 'lucide-react';

import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import { Checkbox } from '@celebs/shared-ui/components/checkbox';
import { TableCell, TableRow } from '@celebs/shared-ui/components/table';

import type { ProductListItem } from '../../types';
import {
  formatShortDate,
  getCategoryName,
  getInitials,
  getProductStock,
  getVendorDisplay,
} from '../../utils/product-table-helpers';

import { statusBadgeVariant, statusLabels } from './product-status';

import { RowActionsMenu } from '@/components/row-actions-menu';

interface ManageProductTableRowProps {
  product: ProductListItem;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  isSellerOrStaff: boolean;
  canCreate: boolean;
  canEdit: boolean;
  onSubmit: (id: string) => void;
  isSubmitPending: boolean;
  onToggleActivation: (id: string) => void;
  isTogglePending: boolean;
  onSetArchiveTarget: (product: ProductListItem) => void;
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
  const navigate = useNavigate();
  if (!product.id) return null;
  const productId = product.id;
  const price = Number(product.price ?? 0);
  const status = product.status ?? 'draft';
  const vendor = getVendorDisplay(product);
  const stock = getProductStock(product);
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
        <div className="flex items-center gap-3">
          <img
            src={product.mainImages?.[0] || '/placeholder.svg'}
            alt={product.name ?? 'Product'}
            className="h-10 w-10 shrink-0 rounded-lg border bg-muted object-cover"
            onError={(e) => {
              const target = e.currentTarget;
              target.onerror = null;
              target.src = '/placeholder.svg';
            }}
          />
          <div className="min-w-0">
            <div className="max-w-55 truncate text-sm font-medium leading-tight">
              {product.name ?? 'Untitled'}
            </div>
            {product.brand && (
              <div className="truncate text-xs text-muted-foreground">{product.brand}</div>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap items-center gap-1">
          <Badge variant="secondary">{getCategoryName(product)}</Badge>
          <Badge variant={statusBadgeVariant(status)}>{statusLabels[status] ?? status}</Badge>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {getInitials(vendor)}
          </span>
          <span className="max-w-32 truncate text-sm">{vendor}</span>
        </div>
      </TableCell>
      <TableCell className="text-right font-mono text-sm tabular-nums">{stock}</TableCell>
      <TableCell className="text-right font-mono text-sm tabular-nums">
        Rs. {price.toLocaleString()}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="whitespace-nowrap">{updated}</span>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1 whitespace-nowrap">
          {isSellerOrStaff && canCreate && (status === 'draft' || status === 'rejected') && (
            <Button
              size="sm"
              className="h-7 px-2 text-xs"
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
              className="h-7 px-2 text-xs"
              disabled={isTogglePending}
              onClick={() => onToggleActivation(productId)}
            >
              {status === 'published' ? 'Deactivate' : 'Activate'}
            </Button>
          )}
          <RowActionsMenu
            label={`Actions for ${product.name ?? 'product'}`}
            items={[
              { label: 'Edit', onSelect: () => navigate(`/products/edit/${productId}`) },
              {
                label: 'Archive (Delete)',
                onSelect: () => onSetArchiveTarget(product),
                destructive: true,
              },
            ]}
          />
        </div>
      </TableCell>
    </TableRow>
  );
};
