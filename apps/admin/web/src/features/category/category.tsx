import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  FolderTree,
  FolderPlus,
  ChevronRight,
  Edit,
  Trash2,
  Plus,
  Loader2,
} from 'lucide-react';
import CategoryForm from './component/categoryform';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CategoryType,
  SubcategoryType,
  deleteCategoryMutationFn,
  getcategoryQueryFn,
  updateCategoryMutationFn,
} from './api';

const Category = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteCategory = useMutation({
    mutationFn: deleteCategoryMutationFn,
  });

  const updateCategory = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateCategoryMutationFn(id, data),
  });

  const { isLoading, error, data } = useQuery({
    queryKey: ['getAllCategories'],
    queryFn: getcategoryQueryFn,
  });

  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<
    CategoryType | SubcategoryType | null
  >(null);
  const [isSubcategory, setIsSubcategory] = useState(false);
  const [parentCategory, setParentCategory] = useState<string | null>(null);

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    setIsSubcategory(false);
    setParentCategory(null);
    setFormDialogOpen(true);
  };

  const handleAddSubcategory = (categoryId: string) => {
    setEditingCategory(null);
    setIsSubcategory(true);
    setParentCategory(categoryId);
    setFormDialogOpen(true);
  };

  const handleEdit = (
    category: CategoryType | SubcategoryType,
    isSubcategory = false,
    parentId: string | null = null,
  ) => {
    setEditingCategory(category);
    setIsSubcategory(isSubcategory);
    setParentCategory(parentId);
    setFormDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setCategoryToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (categoryToDelete) {
      deleteCategory.mutate(categoryToDelete, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['getAllCategories'] });
          toast({
            title: 'Success',
            description: 'Category deleted successfully',
          });
          setDeleteDialogOpen(false);
          setCategoryToDelete(null);
        },
      });
    }
  };

  const handleSave = (formData: any) => {
    if (editingCategory) {
      // Update existing category
      updateCategory.mutate(
        {
          id: editingCategory._id,
          data: {
            ...formData,
            parent: isSubcategory ? parentCategory : null,
          },
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['getAllCategories'] });
            toast({
              title: 'Success',
              description: `${isSubcategory ? 'Subcategory' : 'Category'} updated successfully`,
            });
            setFormDialogOpen(false);
          },
        },
      );
    } else {
      // Create new category
      setFormDialogOpen(false);
      toast({
        title: 'Success',
        description: `${isSubcategory ? 'Subcategory' : 'Category'} added successfully`,
      });
    }
  };

  if (isLoading) return <p>Loading categories...</p>;
  if (error)
    return (
      <p className="text-red-500">
        Error loading categories: {(error as Error).message}
      </p>
    );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Categories</h1>
          <p className="text-gray-500 mt-1">
            Manage product categories and subcategories
          </p>
        </div>
        <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddCategory}>
              <FolderPlus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? 'Edit' : 'Add'}{' '}
                {isSubcategory ? 'Subcategory' : 'Category'}
              </DialogTitle>
            </DialogHeader>
            <CategoryForm
              initialData={editingCategory}
              isSubcategory={isSubcategory}
              parentId={parentCategory}
              onSave={handleSave}
              onCancel={() => setFormDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            Category Structure
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Name</TableHead>
                <TableHead>Attributes</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data?.categories.map((category: CategoryType) => (
                <React.Fragment key={category._id}>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => toggleCategory(category._id)}
                        >
                          <ChevronRight
                            className={`h-4 w-4 transition-transform ${
                              expandedCategories[category._id]
                                ? 'rotate-90'
                                : ''
                            }`}
                          />
                        </Button>
                        {category.name}
                      </div>
                    </TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-gray-500 hover:text-fashion-700"
                          onClick={() => handleEdit(category)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-gray-500 hover:text-red-700"
                          onClick={() => handleDelete(category._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-gray-500 hover:text-fashion-700"
                          onClick={() => handleAddSubcategory(category._id)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedCategories[category._id] &&
                    category.subcategories?.map((subcategory) => (
                      <TableRow key={subcategory._id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2 pl-10">
                            {subcategory.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {subcategory.attributes?.map((attr, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:text-zinc-300"
                              >
                                {attr.name}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-gray-500 hover:text-fashion-700"
                              onClick={() =>
                                handleEdit(subcategory, true, category._id)
                              }
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-gray-500 hover:text-red-700"
                              onClick={() => handleDelete(subcategory._id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <p className="text-sm text-gray-700">
              Are you sure you want to delete this{' '}
              {isSubcategory ? 'subcategory' : 'category'}? This action cannot
              be undone.
            </p>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteCategory.isPending}
            >
              {deleteCategory.isPending ? (
                <div className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Deleting...</span>
                </div>
              ) : (
                'Delete'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Category;
