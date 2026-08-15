/**
 * Shared Category API Client and Query Keys
 * Available for cross-feature consumption (Products, Navigation, Storefront, Category Admin)
 */
import { axiosClient } from '@/lib/axios/axios-client';
import type {
  CategoryTreeNode,
  DropdownCategory,
  IApiResponse,
  RecentCategory,
} from '@celebs/shared-types';

const BASE_PATH = '/category';

export const CATEGORY_QUERY_KEYS = {
  all: ['categories'] as const,
  tree: () => [...CATEGORY_QUERY_KEYS.all, 'tree'] as const,
  recent: () => [...CATEGORY_QUERY_KEYS.all, 'recent'] as const,
  search: (query: string) => [...CATEGORY_QUERY_KEYS.all, 'search', query] as const,
  detail: (id: string) => [...CATEGORY_QUERY_KEYS.all, 'detail', id] as const,
};

export async function getCategoryTree(): Promise<IApiResponse<CategoryTreeNode[]>> {
  const response = await axiosClient.get<IApiResponse<CategoryTreeNode[]>>(
    `${BASE_PATH}/tree-with-attributes`,
  );
  return response.data;
}

export async function searchCategories(query: string): Promise<DropdownCategory[]> {
  const response = await axiosClient.get(`${BASE_PATH}/search`, {
    params: { q: query, limit: 20 },
  });
  return response.data?.data ?? response.data ?? [];
}

export async function getRecentCategories(): Promise<IApiResponse<RecentCategory[]>> {
  const response = await axiosClient.get<IApiResponse<RecentCategory[]>>(`${BASE_PATH}/recent`);
  return response.data;
}

export async function recordRecentCategory(
  categoryId: string,
): Promise<IApiResponse<RecentCategory[]>> {
  const response = await axiosClient.post<IApiResponse<RecentCategory[]>>(`${BASE_PATH}/recent`, {
    categoryId,
  });
  return response.data;
}

export async function getCategoryById(id: string): Promise<IApiResponse<CategoryTreeNode>> {
  const response = await axiosClient.get<IApiResponse<CategoryTreeNode>>(`${BASE_PATH}/${id}`);
  return response.data;
}

export const SharedCategoryApi = {
  getCategoryTree,
  searchCategories,
  getRecentCategories,
  recordRecentCategory,
  getCategoryById,
};
