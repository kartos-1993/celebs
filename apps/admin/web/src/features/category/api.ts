import { ProductAPI } from '../../lib/axios-client';

export interface SubcategoryType {
  _id: string;
  name: string;
  slug: string;
  parent: string;
  attributes?: Array<{
    name: string;
    values: string[];
  }>;
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

type CategoryResponseType = {
  success: boolean;
  message: string;
  data: {
    categories: CategoryType[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type CreateCategoryType = {
  name: string;
  parent?: string | null;
};

export const createCategoryMutationFn = async (data: CreateCategoryType) => {
  const response = await ProductAPI.post<CategoryResponseType>(
    `/category`,
    data,
  );
  return response.data;
};

export const getcategoryQueryFn = async () => {
  const response = await ProductAPI.get<CategoryResponseType>(`/category`);
  return response.data;
};

export const getCategoryByIdQueryFn = async (id: string) => {
  const response = await ProductAPI.get<CategoryResponseType>(
    `/category/${id}`,
  );
  return response.data;
};

export const updateCategoryMutationFn = async (
  id: string,
  data: CreateCategoryType,
) => {
  const response = await ProductAPI.put(`/category/${id}`, data);
  return response.data;
};

export const deleteCategoryMutationFn = async (id: string) => {
  const response = await ProductAPI.delete(`/category/${id}`);
  return response.data;
};
