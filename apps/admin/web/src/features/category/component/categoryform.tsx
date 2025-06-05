import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCategoryMutationFn } from '../api';
import { useToast } from '@/hooks/use-toast';

const attributeSchema = z.object({
  name: z.string().min(1, 'Attribute name is required'),
  type: z.enum(['select', 'text', 'number']),
  values: z.array(z.string()).optional(),
  isRequired: z.boolean(),
  displayOrder: z.number(),
});

const categorySchema = z.object({
  name: z
    .string()
    .min(1, 'Category name is required')
    .max(100, 'Category name must be less than 100 characters'),
  parent: z.string().nullable().optional(),
  attributes: z.array(attributeSchema).default([]),
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
  onSave: () => void;
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
  const { toast } = useToast();
  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: initialData?.name || '',
      parent: initialData?.parent || null,
      attributes: initialData?.attributes || [],
    },
  });

  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: createCategoryMutationFn,
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
    });
  };

  const onSubmit = (values: z.infer<typeof categorySchema>) => {
    const normalizedData = {
      ...values,
      // Ensure parent is always string | null, never undefined
      parent:
        values.parent === 'ROOT_CATEGORY' || !values.parent
          ? null
          : values.parent,
      attributes: values.attributes.map((attr) => ({
        ...attr,
        values: attr.type === 'select' ? attr.values : undefined,
      })),
    };

    console.log((values, 'category data:'));

    mutate(normalizedData, {
      onSuccess: async (response) => {
        await queryClient.invalidateQueries({ queryKey: ['getAllCategories'] });
        toast({
          title: 'Success',
          description: `Category ${values.name} has been saved successfully.`,
        });
        onSave();
      },
      onError: (error) => {
        console.error('Failed to save category:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to save category. Please try again.',
        });
      },
    });
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
        {/* Update the payload preview section for dark mode */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Payload Preview
          </h3>
          <p className="text-sm text-blue-800 dark:text-blue-200">
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
          <Button
            type="submit"
            className="bg-fashion-700 hover:bg-fashion-800 dark:bg-fashion-600 dark:hover:bg-fashion-700 dark:text-white"
          >
            Save Category
          </Button>
        </div>
      </form>
    </Form>
  );
};

// Update the AttributeFieldSet component with dark mode support
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
    <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900 dark:text-gray-100">
          Attribute {index + 1}
        </h4>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
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
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
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
            <Label className="text-gray-900 dark:text-gray-100">Options</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddValue}
              className="border-gray-200 dark:border-gray-800"
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
                        <Input
                          placeholder="Option value"
                          {...field}
                          className="bg-white dark:bg-gray-950"
                        />
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
                  className="border-gray-200 dark:border-gray-800"
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
