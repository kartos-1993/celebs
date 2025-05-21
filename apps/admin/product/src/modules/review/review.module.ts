import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';

export class ReviewModule {
  private static instance: ReviewModule;
  private reviewService: ReviewService;
  private reviewController: ReviewController;

  private constructor() {
    this.reviewService = new ReviewService();
    this.reviewController = new ReviewController(this.reviewService);
  }

  /**
   * Get singleton instance of ReviewModule
   */
  static getInstance(): ReviewModule {
    if (!ReviewModule.instance) {
      ReviewModule.instance = new ReviewModule();
    }
    return ReviewModule.instance;
  }

  /**
   * Get review service instance
   */
  getReviewService(): ReviewService {
    return this.reviewService;
  }

  /**
   * Get review controller instance
   */
  getReviewController(): ReviewController {
    return this.reviewController;
  }
}
