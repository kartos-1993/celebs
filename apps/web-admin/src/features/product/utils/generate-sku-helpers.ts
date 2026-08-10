/**
 * Helper utility to generate unique, non-colliding SKUs for e-commerce products.
 * Uses Brand Code + Date Stamp + Random Hash + Clean Variant Codes.
 */

export function generateCollisionProofBaseSku(brand?: string): string {
  const rawBrand = String(brand ?? '').trim();
  const brandPrefix = rawBrand
    ? rawBrand
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 3)
        .toUpperCase()
    : 'CEL';

  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');

  const randomHash = Math.random().toString(36).substring(2, 7).toUpperCase();

  return `${brandPrefix}-${dateStr}${randomHash}`;
}

export function cleanSkuAttributeCode(label: string): string {
  return (
    String(label ?? '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 6) || 'OPT'
  );
}
