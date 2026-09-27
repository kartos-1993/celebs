import { useCallback, useMemo, useState } from 'react';

import type { AdminProductDetail } from '@celebs/shared-types';

import { buildBarcodeItems, canPrintBarcodes } from '../components/barcode/barcode-builder';
import type { BarcodePrintItem } from '../components/barcode/barcode-print-modal';

export function useProductBarcodeModal(product?: AdminProductDetail | null, isEditMode = false) {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = useCallback(() => {
    // Same gate + same input as AddProductHeader: the add/edit page has no list
    // product, so barcode printing is edit-mode only.
    if (canPrintBarcodes(undefined, { isEditMode })) {
      setIsOpen(true);
    }
  }, [isEditMode]);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const items = useMemo<BarcodePrintItem[]>(() => {
    if (!isOpen || !product) return [];
    return buildBarcodeItems(product);
  }, [isOpen, product]);

  return {
    isOpen,
    openModal,
    closeModal,
    items,
  };
}
