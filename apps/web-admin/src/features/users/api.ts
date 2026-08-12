import { axiosClient } from '@/lib/axios/axios-client';

export async function getUsers() {
  const response = await axiosClient.get('/admin/users');
  return response.data;
}

export async function createUser(data: Record<string, unknown>) {
  return await axiosClient.post('/admin/users', data);
}

export async function deleteUser(id: string) {
  return await axiosClient.delete(`/admin/users/${id}`);
}
