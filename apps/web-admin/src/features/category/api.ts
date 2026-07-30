/**
 * Category API Service
 * Centralized API calls with proper type safety
 */

import { ProductAPI } from '../../lib/axios-client';
import {
  Category,
  CategoryTreeNode,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  PaginatedCategoriesResponse,
  ApiResponse,
} from './types';

const BASE_PATH = '/category';

/**
 * Creates a new category
 */
export async function createCategory(
  data: CreateCategoryRequest,
): Promise<ApiResponse<Category>> {
  const response = await ProductAPI.post<ApiResponse<Category>>(BASE_PATH, data);
  return response.data;
}

/**
 * Retrieves paginated list of categories
 */
export async function getCategories(
  page = 1,
  limit = 50,
): Promise<ApiResponse<PaginatedCategoriesResponse>> {
  const response = await ProductAPI.get<ApiResponse<PaginatedCategoriesResponse>>(
    `${BASE_PATH}?page=${page}&limit=${limit}`,
  );
  return response.data;
}

/**
 * Retrieves category tree with attributes optimized for UI
 */
export async function getCategoryTree(): Promise<ApiResponse<CategoryTreeNode[]>> {
  const response = await ProductAPI.get<ApiResponse<CategoryTreeNode[]>>(
    `${BASE_PATH}/tree-with-attributes`,
  );
  return response.data;
}

/**
 * Global search for categories (flat list for dropdown)
 */
export async function searchCategories(query: string) {
  const response = await ProductAPI.get(`${BASE_PATH}/search`, {
    params: { q: query, limit: 20 },
  });
  return response.data?.data ?? response.data ?? [];
}

/**
 * Retrieves a single category by ID
 */
export async function getCategoryById(id: string): Promise<ApiResponse<Category>> {
  const response = await ProductAPI.get<ApiResponse<Category>>(`${BASE_PATH}/${id}`);
  return response.data;
}

/**
 * Updates an existing category
 */
export async function updateCategory(
  id: string,
  data: UpdateCategoryRequest,
): Promise<ApiResponse<Category>> {
  const response = await ProductAPI.put<ApiResponse<Category>>(
    `${BASE_PATH}/${id}`,
    data,
  );
  return response.data;
}

/**
 * Deletes a category
 */
export async function deleteCategory(
  id: string,
): Promise<ApiResponse<{ success: boolean }>> {
  const response = await ProductAPI.delete<ApiResponse<{ success: boolean }>>(
    `${BASE_PATH}/${id}`,
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
};

// Re-export types for convenience
export type {
  Category,
  CategoryTreeNode,
  CreateCategoryRequest,
  UpdateCategoryRequest,
};

