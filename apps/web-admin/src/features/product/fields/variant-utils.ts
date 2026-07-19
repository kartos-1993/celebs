import type { FieldSpec } from './UiRegistry';

export type VariantKind = 'color' | 'size' | 'other';

export interface VariantMetaItem {
  key: string;
  label: string;
  kind: VariantKind;
  ui: 'select' | 'multiselect' | 'VariantList';
}

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
  const map: Record<string, any> = {
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
  return map[ui] ?? (uiType as any);
}

export function detectVariantKind(f: FieldSpec): VariantKind | null {
  const group = String(f.group || '').toLowerCase();
  if (!group.includes('variant')) return null;
  const vType = String((f as any).variantType || (f as any).variantAxis || '')
    .toLowerCase()
    .trim();
  const name = f.name?.toLowerCase?.() ?? '';
  const label = f.label?.toLowerCase?.() ?? '';
  if (vType === 'color' || name === 'color' || label.includes('color')) return 'color';
  if (vType === 'size' || name === 'size' || label.includes('size')) return 'size';
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
    .filter((f) => ['select', 'multiselect', 'VariantList'].includes(String(normalizeUi(f.uiType))))
    .map((f) => {
      const ui = normalizeUi(f.uiType);
      const kind = detectVariantKind(f) ?? 'other';
      return { key: f.name, label: f.label, kind, ui: ui as any } as VariantMetaItem;
    });
  const colorFieldName = variants.find((v) => v.kind === 'color')?.key;
  return { variants, colorFieldName };
}

export const getLabelMap = (fields: FieldSpec[], fieldName?: string) => {
  if (!fieldName) {
    return new Map<string, string>();
  }

  const field = fields.find((entry) => entry.name === fieldName);
  if (!field || !Array.isArray(field.dataSource)) {
    return new Map<string, string>();
  }

  return new Map<string, string>(
    field.dataSource
      .filter(
        (option: any): option is { value: string; label: string } =>
          Boolean(option?.value) && Boolean(option?.label),
      )
      .map((option: any) => [String(option.value), String(option.label)]),
  );
};

