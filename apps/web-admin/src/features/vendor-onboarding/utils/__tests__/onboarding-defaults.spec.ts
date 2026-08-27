import { describe, expect, it } from 'vitest';

import type { VendorProfileData } from '@celebs/shared-types';

import {
  getBusinessInfoDefaultValues,
  getDocumentsDefaultValues,
  getProfileDefaultValues,
  getWarehouseDefaultValues,
} from '../onboarding-defaults';

describe('Vendor Onboarding Default Mappers', () => {
  describe('getProfileDefaultValues', () => {
    it('returns empty strings when profile is undefined or null', () => {
      expect(getProfileDefaultValues(undefined)).toEqual({
        shopDescription: '',
        phoneNumber: '',
        storeLogo: '',
      });
      expect(getProfileDefaultValues(null)).toEqual({
        shopDescription: '',
        phoneNumber: '',
        storeLogo: '',
      });
    });

    it('populates fields when profile data is provided', () => {
      const mockProfile = {
        shopDescription: 'A premier boutique store',
        phoneNumber: '9800000000',
        storeLogo: 'https://cdn.example.com/logo.png',
      } as VendorProfileData;

      expect(getProfileDefaultValues(mockProfile)).toEqual({
        shopDescription: 'A premier boutique store',
        phoneNumber: '9800000000',
        storeLogo: 'https://cdn.example.com/logo.png',
      });
    });
  });

  describe('getWarehouseDefaultValues', () => {
    it('returns default fallback values when profile and warehouses are empty', () => {
      const defaults = getWarehouseDefaultValues(undefined, 'John Doe');
      expect(defaults).toEqual({
        label: 'Main Warehouse',
        contactName: 'John Doe',
        contactPhone: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        district: '',
        province: '',
        postalCode: '',
      });
    });

    it('falls back to vendor phoneNumber if warehouse contactPhone is absent', () => {
      const mockProfile = {
        phoneNumber: '9811111111',
        warehouses: [
          {
            label: 'Central Hub',
            addressLine1: 'Main Street',
            city: 'Kathmandu',
            district: 'Kathmandu',
            province: 'Bagmati',
          },
        ],
      } as unknown as VendorProfileData;

      const defaults = getWarehouseDefaultValues(mockProfile, 'FallBack User');
      expect(defaults.label).toBe('Central Hub');
      expect(defaults.contactName).toBe('FallBack User');
      expect(defaults.contactPhone).toBe('9811111111');
      expect(defaults.city).toBe('Kathmandu');
    });

    it('uses primary warehouse details when available', () => {
      const mockProfile = {
        phoneNumber: '9800000000',
        warehouses: [
          {
            label: 'East Warehouse',
            contactName: 'Warehouse Manager',
            contactPhone: '9822222222',
            addressLine1: 'Road 12',
            addressLine2: 'Block B',
            city: 'Biratnagar',
            district: 'Morang',
            province: 'Koshi',
            postalCode: '56600',
          },
        ],
      } as unknown as VendorProfileData;

      const defaults = getWarehouseDefaultValues(mockProfile, 'Ignore Me');
      expect(defaults).toEqual({
        label: 'East Warehouse',
        contactName: 'Warehouse Manager',
        contactPhone: '9822222222',
        addressLine1: 'Road 12',
        addressLine2: 'Block B',
        city: 'Biratnagar',
        district: 'Morang',
        province: 'Koshi',
        postalCode: '56600',
      });
    });
  });

  describe('getDocumentsDefaultValues', () => {
    it('returns empty strings when documents are not uploaded yet', () => {
      expect(getDocumentsDefaultValues(undefined)).toEqual({
        panDocumentUrl: '',
        citizenshipDocumentUrl: '',
        vatDocumentUrl: '',
        businessRegDocumentUrl: '',
        ownerPhotoUrl: '',
      });
    });

    it('returns document URLs when present in profile', () => {
      const mockProfile = {
        panDocumentUrl: 'https://cdn.example.com/pan.jpg',
        citizenshipDocumentUrl: 'https://cdn.example.com/cit.jpg',
        vatDocumentUrl: 'https://cdn.example.com/vat.jpg',
        businessRegDocumentUrl: 'https://cdn.example.com/reg.jpg',
        ownerPhotoUrl: 'https://cdn.example.com/owner.jpg',
      } as VendorProfileData;

      expect(getDocumentsDefaultValues(mockProfile)).toEqual({
        panDocumentUrl: 'https://cdn.example.com/pan.jpg',
        citizenshipDocumentUrl: 'https://cdn.example.com/cit.jpg',
        vatDocumentUrl: 'https://cdn.example.com/vat.jpg',
        businessRegDocumentUrl: 'https://cdn.example.com/reg.jpg',
        ownerPhotoUrl: 'https://cdn.example.com/owner.jpg',
      });
    });
  });

  describe('getBusinessInfoDefaultValues', () => {
    it('returns empty strings when profile is undefined', () => {
      expect(getBusinessInfoDefaultValues(undefined)).toEqual({
        businessName: '',
        businessRegNumber: '',
        businessPhoneNumber: '',
      });
    });

    it('falls back to profile phoneNumber if businessPhoneNumber is missing', () => {
      const mockProfile = {
        businessName: 'Acme Traders',
        businessRegNumber: '600123456',
        phoneNumber: '9844444444',
      } as VendorProfileData;

      expect(getBusinessInfoDefaultValues(mockProfile)).toEqual({
        businessName: 'Acme Traders',
        businessRegNumber: '600123456',
        businessPhoneNumber: '9844444444',
      });
    });

    it('uses businessPhoneNumber when explicitly provided', () => {
      const mockProfile = {
        businessName: 'Acme Traders',
        businessRegNumber: '600123456',
        phoneNumber: '9844444444',
        businessPhoneNumber: '9855555555',
      } as VendorProfileData;

      expect(getBusinessInfoDefaultValues(mockProfile)).toEqual({
        businessName: 'Acme Traders',
        businessRegNumber: '600123456',
        businessPhoneNumber: '9855555555',
      });
    });
  });
});
