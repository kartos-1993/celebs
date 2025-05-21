import { Request, Response, NextFunction } from 'express';
import { ReviewService } from './review.service';
import { HTTPSTATUS } from '../../config/http.config';
import { AppError } from '../../common/utils/AppError';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { validateCreateReview, validateUpdateReview } from '../../common/validators/review.validation';

export class ReviewController {
  constructor(private reviewService: ReviewService) {}

  /**
   * Get all reviews for a product
   */
  getProductReviews = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productId } = req.params;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const sort = req.query.sort as string || '-createdAt';
      
      const result = await this.reviewService.getProductReviews(productId, page, limit, sort);
      
      return res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Reviews retrieved successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get review by ID
   */
  getReviewById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const review = await this.reviewService.getReviewById(id);
      
      return res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Review retrieved successfully',
        data: review
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create new review
   */
  createReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = validateCreateReview(req.body);
      
      if (!validatedData.success) {
        throw new AppError(
          validatedData.error.message,
          HTTPSTATUS.BAD_REQUEST,
          ErrorCode.VALIDATION_ERROR
        );
      }
      
      // Add user ID from authenticated user
      const reviewData = {
        ...validatedData.data,
        user: req.user?.userId
      };
      
      const review = await this.reviewService.createReview(reviewData);
      
      return res.status(HTTPSTATUS.CREATED).json({
        success: true,
        message: 'Review created successfully',
        data: review
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update review
   */
  updateReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const validatedData = validateUpdateReview(req.body);
      
      if (!validatedData.success) {
        throw new AppError(
          validatedData.error.message,
          HTTPSTATUS.BAD_REQUEST,
          ErrorCode.VALIDATION_ERROR
        );
      }
      
      // Fetch existing review to check if user owns it
      const existingReview = await this.reviewService.getReviewById(id);
      
      // Check if the authenticated user is the owner of the review
      if (existingReview.user.toString() !== req.user?.userId) {
        throw new AppError(
          'You are not authorized to update this review',
          HTTPSTATUS.FORBIDDEN,
          ErrorCode.FORBIDDEN_ACCESS
        );
      }
      
      const review = await this.reviewService.updateReview(id, validatedData.data);
      
      return res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Review updated successfully',
        data: review
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete review
   */
  deleteReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      // Fetch existing review to check if user owns it
      const existingReview = await this.reviewService.getReviewById(id);
      
      // Check if the authenticated user is the owner of the review
      if (existingReview.user.toString() !== req.user?.userId) {
        throw new AppError(
          'You are not authorized to delete this review',
          HTTPSTATUS.FORBIDDEN,
          ErrorCode.FORBIDDEN_ACCESS
        );
      }
      
      await this.reviewService.deleteReview(id);
      
      return res.status(HTTPSTATUS.NO_CONTENT).send();
    } catch (error) {
      next(error);
    }
  };
}
