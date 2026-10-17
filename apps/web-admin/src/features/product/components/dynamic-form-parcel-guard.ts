import type { FieldSpec } from '../types';

/**
 * The four parcel paths, owned by `ShippingDimensionsCard`.
 *
 * They are fixed-shape form values rather than category attributes, so they
 * live in that card. A category whose schema ALSO declares a `package`-group
 * attribute under one of these names would otherwise put a second input for one
 * RHF field on screen — the seller edits one box, the other keeps the old value,
 * and the payload ships whichever one happened to be written last.
 *
 * `ShippingWarrantySection` owns the section anchor; this file owns the field
 * names that must never be rendered by the schema-driven block.
 */
export const PARCEL_FIELD_OWNER_PATHS = [
  'packageWeightKg',
  'packageLengthCm',
  'packageWidthCm',
  'packageHeightCm',
] as const;

const OWNER_OWNED = new Set<string>(PARCEL_FIELD_OWNER_PATHS);

/**
 * Drops the attributes whose renderer is `ShippingDimensionsCard`'s, so each
 * parcel path is rendered exactly once. Every other `package`-group attribute
 * is returned untouched — packaging type, fragility, and any category-specific
 * packaging attribute still need the dynamic block.
 */
export function excludeOwnerOwnedFields(fields: FieldSpec[]): FieldSpec[] {
  return fields.filter((field) => !OWNER_OWNED.has(field.name));
}
