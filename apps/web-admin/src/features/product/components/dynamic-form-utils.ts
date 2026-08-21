import { getCategoryById } from '@/features/category/api';
import type { CategoryAttributeType } from '@celebs/shared-types';
import type { FieldSpec } from '../types';
import { extractVariantsMeta } from '../fields/variant-utils';

export const addFallbackFields = async (catId: string, next: FieldSpec[]) => {
  const merged = Array.isArray(next) ? [...next] : [];

  try {
    const res = await getCategoryById(catId);
    const cat = res?.data;
    const attrs: CategoryAttributeType[] = Array.isArray(cat?.attributes)
      ? cat.attributes
      : [];

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
  } catch (_err) {
    // Return base fields on API error
  }

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
  } catch (_err) {
    // Return original fields if extraction fails
  }

  return merged;
};
