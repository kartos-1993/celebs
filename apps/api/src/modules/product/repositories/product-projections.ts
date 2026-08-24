/**
 * Reusable, high-performance Prisma select projections to prevent JSONB bloat and overfetching.
 */

export const PRODUCT_LIST_SELECT = {
  id: true,
  name: true,
  brand: true,
  brandId: true,
  slug: true,
  price: true,
  discountedPrice: true,
  status: true,
  featured: true,
  mainImages: true,
  // Storefront cards derive color swatch dots from these two fields
  colorVariants: true,
  dynamicData: true,
  vendorId: true,
  vendorName: true,
  categoryId: true,
  subcategoryId: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
      path: true,
      level: true,
    },
  },
  subcategory: {
    select: {
      id: true,
      name: true,
      slug: true,
      path: true,
      level: true,
    },
  },
  brandRef: {
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      tier: true,
      isGated: true,
      countryOfOrigin: true,
    },
  },
} as const;

export const PRODUCT_DETAIL_SELECT = {
  ...PRODUCT_LIST_SELECT,
  description: true,
  sizes: true,
  colorVariants: true,
  skus: true,
  variantOptions: true,
  dynamicData: true,
  tags: true,
  qualityScore: true,
  reviewNote: true,
  rejectionReasonCategory: true,
  rejectionSubcategories: true,
  rejectionFields: true,
  reviewHistory: true,
  reviewedBy: true,
  reviewedAt: true,
  createdBy: true,
  updatedBy: true,
} as const;

export const PRODUCT_DETAIL_INCLUDE = {
  category: { select: { id: true, name: true, slug: true, path: true, level: true } },
  subcategory: { select: { id: true, name: true, slug: true, path: true, level: true } },
  brandRef: {
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      tier: true,
      isGated: true,
      countryOfOrigin: true,
    },
  },
} as const;
