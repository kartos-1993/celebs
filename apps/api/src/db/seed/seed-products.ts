import fs from 'fs';
import path from 'path';

import {
  CreateProductType,
  PRODUCT_STATUS,
  createProductSchema,
  type ShippingPackagingType,
  type WarrantyType,
} from '@celebs/shared-types';

import prisma from '../../config/db.prisma';
import { ProductService } from '../../modules/product/product.service';
import {
  resolveBrandBySlug,
  resolveCategoryBySlug,
  resolvePlatformStore,
  type SeedPlatformStoreRef,
} from './seed-catalog-refs';

/**
 * The single product importer: reads `data/products.json`, resolves every
 * reference from the seeded foundation (brands / categories / vendors) and
 * writes through `ProductService.createProduct` — the same service the Web
 * Admin form path uses, so vendor/brand/audit fields, the publish floor,
 * inventory sync and brand guards all behave identically.
 *
 * Contract for `data/products.json`:
 * - one item per product; unique `name` (re-runs are idempotent by name)
 * - `sizeChart` rows are keyed by the target category's own size-chart
 *   columns (e.g. "Shoulder" / "Bust" / "Length" / "Sleeve Length"), plus a
 *   mandatory `Size` — the importer never hardcodes per-category columns
 * - `attributes` keys are Title Case and stored verbatim in `dynamicData.values`
 * - optional `mainImages` overrides the cover gallery; otherwise the variant
 *   galleries are flattened without truncation
 * - optional `packaging` / `warranty` override the shipping defaults
 * - `vendorShopName` other than the platform store requires `npm run seed:vendors`
 *
 * `--dry-run` validates the whole dataset (refs, schema, skip counts) without
 * writing anything.
 */

export interface SeedProductVariant {
  color: string;
  colorCode?: string;
  images?: string[];
}

export interface SeedProductPackaging {
  weightKg?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  type?: ShippingPackagingType;
  isFragile?: boolean;
  hasBatteryOrLiquid?: boolean;
}

export interface SeedProductWarranty {
  type?: WarrantyType;
  period?: string;
  policy?: string;
  isNonReturnable?: boolean;
}

export interface SeedProductItem {
  name: string;
  categorySlug: string;
  brandSlug: string;
  vendorShopName: string;
  description: string;
  price: number;
  discountedPrice: number;
  featured?: boolean;
  tags: string[];
  skuPrefix: string;
  stockPerSize: number;
  attributes: Record<string, unknown>;
  sizeChart: Array<Record<string, string | number>>;
  variants: SeedProductVariant[];
  /** Explicit cover gallery; falls back to the flattened variant images. */
  mainImages?: string[];
  /** Shipping overrides; falls back to the importer's carrier defaults. */
  packaging?: SeedProductPackaging;
  /** Warranty overrides; falls back to the importer's brand-warranty defaults. */
  warranty?: SeedProductWarranty;
}

export interface SeedProductRefs {
  brandId: string;
  brandName: string;
  categoryId: string;
  subcategoryId: string;
}

const DATASET_FILE = 'products.json';
const FALLBACK_COLOR_CODE = '#2C3E50';
const FALLBACK_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1542272604-780c96856592?w=800&auto=format&fit=crop';

