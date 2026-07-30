import React from 'react';
import { Button } from '@celebs/shared-ui/components/button';
import { Form } from '@celebs/shared-ui/components/form';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@celebs/shared-ui/components/tabs';
import { SlidersHorizontal, FolderTree } from 'lucide-react';
import { useAuthContext } from '@/context/auth-provider';
import { Category } from '../types';
import type { CreateCategoryType as CategoryFormData } from '@celebs/shared-types';
import { useCategoryForm } from '../hooks/use-category-form';
import { CategoryBasicInfoTab } from './category-basic-info-tab';
import { CategoryAttributesTab } from './category-attributes-tab';

export interface CategoryFormProps {
  initialData?: Partial<Category> | null;
  categories: Category[];
  onSave: (data: CategoryFormData) => void;
  onCancel: () => void;
}

export const CategoryForm: React.FC<CategoryFormProps> = ({
  initialData,
  categories,
  onSave,
  onCancel,
}) => {
  const { role } = useAuthContext();

  const {
    form,
    attributeFields,
    removeAttribute,
    isUploadingImage,
    newColumnInput,
    setNewColumnInput,
    handleAddAttribute,
    handleAddSizeColumn,
    handleRemoveSizeColumn,
    handleImageUpload,
    handleSubmit,
  } = useCategoryForm({ initialData, onSave });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4 py-2 pb-4">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <FolderTree className="h-4 w-4" />
              Basic Info & Size Chart
            </TabsTrigger>
            <TabsTrigger value="attributes" className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Attributes & Variations ({attributeFields.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <CategoryBasicInfoTab
              form={form}
              categories={categories}
              initialDataId={initialData?._id}
              role={role}
              isUploadingImage={isUploadingImage}
              newColumnInput={newColumnInput}
              setNewColumnInput={setNewColumnInput}
              handleAddSizeColumn={handleAddSizeColumn}
              handleRemoveSizeColumn={handleRemoveSizeColumn}
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
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Save Category</Button>
        </div>
      </form>
    </Form>
  );
};

export default CategoryForm;
