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

  const product = productInput as any;

  // 1. Main Images Check (25 pts max)
  const imageCount = (product.mainImages || product.images)?.length || 0;
  const hasVariantImages = Boolean(
    product.colorVariants?.some((variant: any) => variant.images && variant.images.length > 0),
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
  const sizes = product.sizes || [];
  const hasSizeData =
    sizes.length > 0 &&
    sizes.some(
      (s: any) =>
        (s.productMeasurements && s.productMeasurements.length > 0) ||
        (s.bodyMeasurements && s.bodyMeasurements.length > 0),
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
  const dynamicVals = product.dynamicData?.values || {};
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
  const variants = product.colorVariants || [];
  const skus = product.skus || [];
  const legacyStock = variants.reduce((acc: number, v: any) => {
    const vStock = v.stocks?.reduce((sAcc: number, s: any) => sAcc + (s.quantity || 0), 0) || 0;
    return acc + vStock;
  }, 0);
  const matrixStock = skus.reduce((acc: number, s: any) => acc + (s.stock || 0), 0);
  const totalStock = legacyStock + matrixStock;

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
