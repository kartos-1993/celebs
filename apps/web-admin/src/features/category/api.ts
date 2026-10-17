/**
 * Category API Service
 * Centralized API calls with proper type safety
 */

import type { RecentCategory } from '@celebs/shared-types';

import {
  ApiResponse,
  Category,
  CategoryTreeNode,
  CreateCategoryRequest,
  PaginatedCategoriesResponse,
  StorefrontShortcut,
  UpdateCategoryRequest,
} from './types';

import { axiosClient } from '@/lib/axios/axios-client';

const BASE_PATH = '/category';

export const CATEGORY_QUERY_KEYS = {
  all: ['categories'] as const,
  lists: () => [...CATEGORY_QUERY_KEYS.all, 'list'] as const,
  list: (page?: number, limit?: number) =>
    [...CATEGORY_QUERY_KEYS.lists(), { page, limit }] as const,
  tree: () => [...CATEGORY_QUERY_KEYS.all, 'tree'] as const,
  treeWithAttributes: () => [...CATEGORY_QUERY_KEYS.all, 'tree-with-attributes'] as const,
  detail: (id: string) => [...CATEGORY_QUERY_KEYS.all, 'detail', id] as const,
  search: (query: string) => [...CATEGORY_QUERY_KEYS.all, 'search', query] as const,
  recent: () => [...CATEGORY_QUERY_KEYS.all, 'recent'] as const,
  storefrontShortcuts: (categoryId: string) =>
    [...CATEGORY_QUERY_KEYS.all, 'storefront-shortcuts', categoryId] as const,
};

/**
 * Creates a new category
 */
export async function createCategory(data: CreateCategoryRequest): Promise<ApiResponse<Category>> {
  const response = await axiosClient.post<ApiResponse<Category>>(BASE_PATH, data);
  return response.data;
}

/**
 * Retrieves paginated list of categories
 */
export async function getCategories(
  page = 1,
  limit = 50,
): Promise<ApiResponse<PaginatedCategoriesResponse>> {
  const response = await axiosClient.get<ApiResponse<PaginatedCategoriesResponse>>(
    `${BASE_PATH}?page=${page}&limit=${limit}`,
  );
  return response.data;
}

/**
 * Retrieves category tree with attributes optimized for UI
 */
export async function getCategoryTree(): Promise<ApiResponse<CategoryTreeNode[]>> {
  const response = await axiosClient.get<ApiResponse<CategoryTreeNode[]>>(
    `${BASE_PATH}/tree-with-attributes`,
  );
  return response.data;
}

/**
 * Global search for categories (flat list for dropdown)
 */
export async function searchCategories(query: string) {
  const response = await axiosClient.get(`${BASE_PATH}/search`, {
    params: { q: query, limit: 20 },
  });
  return response.data?.data ?? response.data ?? [];
}

/**
 * Retrieves a single category by ID
 */
export async function getCategoryById(id: string): Promise<ApiResponse<Category>> {
  const response = await axiosClient.get<ApiResponse<Category>>(`${BASE_PATH}/${id}`);
  return response.data;
}

/**
 * Updates an existing category
 */
export async function updateCategory(
  id: string,
  data: UpdateCategoryRequest,
): Promise<ApiResponse<Category>> {
  const response = await axiosClient.put<ApiResponse<Category>>(`${BASE_PATH}/${id}`, data);
  return response.data;
}

/**
 * Deletes a category
 */
export async function deleteCategory(id: string): Promise<ApiResponse<{ success: boolean }>> {
  const response = await axiosClient.delete<ApiResponse<{ success: boolean }>>(
    `${BASE_PATH}/${id}`,
  );
  return response.data;
}

export async function getStorefrontShortcutsForCategory(
  categoryId: string,
): Promise<ApiResponse<StorefrontShortcut[]>> {
  const response = await axiosClient.get<ApiResponse<StorefrontShortcut[]>>(
    `/storefront-shortcuts?categoryId=${categoryId}`,
  );
  return response.data;
}

export async function createStorefrontShortcut(
  data: Partial<StorefrontShortcut>,
): Promise<ApiResponse<StorefrontShortcut>> {
  const response = await axiosClient.post<ApiResponse<StorefrontShortcut>>(
    '/storefront-shortcuts',
    data,
  );
  return response.data;
}

export async function updateStorefrontShortcut(
  id: string,
  data: Partial<StorefrontShortcut>,
): Promise<ApiResponse<StorefrontShortcut>> {
  const response = await axiosClient.put<ApiResponse<StorefrontShortcut>>(
    `/storefront-shortcuts/${id}`,
    data,
  );
  return response.data;
}

export async function deleteStorefrontShortcut(
  id: string,
): Promise<ApiResponse<{ success: boolean }>> {
  const response = await axiosClient.delete<ApiResponse<{ success: boolean }>>(
    `/storefront-shortcuts/${id}`,
  );
  return response.data;
}

export async function getRecentCategories(): Promise<ApiResponse<RecentCategory[]>> {
  const response = await axiosClient.get<ApiResponse<RecentCategory[]>>(`${BASE_PATH}/recent`);
  return response.data;
}

export async function recordRecentCategory(
  categoryId: string,
): Promise<ApiResponse<RecentCategory[]>> {
  const response = await axiosClient.post<ApiResponse<RecentCategory[]>>(`${BASE_PATH}/recent`, {
    categoryId,
  });
  return response.data;
}

export const CategoryApiService = {
  createCategory,
  getCategories,
  getCategoryTree,
  searchCategories,
  getRecentCategories,
  recordRecentCategory,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getStorefrontShortcutsForCategory,
  createStorefrontShortcut,
  updateStorefrontShortcut,
  deleteStorefrontShortcut,
};

// Re-export types for convenience
export type { Category, CategoryTreeNode, CreateCategoryRequest, UpdateCategoryRequest };
