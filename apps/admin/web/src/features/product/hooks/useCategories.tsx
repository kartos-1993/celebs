import { useState, useEffect } from 'react';
import { Category, RecentCategory } from '../components/cascading-dropdown';
import { CategoryApiService } from '../../category/api';
import type { CategoryTreeNode } from '../../category/types';

// Flattens a category tree node into our lightweight dropdown Category[]
function flattenTree(nodes: CategoryTreeNode[]): Category[] {
  const out: Category[] = [];
  const walk = (n: CategoryTreeNode) => {
    out.push({
      id: n._id,
      name: n.name,
      parentId: n.parent ?? null,
      hasChildren: Array.isArray(n.children) && n.children.length > 0,
      level: n.level ?? Math.max(0, (n.path?.length ?? 1) - 1),
      path: n.path && n.path.length ? n.path : [n.name],
    });
    if (n.children) n.children.forEach(walk);
  };
  nodes.forEach(walk);
  return out;
}

export const useCategories = () => {
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [recentCategories, setRecentCategories] = useState<RecentCategory[]>([]);

  // Load from API on mount
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await CategoryApiService.getCategoryTree();
        const tree = res?.data ?? [];
        const flat = flattenTree(tree);
        if (active) setAllCategories(flat);
      } catch (e) {
        // Keep empty list on failure; dropdown will show none
        if (active) setAllCategories([]);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Keep recent categories in-memory for this session only

  const getRootCategories = (): Category[] => {
    return allCategories.filter((cat) => cat.parentId === null);
  };

  const getChildCategories = (parentId: string): Category[] => {
    return allCategories.filter((cat) => cat.parentId === parentId);
  };

  const searchCategories = (query: string, parentId?: string): Category[] => {
    if (!query.trim())
      return parentId ? getChildCategories(parentId) : getRootCategories();

    const searchTerm = query.toLowerCase();
    return allCategories.filter((cat) => {
      const matchesName = cat.name.toLowerCase().includes(searchTerm);
      const matchesParent = parentId ? cat.parentId === parentId : true;
      return matchesName && matchesParent;
    });
  };

  const addToRecent = (category: Category) => {
    const newRecentCategory: RecentCategory = {
      id: category.id,
      name: category.name,
      path: category.path,
      usedAt: new Date(),
    };

    setRecentCategories((prev) => {
      const filtered = prev.filter((item) => item.id !== category.id);
      return [newRecentCategory, ...filtered].slice(0, 5);
    });
  };

  return {
    getRootCategories,
    getChildCategories,
    searchCategories,
    recentCategories,
    addToRecent,
  };
};