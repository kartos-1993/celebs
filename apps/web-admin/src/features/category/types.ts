import type {
  CategoryAttributeType,
  CreateCategoryType,
  UpdateCategoryType,
} from '@celebs/shared-types';

export type CategoryAttribute = CategoryAttributeType & {
  categoryId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export interface Category {
  _id: string;
  name: string;
  slug: string;
  level: number;
  parent: string | null;
  path: string[];
  attributes: CategoryAttribute[];
  sizeChartColumns?: string[];
  imageUrl?: string | null;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}

export type CreateCategoryRequest = CreateCategoryType;
export type UpdateCategoryRequest = UpdateCategoryType;

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

export type CategoryFormData = CreateCategoryType;


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
  createCategory: (data: CreateCategoryRequest) => Promise<ApiResponse<Category>>;
  updateCategory: (id: string, data: UpdateCategoryRequest) => Promise<ApiResponse<Category>>;
  deleteCategory: (id: string) => Promise<ApiResponse<{ success: boolean }>>;
  refetch: () => void;
}
