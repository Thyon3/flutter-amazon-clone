import { User } from '../model/user';
import { Order } from '../model/order';
import { Product } from '../model/product';
import { EmailService } from './emailService';

export interface LoyaltyPointsRequest {
  userId: string;
  points: number;
  type: 'earn' | 'redeem' | 'expire' | 'adjust' | 'bonus';
  source: 'purchase' | 'review' | 'referral' | 'birthday' | 'milestone' | 'promotion' | 'manual';
  description: string;
  orderId?: string;
  productId?: string;
  metadata?: any;
  expiresAt?: Date;
}

export interface LoyaltyPointsResponse {
  success: boolean;
  message: string;
  transaction?: LoyaltyTransaction;
  currentBalance?: number;
}

export interface LoyaltyTransaction {
  id: string;
  userId: string;
  points: number;
  type: 'earn' | 'redeem' | 'expire' | 'adjust' | 'bonus';
  source: string;
  description: string;
  orderId?: string;
  productId?: string;
  metadata?: any;
  createdAt: Date;
  expiresAt?: Date;
  status: 'active' | 'expired' | 'used';
}

export interface LoyaltyTier {
  id: string;
  name: string;
  description: string;
  minPoints: number;
  maxPoints?: number;
  benefits: {
    pointsMultiplier: number;
    exclusiveOffers: boolean;
    freeShipping: boolean;
    earlyAccess: boolean;
    birthdayBonus: number;
    anniversaryBonus: number;
    referralBonus: number;
  };
  color: string;
  icon: string;
  isActive: boolean;
}

export interface LoyaltyReward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  type: 'discount' | 'free_product' | 'free_shipping' | 'exclusive_access' | 'gift_card';
  value: any;
  category?: string;
  image?: string;
  isActive: boolean;
  limitedQuantity?: number;
  availableQuantity?: number;
  expiresAt?: Date;
  createdAt: Date;
}

export interface LoyaltyAccount {
  userId: string;
  currentBalance: number;
  totalEarned: number;
  totalRedeemed: number;
  tier: string;
  tierProgress: {
    currentTier: string;
    nextTier?: string;
    pointsToNextTier: number;
    progressPercentage: number;
  };
  transactions: LoyaltyTransaction[];
  preferences: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    pointExpirationAlerts: boolean;
    tierUpgradeAlerts: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface LoyaltyStats {
  totalMembers: number;
  activeMembers: number;
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  averageBalance: number;
  tierDistribution: Record<string, number>;
  topEarners: Array<{
    userId: string;
    name: string;
    balance: number;
    tier: string;
  }>;
  popularRewards: Array<{
    rewardId: string;
    name: string;
    redemptions: number;
    percentage: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    pointsIssued: number;
    pointsRedeemed: number;
    newMembers: number;
  }>;
}

export class LoyaltyPointsService {
  private emailService: EmailService;
  private tiers: LoyaltyTier[] = [];

  constructor() {
    this.emailService = new EmailService();
    this.initializeTiers();
  }

  // Initialize loyalty tiers
  private initializeTiers(): void {
    this.tiers = [
      {
        id: 'bronze',
        name: 'Bronze',
        description: 'Welcome to our loyalty program',
        minPoints: 0,
        maxPoints: 999,
        benefits: {
          pointsMultiplier: 1.0,
          exclusiveOffers: false,
          freeShipping: false,
          earlyAccess: false,
          birthdayBonus: 50,
          anniversaryBonus: 25,
          referralBonus: 100,
        },
        color: '#CD7F32',
        icon: '🥉',
        isActive: true,
      },
      {
        id: 'silver',
        name: 'Silver',
        description: 'Enjoy enhanced benefits',
        minPoints: 1000,
        maxPoints: 4999,
        benefits: {
          pointsMultiplier: 1.25,
          exclusiveOffers: true,
          freeShipping: false,
          earlyAccess: false,
          birthdayBonus: 100,
          anniversaryBonus: 50,
          referralBonus: 150,
        },
        color: '#C0C0C0',
        icon: '🥈',
        isActive: true,
      },
      {
        id: 'gold',
        name: 'Gold',
        description: 'Premium member benefits',
        minPoints: 5000,
        maxPoints: 9999,
        benefits: {
          pointsMultiplier: 1.5,
          exclusiveOffers: true,
          freeShipping: true,
          earlyAccess: true,
          birthdayBonus: 200,
          anniversaryBonus: 100,
          referralBonus: 200,
        },
        color: '#FFD700',
        icon: '🥇',
        isActive: true,
      },
      {
        id: 'platinum',
        name: 'Platinum',
        description: 'Elite member privileges',
        minPoints: 10000,
        benefits: {
          pointsMultiplier: 2.0,
          exclusiveOffers: true,
          freeShipping: true,
          earlyAccess: true,
          birthdayBonus: 500,
          anniversaryBonus: 250,
          referralBonus: 300,
        },
        color: '#E5E4E2',
        icon: '💎',
        isActive: true,
      },
    ];
  }

