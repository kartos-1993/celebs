import { axiosClient } from '@/lib/axios/axios-client';

export const USERS_QUERY_KEYS = {
  all: ['users'] as const,
  list: () => [...USERS_QUERY_KEYS.all, 'list'] as const,
};

export async function getUsers() {
  const response = await axiosClient.get('/admin/users');
  return response.data;
}

export async function createUser(data: Record<string, unknown>) {
  const response = await axiosClient.post('/admin/users', data);
  return response.data;
}

export async function deleteUser(id: string) {
  const response = await axiosClient.delete(`/admin/users/${id}`);
  return response.data;
}
