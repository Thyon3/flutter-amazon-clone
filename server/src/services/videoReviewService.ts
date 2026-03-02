import { VideoReview, IVideoReview } from '../model/videoReview';
import { Product } from '../model/product';
import { User } from '../model/user';
import { Order } from '../model/order';
import { EmailService } from './emailService';

export interface VideoReviewRequest {
  userId: string;
  productId: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  fileSize: number;
  resolution: {
    width: number;
    height: number;
  };
  quality: 'low' | 'medium' | 'high' | '4k';
  metadata?: {
    device?: string;
    browser?: string;
    ipAddress?: string;
    tags?: string[];
  };
}

export interface VideoReviewResponse {
  success: boolean;
  reviewId?: string;
  message: string;
  review?: IVideoReview;
}

export interface VideoReviewStats {
  totalReviews: number;
  approvedReviews: number;
  pendingReviews: number;
  flaggedReviews: number;
  totalViews: number;
  totalLikes: number;
  averageRating: number;
  topRatedReviews: Array<{
    reviewId: string;
    title: string;
    views: number;
    likes: number;
    rating: number;
  }>;
  reviewsByQuality: Record<string, number>;
}

export class VideoReviewService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  // Create a new video review
  async createVideoReview(request: VideoReviewRequest): Promise<VideoReviewResponse> {
    try {
      // Check if user has already reviewed this product
      const existingReview = await VideoReview.findOne({
        user: request.userId,
        product: request.productId,
      });

      if (existingReview) {
        return {
          success: false,
          message: 'You have already created a video review for this product',
        };
      }

      // Check if user has purchased this product
      const verifiedPurchase = await this.checkVerifiedPurchase(
        request.userId,
        request.productId
      );

      const review = new VideoReview({
        user: request.userId,
        product: request.productId,
        title: request.title,
        description: request.description,
        videoUrl: request.videoUrl,
        thumbnailUrl: request.thumbnailUrl,
        duration: request.duration,
        fileSize: request.fileSize,
        resolution: request.resolution,
        quality: request.quality,
        status: 'processing', // Start with processing status
        verifiedPurchase,
        metadata: {
          device: request.metadata?.device,
          browser: request.metadata?.browser,
          ipAddress: request.metadata?.ipAddress,
          tags: request.metadata?.tags || [],
        },
      });

      await review.save();

      // Start video processing (in a real app, you'd use a video processing service)
      await this.processVideo(review._id.toString());

      return {
        success: true,
        reviewId: review._id.toString(),
        message: 'Video review submitted successfully and is being processed',
        review,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create video review: ${error}`,
      };
    }
  }

  // Get video reviews for a product
  async getProductVideoReviews(
    productId: string,
    page: number = 1,
    limit: number = 10,
    sortBy: 'newest' | 'oldest' | 'views' | 'likes' | 'helpful' = 'newest'
  ): Promise<{ reviews: IVideoReview[]; total: number }> {
    try {
      const sortOptions: any = {
        newest: { createdAt: -1 },
        oldest: { createdAt: 1 },
        views: { 'engagement.views': -1 },
        likes: { 'engagement.likes': -1 },
        helpful: { helpfulVotes: -1 },
      };

      const skip = (page - 1) * limit;

      const reviews = await VideoReview.find({ 
        product: productId, 
        status: 'approved' 
      })
        .populate('user', 'name')
        .sort(sortOptions[sortBy])
        .skip(skip)
        .limit(limit);

      const total = await VideoReview.countDocuments({ 
        product: productId, 
        status: 'approved' 
      });

      return { reviews, total };
    } catch (error) {
      throw new Error(`Failed to get product video reviews: ${error}`);
    }
  }

  // Get video review by ID
  async getVideoReviewById(reviewId: string): Promise<IVideoReview | null> {
    try {
      const review = await VideoReview.findById(reviewId)
        .populate('user', 'name')
        .populate('product', 'name images');

      return review;
    } catch (error) {
      throw new Error(`Failed to get video review: ${error}`);
    }
  }

  // Update video review
  async updateVideoReview(
    reviewId: string,
    userId: string,
    updates: Partial<Pick<IVideoReview, 'title' | 'description' | 'isRecommended'>>
  ): Promise<VideoReviewResponse> {
    try {
      const review = await VideoReview.findOne({ _id: reviewId, user: userId });
      
      if (!review) {
        return {
          success: false,
          message: 'Video review not found',
        };
      }

      Object.assign(review, updates);
      review.status = 'processing'; // Require re-moderation after update
      await review.save();

      return {
        success: true,
        message: 'Video review updated successfully',
        review,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update video review: ${error}`,
      };
    }
  }

  // Delete video review
  async deleteVideoReview(reviewId: string, userId: string): Promise<VideoReviewResponse> {
    try {
      const review = await VideoReview.findOne({ _id: reviewId, user: userId });
      
      if (!review) {
        return {
          success: false,
          message: 'Video review not found',
        };
      }

      await VideoReview.findByIdAndDelete(reviewId);

      return {
        success: true,
        message: 'Video review deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to delete video review: ${error}`,
      };
    }
  }

  // Like/unlike video review
  async toggleLikeVideoReview(reviewId: string, userId: string): Promise<VideoReviewResponse> {
    try {
      const review = await VideoReview.findById(reviewId);
      
      if (!review) {
        return {
          success: false,
          message: 'Video review not found',
        };
      }

      // In a real app, you'd track which users liked which reviews
      // For simplicity, we'll just increment the likes count
      review.engagement.likes += 1;
      await review.save();

      return {
        success: true,
        message: 'Video review liked successfully',
        review,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to like video review: ${error}`,
      };
    }
  }

  // Mark video review as helpful
  async markVideoReviewHelpful(reviewId: string, userId: string): Promise<VideoReviewResponse> {
    try {
      const review = await VideoReview.findById(reviewId);
      
      if (!review) {
        return {
          success: false,
          message: 'Video review not found',
        };
      }

      review.helpfulVotes += 1;
      await review.save();

      return {
        success: true,
        message: 'Video review marked as helpful',
        review,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to mark video review as helpful: ${error}`,
      };
    }
  }

  // Increment view count
  async incrementViewCount(reviewId: string): Promise<VideoReviewResponse> {
    try {
      const review = await VideoReview.findById(reviewId);
      
      if (!review) {
        return {
          success: false,
          message: 'Video review not found',
        };
      }

      review.engagement.views += 1;
      await review.save();

      return {
        success: true,
        message: 'View count incremented',
        review,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to increment view count: ${error}`,
      };
    }
  }

  // Moderate video review
  async moderateVideoReview(
    reviewId: string,
    action: 'approve' | 'reject' | 'flag',
    moderatorId: string,
    flagReason?: string
  ): Promise<VideoReviewResponse> {
    try {
      const review = await VideoReview.findById(reviewId);
      
      if (!review) {
        return {
          success: false,
          message: 'Video review not found',
        };
      }

      if (action === 'flag' && flagReason) {
        review.moderationFlags.push({
          type: 'inappropriate',
          reason: flagReason,
          flaggedBy: moderatorId,
          flaggedAt: new Date(),
        });
        review.status = 'flagged';
      } else {
        review.status = action;
      }

      await review.save();

      // Send notification to user
      await this.sendModerationNotification(review, action);

      return {
        success: true,
        message: `Video review ${action}d successfully`,
        review,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to moderate video review: ${error}`,
      };
    }
  }

  // Get pending reviews for moderation
  async getPendingReviews(page: number = 1, limit: number = 20): Promise<{ reviews: IVideoReview[]; total: number }> {
    try {
      const skip = (page - 1) * limit;

      const reviews = await VideoReview.find({ status: 'ready' })
        .populate('user', 'name')
        .populate('product', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await VideoReview.countDocuments({ status: 'ready' });

      return { reviews, total };
    } catch (error) {
      throw new Error(`Failed to get pending reviews: ${error}`);
    }
  }

  // Get user's video reviews
  async getUserVideoReviews(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ reviews: IVideoReview[]; total: number }> {
    try {
      const skip = (page - 1) * limit;

      const reviews = await VideoReview.find({ user: userId })
        .populate('product', 'name images')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await VideoReview.countDocuments({ user: userId });

      return { reviews, total };
    } catch (error) {
      throw new Error(`Failed to get user video reviews: ${error}`);
    }
  }

  // Get video review statistics
  async getVideoReviewStats(): Promise<VideoReviewStats> {
    try {
      const totalReviews = await VideoReview.countDocuments();
      const approvedReviews = await VideoReview.countDocuments({ status: 'approved' });
      const pendingReviews = await VideoReview.countDocuments({ status: 'ready' });
      const flaggedReviews = await VideoReview.countDocuments({ status: 'flagged' });

      // Calculate engagement metrics
      const engagementStats = await VideoReview.aggregate([
        { $match: { status: 'approved' } },
        {
          $group: {
            _id: null,
            totalViews: { $sum: '$engagement.views' },
            totalLikes: { $sum: '$engagement.likes' },
            avgHelpfulVotes: { $avg: '$helpfulVotes' },
          },
        },
      ]);

      const stats = engagementStats[0] || { totalViews: 0, totalLikes: 0, avgHelpfulVotes: 0 };

      // Get top-rated reviews
      const topRatedReviews = await VideoReview.find({ status: 'approved' })
        .sort({ 'engagement.likes': -1, 'engagement.views': -1 })
        .limit(5)
        .select('title engagement.views engagement.likes helpfulVotes');

      // Reviews by quality
      const qualityStats = await VideoReview.aggregate([
        { $match: { status: 'approved' } },
        {
          $group: {
            _id: '$quality',
            count: { $sum: 1 },
          },
        },
      ]);

      const reviewsByQuality = qualityStats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalReviews,
        approvedReviews,
        pendingReviews,
        flaggedReviews,
        totalViews: stats.totalViews,
        totalLikes: stats.totalLikes,
        averageRating: stats.avgHelpfulVotes || 0,
        topRatedReviews: topRatedReviews.map(review => ({
          reviewId: review._id.toString(),
          title: review.title,
          views: review.engagement.views,
          likes: review.engagement.likes,
          rating: review.helpfulVotes,
        })),
        reviewsByQuality,
      };
    } catch (error) {
      throw new Error(`Failed to get video review stats: ${error}`);
    }
  }

  // Search video reviews
  async searchVideoReviews(
    query: string,
    productId?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ reviews: IVideoReview[]; total: number }> {
    try {
      const skip = (page - 1) * limit;
      const searchRegex = new RegExp(query, 'i');

      let filter: any = {
        status: 'approved',
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { 'metadata.tags': searchRegex },
        ],
      };

      if (productId) {
        filter.product = productId;
      }

      const reviews = await VideoReview.find(filter)
        .populate('user', 'name')
        .populate('product', 'name')
        .sort({ 'engagement.views': -1, createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await VideoReview.countDocuments(filter);

      return { reviews, total };
    } catch (error) {
      throw new Error(`Failed to search video reviews: ${error}`);
    }
  }

  // Process video (simulated)
  private async processVideo(reviewId: string): Promise<void> {
    try {
      // In a real app, you'd use a video processing service like AWS Elemental, FFmpeg, etc.
      // For now, we'll simulate processing with a delay
      setTimeout(async () => {
        try {
          const review = await VideoReview.findById(reviewId);
          if (!review) return;

          // Simulate processing completion
          review.status = 'ready';
          review.metadata.processingTime = Math.random() * 10000; // Random processing time
          await review.save();

          // Send notification to user
          await this.sendProcessingCompleteNotification(review);
        } catch (error) {
          console.error('Error in video processing:', error);
        }
      }, 5000); // 5 second delay
    } catch (error) {
      console.error('Failed to start video processing:', error);
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

  // Send processing complete notification
  private async sendProcessingCompleteNotification(review: IVideoReview): Promise<void> {
    try {
      const user = await User.findById(review.user);
      if (!user) return;

      const emailData = {
        to: user.email,
        subject: 'Your Video Review is Ready!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #232f3e; color: white; padding: 20px; text-align: center;">
              <h1>🎥 Video Review Ready!</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Hi ${user.name},</h2>
              <p>Great news! Your video review has been processed and is ready for review.</p>
              
              <div style="background-color: #f0f2f2; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Review Details:</h3>
                <p><strong>Title:</strong> ${review.title}</p>
                <p><strong>Duration:</strong> ${Math.floor(review.duration / 60)}:${(review.duration % 60).toString().padStart(2, '0')}</p>
                <p><strong>Quality:</strong> ${review.quality}</p>
                <p><strong>Status:</strong> Pending approval</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://yourapp.com/video-reviews/${review._id}" style="background-color: #ff9900; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  View Your Review
                </a>
              </div>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send processing complete notification:', error);
    }
  }

  // Send moderation notification
  private async sendModerationNotification(review: IVideoReview, action: string): Promise<void> {
    try {
      const user = await User.findById(review.user);
      if (!user) return;

      const emailData = {
        to: user.email,
        subject: `Your Video Review Has Been ${action}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #232f3e; color: white; padding: 20px; text-align: center;">
              <h1>🎥 Review Update</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Hi ${user.name},</h2>
              <p>Your video review has been ${action}.</p>
              
              <div style="background-color: #f0f2f2; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Review Details:</h3>
                <p><strong>Title:</strong> ${review.title}</p>
                <p><strong>Status:</strong> ${review.status}</p>
                <p><strong>Action:</strong> ${action}</p>
              </div>

              ${action === 'approved' ? `
                <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <h4>Congratulations!</h4>
                  <p>Your video review is now live and visible to other customers.</p>
                </div>
              ` : ''}

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://yourapp.com/video-reviews/${review._id}" style="background-color: #ff9900; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  View Review
                </a>
              </div>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send moderation notification:', error);
    }
  }

  // Get trending video reviews
  async getTrendingVideoReviews(limit: number = 10): Promise<IVideoReview[]> {
    try {
      const reviews = await VideoReview.find({ status: 'approved' })
        .sort({ 'engagement.views': -1, 'engagement.likes': -1 })
        .limit(limit)
        .populate('user', 'name')
        .populate('product', 'name images');

      return reviews;
    } catch (error) {
      throw new Error(`Failed to get trending video reviews: ${error}`);
    }
  }

  // Get video review analytics
  async getVideoReviewAnalytics(): Promise<any> {
    try {
      const stats = await this.getVideoReviewStats();
      
      // Additional analytics
      const recentReviews = await VideoReview.find({ status: 'approved' })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('user', 'name')
        .populate('product', 'name');

      const performanceMetrics = await this.calculatePerformanceMetrics();

      return {
        stats,
        recentReviews,
        performanceMetrics,
      };
    } catch (error) {
      throw new Error(`Failed to get video review analytics: ${error}`);
    }
  }

  // Calculate performance metrics
  private async calculatePerformanceMetrics(): Promise<any> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentReviews = await VideoReview.find({
        createdAt: { $gte: thirtyDaysAgo },
        status: 'approved',
      });

      const totalViews = recentReviews.reduce((sum, review) => sum + review.engagement.views, 0);
      const totalLikes = recentReviews.reduce((sum, review) => sum + review.engagement.likes, 0);

      return {
        last30DaysReviews: recentReviews.length,
        last30DaysViews: totalViews,
        last30DaysLikes: totalLikes,
        averageViewsPerReview: recentReviews.length > 0 ? totalViews / recentReviews.length : 0,
        averageLikesPerReview: recentReviews.length > 0 ? totalLikes / recentReviews.length : 0,
      };
    } catch (error) {
      console.error('Failed to calculate performance metrics:', error);
      return {};
    }
  }
}
