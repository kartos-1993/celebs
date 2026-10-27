import { describe, expect, it } from 'vitest';

import { calculateFitRecommendation } from '../fit-calculator';

describe('calculateFitRecommendation', () => {
  it('recommends Medium size for average height and weight with regular fit', () => {
    const result = calculateFitRecommendation({
      heightCm: 170,
      weightKg: 65,
      fitPreference: 'regular',
    });
    expect(result.size).toBe('M');
    expect(result.confidence).toBe(95);
  });

  it('shifts to Small when slim fit preference is selected', () => {
    const result = calculateFitRecommendation({
      heightCm: 170,
      weightKg: 65,
      fitPreference: 'slim',
    });
    expect(result.size).toBe('S');
    expect(result.confidence).toBe(92);
  });

  it('shifts to Large when loose fit preference is selected', () => {
    const result = calculateFitRecommendation({
      heightCm: 170,
      weightKg: 65,
      fitPreference: 'loose',
    });
    expect(result.size).toBe('L');
    expect(result.confidence).toBe(94);
  });

  it('restricts recommendation to available sizes when calculated size is out of stock', () => {
    const result = calculateFitRecommendation({
      heightCm: 185,
      weightKg: 95,
      fitPreference: 'regular',
      availableSizes: ['S', 'M', 'L'], // XXL not available
    });
    expect(result.size).toBe('S'); // Falls back to first available size
  });
});
