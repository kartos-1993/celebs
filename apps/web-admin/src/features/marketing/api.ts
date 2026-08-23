import { axiosClient } from '@/lib/axios/axios-client';

export const MARKETING_QUERY_KEYS = {
  all: ['marketing'] as const,
  campaigns: () => [...MARKETING_QUERY_KEYS.all, 'campaigns'] as const,
  campaignDetail: (id?: string) => [...MARKETING_QUERY_KEYS.all, 'campaigns', id] as const,
  combos: () => [...MARKETING_QUERY_KEYS.all, 'combos'] as const,
  comboDetail: (id?: string) => [...MARKETING_QUERY_KEYS.all, 'combos', id] as const,
};
import { directUploadFile } from '@/lib/media-upload';

export async function getCampaigns() {
  const response = await axiosClient.get('/campaigns/all');
  return response.data;
}

export async function getCampaignById(id: string) {
  const response = await axiosClient.get(`/campaigns/id/${id}`);
  return response.data;
}

export async function createCampaign(data: unknown) {
  const response = await axiosClient.post('/campaigns', data);
  return response.data;
}

export async function updateCampaign({ id, data }: { id: string; data: unknown }) {
  const response = await axiosClient.put(`/campaigns/${id}`, data);
  return response.data;
}

export async function getCombos() {
  const response = await axiosClient.get('/combos/all');
  return response.data;
}

export async function getComboById(id: string) {
  const response = await axiosClient.get(`/combos/id/${id}`);
  return response.data;
}

export async function createCombo(data: unknown) {
  const response = await axiosClient.post('/combos', data);
  return response.data;
}

export async function updateCombo({ id, data }: { id: string; data: unknown }) {
  const response = await axiosClient.put(`/combos/${id}`, data);
  return response.data;
}

export async function deleteCombo(id: string) {
  const response = await axiosClient.delete(`/combos/${id}`);
  return response.data;
}

export async function uploadMarketingBanner(file: File): Promise<string> {
  return directUploadFile(file, 'platform', 'MARKETING');
}
