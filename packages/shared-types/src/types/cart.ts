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
