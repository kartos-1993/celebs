/**
 * Custom hook for category management
 * Encapsulates all category-related state and operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/error-utils';
import { PRODUCT_SCHEMA_QUERY_KEYS } from '@/features/product/hooks/use-product-schema';
import {
  CATEGORY_QUERY_KEYS,
  getCategories,
  getCategoryTree,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../api';
import type { UseCategoriesReturn, UpdateCategoryRequest } from '../types';

/**
 * Hook for category list management
 */
export function useCategories(): UseCategoriesReturn {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEYS.all });
    queryClient.invalidateQueries({ queryKey: PRODUCT_SCHEMA_QUERY_KEYS.all });
  };

  // Fetch categories list
  const {
    data: categoriesData,
    isLoading: isLoadingCategories,
    error: categoriesError,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: CATEGORY_QUERY_KEYS.list(),
    queryFn: () => getCategories(1, 100), // Get all categories
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch category tree
  const {
    data: treeData,
    isLoading: isLoadingTree,
    error: treeError,
    refetch: refetchTree,
  } = useQuery({
    queryKey: CATEGORY_QUERY_KEYS.tree(),
    queryFn: getCategoryTree,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create category mutation
  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      invalidateAll();
      toast({
        title: 'Success',
        description: 'Category created successfully',
      });
    },
    onError: (error: unknown) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: getErrorMessage(error, 'Failed to create category'),
      });
    },
  });

  // Update category mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCategoryRequest }) =>
      updateCategory(id, data),
    onSuccess: () => {
      invalidateAll();
      toast({
        title: 'Success',
        description: 'Category updated successfully',
      });
    },
    onError: (error: unknown) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: getErrorMessage(error, 'Failed to update category'),
      });
    },
  });
  // Delete category mutation
  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: (_, categoryId) => {
      invalidateAll();
      const category = categoriesData?.data?.categories.find((c) => c.id === categoryId);
      const hasChildren = categoriesData?.data?.categories.some((c) => c.parentCategory === categoryId);

      toast({
        title: 'Success',
        description: hasChildren
          ? `Category '${category?.name}' and its children were deleted successfully`
          : `Category '${category?.name}' was deleted successfully`,
      });
    },
    onError: (error: unknown) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: getErrorMessage(error, 'Failed to delete category'),
      });
    },
  });

  const isLoading = isLoadingCategories || isLoadingTree;
  const error = categoriesError || treeError;
  return {
    categories: categoriesData?.data?.categories || [],
    categoryTree: treeData?.data || [],
    isLoading,
    error,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    createCategory: (data) => createMutation.mutateAsync(data),
    updateCategory: (id, data) => updateMutation.mutateAsync({ id, data }),
    deleteCategory: (id) => deleteMutation.mutateAsync(id),
    refetch: () => {
      refetchCategories();
      refetchTree();
    },
  };
}

/**
 * Hook for individual category details
 */
export function useCategory(id: string) {
  return useQuery({
    queryKey: CATEGORY_QUERY_KEYS.detail(id),
    queryFn: () => getCategoryById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
