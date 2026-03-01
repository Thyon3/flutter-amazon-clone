import { LoyaltyProgram, ILoyaltyProgram } from '../model/loyaltyProgram';
import { User } from '../model/user';
import { EmailService } from './emailService';

export interface LoyaltyTier {
  name: 'bronze' | 'silver' | 'gold' | 'platinum';
  minSpent: number;
  pointsMultiplier: number;
  benefits: string[];
  color: string;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  category: 'discount' | 'shipping' | 'product' | 'experience';
  tierRequired: 'bronze' | 'silver' | 'gold' | 'platinum';
  isActive: boolean;
}

export class LoyaltyService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  private readonly tiers: Record<string, LoyaltyTier> = {
    bronze: {
      name: 'bronze',
      minSpent: 0,
      pointsMultiplier: 1.0,
      benefits: ['1 point per $1 spent', 'Birthday bonus'],
      color: '#CD7F32',
    },
    silver: {
      name: 'silver',
      minSpent: 500,
      pointsMultiplier: 1.2,
      benefits: ['1.2 points per $1 spent', 'Free shipping on orders over $50', 'Early access to sales'],
      color: '#C0C0C0',
    },
    gold: {
      name: 'gold',
      minSpent: 1500,
      pointsMultiplier: 1.5,
      benefits: ['1.5 points per $1 spent', 'Free shipping on all orders', 'Exclusive discounts', 'Priority customer service'],
      color: '#FFD700',
    },
    platinum: {
      name: 'platinum',
      minSpent: 5000,
      pointsMultiplier: 2.0,
      benefits: ['2 points per $1 spent', 'Free shipping on all orders', 'Exclusive discounts', 'Priority customer service', 'Personal shopping assistant'],
      color: '#E5E4E2',
    },
  };

  private readonly availableRewards: Reward[] = [
    {
      id: 'discount_5',
      name: '5% Off Your Next Order',
      description: 'Get 5% discount on your next purchase',
      pointsCost: 100,
      category: 'discount',
      tierRequired: 'bronze',
      isActive: true,
    },
    {
      id: 'discount_10',
      name: '10% Off Your Next Order',
      description: 'Get 10% discount on your next purchase',
      pointsCost: 200,
      category: 'discount',
      tierRequired: 'silver',
      isActive: true,
    },
    {
      id: 'free_shipping',
      name: 'Free Shipping',
      description: 'Free shipping on your next order',
      pointsCost: 50,
      category: 'shipping',
      tierRequired: 'bronze',
      isActive: true,
    },
    {
      id: 'exclusive_product',
      name: 'Exclusive Product Access',
      description: 'Get early access to exclusive products',
      pointsCost: 300,
      category: 'product',
      tierRequired: 'gold',
      isActive: true,
    },
    {
      id: 'priority_support',
      name: 'Priority Customer Service',
      description: 'Get priority support for 30 days',
      pointsCost: 150,
      category: 'experience',
      tierRequired: 'silver',
      isActive: true,
    },
  ];

  // Get or create user's loyalty program
  async getUserLoyaltyProgram(userId: string): Promise<ILoyaltyProgram> {
    let program = await LoyaltyProgram.findOne({ user: userId });
    
    if (!program) {
      program = new LoyaltyProgram({
        user: userId,
        points: 0,
        tier: 'bronze',
        totalSpent: 0,
        ordersCount: 0,
        joinDate: new Date(),
        lastActivityDate: new Date(),
        pointsHistory: [],
        rewards: [],
      });
      await program.save();
    }

    return program;
  }

  // Award points for purchase
  async awardPoints(
    userId: string, 
    orderId: string, 
    purchaseAmount: number
  ): Promise<ILoyaltyProgram> {
    const program = await this.getUserLoyaltyProgram(userId);
    const tier = this.tiers[program.tier];
    const pointsEarned = Math.floor(purchaseAmount * tier.pointsMultiplier);

    // Add points history
    program.pointsHistory.push({
      type: 'earned',
      points: pointsEarned,
      reason: `Purchase of order ${orderId}`,
      orderId,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year expiry
    });

    // Update program
    program.points += pointsEarned;
    program.totalSpent += purchaseAmount;
    program.ordersCount += 1;
    program.lastActivityDate = new Date();

    // Check for tier upgrade
    await this.checkTierUpgrade(program);

    await program.save();

    // Send tier upgrade notification if upgraded
    if (program.tier !== 'bronze') {
      await this.sendTierUpgradeNotification(userId, program.tier);
    }

    return program;
  }

  // Redeem points for reward
  async redeemPoints(
    userId: string, 
    rewardId: string
  ): Promise<{ success: boolean; message: string; program?: ILoyaltyProgram }> {
    const program = await this.getUserLoyaltyProgram(userId);
    const reward = this.availableRewards.find(r => r.id === rewardId);

    if (!reward) {
      return { success: false, message: 'Reward not found' };
    }

    if (!reward.isActive) {
      return { success: false, message: 'Reward is not currently available' };
    }

    if (this.tiers[program.tier].minSpent < this.tiers[reward.tierRequired].minSpent) {
      return { success: false, message: `This reward requires ${reward.tierRequired} tier or higher` };
    }

    if (program.points < reward.pointsCost) {
      return { success: false, message: 'Insufficient points' };
    }

    // Check if already redeemed
    if (program.rewards.some(r => r.id === rewardId && r.isRedeemed)) {
      return { success: false, message: 'Reward already redeemed' };
    }

    // Redeem reward
    program.points -= reward.pointsCost;
    program.pointsHistory.push({
      type: 'redeemed',
      points: reward.pointsCost,
      reason: `Redeemed reward: ${reward.name}`,
      timestamp: new Date(),
    });

    // Add to rewards
    const rewardEntry = {
      id: reward.id,
      name: reward.name,
      description: reward.description,
      pointsCost: reward.pointsCost,
      isRedeemed: true,
      redeemedAt: new Date(),
    };
    program.rewards.push(rewardEntry);
    program.lastActivityDate = new Date();

    await program.save();

    // Send reward notification
    await this.sendRewardNotification(userId, reward);

    return { 
      success: true, 
      message: 'Reward redeemed successfully', 
      program 
    };
  }

  // Check and update tier
  private async checkTierUpgrade(program: ILoyaltyProgram): Promise<void> {
    let newTier = program.tier;

    for (const [tierName, tier] of Object.entries(this.tiers)) {
      if (program.totalSpent >= tier.minSpent) {
        newTier = tierName as 'bronze' | 'silver' | 'gold' | 'platinum';
      }
    }

    if (newTier !== program.tier) {
      program.tier = newTier;
    }
  }

  // Get available rewards for user
  async getAvailableRewards(userId: string): Promise<Reward[]> {
    const program = await this.getUserLoyaltyProgram(userId);
    const userTier = program.tier;

    return this.availableRewards.filter(reward => 
      reward.isActive && 
      this.tiers[reward.tierRequired].minSpent <= this.tiers[userTier].minSpent
    );
  }

  // Get loyalty statistics
  async getLoyaltyStats(userId: string): Promise<any> {
    const program = await this.getUserLoyaltyProgram(userId);
    const tier = this.tiers[program.tier];
    const nextTier = this.getNextTier(program.tier);
    
    const availableRewards = await this.getAvailableRewards(userId);
    const pointsExpiringSoon = this.getPointsExpiringSoon(program);

    return {
      currentTier: program.tier,
      tierInfo: tier,
      points: program.points,
      totalSpent: program.totalSpent,
      ordersCount: program.ordersCount,
      joinDate: program.joinDate,
      lastActivityDate: program.lastActivityDate,
      nextTier,
      availableRewards,
      redeemedRewards: program.rewards.filter(r => r.isRedeemed),
      pointsExpiringSoon,
      pointsHistory: program.pointsHistory.slice(-10), // Last 10 activities
    };
  }

  private getNextTier(currentTier: string): LoyaltyTier | null {
    const tierOrder = ['bronze', 'silver', 'gold', 'platinum'];
    const currentIndex = tierOrder.indexOf(currentTier);
    
    if (currentIndex < tierOrder.length - 1) {
      return this.tiers[tierOrder[currentIndex + 1]];
    }
    
    return null;
  }

  private getPointsExpiringSoon(program: ILoyaltyProgram): any[] {
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    return program.pointsHistory
      .filter(entry => 
        entry.type === 'earned' && 
        entry.expiresAt && 
        entry.expiresAt <= thirtyDaysFromNow
      )
      .map(entry => ({
        points: entry.points,
        expiresAt: entry.expiresAt,
        daysUntilExpiry: Math.ceil((entry.expiresAt!.getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
      }));
  }

  // Send tier upgrade notification
  private async sendTierUpgradeNotification(userId: string, newTier: string): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      const tier = this.tiers[newTier];
      const emailData = {
        to: user.email,
        subject: `Congratulations! You've reached ${newTier.charAt(0).toUpperCase() + newTier.slice(1)} tier!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #232f3e; color: white; padding: 20px; text-align: center;">
              <h1>🎉 Congratulations!</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Hi ${user.name},</h2>
              <p>You've reached the <strong>${newTier.charAt(0).toUpperCase() + newTier.slice(1)}</strong> tier in our loyalty program!</p>
              
              <div style="background-color: #f0f2f2; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Your New Benefits:</h3>
                <ul>
                  ${tier.benefits.map(benefit => `<li>${benefit}</li>`).join('')}
                </ul>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://yourapp.com/loyalty" style="background-color: #ff9900; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  View Your Rewards
                </a>
              </div>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send tier upgrade notification:', error);
    }
  }

  // Send reward notification
  private async sendRewardNotification(userId: string, reward: Reward): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      const emailData = {
        to: user.email,
        subject: `Reward Redeemed: ${reward.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #232f3e; color: white; padding: 20px; text-align: center;">
              <h1>🎁 Reward Redeemed!</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Hi ${user.name},</h2>
              <p>You've successfully redeemed: <strong>${reward.name}</strong></p>
              
              <div style="background-color: #f0f2f2; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Reward Details:</h3>
                <p><strong>Description:</strong> ${reward.description}</p>
                <p><strong>Points Cost:</strong> ${reward.pointsCost} points</p>
                <p><strong>Category:</strong> ${reward.category}</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://yourapp.com/loyalty" style="background-color: #ff9900; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  View More Rewards
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

  // Expire old points (can be called by cron job)
  async expireOldPoints(): Promise<number> {
    const now = new Date();
    let expiredCount = 0;

    const programs = await LoyaltyProgram.find({
      'pointsHistory.expiresAt': { $lte: now }
    });

    for (const program of programs) {
      let totalExpired = 0;
      
      // Filter out expired points and calculate total expired
      const validHistory = program.pointsHistory.filter(entry => {
        if (entry.type === 'earned' && entry.expiresAt && entry.expiresAt <= now) {
          totalExpired += entry.points;
          return false;
        }
        return true;
      });

      if (totalExpired > 0) {
        program.pointsHistory.push({
          type: 'expired',
          points: totalExpired,
          reason: 'Points expired after 1 year',
          timestamp: now,
        });

        program.points = Math.max(0, program.points - totalExpired);
        program.pointsHistory = validHistory;
        await program.save();
        expiredCount++;
      }
    }

    return expiredCount;
  }
}