export function readProductDataset(): SeedProductItem[] {
  const jsonPath = path.join(__dirname, 'data', DATASET_FILE);
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Product dataset not found: ${jsonPath}`);
  }
  return JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as SeedProductItem[];
}

function toSkuSegment(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 4)
    .toUpperCase();
}

export function buildSeedProductPayload(
  item: SeedProductItem,
  index: number,
  refs: SeedProductRefs,
): CreateProductType {
  const sizes = item.sizeChart.map((row) => {
    const { Size, ...measurements } = row;
    return {
      name: String(Size),
      productMeasurements: Object.entries(measurements).map(([name, value]) => ({
        name,
        value: String(value),
        unit: 'cm',
      })),
      bodyMeasurements: [],
    };
  });
  const sizeNames = sizes.map((size) => size.name);

  const variants = item.variants.length > 0 ? item.variants : [{ color: 'Classic', images: [] }];
  const variantImages = variants.flatMap((variant) => variant.images ?? []);
  const coverImages =
    item.mainImages && item.mainImages.length > 0
      ? item.mainImages
      : variantImages.length > 0
        ? variantImages
        : [FALLBACK_PRODUCT_IMAGE];

  const colorVariants = variants.map((variant) => {
    const images =
      variant.images && variant.images.length > 0 ? variant.images : [FALLBACK_PRODUCT_IMAGE];
    return {
      name: variant.color,
      colorCode: variant.colorCode || FALLBACK_COLOR_CODE,
      swatch: images[0],
      images,
      stocks: sizeNames.map((size) => ({ size, quantity: item.stockPerSize })),
    };
  });

  const skus = colorVariants.flatMap((variant, variantIndex) =>
    variant.stocks.map((stock, sizeIndex) => ({
      skuCode: `${item.skuPrefix}-${index + 1}-V${variantIndex + 1}-${toSkuSegment(
        variant.name,
      )}-${stock.size}`,
      selectedOptions: { Color: variant.name, Size: stock.size },
      price: item.price,
      discountedPrice: item.discountedPrice,
      stock: stock.quantity,
      image: variant.images[0] || coverImages[0],
      isDefault: variantIndex === 0 && sizeIndex === 0,
    })),
  );

  const colorMeta: Record<string, { swatch: string | undefined; images: string[]; hot: boolean }> =
    {};
  for (const variant of colorVariants) {
    colorMeta[variant.name] = { swatch: variant.swatch, images: variant.images, hot: false };
  }

  return {
    name: item.name,
    brand: refs.brandName,
    brandId: refs.brandId,
    description: item.description,
    price: item.price,
    discountedPrice: item.discountedPrice,
    categoryId: refs.categoryId,
    subcategoryId: refs.subcategoryId,
    sizes,
    colorVariants,
    skus,
    variantOptions: [
      { name: 'Color', values: colorVariants.map((variant) => variant.name) },
      { name: 'Size', values: sizeNames },
    ],
    mainImages: coverImages,
    dynamicData: {
      values: item.attributes,
      variants: { colorMeta },
      uploadedAssets: { mainImages: coverImages, colorMeta },
    },
    tags: item.tags,
    featured: Boolean(item.featured),
    status: PRODUCT_STATUS.PUBLISHED,
    packageWeightKg: item.packaging?.weightKg ?? 0.5,
    packageLengthCm: item.packaging?.lengthCm ?? 32,
    packageWidthCm: item.packaging?.widthCm ?? 25,
    packageHeightCm: item.packaging?.heightCm ?? 4,
    packagingType: item.packaging?.type ?? 'FLYER_SMALL',
    isFragile: item.packaging?.isFragile ?? false,
    hasBatteryOrLiquid: item.packaging?.hasBatteryOrLiquid ?? false,
    warrantyType: item.warranty?.type ?? 'BRAND_WARRANTY',
    warrantyPeriod: item.warranty?.period ?? '6 Months',
    warrantyPolicy: item.warranty?.policy ?? '6 months coverage against manufacturing defects.',
    isNonReturnable: item.warranty?.isNonReturnable ?? false,
  };
}

async function resolveCached<T>(
  key: string,
  cache: Map<string, T>,
  resolver: (key: string) => Promise<T>,
): Promise<T> {
  const cached = cache.get(key);
  if (cached) return cached;

  const resolved = await resolver(key);
  cache.set(key, resolved);
  return resolved;
}

async function resolveVendor(
  shopName: string,
  cache: Map<string, SeedPlatformStoreRef>,
): Promise<SeedPlatformStoreRef> {
  const cached = cache.get(shopName);
  if (cached) return cached;

  const vendor = await prisma.vendorProfile.findFirst({
    where: { shopName },
    select: { id: true, userId: true, shopName: true },
  });

  if (!vendor) {
    throw new Error(`Vendor '${shopName}' is missing. Run 'npm run seed:vendors' first.`);
  }

  cache.set(shopName, vendor);
  return vendor;
}

export interface SeedProductsOptions {
  dryRun?: boolean;
}

export async function seedProducts(options: SeedProductsOptions = {}): Promise<void> {
  console.log(`\n🛍️  Seeding product dataset${options.dryRun ? ' (dry run)' : ''}...`);

  const items = readProductDataset();
  const productService = new ProductService();
  const platformStore = await resolvePlatformStore();

  const vendorCache = new Map<string, SeedPlatformStoreRef>([
    [platformStore.shopName, platformStore],
  ]);
  const brandCache = new Map<string, { id: string; name: string }>();
  const categoryCache = new Map<
    string,
    { id: string; name: string; parentCategory: string | null }
  >();

  let created = 0;
  let skipped = 0;

  for (const [index, item] of items.entries()) {
    const vendor = await resolveVendor(item.vendorShopName, vendorCache);
    const brand = await resolveCached(item.brandSlug, brandCache, resolveBrandBySlug);
    const category = await resolveCached(item.categorySlug, categoryCache, resolveCategoryBySlug);

    const payload = buildSeedProductPayload(item, index, {
      brandId: brand.id,
      brandName: brand.name,
      categoryId: category.parentCategory ?? category.id,
      subcategoryId: category.id,
    });
    const parsed = createProductSchema.parse(payload);

    const existing = await prisma.product.findFirst({
      where: { name: { equals: item.name, mode: 'insensitive' } },
      select: { id: true },
    });

    if (existing) {
      skipped++;
      continue;
    }

    if (!options.dryRun) {
      await productService.createProduct(
        parsed,
        vendor.userId,
        vendor.id,
        vendor.shopName,
        'SUPERADMIN',
      );
    }
    created++;
  }

  const action = options.dryRun ? 'validated' : 'created';
  console.log(
    `✅ Product dataset: ${created} ${action}, ${skipped} already present (of ${items.length}).`,
  );
}

if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  seedProducts({ dryRun })
    .then(async () => {
      await prisma.$disconnect();
      // Explicit exit: the ProductService import chain holds background handles
      // (queue/cache clients) that would otherwise keep the process alive.
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Failed to seed product dataset:', err);
      process.exit(1);
    });
}
