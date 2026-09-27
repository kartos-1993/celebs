import type { UseFormReturn } from 'react-hook-form';

import type { ProductFormValues } from '../../types';

export interface DynamicSyncFieldRule {
  targetField: 'name' | 'brand';
  candidateKeys: readonly string[];
}

export const DYNAMIC_FIELD_SYNC_RULES: readonly DynamicSyncFieldRule[] = [
  { targetField: 'name', candidateKeys: ['name', 'productname', 'title'] },
  { targetField: 'brand', candidateKeys: ['brand', 'productbrand'] },
] as const;

function syncField(
  form: UseFormReturn<ProductFormValues>,
  normalized: Record<string, unknown>,
  rule: DynamicSyncFieldRule,
): void {
  const matchedKey = rule.candidateKeys.find((key) => key in normalized);
  if (!matchedKey) return;

  const newValue = String(normalized[matchedKey] ?? '').trim();
  if (form.getValues(rule.targetField) !== newValue) {
    form.setValue(rule.targetField, newValue, { shouldDirty: true, shouldValidate: true });
  }
}

export function syncDynamicTitleAndBrand(
  form: UseFormReturn<ProductFormValues>,
  values: Record<string, unknown>,
  rules: readonly DynamicSyncFieldRule[] = DYNAMIC_FIELD_SYNC_RULES,
): void {
  const normalized = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key.toLowerCase(), value]),
  );

  for (const rule of rules) {
    syncField(form, normalized, rule);
  }
}
