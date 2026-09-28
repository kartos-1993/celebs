import { isPlaceholderVariant } from '@celebs/shared-utils';

export interface IQCCheckItem {
  passed: boolean;
  score: number;
  maxScore: number;
  details: string;
}

export interface IQCCheckResult {
  score: number;
  grade: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'CRITICAL';
  checks: {
    imagesCheck: IQCCheckItem;
    titleCheck: IQCCheckItem;
    descriptionCheck: IQCCheckItem;
    sizingCheck: IQCCheckItem;
    attributesCheck: IQCCheckItem;
    pricingCheck: IQCCheckItem;
    variantsCheck: IQCCheckItem;
  };
}

/**
 * Everything the publish floor needs beyond `colorVariants`. A product with no
 * colour axis carries its gallery in `mainImages` and its stock in `skus[]`, so
 * the floor can only judge it when the caller threads both through.
 */
export interface PublishFloorInput {
  colorVariants?: unknown;
  dynamicData?: unknown;
  mainImages?: unknown;
  skus?: unknown;
}

/** No colour axis ⟹ no per-colour gallery ⟹ the product gallery must carry a photo. */
export const COVER_PHOTO_BLOCKER = 'Add a cover photo to publish.';

export const NO_STOCK_BLOCKER = 'Add at least 1 unit in one size to publish.';

type Row = Record<string, unknown>;