  // Award loyalty points
  async awardPoints(request: LoyaltyPointsRequest): Promise<LoyaltyPointsResponse> {
    try {
      // Validate request
      const validation = this.validatePointsRequest(request);
      if (!validation.valid) {
        return {
          success: false,
          message: validation.message,
        };
      }

      // Get user's loyalty account
      const account = await this.getLoyaltyAccount(request.userId);
      if (!account) {
        return {
          success: false,
          message: 'Loyalty account not found',
        };
      }

      // Apply tier multiplier
      const tier = this.getTierByPoints(account.currentBalance);
      const multiplier = tier.benefits.pointsMultiplier;
      const adjustedPoints = Math.floor(request.points * multiplier);

      // Create transaction
      const transaction: LoyaltyTransaction = {
        id: this.generateId(),
        userId: request.userId,
        points: adjustedPoints,
        type: request.type,
        source: request.source,
        description: request.description,
        orderId: request.orderId,
        productId: request.productId,
        metadata: request.metadata,
        createdAt: new Date(),
        expiresAt: request.expiresAt || this.calculateExpirationDate(),
        status: 'active',
      };

      // Update account
      account.currentBalance += adjustedPoints;
      account.totalEarned += adjustedPoints;
      account.transactions.push(transaction);
      account.updatedAt = new Date();

      // Check for tier upgrade
      const newTier = this.checkTierUpgrade(account);
      if (newTier && newTier !== account.tier) {
        account.tier = newTier;
        await this.sendTierUpgradeNotification(account, newTier);
      }

      // Send notification
      await this.sendPointsNotification(account, transaction);

      return {
        success: true,
        message: `Awarded ${adjustedPoints} points successfully`,
        transaction,
        currentBalance: account.currentBalance,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to award points: ${error}`,
      };
    }
  }

  // Redeem loyalty points
  async redeemPoints(
    userId: string,
    points: number,
    rewardId?: string,
    orderId?: string
  ): Promise<LoyaltyPointsResponse> {
    try {
      // Get user's loyalty account
      const account = await this.getLoyaltyAccount(userId);
      if (!account) {
        return {
          success: false,
          message: 'Loyalty account not found',
        };
      }

      // Check balance
      if (account.currentBalance < points) {
        return {
          success: false,
          message: 'Insufficient points balance',
        };
      }

      // Create redemption transaction
      const transaction: LoyaltyTransaction = {
        id: this.generateId(),
        userId,
        points: -points,
        type: 'redeem',
        source: 'redemption',
        description: rewardId ? `Redeemed reward: ${rewardId}` : 'Points redeemed for discount',
        orderId,
        metadata: { rewardId },
        createdAt: new Date(),
        status: 'used',
      };

      // Update account
      account.currentBalance -= points;
      account.totalRedeemed += points;
      account.transactions.push(transaction);
      account.updatedAt = new Date();

      // Send notification
      await this.sendRedemptionNotification(account, transaction);

      return {
        success: true,
        message: `Redeemed ${points} points successfully`,
        transaction,
        currentBalance: account.currentBalance,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to redeem points: ${error}`,
      };
    }
  }

