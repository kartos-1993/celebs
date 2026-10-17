import { describe, expect, it } from 'vitest';

import { syntheticZoneExternalId } from '../seed-logistics-locations';
import { NEPAL_PROVINCES } from '../nepal-locations';

/**
 * LogisticsZone.externalId is one global unique column shared with the ids the
 * courier issues, and the courier sync upserts on it. A bootstrap zone therefore
 * needs a value that is stable across environments and that a courier can never
 * be issued, so the two ranges cannot meet.
 */
describe('syntheticZoneExternalId', () => {
  it('gives the same district the same id every time', () => {
    expect(syntheticZoneExternalId('Bagmati', 'Kathmandu')).toBe(
      syntheticZoneExternalId('Bagmati', 'Kathmandu'),
    );
  });

  it('ignores casing and surrounding whitespace in the district name', () => {
    expect(syntheticZoneExternalId('bagmati', '  kathmandu ')).toBe(
      syntheticZoneExternalId('Bagmati', 'Kathmandu'),
    );
  });

  // Derived from a generated uuid, the id for a district differed between a
  // developer's machine and staging, so nothing could assume a value for it.
  it('derives the id from the district rather than from a generated row id', () => {
    expect(syntheticZoneExternalId('Bagmati', 'Kathmandu')).toBe(
      syntheticZoneExternalId('Bagmati', 'Kathmandu'),
    );
  });

  it('stays negative so it can never be issued by a courier', () => {
    const id = syntheticZoneExternalId('Bagmati', 'Kathmandu');

    expect(id).toBeLessThan(0);
  });

  it('fits a 32-bit signed integer', () => {
    for (const province of NEPAL_PROVINCES) {
      for (const district of province.districts) {
        const id = syntheticZoneExternalId(province.name, district);

        expect(Number.isInteger(id)).toBe(true);
        expect(id).toBeGreaterThanOrEqual(-2147483648);
        expect(id).toBeLessThanOrEqual(2147483647);
      }
    }
  });

  // The previous scheme hashed the city uuid into 900k values and only claimed
  // distinctness. Two districts sharing a name across provinces are exactly the
  // case a text-derived hash has to get right.
  it('gives every district in Nepal a distinct id', () => {
    const seen = new Map<number, string>();

    for (const province of NEPAL_PROVINCES) {
      for (const district of province.districts) {
        const id = syntheticZoneExternalId(province.name, district);
        const key = `${province.name}/${district}`;
        const previous = seen.get(id);

        expect(previous, `${key} collides with ${previous}`).toBeUndefined();
        seen.set(id, key);
      }
    }

    expect(seen.size).toBe(
      NEPAL_PROVINCES.reduce((total, province) => total + province.districts.length, 0),
    );
  });

  it('separates districts that share a name in different provinces', () => {
    const shared = NEPAL_PROVINCES.flatMap((province) =>
      province.districts.map((district) => ({
        province: province.name,
        district,
      })),
    ).filter((entry, index, all) =>
      all.some((other) => other.district === entry.district && other.province !== entry.province),
    );

    // The reference data is expected to contain such a district; the rule has to
    // hold whether or not it does today.
    for (const entry of shared) {
      const elsewhere = shared.find(
        (other) => other.district === entry.district && other.province !== entry.province,
      );

      expect(syntheticZoneExternalId(entry.province, entry.district)).not.toBe(
        syntheticZoneExternalId(elsewhere!.province, elsewhere!.district),
      );
    }
  });
});
