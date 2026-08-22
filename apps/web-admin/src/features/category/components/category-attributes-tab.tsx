import React, { KeyboardEvent } from 'react';
import { UseFieldArrayRemove,UseFormReturn } from 'react-hook-form';
import { Plus, Shirt, SlidersHorizontal,UserCheck, X } from 'lucide-react';

import type { CreateCategoryType as CategoryFormData } from '@celebs/shared-types';
import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import { FormLabel } from '@celebs/shared-ui/components/form';
import { Input } from '@celebs/shared-ui/components/input';
import { Label } from '@celebs/shared-ui/components/label';

import { AttributeFieldSet } from './attribute-field-set';

export interface CategoryAttributesTabProps {
  form: UseFormReturn<CategoryFormData>;
  attributeFields: Record<'id', string>[];
  handleAddAttribute: () => void;
  removeAttribute: UseFieldArrayRemove;
  newColumnInput?: string;
  setNewColumnInput?: (val: string) => void;
  newBodyColumnInput?: string;
  setNewBodyColumnInput?: (val: string) => void;
  handleAddSizeColumn?: () => void;
  handleRemoveSizeColumn?: (colToRemove: string) => void;
  handleAddBodyColumn?: () => void;
  handleRemoveBodyColumn?: (colToRemove: string) => void;
}

export const CategoryAttributesTab: React.FC<CategoryAttributesTabProps> = ({
  form,
  attributeFields,
  handleAddAttribute,
  removeAttribute,
  newColumnInput = '',
  setNewColumnInput,
  newBodyColumnInput = '',
  setNewBodyColumnInput,
  handleAddSizeColumn,
  handleRemoveSizeColumn,
  handleAddBodyColumn,
  handleRemoveBodyColumn,
}) => {
  const sizeChartColumns = form.watch('sizeChartColumns') || [];
  const bodyChartColumns = form.watch('bodyChartColumns') || [];

  return (
    <div className="space-y-6 pt-2">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <Label className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" /> Category Attributes & Variations
            ({attributeFields.length})
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Define specifications (e.g. Fit Type, Fabric) and SKU Variation axes (Color, Size).
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddAttribute}
          className="gap-1.5 text-xs"
        >
          <Plus className="h-3.5 w-3.5" /> Add Attribute
        </Button>
      </div>

      {/* Accordion Attributes List */}
      {attributeFields.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-xl border-muted text-muted-foreground space-y-2">
          <p className="text-xs">No category attributes added yet.</p>
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={handleAddAttribute}
            className="text-xs text-primary"
          >
            Click here to add the first attribute
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {attributeFields.map((field, index) => (
            <AttributeFieldSet
              key={field.id}
              index={index}
              form={form}
              onRemove={() => removeAttribute(index)}
              isOpenDefault={index === attributeFields.length - 1 && index === 0}
            />
          ))}
        </div>
      )}

      {/* Measurement Charts & Fit Guides Section */}
      <div className="space-y-4 border-t pt-5">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-foreground">
            Category Measurement Charts & Fit Guides
          </h3>
          <p className="text-xs text-muted-foreground">
            Specify physical garment and wearer body measurement headers for 2D size guide charts.
          </p>
        </div>

        {/* Product Size Chart Columns (Garment Flat) */}
        <div className="space-y-2.5 p-4 rounded-xl border bg-muted/10 space-y-3">
          <div className="flex items-center gap-2">
            <Shirt className="h-4 w-4 text-info" />
            <FormLabel>
              Product Size Chart Columns (Garment Flat Dimensions)
            </FormLabel>
          </div>

          <div className="flex items-center gap-2">
            <Input
              value={newColumnInput}
              onChange={(e) => setNewColumnInput?.(e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSizeColumn?.();
                }
              }}
              placeholder="Add product column (e.g., Shoulder, Bust, Length)"
              className="h-8 text-xs bg-background"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddSizeColumn}
              className="h-8 shrink-0 gap-1 text-xs"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {sizeChartColumns.map((col) => (
              <Badge
                key={col}
                variant="info"
                className="flex items-center gap-1 text-xs px-2.5 py-1"
              >
                {col}
                <button
                  type="button"
                  onClick={() => handleRemoveSizeColumn?.(col)}
                  className="hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {sizeChartColumns.length === 0 && (
              <span className="text-xs text-muted-foreground italic">
                No product garment columns defined.
              </span>
            )}
          </div>
        </div>

        {/* Body Size Chart Columns (Wearer Fit Guide) */}
        <div className="space-y-2.5 p-4 rounded-xl border bg-muted/10 space-y-3">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-info" />
            <FormLabel>
              Body Size Chart Columns (Wearer Recommended Dimensions)
            </FormLabel>
          </div>

          <div className="flex items-center gap-2">
            <Input
              value={newBodyColumnInput}
              onChange={(e) => setNewBodyColumnInput?.(e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddBodyColumn?.();
                }
              }}
              placeholder="Add body column (e.g., Height, Bust, Waist Size)"
              className="h-8 text-xs bg-background"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddBodyColumn}
              className="h-8 shrink-0 gap-1 text-xs"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {bodyChartColumns.map((col) => (
              <Badge
                key={col}
                variant="info"
                className="flex items-center gap-1 text-xs px-2.5 py-1"
              >
                {col}
                <button
                  type="button"
                  onClick={() => handleRemoveBodyColumn?.(col)}
                  className="hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {bodyChartColumns.length === 0 && (
              <span className="text-xs text-muted-foreground italic">
                No wearer body columns defined.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryAttributesTab;
