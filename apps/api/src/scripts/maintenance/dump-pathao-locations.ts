import { writeFile } from 'node:fs/promises';

import { logger } from '@celebs/shared-utils';

import { NEPAL_PROVINCES } from '../../db/seed/nepal-locations';
import { PathaoLocationClient } from '../../modules/logistics/adapters/pathao-location.client';
import { PathaoTokenProvider } from '../../modules/logistics/adapters/pathao-token.provider';

/**
 * Reports how much of Nepal Pathao actually serves.
 *
 * Read-only by design: it writes nothing to the database and books no parcel. It
 * exists because the only trustworthy answer to "how many of our districts can
 * this courier deliver to" is their own location list, and guessing it from
 * marketing copy is how a nationwide delivery promise turns into a silent
 * coverage gap.
 *
 * Pathao names a city after a locality and carries the district in brackets, so
 * "Aadarshnagar (Birgunj)" is matched to our Birgunj by what is in the brackets.
 * The raw payload is written alongside the summary so a guess can be checked
 * rather than trusted.
 */

export interface CourierCity {
  id: number;
  name: string;
}

export interface DistrictMatch {
  district: string;
  cityId: number;
  via: 'exact' | 'bracket';
}

const normalise = (value: string): string => value.trim().toLowerCase();

/** The district a locality is filed under, e.g. "A (Birgunj)" -> "Birgunj". */
export function districtFromBracketedName(cityName: string): string | null {
  const match = /\(([^)]+)\)\s*$/.exec(cityName.trim());
  const inner = match?.[1]?.trim();
  return inner && inner !== '' ? inner : null;
}

export function matchPathaoCitiesToDistricts(
  cities: CourierCity[],
  seededDistricts: string[],
): {
  matches: DistrictMatch[];
  unmatchedCityNames: string[];
  unmatchedDistricts: string[];
} {
  const byNormalisedName = new Map(seededDistricts.map((d) => [normalise(d), d]));

  const matches = new Map<string, DistrictMatch>();

  // Exact names first, so a real "Kathmandu" city always beats a "Koteshwor
  // (Kathmandu)" guess regardless of the order Pathao happens to return them in.
  for (const city of cities) {
    const district = byNormalisedName.get(normalise(city.name));
    if (district) matches.set(district, { district, cityId: city.id, via: 'exact' });
  }

  for (const city of cities) {
    const bracketed = districtFromBracketedName(city.name);
    if (!bracketed) continue;

    const district = byNormalisedName.get(normalise(bracketed));
    if (district && !matches.has(district)) {
      matches.set(district, { district, cityId: city.id, via: 'bracket' });
    }
  }

  const matchedDistricts = new Set([...matches.values()].map((m) => m.district));

  return {
    matches: [...matches.values()],
    unmatchedCityNames: cities
      .filter((city) => !districtFromBracketedName(city.name))
      .filter((city) => !byNormalisedName.has(normalise(city.name)))
      .map((city) => city.name),
    unmatchedDistricts: seededDistricts.filter((d) => !matchedDistricts.has(d)),
  };
}

export interface CoverageSummary {
  totalCourierCities: number;
  totalSeededDistricts: number;
  coveredDistricts: number;
  uncoveredDistricts: number;
  coveragePercent: number;
  matchedByExactName: number;
  matchedByBracketedName: number;
}

export function summariseCoverage(
  cities: CourierCity[],
  seededDistricts: string[],
): CoverageSummary {
  const { matches, unmatchedDistricts } = matchPathaoCitiesToDistricts(cities, seededDistricts);
  const covered = matches.length;

  return {
    totalCourierCities: cities.length,
    totalSeededDistricts: seededDistricts.length,
    coveredDistricts: covered,
    uncoveredDistricts: unmatchedDistricts.length,
    coveragePercent:
      seededDistricts.length === 0 ? 0 : Math.round((covered / seededDistricts.length) * 100),
    matchedByExactName: matches.filter((m) => m.via === 'exact').length,
    matchedByBracketedName: matches.filter((m) => m.via === 'bracket').length,
  };
}

const SEEDED_DISTRICTS = NEPAL_PROVINCES.flatMap((province) => province.districts);

/**
 * Pulls the courier's city list, and optionally the zones and areas of one city,
 * writing everything to `outFile` for inspection.
 */
export async function dumpPathaoLocations(options: {
  tokens: PathaoTokenProvider;
  outFile: string;
  probeCityId?: number;
}): Promise<CoverageSummary> {
  const client = new PathaoLocationClient(options.tokens);
  const cities = await client.listCities();
  const summary = summariseCoverage(cities, SEEDED_DISTRICTS);
  const { matches, unmatchedCityNames, unmatchedDistricts } = matchPathaoCitiesToDistricts(
    cities,
    SEEDED_DISTRICTS,
  );

  const probeCityId = options.probeCityId ?? matches[0]?.cityId;
  const zones = probeCityId ? await client.listZones(probeCityId) : [];
  const areas = zones[0] ? await client.listAreas(zones[0].id) : [];

  const payload = {
    generatedAt: new Date().toISOString(),
    summary,
    cities,
    probeCityId: probeCityId ?? null,
    probeZones: zones,
    probeAreas: areas,
    matchedDistricts: matches,
    unmatchedCourierCities: unmatchedCityNames,
    districtsTheCourierDoesNotServe: unmatchedDistricts,
  };

  await writeFile(options.outFile, JSON.stringify(payload, null, 2), 'utf8');
  logger.info({ outFile: options.outFile, ...summary }, 'Wrote Pathao location dump');
  return summary;
}

/* c8 ignore start -- entry point */
async function main(): Promise<void> {
  const outFile = process.argv[2] ?? 'pathao-locations.json';
  const probeCityId = process.argv[3] ? Number(process.argv[3]) : undefined;

  const summary = await dumpPathaoLocations({
    tokens: new PathaoTokenProvider(),
    outFile,
    probeCityId,
  });

  console.log('\n--- 📍 Pathao location coverage ---');
  console.log(`    Pathao cities returned      ${summary.totalCourierCities}`);
  console.log(`    Our seeded districts        ${summary.totalSeededDistricts}`);
  console.log(`    Matched by exact name       ${summary.matchedByExactName}`);
  console.log(`    Matched by bracketed name   ${summary.matchedByBracketedName}`);
  console.log(
    `    Districts covered           ${summary.coveredDistricts}/${summary.totalSeededDistricts} (${summary.coveragePercent}%)`,
  );
  console.log(`    Districts NOT covered       ${summary.uncoveredDistricts}`);
  console.log(`    Raw dump written to         ${outFile}`);
  console.log('\nThis reports only. Nothing was written to the database.\n');
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error('\n❌ Pathao location dump failed:', (error as Error).message);
    process.exitCode = 1;
  });
}
/* c8 ignore stop */
