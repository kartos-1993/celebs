/**
 * Category-related TypeScript types and interfaces
 * Centralized type definitions for better maintainability
 */

export interface CategoryAttribute {
  _id?: string;
  name: string;
  type: 'text' | 'select' | 'multiselect' | 'number' | 'boolean';
  values: string[];
  isRequired: boolean;
  categoryId?: string;
  displayOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  level: number;
  parent: string | null;
  path: string[];
  attributes: CategoryAttribute[];
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}

export interface CreateCategoryRequest {
  name: string;
  parent: string | null;
  attributes: Omit<
    CategoryAttribute,
    '_id' | 'categoryId' | 'createdAt' | 'updatedAt'
  >[];
}

export interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {
  slug?: string;
  level?: number;
  path?: string[];
}

export interface PaginatedCategoriesResponse {
  categories: Category[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface CategoryFormData {
  name: string;
  parent: string | null;
  attributes: CategoryAttribute[];
}

// UI State Types
export interface CategoryUIState {
  isLoading: boolean;
  error: string | null;
  expandedCategories: Record<string, boolean>;
  selectedCategory: Category | null;
  isFormOpen: boolean;
  isDeleteDialogOpen: boolean;
  editingCategory: Category | null;
  parentCategoryId: string | null;
  categoryToDelete: string | null;
}

// Hook Return Types
export interface UseCategoriesReturn {
  categories: Category[];
  categoryTree: CategoryTreeNode[];
  isLoading: boolean;
  error: Error | null;
  createCategory: (data: CreateCategoryRequest) => Promise<any>;
  updateCategory: (id: string, data: UpdateCategoryRequest) => Promise<any>;
  deleteCategory: (id: string) => Promise<any>;
  refetch: () => void;
}
