/**
 * Colours owned by a third party, not by this product's design system.
 *
 * Payment gateways, card networks and couriers publish brand guidelines that
 * fix these values, so they must not be mapped onto a Palette token: borrowing
 * a near-miss would put a wrong brand colour on a customer's checkout, and
 * adding them to `Palette` would present them as design decisions we are free
 * to change. They live here, named and explained, as the single place a future
 * gateway or courier is added.
 */
export const BrandColor = {
  /** eSewa */
  esewa: '#60bb46',
  /** Khalti by IME */
  khalti: '#5c2d91',
  /** Cash on Delivery - our own label, not a gateway brand */
  cod: '#0ea5e9',
  /** eSewa secondary brand tone, used on the saved-card strip */
  esewaCard: '#0284c7',
  /** eSewa deep navy, used on the saved-card strip */
  esewaNavy: '#1a1f71',
  /** Visa */
  visa: '#1a1f71',
  /** Mastercard red */
  mastercardRed: '#eb001b',
  /** Mastercard amber */
  mastercardAmber: '#f79e1b',
  /** Pathao */
  pathao: '#f95738',
  /** iOS system red, used for the cart tab's attention dot */
  iosSystemRed: '#FF3B30',
} as const;
