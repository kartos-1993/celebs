import { describe, expect, it } from 'vitest';

import { classifyCoverage, COVERAGE_MESSAGES } from '../delivery-coverage';

describe('classifyCoverage', () => {
  const coveredZone = {
    id: 'zone-1',
    name: 'Kathmandu',
    isActive: true,
    city: { id: 'city-1', name: 'Kathmandu', isValley: true, isActive: true },
  };

  it('reports COVERED for an active zone that maps to an active city', () => {
    const result = classifyCoverage({ logisticsZoneId: 'zone-1', zone: coveredZone });
    expect(result.status).toBe('COVERED');
  });

  it('carries the zone classification the free-delivery threshold keys off', () => {
    const result = classifyCoverage({ logisticsZoneId: 'zone-1', zone: coveredZone });
    expect(result.isValley).toBe(true);
    expect(result.zoneId).toBe('zone-1');
    expect(result.cityName).toBe('Kathmandu');
  });

  it('reports UNCOVERED for a zone the courier has deactivated', () => {
    // A retired zone still sits on historical orders, so it must not be treated
    // as deliverable for a new one.
    const result = classifyCoverage({
      logisticsZoneId: 'zone-1',
      zone: { ...coveredZone, isActive: false },
    });
    expect(result.status).toBe('UNCOVERED');
  });

  it('reports UNCOVERED when the zone belongs to a deactivated city', () => {
    const result = classifyCoverage({
      logisticsZoneId: 'zone-1',
      zone: { ...coveredZone, city: { ...coveredZone.city, isActive: false } },
    });
    expect(result.status).toBe('UNCOVERED');
  });

  // The dangerous case. An address typed before the picker existed, or written
  // by an older client, has no zone. Reading that as covered would create a
  // real shipment to an address the courier has never confirmed.
  it('reports UNVERIFIED for an address with no mapped zone', () => {
    const result = classifyCoverage({ logisticsZoneId: null, zone: null });
    expect(result.status).toBe('UNVERIFIED');
  });

  it('reports UNVERIFIED when a zone id is set but the zone is missing', () => {
    // Points at a zone that has since been deleted from the mirror.
    const result = classifyCoverage({ logisticsZoneId: 'zone-gone', zone: null });
    expect(result.status).toBe('UNVERIFIED');
  });

  it('reports UNVERIFIED when the location mirror has never been synced', () => {
    // Nothing to check against is not the same as "not deliverable", and it must
    // never be presented to a customer as though we know we do not deliver.
    const result = classifyCoverage({
      logisticsZoneId: null,
      zone: null,
      mirrorIsEmpty: true,
    });
    expect(result.status).toBe('UNVERIFIED');
  });

  it('reports UNVERIFIED when the location mirror is stale', () => {
    // A mirror older than the staleness limit cannot be trusted to say a zone
    // is still covered.
    const result = classifyCoverage({
      logisticsZoneId: null,
      zone: null,
      mirrorIsStale: true,
    });
    expect(result.status).toBe('UNVERIFIED');
  });
});

describe('COVERAGE_MESSAGES', () => {
  it('gives a distinct, honest message for each state', () => {
    // UNVERIFIED and UNCOVERED must not read the same: one means we do not
    // deliver there, the other means we cannot tell yet.
    const messages = [
      COVERAGE_MESSAGES.COVERED,
      COVERAGE_MESSAGES.UNCOVERED,
      COVERAGE_MESSAGES.UNVERIFIED,
    ];
    expect(new Set(messages).size).toBe(3);
  });

  it('does not blame the customer for a state we cannot verify', () => {
    expect(COVERAGE_MESSAGES.UNVERIFIED).not.toMatch(/not available|invalid|incorrect/i);
  });
});
