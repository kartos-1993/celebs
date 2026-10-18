import fs from 'fs';
import path from 'path';

import { shippingPackagingTypeSchema, warrantyTypeSchema } from '@celebs/shared-types';

import type {
  SeedProductItem,
  SeedProductPackaging,
  SeedProductWarranty,
} from '../../db/seed/seed-products';

/**
 * Merges a scraper batch file (`celebs_seed_batch_*.json`) into the canonical
 * `data/products.json` dataset. Batch files carry near-final payloads from a
 * different environment, so this converter only normalises what does not match
 * this repo's contracts — it never talks to the database. Seeding stays the
 * single job of `seed-products.ts`.
 *
 * Usage:
 *   pnpm --filter api merge:seed-batch -- --file <batch.json>
 *   pnpm --filter api merge:seed-batch -- --file <batch.json> --update
 *
 * Without `--update`, products already present in the dataset are skipped;
 * with it, the existing entry is replaced by the converted batch version.
 * Seed afterwards with `pnpm --filter api seed:products`.
 */

export interface BatchMeasurement {
  name: string;
  value: string | number;
}

export interface BatchSize {
  name: string;
  productMeasurements?: BatchMeasurement[];
}

export interface BatchVariant {
  color: string;
  images?: string[];
}

export interface BatchColorVariant {
  name?: string;
  colorCode?: string;
  images?: string[];
  stocks?: Array<{ size: string; quantity: number }>;
}

export interface BatchItem {
  name: string;
  description?: string;
  price: number;
  discountedPrice?: number;
  brand?: string;
  vendor?: string;
  vendorName?: string;
  subcategorySlug?: string;
  categorySlug?: string;
  tags?: string[];
  sizes?: BatchSize[];
  variants?: BatchVariant[];
  colorVariants?: BatchColorVariant[];
  skus?: Array<{ quantity?: number }>;
  mainImages?: string[];
  dynamicData?: { values?: Record<string, unknown> };
  packageWeightKg?: number;
  packageLengthCm?: number;
  packageWidthCm?: number;
  packageHeightCm?: number;
  packagingType?: string;
  isFragile?: boolean;
  hasBatteryOrLiquid?: boolean;
  isNonReturnable?: boolean;
  warrantyType?: string;
  warrantyPeriod?: string;
  warrantyPolicy?: string;
}

const BRAND_SLUGS_BY_NAME: Record<string, string> = {
  'generic / unbranded': 'generic-unbranded',
  'generic/unbranded': 'generic-unbranded',
};
const DEFAULT_BRAND_SLUG = 'generic-unbranded';
const DEFAULT_VENDOR_SHOP_NAME = 'Brothers Collection';
const DEFAULT_STOCK_PER_SIZE = 20;
const DEFAULT_SKU_PREFIX = 'BRO-3P';
const SKU_PREFIXES_BY_CATEGORY: Record<string, string> = {
  'men-hoodies': 'BRO-HOO',
  'men-jackets-and-coats': 'BRO-JKT',
  'men-jeans': 'BRO-JNS',
  'men-denim-jackets': 'BRO-DNM',
};
const ATTRIBUTE_KEY_FIXES: Record<string, string> = {
  'Ideal for': 'Ideal For',
  'Number of Pieces': 'Number Of Pieces',
  // Men-apparel schema key renames (SHEIN spec-table label variants):
  Body: 'Body / Lining',
  Collar: 'Neckline',
  'Collar / Neckline': 'Neckline',
  'Neckline / Collar': 'Neckline',
  Season: 'Temperature',
  Seasons: 'Temperature',
};
const PACKAGING_TYPE_FIXES: Record<string, string> = {
  FLYER_LARGE: 'BOX_STANDARD',
};

function warn(message: string): void {
  console.warn(`⚠️  ${message}`);
}

function toNumeric(value: string | number): string | number {
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return value.trim() !== '' && Number.isFinite(parsed) ? parsed : value;
}

