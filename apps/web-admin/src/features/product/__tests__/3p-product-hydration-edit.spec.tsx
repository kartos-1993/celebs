import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AdminProductDetail } from '@celebs/shared-types';

import * as productApi from '../api';
import AddProduct from '../components/add-product';

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('Mount AddProduct with 3P product', () => {
  it('mounts AddProduct and hydrates form values', async () => {
    const adminDetailRes = {
      success: true,
      message: 'OK',
      data: {
        id: '1b853e0c-729b-4923-b66c-3f9b81333d4f',
        name: "Retro Suede Men's Casual Lightweight Zipper Jacket Top, Western Style Outerwear",
        brand: 'Generic / Unbranded',
        brandId: 'e3355603-a94c-4e48-a659-1b639c10c9e5',
        description: "Retro Suede Men's Casual Lightweight Zipper Jacket Top.",
        price: 5290,
        discountedPrice: 4480,
        status: 'published',
        categoryId: 'e4d12509-c129-4295-8cea-db6136c47914',
        subcategoryId: 'ece5078c-bd07-4b34-b356-df694fa61c01',
        category: {
          id: 'e4d12509-c129-4295-8cea-db6136c47914',
          name: 'Men Outerwear',
          slug: 'men-outerwear',
          path: 'men/men-outerwear',
          level: 2,
        },
        subcategory: {
          id: 'ece5078c-bd07-4b34-b356-df694fa61c01',
          name: 'Men Jackets and Coats',
          slug: 'men-jackets-and-coats',
          path: 'men-jackets-and-coats',
          level: 3,
        },
        cover:
          'https://img.ltwebstatic.com/v4/j/spmp/2026/10/07/9d/17913386344006bc0642fa70dac690945748a822ad.webp',
        mainImages: [
          'https://img.ltwebstatic.com/v4/j/spmp/2026/10/07/9d/17913386344006bc0642fa70dac690945748a822ad.webp',
        ],
        sizes: [
          {
            name: 'XS',
            bodyMeasurements: [],
            productMeasurements: [{ name: 'Length', value: '68', unit: 'cm' }],
          },
          {
            name: 'S',
            bodyMeasurements: [],
            productMeasurements: [{ name: 'Length', value: '70', unit: 'cm' }],
          },
        ],
        colorVariants: [
          {
            name: 'Army Green',
            colorCode: '#4B5320',
            swatch:
              'https://img.ltwebstatic.com/v4/j/spmp/2026/10/07/9d/17913386344006bc0642fa70dac690945748a822ad.webp',
            images: [
              'https://img.ltwebstatic.com/v4/j/spmp/2026/10/07/9d/17913386344006bc0642fa70dac690945748a822ad.webp',
            ],
            stocks: [
              { size: 'XS', quantity: 25 },
              { size: 'S', quantity: 25 },
            ],
          },
        ],
        skus: [
          {
            skuCode: 'BRO-JKT-10-V1-ARMY-XS',
            selectedOptions: { Color: 'Army Green', Size: 'XS' },
            price: 5290,
            discountedPrice: 4480,
            stock: 25,
            isDefault: true,
          },
        ],
        variantOptions: [
          { name: 'Color', values: ['Army Green'] },
          { name: 'Size', values: ['XS', 'S'] },
        ],
        dynamicData: {
          values: { Color: 'Army Green', Style: 'Western Style' },
          variants: {
            colorMeta: {
              'Army Green': {
                swatch:
                  'https://img.ltwebstatic.com/v4/j/spmp/2026/10/07/9d/17913386344006bc0642fa70dac690945748a822ad.webp',
                images: [
                  'https://img.ltwebstatic.com/v4/j/spmp/2026/10/07/9d/17913386344006bc0642fa70dac690945748a822ad.webp',
                ],
              },
            },
          },
          uploadedAssets: {
            colorMeta: {
              'Army Green': {
                swatch:
                  'https://img.ltwebstatic.com/v4/j/spmp/2026/10/07/9d/17913386344006bc0642fa70dac690945748a822ad.webp',
                images: [
                  'https://img.ltwebstatic.com/v4/j/spmp/2026/10/07/9d/17913386344006bc0642fa70dac690945748a822ad.webp',
                ],
              },
            },
            mainImages: [
              'https://img.ltwebstatic.com/v4/j/spmp/2026/10/07/9d/17913386344006bc0642fa70dac690945748a822ad.webp',
            ],
          },
          variantFields: [
            { key: 'Color', kind: 'color' },
            { key: 'Size', kind: 'size' },
          ],
        },
      },
    };

    vi.spyOn(productApi, 'getProductById').mockResolvedValue(
      adminDetailRes as unknown as productApi.ProductApiResponse<AdminProductDetail>,
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/products/edit/1b853e0c-729b-4923-b66c-3f9b81333d4f']}>
          <Routes>
            <Route path="/products/edit/:id" element={<AddProduct />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(
      () => {
        expect(screen.queryByLabelText('Loading page')).toBeNull();
      },
      { timeout: 4000 },
    );

    console.log('AFTER PAGE LOADER DOM BODY:', document.body.innerHTML);
    const titleInput = screen.getByTestId('product-name-input') as HTMLTextAreaElement;
    expect(titleInput.value).toBe(
      "Retro Suede Men's Casual Lightweight Zipper Jacket Top, Western Style Outerwear",
    );
  });
});
