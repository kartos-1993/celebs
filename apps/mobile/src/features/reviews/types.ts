export type ReviewFitRating = 'RUNS_SMALL' | 'TRUE_TO_SIZE' | 'RUNS_LARGE';

export interface ReviewItem {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  rating: number;
  fitRating: ReviewFitRating;
  comment: string;
  images: string[];
  colorVariantName?: string | null;
  size?: string | null;
  variantSnapshot?: Record<string, string> | null;
  helpfulCount: number;
  isVerifiedPurchase: boolean;
  createdAt: string;
}

export interface ProductReviewSummary {
  productId: string;
  averageRating: number;
  totalReviews: number;
  ratingsCount: number;
  withImagesCount: number;
  ratingDistribution: Record<string, number>;
  fitDistribution: {
    trueToSize: number;
    runsSmall: number;
    runsLarge: number;
  };
}

export interface ToReviewItem {
  orderItemId: string;
  orderId: string;
  orderNumber: string;
  deliveredAt: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string;
  colorVariantName?: string | null;
  size?: string | null;
  quantity: number;
  unitPrice: number;
}

export interface ReviewGalleryItem {
  id: string;
  reviewId: string;
  imageUrl: string;
  userName: string;
  userAvatar?: string | null;
  rating: number;
  colorVariantName?: string | null;
  size?: string | null;
  comment: string;
  helpfulCount: number;
  createdAt: string;
}

export interface SubmitReviewPayload {
  orderItemId: string;
  rating: number;
  fitRating: ReviewFitRating;
  comment: string;
  images: string[];
}
