import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  PATHAO_TOKEN_REFRESH_MARGIN_SECONDS,
  PathaoTokenProvider,
  resolvePathaoConfig,
} from '../pathao-token.provider';

vi.mock('@/config/upstash.redis', () => ({
  cacheRedis: {
    get: vi.fn(async () => null),
    set: vi.fn(async () => null),
    del: vi.fn(async () => 0),
  },
}));

import { cacheRedis } from '@/config/upstash.redis';

const mockedRedis = vi.mocked(cacheRedis);

/**
 * Pathao issues a token with a five-day life and asks us to store it. The one
 * behaviour that matters here is that a token already held is reused: without it
 * every location call would spend a round trip authenticating first, and a
 * sync over a few hundred cities would turn into hundreds of logins.
 */

const okTokenResponse = {
  token_type: 'Bearer',
  expires_in: 432000,
  access_token: 'ACCESS-TOKEN-1',
  refresh_token: 'REFRESH-TOKEN-1',
};

const env = (values: Record<string, string | undefined>) => {
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('PATHAO_BASE_URL', 'https://courier-api-sandbox.pathao.com');
  vi.stubEnv('PATHAO_CLIENT_ID', 'client-id');
  vi.stubEnv('PATHAO_CLIENT_SECRET', 'client-secret');
  vi.stubEnv('PATHAO_USERNAME', 'test.parcel@pathao.com');
  vi.stubEnv('PATHAO_PASSWORD', 'lovePathao');
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) vi.stubEnv(key, '');
    else vi.stubEnv(key, value);
  }
};

const okFetch = (body: unknown = okTokenResponse, status = 200) => {
  const mock = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  return Object.assign(mock, { asFetch: mock as unknown as typeof fetch });
};

describe('resolvePathaoConfig', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('reads the sandbox host and credentials from the environment', () => {
    env({});

    expect(resolvePathaoConfig()).toEqual({
      baseUrl: 'https://courier-api-sandbox.pathao.com',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      username: 'test.parcel@pathao.com',
      password: 'lovePathao',
    });
  });

  // Pathao is a real courier holding real consignments. Shipping with a blank
  // secret would fail at the worst possible moment, so it is refused at boot.
  it('refuses to run in production without credentials', () => {
    env({ NODE_ENV: 'production', PATHAO_CLIENT_SECRET: '' });

    expect(() => resolvePathaoConfig()).toThrow(/PATHAO_CLIENT_SECRET/);
  });

  it('refuses to run in staging without a base url', () => {
    env({ NODE_ENV: 'staging', PATHAO_BASE_URL: '' });

    expect(() => resolvePathaoConfig()).toThrow(/PATHAO_BASE_URL/);
  });

  it('trims a trailing slash so paths do not double up', () => {
    env({ PATHAO_BASE_URL: 'https://api-hermes.pathao.com/' });

    expect(resolvePathaoConfig().baseUrl).toBe('https://api-hermes.pathao.com');
  });
});

describe('PathaoTokenProvider', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    env({});
    mockedRedis.get.mockResolvedValue(null);
    mockedRedis.set.mockResolvedValue(undefined);
  });

  it('asks Pathao for a token with the documented password-grant payload', async () => {
    const fetchMock = okFetch();
    vi.stubGlobal('fetch', fetchMock);

    const token = await new PathaoTokenProvider(fetchMock).getToken();

    expect(token).toBe('ACCESS-TOKEN-1');

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://courier-api-sandbox.pathao.com/aladdin/api/v1/issue-token');
    expect(JSON.parse(String(init.body))).toEqual({
      client_id: 'client-id',
      client_secret: 'client-secret',
      grant_type: 'password',
      username: 'test.parcel@pathao.com',
      password: 'lovePathao',
    });
  });

  it('reuses a cached token instead of authenticating again', async () => {
    const fetchMock = okFetch();
    vi.stubGlobal('fetch', fetchMock);
    mockedRedis.get.mockResolvedValue({
      accessToken: 'CACHED-TOKEN',
      expiresAt: new Date(Date.now() + 432000_000).toISOString(),
    });

    const token = await new PathaoTokenProvider(fetchMock).getToken();

    expect(token).toBe('CACHED-TOKEN');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refreshes a cached token that is about to expire', async () => {
    const fetchMock = okFetch();
    vi.stubGlobal('fetch', fetchMock);
    mockedRedis.get.mockResolvedValue({
      accessToken: 'NEARLY-EXPIRED',
      expiresAt: new Date(Date.now() + PATHAO_TOKEN_REFRESH_MARGIN_SECONDS * 500).toISOString(),
    });

    const token = await new PathaoTokenProvider(fetchMock).getToken();

    expect(token).toBe('ACCESS-TOKEN-1');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('caches the token for its lifetime less a safety margin', async () => {
    const fetchMock = okFetch();
    vi.stubGlobal('fetch', fetchMock);

    await new PathaoTokenProvider(fetchMock).getToken();

    const [, , options] = mockedRedis.set.mock.calls[0] as unknown as [
      string,
      unknown,
      { ex: number },
    ];
    expect(options.ex).toBe(okTokenResponse.expires_in - PATHAO_TOKEN_REFRESH_MARGIN_SECONDS);
  });

  // A cache outage must not stop us shipping. The token is still obtainable from
  // Pathao directly; only the optimisation is lost.
  it('falls back to Pathao when the cache is unavailable', async () => {
    const fetchMock = okFetch();
    vi.stubGlobal('fetch', fetchMock);
    mockedRedis.get.mockRejectedValue(new Error('redis down'));

    const token = await new PathaoTokenProvider(fetchMock).getToken();

    expect(token).toBe('ACCESS-TOKEN-1');
  });

  it('reports that Pathao rejected the credentials', async () => {
    const fetchMock = okFetch(
      { message: 'The user credentials were incorrect', type: 'error' },
      400,
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(new PathaoTokenProvider(fetchMock).getToken()).rejects.toThrow(
      /The user credentials were incorrect/,
    );
  });

  it('never caches a rejected token', async () => {
    const fetchMock = okFetch({ message: 'nope', type: 'error' }, 400);
    vi.stubGlobal('fetch', fetchMock);

    await expect(new PathaoTokenProvider(fetchMock).getToken()).rejects.toThrow();

    expect(mockedRedis.set).not.toHaveBeenCalled();
  });

  it('surfaces a transport failure rather than pretending to have a token', async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error('ENOTFOUND');
    }) as unknown as typeof fetch;
    vi.stubGlobal('fetch', fetchMock);

    await expect(new PathaoTokenProvider(fetchMock).getToken()).rejects.toThrow(/ENOTFOUND/);
  });
});
