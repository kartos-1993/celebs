import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import type { AdminProductListItem } from '@celebs/shared-types';

import { getProductById } from '../../api';
import { PRODUCT_QUERY_KEYS } from '../../hooks/use-product-queries';

import { buildBarcodeItems } from './barcode-builder';
import type { BarcodePrintItem } from './barcode-print-modal';

export function useBarcodeItems(product?: AdminProductListItem | null) {
  const productId = product?.id;

  const { data: detailResponse, isLoading } = useQuery({
    queryKey: PRODUCT_QUERY_KEYS.detail(productId ?? ''),
    queryFn: () => getProductById(productId as string),
    enabled: Boolean(productId),
  });

  const items = useMemo<BarcodePrintItem[]>(() => {
    if (!product) return [];
    const source = detailResponse?.data ?? product;
    return buildBarcodeItems(source);
  }, [product, detailResponse]);

  return {
    items,
    isLoading,
  };
}
