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
import { createCategoryMutationFn, updateCategoryMutationFn } from '../api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const formSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'Category name is required' })
    .min(2, { message: 'Category name must be at least 2 characters' })
    .max(30, { message: 'Category name must be less than 30 characters' }),
  parent: z.string().optional().nullable(),
});

interface CategoryFormProps {
  initialData: any;
  isSubcategory: boolean;
  parentId?: string | null;
  onSave: (data: any) => void;
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

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createCategoryMutationFn,
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateCategoryMutationFn(id, data),
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || '',
      parent: initialData?.parent || parentId || null,
    },
  });

  const [attributes, setAttributes] = useState<string[]>(
    initialData?.attributes || [],
  );
  const [newAttribute, setNewAttribute] = useState('');

  const handleAddAttribute = () => {
    if (newAttribute && !attributes.includes(newAttribute)) {
      setAttributes([...attributes, newAttribute]);
      setNewAttribute('');
    }
  };

  const handleRemoveAttribute = (attribute: string) => {
    setAttributes(attributes.filter((attr) => attr !== attribute));
  };

  function onSubmit(values: z.infer<typeof formSchema>) {
    const formData = {
      ...values,
      attributes: attributes,
    };

    if (initialData?._id) {
      // Update existing category
      updateMutation.mutate(
        {
          id: initialData._id,
          data: formData,
        },
        {
          onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: ['getAllCategories'] });
            onSave(response.data);
          },
          onError: (error) => {
            console.error('Error updating category', error);
          },
        },
      );
    } else {
      // Create new category
      createMutation.mutate(formData, {
        onSuccess: (response) => {
          queryClient.invalidateQueries({ queryKey: ['getAllCategories'] });
          onSave(response.data);
        },
        onError: (error) => {
          console.error('Error creating category', error);
        },
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter category name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {isSubcategory && (
          <div className="space-y-4">
            <div>
              <FormLabel>Attributes</FormLabel>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Add attribute"
                  value={newAttribute}
                  onChange={(e) => setNewAttribute(e.target.value)}
                />
                <Button
                  type="button"
                  onClick={handleAddAttribute}
                  className="flex-shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {attributes.map((attribute, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded"
                >
                  <span className="text-sm">{attribute}</span>{' '}
                  <button
                    type="button"
                    onClick={() => handleRemoveAttribute(attribute)}
                    className="text-gray-500 hover:text-red-500"
                    title={`Remove ${attribute} attribute`}
                    aria-label={`Remove ${attribute} attribute`}
                  >
                    <X className="h-3 w-3" />
                  </button>
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
            {initialData?._id ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default CategoryForm;
