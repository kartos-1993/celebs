/**
 * Custom hook for category management
 * Encapsulates all category-related state and operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { CategoryApiService } from '../api';
import type { UseCategoriesReturn, UpdateCategoryRequest } from '../types';

/**
 * Query keys for React Query caching
 */
export const CATEGORY_QUERY_KEYS = {
  all: ['categories'] as const,
  list: () => [...CATEGORY_QUERY_KEYS.all, 'list'] as const,
  tree: () => [...CATEGORY_QUERY_KEYS.all, 'tree'] as const,
  detail: (id: string) => [...CATEGORY_QUERY_KEYS.all, 'detail', id] as const,
};

/**
 * Hook for category list management
 */
export function useCategories(): UseCategoriesReturn {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch categories list
  const {
    data: categoriesData,
    isLoading: isLoadingCategories,
    error: categoriesError,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: CATEGORY_QUERY_KEYS.list(),
    queryFn: () => CategoryApiService.getCategories(1, 100), // Get all categories
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
    queryFn: CategoryApiService.getCategoryTree,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create category mutation
  const createMutation = useMutation({
    mutationFn: CategoryApiService.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEYS.all });
      toast({
        title: 'Success',
        description: 'Category created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error?.response?.data?.message || 'Failed to create category',
      });
    },
  });

  // Update category mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCategoryRequest }) =>
      CategoryApiService.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEYS.all });
      toast({
        title: 'Success',
        description: 'Category updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error?.response?.data?.message || 'Failed to update category',
      });
    },
  });
  // Delete category mutation
  const deleteMutation = useMutation({
    mutationFn: CategoryApiService.deleteCategory,
    onSuccess: (_, categoryId) => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEYS.all });
      const category = categoriesData?.data?.categories.find(
        (c) => c._id === categoryId,
      );
      const hasChildren = categoriesData?.data?.categories.some(
        (c) => c.parent === categoryId,
      );

      toast({
        title: 'Success',
        description: hasChildren
          ? `Category '${category?.name}' and its children were deleted successfully`
          : `Category '${category?.name}' was deleted successfully`,
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

  const isLoading = isLoadingCategories || isLoadingTree;
  const error = categoriesError || treeError;
  return {
    categories: categoriesData?.data?.categories || [],
    categoryTree: treeData?.data || [],
    isLoading,
    error,
    createCategory: async (data) => {
      const result = await createMutation.mutateAsync(data);
      // Ensure query invalidation and UI updates are finished
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEYS.list() }),
        queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEYS.tree() }),
      ]);
      return result;
    },
    updateCategory: async (id, data) => {
      const result = await updateMutation.mutateAsync({ id, data });
      // Ensure query invalidation and UI updates are finished
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEYS.list() }),
        queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEYS.tree() }),
      ]);
      return result;
    },
    deleteCategory: async (id) => {
      const result = await deleteMutation.mutateAsync(id);
      // Ensure query invalidation and UI updates are finished
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEYS.list() }),
        queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEYS.tree() }),
      ]);
      return result;
    },
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
    queryFn: () => CategoryApiService.getCategoryById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
