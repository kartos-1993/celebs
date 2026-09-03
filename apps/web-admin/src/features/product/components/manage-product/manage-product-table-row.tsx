import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, Pencil } from 'lucide-react';

import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import { Checkbox } from '@celebs/shared-ui/components/checkbox';
import { TableCell, TableRow } from '@celebs/shared-ui/components/table';

import type { ProductListItem } from '../../types';

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

  return (
    <TableRow>
      <TableCell>
        <Checkbox checked={isSelected} onCheckedChange={(checked) => onSelect(!!checked)} />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <img
            src={product.mainImages?.[0] || '/placeholder.svg'}
            alt={product.name ?? 'Product'}
            className="h-12 w-12 rounded object-cover border bg-muted"
            onError={(e) => {
              const target = e.currentTarget;
              target.onerror = null;
              target.src = '/placeholder.svg';
            }}
          />
          <div className="min-w-0">
            <div className="font-medium max-w-xs truncate">{product.name ?? 'Untitled'}</div>
            {product.brand && (
              <div className="text-xs text-muted-foreground truncate">Brand: {product.brand}</div>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right font-semibold">Rs. {price.toLocaleString()}</TableCell>
      <TableCell>
        <Badge variant={statusBadgeVariant(status)}>{statusLabels[status] ?? status}</Badge>
      </TableCell>
      <TableCell className="text-sm">{product.vendorName || 'Independent Seller'}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
          {isSellerOrStaff && canCreate && (status === 'draft' || status === 'rejected') && (
            <Button size="sm" disabled={isSubmitPending} onClick={() => onSubmit(productId)}>
              Submit
            </Button>
          )}
          {isSellerOrStaff && canEdit && (status === 'published' || status === 'deactivated') && (
            <Button
              size="sm"
              variant="outline"
              disabled={isTogglePending}
              onClick={() => onToggleActivation(productId)}
            >
              {status === 'published' ? 'Deactivate' : 'Activate'}
            </Button>
          )}
          <RowActionsMenu
            label={`Actions for ${product.name ?? 'product'}`}
            items={[
              {
                label: 'Edit',
                icon: Pencil,
                onSelect: () => navigate(`/products/edit/${productId}`),
              },
              {
                label: 'Archive (Delete)',
                icon: Archive,
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