export function resolveBrandSlug(brand: string | undefined, itemName: string): string {
  if (!brand) return DEFAULT_BRAND_SLUG;

  const mapped = BRAND_SLUGS_BY_NAME[brand.trim().toLowerCase()];
  if (mapped) return mapped;

  warn(`Unknown brand '${brand}' on '${itemName}' — using ${DEFAULT_BRAND_SLUG}.`);
  return DEFAULT_BRAND_SLUG;
}

function toPackagingType(raw: BatchItem): SeedProductPackaging['type'] {
  if (!raw.packagingType) return undefined;

  const parsed = shippingPackagingTypeSchema.safeParse(raw.packagingType);
  if (parsed.success) return parsed.data;

  const fixed = PACKAGING_TYPE_FIXES[raw.packagingType];
  const fixedParsed = fixed ? shippingPackagingTypeSchema.safeParse(fixed) : undefined;
  if (fixed && fixedParsed?.success) {
    warn(`Packaging type '${raw.packagingType}' on '${raw.name}' mapped to '${fixed}'.`);
    return fixedParsed.data;
  }

  warn(`Unknown packaging type '${raw.packagingType}' on '${raw.name}' — using importer default.`);
  return undefined;
}

function toPackaging(raw: BatchItem): SeedProductPackaging | undefined {
  const packaging: SeedProductPackaging = {
    weightKg: raw.packageWeightKg,
    lengthCm: raw.packageLengthCm,
    widthCm: raw.packageWidthCm,
    heightCm: raw.packageHeightCm,
    type: toPackagingType(raw),
    isFragile: raw.isFragile,
    hasBatteryOrLiquid: raw.hasBatteryOrLiquid,
  };

  return Object.values(packaging).some((value) => value !== undefined) ? packaging : undefined;
}

function toWarrantyType(raw: BatchItem): SeedProductWarranty['type'] {
  if (!raw.warrantyType) return undefined;

  const parsed = warrantyTypeSchema.safeParse(raw.warrantyType);
  if (parsed.success) return parsed.data;

  warn(`Unknown warranty type '${raw.warrantyType}' on '${raw.name}' — using importer default.`);
  return undefined;
}

function toWarranty(raw: BatchItem): SeedProductWarranty | undefined {
  const warranty: SeedProductWarranty = {
    type: toWarrantyType(raw),
    period: raw.warrantyPeriod,
    policy: raw.warrantyPolicy,
    isNonReturnable: raw.isNonReturnable,
  };

  return Object.values(warranty).some((value) => value !== undefined) ? warranty : undefined;
}

export function toCanonicalItem(raw: BatchItem): SeedProductItem {
  const name = raw.name.trim();
  const categorySlug = raw.subcategorySlug?.trim() || raw.categorySlug?.trim();
  if (!categorySlug) {
    throw new Error(`Batch item '${name}' has no subcategorySlug/categorySlug.`);
  }

  const colorMetaByName = new Map(
    (raw.colorVariants ?? []).map((variant) => [variant.name?.trim().toLowerCase(), variant]),
  );
  const variantSource: BatchVariant[] =
    raw.variants && raw.variants.length > 0
      ? raw.variants
      : (raw.colorVariants ?? []).map((variant) => ({
          color: variant.name ?? 'Classic',
          images: variant.images,
        }));
  const variants = variantSource.map((variant) => {
    const meta = colorMetaByName.get(variant.color.trim().toLowerCase());
    return {
      color: variant.color,
      colorCode: meta?.colorCode,
      images: variant.images && variant.images.length > 0 ? variant.images : (meta?.images ?? []),
    };
  });

  const attributes = Object.fromEntries(
    Object.entries(raw.dynamicData?.values ?? {}).map(([key, value]) => [
      ATTRIBUTE_KEY_FIXES[key] ?? key,
      value,
    ]),
  );

  return {
    name,
    categorySlug,
    brandSlug: resolveBrandSlug(raw.brand, name),
    vendorShopName: raw.vendor?.trim() || raw.vendorName?.trim() || DEFAULT_VENDOR_SHOP_NAME,
    description: raw.description?.trim() || name,
    price: raw.price,
    discountedPrice: raw.discountedPrice ?? raw.price,
    featured: false,
    tags: raw.tags ?? [],
    skuPrefix: SKU_PREFIXES_BY_CATEGORY[categorySlug] ?? DEFAULT_SKU_PREFIX,
    stockPerSize:
      raw.skus?.[0]?.quantity ??
      raw.colorVariants?.[0]?.stocks?.[0]?.quantity ??
      DEFAULT_STOCK_PER_SIZE,
    attributes,
    sizeChart: (raw.sizes ?? []).map((size) => ({
      Size: size.name,
      ...Object.fromEntries(
        (size.productMeasurements ?? []).map((measurement) => [
          measurement.name,
          toNumeric(measurement.value),
        ]),
      ),
    })),
    variants,
    mainImages: raw.mainImages && raw.mainImages.length > 0 ? raw.mainImages : undefined,
    packaging: toPackaging(raw),
    warranty: toWarranty(raw),
  };
}