  // Get loyalty account
  async getLoyaltyAccount(userId: string): Promise<LoyaltyAccount | null> {
    try {
      // In a real app, you'd query database
      return {
        userId,
        currentBalance: 2500,
        totalEarned: 5000,
        totalRedeemed: 2500,
        tier: 'silver',
        tierProgress: {
          currentTier: 'silver',
          nextTier: 'gold',
          pointsToNextTier: 2500,
          progressPercentage: 50,
        },
        transactions: [],
        preferences: {
          emailNotifications: true,
          pushNotifications: true,
          pointExpirationAlerts: true,
          tierUpgradeAlerts: true,
        },
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to get loyalty account: ${error}`);
    }
  }

  // Create loyalty account
  async createLoyaltyAccount(userId: string): Promise<{ success: boolean; message: string; account?: LoyaltyAccount }> {
    try {
      // Check if account already exists
      const existingAccount = await this.getLoyaltyAccount(userId);
      if (existingAccount) {
        return {
          success: false,
          message: 'Loyalty account already exists',
        };
      }

      // Create new account
      const account: LoyaltyAccount = {
        userId,
        currentBalance: 0,
        totalEarned: 0,
        totalRedeemed: 0,
        tier: 'bronze',
        tierProgress: {
          currentTier: 'bronze',
          nextTier: 'silver',
          pointsToNextTier: 1000,
          progressPercentage: 0,
        },
        transactions: [],
        preferences: {
          emailNotifications: true,
          pushNotifications: true,
          pointExpirationAlerts: true,
          tierUpgradeAlerts: true,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Award welcome bonus
      await this.awardPoints({
        userId,
        points: 100,
        type: 'bonus',
        source: 'milestone',
        description: 'Welcome bonus for joining loyalty program',
      });

      // Send welcome email
      await this.sendWelcomeEmail(account);

      return {
        success: true,
        message: 'Loyalty account created successfully',
        account,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create loyalty account: ${error}`,
      };
    }
  }

  // Get available rewards
  async getAvailableRewards(userId?: string): Promise<LoyaltyReward[]> {
    try {
      // In a real app, you'd query database and filter by user tier
      return [
        {
          id: '1',
          name: '$5 Discount',
          description: 'Get $5 off your next purchase',
          pointsCost: 500,
          type: 'discount',
          value: { amount: 5, type: 'fixed' },
          isActive: true,
          createdAt: new Date(),
        },
        {
          id: '2',
          name: 'Free Shipping',
          description: 'Free shipping on your next order',
          pointsCost: 300,
          type: 'free_shipping',
          value: { unlimited: false },
          isActive: true,
          createdAt: new Date(),
        },
        {
          id: '3',
          name: '$10 Gift Card',
          description: '$10 gift card for future purchases',
          pointsCost: 1000,
          type: 'gift_card',
          value: { amount: 10 },
          isActive: true,
          createdAt: new Date(),
        },
        {
          id: '4',
          name: 'Exclusive Product Access',
          description: 'Early access to new products',
          pointsCost: 1500,
          type: 'exclusive_access',
          value: { duration: 30 }, // 30 days
          isActive: true,
          createdAt: new Date(),
        },
      ];
    } catch (error) {
      throw new Error(`Failed to get available rewards: ${error}`);
    }
  }

  // Get loyalty tiers
  async getLoyaltyTiers(): Promise<LoyaltyTier[]> {
    return this.tiers.filter(tier => tier.isActive);
  }

  // Process point expirations
  async processPointExpirations(): Promise<{ success: boolean; message: string; processed: number }> {
    try {
      const expiringTransactions = await this.getExpiringTransactions();
      let processedCount = 0;

      for (const transaction of expiringTransactions) {
        if (transaction.status === 'active' && transaction.points > 0) {
          // Create expiration transaction
          await this.awardPoints({
            userId: transaction.userId,
            points: Math.abs(transaction.points),
            type: 'expire',
            source: 'system',
            description: `Points expired from transaction ${transaction.id}`,
            metadata: { originalTransactionId: transaction.id },
          });

          // Mark original transaction as expired
          transaction.status = 'expired';
          processedCount++;

          // Send expiration notification
          await this.sendExpirationNotification(transaction);
        }
      }

      return {
        success: true,
        message: `Processed ${processedCount} point expirations`,
        processed: processedCount,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to process expirations: ${error}`,
        processed: 0,
      };
    }
  }

  // Send birthday bonuses
  async sendBirthdayBonuses(): Promise<{ success: boolean; message: string; sent: number }> {
    try {
      const birthdayUsers = await this.getUsersWithBirthday();
      let sentCount = 0;

      for (const user of birthdayUsers) {
        const account = await this.getLoyaltyAccount(user.id);
        if (account) {
          const tier = this.getTierByPoints(account.currentBalance);
          const bonusPoints = tier.benefits.birthdayBonus;

          await this.awardPoints({
            userId: user.id,
            points: bonusPoints,
            type: 'bonus',
            source: 'birthday',
            description: `Happy birthday bonus! ${bonusPoints} points`,
          });

          await this.sendBirthdayBonusEmail(user, bonusPoints);
          sentCount++;
        }
      }

      return {
        success: true,
        message: `Sent ${sentCount} birthday bonuses`,
        sent: sentCount,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to send birthday bonuses: ${error}`,
        sent: 0,
      };
    }
  }

