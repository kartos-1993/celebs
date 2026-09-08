import type { Request, Response } from 'express';

import { addressSchema, updateAddressSchema } from '@celebs/shared-types';

import { AddressService, addressService } from './address.service';

import { sendCreated, sendSuccess } from '@/common/utils/response.util';

export class AddressController {
  constructor(private readonly service: AddressService = addressService) {}

  getUserAddresses = async (req: Request, res: Response) => {
    const userId = req.user?.id || '';
    const addresses = await this.service.getUserAddresses(userId);
    return sendSuccess(res, addresses, 'Addresses fetched successfully');
  };

  createAddress = async (req: Request, res: Response) => {
    const userId = req.user?.id || '';
    const validated = addressSchema.parse(req.body);
    const address = await this.service.createAddress(userId, validated);
    return sendCreated(res, address, 'Address created successfully');
  };

  updateAddress = async (req: Request, res: Response) => {
    const userId = req.user?.id || '';
    const addressId = req.params.addressId || '';
    const validated = updateAddressSchema.parse(req.body);
    const address = await this.service.updateAddress(userId, addressId, validated);
    return sendSuccess(res, address, 'Address updated successfully');
  };

  deleteAddress = async (req: Request, res: Response) => {
    const userId = req.user?.id || '';
    const addressId = req.params.addressId || '';
    await this.service.deleteAddress(userId, addressId);
    return sendSuccess(res, null, 'Address deleted successfully');
  };
}

export const addressController = new AddressController();
