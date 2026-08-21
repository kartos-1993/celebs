import React, { forwardRef, useCallback, useImperativeHandle } from 'react';
import { useFormContext, type Control, type FieldValues } from 'react-hook-form';
import { Button } from '@celebs/shared-ui/components/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@celebs/shared-ui/components/collapsible';
import { FileText, ImageIcon, Package, Palette, Ruler } from 'lucide-react';
import type { FieldSpec } from '../types';
import { uiTypeRegistry } from '../fields/ui-registry';

export interface DynamicProductFormHandle {
  /** Scrolls the section owning the anchor into view.
   *  Returns false when the anchor is not found in the DOM. */
  scrollToSection: (anchorId: string) => boolean;
}

interface DynamicProductFormProps {
  catId?: string;
  schemaFields: FieldSpec[];
  isSchemaLoading?: boolean;
  schemaError?: Error | null;
  onValuesChange?: (values: Record<string, unknown>, sectionKey: string) => void;
}

export const DynamicProductForm = forwardRef<DynamicProductFormHandle, DynamicProductFormProps>(
  function DynamicProductForm(
    { catId, schemaFields, isSchemaLoading = false, schemaError = null, onValuesChange },
    ref,
  ) {
    const form = useFormContext();
    const [detailsExpanded, setDetailsExpanded] = React.useState(false);
    const appliedDefaultsRef = React.useRef<string | null>(null);

    const fields = React.useMemo(
      () => (Array.isArray(schemaFields) ? schemaFields : []),
      [schemaFields],
    );

    // Apply server-provided default values once per category without destructive form.reset()
    React.useEffect(() => {
      if (!catId || appliedDefaultsRef.current === catId) return;
      const currentVals = (form.getValues() || {}) as Record<string, unknown>;
      const defaults: Record<string, unknown> = {};

      fields.forEach((field) => {
        if (field.value !== undefined && field.value !== null) {
          if (
            currentVals[field.name] === undefined ||
            currentVals[field.name] === null ||
            currentVals[field.name] === ''
          ) {
            defaults[field.name] = field.value;
          }
        }
      });

      if (Object.keys(defaults).length > 0) {
        Object.entries(defaults).forEach(([key, value]) => {
          form.setValue(key, value, { shouldDirty: false, shouldValidate: false });
          const sectionKey = fields.find((field) => field.name === key)?.group ?? '';
          onValuesChange?.({ [key]: value }, sectionKey);
        });
      }
      appliedDefaultsRef.current = catId;
    }, [catId, fields, form, onValuesChange]);

    const grouped = React.useMemo(() => {
      const acc: Record<string, FieldSpec[]> = {};
      fields.forEach((field) => {
        const key = field.group || 'details';
        (acc[key] = acc[key] || []).push(field);
      });
      return acc;
    }, [fields]);

    // ── Auto-expand specifications when an error lands in collapsed fields ──
    const detailsFields = React.useMemo(() => grouped.details || [], [grouped.details]);
    const restDetailsFields = React.useMemo(() => detailsFields.slice(6), [detailsFields]);

    React.useEffect(() => {
      if (restDetailsFields.length === 0 || detailsExpanded) return;
      const hasErrorInCollapsed = restDetailsFields.some(
        (field) => Boolean(form.formState.errors[field.name]),
      );
      if (hasErrorInCollapsed) {
        setDetailsExpanded(true);
      }
    }, [detailsExpanded, form.formState.errors, restDetailsFields]);

    // ── Imperative scroll API ──────────────────────────────────────────────
    useImperativeHandle(
      ref,
      () => ({
        scrollToSection: (anchorId: string) => {
          if (anchorId === 'product-section-details') {
            setDetailsExpanded(true);
          }
          const element = document.getElementById(anchorId);
          if (!element) return false;
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return true;
        },
      }),
      [],
    );

    // ── Change propagation (name/brand sync consumed by the parent) ───────
    const nameToGroup = React.useMemo(() => {
      const map: Record<string, string> = {};
      fields.forEach((field) => {
        map[field.name] = field.group || 'details';
      });
      return map;
    }, [fields]);

    const getValueAtPath = useCallback((obj: Record<string, unknown>, path: string): unknown => {
      if (!obj || !path) return undefined;
      if (path in obj) return obj[path];
      const keys = path.split('.');
      let current: unknown = obj;
      for (const key of keys) {
        if (current === null || current === undefined || typeof current !== 'object') {
          return undefined;
        }
        current = (current as Record<string, unknown>)[key];
      }
      return current;
    }, []);

    const resolveFieldName = useCallback(
      (path: string): string => {
        if (nameToGroup[path]) return path;
        const rootKey = path.split('.')[0];
        if (nameToGroup[rootKey]) return rootKey;
        return path;
      },
      [nameToGroup],
    );

    React.useEffect(() => {
      if (!form) return;
      const subscription = form.watch((values, { name: changedName }) => {
        if (!changedName) return;
        const fieldName = resolveFieldName(changedName);
        const sectionKey = nameToGroup[fieldName];
        if (!sectionKey) return;
        onValuesChange?.(
          { [changedName]: getValueAtPath(values as Record<string, unknown>, changedName) },
          sectionKey,
        );
      });
      return () => subscription.unsubscribe();
    }, [form, getValueAtPath, nameToGroup, onValuesChange, resolveFieldName]);

    // ── Guards ─────────────────────────────────────────────────────────────
    if (!catId) {
      return (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-card/80 px-6 py-8 text-sm text-muted-foreground border-border">
          Select a category to continue.
        </div>
      );
    }
    if (isSchemaLoading) {
      return (
        <div className="rounded-3xl border border-gray-200 bg-card/80 p-6 text-sm text-muted-foreground shadow-xs border-border">
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

    const renderFieldNodes = (list: FieldSpec[]) =>
      list.map((field) => {
        const Comp = uiTypeRegistry[field.uiType];
        if (!Comp) return null;
        const wide = field.uiType === 'ColorMeta' || field.uiType === 'SizeMeasurementsTable';
        return (
          <div key={field.name} className={wide ? 'col-span-full' : undefined}>
            <Comp field={field} control={form.control} />
          </div>
        );
      });

    const mediaFields = [
      ...(grouped.base || []),
      ...(grouped.variant || []),
      ...(grouped.media || []),
    ];
    const saleFields = grouped.sale || [];
    const packageFields = grouped.package || [];
    const termFields = grouped.termcondition || [];

    const hasAnyFields = fields.length > 0;

    if (!hasAnyFields) {
      return (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-card/80 px-6 py-8 text-sm text-muted-foreground border-border">
          This category has no additional fields configured.
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {/* Section: Media & Swatches */}
        {mediaFields.length > 0 && (
          <div
            id="product-section-base"
            className="scroll-mt-24 rounded-3xl border border-border bg-card p-6 shadow-xs"
          >
            <div className="mb-5 flex items-center gap-2 border-b border-border pb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ImageIcon className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Product Images & Swatches
                </h3>
                <p className="text-xs text-muted-foreground">
                  Upload cover images, color variants, and gallery photos
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {renderFieldNodes(mediaFields)}
            </div>
          </div>
        )}

        {/* Section: Specifications */}
        {detailsFields.length > 0 && (
          <div
            id="product-section-details"
            className="scroll-mt-24 rounded-3xl border border-border bg-card p-6 shadow-xs"
          >
            <div className="mb-5 flex items-center gap-2 border-b border-border pb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Ruler className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Specifications & Attributes
                </h3>
                <p className="text-xs text-muted-foreground">
                  Key product features, measurements, and category details
                </p>
              </div>
            </div>
            <DetailsSection
              fields={detailsFields}
              control={form.control}
              isOpen={detailsExpanded}
              onOpenChange={setDetailsExpanded}
            />
          </div>
        )}

        {/* Section: Pricing, Stock & Variant Matrix */}
        {saleFields.length > 0 && (
          <div
            id="product-section-sale"
            className="scroll-mt-24 rounded-3xl border border-border bg-card p-6 shadow-xs"
          >
            <div id="product-section-variant" className="scroll-mt-24" />
            <div className="mb-5 flex items-center gap-2 border-b border-border pb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Palette className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Price, Stock & Variant Matrix
                </h3>
                <p className="text-xs text-muted-foreground">
                  Manage retail prices, special pricing, and inventory matrix
                </p>
              </div>
            </div>
            <div className="space-y-6">{renderFieldNodes(saleFields)}</div>
          </div>
        )}

        {/* Section: Shipping & Warranty */}
        {packageFields.length > 0 && (
          <div
            id="product-section-package"
            className="scroll-mt-24 rounded-3xl border border-border bg-card p-6 shadow-xs"
          >
            <div className="mb-5 flex items-center gap-2 border-b border-border pb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Package className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Shipping & Warranty
                </h3>
                <p className="text-xs text-muted-foreground">
                  Parcel dimensions, weight, and guarantee options
                </p>
              </div>
            </div>
            <div className="space-y-6">{renderFieldNodes(packageFields)}</div>
          </div>
        )}

        {/* Section: Terms & Conditions */}
        {termFields.length > 0 && (
          <div
            id="product-section-termcondition"
            className="scroll-mt-24 rounded-3xl border border-border bg-card p-6 shadow-xs"
          >
            <div className="mb-5 flex items-center gap-2 border-b border-border pb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Terms & Conditions
                </h3>
                <p className="text-xs text-muted-foreground">
                  Product warranty policies and return disclaimers
                </p>
              </div>
            </div>
            <div className="space-y-6">{renderFieldNodes(termFields)}</div>
          </div>
        )}
      </div>
    );
  },
);

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
          const Comp = uiTypeRegistry[field.uiType];
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
              const Comp = uiTypeRegistry[field.uiType];
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
