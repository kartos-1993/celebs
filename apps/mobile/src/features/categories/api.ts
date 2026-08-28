import type { Category, StorefrontConfigData } from './types';

import { apiClient } from '@/api/client';

export const CATEGORY_QUERY_KEYS = {
  all: ['categories'] as const,
  tree: () => [...CATEGORY_QUERY_KEYS.all, 'tree'] as const,
  storefront: (slug: string) => [...CATEGORY_QUERY_KEYS.all, 'storefront', slug] as const,
  details: () => [...CATEGORY_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...CATEGORY_QUERY_KEYS.details(), id] as const,
};

export async function getCategoriesTree(): Promise<Category[]> {
  const response = await apiClient.get('/category/tree-with-attributes', { skipAuth: true });
  const resData = response.data;
  if (!resData.success || !Array.isArray(resData.data)) {
    return [];
  }

  const flattened: Category[] = [];

  const processNodes = (
    nodes: (Category & { name: string; children?: Category[] })[],
    parentName?: string,
  ) => {
    nodes.forEach((node) => {
      const prefixRegex = parentName ? new RegExp(`^${parentName}\\s+`, 'i') : null;
      const displayName = prefixRegex ? node.name.replace(prefixRegex, '') : node.name;

      flattened.push({
        ...node,
        displayName,
      });

      if (node.children && node.children.length > 0) {
        processNodes(
          node.children as (Category & { name: string; children?: Category[] })[],
          parentName || node.name,
        );
      }
    });
  };

  resData.data.forEach((rootCat: Category & { name: string; children?: Category[] }) => {
    if (rootCat.children && rootCat.children.length > 0) {
      processNodes(rootCat.children, rootCat.name);
    } else {
      flattened.push({
        ...rootCat,
        displayName: rootCat.name,
      });
    }
  });

  return flattened;
}

export async function getStorefrontConfig(
  categorySlug: string,
): Promise<StorefrontConfigData | null> {
  if (!categorySlug) return null;
  const response = await apiClient.get(`/category/${categorySlug}/storefront`, {
    skipAuth: true,
  });
  const resData = response.data;
  if (resData.success && resData.data) {
    return resData.data as StorefrontConfigData;
  }
  return null;
}
