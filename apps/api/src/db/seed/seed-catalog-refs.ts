import { PLATFORM_VENDOR_NAME, PLATFORM_VENDOR_ID } from '../../common/constants/platform-vendor';
import prisma from '../../config/db.prisma';

/**
 * Reference-data resolution for the catalog seeds. Every look-up fails with an
 * actionable message instead of a bare `findFirstOrThrow`, because these seeds
 * assume the master reference data has already been seeded.
 */

export interface SeedPlatformStoreRef {
  id: string;
  userId: string;
  shopName: string;
}

/** The canonical 1P store that owns every seeded catalog product. */
export async function resolvePlatformStore(): Promise<SeedPlatformStoreRef> {
  const vendor = await prisma.vendorProfile.findFirst({
    where: { id: PLATFORM_VENDOR_ID },
    select: { id: true, userId: true, shopName: true },
  });

  if (!vendor) {
    throw new Error(
      `The 1P platform store '${PLATFORM_VENDOR_NAME}' does not exist yet. ` +
        'Complete the initial superadmin setup and run the master seed (npm run seed) first.',
    );
  }

  return vendor;
}

export async function resolveBrandBySlug(slug: string): Promise<{ id: string; name: string }> {
  const brand = await prisma.brand.findFirst({
    where: { slug },
    select: { id: true, name: true },
  });

  if (!brand) {
    throw new Error(`Brand '${slug}' is missing. Run 'npm run seed:brands' first.`);
  }

  return brand;
}

export async function resolveCategoryBySlug(
  slug: string,
): Promise<{ id: string; name: string; parentCategory: string | null }> {
  const category = await prisma.category.findFirst({
    where: { slug },
    select: { id: true, name: true, parentCategory: true },
  });

  if (!category) {
    throw new Error(`Category '${slug}' is missing. Run 'npm run seed:categories-men' first.`);
  }

  return category;
}

export interface SeedProductRef {
  id: string;
  name: string;
}

/**
 * Resolve a set of catalogue product names in one query.
 *
 * Product slugs are salted (`generateUniqueSlug` appends a time+random
 * suffix), so the only stable, authorable identifier is the dataset's unique
 * `name` - the same key `seedProducts` is idempotent on. Every missing (or
 * unpublished) name is reported in one actionable error: a campaign or combo
 * referencing an absent product is a silent storefront break, not a warning
 * to skip.
 */
export async function resolveProductsByNames(
  names: string[],
): Promise<Map<string, SeedProductRef>> {
  const products = await prisma.product.findMany({
    where: { name: { in: names }, status: 'published' },
    select: { id: true, name: true },
    orderBy: { createdAt: 'asc' },
  });

  const byName = new Map<string, SeedProductRef>();
  for (const product of products) {
    if (!byName.has(product.name)) byName.set(product.name, product);
  }

  const missing = names.filter((name) => !byName.has(name));
  if (missing.length > 0) {
    throw new Error(
      `Products referenced by the campaign/combo seeds are missing or unpublished: ${missing.join('; ')}. Run 'npm run seed' first.`,
    );
  }

  return byName;
}

/**
 * Pins the resolver's guarantee for callers: every authored name resolves, or
 * `resolveProductsByNames` has already thrown.
 */
export function requireResolvedProduct(
  products: ReadonlyMap<string, SeedProductRef>,
  name: string,
): SeedProductRef {
  const product = products.get(name);
  if (!product) {
    throw new Error(`Product '${name}' was not in the resolved seed set.`);
  }

  return product;
}
