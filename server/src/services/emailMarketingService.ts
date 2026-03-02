import { User } from '../model/user';
import { Product } from '../model/product';
import { Order } from '../model/order';
import { EmailService } from './emailService';

export interface CampaignRequest {
  name: string;
  type: 'welcome' | 'promotional' | 'newsletter' | 'abandoned_cart' | 'product_recommendation' | 're_engagement' | 'seasonal';
  subject: string;
  content: {
    html: string;
    text: string;
  };
  targetAudience: {
    segmentIds?: string[];
    filters?: {
      minOrders?: number;
      maxOrders?: number;
      minSpent?: number;
      maxSpent?: number;
      lastOrderAfter?: Date;
      lastOrderBefore?: Date;
      categories?: string[];
      brands?: string[];
      tags?: string[];
    };
  };
  schedule?: {
    sendAt?: Date;
    timezone?: string;
    frequency?: 'once' | 'daily' | 'weekly' | 'monthly';
  };
  settings: {
    trackOpens?: boolean;
    trackClicks?: boolean;
    unsubscribeLink?: boolean;
    testMode?: boolean;
    testEmails?: string[];
  };
}

export interface CampaignResponse {
  success: boolean;
  message: string;
  campaign?: any;
}

export interface CampaignStats {
  id: string;
  name: string;
  type: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled';
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  unsubscribedCount: number;
  bounceCount: number;
  openRate: number;
  clickRate: number;
  unsubscribeRate: number;
  bounceRate: number;
  revenue: number;
  createdAt: Date;
  sentAt?: Date;
  completedAt?: Date;
}

