import { Prisma, type Product } from '@prisma/client';

import { CreateProductType, PRODUCT_STATUS, SHIPPING_DEFAULTS } from '@celebs/shared-types';

import { appendAuditEntry, buildProductAuditDiff } from './utils/product-audit';
import { toJsonInput } from './product-assets';

type CreateProductInput = CreateProductType;

// Copies only keys that are !== undefined (false/0/null ARE copied). the fix:
// name/price now use the same !== undefined presence check (Zod rejects ""
// and 0 upstream); only `status` keeps a truthy guard, which is safe because
// no valid status value is falsy.
function pickDefined<T extends object, K extends keyof T>(
  source: T,
  keys: K[],
): Partial<Pick<T, K>> {
  const result: Partial<Pick<T, K>> = {};
  for (const key of keys) {
    if (source[key] !== undefined) {
      result[key] = source[key];
    }
  }
  return result;
}

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
    packageWeightKg: input.packageWeightKg ?? SHIPPING_DEFAULTS.packageWeightKg,
    packageLengthCm: input.packageLengthCm,
    packageWidthCm: input.packageWidthCm,
    packageHeightCm: input.packageHeightCm,
    packagingType: input.packagingType ?? SHIPPING_DEFAULTS.packagingType,
    isFragile: input.isFragile ?? SHIPPING_DEFAULTS.isFragile,
    hasBatteryOrLiquid: input.hasBatteryOrLiquid ?? SHIPPING_DEFAULTS.hasBatteryOrLiquid,
    warrantyType: input.warrantyType ?? SHIPPING_DEFAULTS.warrantyType,
    warrantyPeriod: input.warrantyPeriod,
    warrantyPolicy: input.warrantyPolicy,
    isNonReturnable: input.isNonReturnable ?? SHIPPING_DEFAULTS.isNonReturnable,
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
): Prisma.ProductUncheckedUpdateInput {
  return {
    // the fix evidence: baseProductSchemaFields already rejects these at the
    // Zod boundary (name: trim().min(2); price: positive()), and the
    // controller parses updateProductSchema before this builder runs — so the
    // old truthy guards (`updateData.name ?`, `updateData.price ?`) were dead
    // code that could only silently drop values Zod had already rejected.
    // Presence is now checked with `!== undefined` (matching pickDefined
    // below); ""/0 reaching here can only come from unvalidated callers.
    ...(updateData.name !== undefined ? { name: updateData.name.trim() } : {}),
    ...(opts.resolvedBrandName !== undefined ? { brand: opts.resolvedBrandName } : {}),
    ...(opts.resolvedBrandId !== undefined ? { brandId: opts.resolvedBrandId } : {}),
    slug: opts.slug,
    ...(updateData.description !== undefined
      ? { description: updateData.description?.trim() || '' }
      : {}),
    ...(updateData.price !== undefined ? { price: updateData.price } : {}),
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
    ...pickDefined(updateData, [
      'packageWeightKg',
      'packageLengthCm',
      'packageWidthCm',
      'packageHeightCm',
      'packagingType',
      'isFragile',
      'hasBatteryOrLiquid',
      'warrantyType',
      'warrantyPeriod',
      'warrantyPolicy',
      'isNonReturnable',
    ]),
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
