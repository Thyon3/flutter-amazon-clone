import { Review, IReview } from '../model/review';
import { Product } from '../model/product';
import { User } from '../model/user';
import { Order } from '../model/order';

export interface ReviewRequest {
  userId: string;
  productId: string;
  rating: number;
  title: string;
  content: string;
  images?: string[];
  isRecommended?: boolean;
}

export interface ReviewResponse {
  success: boolean;
  reviewId?: string;
  message: string;
  needsModeration?: boolean;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  verifiedPurchasePercentage: number;
  recommendedPercentage: number;
}

export class ReviewService {
  // Create a new review
  async createReview(request: ReviewRequest): Promise<ReviewResponse> {
    try {
      // Check if user has already reviewed this product
      const existingReview = await Review.findOne({
        user: request.userId,
        product: request.productId,
      });

      if (existingReview) {
        return {
          success: false,
          message: 'You have already reviewed this product',
        };
      }

      // Check if user has purchased this product
      const verifiedPurchase = await this.checkVerifiedPurchase(
        request.userId,
        request.productId
      );

      const review = new Review({
        user: request.userId,
        product: request.productId,
        rating: request.rating,
        title: request.title,
        content: request.content,
        images: request.images || [],
        verifiedPurchase,
        isRecommended: request.isRecommended ?? true,
        status: 'pending', // Require moderation
      });

      await review.save();

      // Update product rating
      await this.updateProductRating(request.productId);

      return {
        success: true,
        reviewId: review._id.toString(),
        message: 'Review submitted successfully',
        needsModeration: true,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create review: ${error}`,
      };
    }
  }

  // Get reviews for a product
  async getProductReviews(
    productId: string,
    page: number = 1,
    limit: number = 10,
    sortBy: 'newest' | 'oldest' | 'rating-high' | 'rating-low' | 'helpful' = 'newest'
  ): Promise<{ reviews: IReview[]; total: number; stats: ReviewStats }> {
    try {
      const sortOptions: any = {
        newest: { createdAt: -1 },
        oldest: { createdAt: 1 },
        'rating-high': { rating: -1 },
        'rating-low': { rating: 1 },
        helpful: { helpfulVotes: -1 },
      };

      const skip = (page - 1) * limit;

      const reviews = await Review.find({ 
        product: productId, 
        status: 'approved' 
      })
        .populate('user', 'name')
        .populate('response.respondedBy', 'name')
        .sort(sortOptions[sortBy])
        .skip(skip)
        .limit(limit);

      const total = await Review.countDocuments({ 
        product: productId, 
        status: 'approved' 
      });

      const stats = await this.getReviewStats(productId);

      return {
        reviews,
        total,
        stats,
      };
    } catch (error) {
      throw new Error(`Failed to get product reviews: ${error}`);
    }
  }

  // Get review statistics for a product
  async getReviewStats(productId: string): Promise<ReviewStats> {
    try {
      const reviews = await Review.find({ 
        product: productId, 
        status: 'approved' 
      });

      if (reviews.length === 0) {
        return {
          averageRating: 0,
          totalReviews: 0,
          ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
          verifiedPurchasePercentage: 0,
          recommendedPercentage: 0,
        };
      }

      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalRating / reviews.length;

      const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      reviews.forEach(review => {
        ratingDistribution[review.rating as keyof typeof ratingDistribution]++;
      });

      const verifiedPurchases = reviews.filter(review => review.verifiedPurchase).length;
      const verifiedPurchasePercentage = (verifiedPurchases / reviews.length) * 100;

      const recommendedReviews = reviews.filter(review => review.isRecommended).length;
      const recommendedPercentage = (recommendedReviews / reviews.length) * 100;

      return {
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        totalReviews: reviews.length,
        ratingDistribution,
        verifiedPurchasePercentage: Math.round(verifiedPurchasePercentage),
        recommendedPercentage: Math.round(recommendedPercentage),
      };
    } catch (error) {
      throw new Error(`Failed to get review stats: ${error}`);
    }
  }

  // Update a review
  async updateReview(
    reviewId: string,
    userId: string,
    updates: Partial<Pick<IReview, 'rating' | 'title' | 'content' | 'images' | 'isRecommended'>>
  ): Promise<ReviewResponse> {
    try {
      const review = await Review.findOne({ _id: reviewId, user: userId });
      
      if (!review) {
        return {
          success: false,
          message: 'Review not found',
        };
      }

      // Update review fields
      Object.assign(review, updates);
      review.status = 'pending'; // Require re-moderation after update
      await review.save();

      // Update product rating
      await this.updateProductRating(review.product.toString());

      return {
        success: true,
        reviewId: review._id.toString(),
        message: 'Review updated successfully',
        needsModeration: true,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update review: ${error}`,
      };
    }
  }

  // Delete a review
  async deleteReview(reviewId: string, userId: string): Promise<ReviewResponse> {
    try {
      const review = await Review.findOne({ _id: reviewId, user: userId });
      
      if (!review) {
        return {
          success: false,
          message: 'Review not found',
        };
      }

      const productId = review.product.toString();
      await Review.findByIdAndDelete(reviewId);

      // Update product rating
      await this.updateProductRating(productId);

      return {
        success: true,
        message: 'Review deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to delete review: ${error}`,
      };
    }
  }

