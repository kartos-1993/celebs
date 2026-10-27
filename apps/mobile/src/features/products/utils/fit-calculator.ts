export type FitPreference = 'slim' | 'regular' | 'loose';

export interface FitCalculationInput {
  heightCm: number | string;
  weightKg: number | string;
  fitPreference: FitPreference;
  availableSizes?: string[];
}

export interface FitCalculationResult {
  size: string;
  confidence: number;
}

const DEFAULT_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

/**
 * Standard anthropometric fit calculator calibrated for South Asian / Nepali apparel sizing.
 */
export function calculateFitRecommendation({
  heightCm,
  weightKg,
  fitPreference,
  availableSizes = DEFAULT_SIZES,
}: FitCalculationInput): FitCalculationResult {
  const h = typeof heightCm === 'number' ? heightCm : parseFloat(heightCm) || 170;
  const w = typeof weightKg === 'number' ? weightKg : parseFloat(weightKg) || 65;

  let baseSize = 'M';
  let confidence = 95;

  if (h < 162) {
    if (w < 55) baseSize = 'S';
    else if (w < 65) baseSize = 'M';
    else baseSize = 'L';
  } else if (h < 174) {
    if (w < 58) baseSize = 'S';
    else if (w < 70) baseSize = 'M';
    else if (w < 82) baseSize = 'L';
    else baseSize = 'XL';
  } else if (h < 183) {
    if (w < 68) baseSize = 'M';
    else if (w < 80) baseSize = 'L';
    else if (w < 92) baseSize = 'XL';
    else baseSize = 'XXL';
  } else {
    if (w < 75) baseSize = 'L';
    else if (w < 88) baseSize = 'XL';
    else baseSize = 'XXL';
  }

  // Shift size based on preference
  let idx = DEFAULT_SIZES.indexOf(baseSize);

  if (fitPreference === 'slim' && idx > 0) {
    idx -= 1;
    confidence = 92;
  } else if (fitPreference === 'loose' && idx < DEFAULT_SIZES.length - 1) {
    idx += 1;
    confidence = 94;
  }

  const calculated = DEFAULT_SIZES[idx] || baseSize;

  // Ensure calculated size is in availableSizes
  const finalSize = availableSizes.includes(calculated)
    ? calculated
    : availableSizes[0] || calculated;

  return { size: finalSize, confidence };
}
