export interface CartItemHydrated {
  id: string;
  cartId: string;
  inventoryId: string;
  productId: string;
  productName: string;
  productSlug: string;
  productBrand?: string;
  price: number;
  discountedPrice?: number;
  /**
   * Effective per-unit price charged for this line, from the single line-price
   * authority: sale price (only when it is a real discount) minus any applied
   * per-unit combo discount, floored at zero. The app displays this figure and
   * checkout charges from the same rule, so the two cannot disagree.
   */
  unitPrice: number;
  /** Per-unit combo discount currently applied to this line; 0 for plain lines. */
  appliedDiscount: number;
  /** The combo bundle this line was added through, when it is a combo line. */
  comboBundleId?: string;
  /** Provenance of `appliedDiscount` ('COMBO'); absent for plain lines. */
  discountSource?: string;
  colorVariantName: string;
  colorCode: string;
  image: string;
  /**
   * The product's canonical cover, resolved live from the current product
   * (`mainImages[0] ?? first colour variant's first image`) so a cart row always
   * shows the product as it is now, never a copy frozen at add-to-cart time.
   * Absent only when the product no longer exists; `image` carries the same
   * value and is kept for clients that read that field.
   */
  cover?: string;
  size: string;
  quantity: number;
  availableStock: number;
  isAvailable: boolean;
  stockWarning?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartResponse {
  id: string;
  userId?: string | null;
  sessionId?: string | null;
  items: CartItemHydrated[];
  subtotal: number;
  /**
   * Delivery the server would charge for this cart, from the commerce policy.
   * Advisory: checkout recomputes from the database and is the authority. It is
   * published here so the app can show a server-derived figure instead of one
   * it calculated from its own constants, which is how the displayed total and
   * the charged total drifted apart.
   */
  shippingFee: number;
  total: number;
  /**
   * The free-delivery threshold this cart was quoted against, so the app shows
   * the same number the server used rather than one of its own. Quoted against
   * the default address's delivery zone when there is one, and against the
   * conservative threshold when there is not.
   */
  freeDeliveryThreshold: number;
  /**
   * True when the cart could not resolve a delivery zone and had to quote
   * conservatively.
   *
   * The figure is still server-derived and checkout remains the authority, but it
   * is an estimate rather than the price this cart will be charged. Without this
   * the app presents an estimate as a quote, which is the same surprise as
   * showing one total and charging another.
   */
  deliveryIsEstimate: boolean;
  itemCount: number;
  hasStockIssues: boolean;
  createdAt: string;
  updatedAt: string;
}
