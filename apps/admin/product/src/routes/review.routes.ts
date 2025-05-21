import express from 'express';
import { ReviewController } from '../controllers/review.controller';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = express.Router();
const reviewController = new ReviewController();

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