  // Mark review as helpful
  async markReviewHelpful(reviewId: string, userId: string): Promise<ReviewResponse> {
    try {
      const review = await Review.findById(reviewId);
      
      if (!review) {
        return {
          success: false,
          message: 'Review not found',
        };
      }

      // In a real app, you'd track which users have marked as helpful
      // For simplicity, we'll just increment the count
      review.helpfulVotes += 1;
      await review.save();

      return {
        success: true,
        message: 'Review marked as helpful',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to mark review as helpful: ${error}`,
      };
    }
  }

  // Add response to review (seller/brand response)
  async addReviewResponse(
    reviewId: string,
    sellerId: string,
    responseContent: string
  ): Promise<ReviewResponse> {
    try {
      const review = await Review.findById(reviewId);
      
      if (!review) {
        return {
          success: false,
          message: 'Review not found',
        };
      }

      review.response = {
        content: responseContent,
        respondedBy: sellerId,
        respondedAt: new Date(),
      };

      await review.save();

      return {
        success: true,
        message: 'Response added successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to add response: ${error}`,
      };
    }
  }

  // Moderate reviews (admin function)
  async moderateReview(
    reviewId: string,
    action: 'approve' | 'reject',
    moderatorId: string
  ): Promise<ReviewResponse> {
    try {
      const review = await Review.findById(reviewId);
      
      if (!review) {
        return {
          success: false,
          message: 'Review not found',
        };
      }

      review.status = action;
      await review.save();

      // Update product rating if approved
      if (action === 'approve') {
        await this.updateProductRating(review.product.toString());
      }

      return {
        success: true,
        message: `Review ${action}d successfully`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to moderate review: ${error}`,
      };
    }
  }

  // Get pending reviews for moderation
  async getPendingReviews(page: number = 1, limit: number = 20): Promise<{ reviews: IReview[]; total: number }> {
    try {
      const skip = (page - 1) * limit;

      const reviews = await Review.find({ status: 'pending' })
        .populate('user', 'name')
        .populate('product', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Review.countDocuments({ status: 'pending' });

      return { reviews, total };
    } catch (error) {
      throw new Error(`Failed to get pending reviews: ${error}`);
    }
  }

  // Get user's reviews
  async getUserReviews(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ reviews: IReview[]; total: number }> {
    try {
      const skip = (page - 1) * limit;

      const reviews = await Review.find({ user: userId })
        .populate('product', 'name images')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Review.countDocuments({ user: userId });

      return { reviews, total };
    } catch (error) {
      throw new Error(`Failed to get user reviews: ${error}`);
    }
  }

  // Check if user has purchased the product
  private async checkVerifiedPurchase(userId: string, productId: string): Promise<boolean> {
    try {
      const order = await Order.findOne({
        user: userId,
        'items.productId': productId,
        status: 'delivered',
      });

      return !!order;
    } catch (error) {
      console.error('Error checking verified purchase:', error);
      return false;
    }
  }

  // Update product's average rating
  private async updateProductRating(productId: string): Promise<void> {
    try {
      const stats = await this.getReviewStats(productId);
      
      await Product.findByIdAndUpdate(productId, {
        averageRating: stats.averageRating,
        totalReviews: stats.totalReviews,
        ratingDistribution: stats.ratingDistribution,
      });
    } catch (error) {
      console.error('Error updating product rating:', error);
    }
  }

  // Get top-rated products
  async getTopRatedProducts(limit: number = 10): Promise<any[]> {
    try {
      const products = await Product.find({ averageRating: { $gte: 4 } })
        .sort({ averageRating: -1, totalReviews: -1 })
        .limit(limit)
        .select('name images price averageRating totalReviews');

      return products;
    } catch (error) {
      throw new Error(`Failed to get top rated products: ${error}`);
    }
  }

  // Search reviews
  async searchReviews(
    query: string,
    productId?: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ reviews: IReview[]; total: number }> {
    try {
      const skip = (page - 1) * limit;
      const searchRegex = new RegExp(query, 'i');

      let filter: any = {
        status: 'approved',
        $or: [
          { title: searchRegex },
          { content: searchRegex },
        ],
      };

      if (productId) {
        filter.product = productId;
      }

      const reviews = await Review.find(filter)
        .populate('user', 'name')
        .populate('product', 'name')
        .sort({ helpfulVotes: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Review.countDocuments(filter);

      return { reviews, total };
    } catch (error) {
      throw new Error(`Failed to search reviews: ${error}`);
    }
  }

  // Get review analytics for admin
  async getReviewAnalytics(): Promise<any> {
    try {
      const totalReviews = await Review.countDocuments();
      const pendingReviews = await Review.countDocuments({ status: 'pending' });
      const approvedReviews = await Review.countDocuments({ status: 'approved' });
      const rejectedReviews = await Review.countDocuments({ status: 'rejected' });

      const averageRating = await Review.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: null, avgRating: { $avg: '$rating' } } }
      ]);

      const reviewsByMonth = await Review.aggregate([
        { $match: { status: 'approved' } },
        {
          $group: {
            _id: { $month: '$createdAt' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } }
      ]);

      return {
        totalReviews,
        pendingReviews,
        approvedReviews,
        rejectedReviews,
        averageRating: averageRating[0]?.avgRating || 0,
        reviewsByMonth,
      };
    } catch (error) {
      throw new Error(`Failed to get review analytics: ${error}`);
    }
  }
}
