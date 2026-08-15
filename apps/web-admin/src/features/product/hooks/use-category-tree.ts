/**
 * Category tree and recent categories data for the product form.
 * Decoupled from features/category using shared contracts & TanStack Query.
 */
import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CategoryTreeNode, DropdownCategory, RecentCategory } from '@celebs/shared-types';
import { CATEGORY_QUERY_KEYS, SharedCategoryApi } from '@/api/category';

/** Flatten a category tree into the lightweight dropdown shape. */
function flattenTree(nodes: CategoryTreeNode[]): DropdownCategory[] {
  const out: DropdownCategory[] = [];
  const walk = (node: CategoryTreeNode, explicitParentId: string | null = null): void => {
    const record = node as CategoryTreeNode & { parentCategory?: string | null };
    const parentId =
      record.parentCategory ??
      node.parent ??
      explicitParentId ??
      null;
    out.push({
      id: node.id,
      name: node.name,
      parentId,
      hasChildren: Array.isArray(node.children) && node.children.length > 0,
      level: node.level ?? Math.max(0, (Array.isArray(node.path) ? node.path.length : 1) - 1),
      path:
        node.path && (Array.isArray(node.path) ? node.path.length > 0 : Boolean(node.path))
          ? node.path
          : [node.name],
      slug: node.slug,
    });
    node.children?.forEach((child) => walk(child, node.id));
  };
  nodes.forEach((root) => walk(root, null));
  return out;
}

export const useCategoryTree = () => {
  const queryClient = useQueryClient();

  const { data: treeResponse, isLoading: isLoadingTree } = useQuery({
    queryKey: CATEGORY_QUERY_KEYS.tree(),
    queryFn: SharedCategoryApi.getCategoryTree,
    staleTime: 5 * 60 * 1000,
  });

  const { data: recentResponse } = useQuery({
    queryKey: CATEGORY_QUERY_KEYS.recent(),
    queryFn: SharedCategoryApi.getRecentCategories,
    staleTime: 60 * 1000,
    retry: false,
  });

  const recordRecentMutation = useMutation({
    mutationFn: SharedCategoryApi.recordRecentCategory,
    onSuccess: (response) => {
      if (response?.data) {
        queryClient.setQueryData(CATEGORY_QUERY_KEYS.recent(), response);
      } else {
        queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEYS.recent() });
      }
    },
  });

  const allCategories = useMemo(() => {
    const tree = treeResponse?.data ?? [];
    return flattenTree(tree);
  }, [treeResponse]);

  const recentCategories: RecentCategory[] = useMemo(() => {
    const list = recentResponse?.data ?? [];
    return list;
  }, [recentResponse]);

  const getRootCategories = useCallback(
    (): DropdownCategory[] => allCategories.filter((cat) => cat.parentId === null),
    [allCategories],
  );

  const getChildCategories = useCallback(
    (parentId: string): DropdownCategory[] =>
      allCategories.filter((cat) => cat.parentId === parentId),
    [allCategories],
  );

  const searchCategories = useCallback(
    (query: string, parentId?: string): DropdownCategory[] => {
      if (!query.trim()) {
        return parentId ? getChildCategories(parentId) : getRootCategories();
      }
      const searchTerm = query.toLowerCase();
      return allCategories.filter((cat) => {
        const matchesName = cat.name.toLowerCase().includes(searchTerm);
        const matchesParent = parentId ? cat.parentId === parentId : true;
        return matchesName && matchesParent;
      });
    },
    [allCategories, getChildCategories, getRootCategories],
  );

  const addToRecent = useCallback(
    (category: DropdownCategory) => {
      if (category.id) {
        recordRecentMutation.mutate(category.id);
      }
    },
    [recordRecentMutation],
  );

  const findCategoryById = useCallback(
    (id: string) => allCategories.find((c) => c.id === id),
    [allCategories],
  );

  return {
    allCategories,
    recentCategories,
    isLoading: isLoadingTree,
    getRootCategories,
    getChildCategories,
    searchCategories,
    addToRecent,
    findCategoryById,
    getAllCategories: () => allCategories,
  };
};
