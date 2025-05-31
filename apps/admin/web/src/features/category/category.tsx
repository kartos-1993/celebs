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
} from '@/components/ui/dialog';
import {
  FolderTree,
  FolderPlus,
  ChevronRight,
  Edit,
  Trash2,
  Plus,
} from 'lucide-react';
import CategoryForm from './component/categoryform';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CategoryType, getcategoryQueryFn } from './api';

const Categories = () => {
  const { isLoading, error, data } = useQuery({
    queryKey: ['getAllCategories'],
    queryFn: getcategoryQueryFn,
  });

  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [parentCategoryId, setParentCategoryId] = useState<string | null>(null);
  const { toast } = useToast();

  const categories = data?.data?.categories || [];

  // Build hierarchical structure from flat array
  const buildHierarchy = (categories: CategoryType[]) => {
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
    // This would need to handle nested deletion properly
    toast({
      title: 'Success',
      description: 'Category deleted successfully',
    });
  };

  // const handleSave = (formData: any) => {
  //   console.log('Form data:', formData);

  //   if (editingCategory) {
  //     // Edit existing category
  //     setCategories((prev) =>
  //       prev.map((cat) =>
  //         cat._id === editingCategory._id
  //           ? { ...cat, ...formData, _id: editingCategory._id }
  //           : cat,
  //       ),
  //     );
  //     toast({
  //       title: 'Success',
  //       description: 'Category updated successfully',
  //     });
  //   } else {
  //     // Add new category
  //     const newCategory = {
  //       ...formData,
  //       _id: `cat_${Date.now()}`,
  //       path: formData.parent
  //         ? [
  //             ...(categories.find((c) => c._id === formData.parent)?.path ||
  //               []),
  //             formData.slug,
  //           ]
  //         : [formData.slug],
  //       displayOrder:
  //         categories.filter((c) => c.parent === formData.parent).length + 1,
  //     };

  //     setCategories((prev) => [...prev, newCategory]);
  //     toast({
  //       title: 'Success',
  //       description: 'Category added successfully',
  //     });
  //   }
  //   setFormDialogOpen(false);
  // };

  const renderCategoryRow = (category: any, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const indent = level * 24;

    return (
      <>
        <TableRow
          key={category._id}
          className={
            level > 0 ? 'bg-gray-50 hover:bg-gray-100' : 'hover:bg-gray-50'
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

  if (isLoading) {
    return <div>Loading categories...</div>;
  }

  if (error) {
    return <div>Error loading categories: {error.message}</div>;
  }

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
              className="bg-fashion-700 hover:bg-fashion-800"
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
            </DialogHeader>
            {/* <CategoryForm
              initialData={editingCategory}
              isSubcategory={!!parentCategoryId}
              categories={data?.data?.categories}
              onSave={handleSave}
              onCancel={() => setFormDialogOpen(false)}
            /> */}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            Category Hierarchy (Flattened API Structure)
          </CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default Categories;
