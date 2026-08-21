import { axiosClient } from '@/lib/axios/axios-client';

export const VENDORS_QUERY_KEYS = {
  all: ['vendors'] as const,
  list: () => [...VENDORS_QUERY_KEYS.all, 'list'] as const,
  detail: (id: string) => [...VENDORS_QUERY_KEYS.all, 'detail', id] as const,
};

export interface RejectVendorParams {
  id: string;
  reason?: string;
}

export async function getAdminVendors() {
  const response = await axiosClient.get('/admin/vendors');
  return response.data;
}

export async function getAdminVendorById(id: string) {
  const response = await axiosClient.get(`/admin/vendors/${id}`);
  return response.data;
}

export async function approveVendor(id: string) {
  return await axiosClient.patch(`/admin/vendors/${id}/approve`);
}

export async function rejectVendor({ id, reason }: RejectVendorParams) {
  return await axiosClient.patch(`/admin/vendors/${id}/reject`, { reason });
}

export async function suspendVendor(id: string) {
  return await axiosClient.patch(`/admin/vendors/${id}/suspend`);
}
