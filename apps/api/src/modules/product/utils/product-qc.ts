import { IProduct } from '../../../db/models/product.model';

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
 * Calculates a standard Quality Control score (0-100) and diagnostic checklist for a product listing.
 */
export function calculateProductQCScore(product: Partial<IProduct>): IQCCheckResult {
  // 1. Main Images Check (25 pts max)
  const imageCount = product.mainImages?.length || 0;
  const hasVariantImages = Boolean(
    product.colorVariants?.some((variant) => variant.images && variant.images.length > 0)
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
  const titleLen = product.name?.trim().length || 0;
  let titleScore = 0;
  if (titleLen >= 15 && titleLen <= 150) {
    titleScore = 15;
  } else if (titleLen > 0) {
    titleScore = 7;
  }
  const titleCheck: IQCCheckItem = {
    passed: titleLen >= 15,
    score: titleScore,
    maxScore: 15,
    details: titleLen >= 15 ? `Descriptive title (${titleLen} chars)` : `Title is brief (${titleLen} chars)`,
  };

  // 3. Description Check (15 pts max)
  const descLen = product.description?.trim().length || 0;
  let descScore = 0;
  if (descLen >= 80) {
    descScore = 15;
  } else if (descLen >= 20) {
    descScore = 8;
  } else if (descLen > 0) {
    descScore = 4;
  }
  const descriptionCheck: IQCCheckItem = {
    passed: descLen >= 80,
    score: descScore,
    maxScore: 15,
    details: descLen >= 80 ? `Comprehensive description (${descLen} chars)` : `Short description (${descLen} chars)`,
  };

  // 4. Sizing & Measurement Check (15 pts max)
  const sizes = product.sizes || [];
  const hasMeasurements = sizes.some(
    (s) => (s.productMeasurements && s.productMeasurements.length > 0) || (s.bodyMeasurements && s.bodyMeasurements.length > 0)
  );
  let sizingScore = 0;
  if (sizes.length > 0 && hasMeasurements) {
    sizingScore = 15;
  } else if (sizes.length > 0) {
    sizingScore = 8;
  } else {
    sizingScore = 10; // Default baseline for products without sizing requirements
  }
  const sizingCheck: IQCCheckItem = {
    passed: sizingScore >= 10,
    score: sizingScore,
    maxScore: 15,
    details: sizes.length > 0
      ? `${sizes.length} size(s) listed (${hasMeasurements ? 'with detailed measurements' : 'missing size chart values'})`
      : 'No sizes configured',
  };

  // 5. Dynamic Attributes Check (15 pts max)
  const dynamicKeys = product.dynamicData ? Object.keys(product.dynamicData).filter((k) => {
    const val = product.dynamicData?.[k];
    return val !== undefined && val !== null && val !== '';
  }) : [];
  let attrScore = 0;
  if (dynamicKeys.length >= 3) {
    attrScore = 15;
  } else if (dynamicKeys.length >= 1) {
    attrScore = 8;
  }
  const attributesCheck: IQCCheckItem = {
    passed: dynamicKeys.length >= 2,
    score: attrScore,
    maxScore: 15,
    details: `${dynamicKeys.length} category specification field(s) filled`,
  };

  // 6. Pricing & Discount Check (10 pts max)
  const price = product.price || 0;
  const discountedPrice = product.discountedPrice;
  let priceScore = 0;
  if (price > 0) {
    priceScore = 5;
    if (discountedPrice !== undefined && discountedPrice > 0 && discountedPrice < price) {
      priceScore += 5;
    } else if (discountedPrice === undefined) {
      priceScore += 5;
    }
  }
  const pricingCheck: IQCCheckItem = {
    passed: price > 0 && (discountedPrice === undefined || discountedPrice < price),
    score: priceScore,
    maxScore: 10,
    details: price > 0 ? `Price set to Rs. ${price}${discountedPrice ? ` (Discounted: Rs. ${discountedPrice})` : ''}` : 'Price missing or invalid',
  };

  // 7. Variants & Stock Check (5 pts max)
  const variants = product.colorVariants || [];
  const skus = product.skus || [];
  const legacyStock = variants.reduce((acc, v) => {
    const vStock = v.stocks?.reduce((sAcc, s) => sAcc + (s.quantity || 0), 0) || 0;
    return acc + vStock;
  }, 0);
  const matrixStock = skus.reduce((acc, s) => acc + (s.stock || 0), 0);
  const totalStock = legacyStock + matrixStock;

  const variantScore = totalStock > 0 ? 5 : 0;
  const variantsCheck: IQCCheckItem = {
    passed: totalStock > 0,
    score: variantScore,
    maxScore: 5,
    details: skus.length > 0
      ? `${skus.length} SKU variant(s) with total inventory of ${totalStock} units`
      : `${variants.length} variant(s) with total inventory of ${totalStock} units`,
  };

  const totalScore = Math.min(
    100,
    imageScore + titleScore + descScore + sizingScore + attrScore + priceScore + variantScore
  );

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
