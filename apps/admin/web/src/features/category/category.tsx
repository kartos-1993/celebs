import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
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
  DialogFooter,
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
import CategoryForm from './components/categoryform';
import { useToast } from '@/hooks/use-toast';
import { getcategoryQueryFn, deleteCategoryMutationFn } from './api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Updated API structure - flattened categories

const Categories = () => {
  const { isLoading, error, data } = useQuery({
    queryKey: ['getAllCategories'],
    queryFn: getcategoryQueryFn,
  });

  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: deleteCategoryMutationFn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['getAllCategories'] });
      toast({
        title: 'Success',
        description: 'Category deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error?.response?.data?.message || 'Failed to delete category',
      });
    },
  });

  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [parentCategoryId, setParentCategoryId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  // Build hierarchical structure from flat array
  const buildHierarchy = (categories: any[]) => {
    const categoryMap = new Map();
    const rootCategories: any[] = [];

    // First pass: create map of all categories
    categories.forEach((cat) => {
      categoryMap.set(cat._id, { ...cat, children: [] });
    });

    // Second pass: build hierarchy
    categories.forEach((cat) => {
      const category = categoryMap.get(cat._id);
      if (cat.parent) {
        const parent = categoryMap.get(cat.parent);
        if (parent) {
          parent.children.push(category);
        }
      } else {
        rootCategories.push(category);
      }
    });

    return rootCategories;
  };
  const categories = data?.data?.categories || [];
  const hierarchicalCategories = buildHierarchy(categories);

  const toggleCategory = (id: string) => {
    setExpandedCategories({
      ...expandedCategories,
      [id]: !expandedCategories[id],
    });
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    setParentCategoryId(null);
    setFormDialogOpen(true);
  };

  const handleAddSubcategory = (parentId: string) => {
    setEditingCategory(null);
    setParentCategoryId(parentId);
    setFormDialogOpen(true);
  };

  const handleEdit = (category: any) => {
    setEditingCategory(category);
    setParentCategoryId(null);
    setFormDialogOpen(true);
  };

  const handleDelete = (categoryId: string) => {
    setCategoryToDelete(categoryId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (categoryToDelete) {
      deleteMutation.mutate(categoryToDelete, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setCategoryToDelete(null);
        },
        onError: () => {
          setDeleteDialogOpen(false);
          setCategoryToDelete(null);
        },
      });
    } else {
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    }
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setCategoryToDelete(null);
  };

  const handleSave = (formData: any) => {
    console.log('Form data:', formData);
  };

  const renderCategoryRow = (category: any, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const indent = level * 24;

    return (
      <>
        <TableRow
          key={category._id}
          className={
            level > 0
              ? 'bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800/50'
              : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
          }
        >
          <TableCell className="font-medium">
            <div
              className="flex items-center gap-2"
              style={{ paddingLeft: `${indent}px` }}
            >
              {hasChildren && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => toggleCategory(category._id)}
                >
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${
                      expandedCategories[category._id] ? 'rotate-90' : ''
                    }`}
                  />
                </Button>
              )}
              {!hasChildren && <div className="w-8" />}
              <span className="flex items-center gap-2">
                {category.name}
                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                  Level {category.level}
                </span>
                {category.parent && (
                  <span className="text-xs text-blue-500 bg-blue-100 px-2 py-1 rounded">
                    Parent:{' '}
                    {categories.find((c) => c._id === category.parent)?.name}
                  </span>
                )}
              </span>
            </div>
          </TableCell>
          <TableCell>
            <div className="flex gap-1 flex-wrap">
              {category.attributes?.map((attr: any, idx: number) => (
                <span
                  key={idx}
                  className="inline-flex items-center rounded-full bg-fashion-100 px-2.5 py-0.5 text-xs font-medium text-fashion-700"
                >
                  {attr.name} ({attr.type})
                  {attr.isRequired && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </span>
              ))}
              {(!category.attributes || category.attributes.length === 0) && (
                <span className="text-gray-400 text-sm">No attributes</span>
              )}
            </div>
          </TableCell>
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
          hasChildren &&
          category.children.map((child: any) =>
            renderCategoryRow(child, level + 1),
          )}
      </>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-fashion-700">Categories</h1>
          <p className="text-gray-500 mt-1">
            Manage product categories and attributes
          </p>
        </div>
        <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-fashion-700 hover:bg-fashion-800 dark:bg-fashion-600 dark:hover:bg-fashion-700 dark:text-white"
              onClick={handleAddCategory}
            >
              <FolderPlus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? 'Edit' : 'Add'} Category
                {parentCategoryId && ' (Subcategory)'}
              </DialogTitle>
            </DialogHeader>{' '}
            <CategoryForm
              initialData={editingCategory}
              categories={categories}
              onSave={() => setFormDialogOpen(false)}
              onCancel={() => setFormDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            Category Hierarchy
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-fashion-700" />
              <p className="text-sm text-muted-foreground">
                Loading categories...
              </p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-lg px-4 py-3 text-sm">
                <p className="font-medium">Unable to load categories</p>
                <p className="mt-1 text-xs opacity-90">
                  Please try again later or contact support if the issue
                  persists.
                </p>
              </div>
            </div>
          )}

          {hierarchicalCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <p className="text-muted-foreground text-sm">
                No categories found
              </p>
              <Button
                className="bg-fashion-700 hover:bg-fashion-800 dark:bg-fashion-600 dark:hover:bg-fashion-700 dark:text-white"
                onClick={handleAddCategory}
              >
                <FolderPlus className="mr-2 h-4 w-4" />
                Add Your First Category
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[400px]">
                    Category Name & Level
                  </TableHead>
                  <TableHead>Attributes</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hierarchicalCategories.map((category) =>
                  renderCategoryRow(category),
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Delete Category?</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            Are you sure you want to delete this category? This action cannot be
            undone.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cancelDelete}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Categories;
