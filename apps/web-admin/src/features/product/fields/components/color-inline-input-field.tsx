import { useWatch } from 'react-hook-form';

import type { UiProps } from '../ui-registry';
import { resolveColorAxisKey } from '../variant-utils';

import { ColorInlineRow } from './color-inline-row';
import { LabelWithRequired } from './shared';

export function ColorInlineInputField({ field }: UiProps) {
  const dsVariants = Array.isArray(field.dataSource?.variants) ? field.dataSource.variants : [];
  const colorField: string =
    (field.dataSource?.colorField as string | undefined) ??
    resolveColorAxisKey(
      (dsVariants as Array<{ label?: string; key?: string }>).map((v) => ({
        key: v?.key ?? '',
        label: v?.label ?? '',
      })),
    ) ??
    'color';

  const labelsMap: Record<string, Record<string, string>> = (field.dataSource?.labels as Record<
    string,
    Record<string, string>
  >) ?? {};
  const labelOf = (value: string) => labelsMap?.[colorField]?.[String(value)] ?? String(value);

  const accept: string[] | undefined = Array.isArray(field.rule?.accept)
    ? (field.rule.accept as string[])
    : undefined;

  const limits = {
    maxImages: typeof field.rule?.maxItems === 'number' ? field.rule.maxItems : undefined,
    maxSize: typeof field.rule?.maxSize === 'number' ? field.rule.maxSize : undefined,
  } as { maxImages?: number; maxSize?: number };

  const selected = useWatch({ name: colorField });
  const colors: string[] = Array.isArray(selected)
    ? (selected as string[])
    : selected
      ? [String(selected)]
      : [];

  return (
    <div className="space-y-2 col-span-full">
      <div className="flex items-center gap-2 text-sm">
        <LabelWithRequired required={field.required}>{field.label}</LabelWithRequired>
        {limits.maxImages != null ? (
          <span className="text-xs text-muted-foreground">
            Max {limits.maxImages} images for each variant
          </span>
        ) : null}
      </div>
      {colors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 px-4 py-5 text-center text-xs text-muted-foreground">
          Select one or more colors first — each color gets its own swatch and product images.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-background">
          <div className="divide-y divide-border/60">
            {colors.map((c) => (
              <ColorInlineRow
                key={c}
                color={labelOf(c)}
                namePrefix={`variants.colorMeta.${c}`}
                accept={accept}
                limits={limits}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
