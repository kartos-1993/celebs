import React from 'react';
import { useFormContext } from 'react-hook-form';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ProductAPI } from '@/lib/axios-client';
import { ImageIcon, Palette, Ruler } from 'lucide-react';
import { CategoryApiService } from '../../category/api';
import type { FieldSpec } from '../renderer/UiRegistry';
import { uiTypeRegistry } from '../renderer/UiRegistry';
import { extractVariantsMeta } from '../renderer/variant-utils';
import CollapsibleFormSection from './collapsible-form-section';

interface DynamicProductFormProps {
  catId: string;
  productId?: string;
  onValuesChange?: (
    values: Record<string, unknown>,
    sectionKey: string,
  ) => void;
  onSchemaLoaded?: (fields: FieldSpec[]) => void;
}

const normalizeGroup = (value?: string) =>
  (value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

const normalizeUiType = (value?: string) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const uiAliases: Record<string, keyof typeof uiTypeRegistry> = {
  input: 'input',
  text: 'input',
  number: 'number',
  switch: 'Switch',
  select: 'select',
  multiselect: 'multiselect',
  skutablev2: 'SkuTableV2',
  mainimage: 'MainImage',
  colormeta: 'ColorMeta',
  colorinline: 'ColorInline',
};

const groupAliases: Record<string, string> = {
  base: 'base',
  productimages: 'base',
  images: 'base',
  mainimage: 'base',
  media: 'base',
  details: 'details',
  productspecification: 'details',
  specification: 'details',
  attributes: 'details',
  basic: 'details',
  basicinfo: 'details',
  general: 'details',
  info: 'details',
  title: 'details',
  productname: 'details',
  brand: 'details',
  variant: 'variant',
  variants: 'variant',
  variant1: 'variant',
  variant2: 'variant',
  sku: 'variant',
  color: 'variant',
  size: 'variant',
  sale: 'sale',
  pricestock: 'sale',
  priceandstock: 'sale',
  pricing: 'sale',
  stock: 'sale',
  package: 'package',
  shippingandwarranty: 'package',
  shipping: 'package',
  warranty: 'package',
  termcondition: 'termcondition',
  termsandconditions: 'termcondition',
  terms: 'termcondition',
};

const resolveFieldComponent = (field: FieldSpec) =>
  uiTypeRegistry[
    uiAliases[normalizeUiType(field.uiType)] ??
      (field.uiType as keyof typeof uiTypeRegistry)
  ];

const addFallbackFields = async (catId: string, next: FieldSpec[]) => {
  let merged = Array.isArray(next) ? [...next] : [];

  try {
    const cat = await CategoryApiService.getCategoryById(catId);
    const attrs: any[] = (cat as any)?.data?.attributes ?? [];

    if (!Array.isArray(attrs) || attrs.length === 0) {
      return merged;
    }

    const existingNames = new Set(merged.map((field) => field.name));
    const haveDetails = merged.some((field) =>
      normalizeGroup(field.group).includes('detail'),
    );
    const haveVariant = merged.some((field) =>
      normalizeGroup(field.group).includes('variant'),
    );

    const extra: FieldSpec[] = [];
    let colorFieldKey: string | null = null;

    const toField = (attribute: any): FieldSpec | null => {
      const key = String(attribute.name || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '');

      if (!key) {
        return null;
      }

      const isSelect =
        attribute.type === 'select' || attribute.type === 'multiselect';
      const variantType = String(
        attribute.variantType || attribute.variantAxis || '',
      ).toLowerCase();
      const isColorVariant =
        attribute.isVariant &&
        (variantType === 'color' ||
          key === 'color' ||
          String(attribute.name || '')
            .toLowerCase()
            .includes('color'));
      const isSizeVariant =
        attribute.isVariant &&
        (variantType === 'size' ||
          key === 'size' ||
          String(attribute.name || '')
            .toLowerCase()
            .includes('size'));

      const uiType = isColorVariant
        ? 'VariantList'
        : isSizeVariant
          ? 'multiSelect'
          : attribute.type === 'multiselect'
            ? 'multiSelect'
            : attribute.type === 'select'
              ? 'select'
              : attribute.type === 'number'
                ? 'number'
                : attribute.type === 'boolean'
                  ? 'Switch'
                  : 'input';

      let dataSource: any;
      if (isSelect) {
        if (attribute.useStandardOptions && attribute.optionSetId) {
          dataSource = { fetch: `/option-sets/${attribute.optionSetId}` };
        } else if (Array.isArray(attribute.values)) {
          dataSource = attribute.values.map((value: any) =>
            typeof value === 'string'
              ? { label: value, value }
              : {
                  label:
                    value.label ?? value.name ?? String(value.value ?? value),
                  value: value.value ?? value.label ?? value.name,
                },
          );
        } else {
          dataSource = [];
        }
      }

      return {
        name: key,
        uiType: uiType as any,
        label: String(attribute.name || key),
        group: attribute.isVariant ? 'variant' : 'details',
        required: !!attribute.isRequired,
        dataSource,
        visible: true,
      };
    };

    for (const attribute of attrs) {
      const field = toField(attribute);
      if (!field) continue;
      if (existingNames.has(field.name)) continue;
      if (field.group === 'details' && haveDetails) continue;
      if (field.group === 'variant' && haveVariant) continue;

      extra.push(field);

      const variantType = String(
        attribute.variantType || attribute.variantAxis || '',
      ).toLowerCase();
      if (
        !colorFieldKey &&
        (variantType === 'color' || field.name === 'color')
      ) {
        colorFieldKey = field.name;
      }
    }

    if (colorFieldKey && !existingNames.has('variants.colorMeta')) {
      extra.push({
        name: 'variants.colorMeta',
        uiType: 'ColorInline' as any,
        label: 'Color Images',
        group: 'variant',
        required: false,
        dataSource: { colorField: colorFieldKey },
        rule: {
          accept: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
          maxItems: 8,
          maxSize: 5 * 1024 * 1024,
        },
        visible: true,
      });
    }

    if (extra.length > 0) {
      merged = [...merged, ...extra];
    }
  } catch {
    return merged;
  }

  return merged;
};

const normalizeSchema = (fields: FieldSpec[]) =>
  fields.map((field) => {
    const isVariantGroup = normalizeGroup(field.group).includes('variant');
    const lowerLabel = field.label?.toLowerCase?.() ?? '';
    const isColorName = field.name === 'color' || lowerLabel.includes('color');
    const isSizeName = field.name === 'size' || lowerLabel.includes('size');
    const ui = normalizeUiType(field.uiType);

    if (isVariantGroup && isColorName && ui === 'multiselect') {
      return { ...field, uiType: 'VariantList' as any };
    }

    if (isVariantGroup && isSizeName && ui === 'select') {
      return { ...field, uiType: 'multiSelect' as any };
    }

    return field;
  });

const ensureVariantSupportFields = (fields: FieldSpec[]) => {
  let merged = [...fields];

  try {
    const { variants } = extractVariantsMeta(merged);
    const variantsMeta = variants.map((variant) => ({
      key: variant.key,
      label: variant.label,
    }));

    const skuIndex = merged.findIndex(
      (field) => String(field.uiType) === 'SkuTableV2',
    );

    if (variantsMeta.length > 0) {
      if (skuIndex >= 0) {
        const existing = merged[skuIndex];
        const dataSource = existing.dataSource ?? {};

        if (!dataSource.fetch && !Array.isArray(dataSource)) {
          merged[skuIndex] = {
            ...existing,
            dataSource: { ...dataSource, variants: variantsMeta },
          };
        }
      } else {
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
    }

    const colorVariantField = merged.find(
      (field) =>
        normalizeGroup(field.group).includes('variant') &&
        (field.name === 'color' ||
          field.label?.toLowerCase?.().includes('color')),
    );
    const hasColorImages = merged.some(
      (field) => field.name === 'variants.colorMeta',
    );

    if (colorVariantField && !hasColorImages) {
      merged.push({
        name: 'variants.colorMeta',
        uiType: 'ColorInline' as any,
        label: 'Color Images',
        group: 'variant',
        required: false,
        dataSource: { colorField: colorVariantField.name },
        rule: {
          accept: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
          maxItems: 8,
          maxSize: 5 * 1024 * 1024,
        },
        visible: true,
      });
    }
  } catch {
    return merged;
  }

  return merged;
};

const sectionOrder: Array<{
  key: string;
  title: string;
  icon?: React.ReactNode;
}> = [
  {
    key: 'base',
    title: 'Product Images',
    icon: <ImageIcon className="h-5 w-5 text-primary" />,
  },
  {
    key: 'details',
    title: 'Product Attributes',
    icon: <Palette className="h-5 w-5 text-primary" />,
  },
  {
    key: 'variant',
    title: 'Variants',
    icon: <Palette className="h-5 w-5 text-primary" />,
  },
  {
    key: 'sale',
    title: 'Price, Stock & Variants',
    icon: <Palette className="h-5 w-5 text-primary" />,
  },
  {
    key: 'package',
    title: 'Shipping & Warranty',
    icon: <Ruler className="h-5 w-5 text-primary" />,
  },
  {
    key: 'termcondition',
    title: 'Terms & Conditions',
  },
];

export default function DynamicProductForm({
  catId,
  productId,
  onValuesChange,
  onSchemaLoaded,
}: DynamicProductFormProps) {
  const form = useFormContext();
  const [fields, setFields] = React.useState<FieldSpec[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const appliedDefaultsRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const loadSchema = async () => {
      if (!catId) {
        setFields([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await ProductAPI.get('/product-render', {
          params: { catId, locale: 'en_US', productId },
        });

        const serverFields: FieldSpec[] =
          response.data?.data?.data ?? response.data?.data ?? [];

        let merged = await addFallbackFields(catId, serverFields);
        merged = normalizeSchema(merged);
        merged = ensureVariantSupportFields(merged);

        if (cancelled) return;

        setFields(merged);
        onSchemaLoaded?.(merged);

        const defaults = Object.fromEntries(
          merged
            .filter((field) => typeof field.value !== 'undefined')
            .map((field) => [field.name, field.value]),
        );

        if (
          appliedDefaultsRef.current !== catId &&
          Object.keys(defaults).length > 0
        ) {
          Object.entries(defaults).forEach(([key, value]) => {
            form.setValue(key, value, {
              shouldDirty: false,
              shouldTouch: false,
              shouldValidate: false,
            });
          });

          Object.entries(defaults).forEach(([key, value]) => {
            const sectionKey =
              merged.find((field) => field.name === key)?.group ?? '';
            onValuesChange?.({ [key]: value }, sectionKey);
          });
        }

        appliedDefaultsRef.current = catId;
      } catch (loadError: any) {
        if (!cancelled) {
          setError(loadError?.message || 'Failed to load form schema');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadSchema();

    return () => {
      cancelled = true;
    };
  }, [catId, productId]);

  const groups = React.useMemo(() => {
    const grouped: Record<string, FieldSpec[]> = {};

    fields.forEach((field) => {
      const mappedKey =
        groupAliases[normalizeGroup(field.group)] ?? field.group;
      grouped[mappedKey] = grouped[mappedKey] || [];
      grouped[mappedKey].push(field);
    });

    return grouped;
  }, [fields]);

  const nameToGroup = React.useMemo(() => {
    const map: Record<string, string> = {};

    Object.entries(groups).forEach(([groupKey, groupFields]) => {
      groupFields.forEach((field) => {
        map[field.name] = groupKey;
      });
    });

    return map;
  }, [groups]);

  const getValueAtPath = React.useCallback((obj: unknown, path: string) => {
    return path.split('.').reduce<unknown>((current, part) => {
      if (
        current &&
        typeof current === 'object' &&
        part in (current as Record<string, unknown>)
      ) {
        return (current as Record<string, unknown>)[part];
      }
      return undefined;
    }, obj);
  }, []);

  const resolveFieldName = React.useCallback(
    (path: string) => {
      const parts = path.split('.');

      for (let index = parts.length; index > 0; index -= 1) {
        const candidate = parts.slice(0, index).join('.');
        if (candidate in nameToGroup) {
          return candidate;
        }
      }

      return path;
    },
    [nameToGroup],
  );

  React.useEffect(() => {
    const subscription = form.watch((values, meta) => {
      const changedName = meta?.name as string | undefined;
      if (!changedName) return;

      const fieldName = resolveFieldName(changedName);
      const sectionKey = nameToGroup[fieldName];

      if (!sectionKey) {
        return;
      }

      onValuesChange?.(
        { [changedName]: getValueAtPath(values, changedName) },
        sectionKey,
      );
    });

    return () => subscription.unsubscribe();
  }, [form.watch, getValueAtPath, nameToGroup, onValuesChange, resolveFieldName]);

  if (!catId) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-300 bg-white/80 px-6 py-8 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/80 dark:text-gray-400">
        Select a category to continue.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white px-6 py-8 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
        Loading category-specific fields...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
        {error}
      </div>
    );
  }

  if (fields.length === 0) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white px-6 py-8 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
        No fields available for this category.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sectionOrder.map(({ key, title, icon }) => {
        const sectionFields = groups[key] || [];

        return (
          <CollapsibleFormSection
            key={key}
            id={`product-section-${key}`}
            title={title}
            icon={icon}
            defaultOpen={true}
          >
            {key === 'details' ? (
              <DetailsSection
                fields={sectionFields}
                control={form.control}
                isOpen={detailsOpen}
                onOpenChange={setDetailsOpen}
              />
            ) : (
              <div className="space-y-4">
                {sectionFields.map((field) => {
                  const Component = resolveFieldComponent(field);
                  if (!Component || field.visible === false) return null;

                  return (
                    <div key={field.name} data-group={field.group}>
                      <Component field={field} control={form.control} />
                    </div>
                  );
                })}

                {sectionFields.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No fields available for this section.
                  </div>
                ) : null}
              </div>
            )}
          </CollapsibleFormSection>
        );
      })}
    </div>
  );
}

function DetailsSection({
  fields,
  control,
  isOpen,
  onOpenChange,
}: {
  fields: FieldSpec[];
  control: any;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const first = fields.slice(0, 6);
  const rest = fields.slice(6);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {first.map((field) => {
          const Component = resolveFieldComponent(field);
          if (!Component || field.visible === false) return null;

          return (
            <div key={field.name} data-group={field.group}>
              <Component field={field} control={control} />
            </div>
          );
        })}
      </div>

      {rest.length > 0 ? (
        <Collapsible open={isOpen} onOpenChange={onOpenChange}>
          <CollapsibleContent>
            <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2">
              {rest.map((field) => {
                const Component = resolveFieldComponent(field);
                if (!Component || field.visible === false) return null;

                return (
                  <div key={field.name} data-group={field.group}>
                    <Component field={field} control={control} />
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
          <div className="mt-2 flex justify-center">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" type="button">
                {isOpen ? 'Show less' : 'Show more'}
              </Button>
            </CollapsibleTrigger>
          </div>
        </Collapsible>
      ) : null}

      {fields.length === 0 ? (
        <div className="text-xs text-muted-foreground">
          No additional attributes in this section.
        </div>
      ) : null}
    </div>
  );
}
