/**
 * Category API Service
 * Centralized API calls with proper type safety
 */

import { axiosClient } from '@/lib/axios/axios-client';
import {
  Category,
  CategoryTreeNode,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  PaginatedCategoriesResponse,
  ApiResponse,
  QuickFilter,
} from './types';

const BASE_PATH = '/category';

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
  const response = await axiosClient.delete<ApiResponse<{ success: boolean }>>(`${BASE_PATH}/${id}`);
  return response.data;
}

export async function getQuickFiltersForCategory(
  categoryId: string,
): Promise<ApiResponse<QuickFilter[]>> {
  const response = await axiosClient.get<ApiResponse<QuickFilter[]>>(
    `/quick-filter/category/${categoryId}`,
  );
  return response.data;
}

export async function createQuickFilter(
  data: Partial<QuickFilter>,
): Promise<ApiResponse<QuickFilter>> {
  const response = await axiosClient.post<ApiResponse<QuickFilter>>('/quick-filter', data);
  return response.data;
}

export async function updateQuickFilter(
  id: string,
  data: Partial<QuickFilter>,
): Promise<ApiResponse<QuickFilter>> {
  const response = await axiosClient.put<ApiResponse<QuickFilter>>(`/quick-filter/${id}`, data);
  return response.data;
}

export async function deleteQuickFilter(id: string): Promise<ApiResponse<{ success: boolean }>> {
  const response = await axiosClient.delete<ApiResponse<{ success: boolean }>>(
    `/quick-filter/${id}`,
  );
  return response.data;
}

export const CategoryApiService = {
  createCategory,
  getCategories,
  getCategoryTree,
  searchCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getQuickFiltersForCategory,
  createQuickFilter,
  updateQuickFilter,
  deleteQuickFilter,
};

// Re-export types for convenience
export type { Category, CategoryTreeNode, CreateCategoryRequest, UpdateCategoryRequest };
