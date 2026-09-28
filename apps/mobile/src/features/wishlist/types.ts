export interface WishlistProductView {
  id: string;
  name: string;
  brand?: string;
  slug: string;
  price: number;
  discountedPrice?: number;
  /**
   * Wishlist rows are the ONLY storefront payload that still carries the raw
   * `mainImages` gallery. `toProduct` folds it into the derived `cover` so the
   * grid card never has to know which payload it came from.
   */
  mainImages?: string[];
  cover?: string;
}

export interface WishlistEntryView {
  id: string;
  productId: string;
  addedAt: string;
  product: WishlistProductView;
}

export interface WishlistApiResponse {
  success?: boolean;
  message?: string;
  data?: {
    id: string;
    productId: string;
    addedAt: string;
    product: {
      id: string;
      name: string;
      brand?: string | null;
      slug: string;
      price: number;
      discountedPrice?: number | null;
      mainImages?: string[];
      cover?: string;
    };
  }[];
}
