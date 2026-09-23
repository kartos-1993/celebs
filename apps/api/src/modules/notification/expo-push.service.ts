import { logger } from '@celebs/shared-utils';

import { config } from '@/config/app.config';

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string;
  badge?: number;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
}

export interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: {
    error?: string;
    [key: string]: unknown;
  };
}

export interface ExpoPushReceipt {
  status: 'ok' | 'error';
  message?: string;
  details?: {
    error?: string;
    [key: string]: unknown;
  };
}

export interface ExpoPushConfig {
  pushUrl: string;
  receiptsUrl: string;
  accessToken?: string;
}

const CHUNK_SIZE = 100;

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export class ExpoPushService {
  private fetchFn: typeof fetch;
  private pushUrl: string;
  private receiptsUrl: string;
  private accessToken?: string;

  constructor(customFetch?: typeof fetch, customConfig?: Partial<ExpoPushConfig>) {
    this.fetchFn = customFetch || globalThis.fetch;
    this.pushUrl = customConfig?.pushUrl || config.EXPO.PUSH_URL;
    this.receiptsUrl = customConfig?.receiptsUrl || config.EXPO.RECEIPTS_URL;
    this.accessToken = customConfig?.accessToken || config.EXPO.ACCESS_TOKEN;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    };
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    return headers;
  }

  async sendPushNotifications(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
    if (messages.length === 0) {
      return [];
    }

    const chunks = chunkArray(messages, CHUNK_SIZE);

    // Parallelize chunk dispatch (zero sequential network loops)
    const chunkPromises = chunks.map(async (chunk) => {
      try {
        const response = await this.fetchFn(this.pushUrl, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(chunk),
        });

        if (!response.ok) {
          logger.error(
            { status: response.status, statusText: response.statusText },
            'Expo push notification service returned HTTP error',
          );
          return [];
        }

        const json = (await response.json()) as { data?: ExpoPushTicket[] };
        return json.data && Array.isArray(json.data) ? json.data : [];
      } catch (error) {
        logger.error({ error }, 'Failed to send Expo push notification batch');
        return [];
      }
    });

    const results = await Promise.all(chunkPromises);
    return results.flat();
  }

  async getReceipts(receiptIds: string[]): Promise<Record<string, ExpoPushReceipt>> {
    if (receiptIds.length === 0) {
      return {};
    }

    const chunks = chunkArray(receiptIds, CHUNK_SIZE);

    // Parallelize receipts query (zero sequential network loops)
    const chunkPromises = chunks.map(async (chunk) => {
      try {
        const response = await this.fetchFn(this.receiptsUrl, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ ids: chunk }),
        });

        if (!response.ok) {
          logger.error({ status: response.status }, 'Expo push receipts endpoint returned error');
          return {};
        }

        const json = (await response.json()) as {
          data?: Record<string, ExpoPushReceipt>;
        };
        return json.data || {};
      } catch (error) {
        logger.error({ error }, 'Failed to fetch Expo push receipts batch');
        return {};
      }
    });

    const results = await Promise.all(chunkPromises);
    return Object.assign({}, ...results);
  }

  extractInvalidTokens(tickets: ExpoPushTicket[], tokens: string[]): string[] {
    const invalid: string[] = [];
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      const token = tokens[i];
      if (
        ticket &&
        token &&
        ticket.status === 'error' &&
        ticket.details?.error === 'DeviceNotRegistered'
      ) {
        invalid.push(token);
      }
    }
    return invalid;
  }
}

export const expoPushService = new ExpoPushService();
