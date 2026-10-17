import { describe, expect, it } from 'vitest';

import { matchPathaoCitiesToDistricts, summariseCoverage } from '../dump-pathao-locations';

/**
 * Pathao names a city after a locality and carries the district in brackets:
 * "Aadarshnagar (Birgunj)". Our seed carries only the 77 district names. The
 * question this exists to answer is how much of the country a courier actually
 * covers, so it has to be explicit which names were matched, which were guessed
 * at, and which of our districts nobody serves.
 */

const districts = ['Birgunj', 'Chitwan', 'Kathmandu', 'Pokhara', 'Ilam'];

describe('matchPathaoCitiesToDistricts', () => {
  it('matches a courier city whose name is exactly a district', () => {
    const result = matchPathaoCitiesToDistricts([{ id: 1, name: 'Kathmandu' }], districts);

    expect(result.matches).toEqual([{ district: 'Kathmandu', cityId: 1, via: 'exact' }]);
  });

  it('matches a locality by the district named in its brackets', () => {
    const result = matchPathaoCitiesToDistricts(
      [{ id: 138, name: 'Aadarshnagar (Birgunj)' }],
      districts,
    );

    expect(result.matches).toEqual([{ district: 'Birgunj', cityId: 138, via: 'bracket' }]);
  });

  it('ignores casing and surrounding whitespace', () => {
    const result = matchPathaoCitiesToDistricts([{ id: 1, name: '  kathmandu ' }], districts);

    expect(result.matches[0]?.district).toBe('Kathmandu');
  });

  it('prefers an exact name over a bracketed guess', () => {
    const result = matchPathaoCitiesToDistricts(
      [
        { id: 1, name: 'Ilam' },
        { id: 2, name: 'Somewhere (Ilam)' },
      ],
      districts,
    );

    expect(result.matches).toEqual([{ district: 'Ilam', cityId: 1, via: 'exact' }]);
  });

  it('reports a courier city that names no district we know', () => {
    const result = matchPathaoCitiesToDistricts([{ id: 9, name: 'Unknownville' }], districts);

    expect(result.matches).toEqual([]);
    expect(result.unmatchedCityNames).toEqual(['Unknownville']);
  });

  it('reports our districts the courier does not serve', () => {
    const result = matchPathaoCitiesToDistricts([{ id: 1, name: 'Kathmandu' }], districts);

    // Uncovered districts are reported in the order we seed them, so the list
    // reads as a direct comparison against the seed rather than a re-sort.
    expect(result.unmatchedDistricts).toEqual(['Birgunj', 'Chitwan', 'Pokhara', 'Ilam']);
  });

  it('matches a district twice only once, keeping the best match', () => {
    const result = matchPathaoCitiesToDistricts(
      [
        { id: 1, name: 'Kathmandu' },
        { id: 2, name: 'Koteshwor (Kathmandu)' },
      ],
      districts,
    );

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]).toEqual({ district: 'Kathmandu', cityId: 1, via: 'exact' });
  });

  it('handles a courier city with no brackets', () => {
    const result = matchPathaoCitiesToDistricts([{ id: 1, name: 'Kathmandu' }], districts);

    expect(result.unmatchedCityNames).toEqual([]);
  });

  it('does not match a bracketed name against the wrong district', () => {
    const result = matchPathaoCitiesToDistricts([{ id: 1, name: 'A (Birgunj)' }], districts);

    expect(result.matches).toEqual([{ district: 'Birgunj', cityId: 1, via: 'bracket' }]);
    expect(result.unmatchedDistricts).not.toContain('Birgunj');
  });
});

describe('summariseCoverage', () => {
  it('states plainly how much of the country is covered', () => {
    const summary = summariseCoverage(
      [
        { id: 1, name: 'Kathmandu' },
        { id: 138, name: 'Aadarshnagar (Birgunj)' },
        { id: 999, name: 'Somewhere Else' },
      ],
      districts,
    );

    expect(summary.totalCourierCities).toBe(3);
    expect(summary.totalSeededDistricts).toBe(5);
    expect(summary.coveredDistricts).toBe(2);
    expect(summary.uncoveredDistricts).toBe(3);
    expect(summary.coveragePercent).toBe(40);
  });

  it('rounds the coverage percentage rather than truncating it', () => {
    // 1 of 3 is 33.33%. A report claiming 40% of the country is covered when it
    // is a third is a number nobody will trust twice.
    const summary = summariseCoverage(
      [{ id: 1, name: 'Kathmandu' }],
      ['Kathmandu', 'Pokhara', 'Ilam'],
    );

    expect(summary.coveragePercent).toBe(33);
  });

  it('rounds a coverage above the halfway mark up, not down', () => {
    const summary = summariseCoverage(
      [
        { id: 1, name: 'Kathmandu' },
        { id: 2, name: 'Pokhara' },
      ],
      ['Kathmandu', 'Pokhara', 'Ilam'],
    );

    expect(summary.coveragePercent).toBe(67);
  });

  it('survives being asked about a country with no districts', () => {
    const summary = summariseCoverage([{ id: 1, name: 'Kathmandu' }], []);

    expect(summary.coveragePercent).toBe(0);
    expect(summary.uncoveredDistricts).toBe(0);
  });
});