export interface EmailTemplate {
  id: string;
  name: string;
  type: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailSegment {
  id: string;
  name: string;
  description: string;
  criteria: {
    filters: Array<{
      field: string;
      operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
      value: any;
    }>;
    logic: 'and' | 'or';
  };
  userCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class EmailMarketingService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  // Create email campaign
  async createCampaign(request: CampaignRequest): Promise<CampaignResponse> {
    try {
      // Validate campaign data
      if (!request.name || !request.subject || !request.content) {
        return {
          success: false,
          message: 'Missing required campaign fields',
        };
      }

      // Get target audience
      const targetUsers = await this.getTargetAudience(request.targetAudience);
      
      if (targetUsers.length === 0) {
        return {
          success: false,
          message: 'No users match the target audience criteria',
        };
      }

      // Create campaign record (in real app, you'd save to database)
      const campaign = {
        id: this.generateId(),
        name: request.name,
        type: request.type,
        subject: request.subject,
        content: request.content,
        targetAudience: request.targetAudience,
        schedule: request.schedule,
        settings: request.settings,
        status: request.schedule?.sendAt ? 'scheduled' : 'draft',
        targetUserCount: targetUsers.length,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // If scheduled for immediate send, start sending
      if (!request.schedule?.sendAt || request.schedule.sendAt <= new Date()) {
        await this.sendCampaign(campaign, targetUsers);
      }

      return {
        success: true,
        message: 'Campaign created successfully',
        campaign,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create campaign: ${error}`,
      };
    }
  }

  // Get target audience based on criteria
  private async getTargetAudience(targetAudience: any): Promise<User[]> {
    try {
      let query: any = { isActive: true, preferences: { emailNotifications: true } };

      // Apply segment filters
      if (targetAudience.segmentIds && targetAudience.segmentIds.length > 0) {
        // In real app, you'd query against segment definitions
        const segmentUsers = await this.getSegmentUsers(targetAudience.segmentIds);
        query._id = { $in: segmentUsers.map(u => u._id) };
      }

      // Apply custom filters
      if (targetAudience.filters) {
        const filters = targetAudience.filters;

        if (filters.minOrders !== undefined || filters.maxOrders !== undefined) {
          const orderStats = await Order.aggregate([
            { $group: { _id: '$user', orderCount: { $sum: 1 } } },
          ]);
          
          const userOrderCounts = new Map();
          orderStats.forEach(stat => {
            userOrderCounts.set(stat._id.toString(), stat.orderCount);
          });

          const userIds = Array.from(userOrderCounts.entries())
            .filter(([_, count]) => {
              if (filters.minOrders !== undefined && count < filters.minOrders) return false;
              if (filters.maxOrders !== undefined && count > filters.maxOrders) return false;
              return true;
            })
            .map(([userId]) => userId);

          query._id = query._id ? { ...query._id, $in: userIds } : { $in: userIds };
        }

        if (filters.minSpent !== undefined || filters.maxSpent !== undefined) {
          const spendingStats = await Order.aggregate([
            { $group: { _id: '$user', totalSpent: { $sum: '$totalAmount' } } },
          ]);
          
          const userSpending = new Map();
          spendingStats.forEach(stat => {
            userSpending.set(stat._id.toString(), stat.totalSpent);
          });

          const userIds = Array.from(userSpending.entries())
            .filter(([_, spent]) => {
              if (filters.minSpent !== undefined && spent < filters.minSpent) return false;
              if (filters.maxSpent !== undefined && spent > filters.maxSpent) return false;
              return true;
            })
            .map(([userId]) => userId);

          query._id = query._id ? { ...query._id, $in: userIds } : { $in: userIds };
        }

        if (filters.lastOrderAfter || filters.lastOrderBefore) {
          const lastOrderDates = new Map();
          const orders = await Order.find({})
            .sort({ createdAt: -1 })
            .select('user createdAt');

          orders.forEach(order => {
            if (!lastOrderDates.has(order.user.toString())) {
              lastOrderDates.set(order.user.toString(), order.createdAt);
            }
          });

          const userIds = Array.from(lastOrderDates.entries())
            .filter(([_, lastOrder]) => {
              if (filters.lastOrderAfter && lastOrder < filters.lastOrderAfter) return false;
              if (filters.lastOrderBefore && lastOrder > filters.lastOrderBefore) return false;
              return true;
            })
            .map(([userId]) => userId);

          query._id = query._id ? { ...query._id, $in: userIds } : { $in: userIds };
        }
      }

      const users = await User.find(query)
        .select('name email preferences')
        .limit(10000); // Limit for performance

      return users;
    } catch (error) {
      console.error('Failed to get target audience:', error);
      return [];
    }
  }

  // Send campaign to users
  private async sendCampaign(campaign: any, users: User[]): Promise<void> {
    try {
      campaign.status = 'sending';
      campaign.sentAt = new Date();

      const batchSize = 100; // Send in batches to avoid overwhelming email service
      const batches = [];
      
      for (let i = 0; i < users.length; i += batchSize) {
        batches.push(users.slice(i, i + batchSize));
      }

      let sentCount = 0;
      let deliveredCount = 0;
      let openedCount = 0;
      let clickedCount = 0;
      let unsubscribedCount = 0;
      let bounceCount = 0;

      for (const batch of batches) {
        await Promise.all(batch.map(async (user) => {
          try {
            // Personalize email content
            const personalizedContent = await this.personalizeEmail(
              campaign.content,
              user,
              campaign.type
            );

            const emailData = {
              to: user.email,
              subject: this.personalizeSubject(campaign.subject, user),
              html: personalizedContent.html,
              text: personalizedContent.text,
              tracking: {
                campaignId: campaign.id,
                userId: user._id.toString(),
                trackOpens: campaign.settings.trackOpens !== false,
                trackClicks: campaign.settings.trackClicks !== false,
              },
            };

            // Send email
            const result = await this.emailService.sendEmail(emailData);
            
            if (result.success) {
              sentCount++;
              deliveredCount++;
            } else {
              bounceCount++;
            }

            // Simulate tracking data (in real app, this would come from email service)
            if (Math.random() < 0.3) openedCount++; // 30% open rate
            if (Math.random() < 0.1) clickedCount++; // 10% click rate
            if (Math.random() < 0.01) unsubscribedCount++; // 1% unsubscribe rate

          } catch (error) {
            console.error(`Failed to send email to ${user.email}:`, error);
            bounceCount++;
          }
        }));

        // Add delay between batches
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Update campaign stats
      campaign.status = 'sent';
      campaign.completedAt = new Date();
      campaign.sentCount = sentCount;
      campaign.deliveredCount = deliveredCount;
      campaign.openedCount = openedCount;
      campaign.clickedCount = clickedCount;
      campaign.unsubscribedCount = unsubscribedCount;
      campaign.bounceCount = bounceCount;
      campaign.openRate = deliveredCount > 0 ? (openedCount / deliveredCount) * 100 : 0;
      campaign.clickRate = deliveredCount > 0 ? (clickedCount / deliveredCount) * 100 : 0;
      campaign.unsubscribeRate = deliveredCount > 0 ? (unsubscribedCount / deliveredCount) * 100 : 0;
      campaign.bounceRate = sentCount > 0 ? (bounceCount / sentCount) * 100 : 0;

      console.log(`Campaign ${campaign.name} sent to ${sentCount} users`);
    } catch (error) {
      campaign.status = 'failed';
      console.error('Failed to send campaign:', error);
    }
  }

  // Personalize email content
  private async personalizeEmail(content: any, user: User, campaignType: string): Promise<any> {
    try {
      let html = content.html;
      let text = content.text;

      // Basic personalization variables
      const variables = {
        '{{firstName}}': user.firstName || user.name || 'Customer',
        '{{lastName}}': user.lastName || '',
        '{{email}}': user.email,
        '{{name}}': user.name || 'Customer',
      };

      // Add campaign-specific personalization
      if (campaignType === 'product_recommendation') {
        const recommendations = await this.getProductRecommendations(user._id.toString());
        variables['{{recommendations}}'] = this.generateRecommendationsHtml(recommendations);
      }

      if (campaignType === 'abandoned_cart') {
        const cartData = await this.getAbandonedCartData(user._id.toString());
        variables['{{cartItems}}'] = this.generateCartItemsHtml(cartData);
        variables['{{cartTotal}}'] = cartData.total.toFixed(2);
      }

      // Replace variables
      Object.keys(variables).forEach(key => {
        html = html.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), variables[key]);
        text = text.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), variables[key]);
      });

      return { html, text };
    } catch (error) {
      console.error('Failed to personalize email:', error);
      return content;
    }
  }

  // Personalize subject line
  private personalizeSubject(subject: string, user: User): string {
    return subject
      .replace(/\{\{firstName\}\}/g, user.firstName || user.name || 'Customer')
      .replace(/\{\{name\}\}/g, user.name || 'Customer')
      .replace(/\{\{email\}\}/g, user.email);
  }

  // Get product recommendations for user
  private async getProductRecommendations(userId: string): Promise<any[]> {
    try {
      // In real app, you'd use the recommendation service
      const products = await Product.find({ quantity: { $gt: 0 } })
        .sort({ averageRating: -1, salesCount: -1 })
        .limit(5)
        .select('name price images averageRating');

      return products;
    } catch (error) {
      console.error('Failed to get product recommendations:', error);
      return [];
    }
  }

  // Generate recommendations HTML
  private generateRecommendationsHtml(products: any[]): string {
    if (products.length === 0) return '';

    const html = products.map(product => `
      <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px;">
        <img src="${product.images[0] || '/placeholder.jpg'}" alt="${product.name}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 5px;">
        <h3>${product.name}</h3>
        <p style="color: #ff9900; font-weight: bold;">$${product.price.toFixed(2)}</p>
        <p>Rating: ${product.averageRating.toFixed(1)} ⭐</p>
        <a href="https://yourapp.com/products/${product._id}" style="background-color: #ff9900; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block;">View Product</a>
      </div>
    `).join('');

    return `<div style="display: flex; flex-wrap: wrap; gap: 10px;">${html}</div>`;
  }

  // Get abandoned cart data
  private async getAbandonedCartData(userId: string): Promise<any> {
    try {
      // In real app, you'd query the shopping cart service
      return {
        items: [
          { name: 'Sample Product 1', price: 29.99, quantity: 1 },
          { name: 'Sample Product 2', price: 49.99, quantity: 2 },
        ],
        total: 129.97,
      };
    } catch (error) {
      console.error('Failed to get abandoned cart data:', error);
      return { items: [], total: 0 };
    }
  }

  // Generate cart items HTML
  private generateCartItemsHtml(cartData: any): string {
    if (cartData.items.length === 0) return '';

    const html = cartData.items.map(item => `
      <div style="border: 1px solid #ddd; padding: 10px; margin: 5px 0; border-radius: 5px;">
        <h4>${item.name}</h4>
        <p>Price: $${item.price.toFixed(2)} × ${item.quantity} = $${(item.price * item.quantity).toFixed(2)}</p>
      </div>
    `).join('');

    return html;
  }

  // Get campaign statistics
  async getCampaignStats(campaignId: string): Promise<CampaignStats | null> {
    try {
      // In real app, you'd fetch from database
      // For now, return mock data
      return {
        id: campaignId,
        name: 'Sample Campaign',
        type: 'promotional',
        status: 'sent',
        sentCount: 1000,
        deliveredCount: 950,
        openedCount: 285,
        clickedCount: 95,
        unsubscribedCount: 10,
        bounceCount: 50,
        openRate: 30.0,
        clickRate: 10.0,
        unsubscribeRate: 1.1,
        bounceRate: 5.0,
        revenue: 2500.00,
        createdAt: new Date(),
        sentAt: new Date(),
        completedAt: new Date(),
      };
    } catch (error) {
      console.error('Failed to get campaign stats:', error);
      return null;
    }
  }

  // Get all campaigns
  async getCampaigns(page: number = 1, limit: number = 20): Promise<{ campaigns: CampaignStats[]; total: number }> {
    try {
      // In real app, you'd fetch from database with pagination
      const campaigns: CampaignStats[] = [
        {
          id: '1',
          name: 'Welcome Series',
          type: 'welcome',
          status: 'sent',
          sentCount: 500,
          deliveredCount: 485,
          openedCount: 194,
          clickedCount: 58,
          unsubscribedCount: 5,
          bounceCount: 15,
          openRate: 40.0,
          clickRate: 12.0,
          unsubscribeRate: 1.0,
          bounceRate: 3.0,
          revenue: 1500.00,
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          sentAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
        {
          id: '2',
          name: 'Summer Sale',
          type: 'promotional',
          status: 'sent',
          sentCount: 2000,
          deliveredCount: 1950,
          openedCount: 585,
          clickedCount: 195,
          unsubscribedCount: 20,
          bounceCount: 50,
          openRate: 30.0,
          clickRate: 10.0,
          unsubscribeRate: 1.0,
          bounceRate: 2.5,
          revenue: 5000.00,
          createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          sentAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          completedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        },
      ];

      return {
        campaigns: campaigns.slice((page - 1) * limit, page * limit),
        total: campaigns.length,
      };
    } catch (error) {
      throw new Error(`Failed to get campaigns: ${error}`);
    }
  }

  // Create email template
  async createTemplate(template: Partial<EmailTemplate>): Promise<any> {
    try {
      const newTemplate = {
        id: this.generateId(),
        name: template.name,
        type: template.type,
        subject: template.subject,
        htmlContent: template.htmlContent,
        textContent: template.textContent,
        variables: this.extractVariables(template.htmlContent || ''),
        isActive: template.isActive !== false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // In real app, you'd save to database
      return newTemplate;
    } catch (error) {
      throw new Error(`Failed to create template: ${error}`);
    }
  }

  // Extract variables from template
  private extractVariables(content: string): string[] {
    const regex = /\{\{([^}]+)\}\}/g;
    const variables = [];
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      variables.push(match[1]);
    }
    
    return [...new Set(variables)];
  }

  // Get email templates
  async getTemplates(type?: string): Promise<EmailTemplate[]> {
    try {
      // In real app, you'd fetch from database
      const templates: EmailTemplate[] = [
        {
          id: '1',
          name: 'Welcome Email',
          type: 'welcome',
          subject: 'Welcome to Amazon Clone!',
          htmlContent: '<h1>Welcome {{firstName}}!</h1><p>Thanks for joining us.</p>',
          textContent: 'Welcome {{firstName}}! Thanks for joining us.',
          variables: ['firstName'],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          name: 'Promotional Email',
          type: 'promotional',
          subject: 'Special Offer Just For You!',
          htmlContent: '<h1>Hi {{name}}!</h1><p>Check out our latest deals.</p>',
          textContent: 'Hi {{name}}! Check out our latest deals.',
          variables: ['name'],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      return type ? templates.filter(t => t.type === type) : templates;
    } catch (error) {
      throw new Error(`Failed to get templates: ${error}`);
    }
  }

  // Create customer segment
  async createSegment(segment: Partial<EmailSegment>): Promise<any> {
    try {
      const newSegment = {
        id: this.generateId(),
        name: segment.name,
        description: segment.description,
        criteria: segment.criteria,
        userCount: await this.calculateSegmentSize(segment.criteria),
        isActive: segment.isActive !== false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // In real app, you'd save to database
      return newSegment;
    } catch (error) {
      throw new Error(`Failed to create segment: ${error}`);
    }
  }

  // Calculate segment size
  private async calculateSegmentSize(criteria: any): Promise<number> {
    try {
      // In real app, you'd build a complex query based on criteria
      // For now, return a mock number
      return Math.floor(Math.random() * 1000) + 100;
    } catch (error) {
      console.error('Failed to calculate segment size:', error);
      return 0;
    }
  }

  // Get segment users
  private async getSegmentUsers(segmentIds: string[]): Promise<User[]> {
    try {
      // In real app, you'd query based on segment criteria
      const users = await User.find({ isActive: true })
        .select('name email preferences')
        .limit(1000);

      return users;
    } catch (error) {
      console.error('Failed to get segment users:', error);
      return [];
    }
  }

  // Get all segments
  async getSegments(): Promise<EmailSegment[]> {
    try {
      // In real app, you'd fetch from database
      const segments: EmailSegment[] = [
        {
          id: '1',
          name: 'VIP Customers',
          description: 'Customers who have spent over $500',
          criteria: {
            filters: [
              { field: 'totalSpent', operator: 'greater_than', value: 500 }
            ],
            logic: 'and',
          },
          userCount: 150,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          name: 'New Customers',
          description: 'Customers who joined in the last 30 days',
          criteria: {
            filters: [
              { field: 'createdAt', operator: 'greater_than', value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            ],
            logic: 'and',
          },
          userCount: 75,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      return segments;
    } catch (error) {
      throw new Error(`Failed to get segments: ${error}`);
    }
  }

  // Get marketing analytics
  async getMarketingAnalytics(): Promise<any> {
    try {
      const campaigns = await this.getCampaigns(1, 100);
      const totalSent = campaigns.campaigns.reduce((sum, c) => sum + c.sentCount, 0);
      const totalDelivered = campaigns.campaigns.reduce((sum, c) => sum + c.deliveredCount, 0);
      const totalOpened = campaigns.campaigns.reduce((sum, c) => sum + c.openedCount, 0);
      const totalClicked = campaigns.campaigns.reduce((sum, c) => sum + c.clickedCount, 0);
      const totalRevenue = campaigns.campaigns.reduce((sum, c) => sum + c.revenue, 0);

      return {
        overview: {
          totalCampaigns: campaigns.total,
          totalSent,
          totalDelivered,
          totalOpened,
          totalClicked,
          totalRevenue,
          averageOpenRate: totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0,
          averageClickRate: totalDelivered > 0 ? (totalClicked / totalDelivered) * 100 : 0,
          averageRevenuePerCampaign: campaigns.total > 0 ? totalRevenue / campaigns.total : 0,
        },
        campaignTypes: {
          welcome: campaigns.campaigns.filter(c => c.type === 'welcome').length,
          promotional: campaigns.campaigns.filter(c => c.type === 'promotional').length,
          newsletter: campaigns.campaigns.filter(c => c.type === 'newsletter').length,
          abandoned_cart: campaigns.campaigns.filter(c => c.type === 'abandoned_cart').length,
        },
        topPerformingCampaigns: campaigns.campaigns
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5),
        recentCampaigns: campaigns.campaigns
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, 5),
      };
    } catch (error) {
      throw new Error(`Failed to get marketing analytics: ${error}`);
    }
  }

  // Generate unique ID
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Schedule automatic campaigns
  async scheduleAutomaticCampaigns(): Promise<void> {
    try {
      // Welcome series for new users
      const newUsers = await User.find({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        isActive: true,
      });

      for (const user of newUsers) {
        await this.sendWelcomeEmail(user);
      }

      // Abandoned cart reminders
      const abandonedCarts = await this.getAbandonedCarts();
      for (const cart of abandonedCarts) {
        await this.sendAbandonedCartEmail(cart);
      }

      console.log('Automatic campaigns scheduled successfully');
    } catch (error) {
      console.error('Failed to schedule automatic campaigns:', error);
    }
  }

  // Send welcome email
  private async sendWelcomeEmail(user: User): Promise<void> {
    try {
      const template = await this.getTemplates('welcome');
      if (template.length === 0) return;

      const emailData = {
        to: user.email,
        subject: this.personalizeSubject(template[0].subject, user),
        html: this.personalizeEmail(
          { html: template[0].htmlContent, text: template[0].textContent },
          user,
          'welcome'
        ).html,
        text: this.personalizeEmail(
          { html: template[0].htmlContent, text: template[0].textContent },
          user,
          'welcome'
        ).text,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }
  }

  // Get abandoned carts
  private async getAbandonedCarts(): Promise<any[]> {
    try {
      // In real app, you'd query shopping cart service
      return [
        { user: { name: 'John Doe', email: 'john@example.com' }, items: [], total: 0 },
      ];
    } catch (error) {
      console.error('Failed to get abandoned carts:', error);
      return [];
    }
  }

  // Send abandoned cart email
  private async sendAbandonedCartEmail(cart: any): Promise<void> {
    try {
      const template = await this.getTemplates('abandoned_cart');
      if (template.length === 0) return;

      const emailData = {
        to: cart.user.email,
        subject: 'You left items in your cart!',
        html: this.personalizeEmail(
          { html: template[0].htmlContent, text: template[0].textContent },
          cart.user,
          'abandoned_cart'
        ).html,
        text: this.personalizeEmail(
          { html: template[0].htmlContent, text: template[0].textContent },
          cart.user,
          'abandoned_cart'
        ).text,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send abandoned cart email:', error);
    }
  }
}
