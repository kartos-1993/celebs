import { ProductAPI } from '../../lib/axios-client';

interface Attribute {
  name: string;
  values: string[];
}

export interface SubcategoryType {
  _id: string;
  name: string;
  slug: string;
  parent: string;
  attributes?: Array<Attribute>;
  createdAt: string;
  updatedAt: string;
}

export type CategoryType = {
  _id: string;
  name: string;
  slug: string;
  parent: string | null;
  subcategories: SubcategoryType[];
  createdAt: string;
  updatedAt: string;
};

export type CreateCategoryType = {
  name: string;
  parent?: string | null;
  attributes?: Array<Attribute>;
};

export const createCategoryMutationFn = async (data: CreateCategoryType) => {
  const response = await ProductAPI.post<{
    success: boolean;
    message: string;
    data: CategoryType;
  }>(`/category`, data);
  return response.data;
};

export const getCategoryByIdQueryFn = async (id: string) => {
  const response = await ProductAPI.get<{
    success: boolean;
    message: string;
    data: CategoryType;
  }>(`/category/${id}`);
  return response.data;
};

export const getcategoryQueryFn = async () => {
  const response = await ProductAPI.get<{
    success: boolean;
    message: string;
    data: {
      categories: CategoryType[];
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  }>(`/category`);
  return response.data;
};

export const updateCategoryMutationFn = async (
  id: string,
  data: CreateCategoryType,
) => {
  const response = await ProductAPI.put<{
    success: boolean;
    message: string;
    data: CategoryType;
  }>(`/category/${id}`, data);
  return response.data;
};

export const deleteCategoryMutationFn = async (id: string) => {
  const response = await ProductAPI.delete<{
    success: boolean;
    message: string;
  }>(`/category/${id}`);
  return response.data;
};

export const createSubcategoryMutationFn = async (
  parentId: string,
  data: CreateCategoryType,
) => {
  const response = await ProductAPI.post<{
    success: boolean;
    message: string;
    data: SubcategoryType;
  }>(`/category/${parentId}/subcategory`, data);
  return response.data;
};

export const updateSubcategoryMutationFn = async (
  id: string,
  data: CreateCategoryType,
) => {
  const response = await ProductAPI.put<{
    success: boolean;
    message: string;
    data: SubcategoryType;
  }>(`/category/subcategory/${id}`, data);
  return response.data;
};
