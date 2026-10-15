import fs from 'fs';
import path from 'path';

import { CreateProductType, PRODUCT_STATUS } from '@celebs/shared-types';

/**
 * Canonical payload builders shared by the master seed (src/db/seed/index.ts)
 * and the clean-slate maintenance reseed (scripts/maintenance/clear-and-reseed).
 *
 * `ProductService.createProduct` is the single source of truth for product
 * writes: these builders only describe catalog content. Vendor / brand /
 * category refs are resolved by the callers and passed in, so the service can
 * keep enforcing the same guards as the Web Admin form path (publish floor,
 * brand protection, inventory sync, media usage, audit fields).
 */

export interface SeedDenimRefs {
  brandId: string;
  brandName: string;
  categoryId: string;
  subcategoryId: string;
}

export interface DenimSeedVariant {
  color?: string;
  images?: string[];
}

export interface DenimSeedSizeRow {
  size?: string | number;
  shoulder?: number;
  chest?: number;
  length?: number;
  sleeveLength?: number;
  waist?: number;
  hip?: number;
  inseam?: number;
  thigh?: number;
  bodyMeasurements?: unknown;
}

export interface DenimSeedItem {
  title: string;
  attributes?: Record<string, unknown>;
  variants?: DenimSeedVariant[];
  measurements?: { sizeChart?: DenimSeedSizeRow[] };
  bodyMeasurements?: unknown;
}

