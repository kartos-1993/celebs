import { type Product } from '@prisma/client';

import { CreateProductType } from '@celebs/shared-types';

import { appendAuditEntry, buildProductAuditDiff } from './utils/product-audit';
import { toJsonInput } from './product-assets';
import { PRODUCT_STATUS } from './product-status';

type CreateProductInput = CreateProductType;

/**
 * Pure input → Prisma data mappers for product create/update writes.
 */
export function buildProductCreateData(
  input: CreateProductInput,
  opts: {
    slug: string;
    categoryId: string;
    subcategoryId: string;
    brandId: string | null;
    brandName: string | null;
    userId: string;
    vendorId?: string | null;
    vendorName?: string;
  },
) {
  return {
    name: input.name.trim(),
    brand: opts.brandName || undefined,
    brandId: opts.brandId || undefined,
    slug: opts.slug,
    description: input.description?.trim() || '',
    price: input.price,
    discountedPrice: input.discountedPrice,
    categoryId: opts.categoryId,
    subcategoryId: opts.subcategoryId,
    sizes: toJsonInput(input.sizes) ?? [],
    colorVariants: toJsonInput(input.colorVariants) ?? [],
    skus: toJsonInput(input.skus) ?? [],
    variantOptions: toJsonInput(input.variantOptions) ?? [],
    mainImages: input.mainImages ?? [],
    dynamicData: toJsonInput(input.dynamicData) ?? {},
    tags: input.tags ?? [],
    featured: input.featured ?? false,
    status: input.status ?? PRODUCT_STATUS.DRAFT,
    vendorId: opts.vendorId || undefined,
    vendorName: opts.vendorName || undefined,
    createdBy: opts.userId,
    updatedBy: opts.userId,
  };
}

export function buildProductUpdateData(
  product: Product,
  updateData: Partial<CreateProductInput>,
  opts: {
    slug: string;
    resolvedCategoryId: string;
    resolvedSubcategoryId: string | null;
    resolvedBrandId: string | null;
    resolvedBrandName: string | null;
    userId: string;
    role: string;
    crossStoreEdit: boolean;
    auditChanges: ReturnType<typeof buildProductAuditDiff>;
  },
) {
  return {
    ...(updateData.name ? { name: updateData.name.trim() } : {}),
    ...(opts.resolvedBrandName !== undefined ? { brand: opts.resolvedBrandName } : {}),
    ...(opts.resolvedBrandId !== undefined ? { brandId: opts.resolvedBrandId } : {}),
    slug: opts.slug,
    ...(updateData.description !== undefined
      ? { description: updateData.description?.trim() || '' }
      : {}),
    ...(updateData.price ? { price: updateData.price } : {}),
    ...(updateData.discountedPrice !== undefined
      ? { discountedPrice: updateData.discountedPrice }
      : {}),
    categoryId: opts.resolvedCategoryId,
    subcategoryId: opts.resolvedSubcategoryId,
    ...(updateData.sizes !== undefined ? { sizes: toJsonInput(updateData.sizes) } : {}),
    ...(updateData.colorVariants !== undefined
      ? { colorVariants: toJsonInput(updateData.colorVariants) }
      : {}),
    ...(updateData.skus !== undefined ? { skus: toJsonInput(updateData.skus) } : {}),
    ...(updateData.variantOptions !== undefined
      ? { variantOptions: toJsonInput(updateData.variantOptions) }
      : {}),
    ...(updateData.mainImages !== undefined ? { mainImages: updateData.mainImages } : {}),
    ...(updateData.dynamicData !== undefined
      ? { dynamicData: toJsonInput(updateData.dynamicData) }
      : {}),
    ...(updateData.tags !== undefined ? { tags: updateData.tags } : {}),
    ...(updateData.featured !== undefined ? { featured: updateData.featured } : {}),
    ...(updateData.status ? { status: updateData.status } : {}),
    updatedBy: opts.userId,
    ...(opts.auditChanges.length > 0
      ? {
          reviewHistory: toJsonInput(
            appendAuditEntry(product.reviewHistory, {
              action: 'edited',
              editorId: opts.userId,
              editorRole: opts.role,
              isCrossStoreEdit: opts.crossStoreEdit,
              changes: opts.auditChanges,
              editedAt: new Date(),
            }),
          ),
        }
      : {}),
  };
}
