import type { AddressInput, UpdateAddressInput } from '@celebs/shared-types';
import { AppError, ErrorCode, HTTPSTATUS } from '@celebs/shared-utils';

import { AddressRepository, addressRepository } from './address.repository';

export class AddressService {
  constructor(private readonly repo: AddressRepository = addressRepository) {}

  async getUserAddresses(userId: string) {
    return this.repo.findAddressesByUser(userId);
  }

  async createAddress(userId: string, input: AddressInput) {
    if (input.isDefault) {
      await this.repo.unsetOtherDefaultAddresses(userId);
    }

    return this.repo.createAddress({
      userId,
      fullName: input.fullName,
      phone: input.phone,
      province: input.province,
      district: input.district,
      cityArea: input.cityArea,
      streetAddress: input.streetAddress,
      landmark: input.landmark,
      // Persisted so the address can be matched to a courier zone later. An
      // address saved without one still works, but checkout will ask the
      // customer to re-pick their district because coverage cannot be confirmed.
      logisticsZoneId: input.logisticsZoneId || null,
      label: input.label,
      isDefault: input.isDefault ?? false,
    });
  }

  async updateAddress(userId: string, addressId: string, input: UpdateAddressInput) {
    const existing = await this.repo.findAddressById(addressId, userId);
    if (!existing) {
      throw new AppError('Address not found', HTTPSTATUS.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND);
    }

    if (input.isDefault) {
      await this.repo.unsetOtherDefaultAddresses(userId, addressId);
    }

    return this.repo.updateAddress(addressId, userId, {
      ...input,
      // The form can submit an empty zone, and the shared schema accepts ''.
      // Prisma has no such thing as an empty-string id, so normalise the same
      // way create does — otherwise editing a legacy address returns a 500
      // instead of saving.
      ...(input.logisticsZoneId !== undefined
        ? { logisticsZoneId: input.logisticsZoneId || null }
        : {}),
    });
  }

  async deleteAddress(userId: string, addressId: string) {
    const existing = await this.repo.findAddressById(addressId, userId);
    if (!existing) {
      throw new AppError('Address not found', HTTPSTATUS.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND);
    }

    return this.repo.deleteAddress(addressId);
  }
}

export const addressService = new AddressService();