export function readSeedDataset<T>(fileName: string): T[] {
  const jsonPath = path.join(__dirname, 'data', fileName);
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Seed dataset not found: ${jsonPath}`);
  }
  return JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as T[];
}

// The SHEIN extracts use free-text colour names; the hex map below covers the
// names that actually appear in the denim datasets.
const COLOR_HEX_MAP: Record<string, string> = {
  black: '#1A1A1A',
  blue: '#1E90FF',
  'light blue': '#87CEEB',
  'dark blue': '#00008B',
  navy: '#000080',
  grey: '#808080',
  gray: '#808080',
  white: '#FFFFFF',
  beige: '#D4BE8D',
  bronze: '#CD7F32',
  multicolor: '#4A90E2',
  brown: '#8B4513',
  green: '#2E8B57',
  khaki: '#F0E68C',
  vintage: '#5A7D9A',
  stone: '#A8B5C2',
  ash: '#8A9199',
};

export function resolveSeedColorHex(colorName: string): string {
  const norm = colorName.trim().toLowerCase();
  for (const [key, hex] of Object.entries(COLOR_HEX_MAP)) {
    if (norm.includes(key)) return hex;
  }
  return '#2C3E50';
}

type BodyMeasurements = NonNullable<CreateProductType['sizes']>[number]['bodyMeasurements'];

function toBodyMeasurements(rows: unknown): NonNullable<BodyMeasurements> {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter(
      (row): row is { name: unknown; value?: unknown; unit?: unknown } =>
        Boolean(row) && typeof row === 'object' && 'name' in (row as object),
    )
    .map((row) => ({
      name: String(row.name),
      value: row.value == null ? '' : String(row.value),
      unit: row.unit == null ? 'cm' : String(row.unit),
    }));
}

const DEFAULT_JACKET_IMAGE =
  'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?q=80&w=800';

const FALLBACK_JACKET_SIZE_CHART: DenimSeedSizeRow[] = [
  { size: 'S', shoulder: 48, chest: 110, length: 66, sleeveLength: 63 },
  { size: 'M', shoulder: 50, chest: 115, length: 68, sleeveLength: 64 },
  { size: 'L', shoulder: 52, chest: 120, length: 70, sleeveLength: 65 },
  { size: 'XL', shoulder: 54, chest: 125, length: 72, sleeveLength: 66 },
];

/**
 * Measurement columns MUST match the seeded category contract
 * (`seed-categories-men.ts` → 'Men Denim Jackets'): Shoulder / Bust / Length /
 * Sleeve Length. The previous 'Chest' label drifted from the category schema
 * the vendor form and size chart render from.
 */
export function buildDenimJacketPayload(
  item: DenimSeedItem,
  index: number,
  refs: SeedDenimRefs,
): CreateProductType {
  const sizeChart =
    Array.isArray(item.measurements?.sizeChart) && item.measurements.sizeChart.length > 0
      ? item.measurements.sizeChart
      : FALLBACK_JACKET_SIZE_CHART;

  const sizes = sizeChart.map((sc) => ({
    name: String(sc.size),
    productMeasurements: [
      { name: 'Shoulder', value: String(sc.shoulder || 50), unit: 'cm' },
      { name: 'Bust', value: String(sc.chest || 115), unit: 'cm' },
      { name: 'Length', value: String(sc.length || 68), unit: 'cm' },
      { name: 'Sleeve Length', value: String(sc.sleeveLength || 64), unit: 'cm' },
    ],
    bodyMeasurements: toBodyMeasurements(sc.bodyMeasurements ?? item.bodyMeasurements),
  }));

  const variantImages = (item.variants ?? []).flatMap((v) => v.images ?? []);
  const coverImages = variantImages.length > 0 ? variantImages.slice(0, 8) : [DEFAULT_JACKET_IMAGE];

  const colorVariants = (item.variants ?? []).map((v) => {
    const colorName = v.color || 'Classic Blue';
    const images = Array.isArray(v.images) && v.images.length > 0 ? v.images : coverImages;
    return {
      name: colorName,
      colorCode: resolveSeedColorHex(colorName),
      swatch: images[0],
      images,
      stocks: sizeChart.map((sc) => ({ size: String(sc.size), quantity: 25 })),
    };
  });

  const price = 2800 + index * 200;
  const discountedPrice = Math.round(price * 0.85);

  const skus = colorVariants.flatMap((cv, vIdx) =>
    cv.stocks.map((st, sIdx) => ({
      skuCode: `CEL-JKT-${index + 1}-V${vIdx + 1}-${cv.name
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 4)
        .toUpperCase()}-${st.size}`,
      selectedOptions: { Color: cv.name, Size: st.size },
      price,
      discountedPrice,
      stock: st.quantity,
      image: cv.images[0] || coverImages[0],
      isDefault: vIdx === 0 && sIdx === 0,
    })),
  );

  const colorMeta: Record<string, { swatch: string | undefined; images: string[]; hot: boolean }> =
    {};
  for (const c of colorVariants) {
    colorMeta[c.name] = { swatch: c.swatch, images: c.images, hot: false };
  }

  return {
    name: item.title,
    brand: refs.brandName,
    brandId: refs.brandId,
    description: `Engineered heavy-retention denim jacket. ${String(
      item.attributes?.material ?? '100% Cotton Denim',
    )}. ${String(item.attributes?.style ?? 'Streetwear')}.`,
    price,
    discountedPrice,
    categoryId: refs.categoryId,
    subcategoryId: refs.subcategoryId,
    sizes,
    colorVariants,
    skus,
    variantOptions: [
      { name: 'Color', values: colorVariants.map((c) => c.name) },
      { name: 'Size', values: sizeChart.map((s) => String(s.size)) },
    ],
    mainImages: coverImages,
    dynamicData: {
      values: item.attributes ?? {},
      variants: { colorMeta },
      uploadedAssets: { mainImages: coverImages, colorMeta },
    },
    tags: ['denim', 'jacket', 'outerwear', 'men', 'winter'],
    featured: index === 0,
    status: PRODUCT_STATUS.PUBLISHED,
    packageWeightKg: 0.5,
    packageLengthCm: 35,
    packageWidthCm: 28,
    packageHeightCm: 6,
    packagingType: 'FLYER_SMALL',
    isFragile: false,
    hasBatteryOrLiquid: false,
    warrantyType: 'BRAND_WARRANTY',
    warrantyPeriod: '6 Months',
    warrantyPolicy: '6 months coverage for stitching and button hardware defects.',
    isNonReturnable: false,
  };
}

const DEFAULT_JEANS_IMAGES = [
  'https://images.unsplash.com/photo-1542272604-780c96856592?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&auto=format&fit=crop',
];

const FALLBACK_JEANS_SIZE_CHART: DenimSeedSizeRow[] = [
  { size: 'XS', waist: 78, hip: 104, inseam: 75.4, thigh: 68.8 },
  { size: 'S', waist: 82, hip: 108, inseam: 76.2, thigh: 71.4 },
  { size: 'M', waist: 86, hip: 112, inseam: 77, thigh: 74 },
  { size: 'L', waist: 91, hip: 117, inseam: 77.8, thigh: 77.3 },
  { size: 'XL', waist: 96, hip: 122, inseam: 78.6, thigh: 80.6 },
];

/** Measurement columns must match 'Men Jeans': Waist Size / Hip Size / Length / Thigh. */
export function buildDenimJeansPayload(
  item: DenimSeedItem,
  index: number,
  refs: SeedDenimRefs,
): CreateProductType {
  const sizeChart =
    Array.isArray(item.measurements?.sizeChart) && item.measurements.sizeChart.length > 0
      ? item.measurements.sizeChart
      : FALLBACK_JEANS_SIZE_CHART;

  const sizes = sizeChart.map((sc) => ({
    name: String(sc.size),
    productMeasurements: [
      { name: 'Waist Size', value: String(sc.waist || 86), unit: 'cm' },
      { name: 'Hip Size', value: String(sc.hip || 112), unit: 'cm' },
      { name: 'Length', value: String(sc.inseam || 77), unit: 'cm' },
      { name: 'Thigh', value: String(sc.thigh || 74), unit: 'cm' },
    ],
    bodyMeasurements: toBodyMeasurements(sc.bodyMeasurements ?? item.bodyMeasurements),
  }));

  const rawVariants: DenimSeedVariant[] =
    Array.isArray(item.variants) && item.variants.length > 0
      ? item.variants
      : [
          {
            color: String(item.attributes?.color ?? 'Denim Blue'),
            images: DEFAULT_JEANS_IMAGES,
          },
        ];

  const variantImages = rawVariants.flatMap((v) => v.images ?? []);
  const coverImages = variantImages.length > 0 ? variantImages.slice(0, 8) : DEFAULT_JEANS_IMAGES;

  const colorVariants = rawVariants.map((v) => {
    const colorName = v.color || 'Denim Blue';
    const images = Array.isArray(v.images) && v.images.length > 0 ? v.images : coverImages;
    return {
      name: colorName,
      colorCode: resolveSeedColorHex(colorName),
      swatch: images[0],
      images,
      stocks: sizeChart.map((sc) => ({ size: String(sc.size), quantity: 30 })),
    };
  });

  const price = 2400 + ((index * 110) % 1500);
  const discountedPrice = Math.round(price * 0.88);

  const skus = colorVariants.flatMap((cv, vIdx) =>
    cv.stocks.map((st, sIdx) => ({
      skuCode: `CEL-JNS-${index + 1}-V${vIdx + 1}-${cv.name
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 4)
        .toUpperCase()}-${st.size}`,
      selectedOptions: { Color: cv.name, Size: st.size },
      price,
      discountedPrice,
      stock: st.quantity,
      image: cv.images[0] || coverImages[0],
      isDefault: vIdx === 0 && sIdx === 0,
    })),
  );

  const colorMeta: Record<string, { swatch: string | undefined; images: string[]; hot: boolean }> =
    {};
  for (const c of colorVariants) {
    colorMeta[c.name] = { swatch: c.swatch, images: c.images, hot: false };
  }

  return {
    name: item.title,
    brand: refs.brandName,
    brandId: refs.brandId,
    description: `Tailored premium denim jeans. ${String(
      item.attributes?.material ?? 'Cotton Viscose Denim',
    )}. ${String(item.attributes?.fitType ?? 'Relaxed')} fit with reinforced bar-tacks.`,
    price,
    discountedPrice,
    categoryId: refs.categoryId,
    subcategoryId: refs.subcategoryId,
    sizes,
    colorVariants,
    skus,
    variantOptions: [
      { name: 'Color', values: colorVariants.map((c) => c.name) },
      { name: 'Size', values: sizeChart.map((s) => String(s.size)) },
    ],
    mainImages: coverImages,
    dynamicData: {
      values: item.attributes ?? {},
      variants: { colorMeta },
      uploadedAssets: { mainImages: coverImages, colorMeta },
    },
    tags: ['denim', 'jeans', 'bottoms', 'men', 'streetwear'],
    featured: index < 5,
    status: PRODUCT_STATUS.PUBLISHED,
    packageWeightKg: 0.5,
    packageLengthCm: 32,
    packageWidthCm: 25,
    packageHeightCm: 4,
    packagingType: 'FLYER_SMALL',
    isFragile: false,
    hasBatteryOrLiquid: false,
    warrantyType: 'BRAND_WARRANTY',
    warrantyPeriod: '6 Months',
    warrantyPolicy: '6 months warranty against seam and zipper failure.',
    isNonReturnable: false,
  };
}