function toRows(value: unknown): Row[] {
  return Array.isArray(value) ? (value as Row[]) : [];
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function hasImages(images: unknown): boolean {
  return Array.isArray(images) && images.length > 0;
}

function positiveNumber(value: unknown): number {
  const qty = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(qty) && qty > 0 ? qty : 0;
}

/**
 * The colours a product genuinely offers. The size-only carrier
 * (`PRODUCT_CARRIER_VARIANT`) is plumbing, so it never counts as a colour axis —
 * which is the whole point: a colourless product must not be told to add one.
 */
function realColorVariants(colorVariants: unknown): Row[] {
  return toRows(colorVariants).filter((variant) => {
    const name = variant?.name;
    return typeof name === 'string' && !isPlaceholderVariant(name);
  });
}

/** Colours declared by the dynamic form, which the legacy column may not mirror. */
function colorMetaColors(dynamicData: unknown): Array<{ name: string; images: unknown }> {
  const colorMeta = asRecord(asRecord(asRecord(dynamicData)?.variants)?.colorMeta);
  if (!colorMeta) return [];
  const colors: Array<{ name: string; images: unknown }> = [];
  for (const [key, meta] of Object.entries(colorMeta)) {
    const metaRecord = asRecord(meta);
    if (!metaRecord) continue;
    const name = metaRecord.name;
    colors.push({
      name: typeof name === 'string' && name.trim() ? name.trim() : key,
      images: metaRecord.images,
    });
  }
  return colors;
}

/**
 * Stock total across both carriers. A colour-held variant matrix wins; a
 * colourless product holds its stock on `skus[].stock` (and in
 * `ProductInventory`), which is why the variant matrix alone must never be read
 * as "this product has no stock".
 */
export function sumVariantStock(colorVariants: unknown, skus?: unknown): number {
  const colorStock = sumColorHeldStock(colorVariants);
  if (colorStock > 0) return colorStock;
  let skuStock = 0;
  for (const sku of toRows(skus)) {
    skuStock += positiveNumber(sku?.stock);
  }
  return skuStock;
}

function sumColorHeldStock(colorVariants: unknown): number {
  let total = 0;
  for (const variant of toRows(colorVariants)) {
    for (const stock of toRows(variant?.stocks)) {
      total += positiveNumber(stock?.quantity);
    }
  }
  return total;
}

/**
 * One entry per real colour, keyed case-insensitively, with a colour declared in
 * both stores counted once. A colour keeps a photo it holds in EITHER store.
 */
function collectColorPhotos(
  colorVariants: unknown,
  dynamicData: unknown,
): Map<string, { name: string; hasPhoto: boolean }> {
  const photos = new Map<string, { name: string; hasPhoto: boolean }>();
  const record = (name: string, images: unknown): void => {
    const key = name.trim().toLowerCase();
    const entry = photos.get(key);
    if (entry) {
      entry.hasPhoto = entry.hasPhoto || hasImages(images);
      return;
    }
    photos.set(key, { name: name.trim(), hasPhoto: hasImages(images) });
  };

  for (const variant of realColorVariants(colorVariants)) {
    record(String(variant.name), variant.images);
  }
  for (const meta of colorMetaColors(dynamicData)) {
    record(meta.name, meta.images);
  }
  return photos;
}

/**
 * Gallery blockers, decided by the product's colour AXIS rather than by how many
 * variants it happens to store.
 *
 * - Colour axis present (a real colour in `colorVariants` or in
 *   `dynamicData.variants.colorMeta`): every real colour needs a photo, exactly
 *   as before. The cover rule does not apply.
 * - No colour axis: an empty or carrier-only variant list is a valid
 *   colourless product, so there is no per-colour requirement and the cover
 *   requirement moves to `mainImages`. The cover is only asserted when the
 *   caller actually supplies the array — a caller that cannot see the gallery
 *   cannot be blocked on it.
 */
export function getColorImageBlockers(
  colorVariants: unknown,
  context?: PublishFloorInput,
): string[] {
  const photos = collectColorPhotos(colorVariants, context?.dynamicData);

  if (photos.size === 0) {
    const mainImages = context?.mainImages;
    if (!Array.isArray(mainImages)) return [];
    return mainImages.length > 0 ? [] : [COVER_PHOTO_BLOCKER];
  }

  return [...photos.values()]
    .filter((color) => !color.hasPhoto)
    .map((color) => `Add at least one product photo for color ${color.name}.`);
}

export function calculateProductQCScore(
  productInput?: Record<string, unknown> | null,
): IQCCheckResult {
  if (!productInput) {
    const emptyCheck: IQCCheckItem = {
      passed: false,
      score: 0,
      maxScore: 0,
      details: 'Product data missing',
    };
    return {
      score: 0,
      grade: 'CRITICAL',
      checks: {
        imagesCheck: { ...emptyCheck, maxScore: 25 },
        titleCheck: { ...emptyCheck, maxScore: 15 },
        descriptionCheck: { ...emptyCheck, maxScore: 15 },
        sizingCheck: { ...emptyCheck, maxScore: 15 },
        attributesCheck: { ...emptyCheck, maxScore: 15 },
        pricingCheck: { ...emptyCheck, maxScore: 10 },
        variantsCheck: { ...emptyCheck, maxScore: 5 },
      },
    };
  }

  const product = productInput as Record<string, unknown>;

  // 1. Main Images Check (25 pts max)
  const imageCount = ((product.mainImages || product.images) as unknown[])?.length || 0;
  const hasVariantImages = Boolean(
    (product.colorVariants as Record<string, unknown>[])?.some(
      (variant: Record<string, unknown>) =>
        variant.images && (variant.images as unknown[]).length > 0,
    ),
  );

  let imageScore = 0;
  if (imageCount >= 3) {
    imageScore = 20;
  } else if (imageCount >= 1) {
    imageScore = 10;
  }
  if (hasVariantImages) {
    imageScore += 5;
  }
  const imagesCheck: IQCCheckItem = {
    passed: imageCount >= 3,
    score: imageScore,
    maxScore: 25,
    details: `${imageCount} main image(s) provided${hasVariantImages ? ' + variant photos included' : ''}. Minimum 3 recommended.`,
  };

  // 2. Title Check (15 pts max)
  const name = String(product.name || product.title || '').trim();
  const nameLen = name.length;
  let titleScore = 0;
  if (nameLen >= 15 && nameLen <= 100) {
    titleScore = 15;
  } else if (nameLen > 0) {
    titleScore = 8;
  }
  const titleCheck: IQCCheckItem = {
    passed: titleScore === 15,
    score: titleScore,
    maxScore: 15,
    details:
      nameLen >= 15
        ? `Title length (${nameLen} chars) is optimal.`
        : `Title is too short (${nameLen} chars). Minimum 15 recommended for SEO.`,
  };

  // 3. Description Check (15 pts max)
  const description = String(product.description || '').trim();
  const descLen = description.length;
  let descScore = 0;
  if (descLen >= 100) {
    descScore = 15;
  } else if (descLen >= 30) {
    descScore = 8;
  }
  const descriptionCheck: IQCCheckItem = {
    passed: descScore === 15,
    score: descScore,
    maxScore: 15,
    details:
      descLen >= 100
        ? `Description contains ${descLen} chars.`
        : `Description is brief (${descLen} chars). At least 100 chars recommended.`,
  };

  // 4. Sizing & Size Chart Check (15 pts max)
  const sizes = (product.sizes as Record<string, unknown>[]) || [];
  const hasSizeData =
    sizes.length > 0 &&
    sizes.some(
      (s: Record<string, unknown>) =>
        ((s.productMeasurements as unknown[]) && (s.productMeasurements as unknown[]).length > 0) ||
        ((s.bodyMeasurements as unknown[]) && (s.bodyMeasurements as unknown[]).length > 0),
    );
  const sizingScore = hasSizeData ? 15 : sizes.length > 0 ? 8 : 0;
  const sizingCheck: IQCCheckItem = {
    passed: hasSizeData,
    score: sizingScore,
    maxScore: 15,
    details: hasSizeData
      ? `Size chart configured with measurements for ${sizes.length} size(s).`
      : sizes.length > 0
        ? `Sizes defined (${sizes.length}), but detailed measurement values are missing.`
        : 'No size chart or size options specified.',
  };

  // 5. Attributes / Specs Check (15 pts max)
  const dynamicVals = (product.dynamicData as { values?: Record<string, unknown> })?.values || {};
  const attrCount = Object.keys(dynamicVals).length;
  let attrScore = 0;
  if (attrCount >= 4) {
    attrScore = 15;
  } else if (attrCount >= 1) {
    attrScore = 8;
  }
  const attributesCheck: IQCCheckItem = {
    passed: attrCount >= 4,
    score: attrScore,
    maxScore: 15,
    details: `${attrCount} custom attribute(s) populated. Minimum 4 recommended for filtering.`,
  };

  // 6. Pricing Check (10 pts max)
  const price = Number(product.price) || 0;
  const discountedPrice = product.discountedPrice ? Number(product.discountedPrice) : undefined;
  let pricingScore = 0;
  if (price > 0) {
    pricingScore = 10;
  }
  const pricingCheck: IQCCheckItem = {
    passed: price > 0,
    score: pricingScore,
    maxScore: 10,
    details:
      price > 0
        ? `Price set to Rs. ${price}${discountedPrice ? ` (Discounted: Rs. ${discountedPrice})` : ''}`
        : 'Price missing or invalid',
  };

  // 7. Variants & Stock Check (5 pts max)
  const variants = (product.colorVariants as Record<string, unknown>[]) || [];
  const skus = (product.skus as Record<string, unknown>[]) || [];
  const storedVariantStock = variants.reduce((acc: number, v: Record<string, unknown>) => {
    const vStock =
      (v.stocks as Record<string, unknown>[])?.reduce(
        (sAcc: number, s: Record<string, unknown>) => sAcc + ((s.quantity as number) || 0),
        0,
      ) || 0;
    return acc + vStock;
  }, 0);
  const matrixStock = skus.reduce(
    (acc: number, s: Record<string, unknown>) => acc + ((s.stock as number) || 0),
    0,
  );
  const totalStock = storedVariantStock + matrixStock;

  const variantScore = totalStock > 0 ? 5 : 0;
  const variantsCheck: IQCCheckItem = {
    passed: totalStock > 0,
    score: variantScore,
    maxScore: 5,
    details:
      totalStock > 0
        ? `Total inventory stock available across variants: ${totalStock} unit(s).`
        : 'Zero stock available for this product.',
  };

  const totalScore =
    imagesCheck.score +
    titleCheck.score +
    descriptionCheck.score +
    sizingCheck.score +
    attributesCheck.score +
    pricingCheck.score +
    variantsCheck.score;

  let grade: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'CRITICAL' = 'CRITICAL';
  if (totalScore >= 85) {
    grade = 'EXCELLENT';
  } else if (totalScore >= 70) {
    grade = 'GOOD';
  } else if (totalScore >= 50) {
    grade = 'NEEDS_IMPROVEMENT';
  }

  return {
    score: totalScore,
    grade,
    checks: {
      imagesCheck,
      titleCheck,
      descriptionCheck,
      sizingCheck,
      attributesCheck,
      pricingCheck,
      variantsCheck,
    },
  };
}
