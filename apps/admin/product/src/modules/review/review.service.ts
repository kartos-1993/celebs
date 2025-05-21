import { Types } from 'mongoose';
import { AppError } from '../../common/utils/AppError';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { HTTPSTATUS } from '../../config/http.config';
import { ReviewModel, IReview } from '../../db/models/review.model';
import { ProductModel } from '../../db/models/product.model';

export class ReviewService {
  /**
   * Create a new review
   */
  async createReview(reviewData: Partial<IReview>): Promise<IReview> {
    // Validate product exists
    if (reviewData.product) {
      const productExists = await ProductModel.exists({ _id: reviewData.product });
      if (!productExists) {
        throw new AppError(
          'Product not found',
          HTTPSTATUS.NOT_FOUND,
          ErrorCode.PRODUCT_NOT_FOUND
        );
      }
    }

    // Create new review
    const review = new ReviewModel(reviewData);
    await review.save();
    
    // Update product's reviews array
    if (reviewData.product) {
      await ProductModel.findByIdAndUpdate(
        reviewData.product,
        { $push: { reviews: review._id } }
      );
    }
    
    return review;
  }

  /**
   * Get all reviews for a product
   */
  async getProductReviews(
    productId: string,
    page: number = 1,
    limit: number = 10,
    sort: string = '-createdAt'
  ): Promise<{
    reviews: IReview[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    if (!Types.ObjectId.isValid(productId)) {
      throw new AppError('Invalid product ID', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
    }
    
    // Check if product exists
    const productExists = await ProductModel.exists({ _id: productId });
    if (!productExists) {
      throw new AppError(
        'Product not found',
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.PRODUCT_NOT_FOUND
      );
    }
    
    const skip = (page - 1) * limit;
    const total = await ReviewModel.countDocuments({ product: productId });
    const pages = Math.ceil(total / limit);
    
    const reviews = await ReviewModel.find({ product: productId })
      .populate('media')
      .sort(sort)
      .skip(skip)
      .limit(limit);
    
    return {
      reviews,
      total,
      page,
      limit,
      pages
    };
  }

  /**
   * Get a review by ID
   */
  async getReviewById(reviewId: string): Promise<IReview> {
    if (!Types.ObjectId.isValid(reviewId)) {
      throw new AppError('Invalid review ID', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
    }

    const review = await ReviewModel.findById(reviewId).populate('media');
    if (!review) {
      throw new AppError(
        'Review not found',
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.REVIEW_NOT_FOUND
      );
    }

    return review;
  }

  /**
   * Update a review
   */
  async updateReview(reviewId: string, updateData: Partial<IReview>): Promise<IReview> {
    if (!Types.ObjectId.isValid(reviewId)) {
      throw new AppError('Invalid review ID', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
    }

    const review = await ReviewModel.findByIdAndUpdate(
      reviewId,
      updateData,
      { new: true, runValidators: true }
    ).populate('media');

    if (!review) {
      throw new AppError(
        'Review not found',
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.REVIEW_NOT_FOUND
      );
    }

    return review;
  }

  /**
   * Delete a review
   */
  async deleteReview(reviewId: string): Promise<{ success: boolean }> {
    if (!Types.ObjectId.isValid(reviewId)) {
      throw new AppError('Invalid review ID', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
    }

    const review = await ReviewModel.findById(reviewId);
    if (!review) {
      throw new AppError(
        'Review not found',
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.REVIEW_NOT_FOUND
      );
    }

    // Remove review from product's reviews array
    if (review.product) {
      await ProductModel.findByIdAndUpdate(
        review.product,
        { $pull: { reviews: reviewId } }
      );
    }

    await ReviewModel.findByIdAndDelete(reviewId);
    return { success: true };
  }
}
