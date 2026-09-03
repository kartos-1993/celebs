import type { OrderItemUI } from './api';

export type Mode = 'vendor' | 'admin';

export interface StatusTab {
  id: string;
  label: string;
}

export type OrdersListState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'success'; rows: OrderItemUI[] };
