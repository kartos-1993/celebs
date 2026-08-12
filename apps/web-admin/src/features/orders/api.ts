import { axiosClient } from '@/lib/axios/axios-client';

export interface Dispatch3PLParams {
  orderId: string;
  provider?: string;
}

export interface SettleCodParams {
  orderId: string;
  reference: string;
}

export async function dispatch3PLOrder({ orderId, provider }: Dispatch3PLParams) {
  const response = await axiosClient.post(`/logistics/dispatch/${orderId}`, {
    courierProvider: provider || 'NEPAL_CAN_MOVE',
  });
  return response.data;
}

export async function settleCodOrder({ orderId, reference }: SettleCodParams) {
  const response = await axiosClient.post(`/logistics/settle-cod/${orderId}`, { reference });
  return response.data;
}
