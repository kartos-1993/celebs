import { generateSheinStyleSku } from '@celebs/shared-utils';

/**
 * Helper utility to generate unique, non-colliding SKUs for e-commerce products.
 * Uses 18-character Shein/Retail-grade standard format: [Brand][Dept][YYMMDD][10-digit ID].
 */

export function generateCollisionProofBaseSku(brand?: string, department?: string): string {
  return generateSheinStyleSku({
    brandPrefix: brand ? brand.slice(0, 1) : 'c',
    department,
  });
}

export function cleanSkuAttributeCode(label: string): string {
  return (
    String(label ?? '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 6) || 'OPT'
  );
}

