import { logger } from '@celebs/shared-utils';

import { cacheRedis } from '@/config/upstash.redis';

/**
 * Pathao access tokens.
 *
 * Pathao issues a token with a five-day life and expects the caller to store it,
 * which is why this is a provider rather than a helper called inside each
 * request: a location sync walks a few hundred cities, and authenticating before
 * every one of them would spend a network round trip on the credential the whole
 * batch is already holding.
 *
 * The token is cached in Redis with a safety margin shaved off its lifetime, so a
 * call can never pick up a token that expires in flight. A cache outage is not a
 * failure: the token is simply fetched from Pathao directly, costing a round
 * trip rather than stopping a dispatch.
 */

export interface PathaoConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  /**
   * The Pathao store every parcel is collected from.
   *
   * Celebs is one merchant with one approved pickup point, so there is a single
   * value here rather than one per seller. Sellers are not Pathao stores: their
   * goods are collected as one pickup from ours and priced as one parcel, and the
   * per-seller split is about who the money goes to, not who drives the van.
   */
  storeId: number;
}

const TOKEN_PATH = '/aladdin/api/v1/issue-token';
const TOKEN_CACHE_KEY = 'celebs:pathao:access-token';

/**
 * How early to treat a token as spent. Without this a token could still be
 * cached as valid moments before it expires and be handed to a courier request
 * that fails for no visible reason.
 */
export const PATHAO_TOKEN_REFRESH_MARGIN_SECONDS = 300;

/**
 * Credentials for the courier we ship parcels through.
 *
 * Refused outright in staging and production when missing. Pathao holds real
 * consignments and real customer money, so discovering a blank secret on the
 * first COD dispatch is far worse than failing at boot. Test and development keep
 * usable defaults so the suite can run without courier credentials.
 */
export function resolvePathaoConfig(): PathaoConfig {
  const nodeEnv = process.env.NODE_ENV ?? 'development';

  const read = (key: string): string => (process.env[key] ?? '').trim();

  const baseUrl = read('PATHAO_BASE_URL').replace(/\/+$/, '');
  const clientId = read('PATHAO_CLIENT_ID');
  const clientSecret = read('PATHAO_CLIENT_SECRET');
  const username = read('PATHAO_USERNAME');
  const password = read('PATHAO_PASSWORD');
  // 130903 is the sandbox store. A blank id is refused rather than defaulted in
  // staging and production: quoting against store 0 returns a plausible-looking
  // price that no courier will honour.
  const storeId = Number(
    read('PATHAO_STORE_ID') || (nodeEnv === 'production' || nodeEnv === 'staging' ? '' : '130903'),
  );

  if (nodeEnv === 'staging' || nodeEnv === 'production') {
    const required = {
      PATHAO_BASE_URL: baseUrl,
      PATHAO_CLIENT_ID: clientId,
      PATHAO_CLIENT_SECRET: clientSecret,
      PATHAO_USERNAME: username,
      PATHAO_PASSWORD: password,
      PATHAO_STORE_ID: Number.isInteger(storeId) && storeId > 0 ? String(storeId) : '',
    };
    const missing = Object.entries(required)
      .filter(([, value]) => value === '')
      .map(([key]) => key);

    if (missing.length > 0) {
      throw new Error(
        `Pathao courier credentials are not configured: ${missing.join(', ')}. Set them before dispatching to Pathao.`,
      );
    }
  }

  if (!Number.isInteger(storeId) || storeId <= 0) {
    throw new Error(
      'Pathao store id is not a positive integer. Set PATHAO_STORE_ID to the approved pickup store.',
    );
  }

  return {
    baseUrl,
    clientId,
    clientSecret,
    username,
    password,
    storeId,
  };
}

interface CachedToken {
  accessToken: string;
  expiresAt: string;
}

interface PathaoTokenResponse {
  token_type?: string;
  expires_in?: number;
  access_token?: string;
  refresh_token?: string;
  message?: string;
  type?: string;
}

export class PathaoTokenProvider {
  /** Resolved lazily so a test can stub the global before the first call. */
  constructor(
    private readonly fetchImpl: typeof fetch = (...args) => globalThis.fetch(...args),
    private readonly config: PathaoConfig = resolvePathaoConfig(),
  ) {}

  async getToken(): Promise<string> {
    const cached = await this.readCache();
    if (cached) return cached.accessToken;

    return this.requestToken();
  }

  private async readCache(): Promise<CachedToken | null> {
    try {
      const hit = await cacheRedis.get<CachedToken>(TOKEN_CACHE_KEY);
      if (!hit?.accessToken) return null;

      const expiresAt = new Date(hit.expiresAt).getTime();
      if (Number.isNaN(expiresAt)) return null;

      // Anything inside the refresh margin is treated as already spent.
      const stillUsable = expiresAt - Date.now() > PATHAO_TOKEN_REFRESH_MARGIN_SECONDS * 1000;
      if (!stillUsable) {
        logger.warn(
          { expiresAt: hit.expiresAt },
          'Cached Pathao token is within its refresh margin',
        );
        return null;
      }

      return hit;
    } catch {
      // A cache outage costs a round trip, not a dispatch.
      return null;
    }
  }

  private async requestToken(): Promise<string> {
    const response = await this.fetchImpl(`${this.config.baseUrl}${TOKEN_PATH}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'password',
        username: this.config.username,
        password: this.config.password,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    const body = (await response.json().catch(() => null)) as PathaoTokenResponse | null;

    if (!response.ok || body?.type === 'error') {
      throw new Error(
        `Pathao rejected the token request: ${body?.message ?? `HTTP ${response.status}`}`,
      );
    }

    const accessToken = body?.access_token;
    if (!accessToken) {
      throw new Error('Pathao returned a token response with no access_token');
    }

    await this.writeCache(accessToken, body?.expires_in ?? 3600);
    return accessToken;
  }

  private async writeCache(accessToken: string, expiresInSeconds: number): Promise<void> {
    const ttlSeconds = Math.max(1, expiresInSeconds - PATHAO_TOKEN_REFRESH_MARGIN_SECONDS);
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    try {
      await cacheRedis.set(TOKEN_CACHE_KEY, { accessToken, expiresAt } satisfies CachedToken, {
        ex: ttlSeconds,
      });
    } catch {
      // Next call re-authenticates. Never a reason to fail a dispatch.
    }
  }
}

export const pathaoTokenProvider = new PathaoTokenProvider();
