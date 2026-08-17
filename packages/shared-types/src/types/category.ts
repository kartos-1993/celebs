import type {
  CategoryAttributeType,
  CreateCategoryType,
  UpdateCategoryType,
} from '../validators/category.validator';

export interface CategoryEntity {
  id: string;
  name: string;
  slug: string;
  level: number;
  parentCategory: string | null;
  path: string[] | string;
  attributes?: CategoryAttributeType[];
  sizeChartColumns?: string[];
  bodyChartColumns?: string[];
  imageUrl?: string | null;
  isActive?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CategoryTreeNode extends CategoryEntity {
  children?: CategoryTreeNode[];
}

export interface DropdownCategory {
  id: string;
  name: string;
  parentCategory: string | null;
  hasChildren: boolean;
  level: number;
  path: string[] | string;
  slug?: string;
}

export interface RecentCategory {
  id: string;
  name: string;
  path: string[] | string;
  usedAt: Date | string;
}

export interface PaginatedCategoriesResponse {
  categories: CategoryEntity[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export type CreateCategoryRequest = CreateCategoryType;
export type UpdateCategoryRequest = UpdateCategoryType;
