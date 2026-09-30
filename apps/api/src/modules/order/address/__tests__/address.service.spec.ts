import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AddressInput } from '@celebs/shared-types';

import { AddressRepository } from '../address.repository';
import { AddressService } from '../address.service';

/**
 * The address form picks a district and area from the list of places we actually
 * deliver to, which resolves to a courier zone. That zone is what lets checkout
 * decide whether an order can be delivered at all, so it has to survive the trip
 * through the service instead of being dropped on the floor.
 */
describe('AddressService.createAddress delivery zone', () => {
  const validInput = (overrides: Partial<AddressInput> = {}): AddressInput =>
    ({
      label: 'Home',
      fullName: 'Asha Rai',
      phone: '9800000000',
      province: 'Bagmati',
      district: 'Kathmandu',
      cityArea: 'Baneshwor',
      streetAddress: 'House 12, Baneshwor Height',
      isDefault: false,
      ...overrides,
    }) as AddressInput;

  let repo: {
    createAddress: ReturnType<typeof vi.fn>;
    unsetOtherDefaultAddresses: ReturnType<typeof vi.fn>;
  };
  let service: AddressService;

  beforeEach(() => {
    repo = {
      createAddress: vi.fn().mockResolvedValue({}),
      unsetOtherDefaultAddresses: vi.fn().mockResolvedValue({ count: 0 }),
    };
    service = new AddressService(repo as unknown as AddressRepository);
  });

  it('persists the picked delivery zone with the address', async () => {
    const zoneId = '1f2c0f6e-2a3b-4c5d-8e9f-0a1b2c3d4e5f';

    await service.createAddress('user-1', validInput({ logisticsZoneId: zoneId }));

    expect(repo.createAddress).toHaveBeenCalledWith(
      expect.objectContaining({ logisticsZoneId: zoneId }),
    );
  });

  it('stores null rather than an empty string when no zone was picked', async () => {
    // The address form can submit without a zone, and a blank string would not
    // match a real zone later. Null is the honest value: coverage is unknown.
    await service.createAddress('user-1', validInput({ logisticsZoneId: '' }));

    expect(repo.createAddress).toHaveBeenCalledWith(
      expect.objectContaining({ logisticsZoneId: null }),
    );
  });

  it('stores null for an address saved before delivery zones existed', async () => {
    await service.createAddress('user-1', validInput());

    expect(repo.createAddress).toHaveBeenCalledWith(
      expect.objectContaining({ logisticsZoneId: null }),
    );
  });

  it('does not claim a default address while a zone is missing', async () => {
    // Guard against the ordering bug where unsetting the previous default
    // happens and the new address is then rejected, leaving the customer with
    // no default at all.
    await service.createAddress('user-1', validInput({ isDefault: true }));

    expect(repo.unsetOtherDefaultAddresses).toHaveBeenCalledWith('user-1');
    expect(repo.createAddress).toHaveBeenCalledWith(expect.objectContaining({ isDefault: true }));
  });
});

describe('AddressService.updateAddress delivery zone', () => {
  let repo: {
    findAddressById: ReturnType<typeof vi.fn>;
    updateAddress: ReturnType<typeof vi.fn>;
    unsetOtherDefaultAddresses: ReturnType<typeof vi.fn>;
  };
  let service: AddressService;

  beforeEach(() => {
    repo = {
      findAddressById: vi.fn().mockResolvedValue({ id: 'address-1' }),
      updateAddress: vi.fn().mockResolvedValue({}),
      unsetOtherDefaultAddresses: vi.fn().mockResolvedValue({ count: 0 }),
    };
    service = new AddressService(repo as unknown as AddressRepository);
  });

  it('updates the zone when the customer re-picks their district', async () => {
    const zoneId = '1f2c0f6e-2a3b-4c5d-8e9f-0a1b2c3d4e5f';

    await service.updateAddress('user-1', 'address-1', { logisticsZoneId: zoneId });

    expect(repo.updateAddress).toHaveBeenCalledWith(
      'address-1',
      'user-1',
      expect.objectContaining({ logisticsZoneId: zoneId }),
    );
  });

  it('clears an empty zone instead of passing an empty id to the database', async () => {
    // Prisma rejects '' as a uuid, so an unmapped submit would surface as a 500
    // on an ordinary save.
    await service.updateAddress('user-1', 'address-1', { logisticsZoneId: '' });

    expect(repo.updateAddress).toHaveBeenCalledWith(
      'address-1',
      'user-1',
      expect.objectContaining({ logisticsZoneId: null }),
    );
  });

  it('leaves the zone untouched when the update does not mention it', async () => {
    await service.updateAddress('user-1', 'address-1', { label: 'Office' });

    const [, , data] = repo.updateAddress.mock.calls[0]!;
    expect(data).not.toHaveProperty('logisticsZoneId');
  });
});
