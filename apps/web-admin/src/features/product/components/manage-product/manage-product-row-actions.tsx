import React from 'react';
import { useNavigate } from 'react-router-dom';

import type { AdminProductListItem } from '@celebs/shared-types';
import { Button } from '@celebs/shared-ui/components/button';

import { RowActionsMenu } from '@/components/row-actions-menu';

interface ManageProductRowActionsProps {
  product: AdminProductListItem;
  isSellerOrStaff: boolean;
  canCreate: boolean;
  canEdit: boolean;
  onSubmit: (id: string) => void;
  isSubmitPending: boolean;
  onToggleActivation: (id: string) => void;
  isTogglePending: boolean;
  onSetArchiveTarget: (product: AdminProductListItem) => void;
}

export const ManageProductRowActions: React.FC<ManageProductRowActionsProps> = ({
  product,
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
  const productId = product.id;
  const status = product.status ?? 'draft';

  return (
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
  );
};
