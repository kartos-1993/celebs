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

    return this.repo.updateAddress(addressId, userId, input);
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
