import { Referral, IReferral } from '../model/referral';
import { User } from '../model/user';
import { EmailService } from './emailService';
import { randomBytes } from 'crypto';

export interface ReferralRequest {
  referrerId: string;
  rewardType: 'discount' | 'credit' | 'points';
  rewardValue: number;
  rewardDescription: string;
  expiryDays?: number;
  campaign?: string;
}

export interface ReferralResponse {
  success: boolean;
  referralId?: string;
  referralCode?: string;
  referralLink?: string;
  message: string;
}

export interface ReferralStats {
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  expiredReferrals: number;
  totalRewards: number;
  conversionRate: number;
  topReferrers: Array<{
    userId: string;
    userName: string;
    completedReferrals: number;
    totalRewards: number;
  }>;
  referralsByMonth: Array<{
    month: string;
    count: number;
  }>;
}

export class ReferralService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  // Create a new referral program for user
  async createReferralProgram(request: ReferralRequest): Promise<ReferralResponse> {
    try {
      // Check if user already has an active referral program
      const existingReferral = await Referral.findOne({
        referrerId: request.referrerId,
        status: 'pending',
      });

      if (existingReferral) {
        return {
          success: false,
          message: 'User already has an active referral program',
        };
      }

      const referralCode = this.generateReferralCode();
      const referralLink = `https://yourapp.com/referral/${referralCode}`;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + (request.expiryDays || 90));

      const referral = new Referral({
        referrerId: request.referrerId,
        referralCode,
        status: 'pending',
        rewardType: request.rewardType,
        rewardValue: request.rewardValue,
        rewardDescription: request.rewardDescription,
        referralLink,
        expiryDate,
        metadata: {
          campaign: request.campaign,
        },
      });

      await referral.save();

      // Send referral program details to user
      await this.sendReferralProgramDetails(request.referrerId, referral);

      return {
        success: true,
        referralId: referral._id.toString(),
        referralCode,
        referralLink,
        message: 'Referral program created successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create referral program: ${error}`,
      };
    }
  }

  // Get user's referral program
  async getUserReferralProgram(userId: string): Promise<IReferral | null> {
    try {
      const referral = await Referral.findOne({
        referrerId: userId,
        status: 'pending',
      }).populate('referrerId', 'name email');

      return referral;
    } catch (error) {
      throw new Error(`Failed to get user referral program: ${error}`);
    }
  }

  // Process referral (when someone signs up using referral code)
  async processReferral(
    referralCode: string,
    referredUserId: string
  ): Promise<ReferralResponse> {
    try {
      const referral = await Referral.findOne({
        referralCode,
        status: 'pending',
      });

      if (!referral) {
        return {
          success: false,
          message: 'Invalid or expired referral code',
        };
      }

      // Check if referral has expired
      if (new Date() > referral.expiryDate) {
        referral.status = 'expired';
        await referral.save();
        return {
          success: false,
          message: 'Referral code has expired',
        };
      }

      // Check if user is referring themselves
      if (referral.referrerId === referredUserId) {
        return {
          success: false,
          message: 'Cannot refer yourself',
        };
      }

      // Check if user has already been referred
      const existingReferral = await Referral.findOne({
        referredUserId,
        status: { $in: ['pending', 'completed'] },
      });

      if (existingReferral) {
        return {
          success: false,
          message: 'User has already been referred',
        };
      }

      // Update referral
      referral.referredUserId = referredUserId;
      referral.status = 'completed';
      referral.completedAt = new Date();
      await referral.save();

      // Apply reward to referrer
      await this.applyReferralReward(referral.referrerId, referral);

      // Apply welcome reward to referred user
      await this.applyWelcomeReward(referredUserId, referral);

      // Send notifications
      await this.notifyReferralCompleted(referral);

      return {
        success: true,
        referralId: referral._id.toString(),
        message: 'Referral processed successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to process referral: ${error}`,
      };
    }
  }

  // Get user's referral history
  async getUserReferralHistory(userId: string, page: number = 1, limit: number = 20): Promise<{ referrals: IReferral[]; total: number }> {
    try {
      const skip = (page - 1) * limit;

      const referrals = await Referral.find({
        $or: [
          { referrerId: userId },
          { referredUserId: userId },
        ],
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('referrerId', 'name email')
        .populate('referredUserId', 'name email');

      const total = await Referral.countDocuments({
        $or: [
          { referrerId: userId },
          { referredUserId: userId },
        ],
      });

      return { referrals, total };
    } catch (error) {
      throw new Error(`Failed to get user referral history: ${error}`);
    }
  }

  // Get referral statistics
  async getReferralStats(): Promise<ReferralStats> {
    try {
      const totalReferrals = await Referral.countDocuments();
      const completedReferrals = await Referral.countDocuments({ status: 'completed' });
      const pendingReferrals = await Referral.countDocuments({ status: 'pending' });
      const expiredReferrals = await Referral.countDocuments({ status: 'expired' });

      // Calculate total rewards
      const completedReferralDocs = await Referral.find({ status: 'completed' });
      const totalRewards = completedReferralDocs.reduce((sum, referral) => sum + referral.rewardValue, 0);

      // Calculate conversion rate
      const conversionRate = totalReferrals > 0 ? (completedReferrals / totalReferrals) * 100 : 0;

      // Get top referrers
      const topReferrers = await Referral.aggregate([
        { $match: { status: 'completed' } },
        {
          $group: {
            _id: '$referrerId',
            completedReferrals: { $sum: 1 },
            totalRewards: { $sum: '$rewardValue' },
          },
        },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        {
          $project: {
            userId: '$_id',
            userName: '$user.name',
            completedReferrals: 1,
            totalRewards: 1,
          },
        },
        { $sort: { completedReferrals: -1 } },
        { $limit: 10 },
      ]);

      // Get referrals by month
      const referralsByMonth = await Referral.aggregate([
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      return {
        totalReferrals,
        completedReferrals,
        pendingReferrals,
        expiredReferrals,
        totalRewards,
        conversionRate: Math.round(conversionRate * 10) / 10,
        topReferrers,
        referralsByMonth,
      };
    } catch (error) {
      throw new Error(`Failed to get referral stats: ${error}`);
    }
  }

  // Update referral program
  async updateReferralProgram(
    referralId: string,
    userId: string,
    updates: Partial<Pick<IReferral, 'rewardType' | 'rewardValue' | 'rewardDescription' | 'expiryDate'>>
  ): Promise<ReferralResponse> {
    try {
      const referral = await Referral.findOne({ _id: referralId, referrerId: userId });
      
      if (!referral) {
        return {
          success: false,
          message: 'Referral program not found',
        };
      }

      Object.assign(referral, updates);
      await referral.save();

      return {
        success: true,
        message: 'Referral program updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update referral program: ${error}`,
      };
    }
  }

  // Cancel referral program
  async cancelReferralProgram(referralId: string, userId: string): Promise<ReferralResponse> {
    try {
      const referral = await Referral.findOne({ _id: referralId, referrerId: userId });
      
      if (!referral) {
        return {
          success: false,
          message: 'Referral program not found',
        };
      }

      referral.status = 'cancelled';
      await referral.save();

      return {
        success: true,
        message: 'Referral program cancelled successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to cancel referral program: ${error}`,
      };
    }
  }

  // Apply referral reward to referrer
  private async applyReferralReward(referrerId: string, referral: IReferral): Promise<void> {
    try {
      const user = await User.findById(referrerId);
      if (!user) return;

      // Apply reward based on type
      switch (referral.rewardType) {
        case 'discount':
          // Add discount code to user's account
          await this.addDiscountCodeToUser(referrerId, referral);
          break;
        case 'credit':
          // Add credit to user's account
          user.accountBalance = (user.accountBalance || 0) + referral.rewardValue;
          await user.save();
          break;
        case 'points':
          // Add loyalty points
          // This would integrate with your loyalty program
          await this.addLoyaltyPointsToUser(referrerId, referral.rewardValue);
          break;
      }

      // Send reward notification
      await this.sendRewardNotification(referrerId, referral);
    } catch (error) {
      console.error('Failed to apply referral reward:', error);
    }
  }

  // Apply welcome reward to referred user
  private async applyWelcomeReward(referredUserId: string, referral: IReferral): Promise<void> {
    try {
      const user = await User.findById(referredUserId);
      if (!user) return;

      // Apply welcome reward
      switch (referral.rewardType) {
        case 'discount':
          await this.addDiscountCodeToUser(referredUserId, referral);
          break;
        case 'credit':
          user.accountBalance = (user.accountBalance || 0) + referral.rewardValue;
          await user.save();
          break;
        case 'points':
          await this.addLoyaltyPointsToUser(referredUserId, referral.rewardValue);
          break;
      }

      // Send welcome notification
      await this.sendWelcomeRewardNotification(referredUserId, referral);
    } catch (error) {
      console.error('Failed to apply welcome reward:', error);
    }
  }

  // Add discount code to user
  private async addDiscountCodeToUser(userId: string, referral: IReferral): Promise<void> {
    // In a real app, you'd have a discount codes system
    console.log(`Adding discount code to user ${userId}: ${referral.rewardValue}% off`);
  }

  // Add loyalty points to user
  private async addLoyaltyPointsToUser(userId: string, points: number): Promise<void> {
    // In a real app, you'd integrate with your loyalty program
    console.log(`Adding ${points} loyalty points to user ${userId}`);
  }

  // Send referral program details
  private async sendReferralProgramDetails(userId: string, referral: IReferral): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      const emailData = {
        to: user.email,
        subject: 'Your Referral Program is Ready!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #232f3e; color: white; padding: 20px; text-align: center;">
              <h1>🎉 Start Referring Friends!</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Hi ${user.name},</h2>
              <p>Your referral program is now active! Share your referral link and earn rewards when your friends sign up.</p>
              
              <div style="background-color: #f0f2f2; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Your Referral Details:</h3>
                <p><strong>Referral Code:</strong> ${referral.referralCode}</p>
                <p><strong>Referral Link:</strong> ${referral.referralLink}</p>
                <p><strong>Reward:</strong> ${referral.rewardDescription}</p>
                <p><strong>Expires:</strong> ${referral.expiryDate.toLocaleDateString()}</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${referral.referralLink}" style="background-color: #ff9900; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Share Your Link
                </a>
              </div>

              <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>How it works:</h4>
                <ol>
                  <li>Share your referral link with friends</li>
                  <li>They sign up using your link or code</li>
li>Both of you get rewarded!</li>
                </ol>
              </div>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send referral program details:', error);
    }
  }

  // Send reward notification
  private async sendRewardNotification(userId: string, referral: IReferral): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      const emailData = {
        to: user.email,
        subject: 'Congratulations! You Earned a Reward!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #232f3e; color: white; padding: 20px; text-align: center;">
              <h1>🎁 Reward Earned!</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Hi ${user.name},</h2>
              <p>Congratulations! Someone signed up using your referral link and you've earned a reward!</p>
              
              <div style="background-color: #f0f2f2; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Your Reward:</h3>
                <p><strong>${referral.rewardDescription}</strong></p>
                <p><strong>Value:</strong> ${referral.rewardValue}</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://yourapp.com/referrals" style="background-color: #ff9900; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  View Your Referrals
                </a>
              </div>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send reward notification:', error);
    }
  }

  // Send welcome reward notification
  private async sendWelcomeRewardNotification(userId: string, referral: IReferral): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      const emailData = {
        to: user.email,
        subject: 'Welcome! You Got a Reward!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #232f3e; color: white; padding: 20px; text-align: center;">
              <h1>🎉 Welcome Reward!</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Hi ${user.name},</h2>
              <p>Welcome to Amazon Clone! You've received a special reward for signing up through a referral link.</p>
              
              <div style="background-color: #f0f2f2; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Your Welcome Reward:</h3>
                <p><strong>${referral.rewardDescription}</strong></p>
                <p><strong>Value:</strong> ${referral.rewardValue}</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://yourapp.com/shop" style="background-color: #ff9900; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Start Shopping
                </a>
              </div>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send welcome reward notification:', error);
    }
  }

  // Notify referral completed
  private async notifyReferralCompleted(referral: IReferral): Promise<void> {
    try {
      const referrer = await User.findById(referral.referrerId);
      const referred = await User.findById(referral.referredUserId);

      if (referrer) {
        const emailData = {
          to: referrer.email,
          subject: 'Your Referral Was Successful!',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #232f3e; color: white; padding: 20px; text-align: center;">
                <h1>🎉 Referral Successful!</h1>
              </div>
              <div style="padding: 20px;">
                <h2>Hi ${referrer.name},</h2>
                <p>Great news! Someone signed up using your referral link and your referral was successful!</p>
                
                <div style="background-color: #f0f2f2; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <h3>Referral Details:</h3>
                  <p><strong>Reward:</strong> ${referral.rewardDescription}</p>
                  <p><strong>Status:</strong> Completed</p>
                  <p><strong>Date:</strong> ${referral.completedAt?.toLocaleString()}</p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://yourapp.com/referrals" style="background-color: #ff9900; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                    View All Referrals
                  </a>
                </div>
              </div>
            </div>
          `,
        };

        await this.emailService.sendEmail(emailData);
      }
    } catch (error) {
      console.error('Failed to notify referral completed:', error);
    }
  }

  // Generate referral code
  private generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Validate referral code
  async validateReferralCode(referralCode: string): Promise<{ valid: boolean; referral?: IReferral; message: string }> {
    try {
      const referral = await Referral.findOne({ referralCode });

      if (!referral) {
        return { valid: false, message: 'Invalid referral code' };
      }

      if (referral.status !== 'pending') {
        return { valid: false, referral, message: 'Referral code is not active' };
      }

      if (new Date() > referral.expiryDate) {
        referral.status = 'expired';
        await referral.save();
        return { valid: false, referral, message: 'Referral code has expired' };
      }

      return { valid: true, referral, message: 'Referral code is valid' };
    } catch (error) {
      return { valid: false, message: `Failed to validate referral code: ${error}` };
    }
  }

  // Get referral program analytics
  async getReferralAnalytics(): Promise<any> {
    try {
      const stats = await this.getReferralStats();
      
      // Additional analytics
      const recentReferrals = await Referral.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('referrerId', 'name')
        .populate('referredUserId', 'name');

      const performanceMetrics = await this.calculatePerformanceMetrics();

      return {
        stats,
        recentReferrals,
        performanceMetrics,
      };
    } catch (error) {
      throw new Error(`Failed to get referral analytics: ${error}`);
    }
  }

  // Calculate performance metrics
  private async calculatePerformanceMetrics(): Promise<any> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentReferrals = await Referral.find({
        createdAt: { $gte: thirtyDaysAgo },
      });

      const completedRecent = recentReferrals.filter(r => r.status === 'completed').length;
      const conversionRate = recentReferrals.length > 0 ? (completedRecent / recentReferrals.length) * 100 : 0;

      const averageRewardValue = completedRecent > 0 
        ? recentReferrals.reduce((sum, r) => sum + r.rewardValue, 0) / completedRecent 
        : 0;

      return {
        last30Days: recentReferrals.length,
        last30DaysCompleted: completedRecent,
        last30DaysConversionRate: Math.round(conversionRate * 10) / 10,
        averageRewardValue: Math.round(averageRewardValue * 100) / 100,
      };
    } catch (error) {
      console.error('Failed to calculate performance metrics:', error);
      return {};
    }
  }
}
