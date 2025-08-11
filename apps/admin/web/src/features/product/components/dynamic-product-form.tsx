import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import type { FieldSpec } from '../renderer/UiRegistry';
import { extractVariantsMeta } from '../renderer/variant-utils';
import { uiTypeRegistry } from '../renderer/UiRegistry';
import CollapsibleFormSection from './collapsible-form-section';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ImageIcon, Palette, Ruler } from 'lucide-react';
import { ProductAPI } from '@/lib/axios-client';
import { CategoryApiService } from '../../category/api';

export default function DynamicProductForm({ catId, onValuesChange }: { catId: string; onValuesChange?: (values: any, sectionKey: string) => void }) {
  const [fields, setFields] = React.useState<FieldSpec[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // Single shared form across all sections so dependencies work (e.g., variants -> SKU table)
  const form = useForm({ defaultValues: {}, mode: 'onChange' });

  React.useEffect(() => {
    (async () => {
      if (!catId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await ProductAPI.get('/product-render', { params: { catId, locale: 'en_US' } });
        const next: FieldSpec[] = res.data?.data?.data ?? res.data?.data ?? [];

        // Build a lightweight fallback for missing sections from Category attributes
        let merged: FieldSpec[] = Array.isArray(next) ? [...next] : [];
        try {
          const cat = await CategoryApiService.getCategoryById(catId);
          const attrs: any[] = (cat as any)?.data?.attributes ?? [];
          if (Array.isArray(attrs) && attrs.length) {
            const toField = (a: any): FieldSpec | null => {
              const key = String(a.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
              if (!key) return null;
              const isSelect = a.type === 'select' || a.type === 'multiselect';
              const vType = (a.variantType || a.variantAxis || '').toString().toLowerCase();
              const isColorVariant = a.isVariant && (vType === 'color' || key === 'color' || String(a.name || '').toLowerCase().includes('color'));
              const isSizeVariant = a.isVariant && (vType === 'size' || key === 'size' || String(a.name || '').toLowerCase().includes('size'));
              const uiType = isColorVariant
                ? 'VariantList'
                : isSizeVariant
                  ? 'multiSelect'
                  : a.type === 'multiselect'
                  ? 'multiSelect'
                  : a.type === 'select'
                    ? 'select'
                    : a.type === 'number'
                      ? 'number'
                      : a.type === 'boolean'
                        ? 'Switch'
                        : 'input';
              let dataSource: any = undefined;
              if (isSelect) {
                if (a.useStandardOptions && a.optionSetId) {
                  dataSource = { fetch: `/option-sets/${a.optionSetId}` };
                } else if (Array.isArray(a.values)) {
                  dataSource = (a.values as any[]).map((v) =>
                    typeof v === 'string' ? { label: v, value: v } : { label: v.label ?? v.name ?? String(v.value), value: v.value ?? v.label ?? v.name }
                  );
                } else {
                  dataSource = [];
                }
              }
              return {
                name: key,
                uiType: uiType as any,
                label: String(a.name || key),
                group: a.isVariant ? 'variant' : 'details',
                required: !!a.isRequired,
                dataSource,
                visible: true,
              };
            };

            // Only add fields for groups that came back empty from composer
            const existingNames = new Set((merged || []).map((f) => f.name));
            const haveDetails = (merged || []).some((f) => (f.group || '').toLowerCase().includes('detail'));
            const haveVariant = (merged || []).some((f) => (f.group || '').toLowerCase().includes('variant'));

            const extra: FieldSpec[] = [];
            let colorFieldKey: string | null = null;
            for (const a of attrs) {
              const f = toField(a);
              if (!f) continue;
              if (existingNames.has(f.name)) continue;
              if (f.group === 'details' && haveDetails) continue;
              if (f.group === 'variant' && haveVariant) continue;
              extra.push(f);
              const vType = (a.variantType || a.variantAxis || '').toString().toLowerCase();
              if (!colorFieldKey && (vType === 'color' || f.name === 'color')) {
                colorFieldKey = f.name;
              }
            }
      // Inject per-color image uploader when color variant exists
            if (colorFieldKey && !existingNames.has('variants.colorMeta')) {
              extra.push({
                name: 'variants.colorMeta',
        uiType: 'ColorInline' as any,
                label: 'Color Images',
                group: 'variant',
                required: false,
                dataSource: { colorField: colorFieldKey },
                rule: { accept: ['image/*'], maxItems: 8, maxSize: 5 * 1024 * 1024 },
                visible: true,
              });
            }
            if (extra.length) merged = [...merged, ...extra];
          }
        } catch {
          // ignore fallback errors, keep original fields
        }

        // Normalize any composer-provided Color -> VariantList (only when backend provides multiselect)
        // and Size -> multiSelect (only when backend provides select)
        merged = (merged || []).map((f) => {
          const isVariantGroup = (f.group || '').toLowerCase().includes('variant');
          const isColorName = f.name === 'color' || f.label?.toLowerCase?.().includes('color');
          const isSizeName = f.name === 'size' || f.label?.toLowerCase?.().includes('size');
          const ui = String(f.uiType || '').toLowerCase();
          if (isVariantGroup && isColorName && ui === 'multiselect') {
            return { ...f, uiType: 'VariantList' as any };
          }
          if (isVariantGroup && isSizeName && (ui === 'select')) {
            return { ...f, uiType: 'multiSelect' as any };
          }
          return f;
        });

        // Ensure SkuTableV2 is aware of variant keys (color/size)
        try {
          const { variants: variantMetaItems } = extractVariantsMeta(merged || []);
          const variantsMeta = variantMetaItems.map((v) => ({ key: v.key, label: v.label }));
          const idx = (merged || []).findIndex((f) => String(f.uiType) === 'SkuTableV2');
          if (variantsMeta.length) {
            if (idx >= 0) {
              const existing = merged[idx];
              const ds = existing.dataSource ?? {};
              if (!ds.fetch && !Array.isArray(ds)) {
                existing.dataSource = { ...(ds || {}), variants: variantsMeta } as any;
              }
            } else {
              // If no SkuTable present, add a minimal one under 'sale'
              merged.push({
                name: 'sku.table',
                uiType: 'SkuTableV2' as any,
                label: 'Price & Stock',
                group: 'sale',
                required: false,
                dataSource: { variants: variantsMeta },
                visible: true,
              });
            }

            // Ensure Color Images UI exists whenever a Color variant exists
            const colorVariantField = (merged || []).find(
              (f) => (f.group || '').toLowerCase().includes('variant') && (f.name === 'color' || f.label?.toLowerCase?.().includes('color'))
            );
            const hasColorImages = (merged || []).some((f) => f.name === 'variants.colorMeta');
            if (colorVariantField && !hasColorImages) {
              merged.push({
                name: 'variants.colorMeta',
                uiType: 'ColorInline' as any,
                label: 'Color Images',
                group: 'variant',
                required: false,
                dataSource: { colorField: colorVariantField.name },
                rule: { accept: ['image/*'], maxItems: 8, maxSize: 5 * 1024 * 1024 },
                visible: true,
              });
            }
          }
        } catch {}

        // Final safeguard: ensure Color Images UI exists if Color variant exists
        try {
          const colorVariantField = (merged || []).find(
            (f) => (f.group || '').toLowerCase().includes('variant') && (f.name === 'color' || f.label?.toLowerCase?.().includes('color'))
          );
          const hasColorImages = (merged || []).some((f) => f.name === 'variants.colorMeta');
          if (colorVariantField && !hasColorImages) {
            merged = [
              ...merged,
              {
                name: 'variants.colorMeta',
                uiType: 'ColorInline' as any,
                label: 'Color Images',
                group: 'variant',
                required: false,
                dataSource: { colorField: colorVariantField.name },
                rule: { accept: ['image/*'], maxItems: 8, maxSize: 5 * 1024 * 1024 },
                visible: true,
              },
            ];
          }
        } catch {}

        setFields(merged);
      } catch (e: any) {
        setError(e?.message || 'Failed to load form schema');
      } finally {
        setLoading(false);
      }
    })();
  }, [catId]);

  // Group by normalized section keys to match the reference layout, with aliases
  const normalize = (s?: string) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const groupAliases: Record<string, string> = {
    // Images
    base: 'base', productimages: 'base', images: 'base', mainimage: 'base', media: 'base',
    // Attributes/specs
    details: 'details', productspecification: 'details', specification: 'details', attributes: 'details',
    // Variants
    variant: 'variant', variants: 'variant', variant1: 'variant', variant2: 'variant', sku: 'variant', color: 'variant', size: 'variant',
    // Price & Stock
    sale: 'sale', pricestock: 'sale', priceandstock: 'sale', pricing: 'sale', stock: 'sale',
    // Shipping & Warranty
    package: 'package', shippingandwarranty: 'package', shipping: 'package', warranty: 'package',
    // Terms
    termcondition: 'termcondition', termsandconditions: 'termcondition', terms: 'termcondition',
  };
  const groups: Record<string, FieldSpec[]> = {};
  for (const f of fields) {
    const gRaw = f.group || 'basic';
    const gNorm = normalize(gRaw);
    const mapped = groupAliases[gNorm] ?? gRaw; // fall back to original if unknown
    groups[mapped] = groups[mapped] || [];
    groups[mapped].push(f);
  }

  // Map to explicit tiles as in the reference
  const order: Array<{ key: string; title: string; desc?: string; icon?: any }> = [
    { key: 'base', title: 'Product Images', icon: <ImageIcon className="h-5 w-5 text-primary" /> },
    { key: 'details', title: 'Product Attributes', icon: <Palette className="h-5 w-5 text-primary" /> },
    { key: 'variant', title: 'Variants', icon: <Palette className="h-5 w-5 text-primary" /> },
    { key: 'sale', title: 'Price, Stock & Variants', icon: <Palette className="h-5 w-5 text-primary" /> },
    { key: 'package', title: 'Shipping & Warranty', icon: <Ruler className="h-5 w-5 text-primary" /> },
    { key: 'termcondition', title: 'Terms & Conditions' },
  ];
  const nameToGroup = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const [gk, arr] of Object.entries(groups)) {
      for (const f of arr) map[f.name] = gk;
    }
    return map;
  }, [fields]);

  React.useEffect(() => {
    const sub = form.watch((vals, meta) => {
      const name = meta?.name as string | undefined;
      if (!name) return;
      const sectionKey = nameToGroup[name] ?? '';
      const valueAt = (vals as any)?.[name];
      onValuesChange?.({ [name]: valueAt }, sectionKey);
    });
    return () => sub.unsubscribe();
  }, [form, nameToGroup, onValuesChange]);

  if (!catId) return <div className="text-sm text-gray-500">Select a category to continue.</div>;
  if (loading) return <div>Loading…</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!fields.length) return <div>No fields.</div>;

  return (
    <FormProvider {...form}>
      <div className="space-y-6">
        {order.map(({ key, title, icon }) => (
          <CollapsibleFormSection
            key={key}
            title={title}
            description=""
            icon={icon}
            isValid={true}
            isRequired={false}
            defaultOpen={true}
          >
            {key === 'details' ? (
              <Collapsible defaultOpen>
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Fill more product specification to improve searchability</div>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">Show More</Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                  <div className="space-y-4">
                    {(groups[key] || []).map((f) => {
                      // Normalize uiType to be tolerant of casing and dashes
                      const ui = String(f.uiType || '');
                      const norm = ui.toLowerCase().replace(/[^a-z0-9]+/g, '');
                      const map: Record<string, keyof typeof uiTypeRegistry> = {
                        input: 'input',
                        number: 'number',
                        switch: 'Switch',
                        select: 'select',
                        multiselect: 'multiselect',
                        skutablev2: 'SkuTableV2',
                        mainimage: 'MainImage',
                        colormeta: 'ColorMeta',
                        colorinline: 'ColorInline',
                      };
                      const Comp = uiTypeRegistry[(map[norm] ?? (f.uiType as keyof typeof uiTypeRegistry))];
                      if (!Comp || f.visible === false) return null;
                      return (
                        <div key={f.name} data-group={f.group}>
                          <Comp field={f} control={form.control} />
                        </div>
                      );
                    })}
                    {!groups[key]?.length ? (
                      <div className="text-xs text-muted-foreground">No additional attributes in this section.</div>
                    ) : null}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <div className="space-y-4">
                {(groups[key] || []).map((f) => {
                  const ui = String(f.uiType || '');
                  const norm = ui.toLowerCase().replace(/[^a-z0-9]+/g, '');
                  const map: Record<string, keyof typeof uiTypeRegistry> = {
                    input: 'input',
                    number: 'number',
                    switch: 'Switch',
                    select: 'select',
                    multiselect: 'multiselect',
                    skutablev2: 'SkuTableV2',
                    mainimage: 'MainImage',
                    colormeta: 'ColorMeta',
                    colorinline: 'ColorInline',
                  };
                  const Comp = uiTypeRegistry[(map[norm] ?? (f.uiType as keyof typeof uiTypeRegistry))];
                  if (!Comp || f.visible === false) return null;
                  return (
                    <div key={f.name} data-group={f.group}>
                      <Comp field={f} control={form.control} />
                    </div>
                  );
                })}
                {!groups[key]?.length ? (
                  <div className="text-sm text-muted-foreground">No fields available for this section.</div>
                ) : null}
              </div>
            )}
          </CollapsibleFormSection>
        ))}
      </div>
    </FormProvider>
  );
}
