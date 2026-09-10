import type { IApiResponse } from '@celebs/shared-types';

import type { Category, StorefrontConfigData } from './types';

import { apiClient } from '@/api/client';
import { handleApiResponse } from '@/api/response';

export const CATEGORY_QUERY_KEYS = {
  all: ['categories'] as const,
  tree: () => [...CATEGORY_QUERY_KEYS.all, 'tree'] as const,
  storefront: (slug: string) => [...CATEGORY_QUERY_KEYS.all, 'storefront', slug] as const,
  details: () => [...CATEGORY_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...CATEGORY_QUERY_KEYS.details(), id] as const,
};

export async function getCategoriesTree(): Promise<Category[]> {
  const data = await handleApiResponse(
    apiClient.get<IApiResponse<Category[]>>('/category/tree-with-attributes', { skipAuth: true }),
  );
  if (!Array.isArray(data)) {
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

  data.forEach((rootCat: Category & { name: string; children?: Category[] }) => {
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
  const data = await handleApiResponse(
    apiClient.get<IApiResponse<StorefrontConfigData>>(`/category/${categorySlug}/storefront`, {
      skipAuth: true,
    }),
  );
  return data ?? null;
}
