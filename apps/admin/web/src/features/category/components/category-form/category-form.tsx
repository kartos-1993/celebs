import  { memo } from 'react';
import { Plus } from 'lucide-react';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { type CategoryFormProps } from './types';
import { AttributeFieldSet } from './attribute-field-set';
import { ColorVariants } from './color-variants';
import { SizeVariants } from './size-variants';
import { MeasurementUnits } from './measurement-units';
import { useCategoryForm } from './use-category-form';

const CategoryForm = memo<CategoryFormProps>(({
  initialData,
  onSave,
  onCancel,
  categories = [],
}) => {
  const {
    form,
    isSubmitting,
    handleSubmit,
    handleAddAttribute,
    attributeFields,
    removeAttribute,
    availableParents,
  } = useCategoryForm({
    initialData,
    // Convert the onSave prop to return a Promise
    onSave: async (data) => {
      await Promise.resolve(onSave(data));
    },
    categories,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-2 pb-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter category name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="parent"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Parent Category (Optional)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {availableParents.map((category) => (
                    <SelectItem key={category._id} value={category._id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Category Features */}
        <div className="space-y-4 border-t pt-4">
          <Label className="text-lg font-semibold">Category Features</Label>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="hasVariants"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel>Has Variants</FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hasShippingAttributes"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel>Has Shipping Attributes</FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hasCustomFields"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel>Has Custom Fields</FormLabel>
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Variant Configuration Section - Always visible for debugging */}
        <div className="space-y-4 border-t pt-4">
          <Label className="text-lg font-semibold">Variant Configuration</Label>
          
          {/* Color Variants */}
          <div className="space-y-2">
            <ColorVariants control={form.control} />
          </div>

          {/* Size Variants */}
          <div className="space-y-2">
            <SizeVariants control={form.control} />
          </div>

          {/* Measurement Units */}
          <div className="space-y-2">
            <MeasurementUnits control={form.control} />
          </div>
        </div>

        {/* Attributes Section */}
        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center justify-between mb-4">
            <Label className="text-lg font-semibold">Attributes</Label>
          </div>

          {/* Attribute Fields */}
          <div className="space-y-4">
            {attributeFields.map((field, index) => (
              <AttributeFieldSet
                key={field.id}
                index={index}
                form={form}
                onRemove={() => removeAttribute(index)}
              />
            ))}
          </div>

          {/* Add Attribute Button - Moved to bottom */}
          <div className="flex justify-center mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleAddAttribute}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Attribute
            </Button>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Category'}
          </Button>
        </div>
      </form>
    </Form>
  );
});

CategoryForm.displayName = 'CategoryForm';
