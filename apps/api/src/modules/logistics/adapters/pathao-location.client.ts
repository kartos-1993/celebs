import { logger } from '@celebs/shared-utils';

import type {
  CourierLocationClient,
  ExternalArea,
  ExternalCity,
  ExternalZone,
} from '../logistics-location-sync.service';

import { PathaoTokenProvider, resolvePathaoConfig } from './pathao-token.provider';

/**
 * Reads Pathao's city / zone / area lists.
 *
 * These three reads are the only courier data a sync consumes, and their results
 * are fed to a reconciliation that retires districts the courier no longer
 * serves. That gives one rule which outranks the rest of this file: a payload
 * that is not shaped the way Pathao documents is refused, never read as an empty
 * list. "This city has no zones" is a fact worth acting on; "we could not parse
 * the response" must not be allowed to retire real coverage.
 *
 * Pathao returns its lists under `data.data`, and does not echo the parent id
 * back on a zone or an area, so the requested parent is stamped onto each entry.
 */

const CITY_LIST_PATH = '/aladdin/api/v1/city-list';
const zoneListPath = (cityId: number) => `/aladdin/api/v1/cities/${cityId}/zone-list`;
const areaListPath = (zoneId: number) => `/aladdin/api/v1/zones/${zoneId}/area-list`;

interface PathaoListEnvelope {
  message?: string;
  type?: string;
  code?: number;
  data?: { data?: unknown };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** An id the courier assigned, or a payload we do not recognise. */
const readId = (entry: Record<string, unknown>, key: string): number => {
  const value = entry[key];
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(`Pathao ${key} is missing or not an integer`);
  }
  return value;
};

const readName = (entry: Record<string, unknown>, key: string): string => {
  const value = entry[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Pathao ${key} is missing or empty`);
  }
  return value.trim();
};

export class PathaoLocationClient implements CourierLocationClient {
  constructor(
    private readonly tokens: PathaoTokenProvider,
    private readonly fetchImpl: typeof fetch = (...args) => globalThis.fetch(...args),
    private readonly baseUrl: string = resolvePathaoConfig().baseUrl,
  ) {}

  async listCities(): Promise<ExternalCity[]> {
    return this.readEntries(CITY_LIST_PATH, 'city-list', (entry) => ({
      id: readId(entry, 'city_id'),
      name: readName(entry, 'city_name'),
      province: '',
    }));
  }

  async listZones(cityId: number): Promise<ExternalZone[]> {
    return this.readEntries(zoneListPath(cityId), 'zone-list', (entry) => ({
      id: readId(entry, 'zone_id'),
      // The courier does not echo the parent city on a zone, so the one we asked
      // for is authoritative.
      cityId,
      name: readName(entry, 'zone_name'),
    }));
  }

  async listAreas(zoneId: number): Promise<ExternalArea[]> {
    return this.readEntries(areaListPath(zoneId), 'area-list', (entry) => ({
      id: readId(entry, 'area_id'),
      zoneId,
      name: readName(entry, 'area_name'),
    }));
  }

  /**
   * Reads a list and maps each entry, naming the offending endpoint in any error.
   *
   * The label is carried into the message deliberately: a sync walks hundreds of
   * calls, and "zone_id is missing" without knowing which call produced it is not
   * enough to act on.
   */
  private async readEntries<T>(
    path: string,
    label: string,
    parse: (entry: Record<string, unknown>) => T,
  ): Promise<T[]> {
    const raw = await this.readList(path, label);

    return raw.map((entry) => {
      if (!isRecord(entry)) {
        throw new Error(`Pathao ${label} returned an entry that is not an object`);
      }
      try {
        return parse(entry);
      } catch (error) {
        throw new Error(`Pathao ${label}: ${(error as Error).message}`);
      }
    });
  }

  /** Reads `data.data` and refuses anything that is not a list of entries. */
  private async readList(path: string, label: string): Promise<unknown[]> {
    const token = await this.tokens.getToken();

    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });

    let body: PathaoListEnvelope | null = null;
    try {
      body = (await response.json()) as PathaoListEnvelope;
    } catch {
      body = null;
    }

    if (!response.ok || body?.type === 'error') {
      throw new Error(
        `Pathao ${label} request failed: ${body?.message ?? `HTTP ${response.status}`}`,
      );
    }

    const entries = body?.data?.data;

    if (!Array.isArray(entries)) {
      // Refused rather than treated as empty: an empty list is something the
      // reconciliation is allowed to act on, and this is not it.
      logger.error({ path, label }, 'Pathao list payload was not the documented shape');
      throw new Error(
        `Pathao ${label} did not return a list; refusing to treat it as empty coverage`,
      );
    }

    return entries;
  }
}
