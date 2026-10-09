import { forwardRef } from 'react';
import { FileText, ImageIcon, Package, Palette, Ruler } from 'lucide-react';

import type { FieldSpec } from '../types';

import { DetailsSection } from './details-section';
import { sortVariantFields } from './dynamic-form-helpers';
import { excludeOwnerOwnedFields } from './dynamic-form-parcel-guard';
import { renderFieldNodes } from './render-field-nodes';
import { SectionHeader } from './section-header';
import { type DynamicProductFormHandle, useDynamicProductForm } from './use-dynamic-product-form';
import { VariantSelectorCard } from './variant-selector-card';

export type { DynamicProductFormHandle };

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
    const { form, fields, grouped, detailsFields, detailsExpanded, setDetailsExpanded } =
      useDynamicProductForm({ catId, schemaFields, onValuesChange, ref });

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
    if (fields.length === 0) {
      return (
        <div className="rounded-3xl border border-dashed border-border bg-card/80 px-6 py-8 text-sm text-muted-foreground">
          This category has no additional fields configured.
        </div>
      );
    }

    const variantFields = sortVariantFields(grouped.variant || []);
    const otherMediaFields = [...(grouped.base || []), ...(grouped.media || [])];
    const imageFields = otherMediaFields.filter((f) => f.uiType === 'MainImage');
    const swatchMediaFields = otherMediaFields.filter((f) => f.uiType !== 'MainImage');
    const saleFields = grouped.sale || [];
    const packageFields = excludeOwnerOwnedFields(grouped.package || []);
    const termFields = grouped.termcondition || [];

    return (
      <div className="space-y-8">
        {(variantFields.length > 0 || imageFields.length > 0 || swatchMediaFields.length > 0) && (
          <div
            id="product-section-base"
            className="scroll-mt-24 rounded-3xl border border-border bg-card p-6 shadow-xs"
          >
            <SectionHeader
              icon={ImageIcon}
              title="Product Images & Swatches"
              description="Cover image, variants, and per-color swatches"
            />
            <div className="space-y-6">
              {imageFields.length > 0 && <div>{renderFieldNodes(imageFields, form.control)}</div>}
              {variantFields.length > 0 && (
                <VariantSelectorCard fields={variantFields} control={form.control} />
              )}
              {swatchMediaFields.length > 0 && (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {renderFieldNodes(swatchMediaFields, form.control)}
                </div>
              )}
            </div>
          </div>
        )}

        {detailsFields.length > 0 && (
          <div
            id="product-section-details"
            className="scroll-mt-24 rounded-3xl border border-border bg-card p-6 shadow-xs"
          >
            <SectionHeader
              icon={Ruler}
              title="Specifications & Attributes"
              description="Key product features, measurements, and category details"
            />
            <DetailsSection
              fields={detailsFields}
              control={form.control}
              isOpen={detailsExpanded}
              onOpenChange={setDetailsExpanded}
            />
          </div>
        )}

        {saleFields.length > 0 && (
          <div
            id="product-section-sale"
            className="scroll-mt-24 rounded-3xl border border-border bg-card p-6 shadow-xs"
          >
            <div id="product-section-variant" className="scroll-mt-24" />
            <SectionHeader
              icon={Palette}
              title="Price, Stock & Variant Matrix"
              description="Manage retail prices, special pricing, and inventory matrix"
            />
            <div className="space-y-6">{renderFieldNodes(saleFields, form.control)}</div>
          </div>
        )}

        {packageFields.length > 0 && (
          <div className="space-y-6 rounded-3xl border border-border bg-card p-6 shadow-xs">
            <SectionHeader
              icon={Package}
              title="Shipping & Warranty"
              description="Parcel Dimensions, weight, and guarantee options"
            />
            {renderFieldNodes(packageFields, form.control)}
          </div>
        )}

        {termFields.length > 0 && (
          <div
            id="product-section-termcondition"
            className="scroll-mt-24 rounded-3xl border border-border bg-card p-6 shadow-xs"
          >
            <SectionHeader
              icon={FileText}
              title="Terms & Conditions"
              description="Product warranty policies and return disclaimers"
            />
            <div className="space-y-6">{renderFieldNodes(termFields, form.control)}</div>
          </div>
        )}
      </div>
    );
  },
);
