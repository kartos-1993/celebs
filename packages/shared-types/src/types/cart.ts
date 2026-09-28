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
  itemCount: number;
  hasStockIssues: boolean;
  createdAt: string;
  updatedAt: string;
}
