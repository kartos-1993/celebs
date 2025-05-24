
import {ProductAPI} from "../../lib/axios-client";


type CategoryType = {
    _id: string;
    name: string;
    slug: string;
    subcategories: string[];
    createdAt: string;
    updatedAt: string;
  }
  
  type CategoryResponseType = {
    success: boolean;
    message: string;
    data: CategoryType | CategoryType[];
  }
  type createCategotyType = {
    name: string;
  }

  export const createCategoryMutationFn = async (data: createCategotyType) => {
    const response = await ProductAPI.post<CategoryResponseType>(`/category`,data);
    return response.data;
  };
  export const getcategoryQueryFn = async () => {
    const response = await ProductAPI.get<CategoryResponseType>(`/category`);
    return response.data;
  };
  
  export const getCategoryByIdQueryFn = async (id: string) => {
    const response = await ProductAPI.get<CategoryResponseType>(`/category/${id}`);
    return response.data;
  };
  
  export const updateCategoryMutationFn = async (id: string, data: createCategotyType) => {
    const response = await ProductAPI.put(`/category/${id}`, data);
    return response.data;
  };
  
  export const deleteCategoryMutationFn = async (id: string) => {
    const response = await ProductAPI.delete(`/category/${id}`);
    return response.data;
  };