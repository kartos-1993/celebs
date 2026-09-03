import React from 'react';
import { Link } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';

import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import { Checkbox } from '@celebs/shared-ui/components/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@celebs/shared-ui/components/dropdown-menu';
import { TableCell, TableRow } from '@celebs/shared-ui/components/table';

import type { ProductListItem } from '../../types';

import { statusBadgeVariant, statusLabels } from './product-status';

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open actions menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/products/edit/${productId}`}>Edit</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSetArchiveTarget(product)}>
                Archive (Delete)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
};
