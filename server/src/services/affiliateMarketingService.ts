import { User } from '../model/user';
import { Order } from '../model/order';
import { Product } from '../model/product';
import { EmailService } from './emailService';

export interface AffiliateRequest {
  userId: string;
  website: string;
  description: string;
  promotionalMethods: string[];
  targetAudience: string;
  expectedMonthlyVisitors: number;
  taxInfo: {
    name: string;
    address: string;
    taxId: string;
    country: string;
  };
  paymentInfo: {
    method: 'paypal' | 'bank_transfer' | 'check';
    details: any;
  };
}

export interface AffiliateResponse {
  success: boolean;
  message: string;
  affiliate?: AffiliateInfo;
  affiliateLink?: string;
}

export interface AffiliateInfo {
  id: string;
  userId: string;
  affiliateCode: string;
  website: string;
  description: string;
  promotionalMethods: string[];
  targetAudience: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended' | 'active';
  commissionRate: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  earnings: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    pending: number;
    paid: number;
  };
  performance: {
    clicks: number;
    conversions: number;
    conversionRate: number;
    averageOrderValue: number;
    earningsPerClick: number;
    earningsPerConversion: number;
  };
  paymentInfo: any;
  taxInfo: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface AffiliateLink {
  id: string;
  affiliateId: string;
  productId?: string;
  category?: string;
  url: string;
  shortCode: string;
  customParameters?: Record<string, string>;
  trackingEnabled: boolean;
  createdAt: Date;
}

export interface AffiliateCommission {
  id: string;
  affiliateId: string;
  orderId: string;
  productId: string;
  amount: number;
  rate: number;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  orderDate: Date;
  approvedDate?: Date;
  paidDate?: Date;
  metadata: {
    commissionType: 'percentage' | 'fixed';
    baseAmount: number;
    customerNew: boolean;
  };
}

export interface AffiliateStats {
  totalAffiliates: number;
  activeAffiliates: number;
  totalEarnings: number;
  totalPaid: number;
  pendingPayments: number;
  averageCommissionRate: number;
  topPerformers: Array<{
    affiliateId: string;
    name: string;
    earnings: number;
    conversions: number;
    conversionRate: number;
  }>;
  earningsByTier: Record<string, {
    count: number;
    totalEarnings: number;
    averageEarnings: number;
  }>;
  trends: Array<{
    date: string;
    clicks: number;
    conversions: number;
    earnings: number;
    newAffiliates: number;
  }>;
}

