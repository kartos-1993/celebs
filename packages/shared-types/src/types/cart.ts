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
   * the same number the server used rather than one of its own. The cart has no
   * destination yet, so this is the conservative threshold; checkout re-quotes
   * against the delivery zone actually selected.
   */
  freeDeliveryThreshold: number;
  itemCount: number;
  hasStockIssues: boolean;
  createdAt: string;
  updatedAt: string;
}
