import { axiosClient } from '@/lib/axios/axios-client';

export const STAFF_QUERY_KEYS = {
  all: ['staff'] as const,
  list: (vendorId?: string) => [...STAFF_QUERY_KEYS.all, 'list', { vendorId }] as const,
};

export async function getStaff(vendorId?: string) {
  const response = await axiosClient.get('/staff', {
    params: vendorId ? { vendorId } : undefined,
  });
  return response.data;
}

export async function createStaff(data: Record<string, unknown>) {
  const response = await axiosClient.post('/staff', data);
  return response.data;
}

export async function deleteStaff(id: string) {
  const response = await axiosClient.delete(`/staff/${id}`);
  return response.data;
}

export async function updateStaff(id: string, data: Record<string, unknown>) {
  const response = await axiosClient.patch(`/staff/${id}`, data);
  return response.data;
}
