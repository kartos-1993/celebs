import { useState } from 'react';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';
import {
  createCategoryMutationFn,
  updateCategoryMutationFn,
  createSubcategoryMutationFn,
  updateSubcategoryMutationFn,
} from '../api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { CategoryType, SubcategoryType, CreateCategoryType } from '../api';

// Main form schema
const formSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'Name is required' })
    .min(2, { message: 'Name must be at least 2 characters' })
    .max(30, { message: 'Name must be less than 30 characters' }),
  parent: z.string().optional().nullable(),
  attributes: z
    .array(
      z.object({
        name: z.string(),
        values: z.array(z.string()),
      }),
    )
    .optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CategoryFormProps {
  initialData?: CategoryType | SubcategoryType | null;
  isSubcategory: boolean;
  parentId?: string | null;
  onSave: (data: CategoryType | SubcategoryType) => void;
  onCancel: () => void;
}

const CategoryForm = ({
  initialData,
  isSubcategory,
  parentId,
  onSave,
  onCancel,
}: CategoryFormProps) => {
  const queryClient = useQueryClient();
  const [newAttribute, setNewAttribute] = useState('');

  // Category mutations
  const createMutation = useMutation<
    { success: boolean; message: string; data: CategoryType },
    Error,
    CreateCategoryType
  >({
    mutationFn: createCategoryMutationFn,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['getAllCategories'] });
      onSave(response.data);
    },
  });

  const updateMutation = useMutation<
    { success: boolean; message: string; data: CategoryType },
    Error,
    { id: string; data: CreateCategoryType }
  >({
    mutationFn: ({ id, data }) => updateCategoryMutationFn(id, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['getAllCategories'] });
      onSave(response.data);
    },
  });

  // Subcategory mutations
  const createSubcategoryMutation = useMutation<
    { success: boolean; message: string; data: SubcategoryType },
    Error,
    CreateCategoryType
  >({
    mutationFn: (data) => {
      if (!parentId)
        throw new Error('Parent ID is required for subcategory creation');
      return createSubcategoryMutationFn(parentId, data);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['getAllCategories'] });
      onSave(response.data);
    },
  });

  const updateSubcategoryMutation = useMutation<
    { success: boolean; message: string; data: SubcategoryType },
    Error,
    { id: string; data: CreateCategoryType }
  >({
    mutationFn: ({ id, data }) => updateSubcategoryMutationFn(id, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['getAllCategories'] });
      onSave(response.data);
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || '',
      parent: parentId || null,
      attributes: isSubcategory
        ? (initialData as SubcategoryType)?.attributes || []
        : [],
    },
  });
  const handleAddAttribute = () => {
    if (newAttribute.trim()) {
      const currentAttributes = form.getValues().attributes || [];
      // Check if attribute already exists
      if (!currentAttributes.some((attr) => attr.name === newAttribute)) {
        form.setValue('attributes', [
          ...currentAttributes,
          { name: newAttribute, values: [] },
        ]);
        setNewAttribute('');
      }
    }
  };
  const handleRemoveAttribute = (attributeName: string) => {
    const currentAttributes = form.getValues().attributes || [];
    form.setValue(
      'attributes',
      currentAttributes.filter((attr) => attr.name !== attributeName),
    );
  };
  const onSubmit = (values: FormValues) => {
    const formData: CreateCategoryType = {
      name: values.name,
      attributes: values.attributes,
    };

    if (isSubcategory) {
      if (initialData?._id) {
        // Update subcategory
        updateSubcategoryMutation.mutate({
          id: initialData._id,
          data: formData,
        });
      } else {
        // Create subcategory
        createSubcategoryMutation.mutate(formData);
      }
    } else {
      if (initialData?._id) {
        // Update category
        updateMutation.mutate({
          id: initialData._id,
          data: formData,
        });
      } else {
        // Create category
        createMutation.mutate({
          ...formData,
          parent: null,
        });
      }
    }
  };
  const attributes = form.watch('attributes') || [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {isSubcategory ? 'Subcategory Name' : 'Category Name'}
              </FormLabel>
              <FormControl>
                <Input
                  placeholder={`Enter ${isSubcategory ? 'subcategory' : 'category'} name`}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {isSubcategory && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <FormLabel>Add New Attribute</FormLabel>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Enter attribute name"
                    value={newAttribute}
                    onChange={(e) => setNewAttribute(e.target.value)}
                  />
                  <Button
                    type="button"
                    onClick={handleAddAttribute}
                    className="flex-shrink-0"
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {' '}
              {attributes.map((attribute, index) => (
                <div
                  key={index}
                  className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{attribute.name}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleRemoveAttribute(attribute.name)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {initialData?._id
              ? 'Update'
              : isSubcategory
                ? 'Add Subcategory'
                : 'Add Category'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default CategoryForm;