  // Get loyalty statistics
  async getLoyaltyStats(timeRange?: { start: Date; end: Date }): Promise<LoyaltyStats> {
    try {
      // In a real app, you'd calculate from database
      return {
        totalMembers: 50000,
        activeMembers: 35000,
        totalPointsIssued: 2500000,
        totalPointsRedeemed: 1800000,
        averageBalance: 500,
        tierDistribution: {
          bronze: 20000,
          silver: 20000,
          gold: 8000,
          platinum: 2000,
        },
        topEarners: [
          {
            userId: '1',
            name: 'John Doe',
            balance: 15000,
            tier: 'platinum',
          },
          {
            userId: '2',
            name: 'Jane Smith',
            balance: 12000,
            tier: 'platinum',
          },
          {
            userId: '3',
            name: 'Bob Johnson',
            balance: 8000,
            tier: 'gold',
          },
        ],
        popularRewards: [
          {
            rewardId: '1',
            name: '$5 Discount',
            redemptions: 15000,
            percentage: 45,
          },
          {
            rewardId: '2',
            name: 'Free Shipping',
            redemptions: 10000,
            percentage: 30,
          },
          {
            rewardId: '3',
            name: '$10 Gift Card',
            redemptions: 5000,
            percentage: 15,
          },
        ],
        monthlyTrends: [
          { month: '2024-01', pointsIssued: 200000, pointsRedeemed: 150000, newMembers: 1000 },
          { month: '2024-02', pointsIssued: 220000, pointsRedeemed: 160000, newMembers: 1200 },
          { month: '2024-03', pointsIssued: 250000, pointsRedeemed: 180000, newMembers: 1500 },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get loyalty stats: ${error}`);
    }
  }

  // Helper methods
  private validatePointsRequest(request: LoyaltyPointsRequest): { valid: boolean; message: string } {
    if (!request.userId) {
      return { valid: false, message: 'User ID is required' };
    }

    if (!request.points || request.points <= 0) {
      return { valid: false, message: 'Points must be greater than 0' };
    }

    if (!request.type || !['earn', 'redeem', 'expire', 'adjust', 'bonus'].includes(request.type)) {
      return { valid: false, message: 'Invalid transaction type' };
    }

    if (!request.source) {
      return { valid: false, message: 'Source is required' };
    }

    if (!request.description) {
      return { valid: false, message: 'Description is required' };
    }

    return { valid: true, message: 'Request is valid' };
  }

  private getTierByPoints(points: number): LoyaltyTier {
    for (let i = this.tiers.length - 1; i >= 0; i--) {
      const tier = this.tiers[i];
      if (points >= tier.minPoints) {
        return tier;
      }
    }
    return this.tiers[0]; // Default to bronze
  }

  private checkTierUpgrade(account: LoyaltyAccount): string | null {
    const newTier = this.getTierByPoints(account.currentBalance);
    return newTier.id !== account.tier ? newTier.id : null;
  }

  private calculateExpirationDate(): Date {
    const expirationDate = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 1);
    return expirationDate;
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private async getExpiringTransactions(): Promise<LoyaltyTransaction[]> {
    // In a real app, you'd query database for transactions expiring today
    return [];
  }

  private async getUsersWithBirthday(): Promise<Array<{ id: string; name: string; email: string }>> {
    // In a real app, you'd query database for users with birthday today
    return [];
  }

  // Email notification methods
  private async sendPointsNotification(account: LoyaltyAccount, transaction: LoyaltyTransaction): Promise<void> {
    try {
      const emailData = {
        to: 'user@example.com', // Would get from user record
        subject: `You've earned ${transaction.points} points!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #FFD700; color: #000; padding: 20px; text-align: center;">
              <h1>🌟 Points Earned!</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Congratulations!</h2>
              <p>You've earned ${transaction.points} points!</p>
              
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Transaction Details</h4>
                <p><strong>Points:</strong> ${transaction.points}</p>
                <p><strong>Source:</strong> ${transaction.source}</p>
                <p><strong>Description:</strong> ${transaction.description}</p>
                <p><strong>Current Balance:</strong> ${account.currentBalance}</p>
              </div>

              <p>Keep earning points to unlock more rewards!</p>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send points notification:', error);
    }
  }

  private async sendRedemptionNotification(account: LoyaltyAccount, transaction: LoyaltyTransaction): Promise<void> {
    try {
      const emailData = {
        to: 'user@example.com',
        subject: 'Points Redeemed Successfully',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
              <h1>🎁 Points Redeemed!</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Enjoy Your Reward!</h2>
              <p>You've successfully redeemed ${Math.abs(transaction.points)} points.</p>
              
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Redemption Details</h4>
                <p><strong>Points Used:</strong> ${Math.abs(transaction.points)}</p>
                <p><strong>Description:</strong> ${transaction.description}</p>
                <p><strong>Remaining Balance:</strong> ${account.currentBalance}</p>
              </div>

              <p>Thank you for being a loyal customer!</p>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send redemption notification:', error);
    }
  }

  private async sendTierUpgradeNotification(account: LoyaltyAccount, newTierId: string): Promise<void> {
    try {
      const newTier = this.tiers.find(t => t.id === newTierId);
      if (!newTier) return;

      const emailData = {
        to: 'user@example.com',
        subject: `Congratulations! You've reached ${newTier.name} tier!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: ${newTier.color}; color: white; padding: 20px; text-align: center;">
              <h1>${newTier.icon} Tier Upgrade!</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Congratulations on reaching ${newTier.name}!</h2>
              <p>You've unlocked amazing new benefits!</p>
              
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Your New Benefits</h4>
                <ul>
                  <li><strong>Points Multiplier:</strong> ${newTier.benefits.pointsMultiplier}x</li>
                  <li><strong>Exclusive Offers:</strong> ${newTier.benefits.exclusiveOffers ? 'Yes' : 'No'}</li>
                  <li><strong>Free Shipping:</strong> ${newTier.benefits.freeShipping ? 'Yes' : 'No'}</li>
                  <li><strong>Early Access:</strong> ${newTier.benefits.earlyAccess ? 'Yes' : 'No'}</li>
                  <li><strong>Birthday Bonus:</strong> ${newTier.benefits.birthdayBonus} points</li>
                </ul>
              </div>

              <p>Thank you for your loyalty!</p>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send tier upgrade notification:', error);
    }
  }

  private async sendWelcomeEmail(account: LoyaltyAccount): Promise<void> {
    try {
      const emailData = {
        to: 'user@example.com',
        subject: 'Welcome to Our Loyalty Program!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #FF9900; color: white; padding: 20px; text-align: center;">
              <h1>🎉 Welcome to Our Loyalty Program!</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Start Earning Rewards Today!</h2>
              <p>You've been automatically enrolled in our loyalty program with 100 welcome points!</p>
              
              <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>How to Earn Points:</h4>
                <ul>
                  <li><strong>Purchases:</strong> 1 point per $1 spent</li>
                  <li><strong>Reviews:</strong> 50 points per review</li>
                  <li><strong>Referrals:</strong> 100 points per referral</li>
                  <li><strong>Birthday:</strong> Bonus points on your birthday</li>
                </ul>
              </div>

              <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Your Current Status</h4>
                <p><strong>Tier:</strong> Bronze</p>
                <p><strong>Current Balance:</strong> 100 points</p>
                <p><strong>Next Tier:</strong> Silver (1,000 points)</p>
              </div>

              <p>Start shopping and earning rewards today!</p>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }
  }

  private async sendExpirationNotification(transaction: LoyaltyTransaction): Promise<void> {
    try {
      const emailData = {
        to: 'user@example.com',
        subject: 'Points Expiring Soon',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #ffc107; color: #000; padding: 20px; text-align: center;">
              <h1>⚠️ Points Expiring Soon</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Your points are expiring!</h2>
              <p>You have ${transaction.points} points that will expire soon.</p>
              
              <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Expiration Details</h4>
                <p><strong>Points:</strong> ${transaction.points}</p>
                <p><strong>Expires:</strong> ${transaction.expiresAt?.toLocaleDateString()}</p>
                <p><strong>Original Source:</strong> ${transaction.source}</p>
              </div>

              <p>Use your points before they expire!</p>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send expiration notification:', error);
    }
  }

  private async sendBirthdayBonusEmail(user: any, points: number): Promise<void> {
    try {
      const emailData = {
        to: user.email,
        subject: `Happy Birthday! ${points} Points Bonus!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #FF69B4; color: white; padding: 20px; text-align: center;">
              <h1>🎂 Happy Birthday!</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Special Birthday Gift!</h2>
              <p>We've added ${points} bonus points to your account!</p>
              
              <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Birthday Bonus Details</h4>
                <p><strong>Bonus Points:</strong> ${points}</p>
                <p><strong>Added:</strong> ${new Date().toLocaleString()}</p>
              </div>

              <p>Have a wonderful birthday and enjoy your points!</p>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send birthday bonus email:', error);
    }
  }
}
