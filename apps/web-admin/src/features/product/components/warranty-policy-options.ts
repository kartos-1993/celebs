export const PACKAGING_OPTIONS = [
  { value: 'FLYER_SMALL', label: 'Flyer Small (1-2 Apparel Items)' },
  { value: 'FLYER_MEDIUM', label: 'Flyer Medium (Hoodies, Jackets)' },
  { value: 'BOX_STANDARD', label: 'Box Standard (Footwear, Electronics)' },
  { value: 'BOX_LARGE', label: 'Box Large (Bulky / Fragile Goods)' },
] as const;

export const WARRANTY_OPTIONS = [
  { value: 'NO_WARRANTY', label: 'No Warranty Applicable' },
  { value: 'BRAND_WARRANTY', label: 'Brand Authorized Warranty' },
  { value: 'SELLER_WARRANTY', label: 'Seller / Shop Guarantee' },
] as const;
