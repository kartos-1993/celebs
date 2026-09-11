export type ReviewStatus = 'PENDING_MODERATION' | 'APPROVED' | 'REJECTED';
export type ReviewFitRating = 'RUNS_SMALL' | 'TRUE_TO_SIZE' | 'RUNS_LARGE';

export interface AdminReviewProduct {
  id: string;
  title: string;
  thumbnail?: string | null;
  vendorId: string;
}

export interface AdminReviewUser {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

export interface AdminReviewItem {
  id: string;
  productId: string;
  product: AdminReviewProduct;
  userId: string;
  user: AdminReviewUser;
  rating: number;
  fitRating: ReviewFitRating;
  comment: string;
  images: string[];
  status: ReviewStatus;
  helpfulCount: number;
  isVerifiedPurchase: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminReviewQueryParams {
  page?: number;
  limit?: number;
  status?: ReviewStatus | 'ALL';
  rating?: number;
  search?: string;
  storeId?: string;
}

export interface AdminReviewListResponse {
  reviews: AdminReviewItem[];
  page: number;
  limit: number;
  total: number;
}
