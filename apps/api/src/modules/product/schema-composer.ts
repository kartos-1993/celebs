import crypto from 'crypto';
import type { IAttribute } from '@/db/models/attribute.model';
import prisma from '@/config/db.prisma';

// UI field types supported by the renderer
export type UiType =
  | 'input'
  | 'number'
  | 'Switch'
  | 'select'
  | 'multiselect'
  | 'SkuTableV2'
  | 'MainImage'
  | 'ColorInline'
  | 'ColorMeta';

import type { AttributeGroup as FieldGroup } from '@celebs/shared-types';

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
  placeholder?: string;
  info?: {
    help?: string;
    top?: string;
  };
}

export interface CategoryDocLike {
  id: string;
  name: string;
  version?: number;
  attributes: IAttribute[];
  sizeChartColumns?: string[];
  bodyChartColumns?: string[];
}

function titleCase(s: string) {
  return String(s)
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function selectDataSource(attr: any, optionSetsMap: Map<string, string[]>) {
  const vals: string[] = Array.isArray(attr.values) ? attr.values : [];

  const searchName =
    attr.optionSetName ||
    (attr.name === 'Color' || attr.variantType === 'color'
      ? 'Basic Colors'
      : attr.name === 'Size' || attr.variantType === 'size'
        ? 'Alpha Sizes (XXS-5XL)'
        : attr.name);

  const matched =
    optionSetsMap.get(searchName.toLowerCase()) ||
    optionSetsMap.get(String(attr.name).toLowerCase());
  if (matched && matched.length > 0 && (vals.length === 0 || attr.useStandardOptions)) {
    return matched.map((v) => ({ label: v, value: v }));
  }

  if (vals.length > 0) {
    return vals.map((v) => ({ label: v, value: v }));
  }

  if (attr.useStandardOptions && attr.optionSetId) {
    return {
      optionSetId: String(attr.optionSetId),
      fetch: `/option-sets/${String(attr.optionSetId)}`,
    };
  }

  return [];
}

function attributeToField(attr: IAttribute, optionSetsMap: Map<string, string[]>): FieldSpec {
  const group: FieldGroup = attr.isVariant ? 'variant' : attr.group || 'details';
  const base = {
    name: attr.name,
    label: attr.label || titleCase(attr.name),
    group,
    required: !!attr.isRequired,
    visible: true,
    placeholder: attr.placeholder,
    info: attr.info,
  } as const;

  switch (attr.type) {
    case 'text':
      return { ...base, uiType: 'input' };
    case 'number':
      return { ...base, uiType: 'number' };
    case 'boolean':
      return { ...base, uiType: 'Switch' };
    case 'select':
      return { ...base, uiType: 'select', dataSource: selectDataSource(attr, optionSetsMap) };
    case 'multiselect':
      return { ...base, uiType: 'multiselect', dataSource: selectDataSource(attr, optionSetsMap) };
    default:
      return { ...base, uiType: 'input' };
  }
}

export async function composeSchema(params: {
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
      maxWidth?: number;
      maxHeight?: number;
    };
  };
}) {
  const optionSets = await prisma.optionSet.findMany();
  const optionSetsMap = new Map<string, string[]>();
  for (const s of optionSets) {
    if (Array.isArray(s.options)) {
      optionSetsMap.set(s.name.toLowerCase(), s.options as string[]);
      if (s.displayName) {
        optionSetsMap.set(s.displayName.toLowerCase(), s.options as string[]);
      }
    }
  }

  const fields: FieldSpec[] = [];

  // System fields (images only; product name is handled in Basic Info section on the web app)
  fields.push({
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
      maxWidth: params.policy.media.maxWidth,
      maxHeight: params.policy.media.maxHeight,
    },
  });

  // Category-authored fields
  for (const attr of params.category.attributes || []) {
    fields.push(attributeToField(attr, optionSetsMap));
  }

  // Variations -> SKU matrix
  const saleProps = (params.category.attributes || []).filter((a) => a.isVariant);

  // If there's a Color variant, add per-color images field with same media rules
  const colorAttr = (params.category.attributes || []).find((a) => {
    const key = String(a.name || '').toLowerCase();
    return a.isVariant && key.includes('color');
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
        maxWidth: params.policy.media.maxWidth,
        maxHeight: params.policy.media.maxHeight,
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
    dataSource: saleProps.map((p) => ({
      key: p.name,
      label: titleCase(p.name),
      type: 'custom',
    })),
  });

  const charts: Array<{ key: string; label: string; columns: string[] }> = [];
  if (
    Array.isArray(params.category.sizeChartColumns) &&
    params.category.sizeChartColumns.length > 0
  ) {
    charts.push({
      key: 'product',
      label: 'Product Measurements (Garment Flat)',
      columns: params.category.sizeChartColumns,
    });
  }
  if (
    Array.isArray(params.category.bodyChartColumns) &&
    params.category.bodyChartColumns.length > 0
  ) {
    charts.push({
      key: 'body',
      label: 'Body Measurements (Wearer Fit Guide)',
      columns: params.category.bodyChartColumns,
    });
  }

  if (charts.length > 0) {
    fields.push({
      name: 'sizes',
      uiType: 'SizeMeasurementsTable' as unknown as UiType,
      label: 'Size & Fit Measurements',
      group: 'sale',
      required: false,
      dataSource: { charts },
      visible: true,
    });
  }

  const fieldsHash = crypto.createHash('md5').update(JSON.stringify(fields)).digest('hex');
  // Include policy fingerprint and fields content hash so any change busts the ETag cache
  const policyFingerprint = [
    params.policy.media.minWidth ?? 0,
    params.policy.media.minHeight ?? 0,
    params.policy.media.aspectRatio ?? '',
    params.policy.media.maxImages,
    params.policy.media.maxSizeBytes,
    params.policy.media.maxWidth ?? 0,
    params.policy.media.maxHeight ?? 0,
  ].join(':');
  const renderTag = Buffer.from(
    `${String(params.category.id)}:${fieldsHash}:${policyFingerprint}`,
  ).toString('base64');

  return { fields, renderTag };
}
