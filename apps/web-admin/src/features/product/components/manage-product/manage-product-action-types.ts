import type { AdminProductListItem } from '@celebs/shared-types';

export interface ManageProductActionHandlers {
  isSellerOrStaff: boolean;
  canCreate: boolean;
  canEdit: boolean;
  onSubmit: (id: string) => void;
  isSubmitPending: boolean;
  onToggleActivation: (id: string) => void;
  isTogglePending: boolean;
  onSetArchiveTarget: (product: AdminProductListItem) => void;
  onPrintBarcodes?: (product: AdminProductListItem) => void;
}
