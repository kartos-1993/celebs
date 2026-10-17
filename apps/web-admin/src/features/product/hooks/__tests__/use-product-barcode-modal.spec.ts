import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { AdminProductDetail } from '@celebs/shared-types';

import { useProductBarcodeModal } from '../use-product-barcode-modal';

function detail(status: string): AdminProductDetail {
  return { id: 'prod-1', name: 'Tee', price: 500, status };
}

describe('useProductBarcodeModal', () => {
  it('opens in edit mode regardless of status (matches the header gate)', () => {
    const { result } = renderHook(() => useProductBarcodeModal(detail('draft'), true));
    act(() => result.current.openModal());
    expect(result.current.isOpen).toBe(true);
  });

  it('stays closed outside edit mode even for a published product (matches the header gate)', () => {
    const { result } = renderHook(() => useProductBarcodeModal(detail('published'), false));
    act(() => result.current.openModal());
    expect(result.current.isOpen).toBe(false);
  });

  it('stays closed outside edit mode when no product is loaded', () => {
    const { result } = renderHook(() => useProductBarcodeModal(undefined, false));
    act(() => result.current.openModal());
    expect(result.current.isOpen).toBe(false);
  });

  it('builds items only while the modal is open', () => {
    const { result } = renderHook(() => useProductBarcodeModal(detail('published'), true));
    expect(result.current.items).toEqual([]);

    act(() => result.current.openModal());
    expect(result.current.items[0]?.sku).toBe('CLB-HUB-PROD1');

    act(() => result.current.closeModal());
    expect(result.current.items).toEqual([]);
  });
});
