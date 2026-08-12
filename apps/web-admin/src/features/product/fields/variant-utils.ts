import type { FieldSpec, VariantKind, VariantMetaItem } from '../types';

export type { VariantKind, VariantMetaItem } from '../types';

export function normalizeUi(
  uiType?: string,
):
  | 'input'
  | 'number'
  | 'Switch'
  | 'select'
  | 'multiselect'
  | 'VariantList'
  | 'MainImage'
  | 'SkuTableV2'
  | 'ColorMeta'
  | 'ColorInline' {
  const ui = String(uiType || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  const map: Record<string, ReturnType<typeof normalizeUi>> = {
    input: 'input',
    number: 'number',
    switch: 'Switch',
    select: 'select',
    multiselect: 'multiselect',
    multiselectalias: 'multiselect',
    skutablev2: 'SkuTableV2',
    mainimage: 'MainImage',
    colormeta: 'ColorMeta',
    colorinline: 'ColorInline',
    variantlist: 'VariantList',
  };
  return map[ui] ?? 'input';
}

export function detectVariantKind(f: FieldSpec): VariantKind | null {
  const group = String(f.group || '').toLowerCase();
  if (!group.includes('variant')) return null;
  const name = f.name?.toLowerCase?.() ?? '';
  const label = f.label?.toLowerCase?.() ?? '';
  if (name === 'color' || label.includes('color')) return 'color';
  if (name === 'size' || label.includes('size')) return 'size';
  return 'other';
}

export function extractVariantsMeta(fields: FieldSpec[]): {
  variants: VariantMetaItem[];
  colorFieldName?: string;
} {
  const variantFields = (fields || []).filter((f) =>
    String(f.group || '')
      .toLowerCase()
      .includes('variant'),
  );
  const variants: VariantMetaItem[] = variantFields
    .filter((f) =>
      ['select', 'multiselect', 'VariantList'].includes(String(normalizeUi(f.uiType))),
    )
    .map((f) => {
      const ui = normalizeUi(f.uiType) as 'select' | 'multiselect' | 'VariantList';
      const kind = detectVariantKind(f) ?? 'other';
      return { key: f.name, label: f.label, kind, ui };
    });
  const colorFieldName = variants.find((v) => v.kind === 'color')?.key;
  return { variants, colorFieldName };
}

export const getLabelMap = (fields: FieldSpec[], fieldName?: string): Map<string, string> => {
  if (!fieldName) return new Map<string, string>();
  const field = fields.find((entry) => entry.name === fieldName);
  const items = field?.dataSource?.items;
  if (!field || !Array.isArray(items)) return new Map<string, string>();
  return new Map<string, string>(
    items
      .filter(
        (option): option is { value: string; label: string } =>
          typeof option === 'object' &&
          option !== null &&
          'value' in option &&
          'label' in option &&
          Boolean((option as { value?: string }).value) &&
          Boolean((option as { label?: string }).label),
      )
      .map((option) => [String(option.value), String(option.label)]),
  );
};