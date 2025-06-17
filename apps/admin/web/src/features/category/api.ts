/**
 * Category API Service
 * Centralized API calls with proper error handling and type safety
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

/**
 * API Endpoints for category operations
 */
export class CategoryApiService {
  private static readonly BASE_PATH = '/category';

  /**
   * Creates a new category
   */
  static async createCategory(
    data: CreateCategoryRequest,
  ): Promise<ApiResponse<Category>> {
    const response = await ProductAPI.post<ApiResponse<Category>>(
      CategoryApiService.BASE_PATH,
      data,
    );
    return response.data;
  }

  /**
   * Retrieves paginated list of categories
   */
  static async getCategories(
    page = 1,
    limit = 50,
  ): Promise<ApiResponse<PaginatedCategoriesResponse>> {
    const response = await ProductAPI.get<
      ApiResponse<PaginatedCategoriesResponse>
    >(`${CategoryApiService.BASE_PATH}?page=${page}&limit=${limit}`);
    return response.data;
  }

  /**
   * Retrieves category tree with attributes optimized for UI
   */
  static async getCategoryTree(): Promise<ApiResponse<CategoryTreeNode[]>> {
    const response = await ProductAPI.get<ApiResponse<CategoryTreeNode[]>>(
      `${CategoryApiService.BASE_PATH}/tree-with-attributes`,
    );
    return response.data;
  }

  /**
   * Retrieves a single category by ID
   */
  static async getCategoryById(id: string): Promise<ApiResponse<Category>> {
    const response = await ProductAPI.get<ApiResponse<Category>>(
      `${CategoryApiService.BASE_PATH}/${id}`,
    );
    return response.data;
  }

  /**
   * Updates an existing category
   */
  static async updateCategory(
    id: string,
    data: UpdateCategoryRequest,
  ): Promise<ApiResponse<Category>> {
    const response = await ProductAPI.put<ApiResponse<Category>>(
      `${CategoryApiService.BASE_PATH}/${id}`,
      data,
    );
    return response.data;
  }

  /**
   * Deletes a category
   */
  static async deleteCategory(
    id: string,
  ): Promise<ApiResponse<{ success: boolean }>> {
    const response = await ProductAPI.delete<ApiResponse<{ success: boolean }>>(
      `${CategoryApiService.BASE_PATH}/${id}`,
    );
    return response.data;
  }
}

// Legacy functions for backwards compatibility
// TODO: Gradually migrate to CategoryApiService class

export const createCategoryMutationFn = CategoryApiService.createCategory;
export const getcategoryQueryFn = () => CategoryApiService.getCategories();
export const getCategoryTreeWithAttributesQueryFn =
  CategoryApiService.getCategoryTree;
export const getCategoryByIdQueryFn = CategoryApiService.getCategoryById;
export const updateCategoryMutationFn = CategoryApiService.updateCategory;
export const deleteCategoryMutationFn = CategoryApiService.deleteCategory;

// Re-export types for convenience
export type {
  Category,
  CategoryTreeNode,
  CreateCategoryRequest,
  UpdateCategoryRequest,
};