export interface MergeResult {
  dataset: SeedProductItem[];
  added: string[];
  updated: string[];
  skipped: string[];
}

export function mergeBatch(
  dataset: SeedProductItem[],
  batchItems: BatchItem[],
  update: boolean,
): MergeResult {
  const merged = [...dataset];
  const added: string[] = [];
  const updated: string[] = [];
  const skipped: string[] = [];

  for (const raw of batchItems) {
    const item = toCanonicalItem(raw);
    const existingIndex = merged.findIndex(
      (product) => product.name.toLowerCase() === item.name.toLowerCase(),
    );

    if (existingIndex === -1) {
      merged.push(item);
      added.push(item.name);
      continue;
    }

    if (update) {
      merged[existingIndex] = item;
      updated.push(item.name);
    } else {
      skipped.push(item.name);
    }
  }

  return { dataset: merged, added, updated, skipped };
}

const DATASET_PATH = path.join(__dirname, '../../db/seed/data/products.json');

function parseArgs(argv: string[]): { file?: string; update: boolean } {
  const fileIndex = argv.indexOf('--file');

  return {
    file: fileIndex >= 0 ? argv[fileIndex + 1] : undefined,
    update: argv.includes('--update'),
  };
}

function main(): void {
  const { file, update } = parseArgs(process.argv.slice(2));
  if (!file) {
    console.error(
      'Usage: pnpm --filter api merge:seed-batch -- --file <celebs_seed_batch_*.json> [--update]',
    );
    process.exit(1);
  }

  const batchPath = path.resolve(file);
  if (!fs.existsSync(batchPath)) {
    console.error(`Batch file not found: ${batchPath}`);
    process.exit(1);
  }

  const parsed = JSON.parse(fs.readFileSync(batchPath, 'utf-8')) as
    | BatchItem[]
    | { items?: BatchItem[] };
  const batchItems = Array.isArray(parsed) ? parsed : (parsed.items ?? []);
  const dataset = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf-8')) as SeedProductItem[];

  const result = mergeBatch(dataset, batchItems, update);
  fs.writeFileSync(DATASET_PATH, `${JSON.stringify(result.dataset, null, 2)}\n`, 'utf-8');

  for (const name of result.added) console.log(`➕ Added: ${name}`);
  for (const name of result.updated) console.log(`♻️  Updated: ${name}`);
  for (const name of result.skipped) console.log(`⏭️  Skipped (already in dataset): ${name}`);

  console.log(
    `\n✅ Batch merge: ${result.added.length} added, ${result.updated.length} updated, ` +
      `${result.skipped.length} skipped (dataset now ${result.dataset.length} items).`,
  );
  console.log('   Next: pnpm --filter api seed:products -- --dry-run');
}

if (require.main === module) {
  main();
}
