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
  return await axiosClient.post('/staff', data);
}

export async function deleteStaff(id: string) {
  return await axiosClient.delete(`/staff/${id}`);
}

export async function updateStaff(id: string, data: Record<string, unknown>) {
  return await axiosClient.patch(`/staff/${id}`, data);
}
