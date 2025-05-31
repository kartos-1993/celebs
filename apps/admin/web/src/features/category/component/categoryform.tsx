import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { X, Plus } from 'lucide-react';

const attributeSchema = z.object({
  name: z.string().min(1, 'Attribute name is required'),
  type: z.enum(['select', 'text', 'number']),
  values: z.array(z.string()).optional(),
  isRequired: z.boolean(),
  displayOrder: z.number(),
  group: z.string().min(1, 'Group is required'),
});

const categorySchema = z.object({
  name: z
    .string()
    .min(1, 'Category name is required')
    .max(100, 'Category name must be less than 100 characters'),
  parent: z.string().nullable().optional(),
  attributes: z.array(attributeSchema),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface Category {
  _id: string;
  name: string;
  level: number;
  parent: string | null;
  path: string[];
}

interface CategoryFormProps {
  initialData?: any;
  isSubcategory?: boolean;
  onSave: (data: any) => void;
  onCancel: () => void;
  categories?: Category[];
}

const CategoryForm = ({
  initialData,
  isSubcategory,
  onSave,
  onCancel,
  categories = [],
}: CategoryFormProps) => {
  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: initialData?.name || '',
      parent: initialData?.parent || null,
      attributes: initialData?.attributes || [],
    },
  });

  const {
    fields: attributeFields,
    append: appendAttribute,
    remove: removeAttribute,
  } = useFieldArray({
    control: form.control,
    name: 'attributes',
  });

  const handleAddAttribute = () => {
    appendAttribute({
      name: '',
      type: 'select',
      values: [],
      isRequired: false,
      displayOrder: attributeFields.length + 1,
      group: 'style',
    });
  };

  const onSubmit = (data: CategoryFormData) => {
    // Generate slug from name
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const level =
      data.parent && data.parent !== 'ROOT_CATEGORY'
        ? (categories.find((c) => c._id === data.parent)?.level || 0) + 1
        : 1;

    // Convert ROOT_CATEGORY back to null
    const parentId = data.parent === 'ROOT_CATEGORY' ? null : data.parent;

    // Calculate the path based on parent
    let path = [slug];
    if (parentId) {
      const parentCategory = categories.find((c) => c._id === parentId);
      if (parentCategory) {
        path = [...parentCategory.path, slug];
      }
    }

    // Calculate display order
    const displayOrder =
      categories.filter((c) => c.parent === parentId).length + 1;

    const payload = {
      _id: initialData?._id || `cat_${Date.now()}`, // Generate ID for new categories
      name: data.name,
      slug,
      level,
      parent: parentId,
      path,
      displayOrder,
      attributes: data.attributes.map((attr, index) => ({
        name: attr.name,
        type: attr.type,
        values: attr.type === 'select' ? attr.values || [] : undefined,
        isRequired: attr.isRequired,
        displayOrder: index + 1,
        group: attr.group,
      })),
    };

    console.log('=== CATEGORY PAYLOAD TO BACKEND ===');
    console.log(JSON.stringify(payload, null, 2));
    console.log('=====================================');

    onSave(payload);
  };

  // Filter categories to show only potential parents (avoid circular references)
  const availableParents = categories.filter(
    (cat) =>
      cat._id !== initialData?._id && !cat.path?.includes(initialData?._id),
  );

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4 py-2 pb-4"
      >
        {/* Add payload preview section */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">Payload Preview</h3>
          <p className="text-sm text-blue-800">
            The complete payload will be logged to console when you save. Check
            browser console (F12) to see the exact data structure sent to
            backend.
          </p>
        </div>

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
              <Select
                onValueChange={field.onChange}
                value={field.value || 'ROOT_CATEGORY'}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent category (leave empty for root category)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="ROOT_CATEGORY">
                    No Parent (Root Category)
                  </SelectItem>
                  {availableParents.map((category) => (
                    <SelectItem key={category._id} value={category._id}>
                      {'  '.repeat(category.level - 1)}
                      {category.name} (Level {category.level})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Attributes</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddAttribute}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Attribute
            </Button>
          </div>

          {attributeFields.map((field, index) => (
            <AttributeFieldSet
              key={field.id}
              index={index}
              form={form}
              onRemove={() => removeAttribute(index)}
            />
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" className="bg-fashion-700 hover:bg-fashion-800">
            Save Category
          </Button>
        </div>
      </form>
    </Form>
  );
};

// Separate component for attribute field set to keep things organized
const AttributeFieldSet = ({
  index,
  form,
  onRemove,
}: {
  index: number;
  form: any;
  onRemove: () => void;
}) => {
  const attributeType = form.watch(`attributes.${index}.type`);
  const {
    fields: valueFields,
    append: appendValue,
    remove: removeValue,
  } = useFieldArray({
    control: form.control,
    name: `attributes.${index}.values`,
  });

  const handleAddValue = () => {
    appendValue('');
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Attribute {index + 1}</h4>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-red-500 hover:text-red-700"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <FormField
          control={form.control}
          name={`attributes.${index}.name`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Attribute Name</FormLabel>
              <FormControl>
                <Input placeholder="Attribute name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`attributes.${index}.type`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="select">Select</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <FormField
          control={form.control}
          name={`attributes.${index}.group`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Group</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="style">Style</SelectItem>
                  <SelectItem value="fit">Fit</SelectItem>
                  <SelectItem value="material">Material</SelectItem>
                  <SelectItem value="features">Features</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`attributes.${index}.isRequired`}
          render={({ field }) => (
            <FormItem className="flex items-center space-x-2 space-y-0 pt-6">
              <FormControl>
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={field.onChange}
                  title="Required"
                  placeholder="Required"
                />
              </FormControl>
              <FormLabel className="text-sm font-normal">Required</FormLabel>
            </FormItem>
          )}
        />
      </div>

      {attributeType === 'select' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Options</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddValue}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {valueFields.map((valueField, valueIndex) => (
              <div key={valueField.id} className="flex gap-2">
                <FormField
                  control={form.control}
                  name={`attributes.${index}.values.${valueIndex}`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input placeholder="Option value" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeValue(valueIndex)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryForm;
