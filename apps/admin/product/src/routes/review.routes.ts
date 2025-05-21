import express from 'express';
import { ReviewController } from '../modules/review/review.controller';
import { ReviewService } from '../modules/review/review.service';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = express.Router();
const reviewService = new ReviewService();
const reviewController = new ReviewController(reviewService);

// Apply authentication middleware to all review routes
router.use(authenticateJWT);

// Get all reviews for a product
router.get('/product/:productId', asyncHandler(reviewController.getProductReviews));

// Get a single review by ID
router.get('/:id', asyncHandler(reviewController.getReviewById));

// Create a new review
router.post('/', asyncHandler(reviewController.createReview));

// Update a review
router.put('/:id', asyncHandler(reviewController.updateReview));

// Delete a review
router.delete('/:id', asyncHandler(reviewController.deleteReview));

export default router;