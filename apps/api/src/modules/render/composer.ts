import type { IAttribute } from '../../db/models/attribute.model';

// UI field types supported by the renderer
export type UiType =
  | 'input'
  | 'number'
  | 'Switch'
  | 'select'
  | 'multiSelect'
  | 'SkuTableV2'
  | 'MainImage'
  | 'ColorInline'
  | 'ColorMeta';

export type FieldGroup =
  | 'basic'
  | 'sale'
  | 'package'
  | 'details'
  | 'termcondition'
  | 'variant'
  | 'base';

export interface FieldSpec {
  name: string;
  uiType: UiType;
  label: string;
  group: FieldGroup;
  required?: boolean;
  value?: any;
  dataSource?: any;
  rule?: any;
  visible?: boolean;
}

export interface CategoryDocLike {
  _id: string | any;
  name: string;
  version?: number;
  attributes: IAttribute[] | any[];
}

function titleCase(s: string) {
  return String(s)
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function selectDataSource(attr: IAttribute) {
  // Prefer standard option sets; client will call this path via ProductAPI base URL
  if ((attr as any).useStandardOptions && (attr as any).optionSetId) {
    return { optionSetId: String((attr as any).optionSetId), fetch: `/option-sets/${String((attr as any).optionSetId)}` };
  }
  const vals: string[] = Array.isArray(attr.values) ? attr.values : [];
  return vals.map((v) => ({ label: v, value: v }));
}

function attributeToField(attr: IAttribute): FieldSpec {
  const base = {
    name: attr.name,
    label: titleCase(attr.name),
    group: ((attr as any).isVariant ? 'variant' : (((attr as any).group as FieldGroup) || 'details')) as FieldGroup,
    required: !!attr.isRequired,
    visible: true,
  } as const;

  switch (attr.type) {
    case 'text':
      return { ...base, uiType: 'input' };
    case 'number':
      return { ...base, uiType: 'number' };
    case 'boolean':
      return { ...base, uiType: 'Switch' };
    case 'select':
      return { ...base, uiType: 'select', dataSource: selectDataSource(attr) };
    case 'multiselect':
      return { ...base, uiType: 'multiSelect', dataSource: selectDataSource(attr) };
    default:
      return { ...base, uiType: 'input' };
  }
}

export function composeSchema(params: {
  category: CategoryDocLike;
  locale: string;
  policy: {
    media: {
      maxImages: number;
      maxSizeBytes: number;
      accept: string[];
      minWidth?: number;
      minHeight?: number;
      aspectRatio?: string; // e.g., '1:1'
      ratioTolerance?: number; // e.g., 0.03 for 3%
    };
  };
}) {
  const fields: FieldSpec[] = [];

  // System fields (images only; product name is handled in Basic Info section on the web app)
  fields.push(
    {
      name: 'mainImage',
      uiType: 'MainImage',
      label: 'Product Images',
      group: 'base',
      required: true,
      rule: {
        maxItems: params.policy.media.maxImages,
        accept: params.policy.media.accept,
        maxSize: params.policy.media.maxSizeBytes,
  minWidth: params.policy.media.minWidth,
  minHeight: params.policy.media.minHeight,
  aspectRatio: params.policy.media.aspectRatio,
  ratioTolerance: params.policy.media.ratioTolerance,
      },
    },
  );

  // Category-authored fields
  for (const attr of params.category.attributes || []) {
    fields.push(attributeToField(attr as IAttribute));
  }

  // Variations -> SKU matrix
  const saleProps = (params.category.attributes || []).filter((a: any) => a.isVariant);

  // If there's a Color variant, add per-color images field with same media rules
  const colorAttr = (params.category.attributes || []).find((a: any) => {
    const key = String(a?.name || '').toLowerCase();
    const axis = String(a?.variantType || a?.variantAxis || '').toLowerCase();
    return a?.isVariant && (axis === 'color' || key.includes('color'));
  });
  if (colorAttr) {
    fields.push({
      name: 'variants.colorMeta',
      uiType: 'ColorInline',
      label: 'Color Images',
      group: 'variant',
      required: false,
      dataSource: { colorField: String(colorAttr.name) },
      rule: {
        maxItems: params.policy.media.maxImages,
        accept: params.policy.media.accept,
        maxSize: params.policy.media.maxSizeBytes,
        minWidth: params.policy.media.minWidth,
        minHeight: params.policy.media.minHeight,
        aspectRatio: params.policy.media.aspectRatio,
        ratioTolerance: params.policy.media.ratioTolerance,
      },
      visible: true,
    });
  }
  fields.push({
    name: 'sku',
    uiType: 'SkuTableV2',
    label: 'Price & Stock',
    group: 'sale',
    required: true,
    dataSource: saleProps.map((p: any) => ({
      key: p.name,
      label: titleCase(p.name),
      type: p.variantType ?? 'custom',
    })),
  });

  const version = params.category.version ?? 1;
  const renderTag = Buffer.from(`${String(params.category._id)}:${version}`).toString('base64');

  return { fields, renderTag };
}
