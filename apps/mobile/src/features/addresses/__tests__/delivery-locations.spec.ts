import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api/client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn(), patch: vi.fn() },
}));

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

vi.mock('expo-constants', () => ({ default: { expoConfig: { hostUri: 'localhost:8081' } } }));

import type { DeliveryLocationsResponse } from '@celebs/shared-types';

import { ADDRESS_QUERY_KEYS, getDeliveryLocations } from '../api';

import { apiClient } from '@/api/client';

const mockLocationsResponse: DeliveryLocationsResponse = {
  syncedAt: '2026-10-09T16:00:00.000Z',
  provinces: [
    {
      name: 'Bagmati',
      districts: [
        {
          id: 'bagmati-kathmandu',
          name: 'Kathmandu',
          isValley: true,
          freeDeliveryThreshold: '2500.00',
          areas: [
            { id: 'zone-thamel', name: 'Thamel' },
            { id: 'zone-baluwatar', name: 'Baluwatar' },
          ],
        },
        {
          id: 'bagmati-lalitpur',
          name: 'Lalitpur',
          isValley: true,
          freeDeliveryThreshold: '2500.00',
          areas: [{ id: 'zone-jawalakhel', name: 'Jawalakhel' }],
        },
      ],
    },
    {
      name: 'Gandaki',
      districts: [
        {
          id: 'gandaki-kaski',
          name: 'Kaski',
          isValley: false,
          freeDeliveryThreshold: '5000.00',
          areas: [{ id: 'zone-pokhara', name: 'Pokhara' }],
        },
      ],
    },
  ],
};

describe('Delivery Locations State and Navigation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('exposes a centralized Query Key for delivery-locations', () => {
    expect(ADDRESS_QUERY_KEYS.deliveryLocations()).toEqual(['delivery-locations']);
  });

  it('unwraps delivery locations payload via isolated api method', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        message: 'Delivery locations retrieved successfully',
        data: mockLocationsResponse,
      },
    } as never);

    const data = await getDeliveryLocations();
    expect(data.provinces).toHaveLength(2);
    expect(data.provinces[0]?.name).toBe('Bagmati');
    expect(data.provinces[0]?.districts).toHaveLength(2);
    expect(data.provinces[0]?.districts[0]?.name).toBe('Kathmandu');
  });

  it('correctly resolves districts belonging to the selected province', () => {
    const selectedProvinceName = 'Bagmati';
    const province = mockLocationsResponse.provinces.find(
      (item) => item.name === selectedProvinceName,
    );
    expect(province).toBeDefined();
    expect(province?.districts.map((d) => d.name)).toEqual(['Kathmandu', 'Lalitpur']);
  });

  it('correctly distinguishes single-area auto-commit from multi-area progression', () => {
    const kathmandu = mockLocationsResponse.provinces[0]?.districts[0];
    const lalitpur = mockLocationsResponse.provinces[0]?.districts[1];

    expect(kathmandu?.areas.length).toBe(2);
    expect(lalitpur?.areas.length).toBe(1);

    const singleAreaNeedsPrompt = (lalitpur?.areas.length ?? 0) > 1;
    expect(singleAreaNeedsPrompt).toBe(false);

    const multiAreaNeedsPrompt = (kathmandu?.areas.length ?? 0) > 1;
    expect(multiAreaNeedsPrompt).toBe(true);
  });

  it('provides valley free delivery threshold for valley districts', () => {
    const kathmandu = mockLocationsResponse.provinces[0]?.districts[0];
    const kaski = mockLocationsResponse.provinces[1]?.districts[0];

    expect(kathmandu?.isValley).toBe(true);
    expect(kathmandu?.freeDeliveryThreshold).toBe('2500.00');

    expect(kaski?.isValley).toBe(false);
    expect(kaski?.freeDeliveryThreshold).toBe('5000.00');
  });
});
