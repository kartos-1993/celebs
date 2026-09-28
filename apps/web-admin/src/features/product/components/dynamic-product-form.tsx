import React, { forwardRef, useImperativeHandle } from 'react';
import { type Control, type FieldValues, useFormContext, useWatch } from 'react-hook-form';
import { FileText, ImageIcon, Package, Palette, Ruler } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@celebs/shared-ui/components/collapsible';

import { uiTypeRegistry } from '../fields/ui-registry';
import type { FieldSpec } from '../types';

import {
  buildNameToGroup,
  collectServerDefaults,
  getValueAtPath,
  groupFieldsByGroup,
  resolveFieldName,
  type ServerDefaultEntry,
  sortVariantFields,
} from './dynamic-form-helpers';
import { excludeOwnerOwnedFields } from './dynamic-form-parcel-guard';

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

/** Applies one server default and reports it to the parent. */
function applyServerDefault(
  form: ReturnType<typeof useFormContext>,
  entry: ServerDefaultEntry,
  onValuesChange: DynamicProductFormProps['onValuesChange'],
): void {
  form.setValue(entry.name, entry.value, { shouldDirty: false, shouldValidate: false });
  onValuesChange?.({ [entry.name]: entry.value }, entry.group);
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

    // Apply server-provided default values once per category without
    // destructive form.reset(), then re-validate EXACTLY those names so an
    // invalid default (e.g. a price the schema forbids) surfaces at once
    // instead of waiting for the next keystroke.
    React.useEffect(() => {
      if (!catId || appliedDefaultsRef.current === catId) return;
      const defaults = collectServerDefaults(fields, form.getValues() || {});
      for (const entry of defaults) {
        applyServerDefault(form, entry, onValuesChange);
      }
      if (defaults.length > 0) {
        void form.trigger(defaults.map((entry) => entry.name));
      }
      appliedDefaultsRef.current = catId;
    }, [catId, fields, form, onValuesChange]);

    const grouped = React.useMemo(() => groupFieldsByGroup(fields), [fields]);

    // ── Auto-expand specifications when an error lands in collapsed fields ──
    const detailsFields = React.useMemo(() => grouped.details || [], [grouped.details]);
    const restDetailsFields = React.useMemo(() => detailsFields.slice(6), [detailsFields]);

    React.useEffect(() => {
      if (restDetailsFields.length === 0 || detailsExpanded) return;
      const hasErrorInCollapsed = restDetailsFields.some((field) =>
        Boolean(form.formState.errors[field.name]),
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
    const nameToGroup = React.useMemo(() => buildNameToGroup(fields), [fields]);

    React.useEffect(() => {
      if (!form) return;
      const subscription = form.watch((values, { name: changedName }) => {
        if (!changedName) return;
        const fieldName = resolveFieldName(changedName, nameToGroup);
        const sectionKey = nameToGroup[fieldName];
        if (!sectionKey) return;
        onValuesChange?.(
          { [changedName]: getValueAtPath(values as Record<string, unknown>, changedName) },
          sectionKey,
        );
      });
      return () => subscription.unsubscribe();
    }, [form, nameToGroup, onValuesChange]);

    // ── Guards ─────────────────────────────────────────────────────────────
    if (!catId) {
      return (
        <div className="rounded-3xl border border-dashed border-border bg-card/80 px-6 py-8 text-sm text-muted-foreground">
          Select a category to continue.
        </div>
      );
    }
    if (isSchemaLoading) {
      return (
        <div className="rounded-3xl border border-border bg-card/80 p-6 text-sm text-muted-foreground shadow-xs">
          Loading category specifications...
        </div>
      );
    }
    if (schemaError) {
      return (
        <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
          Failed to load category specifications. {schemaError.message}
        </div>
      );
    }

    const renderFieldNodes = (list: FieldSpec[]) =>
      list.map((field) => {
        const Comp = uiTypeRegistry[field.uiType];
        if (!Comp) return null;
        const wide =
          field.uiType === 'ColorMeta' ||
          field.uiType === 'ColorInline' ||
          field.uiType === 'SizeMeasurementsTable';
        return (
          <div key={field.name} className={wide ? 'col-span-full' : undefined}>
            <Comp field={field} control={form.control} />
          </div>
        );
      });

    // Consistent order across categories: color → size → other variants
    const variantFields = sortVariantFields(grouped.variant || []);

    const otherMediaFields = [...(grouped.base || []), ...(grouped.media || [])];
    const imageFields = otherMediaFields.filter((field) => field.uiType === 'MainImage');
    const swatchMediaFields = otherMediaFields.filter((field) => field.uiType !== 'MainImage');
    const saleFields = grouped.sale || [];
    // Parcel paths are owned by `ShippingDimensionsCard`; an attribute reusing
    // one of those names is dropped here, never rendered as a second input.
    const packageFields = excludeOwnerOwnedFields(grouped.package || []);
    const termFields = grouped.termcondition || [];

    const hasAnyFields = fields.length > 0;

    if (!hasAnyFields) {
      return (
        <div className="rounded-3xl border border-dashed border-border bg-card/80 px-6 py-8 text-sm text-muted-foreground">
          This category has no additional fields configured.
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {/* Section: Media & Swatches */}
        {variantFields.length > 0 || imageFields.length > 0 || swatchMediaFields.length > 0 ? (
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
                  Cover image, variants, and per-color swatches
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Main product image always comes first */}
              {imageFields.length > 0 ? <div>{renderFieldNodes(imageFields)}</div> : null}

              {/* Variants — color/size selectors stacked in one column */}
              {variantFields.length > 0 ? (
                <VariantSelectorCard fields={variantFields} control={form.control} />
              ) : null}

              {/* Color swatches & remaining media fields */}
              {swatchMediaFields.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {renderFieldNodes(swatchMediaFields)}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

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

        {/* Section: Shipping & Warranty attributes. NO section anchor here:
            `ShippingWarrantySection` owns `PRODUCT_SECTION_ANCHORS.shipping`
            and renders unconditionally beside this block, which only exists for
            a category declaring `package`-group attributes. Two elements with
            one id meant the sidebar jump resolved to whichever came first and
            the other card was unreachable. Plain content under the owner. */}
        {packageFields.length > 0 && (
          <div className="space-y-6 rounded-3xl border border-border bg-card p-6 shadow-xs">
            <div className="mb-5 flex items-center gap-2 border-b border-border pb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Package className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Shipping & Warranty</h3>
                <p className="text-xs text-muted-foreground">
                  Parcel Dimensions, weight, and guarantee options
                </p>
              </div>
            </div>
            {renderFieldNodes(packageFields)}
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
                <h3 className="text-base font-semibold text-foreground">Terms & Conditions</h3>
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

/**
 * Dedicated block for variant definition selects (Color, Size, ...).
 * Stacked in a single narrow column so the pickers read top-to-bottom
 * in a fixed order (color → size → others) and visually drive the
 * swatch rows + SKU matrix rendered after them.
 */
function VariantSelectorCard({
  fields,
  control,
}: {
  fields: FieldSpec[];
  control: Control<FieldValues>;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Variants
      </p>
      <div className="mt-3 grid grid-cols-1 gap-y-4 lg:max-w-xl">
        {fields.map((field) => {
          const Comp = uiTypeRegistry[field.uiType];
          if (!Comp) return null;
          return <VariantFieldSlot key={field.name} field={field} control={control} />;
        })}
      </div>
    </div>
  );
}

function VariantFieldSlot({ field, control }: { field: FieldSpec; control: Control<FieldValues> }) {
  const value = useWatch({ name: field.name, control });
  const count = Array.isArray(value)
    ? value.length
    : value !== undefined && value !== null && value !== ''
      ? 1
      : 0;
  const Comp = uiTypeRegistry[field.uiType];
  if (!Comp) return null;
  return (
    <div className="relative">
      <Comp field={field} control={control} />
      {count > 0 ? (
        <span className="absolute right-0 top-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium tabular-nums text-primary">
          {count} selected
        </span>
      ) : null}
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
