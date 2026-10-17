import { describe, expect, it } from 'vitest';

import type { Product } from '../../hooks/use-products';
import { isProductFullyOutOfStock, planCartAdd } from '../stock';

describe('Simple Product Stock Evaluation and Cart Planning', () => {
  it('evaluates simple product with live stock as in-stock on mobile', () => {
    const simpleProduct = {
      id: 'simple-p1',
      name: 'Wireless Bluetooth Earbuds',
      inStock: true,
      colorVariants: [],
      price: 2999,
    } as unknown as Product;

    // Simple product must NOT be flagged as out-of-stock when inStock is true
    expect(isProductFullyOutOfStock(simpleProduct)).toBe(false);
  });

  it('evaluates simple product with totalStock as in-stock when colorVariants are absent', () => {
    const simpleProduct = {
      id: 'simple-p2',
      name: 'Ceramic Coffee Mug',
      totalStock: 25,
      inStock: true,
      price: 650,
    } as unknown as Product;

    expect(isProductFullyOutOfStock(simpleProduct)).toBe(false);
  });

  it('flags simple product as out of stock when inStock is explicitly false', () => {
    const simpleProduct = {
      id: 'simple-p3',
      name: 'Sold Out Item',
      inStock: false,
      colorVariants: [],
      price: 500,
    } as unknown as Product;

    expect(isProductFullyOutOfStock(simpleProduct)).toBe(true);
  });

  it('plans cart addition for colourless and sizeless product with default carrier token', () => {
    const simpleProduct = {
      id: 'simple-p4',
      name: 'Minimalist Leather Wallet',
      inStock: true,
      colorVariants: [],
      sizes: [],
      price: 1500,
    } as unknown as Product;

    const plan = planCartAdd({
      product: simpleProduct,
      variantIndex: 0,
      requestedSize: '',
      isFullyOutOfStock: false,
    });

    // Must resolve to add with standard default carrier token rather than unresolved or out-of-stock
    expect(plan).toEqual({
      kind: 'add',
      size: 'Default',
      color: 'Default',
    });
  });

  it('requires size selection when colourless product defines sizes but user has not picked one', () => {
    const sizedColourlessProduct = {
      id: 'simple-p5',
      name: 'Unisex Oversized Hoodie',
      inStock: true,
      colorVariants: [],
      sizes: [{ name: 'M' }, { name: 'L' }],
      price: 3200,
    } as unknown as Product;

    const plan = planCartAdd({
      product: sizedColourlessProduct,
      variantIndex: 0,
      requestedSize: '',
      isFullyOutOfStock: false,
    });

    expect(plan).toEqual({ kind: 'pick-size' });
  });

  it('plans cart addition with selected size and default carrier color when size is selected', () => {
    const sizedColourlessProduct = {
      id: 'simple-p6',
      name: 'Unisex Oversized Hoodie',
      inStock: true,
      colorVariants: [],
      sizes: [{ name: 'M' }, { name: 'L' }],
      price: 3200,
    } as unknown as Product;

    const plan = planCartAdd({
      product: sizedColourlessProduct,
      variantIndex: 0,
      requestedSize: 'L',
      isFullyOutOfStock: false,
    });

    expect(plan).toEqual({
      kind: 'add',
      size: 'L',
      color: 'Default',
    });
  });
});
