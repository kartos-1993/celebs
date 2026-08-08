import React, { useRef, useCallback } from 'react';
import { Button } from '@celebs/shared-ui/components/button';
import { Form } from '@celebs/shared-ui/components/form';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@celebs/shared-ui/components/tabs';
import { SlidersHorizontal, FolderTree, Store, Loader2 } from 'lucide-react';
import { useAuthContext } from '@/context/auth-provider';
import { Category } from '../types';
import type { CreateCategoryType as CategoryFormData } from '@celebs/shared-types';
import { useCategoryForm } from '../hooks/use-category-form';
import { CategoryBasicInfoTab } from './category-basic-info-tab';
import { CategoryAttributesTab } from './category-attributes-tab';
import { CategoryStorefrontTab } from './category-storefront-tab';

export interface CategoryFormProps {
  initialData?: Partial<Category> | null;
  categories: Category[];
  onSave: (data: CategoryFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const CategoryForm: React.FC<CategoryFormProps> = ({
  initialData,
  categories,
  onSave,
  onCancel,
  isLoading = false,
}) => {
  const { role } = useAuthContext();
  const isSuperadmin = role === 'SUPERADMIN';
  const isEditing = !!initialData?.id;

  const storefrontSaveHandlerRef = useRef<(() => Promise<void>) | null>(null);

  const handleRegisterStorefrontSave = useCallback((fn: () => Promise<void>) => {
    storefrontSaveHandlerRef.current = fn;
  }, []);

  const handleSaveWithStorefront = async (data: CategoryFormData) => {
    onSave(data);
    if (storefrontSaveHandlerRef.current) {
      try {
        await storefrontSaveHandlerRef.current();
      } catch (err) {
        console.error('Failed to save storefront config:', err);
      }
    }
  };

  const {
    form,
    attributeFields,
    removeAttribute,
    isUploadingImage,
    newColumnInput,
    setNewColumnInput,
    newBodyColumnInput,
    setNewBodyColumnInput,
    handleAddAttribute,
    handleAddSizeColumn,
    handleRemoveSizeColumn,
    handleAddBodyColumn,
    handleRemoveBodyColumn,
    handleImageUpload,
    handleSubmit,
  } = useCategoryForm({ initialData, onSave: handleSaveWithStorefront });

  const isSubmitting = form.formState.isSubmitting || isLoading;

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4 py-2 pb-4">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className={`grid w-full ${isSuperadmin ? 'grid-cols-3' : 'grid-cols-2'} mb-4`}>
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <FolderTree className="h-4 w-4" />
              Basic Info & Size Chart
            </TabsTrigger>
            <TabsTrigger value="attributes" className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Attributes ({attributeFields.length})
            </TabsTrigger>
            {isSuperadmin && (
              <TabsTrigger value="storefront" className="flex items-center gap-2">
                <Store className="h-4 w-4 text-fashion-600" />
                Storefront Display
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="basic">
            <CategoryBasicInfoTab
              form={form}
              categories={categories}
              initialDataId={initialData?.id}
              role={role}
              isUploadingImage={isUploadingImage}
              newColumnInput={newColumnInput}
              setNewColumnInput={setNewColumnInput}
              newBodyColumnInput={newBodyColumnInput}
              setNewBodyColumnInput={setNewBodyColumnInput}
              handleAddSizeColumn={handleAddSizeColumn}
              handleRemoveSizeColumn={handleRemoveSizeColumn}
              handleAddBodyColumn={handleAddBodyColumn}
              handleRemoveBodyColumn={handleRemoveBodyColumn}
              handleImageUpload={handleImageUpload}
            />
          </TabsContent>

          <TabsContent value="attributes">
            <CategoryAttributesTab
              form={form}
              attributeFields={attributeFields}
              handleAddAttribute={handleAddAttribute}
              removeAttribute={removeAttribute}
            />
          </TabsContent>

          {isSuperadmin && (
            <TabsContent value="storefront">
              <CategoryStorefrontTab
                categoryId={initialData?.id}
                onRegisterSaveHandler={handleRegisterStorefrontSave}
              />
            </TabsContent>
          )}
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="min-w-[130px]">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditing ? 'Saving...' : 'Creating...'}
              </>
            ) : isEditing ? (
              'Save Category'
            ) : (
              'Create Category'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default CategoryForm;
