import { describe, expect, it } from 'vitest';

import { isValleyCityName } from '../logistics-location-sync.service';

describe('isValleyCityName', () => {
  // This classification decides whether the free-delivery threshold is 2,500 or
  // 5,000, so a misclassification either under-promises or silently overcharges.
  it('recognises the valley cities', () => {
    for (const name of ['Kathmandu', 'Lalitpur', 'Bhaktapur', 'Kirtipur']) {
      expect(isValleyCityName(name), name).toBe(true);
    }
  });

  it('ignores casing, spacing and common naming variants', () => {
    for (const name of ['kathmandu', '  KATHMANDU ', 'KTM', 'Lalitpur Metropolitan', 'Bhaktapur']) {
      expect(isValleyCityName(name), name).toBe(true);
    }
  });

  it('does not treat the rest of the country as valley', () => {
    for (const name of ['Pokhara', 'Biratnagar', 'Butwal', 'Nepalgunj', 'Bharatpur', 'Dhangadhi']) {
      expect(isValleyCityName(name), name).toBe(false);
    }
  });

  it('does not match a city merely containing a valley city name', () => {
    // "Kathmandu Overseas" is not inside the valley; a loose substring match would
    // give it the lower threshold.
    expect(isValleyCityName('Kathmandu Overseas')).toBe(false);
    expect(isValleyCityName('New Lalitpur Extension')).toBe(false);
  });

  it('handles an empty name without throwing', () => {
    expect(isValleyCityName('')).toBe(false);
  });
});
