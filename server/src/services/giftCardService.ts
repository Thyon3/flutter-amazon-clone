import { User } from '../model/user';
import { Order } from '../model/order';
import { EmailService } from './emailService';
import { randomBytes } from 'crypto';

export interface GiftCardRequest {
  amount: number;
  recipientName: string;
  recipientEmail: string;
  senderName: string;
  senderEmail: string;
  message?: string;
  deliveryDate?: Date;
  theme?: 'birthday' | 'holiday' | 'wedding' | 'thank_you' | 'congratulations' | 'custom';
  design?: {
    backgroundColor?: string;
    textColor?: string;
    image?: string;
  };
  metadata?: {
    occasion?: string;
    personalMessage?: string;
    includeSenderName?: boolean;
    includeAmount?: boolean;
  };
}

export interface GiftCardResponse {
  success: boolean;
  message: string;
  giftCard?: GiftCardInfo;
}

export interface GiftCardInfo {
  id: string;
  code: string;
  amount: number;
  balance: number;
  currency: string;
  status: 'active' | 'used' | 'expired' | 'suspended' | 'pending';
  type: 'physical' | 'digital';
  recipient: {
    name: string;
    email: string;
  };
  sender: {
    name: string;
    email: string;
  };
  message?: string;
  theme: string;
  design?: any;
  metadata?: any;
  createdAt: Date;
  expiresAt?: Date;
  usedAt?: Date;
  redemptionHistory: Array<{
    orderId: string;
    amount: number;
    date: Date;
    remainingBalance: number;
  }>;
}

export interface GiftCardTemplate {
  id: string;
  name: string;
  theme: string;
  design: {
    backgroundColor: string;
    textColor: string;
    image?: string;
    pattern?: string;
  };
  preview: string;
  isActive: boolean;
  createdAt: Date;
}

export interface GiftCardStats {
  totalGiftCards: number;
  activeGiftCards: number;
  usedGiftCards: number;
  expiredGiftCards: number;
  totalValue: number;
  redeemedValue: number;
  averageAmount: number;
  topAmounts: Array<{
    amount: number;
    count: number;
    percentage: number;
  }>;
  popularThemes: Array<{
    theme: string;
    count: number;
    percentage: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    issued: number;
    redeemed: number;
    value: number;
  }>;
}

