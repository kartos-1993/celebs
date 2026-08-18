import { axiosClient } from '@/lib/axios/axios-client';
import type {
  Brand,
  BrandFilterType,
  CreateBrandAuthorizationType,
  IApiResponse,
  VendorBrandAuthorization,
} from '@celebs/shared-types';

export interface PaginatedBrandsResponse {
  items: Brand[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const BASE_PATH = '/brands';

export async function getBrands(
  filters?: Partial<BrandFilterType>,
): Promise<IApiResponse<PaginatedBrandsResponse>> {
  const response = await axiosClient.get<IApiResponse<PaginatedBrandsResponse>>(BASE_PATH, {
    params: filters,
  });
  return response.data;
}

export async function getBrandById(id: string): Promise<IApiResponse<Brand>> {
  const response = await axiosClient.get<IApiResponse<Brand>>(`${BASE_PATH}/${id}`);
  return response.data;
}

export async function submitBrandAuthorization(
  data: CreateBrandAuthorizationType,
): Promise<IApiResponse<VendorBrandAuthorization>> {
  const response = await axiosClient.post<IApiResponse<VendorBrandAuthorization>>(
    `${BASE_PATH}/authorizations`,
    data,
  );
  return response.data;
}

export async function getMyBrandAuthorizations(): Promise<
  IApiResponse<VendorBrandAuthorization[]>
> {
  const response = await axiosClient.get<IApiResponse<VendorBrandAuthorization[]>>(
    `${BASE_PATH}/authorizations/my`,
  );
  return response.data;
}
