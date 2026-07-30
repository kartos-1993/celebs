import React from 'react';
import { UseFormReturn, UseFieldArrayRemove } from 'react-hook-form';
import { Button } from '@celebs/shared-ui/components/button';
import { Label } from '@celebs/shared-ui/components/label';
import { Plus } from 'lucide-react';
import { AttributeFieldSet } from './attribute-field-set';
import type { CreateCategoryType as CategoryFormData } from '@celebs/shared-types';

export interface CategoryAttributesTabProps {
  form: UseFormReturn<CategoryFormData>;
  attributeFields: Record<'id', string>[];
  handleAddAttribute: () => void;
  removeAttribute: UseFieldArrayRemove;
}

export const CategoryAttributesTab: React.FC<CategoryAttributesTabProps> = ({
  form,
  attributeFields,
  handleAddAttribute,
  removeAttribute,
}) => {
  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-semibold">Category Attributes & Variations</Label>
          <p className="text-xs text-gray-500 mt-0.5">
            Define product attributes (e.g. Fit Type, Fabric) and Variation axes (Color, Size).
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleAddAttribute}>
          <Plus className="h-4 w-4 mr-2" />
          Add Attribute
        </Button>
      </div>

      {attributeFields.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-500">No category attributes added yet.</p>
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={handleAddAttribute}
            className="mt-2 text-fashion-600"
          >
            Click here to add the first attribute
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {attributeFields.map((field, index) => (
            <AttributeFieldSet
              key={field.id}
              index={index}
              form={form}
              onRemove={() => removeAttribute(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoryAttributesTab;
