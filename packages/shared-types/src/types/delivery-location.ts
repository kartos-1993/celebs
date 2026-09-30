/**
 * Delivery locations, as the address form needs to see them.
 *
 * Shaped for a cascading picker: province, then district, then the areas the
 * courier serves within that district. The app offers only what exists here, so
 * a customer cannot type a district nobody delivers to - which is what made
 * undeliverable orders possible when the address was free text.
 */

export interface DeliveryArea {
  id: string;
  name: string;
}

export interface DeliveryDistrict {
  /** The delivery city row this district maps to. */
  id: string;
  name: string;
  /** Drives the free-delivery threshold: lower in the Kathmandu Valley. */
  isValley: boolean;
  /** Order subtotal at or above which delivery to this district is free. */
  freeDeliveryThreshold: number;
  areas: DeliveryArea[];
}

export interface DeliveryProvince {
  name: string;
  districts: DeliveryDistrict[];
}

export interface DeliveryLocationsResponse {
  provinces: DeliveryProvince[];
  /**
   * When the location mirror was last refreshed. An app seeing a stale value
   * should not present the list as authoritative coverage.
   */
  syncedAt: string | null;
}
