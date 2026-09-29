/**
 * Delivery coverage — can we actually deliver a parcel to this address?
 *
 * The three states are deliberately distinct. The mistake this guards against
 * is collapsing "we do not deliver there" and "we cannot tell yet" into one
 * answer:
 *
 *   COVERED    - the courier has a live zone for this address
 *   UNCOVERED  - the courier positively does not serve this zone
 *   UNVERIFIED - we cannot tell: no mapped zone, or our mirror of the courier's
 *                location list is empty or stale
 *
 * Only COVERED may proceed. UNVERIFIED must never be read as covered, because
 * that would create a real shipment to an address the courier never confirmed.
 * It also must not be shown to a customer as "we do not deliver here", because
 * the customer may well be inside a covered area and we simply do not know yet.
 */

export type CoverageStatus = 'COVERED' | 'UNCOVERED' | 'UNVERIFIED';

export interface CoverageCity {
  id: string;
  name: string;
  isValley: boolean;
  isActive: boolean;
}

export interface CoverageZone {
  id: string;
  name: string;
  isActive: boolean;
  city: CoverageCity;
}

export interface CoverageInput {
  /** Zone recorded on the address, if the customer picked one. */
  logisticsZoneId: string | null;
  /** The mirrored zone, if it still exists. */
  zone: CoverageZone | null;
  /** No location data has been synced at all. */
  mirrorIsEmpty?: boolean;
  /** The mirror is older than we are willing to trust. */
  mirrorIsStale?: boolean;
}

export interface CoverageResult {
  status: CoverageStatus;
  /** Present only when covered; the free-delivery threshold keys off it. */
  isValley: boolean;
  zoneId: string | null;
  zoneName: string | null;
  cityName: string | null;
  /** True when the address needs re-picking rather than just rejecting. */
  needsZoneSelection: boolean;
}

export const COVERAGE_MESSAGES: Record<CoverageStatus, string> = {
  COVERED: 'This address is deliverable.',
  UNCOVERED: 'We do not deliver to this area yet. Please choose another address.',
  UNVERIFIED:
    'We could not confirm delivery to this address. Please re-select your district so we can check.',
};

const UNVERIFIED_RESULT: CoverageResult = {
  status: 'UNVERIFIED',
  isValley: false,
  zoneId: null,
  zoneName: null,
  cityName: null,
  needsZoneSelection: true,
};

/**
 * Resolves coverage from the mirrored courier zone.
 *
 * Pure: the caller supplies the zone and the mirror's health, so the rule can be
 * tested exhaustively without a database or a courier API.
 */
export function classifyCoverage(input: CoverageInput): CoverageResult {
  // A zone the customer selected but that no longer exists in the mirror is a
  // data problem on our side, not proof that the area is unserved.
  if (input.logisticsZoneId && !input.zone) return { ...UNVERIFIED_RESULT };

  // An empty or stale mirror means we have nothing trustworthy to check against.
  if (input.mirrorIsEmpty || input.mirrorIsStale) return { ...UNVERIFIED_RESULT };

  // No zone recorded: an address created before the picker existed, or written
  // by a client that predates it.
  if (!input.zone) return { ...UNVERIFIED_RESULT };

  // A retired zone or city still sits on historical orders, so it must not be
  // treated as deliverable for a new one.
  if (!input.zone.isActive || !input.zone.city.isActive) {
    return {
      status: 'UNCOVERED',
      isValley: false,
      zoneId: input.zone.id,
      zoneName: input.zone.name,
      cityName: input.zone.city.name,
      needsZoneSelection: true,
    };
  }

  return {
    status: 'COVERED',
    isValley: input.zone.city.isValley,
    zoneId: input.zone.id,
    zoneName: input.zone.name,
    cityName: input.zone.city.name,
    needsZoneSelection: false,
  };
}
