import { Review } from '../model/review';
import { User } from '../model/user';
import { Product } from '../model/product';
import { EmailService } from './emailService';

export interface ModerationRequest {
  reviewId: string;
  moderatorId: string;
  action: 'approve' | 'reject' | 'flag' | 'edit' | 'delete' | 'escalate';
  reason?: string;
  editedContent?: {
    rating?: number;
    content?: string;
    title?: string;
  };
  metadata?: {
    flaggedWords?: string[];
    sentimentScore?: number;
    spamScore?: number;
    fakeReviewScore?: number;
  };
}

export interface ModerationResponse {
  success: boolean;
  message: string;
  review?: any;
  moderation?: any;
}

export interface ModerationRule {
  id: string;
  name: string;
  description: string;
  type: 'keyword' | 'sentiment' | 'spam' | 'fake_pattern' | 'rating_pattern' | 'user_behavior';
  conditions: {
    keywords?: string[];
    sentimentThreshold?: number;
    spamThreshold?: number;
    fakeThreshold?: number;
    ratingPattern?: 'all_1_star' | 'all_5_star' | 'alternating' | 'suspicious_timing';
    userBehavior?: {
      newAccount?: boolean;
      reviewFrequency?: number;
      sameProductMultiple?: boolean;
    };
  };
  action: 'flag' | 'auto_approve' | 'auto_reject' | 'require_manual';
  priority: 'low' | 'medium' | 'high';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModerationQueue {
  id: string;
  reviewId: string;
  productId: string;
  userId: string;
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'escalated';
  priority: 'low' | 'medium' | 'high';
  riskScore: number;
  flags: Array<{
    type: string;
    description: string;
    confidence: number;
    triggeredBy: string;
  }>;
  assignedTo?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModerationStats {
  totalReviews: number;
  pendingReviews: number;
  approvedReviews: number;
  rejectedReviews: number;
  autoApproved: number;
  autoRejected: number;
  manualReviews: number;
  averageReviewTime: number;
  moderationAccuracy: number;
  topFlagReasons: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
  moderatorPerformance: Array<{
    moderatorId: string;
    name: string;
    reviewsHandled: number;
    averageTime: number;
    accuracy: number;
  }>;
  trends: Array<{
    date: string;
    total: number;
    approved: number;
    rejected: number;
    pending: number;
  }>;
}

export class ReviewModerationService {
  private emailService: EmailService;
  private moderationRules: ModerationRule[] = [];

  constructor() {
    this.emailService = new EmailService();
    this.initializeDefaultRules();
  }

  // Initialize default moderation rules
  private initializeDefaultRules(): void {
    this.moderationRules = [
      {
        id: 'profanity_filter',
        name: 'Profanity Filter',
        description: 'Detect and flag reviews containing profanity',
        type: 'keyword',
        conditions: {
          keywords: ['damn', 'hell', 'stupid', 'idiot', 'moron', 'jerk', 'asshole'],
        },
        action: 'flag',
        priority: 'high',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'spam_detection',
        name: 'Spam Detection',
        description: 'Detect potentially spam reviews',
        type: 'spam',
        conditions: {
          spamThreshold: 0.7,
        },
        action: 'flag',
        priority: 'medium',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'fake_review_pattern',
        name: 'Fake Review Pattern',
        description: 'Detect patterns typical of fake reviews',
        type: 'fake_pattern',
        conditions: {
          fakeThreshold: 0.6,
        },
        action: 'flag',
        priority: 'high',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'new_user_review',
        name: 'New User Review',
        description: 'Flag reviews from very new accounts',
        type: 'user_behavior',
        conditions: {
          newAccount: true,
        },
        action: 'require_manual',
        priority: 'medium',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'extreme_ratings',
        name: 'Extreme Rating Pattern',
        description: 'Flag reviews with only 1-star or 5-star ratings',
        type: 'rating_pattern',
        conditions: {
          ratingPattern: 'alternating',
        },
        action: 'flag',
        priority: 'low',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  // Auto-moderate review
  async autoModerateReview(reviewId: string): Promise<ModerationResponse> {
    try {
      const review = await Review.findById(reviewId).populate('user product');
      if (!review) {
        return {
          success: false,
          message: 'Review not found',
        };
      }

      // Calculate risk scores
      const riskAnalysis = await this.analyzeReviewRisk(review);
      
      // Apply moderation rules
      const moderationResult = await this.applyModerationRules(review, riskAnalysis);
      
      // Create moderation queue entry if needed
      let moderationQueue: ModerationQueue | null = null;
      
      if (moderationResult.requiresManualReview) {
        moderationQueue = await this.addToModerationQueue(review, moderationResult);
      }

      // Auto-approve or auto-reject if confident
      if (moderationResult.action === 'auto_approve') {
        await this.approveReview(reviewId, 'system', 'Auto-approved by moderation system');
      } else if (moderationResult.action === 'auto_reject') {
        await this.rejectReview(reviewId, 'system', 'Auto-rejected by moderation system', moderationResult.reason);
      }

      return {
        success: true,
        message: 'Review moderation completed',
        review,
        moderation: moderationQueue,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to moderate review: ${error}`,
      };
    }
  }

  // Analyze review risk
  private async analyzeReviewRisk(review: any): Promise<any> {
    try {
      const riskAnalysis = {
        spamScore: await this.calculateSpamScore(review),
        fakeReviewScore: await this.calculateFakeReviewScore(review),
        sentimentScore: await this.calculateSentimentScore(review),
        contentRisk: await this.analyzeContentRisk(review),
        userRisk: await this.analyzeUserRisk(review.user),
        overallRisk: 0,
      };

      // Calculate overall risk score
      riskAnalysis.overallRisk = Math.max(
        riskAnalysis.spamScore,
        riskAnalysis.fakeReviewScore,
        riskAnalysis.contentRisk,
        riskAnalysis.userRisk
      );

      return riskAnalysis;
    } catch (error) {
      throw new Error(`Failed to analyze review risk: ${error}`);
    }
  }

  // Calculate spam score
  private async calculateSpamScore(review: any): Promise<number> {
    let spamScore = 0;

    // Check for spam indicators
    const spamIndicators = [
      'click here', 'buy now', 'limited time', 'act fast', 'free money',
      'make money', 'work from home', 'lose weight', 'miracle', 'guarantee'
    ];

    const content = (review.content + ' ' + review.title).toLowerCase();
    spamIndicators.forEach(indicator => {
      if (content.includes(indicator)) {
        spamScore += 0.2;
      }
    });

    // Check for excessive capitalization
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.5) {
      spamScore += 0.3;
    }

    // Check for excessive punctuation
    const punctuationRatio = (content.match(/[!?.]/g) || []).length / content.length;
    if (punctuationRatio > 0.1) {
      spamScore += 0.2;
    }

    // Check for repeated characters
    const repeatedPattern = /(.)\1{3,}/.test(content);
    if (repeatedPattern) {
      spamScore += 0.3;
    }

    return Math.min(spamScore, 1);
  }

  // Calculate fake review score
  private async calculateFakeReviewScore(review: any): Promise<number> {
    let fakeScore = 0;

    // Check for generic positive phrases
    const genericPhrases = [
      'best product ever', 'amazing quality', 'highly recommend',
      'perfect condition', 'excellent service', 'love it so much',
      'cannot live without', 'changed my life', 'must buy'
    ];

    const content = review.content.toLowerCase();
    genericPhrases.forEach(phrase => {
      if (content.includes(phrase)) {
        fakeScore += 0.1;
      }
    });

    // Check for review length (very short reviews might be fake)
    if (review.content.length < 20) {
      fakeScore += 0.2;
    }

    // Check for review timing (multiple reviews in short time)
    const userReviews = await Review.find({ user: review.user._id })
      .sort({ createdAt: -1 })
      .limit(5);
    
    if (userReviews.length > 1) {
      const timeDiff = Math.abs(new Date(userReviews[0].createdAt).getTime() - new Date(review.createdAt).getTime());
      if (timeDiff < 60000) { // Less than 1 minute
        fakeScore += 0.4;
      }
    }

    // Check for same product reviews from same user
    const sameProductReviews = await Review.find({
      user: review.user._id,
      product: review.product._id,
    });
    
    if (sameProductReviews.length > 1) {
      fakeScore += 0.5;
    }

    return Math.min(fakeScore, 1);
  }

  // Calculate sentiment score
  private async calculateSentimentScore(review: any): Promise<number> {
    // Simplified sentiment analysis
    const positiveWords = [
      'good', 'great', 'excellent', 'amazing', 'love', 'perfect',
      'awesome', 'fantastic', 'wonderful', 'best', 'nice'
    ];

    const negativeWords = [
      'bad', 'terrible', 'awful', 'hate', 'worst', 'disappoint',
      'poor', 'cheap', 'broken', 'useless', 'waste', 'refund'
    ];

    const content = review.content.toLowerCase();
    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      const matches = content.match(regex);
      if (matches) positiveCount += matches.length;
    });

    negativeWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      const matches = content.match(regex);
      if (matches) negativeCount += matches.length;
    });

    const totalWords = content.split(/\s+/).length;
    const sentimentRatio = (positiveCount - negativeCount) / totalWords;
    
    // Convert to 0-1 scale where 0.5 is neutral
    return Math.max(0, Math.min(1, (sentimentRatio + 1) / 2));
  }

  // Analyze content risk
  private async analyzeContentRisk(review: any): Promise<number> {
    let riskScore = 0;

    // Check for profanity
    const profanityList = [
      'damn', 'hell', 'stupid', 'idiot', 'moron', 'jerk',
      'asshole', 'bastard', 'bitch', 'crap', 'shit'
    ];

    const content = review.content.toLowerCase();
    profanityList.forEach(word => {
      if (content.includes(word)) {
        riskScore += 0.3;
      }
    });

    // Check for personal information
    const personalInfoPatterns = [
      /\b\d{3}-\d{3}-\d{4}\b/, // Phone number
      /\b\d{4}\s\d{4}\s\d{4}\s\d{4}\b/, // Credit card
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
    ];

    personalInfoPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        riskScore += 0.5;
      }
    });

    // Check for hate speech
    const hateSpeech = [
      'hate', 'kill', 'die', 'racist', 'sexist', 'homophobic',
      'terrorist', 'nazi', 'kkk', 'white power'
    ];

    hateSpeech.forEach(word => {
      if (content.includes(word)) {
        riskScore += 0.8;
      }
    });

    return Math.min(riskScore, 1);
  }

  // Analyze user risk
  private async analyzeUserRisk(user: any): Promise<number> {
    let riskScore = 0;

    // Check account age
    const accountAge = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (accountAge < 7) {
      riskScore += 0.3;
    } else if (accountAge < 30) {
      riskScore += 0.1;
    }

    // Check review frequency
    const recentReviews = await Review.find({
      user: user._id,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    });

    if (recentReviews.length > 10) {
      riskScore += 0.4;
    } else if (recentReviews.length > 5) {
      riskScore += 0.2;
    }

    // Check user verification status
    if (!user.isVerified) {
      riskScore += 0.2;
    }

    // Check user's review history
    const allReviews = await Review.find({ user: user._id });
    const oneStarReviews = allReviews.filter(r => r.rating === 1).length;
    const fiveStarReviews = allReviews.filter(r => r.rating === 5).length;
    
    if (oneStarReviews > allReviews.length * 0.8 || fiveStarReviews > allReviews.length * 0.8) {
      riskScore += 0.3;
    }

    return Math.min(riskScore, 1);
  }

  // Apply moderation rules
  private async applyModerationRules(review: any, riskAnalysis: any): Promise<any> {
    let requiresManualReview = false;
    let action = 'auto_approve';
    let reason = '';
    const flags = [];

    for (const rule of this.moderationRules) {
      if (!rule.isActive) continue;

      const ruleResult = await this.evaluateRule(rule, review, riskAnalysis);
      
      if (ruleResult.triggered) {
        flags.push({
          type: rule.type,
          description: ruleResult.description,
          confidence: ruleResult.confidence,
          triggeredBy: rule.id,
        });

        if (rule.action === 'auto_reject') {
          action = 'auto_reject';
          reason = ruleResult.description;
          break;
        } else if (rule.action === 'require_manual') {
          requiresManualReview = true;
          action = 'require_manual';
        } else if (rule.action === 'flag' && !requiresManualReview) {
          requiresManualReview = true;
          action = 'require_manual';
        }
      }
    }

    return {
      requiresManualReview,
      action,
      reason,
      flags,
      riskScore: riskAnalysis.overallRisk,
    };
  }

  // Evaluate individual rule
  private async evaluateRule(rule: ModerationRule, review: any, riskAnalysis: any): Promise<any> {
    let triggered = false;
    let description = '';
    let confidence = 0;

    switch (rule.type) {
      case 'keyword':
        if (rule.conditions.keywords) {
          const content = (review.content + ' ' + review.title).toLowerCase();
          const matchedKeywords = rule.conditions.keywords.filter(keyword => 
            content.includes(keyword.toLowerCase())
          );
          
          if (matchedKeywords.length > 0) {
            triggered = true;
            description = `Contains flagged keywords: ${matchedKeywords.join(', ')}`;
            confidence = matchedKeywords.length / rule.conditions.keywords.length;
          }
        }
        break;

      case 'sentiment':
        if (rule.conditions.sentimentThreshold) {
          if (riskAnalysis.sentimentScore < rule.conditions.sentimentThreshold) {
            triggered = true;
            description = `Negative sentiment detected: ${riskAnalysis.sentimentScore}`;
            confidence = 1 - riskAnalysis.sentimentScore;
          }
        }
        break;

      case 'spam':
        if (rule.conditions.spamThreshold) {
          if (riskAnalysis.spamScore > rule.conditions.spamThreshold) {
            triggered = true;
            description = `High spam probability: ${riskAnalysis.spamScore}`;
            confidence = riskAnalysis.spamScore;
          }
        }
        break;

      case 'fake_pattern':
        if (rule.conditions.fakeThreshold) {
          if (riskAnalysis.fakeReviewScore > rule.conditions.fakeThreshold) {
            triggered = true;
            description = `Fake review pattern detected: ${riskAnalysis.fakeReviewScore}`;
            confidence = riskAnalysis.fakeReviewScore;
          }
        }
        break;

      case 'user_behavior':
        if (rule.conditions.newAccount) {
          const accountAge = (Date.now() - new Date(review.user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
          if (accountAge < 7) {
            triggered = true;
            description = 'Review from very new account';
            confidence = 0.8;
          }
        }
        break;

      case 'rating_pattern':
        if (rule.conditions.ratingPattern === 'alternating') {
          // Check if user has alternating extreme ratings
          const userReviews = await Review.find({ user: review.user._id })
            .sort({ createdAt: -1 })
            .limit(10);
          
          const extremeRatings = userReviews.filter(r => r.rating === 1 || r.rating === 5);
          if (extremeRatings.length > userReviews.length * 0.8) {
            triggered = true;
            description = 'Pattern of extreme ratings detected';
            confidence = extremeRatings.length / userReviews.length;
          }
        }
        break;
    }

    return { triggered, description, confidence };
  }

  // Add to moderation queue
  private async addToModerationQueue(review: any, moderationResult: any): Promise<ModerationQueue> {
    try {
      const queue: ModerationQueue = {
        id: this.generateId(),
        reviewId: review._id.toString(),
        productId: review.product._id.toString(),
        userId: review.user._id.toString(),
        status: 'pending',
        priority: this.determinePriority(moderationResult.riskScore),
        riskScore: moderationResult.riskScore,
        flags: moderationResult.flags,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // In a real app, you'd save to database
      console.log(`Review added to moderation queue: ${queue.id}`);
      
      return queue;
    } catch (error) {
      throw new Error(`Failed to add to moderation queue: ${error}`);
    }
  }

  // Determine priority based on risk score
  private determinePriority(riskScore: number): 'low' | 'medium' | 'high' {
    if (riskScore >= 0.7) return 'high';
    if (riskScore >= 0.4) return 'medium';
    return 'low';
  }

  // Manual moderation
  async moderateReview(request: ModerationRequest): Promise<ModerationResponse> {
    try {
      const review = await Review.findById(request.reviewId).populate('user product');
      if (!review) {
        return {
          success: false,
          message: 'Review not found',
        };
      }

      // Create moderation record
      const moderation = {
        id: this.generateId(),
        reviewId: request.reviewId,
        moderatorId: request.moderatorId,
        action: request.action,
        reason: request.reason,
        createdAt: new Date(),
      };

      // Apply moderation action
      switch (request.action) {
        case 'approve':
          await this.approveReview(request.reviewId, request.moderatorId, request.reason);
          break;
        case 'reject':
          await this.rejectReview(request.reviewId, request.moderatorId, request.reason);
          break;
        case 'edit':
          await this.editReview(request.reviewId, request.editedContent, request.moderatorId);
          break;
        case 'delete':
          await this.deleteReview(request.reviewId, request.moderatorId, request.reason);
          break;
        case 'escalate':
          await this.escalateReview(request.reviewId, request.moderatorId, request.reason);
          break;
      }

      // Update moderation queue
      await this.updateModerationQueue(request.reviewId, request.action, request.moderatorId);

      // Send notification to user if needed
      if (['reject', 'edit', 'delete'].includes(request.action)) {
        await this.notifyUser(review.user, request.action, request.reason);
      }

      return {
        success: true,
        message: 'Review moderated successfully',
        review,
        moderation,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to moderate review: ${error}`,
      };
    }
  }

  // Approve review
  private async approveReview(reviewId: string, moderatorId: string, reason?: string): Promise<void> {
    try {
      await Review.findByIdAndUpdate(reviewId, {
        status: 'approved',
        moderatedAt: new Date(),
        moderatedBy: moderatorId,
        moderationReason: reason,
      });

      console.log(`Review ${reviewId} approved by ${moderatorId}`);
    } catch (error) {
      throw new Error(`Failed to approve review: ${error}`);
    }
  }

  // Reject review
  private async rejectReview(reviewId: string, moderatorId: string, reason: string): Promise<void> {
    try {
      await Review.findByIdAndUpdate(reviewId, {
        status: 'rejected',
        moderatedAt: new Date(),
        moderatedBy: moderatorId,
        moderationReason: reason,
      });

      console.log(`Review ${reviewId} rejected by ${moderatorId}: ${reason}`);
    } catch (error) {
      throw new Error(`Failed to reject review: ${error}`);
    }
  }

  // Edit review
  private async editReview(reviewId: string, editedContent: any, moderatorId: string): Promise<void> {
    try {
      const updateData: any = {
        moderatedAt: new Date(),
        moderatedBy: moderatorId,
        moderationReason: 'Content edited by moderator',
      };

      if (editedContent.rating !== undefined) updateData.rating = editedContent.rating;
      if (editedContent.content !== undefined) updateData.content = editedContent.content;
      if (editedContent.title !== undefined) updateData.title = editedContent.title;

      await Review.findByIdAndUpdate(reviewId, updateData);

      console.log(`Review ${reviewId} edited by ${moderatorId}`);
    } catch (error) {
      throw new Error(`Failed to edit review: ${error}`);
    }
  }

  // Delete review
  private async deleteReview(reviewId: string, moderatorId: string, reason: string): Promise<void> {
    try {
      await Review.findByIdAndDelete(reviewId);

      console.log(`Review ${reviewId} deleted by ${moderatorId}: ${reason}`);
    } catch (error) {
      throw new Error(`Failed to delete review: ${error}`);
    }
  }

  // Escalate review
  private async escalateReview(reviewId: string, moderatorId: string, reason: string): Promise<void> {
    try {
      // Update moderation queue to escalated status
      console.log(`Review ${reviewId} escalated by ${moderatorId}: ${reason}`);
    } catch (error) {
      throw new Error(`Failed to escalate review: ${error}`);
    }
  }

  // Update moderation queue
  private async updateModerationQueue(reviewId: string, action: string, moderatorId: string): Promise<void> {
    try {
      // In a real app, you'd update the queue entry
      console.log(`Moderation queue updated for review ${reviewId}: ${action} by ${moderatorId}`);
    } catch (error) {
      throw new Error(`Failed to update moderation queue: ${error}`);
    }
  }

  // Notify user
  private async notifyUser(user: any, action: string, reason: string): Promise<void> {
    try {
      const emailData = {
        to: user.email,
        subject: 'Review Moderation Notice',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #ff9900; color: white; padding: 20px; text-align: center;">
              <h1>📝 Review Moderation Notice</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Hi ${user.name},</h2>
              <p>Your review has been ${action} by our moderation team.</p>
              
              <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Moderation Details</h3>
                <p><strong>Action:</strong> ${action}</p>
                <p><strong>Reason:</strong> ${reason}</p>
                <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
              </div>

              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Our Review Guidelines</h4>
                <ul>
                  <li>Be honest and authentic in your reviews</li>
                  <li>Avoid using offensive language</li>
                  <li>Focus on the product, not the seller</li>
                  <li>Don't post fake or misleading reviews</li>
                </ul>
              </div>

              <p>If you believe this was done in error, please contact our support team.</p>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send moderation notification:', error);
    }
  }

  // Get moderation queue
  async getModerationQueue(
    status?: string,
    priority?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ queue: ModerationQueue[]; total: number }> {
    try {
      // In a real app, you'd fetch from database with pagination
      const queue: ModerationQueue[] = [
        {
          id: '1',
          reviewId: '123',
          productId: '456',
          userId: '789',
          status: 'pending',
          priority: 'high',
          riskScore: 0.8,
          flags: [
            {
              type: 'spam',
              description: 'High spam probability detected',
              confidence: 0.85,
              triggeredBy: 'spam_detection',
            },
          ],
          createdAt: new Date(Date.now() - 3600000),
          updatedAt: new Date(Date.now() - 3600000),
        },
        {
          id: '2',
          reviewId: '124',
          productId: '457',
          userId: '790',
          status: 'pending',
          priority: 'medium',
          riskScore: 0.5,
          flags: [
            {
              type: 'fake_pattern',
              description: 'Fake review pattern detected',
              confidence: 0.6,
              triggeredBy: 'fake_review_pattern',
            },
          ],
          createdAt: new Date(Date.now() - 7200000),
          updatedAt: new Date(Date.now() - 7200000),
        },
      ];

      return {
        queue: queue.slice((page - 1) * limit, page * limit),
        total: queue.length,
      };
    } catch (error) {
      throw new Error(`Failed to get moderation queue: ${error}`);
    }
  }

  // Get moderation statistics
  async getModerationStats(timeRange?: { start: Date; end: Date }): Promise<ModerationStats> {
    try {
      // In a real app, you'd calculate from database
      return {
        totalReviews: 10000,
        pendingReviews: 150,
        approvedReviews: 8500,
        rejectedReviews: 1200,
        autoApproved: 6000,
        autoRejected: 800,
        manualReviews: 3200,
        averageReviewTime: 45, // minutes
        moderationAccuracy: 0.92,
        topFlagReasons: [
          { reason: 'Spam', count: 450, percentage: 37.5 },
          { reason: 'Fake Review Pattern', count: 320, percentage: 26.7 },
          { reason: 'Profanity', count: 280, percentage: 23.3 },
          { reason: 'New User', count: 150, percentage: 12.5 },
        ],
        moderatorPerformance: [
          {
            moderatorId: '1',
            name: 'John Smith',
            reviewsHandled: 450,
            averageTime: 35,
            accuracy: 0.94,
          },
          {
            moderatorId: '2',
            name: 'Jane Doe',
            reviewsHandled: 380,
            averageTime: 42,
            accuracy: 0.91,
          },
        ],
        trends: [
          { date: '2024-01-01', total: 150, approved: 120, rejected: 25, pending: 5 },
          { date: '2024-01-02', total: 180, approved: 145, rejected: 30, pending: 5 },
          { date: '2024-01-03', total: 165, approved: 135, rejected: 25, pending: 5 },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get moderation stats: ${error}`);
    }
  }

  // Create moderation rule
  async createModerationRule(rule: Partial<ModerationRule>): Promise<{ success: boolean; message: string; rule?: ModerationRule }> {
    try {
      const newRule: ModerationRule = {
        id: this.generateId(),
        name: rule.name || '',
        description: rule.description || '',
        type: rule.type || 'keyword',
        conditions: rule.conditions || {},
        action: rule.action || 'flag',
        priority: rule.priority || 'medium',
        isActive: rule.isActive !== false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.moderationRules.push(newRule);

      return {
        success: true,
        message: 'Moderation rule created successfully',
        rule: newRule,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create moderation rule: ${error}`,
      };
    }
  }

  // Get moderation rules
  async getModerationRules(): Promise<ModerationRule[]> {
    return this.moderationRules;
  }

  // Update moderation rule
  async updateModerationRule(ruleId: string, updates: Partial<ModerationRule>): Promise<{ success: boolean; message: string }> {
    try {
      const ruleIndex = this.moderationRules.findIndex(r => r.id === ruleId);
      if (ruleIndex === -1) {
        return {
          success: false,
          message: 'Moderation rule not found',
        };
      }

      this.moderationRules[ruleIndex] = {
        ...this.moderationRules[ruleIndex],
        ...updates,
        updatedAt: new Date(),
      };

      return {
        success: true,
        message: 'Moderation rule updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update moderation rule: ${error}`,
      };
    }
  }

  // Delete moderation rule
  async deleteModerationRule(ruleId: string): Promise<{ success: boolean; message: string }> {
    try {
      const ruleIndex = this.moderationRules.findIndex(r => r.id === ruleId);
      if (ruleIndex === -1) {
        return {
          success: false,
          message: 'Moderation rule not found',
        };
      }

      this.moderationRules.splice(ruleIndex, 1);

      return {
        success: true,
        message: 'Moderation rule deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to delete moderation rule: ${error}`,
      };
    }
  }

  // Generate unique ID
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Export moderation data
  async exportModerationData(
    timeRange: { start: Date; end: Date },
    format: 'json' | 'csv' | 'pdf'
  ): Promise<any> {
    try {
      // In a real app, you'd fetch and format data
      return {
        data: {
          timeRange,
          totalModerated: 1000,
          approved: 800,
          rejected: 150,
          pending: 50,
        },
        format,
        exportedAt: new Date(),
        filename: `moderation_data_${Date.now()}.${format}`,
      };
    } catch (error) {
      throw new Error(`Failed to export moderation data: ${error}`);
    }
  }
}
