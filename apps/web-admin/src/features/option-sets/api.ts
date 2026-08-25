import type { CreateOptionSetInput, OptionSet, UpdateOptionSetInput } from './types';

import { axiosClient } from '@/lib/axios/axios-client';

export async function fetchOptionSets(): Promise<OptionSet[]> {
  const res = await axiosClient.get('/option-sets');
  return res.data?.data || [];
}

export async function fetchOptionSetById(id: string): Promise<OptionSet> {
  const res = await axiosClient.get(`/option-sets/${id}`);
  return res.data?.data;
}

export async function createOptionSet(data: CreateOptionSetInput): Promise<OptionSet> {
  const res = await axiosClient.post('/option-sets', data);
  return res.data?.data;
}

export async function updateOptionSet(id: string, data: UpdateOptionSetInput): Promise<OptionSet> {
  const res = await axiosClient.put(`/option-sets/${id}`, data);
  return res.data?.data;
}

export async function deleteOptionSet(id: string): Promise<void> {
  await axiosClient.delete(`/option-sets/${id}`);
}
