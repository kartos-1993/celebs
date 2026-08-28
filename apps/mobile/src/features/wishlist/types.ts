export interface WishlistProductView {
  id: string;
  name: string;
  brand?: string;
  slug: string;
  price: number;
  discountedPrice?: number;
  mainImages: string[];
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
      mainImages: string[];
    };
  }[];
}
