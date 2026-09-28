// Shared SAME-input fixtures for side-by-side presenter output pinning.
// Both presenter layers consume these rows, so every divergence below is captured
// as data with zero behavior change. No production code is touched by this file.

export function baseRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'p-tee-1',
    name: 'Fixture Tee',
    brand: 'Celebs',
    brandId: null,
    price: 2000,
    discountedPrice: 1800,
    description: 'A tee used to pin presenter behavior.',
    status: 'published',
    vendorId: 'v1',
    vendorName: 'Celebs Official',
    categoryId: 'c1-uuid',
    subcategoryId: 's1-uuid',
    mainImages: ['cover.jpg'],
    sizes: [],
    colorVariants: [],
    skus: [],
    inventories: [],
    ratingAverage: 4.5,
    ratingCount: 12,
    ...overrides,
  };
}

// Dynamic-form colorMeta path: swatch stored separately from images.
export function dynamicSwatchRow(): Record<string, unknown> {
  return baseRow({
    dynamicData: {
      variants: {
        colorMeta: {
          '#ff0000': {
            name: 'Red',
            swatch: 'sw-red.jpg',
            images: ['red-1.jpg'],
            stocks: [{ size: 'M', quantity: 2 }],
          },
        },
      },
    },
  });
}

// Legacy column path: swatch + images stored side by side.
export function legacySwatchRow(): Record<string, unknown> {
  return baseRow({
    colorVariants: [
      {
        name: 'Red',
        swatch: 'sw-red.jpg',
        images: ['red-1.jpg', 'red-2.jpg'],
        stocks: [{ size: 'S', quantity: 1 }],
      },
    ],
  });
}

// Legacy gallery that still carries the swatch as its first photo — the only
// shape the leading-swatch-duplicate strip ever fires on. The storefront
// shapes hide the duplicate; the admin detail must NOT, because the edit form
// posts `colorVariants` straight back and a strip there deletes a stored image.
export function leadingSwatchDupeRow(): Record<string, unknown> {
  return baseRow({
    mainImages: [],
    colorVariants: [
      {
        name: 'Red',
        colorCode: '#ff0000',
        swatch: 'sw-red.jpg',
        images: ['sw-red.jpg', 'red-1.jpg', 'red-2.jpg'],
        stocks: [{ size: 'M', quantity: 4 }],
      },
    ],
  });
}

export function legacyNoSwatchRow(): Record<string, unknown> {
  return baseRow({
    colorVariants: [{ name: 'Red', images: ['red-1.jpg'] }],
  });
}

// Invalid deal: discounted price at/above the base price.
export function invalidDiscountRow(): Record<string, unknown> {
  return baseRow({ price: 2000, discountedPrice: 2500 });
}

export function noCategoryObjectRow(): Record<string, unknown> {
  return baseRow({ categoryId: 'c1-uuid', subcategoryId: 's1-uuid' });
}

export function categoryObjectRow(): Record<string, unknown> {
  return baseRow({ category: { id: 'c1', name: 'Denim', imageUrl: 'cat.jpg' } });
}

export function emptyStockRow(): Record<string, unknown> {
  return baseRow({ colorVariants: [] });
}

export function zeroStockRow(): Record<string, unknown> {
  return baseRow({
    colorVariants: [{ name: 'Red', images: ['red-1.jpg'], stocks: [{ size: 'S', quantity: 0 }] }],
  });
}

export function liveInventoryRow(): Record<string, unknown> {
  return baseRow({
    dynamicData: {
      variants: {
        colorMeta: {
          '#ff0000': {
            name: 'Red',
            images: ['red-1.jpg'],
            stocks: [{ size: 'M', quantity: 2 }],
          },
        },
      },
    },
    inventories: [{ colorVariantName: 'Red', size: 'M', quantity: 5, reservedQuantity: 1 }],
    reviewNote: 'needs a second look',
  });
}

// Second inventory row carries the client default flag and has no matching raw
// SKU, so the index-vs-flag and price-fallback behaviors are both observable.
export function adminSkuRow(): Record<string, unknown> {
  return baseRow({
    price: 2000,
    inventories: [
      { colorVariantName: 'Red', size: 'M', quantity: 3, sku: 'SKU-RED-M' },
      { colorVariantName: 'Green', size: 'S', quantity: 2, sku: 'SKU-GRN-S', isDefault: true },
    ],
    skus: [
      {
        selectedOptions: { Color: 'Red', Size: 'M' },
        price: 2100,
        discountedPrice: 1900,
        stock: 3,
        isDefault: false,
      },
    ],
  });
}

export function comboRow(): Record<string, unknown> {
  return baseRow({
    sizes: [{ name: 'S', productMeasurements: [], bodyMeasurements: [] }],
    skus: [
      {
        selectedOptions: { Color: 'Red', Size: 'M' },
        price: 2100,
        discountedPrice: 1900,
        stock: 4,
      },
      { selectedOptions: { Color: 'Blue', Size: 'M' }, price: 2300, stock: 6 },
    ],
  });
}

export function sizesFallbackRow(): Record<string, unknown> {
  return baseRow({
    mainImages: [],
    sizes: [],
    colorVariants: [{ name: 'Red', images: ['red-1.jpg'], stocks: [{ size: 'M', quantity: 2 }] }],
  });
}

export function noCoverRow(): Record<string, unknown> {
  return baseRow({ mainImages: [], colorVariants: [] });
}

// Size-only carrier: one gallery, three sizes, NO colour axis. The single
// `Default` entry is storage plumbing (the inventory matrix and the publish
// floor depend on it) and must never reach a client as a colour.
export function carrierOnlyRow(): Record<string, unknown> {
  return baseRow({
    colorVariants: [
      {
        name: 'Default',
        colorCode: '#000000',
        images: ['cover.jpg', 'jacket-2.jpg'],
        stocks: [{ size: 'M', quantity: 3 }],
      },
    ],
  });
}

// A REAL colour axis that still stores the carrier alongside it — the shape a
// product passes through while it gains its first colour. The carrier must be
// dropped without taking the real colour (or the declared axis) with it.
export function carrierPlusColorRow(): Record<string, unknown> {
  return baseRow({
    colorVariants: [
      {
        name: 'Default',
        colorCode: '#000000',
        images: ['cover.jpg'],
        stocks: [{ size: 'M', quantity: 3 }],
      },
      {
        name: 'Red',
        colorCode: '#ff0000',
        images: ['red-1.jpg'],
        stocks: [{ size: 'M', quantity: 1 }],
      },
    ],
  });
}
