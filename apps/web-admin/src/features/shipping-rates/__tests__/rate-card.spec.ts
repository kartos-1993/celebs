import { describe, expect, it } from 'vitest';

import { MAX_QUOTABLE_PARCEL_KG } from '@celebs/shared-types';

import {
  type BandDraft,
  GENERAL_CITY,
  toRatePayload,
  validateBand,
  validateThreshold,
} from '../lib/rate-card';

const band = (over: Partial<BandDraft> = {}): BandDraft => ({
  id: null,
  cityId: GENERAL_CITY,
  minWeightKg: '0',
  maxWeightKg: '1',
  fee: '80',
  codFee: '',
  ...over,
});

describe('rate card form validation', () => {
  it('accepts a well-formed band', () => {
    expect(validateBand(band())).toEqual([]);
  });

  it('rejects a band with no width', () => {
    // Matches no parcel, so it prices nothing and looks like it is working.
    expect(validateBand(band({ minWeightKg: '2', maxWeightKg: '2' }))).toContain(
      'Maximum weight must be greater than minimum weight.',
    );
  });

  it('rejects an inverted band', () => {
    expect(validateBand(band({ minWeightKg: '5', maxWeightKg: '1' }))).not.toEqual([]);
  });

  it('rejects a band above the courier maximum', () => {
    expect(validateBand(band({ maxWeightKg: String(MAX_QUOTABLE_PARCEL_KG + 1) }))).toContain(
      `Cannot quote above ${MAX_QUOTABLE_PARCEL_KG} kg.`,
    );
  });

  it('rejects an empty required field rather than saving zero', () => {
    expect(validateBand(band({ fee: '  ' }))).toContain('Fee is required.');
    expect(validateBand(band({ minWeightKg: '' }))).toContain('Minimum weight is required.');
  });

  it('rejects a negative price', () => {
    expect(validateBand(band({ fee: '-10' }))).toContain('Fee is required.');
  });

  it('treats an empty cash on delivery fee as none', () => {
    expect(validateBand(band({ codFee: '' }))).toEqual([]);
    expect(toRatePayload(band({ codFee: '' })).codFee).toBe(0);
  });

  it('allows a parcel weight with three decimals, matching the stored precision', () => {
    expect(validateBand(band({ minWeightKg: '0.001', maxWeightKg: '2.675' }))).toEqual([]);
    expect(toRatePayload(band({ maxWeightKg: '2.675' })).maxWeightKg).toBe(2.675);
  });

  it('sends the general city as null, which is what makes a band apply everywhere', () => {
    expect(toRatePayload(band()).cityId).toBeNull();
  });

  it('sends a chosen city by id', () => {
    const cityId = '1f2c0f6e-2a3b-4c5d-8e9f-0a1b2c3d4e5f';

    expect(toRatePayload(band({ cityId })).cityId).toBe(cityId);
  });
});

describe('free delivery threshold validation', () => {
  it('accepts a whole amount', () => {
    expect(validateThreshold('2500')).toBeNull();
    expect(validateThreshold('5000')).toBeNull();
  });

  it('rejects a fraction of a rupee', () => {
    expect(validateThreshold('2500.50')).toMatch(/whole/i);
  });

  it('rejects a threshold low enough to make every order free', () => {
    // One digit typed by accident would waive delivery on the whole catalogue.
    expect(validateThreshold('1')).toMatch(/at least/i);
    expect(validateThreshold('0')).toMatch(/at least/i);
  });

  it('rejects a negative threshold', () => {
    expect(validateThreshold('-2500')).not.toBeNull();
  });

  it('rejects an empty value', () => {
    expect(validateThreshold('')).toMatch(/enter/i);
  });
});
