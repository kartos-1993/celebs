/**
 * Category tree data for the product form's cascading dropdown.
 * Renamed from use-categories.ts to avoid clashing with
 * features/category/hooks/use-categories.ts.
 */
import { useEffect, useState } from 'react';
import { CategoryApiService } from '../../category/api';
import type { CategoryTreeNode } from '../../category/types';
import type { DropdownCategory, RecentCategory } from '../types';

/** Flatten a category tree into the lightweight dropdown shape. */
function flattenTree(nodes: CategoryTreeNode[]): DropdownCategory[] {
  const out: DropdownCategory[] = [];
  const walk = (node: CategoryTreeNode): void => {
    const record = node as unknown as Record<string, unknown>;
    out.push({
      id: node.id,
      name: node.name,
      parentId: (record.parentCategory as string | null | undefined) ?? node.parent ?? null,
      hasChildren: Array.isArray(node.children) && node.children.length > 0,
      level: node.level ?? Math.max(0, (node.path?.length ?? 1) - 1),
      path: node.path && node.path.length > 0 ? node.path : [node.name],
    });
    node.children?.forEach(walk);
  };
  nodes.forEach(walk);
  return out;
}

export const useCategoryTree = () => {
  const [allCategories, setAllCategories] = useState<DropdownCategory[]>([]);
  const [recentCategories, setRecentCategories] = useState<RecentCategory[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await CategoryApiService.getCategoryTree();
        const tree = res?.data ?? [];
        if (active) setAllCategories(flattenTree(tree));
      } catch (_error) {
        if (active) setAllCategories([]);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const getRootCategories = (): DropdownCategory[] =>
    allCategories.filter((cat) => cat.parentId === null);

  const getChildCategories = (parentId: string): DropdownCategory[] =>
    allCategories.filter((cat) => cat.parentId === parentId);

  const searchCategories = (query: string, parentId?: string): DropdownCategory[] => {
    if (!query.trim()) {
      return parentId ? getChildCategories(parentId) : getRootCategories();
    }
    const searchTerm = query.toLowerCase();
    return allCategories.filter((cat) => {
      const matchesName = cat.name.toLowerCase().includes(searchTerm);
      const matchesParent = parentId ? cat.parentId === parentId : true;
      return matchesName && matchesParent;
    });
  };

  const addToRecent = (category: DropdownCategory) => {
    const entry: RecentCategory = {
      id: category.id,
      name: category.name,
      path: category.path,
      usedAt: new Date(),
    };
    setRecentCategories((prev) => {
      const filtered = prev.filter((item) => item.id !== category.id);
      return [entry, ...filtered].slice(0, 5);
    });
  };

  return {
    getRootCategories,
    getChildCategories,
    searchCategories,
    recentCategories,
    addToRecent,
    findCategoryById: (id: string) => allCategories.find((c) => c.id === id),
    getAllCategories: () => allCategories,
  };
};