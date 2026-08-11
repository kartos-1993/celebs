import React from 'react';
import { useFormContext, type Control, type FieldValues } from 'react-hook-form';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@celebs/shared-ui/components/collapsible';
import { Button } from '@celebs/shared-ui/components/button';
import { ImageIcon, Palette, Ruler } from 'lucide-react';
import type { FieldSpec } from '../fields/ui-registry';
import { uiTypeRegistry } from '../fields/ui-registry';
import {
  addFallbackFields,
  normalizeSchema,
  ensureVariantSupportFields,
} from './dynamic-form-utils';

export { addFallbackFields, normalizeSchema, ensureVariantSupportFields };

interface DynamicProductFormProps {
  catId?: string;
  subCatId?: string;
  schemaFields?: FieldSpec[];
  isSchemaLoading?: boolean;
  schemaError?: Error | null;
  productId?: string;
  onValuesChange?: (values: Record<string, unknown>, sectionKey: string) => void;
  onSchemaLoaded?: (fields: FieldSpec[]) => void;
}

const resolveFieldComponent = (field: FieldSpec) => uiTypeRegistry[field.uiType];

export function DynamicProductForm({
  catId,
  subCatId: _subCatId,
  schemaFields = [],
  isSchemaLoading = false,
  schemaError = null,
  onValuesChange,
  onSchemaLoaded,
}: DynamicProductFormProps) {
  const form = useFormContext();
  const [activeTab, setActiveTab] = React.useState<'details' | 'media' | 'sale'>('details');
  const [detailsExpanded, setDetailsExpanded] = React.useState(false);
  const appliedDefaultsRef = React.useRef<string | null>(null);

  const fields = React.useMemo(() => {
    const rawSchema = Array.isArray(schemaFields) ? schemaFields : [];

    if (rawSchema.length > 0) {
      return normalizeSchema(ensureVariantSupportFields(rawSchema));
    }

    const fallback: FieldSpec[] = [
      {
        name: 'name',
        uiType: 'input',
        label: 'Product Title',
        group: 'details',
        required: true,
        visible: true,
      },
      {
        name: 'brand',
        uiType: 'input',
        label: 'Brand',
        group: 'details',
        required: false,
        visible: true,
      },
      {
        name: 'description',
        uiType: 'input',
        label: 'Description',
        group: 'details',
        required: false,
        visible: true,
      },
      {
        name: 'mainImage',
        uiType: 'MainImage',
        label: 'Main Product Image',
        group: 'media',
        required: true,
        rule: { maxItems: 1, accept: ['image/jpeg', 'image/png', 'image/webp'] },
        visible: true,
      },
      {
        name: 'price',
        uiType: 'number',
        label: 'Base Price',
        group: 'sale',
        required: true,
        rule: { min: 0 },
        visible: true,
      },
      {
        name: 'specialPrice',
        uiType: 'number',
        label: 'Special / Sale Price',
        group: 'sale',
        required: false,
        rule: { min: 0 },
        visible: true,
      },
    ];

    return normalizeSchema(ensureVariantSupportFields(fallback));
  }, [schemaFields]);

  React.useEffect(() => {
    onSchemaLoaded?.(fields);
  }, [fields, onSchemaLoaded]);

  React.useEffect(() => {
    if (!catId || appliedDefaultsRef.current === catId) {
      return;
    }

    const defaults: Record<string, unknown> = {};

    schemaFields.forEach((field) => {
      if (field.value !== undefined && field.value !== null) {
        defaults[field.name] = field.value;
      }
    });

    if (Object.keys(defaults).length > 0) {
      form.reset({
        ...form.getValues(),
        ...defaults,
      });

      Object.entries(defaults).forEach(([key, value]) => {
        const sectionKey = schemaFields.find((field) => field.name === key)?.group ?? '';
        onValuesChange?.({ [key]: value }, sectionKey);
      });
    }

    appliedDefaultsRef.current = catId;
  }, [catId, schemaFields, form, onValuesChange]);

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
    fields.forEach((field) => {
      map[field.name] = field.group || 'details';
    });
    return map;
  }, [fields]);

  const getValueAtPath = React.useCallback(
    (obj: Record<string, unknown>, path: string): unknown => {
      if (!obj || !path) {
        return undefined;
      }

      if (path in obj) {
        return obj[path];
      }

      const keys = path.split('.');
      let current: unknown = obj;

      for (const key of keys) {
        if (
          current === null ||
          current === undefined ||
          typeof current !== 'object'
        ) {
          return undefined;
        }

        current = (current as Record<string, unknown>)[key];
      }

      return current;
    },
    [],
  );

  const resolveFieldName = React.useCallback(
    (path: string): string => {
      if (nameToGroup[path]) {
        return path;
      }

      const rootKey = path.split('.')[0];
      if (nameToGroup[rootKey]) {
        return rootKey;
      }

      return path;
    },
    [nameToGroup],
  );

  React.useEffect(() => {
    if (!form) return;
    const subscription = form.watch((values, { name: changedName }) => {
      if (!changedName) {
        return;
      }

      const fieldName = resolveFieldName(changedName);
      const sectionKey = nameToGroup[fieldName];

      if (!sectionKey) {
        return;
      }

      onValuesChange?.({ [changedName]: getValueAtPath(values as Record<string, unknown>, changedName) }, sectionKey);
    });

    return () => subscription.unsubscribe();
  }, [form, getValueAtPath, nameToGroup, onValuesChange, resolveFieldName]);

  if (!catId) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-300 bg-white/80 px-6 py-8 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/80 dark:text-gray-400">
        Select a category to continue.
      </div>
    );
  }

  if (isSchemaLoading) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white/80 p-6 text-sm text-gray-500 shadow-xs dark:border-gray-800 dark:bg-gray-900/80 dark:text-gray-400">
        Loading category specifications...
      </div>
    );
  }

  if (schemaError) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
        Failed to load category specifications. {schemaError.message}
      </div>
    );
  }

  const detailsFields = groups.details || [];
  const variantFields = groups.variant || [];
  const mediaFields = groups.media || [];
  const saleFields = groups.sale || [];

  return (
    <div className="space-y-6">
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        <button
          type="button"
          onClick={() => setActiveTab('details')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'details'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <Ruler className="h-4 w-4" /> Specifications
        </button>

        {variantFields.length > 0 || mediaFields.length > 0 ? (
          <button
            type="button"
            onClick={() => setActiveTab('media')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'media'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <ImageIcon className="h-4 w-4" /> Media & Swatches
          </button>
        ) : null}

        {saleFields.length > 0 ? (
          <button
            type="button"
            onClick={() => setActiveTab('sale')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'sale'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Palette className="h-4 w-4" /> SKUs & Pricing
          </button>
        ) : null}
      </div>

      <div>
        {activeTab === 'details' ? (
          <div className="space-y-6">
            <DetailsSection
              fields={detailsFields}
              control={form.control}
              isOpen={detailsExpanded}
              onOpenChange={setDetailsExpanded}
            />
          </div>
        ) : null}

        {activeTab === 'media' ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {[...variantFields, ...mediaFields].map((field) => {
              const Comp = resolveFieldComponent(field);
              if (!Comp) return null;

              return (
                <div key={field.name} className={field.uiType === 'ColorMeta' ? 'col-span-full' : ''}>
                  <Comp field={field} control={form.control} />
                </div>
              );
            })}
          </div>
        ) : null}

        {activeTab === 'sale' ? (
          <div className="space-y-6">
            {saleFields.map((field) => {
              const Comp = resolveFieldComponent(field);
              if (!Comp) return null;

              return (
                <div key={field.name}>
                  <Comp field={field} control={form.control} />
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
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
  control: Control<FieldValues>;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const first = fields.slice(0, 6);
  const rest = fields.slice(6);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {first.map((field) => {
          const Comp = resolveFieldComponent(field);
          if (!Comp) return null;

          return (
            <div key={field.name}>
              <Comp field={field} control={control} />
            </div>
          );
        })}
      </div>

      {rest.length > 0 ? (
        <Collapsible open={isOpen} onOpenChange={onOpenChange}>
          <CollapsibleContent className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2">
            {rest.map((field) => {
              const Comp = resolveFieldComponent(field);
              if (!Comp) return null;

              return (
                <div key={field.name}>
                  <Comp field={field} control={control} />
                </div>
              );
            })}
          </CollapsibleContent>

          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="mt-2 text-xs text-primary">
              {isOpen ? 'Show Less Specifications' : `Show ${rest.length} More Specifications`}
            </Button>
          </CollapsibleTrigger>
        </Collapsible>
      ) : null}
    </div>
  );
}
