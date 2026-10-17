import type { CategoryAttributeType } from '@celebs/shared-types';
import { logger } from '@celebs/shared-utils';

import { getDropdownCategoryById } from '../api';
import { extractVariantsMeta } from '../fields/variant-utils';
import type { FieldSpec } from '../types';

/** Raised when the category-attribute fetch fails; carries the category id. */
export class CategoryAttributesError extends Error {
  readonly catId: string;
  readonly reason: unknown;

  constructor(catId: string, reason: unknown) {
    super(`Failed to load category attributes for "${catId}"`);
    this.name = 'CategoryAttributesError';
    this.catId = catId;
    this.reason = reason;
  }
}

/**
 * Appends category-attribute fields missing from the server schema.
 *
 * Failure contract: the attribute fetch is REQUIRED — swallowing it would
 * render a form missing every attribute the category declares, and the seller
 * would submit against a schema the server never described. Failures reject
 * with `CategoryAttributesError` so `useProductSchema` can surface an explicit
 * schema-error state instead.
 */
export const addFallbackFields = async (catId: string, next: FieldSpec[]) => {
  const merged = Array.isArray(next) ? [...next] : [];

  let catAttributes: CategoryAttributeType[];
  try {
    const res = await getDropdownCategoryById(catId);
    catAttributes = Array.isArray(res?.data?.attributes) ? res.data.attributes : [];
  } catch (error) {
    throw new CategoryAttributesError(catId, error);
  }

  const attrs = catAttributes;
  const existingNames = new Set(merged.map((f) => f.name.toLowerCase()));
  const extra: FieldSpec[] = [];

  let colorFieldKey = merged.find((f) =>
    Boolean(
      f.group === 'variant' &&
        (f.name.toLowerCase() === 'color' || f.name.toLowerCase().includes('color')),
    ),
  )?.name;

  const toField = (attribute: CategoryAttributeType): FieldSpec | null => {
    const attrRec = attribute as CategoryAttributeType & Record<string, unknown>;
    const attrName = (attrRec.code as string | undefined) || attribute.name;
    if (!attrName) return null;

    let uiType: FieldSpec['uiType'] = 'input';

    if (attrRec.inputType === 'SELECT') uiType = 'select';
    else if (attrRec.inputType === 'MULTISELECT') uiType = 'multiselect';
    else if (attrRec.inputType === 'NUMBER') uiType = 'number';
    else if (attrRec.inputType === 'BOOLEAN') uiType = 'Switch';

    let dataSource: unknown = undefined;
    if (Array.isArray(attribute.values) && attribute.values.length > 0) {
      if (uiType === 'select' || uiType === 'multiselect') {
        dataSource = attribute.values.map((value: unknown) =>
          typeof value === 'string'
            ? { label: value, value }
            : typeof value === 'object' && value !== null
              ? {
                  label: String(
                    (value as Record<string, unknown>).label ??
                      (value as Record<string, unknown>).name ??
                      (value as Record<string, unknown>).value ??
                      value,
                  ),
                  value:
                    (value as Record<string, unknown>).value ??
                    (value as Record<string, unknown>).label ??
                    (value as Record<string, unknown>).name,
                }
              : { label: String(value), value: String(value) },
        );
      } else {
        dataSource = [];
      }
    }

    return {
      name: attrName,
      uiType: uiType as FieldSpec['uiType'],
      label: String(attribute.label || attribute.name || attrName),
      group: attribute.isVariant ? 'variant' : 'details',
      required: !!attribute.isRequired,
      dataSource: (Array.isArray(dataSource) ? { items: dataSource } : dataSource) as
        | Record<string, unknown>
        | undefined,
      visible: true,
    };
  };

  for (const attribute of attrs) {
    const field = toField(attribute);
    if (!field) continue;
    if (existingNames.has(field.name.toLowerCase())) continue;

    extra.push(field);

    if (
      !colorFieldKey &&
      (field.name.toLowerCase() === 'color' || field.name.toLowerCase().includes('color'))
    ) {
      colorFieldKey = field.name;
    }
  }

  if (extra.length > 0) {
    merged.push(...extra);
  }

  if (colorFieldKey) {
    const existingColorMeta = merged.find(
      (f) => f.uiType === 'ColorMeta' || f.uiType === 'ColorInline',
    );
    if (!existingColorMeta) {
      merged.push({
        name: 'colorMeta',
        uiType: 'ColorMeta',
        label: 'Color Media & Swatches',
        group: 'media',
        required: false,
        dataSource: { colorField: colorFieldKey },
        visible: true,
      });
    }
  }

  // WONTFIX: this colorMeta injection duplicates the one in
  // `ensureVariantSupportFields` below (same label, same `dataSource` shape)
  // and mirrors the colorField lookup the field components do in
  // `fields/components/color-meta-input-field.tsx` / `color-inline-input-field.tsx`.
  // Collapsing them means touching those files, which belong to another change
  // stream — the idempotence guard above keeps the duplicates from stacking.

  return merged;
};

export const normalizeSchema = (fields: FieldSpec[]) =>
  fields.map((field) => {
    if (field.uiType === 'SizeMeasurementsTable') {
      return { ...field, group: 'sale' };
    }
    return field;
  });

export const ensureVariantSupportFields = (fields: FieldSpec[]) => {
  const merged = [...fields];

  try {
    const { variants } = extractVariantsMeta(merged);
    const variantsMeta = variants.map((variant) => ({
      key: variant.key,
      label: variant.label,
    }));

    if (variantsMeta.length > 0) {
      const colorVariant = variantsMeta.find(
        (v) => v.key.toLowerCase() === 'color' || v.key.toLowerCase().includes('color'),
      );

      if (
        colorVariant &&
        !merged.some((f) => f.uiType === 'ColorMeta' || f.uiType === 'ColorInline')
      ) {
        merged.push({
          name: 'colorMeta',
          uiType: 'ColorMeta',
          label: 'Color Media & Swatches',
          group: 'media',
          required: false,
          dataSource: { colorField: colorVariant.key },
          visible: true,
        });
      }

      const sizeVariant = variants.find((v) => v.kind === 'size');
      const sizeTableIndex = merged.findIndex((f) => f.uiType === 'SizeMeasurementsTable');
      if (sizeVariant && sizeTableIndex !== -1) {
        merged[sizeTableIndex] = {
          ...merged[sizeTableIndex],
          dataSource: {
            ...(merged[sizeTableIndex].dataSource || {}),
            sizeField: sizeVariant.key,
          },
        };
      }

      if (!merged.some((f) => f.uiType === 'SkuTableV2')) {
        merged.push({
          name: 'skus',
          uiType: 'SkuTableV2',
          label: 'Product SKUs & Pricing Matrix',
          group: 'sale',
          required: true,
          dataSource: { variants: variantsMeta },
          visible: true,
        });
      }
    }
  } catch (error) {
    // Non-fatal: variant-axes extraction is a formatting step over an
    // already-fetched schema. Log it instead of dropping it silently —
    // the field set still renders, just without injected variant support.
    logger.warn({ error }, 'ensureVariantSupportFields: variant extraction failed');
  }

  return merged;
};
