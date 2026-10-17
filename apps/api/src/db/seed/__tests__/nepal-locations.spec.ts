import { describe, expect, it } from 'vitest';

import {
  NEPAL_PROVINCES,
  NEPAL_DISTRICT_COUNT,
  VALLEY_DISTRICTS,
  valleyFreeDeliveryThreshold,
  outsideValleyFreeDeliveryThreshold,
  districtsOf,
} from '../nepal-locations';

describe('Nepal reference data', () => {
  it('lists the seven provinces', () => {
    expect(NEPAL_PROVINCES.map((p) => p.name).sort()).toEqual([
      'Bagmati',
      'Gandaki',
      'Karnali',
      'Koshi',
      'Lumbini',
      'Madhesh',
      'Sudur Paschim',
    ]);
  });

  it('has the district count the constitution sets out', () => {
    // 75 districts before 2015; Nawalparasi and Rukum were each split in two,
    // giving 77 across seven provinces.
    expect(NEPAL_DISTRICT_COUNT).toBe(77);
  });

  it('assigns every district to exactly one province', () => {
    const assigned = NEPAL_PROVINCES.flatMap((p) => p.districts);
    expect(assigned).toHaveLength(NEPAL_DISTRICT_COUNT);
    expect(new Set(assigned).size).toBe(NEPAL_DISTRICT_COUNT);
  });

  it('matches each province to its official district count', () => {
    const expected: Record<string, number> = {
      Koshi: 14,
      Madhesh: 8,
      Bagmati: 13,
      Gandaki: 11,
      Lumbini: 12,
      Karnali: 10,
      'Sudur Paschim': 9,
    };
    for (const province of NEPAL_PROVINCES) {
      expect(province.districts.length, province.name).toBe(expected[province.name]);
    }
  });

  it('lists the three valley districts only', () => {
    expect([...VALLEY_DISTRICTS].sort()).toEqual(['Bhaktapur', 'Kathmandu', 'Lalitpur']);
  });

  it('places every valley district inside Bagmati', () => {
    const bagmati = districtsOf('Bagmati');
    for (const district of VALLEY_DISTRICTS) {
      expect(bagmati, district).toContain(district);
    }
  });
});

describe('free delivery thresholds', () => {
  it('is lower in the valley than outside it', () => {
    // Delivery inside the valley is cheaper, so the promise can start lower.
    expect(valleyFreeDeliveryThreshold).toBe(2500);
    expect(outsideValleyFreeDeliveryThreshold).toBe(5000);
    expect(valleyFreeDeliveryThreshold).toBeLessThan(outsideValleyFreeDeliveryThreshold);
  });
});