export class AffiliateMarketingService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  // Apply for affiliate program
  async applyForAffiliate(request: AffiliateRequest): Promise<AffiliateResponse> {
    try {
      // Validate application
      const validation = this.validateAffiliateApplication(request);
      if (!validation.valid) {
        return {
          success: false,
          message: validation.message,
        };
      }

      // Check if user already has affiliate account
      const existingAffiliate = await this.getAffiliateByUserId(request.userId);
      if (existingAffiliate) {
        return {
          success: false,
          message: 'You already have an affiliate account',
        };
      }

      // Create affiliate account
      const affiliate: AffiliateInfo = {
        id: this.generateId(),
        userId: request.userId,
        affiliateCode: this.generateAffiliateCode(),
        website: request.website,
        description: request.description,
        promotionalMethods: request.promotionalMethods,
        targetAudience: request.targetAudience,
        status: 'pending',
        commissionRate: 0.05, // 5% default
        tier: 'bronze',
        earnings: {
          total: 0,
          thisMonth: 0,
          lastMonth: 0,
          pending: 0,
          paid: 0,
        },
        performance: {
          clicks: 0,
          conversions: 0,
          conversionRate: 0,
          averageOrderValue: 0,
          earningsPerClick: 0,
          earningsPerConversion: 0,
        },
        paymentInfo: request.paymentInfo,
        taxInfo: request.taxInfo,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Send application confirmation
      await this.sendApplicationConfirmation(affiliate);

      return {
        success: true,
        message: 'Affiliate application submitted successfully',
        affiliate,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to submit affiliate application: ${error}`,
      };
    }
  }

  // Approve affiliate application
  async approveAffiliate(affiliateId: string, adminId: string, commissionRate?: number): Promise<{ success: boolean; message: string }> {
    try {
      const affiliate = await this.getAffiliateById(affiliateId);
      if (!affiliate) {
        return {
          success: false,
          message: 'Affiliate not found',
        };
      }

      // Update affiliate status
      affiliate.status = 'active';
      affiliate.commissionRate = commissionRate || affiliate.commissionRate;
      affiliate.updatedAt = new Date();

      // Generate welcome links
      const welcomeLinks = await this.generateWelcomeLinks(affiliate);

      // Send approval notification
      await this.sendApprovalNotification(affiliate, welcomeLinks);

      return {
        success: true,
        message: 'Affiliate approved successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to approve affiliate: ${error}`,
      };
    }
  }

  // Create affiliate link
  async createAffiliateLink(
    affiliateId: string,
    options: {
      productId?: string;
      category?: string;
      customParameters?: Record<string, string>;
    }
  ): Promise<{ success: boolean; message: string; link?: AffiliateLink }> {
    try {
      const affiliate = await this.getAffiliateById(affiliateId);
      if (!affiliate) {
        return {
          success: false,
          message: 'Affiliate not found',
        };
      }

      if (affiliate.status !== 'active') {
        return {
          success: false,
          message: 'Affiliate account is not active',
        };
      }

      // Generate affiliate link
      const baseUrl = process.env.SITE_URL || 'https://amazonclone.com';
      const shortCode = this.generateShortCode();
      
      let url = `${baseUrl}?ref=${affiliate.affiliateCode}`;
      
      if (options.productId) {
        url += `&product=${options.productId}`;
      }
      
      if (options.category) {
        url += `&category=${options.category}`;
      }

      // Add custom parameters
      if (options.customParameters) {
        const params = new URLSearchParams();
        Object.entries(options.customParameters).forEach(([key, value]) => {
          params.append(key, value);
        });
        url += `&${params.toString()}`;
      }

      const link: AffiliateLink = {
        id: this.generateId(),
        affiliateId,
        productId: options.productId,
        category: options.category,
        url,
        shortCode,
        customParameters: options.customParameters,
        trackingEnabled: true,
        createdAt: new Date(),
      };

      return {
        success: true,
        message: 'Affiliate link created successfully',
        link,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create affiliate link: ${error}`,
      };
    }
  }

  // Track affiliate click
  async trackAffiliateClick(affiliateCode: string, clickData: {
    url: string;
    userAgent?: string;
    ipAddress?: string;
    referrer?: string;
    productId?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const affiliate = await this.getAffiliateByCode(affiliateCode);
      if (!affiliate) {
        return {
          success: false,
          message: 'Invalid affiliate code',
        };
      }

      // Record click
      console.log(`Affiliate click tracked: ${affiliateCode} - ${clickData.url}`);

      // Update affiliate performance
      affiliate.performance.clicks++;
      affiliate.updatedAt = new Date();

      // Set affiliate cookie for conversion tracking
      // In a real app, you'd set HTTP cookie

      return {
        success: true,
        message: 'Click tracked successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to track click: ${error}`,
      };
    }
  }

  // Track affiliate conversion
  async trackAffiliateConversion(
    orderId: string,
    affiliateCode: string,
    conversionData: {
      amount: number;
      productId: string;
      customerNew: boolean;
    }
  ): Promise<{ success: boolean; message: string; commission?: AffiliateCommission }> {
    try {
      const affiliate = await this.getAffiliateByCode(affiliateCode);
      if (!affiliate) {
        return {
          success: false,
          message: 'Invalid affiliate code',
        };
      }

      // Calculate commission
      const commissionAmount = conversionData.amount * affiliate.commissionRate;

      // Create commission record
      const commission: AffiliateCommission = {
        id: this.generateId(),
        affiliateId: affiliate.id,
        orderId,
        productId: conversionData.productId,
        amount: commissionAmount,
        rate: affiliate.commissionRate,
        status: 'pending',
        orderDate: new Date(),
        metadata: {
          commissionType: 'percentage',
          baseAmount: conversionData.amount,
          customerNew: conversionData.customerNew,
        },
      };

      // Update affiliate performance
      affiliate.performance.conversions++;
      affiliate.performance.conversionRate = affiliate.performance.conversions / affiliate.performance.clicks;
      affiliate.performance.averageOrderValue = 
        (affiliate.performance.averageOrderValue + conversionData.amount) / 2;
      affiliate.performance.earningsPerConversion = commissionAmount;
      affiliate.performance.earningsPerClick = commissionAmount / affiliate.performance.clicks;

      // Update earnings
      affiliate.earnings.pending += commissionAmount;
      affiliate.earnings.thisMonth += commissionAmount;
      affiliate.earnings.total += commissionAmount;

      affiliate.updatedAt = new Date();

      // Send commission notification
      await this.sendCommissionNotification(affiliate, commission);

      return {
        success: true,
        message: 'Conversion tracked successfully',
        commission,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to track conversion: ${error}`,
      };
    }
  }

  // Get affiliate dashboard
  async getAffiliateDashboard(affiliateId: string): Promise<any> {
    try {
      const affiliate = await this.getAffiliateById(affiliateId);
      if (!affiliate) {
        throw new Error('Affiliate not found');
      }

      // Get recent commissions
      const recentCommissions = await this.getAffiliateCommissions(affiliateId, 30);

      // Get affiliate links
      const affiliateLinks = await this.getAffiliateLinks(affiliateId);

      // Calculate monthly earnings
      const monthlyEarnings = await this.getMonthlyEarnings(affiliateId, 12);

      return {
        affiliate,
        recentCommissions,
        affiliateLinks,
        monthlyEarnings,
        performanceMetrics: {
          earningsGrowth: this.calculateEarningsGrowth(monthlyEarnings),
          conversionTrend: this.calculateConversionTrend(recentCommissions),
          topProducts: await this.getTopProducts(affiliateId),
          trafficSources: await this.getTrafficSources(affiliateId),
        },
      };
    } catch (error) {
      throw new Error(`Failed to get affiliate dashboard: ${error}`);
    }
  }

  // Process affiliate payments
  async processAffiliatePayments(): Promise<{ success: boolean; message: string; processed: number }> {
    try {
      // Get affiliates with pending payments
      const affiliates = await this.getAffiliatesWithPendingPayments();
      let processedCount = 0;

      for (const affiliate of affiliates) {
        if (affiliate.earnings.pending >= 50) { // Minimum payout threshold
          // Process payment
          await this.processPayment(affiliate);
          
          // Update earnings
          affiliate.earnings.paid += affiliate.earnings.pending;
          affiliate.earnings.pending = 0;
          
          processedCount++;

          // Send payment notification
          await this.sendPaymentNotification(affiliate);
        }
      }

      return {
        success: true,
        message: `Processed ${processedCount} affiliate payments`,
        processed: processedCount,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to process payments: ${error}`,
        processed: 0,
      };
    }
  }

  // Update affiliate tier
  async updateAffiliateTiers(): Promise<{ success: boolean; message: string; updated: number }> {
    try {
      const affiliates = await this.getActiveAffiliates();
      let updatedCount = 0;

      for (const affiliate of affiliates) {
        const newTier = this.calculateTier(affiliate);
        
        if (newTier !== affiliate.tier) {
          affiliate.tier = newTier;
          affiliate.commissionRate = this.getCommissionRateForTier(newTier);
          affiliate.updatedAt = new Date();
          updatedCount++;

          // Send tier upgrade notification
          await this.sendTierUpgradeNotification(affiliate, newTier);
        }
      }

      return {
        success: true,
        message: `Updated ${updatedCount} affiliate tiers`,
        updated: updatedCount,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update tiers: ${error}`,
        updated: 0,
      };
    }
  }

  // Get affiliate statistics
  async getAffiliateStats(timeRange?: { start: Date; end: Date }): Promise<AffiliateStats> {
    try {
      // In a real app, you'd calculate from database
      return {
        totalAffiliates: 5000,
        activeAffiliates: 3200,
        totalEarnings: 2500000,
        totalPaid: 2100000,
        pendingPayments: 150000,
        averageCommissionRate: 0.065,
        topPerformers: [
          {
            affiliateId: '1',
            name: 'John Doe',
            earnings: 15000,
            conversions: 450,
            conversionRate: 0.08,
          },
          {
            affiliateId: '2',
            name: 'Jane Smith',
            earnings: 12000,
            conversions: 380,
            conversionRate: 0.07,
          },
          {
            affiliateId: '3',
            name: 'Bob Johnson',
            earnings: 10000,
            conversions: 320,
            conversionRate: 0.06,
          },
        ],
        earningsByTier: {
          bronze: { count: 2000, totalEarnings: 400000, averageEarnings: 200 },
          silver: { count: 1500, totalEarnings: 600000, averageEarnings: 400 },
          gold: { count: 800, totalEarnings: 800000, averageEarnings: 1000 },
          platinum: { count: 200, totalEarnings: 700000, averageEarnings: 3500 },
        },
        trends: [
          { date: '2024-01-01', clicks: 15000, conversions: 900, earnings: 45000, newAffiliates: 25 },
          { date: '2024-01-02', clicks: 16000, conversions: 950, earnings: 47500, newAffiliates: 30 },
          { date: '2024-01-03', clicks: 14000, conversions: 850, earnings: 42500, newAffiliates: 20 },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get affiliate stats: ${error}`);
    }
  }

  // Helper methods
  private validateAffiliateApplication(request: AffiliateRequest): { valid: boolean; message: string } {
    if (!request.userId) {
      return { valid: false, message: 'User ID is required' };
    }

    if (!request.website) {
      return { valid: false, message: 'Website URL is required' };
    }

    if (!request.description) {
      return { valid: false, message: 'Description is required' };
    }

    if (!request.promotionalMethods || request.promotionalMethods.length === 0) {
      return { valid: false, message: 'Promotional methods are required' };
    }

    if (!request.taxInfo || !request.paymentInfo) {
      return { valid: false, message: 'Tax and payment information are required' };
    }

    return { valid: true, message: 'Application is valid' };
  }

  private async getAffiliateByUserId(userId: string): Promise<AffiliateInfo | null> {
    // In a real app, you'd query database
    return null;
  }

  private async getAffiliateById(affiliateId: string): Promise<AffiliateInfo | null> {
    // In a real app, you'd query database
    return null;
  }

  private async getAffiliateByCode(affiliateCode: string): Promise<AffiliateInfo | null> {
    // In a real app, you'd query database
    return null;
  }

  private generateAffiliateCode(): string {
    return Math.random().toString(36).substr(2, 8).toUpperCase();
  }

  private generateShortCode(): string {
    return Math.random().toString(36).substr(2, 6);
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private async generateWelcomeLinks(affiliate: AffiliateInfo): Promise<AffiliateLink[]> {
    const links: AffiliateLink[] = [
      {
        id: this.generateId(),
        affiliateId: affiliate.id,
        url: `${process.env.SITE_URL}?ref=${affiliate.affiliateCode}`,
        shortCode: this.generateShortCode(),
        trackingEnabled: true,
        createdAt: new Date(),
      },
    ];

    return links;
  }

  private calculateTier(affiliate: AffiliateInfo): 'bronze' | 'silver' | 'gold' | 'platinum' {
    const monthlyEarnings = affiliate.earnings.thisMonth;
    
    if (monthlyEarnings >= 5000) return 'platinum';
    if (monthlyEarnings >= 2000) return 'gold';
    if (monthlyEarnings >= 500) return 'silver';
    return 'bronze';
  }

  private getCommissionRateForTier(tier: string): number {
    const rates = {
      bronze: 0.05,
      silver: 0.07,
      gold: 0.10,
      platinum: 0.15,
    };
    
    return rates[tier as keyof typeof rates] || 0.05;
  }

  private async getAffiliateCommissions(affiliateId: string, days: number): Promise<AffiliateCommission[]> {
    // In a real app, you'd query database
    return [];
  }

  private async getAffiliateLinks(affiliateId: string): Promise<AffiliateLink[]> {
    // In a real app, you'd query database
    return [];
  }

  private async getMonthlyEarnings(affiliateId: string, months: number): Promise<any[]> {
    // In a real app, you'd calculate from database
    return [];
  }

  private calculateEarningsGrowth(monthlyEarnings: any[]): number {
    if (monthlyEarnings.length < 2) return 0;
    
    const current = monthlyEarnings[0].earnings;
    const previous = monthlyEarnings[1].earnings;
    
    return ((current - previous) / previous) * 100;
  }

  private calculateConversionTrend(commissions: AffiliateCommission[]): number {
    if (commissions.length < 2) return 0;
    
    const recent = commissions.slice(0, 7).length;
    const previous = commissions.slice(7, 14).length;
    
    return ((recent - previous) / previous) * 100;
  }

  private async getTopProducts(affiliateId: string): Promise<any[]> {
    // In a real app, you'd query database
    return [];
  }

  private async getTrafficSources(affiliateId: string): Promise<any[]> {
    // In a real app, you'd analyze referral data
    return [];
  }

  private async getAffiliatesWithPendingPayments(): Promise<AffiliateInfo[]> {
    // In a real app, you'd query database
    return [];
  }

  private async getActiveAffiliates(): Promise<AffiliateInfo[]> {
    // In a real app, you'd query database
    return [];
  }

  private async processPayment(affiliate: AffiliateInfo): Promise<void> {
    // In a real app, you'd integrate with payment processor
    console.log(`Processing payment for affiliate ${affiliate.id}: ${affiliate.earnings.pending}`);
  }

  // Email notification methods
  private async sendApplicationConfirmation(affiliate: AffiliateInfo): Promise<void> {
    try {
      const emailData = {
        to: 'affiliate@example.com', // Would get from user record
        subject: 'Affiliate Application Received',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #ff9900; color: white; padding: 20px; text-align: center;">
              <h1>🤝 Affiliate Application Received</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Thank you for applying!</h2>
              <p>Your affiliate application has been received and is currently under review.</p>
              
              <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Application Details</h3>
                <p><strong>Affiliate Code:</strong> ${affiliate.affiliateCode}</p>
                <p><strong>Website:</strong> ${affiliate.website}</p>
                <p><strong>Status:</strong> ${affiliate.status}</p>
              </div>

              <p>We'll review your application within 3-5 business days and notify you of our decision.</p>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send application confirmation:', error);
    }
  }

  private async sendApprovalNotification(affiliate: AffiliateInfo, links: AffiliateLink[]): Promise<void> {
    try {
      const emailData = {
        to: 'affiliate@example.com',
        subject: 'Congratulations! Your Affiliate Application Has Been Approved',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
              <h1>🎉 Affiliate Application Approved!</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Welcome to our affiliate program!</h2>
              <p>Your application has been approved and you can start earning commissions immediately.</p>
              
              <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Your Affiliate Details</h3>
                <p><strong>Affiliate Code:</strong> ${affiliate.affiliateCode}</p>
                <p><strong>Commission Rate:</strong> ${(affiliate.commissionRate * 100).toFixed(1)}%</p>
                <p><strong>Tier:</strong> ${affiliate.tier}</p>
              </div>

              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Your Affiliate Links</h4>
                ${links.map(link => `
                  <p><strong>General Link:</strong> <a href="${link.url}">${link.url}</a></p>
                `).join('')}
              </div>

              <p>Log in to your dashboard to track your performance and create custom links.</p>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send approval notification:', error);
    }
  }

  private async sendCommissionNotification(affiliate: AffiliateInfo, commission: AffiliateCommission): Promise<void> {
    try {
      const emailData = {
        to: 'affiliate@example.com',
        subject: 'New Commission Earned!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #17a2b8; color: white; padding: 20px; text-align: center;">
              <h1>💰 New Commission Earned!</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Congratulations!</h2>
              <p>You've earned a new commission from a referral.</p>
              
              <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Commission Details</h3>
                <p><strong>Amount:</strong> $${commission.amount.toFixed(2)}</p>
                <p><strong>Commission Rate:</strong> ${(commission.rate * 100).toFixed(1)}%</p>
                <p><strong>Order ID:</strong> ${commission.orderId}</p>
                <p><strong>Status:</strong> ${commission.status}</p>
              </div>

              <p>This commission will be available for payment once the return period expires.</p>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send commission notification:', error);
    }
  }

  private async sendPaymentNotification(affiliate: AffiliateInfo): Promise<void> {
    try {
      const emailData = {
        to: 'affiliate@example.com',
        subject: 'Payment Processed - Affiliate Earnings',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
              <h1>💸 Payment Processed!</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Your affiliate earnings have been paid!</h2>
              <p>Your payment has been processed and sent to your designated payment method.</p>
              
              <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Payment Details</h3>
                <p><strong>Amount:</strong> $${affiliate.earnings.paid.toFixed(2)}</p>
                <p><strong>Payment Method:</strong> ${affiliate.paymentInfo.method}</p>
                <p><strong>Payment Date:</strong> ${new Date().toLocaleString()}</p>
              </div>

              <p>Thank you for being a valued affiliate partner!</p>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send payment notification:', error);
    }
  }

  private async sendTierUpgradeNotification(affiliate: AffiliateInfo, newTier: string): Promise<void> {
    try {
      const emailData = {
        to: 'affiliate@example.com',
        subject: 'Congratulations! You\'ve Been Upgraded to a New Tier',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #ffc107; color: #000; padding: 20px; text-align: center;">
              <h1>⭐ Tier Upgrade!</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Congratulations on your achievement!</h2>
              <p>You've been upgraded to the ${newTier} tier based on your excellent performance.</p>
              
              <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>New Tier Benefits</h3>
                <p><strong>New Tier:</strong> ${newTier}</p>
                <p><strong>New Commission Rate:</strong> ${(this.getCommissionRateForTier(newTier) * 100).toFixed(1)}%</p>
                <p><strong>Effective Date:</strong> ${new Date().toLocaleString()}</p>
              </div>

              <p>Keep up the great work and continue earning higher commissions!</p>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send tier upgrade notification:', error);
    }
  }
}