export class GiftCardService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  // Create gift card
  async createGiftCard(request: GiftCardRequest): Promise<GiftCardResponse> {
    try {
      // Validate request
      const validation = this.validateGiftCardRequest(request);
      if (!validation.valid) {
        return {
          success: false,
          message: validation.message,
        };
      }

      // Generate unique gift card code
      const code = this.generateGiftCardCode();

      // Calculate expiration date (1 year from creation)
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      // Create gift card
      const giftCard: GiftCardInfo = {
        id: this.generateId(),
        code,
        amount: request.amount,
        balance: request.amount,
        currency: 'USD',
        status: 'pending',
        type: 'digital',
        recipient: {
          name: request.recipientName,
          email: request.recipientEmail,
        },
        sender: {
          name: request.senderName,
          email: request.senderEmail,
        },
        message: request.message,
        theme: request.theme || 'custom',
        design: request.design,
        metadata: request.metadata,
        createdAt: new Date(),
        expiresAt,
        redemptionHistory: [],
      };

      // Schedule delivery if specified
      if (request.deliveryDate && request.deliveryDate > new Date()) {
        await this.scheduleGiftCardDelivery(giftCard, request.deliveryDate);
        giftCard.status = 'pending';
      } else {
        // Send immediately
        await this.sendGiftCardEmail(giftCard);
        giftCard.status = 'active';
      }

      // Send confirmation to sender
      await this.sendSenderConfirmation(giftCard);

      return {
        success: true,
        message: 'Gift card created successfully',
        giftCard,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create gift card: ${error}`,
      };
    }
  }

  // Redeem gift card
  async redeemGiftCard(code: string, orderId: string, amount: number): Promise<{ success: boolean; message: string; remainingBalance?: number }> {
    try {
      // Find gift card
      const giftCard = await this.getGiftCardByCode(code);
      if (!giftCard) {
        return {
          success: false,
          message: 'Invalid gift card code',
        };
      }

      // Check status
      if (giftCard.status !== 'active') {
        return {
          success: false,
          message: `Gift card is ${giftCard.status}`,
        };
      }

      // Check expiration
      if (giftCard.expiresAt && giftCard.expiresAt < new Date()) {
        giftCard.status = 'expired';
        return {
          success: false,
          message: 'Gift card has expired',
        };
      }

      // Check balance
      if (amount > giftCard.balance) {
        return {
          success: false,
          message: 'Insufficient gift card balance',
        };
      }

      // Process redemption
      const remainingBalance = giftCard.balance - amount;
      
      // Add to redemption history
      giftCard.redemptionHistory.push({
        orderId,
        amount,
        date: new Date(),
        remainingBalance,
      });

      // Update balance and status
      giftCard.balance = remainingBalance;
      if (remainingBalance === 0) {
        giftCard.status = 'used';
        giftCard.usedAt = new Date();
      }

      // Send redemption notification
      await this.sendRedemptionNotification(giftCard, amount, orderId);

      return {
        success: true,
        message: 'Gift card redeemed successfully',
        remainingBalance,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to redeem gift card: ${error}`,
      };
    }
  }

  // Check gift card balance
  async checkGiftCardBalance(code: string): Promise<{ success: boolean; message: string; balance?: number; expiresAt?: Date }> {
    try {
      const giftCard = await this.getGiftCardByCode(code);
      if (!giftCard) {
        return {
          success: false,
          message: 'Invalid gift card code',
        };
      }

      return {
        success: true,
        message: 'Gift card balance retrieved',
        balance: giftCard.balance,
        expiresAt: giftCard.expiresAt,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to check balance: ${error}`,
      };
    }
  }

  // Get user's gift cards
  async getUserGiftCards(userId: string): Promise<GiftCardInfo[]> {
    try {
      // In a real app, you'd query database
      return [
        {
          id: '1',
          code: 'GIFT-12345678',
          amount: 100,
          balance: 75,
          currency: 'USD',
          status: 'active',
          type: 'digital',
          recipient: { name: 'John Doe', email: 'john@example.com' },
          sender: { name: 'Jane Smith', email: 'jane@example.com' },
          message: 'Happy Birthday!',
          theme: 'birthday',
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          expiresAt: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000),
          redemptionHistory: [
            {
              orderId: '123',
              amount: 25,
              date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
              remainingBalance: 75,
            },
          ],
        },
      ];
    } catch (error) {
      throw new Error(`Failed to get user gift cards: ${error}`);
    }
  }

  // Get gift card templates
  async getGiftCardTemplates(): Promise<GiftCardTemplate[]> {
    try {
      return [
        {
          id: '1',
          name: 'Birthday Celebration',
          theme: 'birthday',
          design: {
            backgroundColor: '#FF6B6B',
            textColor: '#FFFFFF',
            pattern: 'confetti',
          },
          preview: '/templates/birthday-preview.jpg',
          isActive: true,
          createdAt: new Date(),
        },
        {
          id: '2',
          name: 'Holiday Joy',
          theme: 'holiday',
          design: {
            backgroundColor: '#2ECC71',
            textColor: '#FFFFFF',
            image: '/templates/holiday-bg.jpg',
          },
          preview: '/templates/holiday-preview.jpg',
          isActive: true,
          createdAt: new Date(),
        },
        {
          id: '3',
          name: 'Thank You',
          theme: 'thank_you',
          design: {
            backgroundColor: '#3498DB',
            textColor: '#FFFFFF',
          },
          preview: '/templates/thank-preview.jpg',
          isActive: true,
          createdAt: new Date(),
        },
      ];
    } catch (error) {
      throw new Error(`Failed to get gift card templates: ${error}`);
    }
  }

  // Create custom gift card template
  async createGiftCardTemplate(template: Partial<GiftCardTemplate>): Promise<{ success: boolean; message: string; template?: GiftCardTemplate }> {
    try {
      const newTemplate: GiftCardTemplate = {
        id: this.generateId(),
        name: template.name || '',
        theme: template.theme || 'custom',
        design: template.design || {
          backgroundColor: '#FF9900',
          textColor: '#FFFFFF',
        },
        preview: template.preview || '',
        isActive: template.isActive !== false,
        createdAt: new Date(),
      };

      return {
        success: true,
        message: 'Gift card template created successfully',
        template: newTemplate,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create template: ${error}`,
      };
    }
  }

  // Get gift card statistics
  async getGiftCardStats(timeRange?: { start: Date; end: Date }): Promise<GiftCardStats> {
    try {
      // In a real app, you'd calculate from database
      return {
        totalGiftCards: 50000,
        activeGiftCards: 35000,
        usedGiftCards: 12000,
        expiredGiftCards: 3000,
        totalValue: 2500000,
        redeemedValue: 1800000,
        averageAmount: 50,
        topAmounts: [
          { amount: 25, count: 15000, percentage: 30 },
          { amount: 50, count: 20000, percentage: 40 },
          { amount: 100, count: 10000, percentage: 20 },
          { amount: 200, count: 5000, percentage: 10 },
        ],
        popularThemes: [
          { theme: 'birthday', count: 15000, percentage: 30 },
          { theme: 'holiday', count: 20000, percentage: 40 },
          { theme: 'thank_you', count: 8000, percentage: 16 },
          { theme: 'custom', count: 7000, percentage: 14 },
        ],
        monthlyTrends: [
          { month: '2024-01', issued: 4000, redeemed: 3200, value: 200000 },
          { month: '2024-02', issued: 4500, redeemed: 3600, value: 225000 },
          { month: '2024-03', issued: 5000, redeemed: 4000, value: 250000 },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get gift card stats: ${error}`);
    }
  }

  // Process expired gift cards
  async processExpiredGiftCards(): Promise<{ success: boolean; message: string; processed: number }> {
    try {
      const expiredCards = await this.getExpiredGiftCards();
      let processedCount = 0;

      for (const card of expiredCards) {
        if (card.balance > 0) {
          // Send expiration notification
          await this.sendExpirationNotification(card);
          card.status = 'expired';
          processedCount++;
        }
      }

      return {
        success: true,
        message: `Processed ${processedCount} expired gift cards`,
        processed: processedCount,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to process expired cards: ${error}`,
        processed: 0,
      };
    }
  }

  // Send gift card reminders
  async sendGiftCardReminders(): Promise<{ success: boolean; message: string; sent: number }> {
    try {
      const expiringSoon = await this.getExpiringSoonGiftCards();
      let sentCount = 0;

      for (const card of expiringSoon) {
        if (card.balance > 0) {
          await this.sendExpirationReminder(card);
          sentCount++;
        }
      }

      return {
        success: true,
        message: `Sent ${sentCount} gift card reminders`,
        sent: sentCount,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to send reminders: ${error}`,
        sent: 0,
      };
    }
  }

  // Helper methods
  private validateGiftCardRequest(request: GiftCardRequest): { valid: boolean; message: string } {
    if (!request.amount || request.amount < 5 || request.amount > 1000) {
      return { valid: false, message: 'Amount must be between $5 and $1000' };
    }

    if (!request.recipientName || !request.recipientEmail) {
      return { valid: false, message: 'Recipient name and email are required' };
    }

    if (!request.senderName || !request.senderEmail) {
      return { valid: false, message: 'Sender name and email are required' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(request.recipientEmail) || !emailRegex.test(request.senderEmail)) {
      return { valid: false, message: 'Invalid email format' };
    }

    return { valid: true, message: 'Request is valid' };
  }

  private generateGiftCardCode(): string {
    const prefix = 'GIFT';
    const random = randomBytes(4).toString('hex').toUpperCase();
    return `${prefix}-${random}`;
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private async getGiftCardByCode(code: string): Promise<GiftCardInfo | null> {
    // In a real app, you'd query database
    return null;
  }

  private async getExpiredGiftCards(): Promise<GiftCardInfo[]> {
    // In a real app, you'd query database
    return [];
  }

  private async getExpiringSoonGiftCards(): Promise<GiftCardInfo[]> {
    // In a real app, you'd query database for cards expiring in 30 days
    return [];
  }

  private async scheduleGiftCardDelivery(giftCard: GiftCardInfo, deliveryDate: Date): Promise<void> {
    // In a real app, you'd use a job scheduler like Bull or Agenda
    console.log(`Gift card scheduled for delivery on ${deliveryDate.toISOString()}`);
  }

  // Email notification methods
  private async sendGiftCardEmail(giftCard: GiftCardInfo): Promise<void> {
    try {
      const emailData = {
        to: giftCard.recipient.email,
        subject: `You've received a $${giftCard.amount} Gift Card!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: ${giftCard.design?.backgroundColor || '#FF9900'}; color: ${giftCard.design?.textColor || '#FFFFFF'}; padding: 30px; text-align: center;">
              <h1>🎁 You've Received a Gift Card!</h1>
              <h2>$${giftCard.amount.toFixed(2)}</h2>
            </div>
            <div style="padding: 30px; background-color: #f8f9fa;">
              <h3>Hi ${giftCard.recipient.name},</h3>
              <p>${giftCard.sender.name} has sent you a gift card!</p>
              
              ${giftCard.message ? `
                <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <p><strong>Message:</strong> ${giftCard.message}</p>
                </div>
              ` : ''}

              <div style="background-color: #e8f5e8; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center;">
                <h4>Your Gift Card Code</h4>
                <div style="font-size: 24px; font-weight: bold; letter-spacing: 2px; background-color: #fff; padding: 15px; border-radius: 5px; border: 2px dashed #28a745;">
                  ${giftCard.code}
                </div>
              </div>

              <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h5>How to Use:</h5>
                <ol>
                  <li>Shop for your favorite products</li>
                  <li>Enter the gift card code at checkout</li>
                  <li>Enjoy your savings!</li>
                </ol>
              </div>

              <p><strong>Balance:</strong> $${giftCard.balance.toFixed(2)}</p>
              <p><strong>Expires:</strong> ${giftCard.expiresAt?.toLocaleDateString()}</p>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send gift card email:', error);
    }
  }

  private async sendSenderConfirmation(giftCard: GiftCardInfo): Promise<void> {
    try {
      const emailData = {
        to: giftCard.sender.email,
        subject: 'Gift Card Sent Successfully',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
              <h1>✅ Gift Card Sent!</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Hi ${giftCard.sender.name},</h2>
              <p>Your gift card has been sent to ${giftCard.recipient.name}.</p>
              
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Gift Card Details</h4>
                <p><strong>Amount:</strong> $${giftCard.amount.toFixed(2)}</p>
                <p><strong>Recipient:</strong> ${giftCard.recipient.name}</p>
                <p><strong>Code:</strong> ${giftCard.code}</p>
                <p><strong>Sent:</strong> ${giftCard.createdAt.toLocaleString()}</p>
              </div>

              <p>The recipient will receive an email with their gift card code and instructions.</p>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send sender confirmation:', error);
    }
  }

  private async sendRedemptionNotification(giftCard: GiftCardInfo, amount: number, orderId: string): Promise<void> {
    try {
      const emailData = {
        to: giftCard.recipient.email,
        subject: 'Gift Card Used',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #17a2b8; color: white; padding: 20px; text-align: center;">
              <h1>💳 Gift Card Used</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Hi ${giftCard.recipient.name},</h2>
              <p>Your gift card was used for a purchase.</p>
              
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Transaction Details</h4>
                <p><strong>Amount Used:</strong> $${amount.toFixed(2)}</p>
                <p><strong>Order ID:</strong> ${orderId}</p>
                <p><strong>Remaining Balance:</strong> $${giftCard.balance.toFixed(2)}</p>
              </div>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send redemption notification:', error);
    }
  }

  private async sendExpirationNotification(giftCard: GiftCardInfo): Promise<void> {
    try {
      const emailData = {
        to: giftCard.recipient.email,
        subject: 'Your Gift Card Has Expired',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center;">
              <h1>⏰ Gift Card Expired</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Hi ${giftCard.recipient.name},</h2>
              <p>Your gift card has expired.</p>
              
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Gift Card Details</h4>
                <p><strong>Code:</strong> ${giftCard.code}</p>
                <p><strong>Original Amount:</strong> $${giftCard.amount.toFixed(2)}</p>
                <p><strong>Remaining Balance:</strong> $${giftCard.balance.toFixed(2)}</p>
                <p><strong>Expired:</strong> ${giftCard.expiresAt?.toLocaleDateString()}</p>
              </div>

              <p>Contact customer support if you have any questions.</p>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send expiration notification:', error);
    }
  }

  private async sendExpirationReminder(giftCard: GiftCardInfo): Promise<void> {
    try {
      const emailData = {
        to: giftCard.recipient.email,
        subject: 'Your Gift Card Expires Soon',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #ffc107; color: #000; padding: 20px; text-align: center;">
              <h1>⚠️ Gift Card Expiring Soon</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Hi ${giftCard.recipient.name},</h2>
              <p>Your gift card will expire soon.</p>
              
              <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Gift Card Details</h4>
                <p><strong>Code:</strong> ${giftCard.code}</p>
                <p><strong>Balance:</strong> $${giftCard.balance.toFixed(2)}</p>
                <p><strong>Expires:</strong> ${giftCard.expiresAt?.toLocaleDateString()}</p>
              </div>

              <p>Use your gift card before it expires!</p>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send expiration reminder:', error);
    }
  }
}
