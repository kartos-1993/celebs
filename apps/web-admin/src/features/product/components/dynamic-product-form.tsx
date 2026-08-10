import React from 'react';
import { useFormContext, type Control } from 'react-hook-form';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@celebs/shared-ui/components/collapsible';
import { Button } from '@celebs/shared-ui/components/button';
import { ProductAPI } from '@/lib/axios-client';
import { ImageIcon, Palette, Ruler } from 'lucide-react';
import { getCategoryById } from '../../category/api';
import type { CategoryAttribute } from '../../category/types';
import type { FieldSpec } from '../fields/ui-registry';
import { uiTypeRegistry } from '../fields/ui-registry';
import { extractVariantsMeta } from '../fields/variant-utils';
import { useProductSchema } from '../hooks/use-product-schema';
import CollapsibleFormSection from './collapsible-form-section';

interface DynamicProductFormProps {
  catId: string;
  productId?: string;
  onValuesChange?: (values: Record<string, unknown>, sectionKey: string) => void;
  onSchemaLoaded?: (fields: FieldSpec[]) => void;
}

const resolveFieldComponent = (field: FieldSpec) => uiTypeRegistry[field.uiType];

export const addFallbackFields = async (catId: string, next: FieldSpec[]) => {
  let merged = Array.isArray(next) ? [...next] : [];

  try {
    const cat = await getCategoryById(catId);
    const attrs: CategoryAttribute[] = Array.isArray(cat?.data?.attributes)
      ? cat.data.attributes
      : [];

    if (attrs.length === 0) {
      return merged;
    }

    const existingNames = new Set(merged.map((field) => String(field.name || '').toLowerCase()));

    const extra: FieldSpec[] = [];
    let colorFieldKey: string | null = null;

    const toField = (attribute: CategoryAttribute): FieldSpec | null => {
      const attrName = String(attribute.name || '').trim();
      if (!attrName) return null;

      const isSelect = attribute.type === 'select' || attribute.type === 'multiselect';

      const uiType =
        attribute.type === 'multiselect'
          ? 'multiselect'
          : attribute.type === 'select'
            ? 'select'
            : attribute.type === 'number'
              ? 'number'
              : attribute.type === 'boolean'
                ? 'Switch'
                : 'input';

      let dataSource: FieldSpec['dataSource'];
      if (isSelect) {
        if (attribute.useStandardOptions && attribute.optionSetId) {
          dataSource = { fetch: `/option-sets/${attribute.optionSetId}` };
        } else if (Array.isArray(attribute.values)) {
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
        dataSource,
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

    if (colorFieldKey && !existingNames.has('variants.colorMeta')) {
      extra.push({
        name: 'variants.colorMeta',
        uiType: 'ColorInline',
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

export const normalizeSchema = (fields: FieldSpec[]) =>
  fields.map((field) => {
    if (field.uiType === 'SizeMeasurementsTable') {
      return { ...field, group: 'sale' };
    }
    return field;
  });

export const ensureVariantSupportFields = (fields: FieldSpec[]) => {
  let merged = [...fields];

  try {
    const { variants } = extractVariantsMeta(merged);
    const variantsMeta = variants.map((variant) => ({
      key: variant.key,
      label: variant.label,
    }));

    const skuIndex = merged.findIndex((field) => String(field.uiType) === 'SkuTableV2');

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
        uiType: 'SkuTableV2',
        label: 'Price & Stock',
        group: 'sale',
        required: false,
        dataSource: { variants: variantsMeta },
        visible: true,
      });
    }

    const colorVariantField = merged.find(
      (field) =>
        field.group === 'variant' &&
        (field.name === 'color' || field.label?.toLowerCase?.().includes('color')),
    );
    const hasColorImages = merged.some((field) => field.name === 'variants.colorMeta');

    if (colorVariantField && !hasColorImages) {
      merged.push({
        name: 'variants.colorMeta',
        uiType: 'ColorInline',
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

function DynamicProductForm({
  catId,
  productId,
  onValuesChange,
  onSchemaLoaded,
}: DynamicProductFormProps) {
  const form = useFormContext();
  const [fields, setFields] = React.useState<FieldSpec[]>([]);
  const {
    data: schemaFields,
    isLoading: loading,
    error: queryError,
  } = useProductSchema(catId, productId);

  const error = queryError ? (queryError as Error).message || 'Failed to load form schema' : null;
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const appliedDefaultsRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!schemaFields) return;
    setFields(schemaFields);
    onSchemaLoaded?.(schemaFields);

    const defaults = Object.fromEntries(
      schemaFields
        .filter((field) => typeof field.value !== 'undefined')
        .map((field) => [field.name, field.value]),
    );

    if (appliedDefaultsRef.current !== catId && Object.keys(defaults).length > 0) {
      Object.entries(defaults).forEach(([key, value]) => {
        const existingVal = form.getValues(key);
        if (existingVal === undefined || existingVal === null || existingVal === '') {
          form.setValue(key, value, {
            shouldDirty: false,
            shouldTouch: false,
            shouldValidate: false,
          });
        }
      });

      Object.entries(defaults).forEach(([key, value]) => {
        const sectionKey = schemaFields.find((field) => field.name === key)?.group ?? '';
        onValuesChange?.({ [key]: value }, sectionKey);
      });
    }

    appliedDefaultsRef.current = catId;
  }, [catId, schemaFields]);

  const groups = React.useMemo(() => {
    const grouped: Record<string, FieldSpec[]> = {};

    fields.forEach((field) => {
      const groupKey = field.group || 'details';
      grouped[groupKey] = grouped[groupKey] || [];
      grouped[groupKey].push(field);
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
      if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
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

      onValuesChange?.({ [changedName]: getValueAtPath(values, changedName) }, sectionKey);
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
  control: Control<any>;
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

export default React.memo(DynamicProductForm);
