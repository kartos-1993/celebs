import { OptionSetAPI } from '@/lib/axios-client';
import type { OptionSet, CreateOptionSetInput, UpdateOptionSetInput } from './types';

export async function fetchOptionSets(): Promise<OptionSet[]> {
  const res = await OptionSetAPI.get('/option-sets');
  return res.data?.data || [];
}

export async function fetchOptionSetById(id: string): Promise<OptionSet> {
  const res = await OptionSetAPI.get(`/option-sets/${id}`);
  return res.data?.data;
}

export async function createOptionSet(data: CreateOptionSetInput): Promise<OptionSet> {
  const res = await OptionSetAPI.post('/option-sets', data);
  return res.data?.data;
}

export async function updateOptionSet(id: string, data: UpdateOptionSetInput): Promise<OptionSet> {
  const res = await OptionSetAPI.put(`/option-sets/${id}`, data);
  return res.data?.data;
}

export async function deleteOptionSet(id: string): Promise<void> {
  await OptionSetAPI.delete(`/option-sets/${id}`);
}
