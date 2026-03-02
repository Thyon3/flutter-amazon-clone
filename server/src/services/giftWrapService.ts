import { GiftWrap, IGiftWrap } from '../model/giftWrap';
import { Order } from '../model/order';
import { Product } from '../model/product';
import { User } from '../model/user';
import { EmailService } from './emailService';

export interface GiftWrapRequest {
  orderId: string;
  items: Array<{
    productId: string;
    giftWrapOptions: {
      wrapType: 'standard' | 'premium' | 'luxury' | 'seasonal';
      wrapColor?: string;
      ribbonColor?: string;
      giftTag?: {
        message: string;
        signature: string;
        font: string;
      };
      personalization?: {
        type: 'engraving' | 'embroidery' | 'printing';
        text: string;
        font: string;
        position: string;
      };
    };
  }>;
  recipientInfo: {
    name: string;
    email?: string;
    phone?: string;
    address?: {
      street: string;
      city: string;
      state: string;
      zip: string;
      country: string;
    };
  };
  giftMessage?: {
    title: string;
    message: string;
    signature: string;
    sendDate?: Date;
  };
  packaging: {
    giftBox: boolean;
    giftBag: boolean;
    tissuePaper: boolean;
    greetingCard: boolean;
  };
  specialInstructions?: string;
}

export interface GiftWrapResponse {
  success: boolean;
  giftWrapId?: string;
  message: string;
  giftWrap?: IGiftWrap;
}

export interface GiftWrapPricing {
  wrapType: string;
  basePrice: number;
  giftBoxPrice: number;
  giftBagPrice: number;
  tissuePaperPrice: number;
  greetingCardPrice: number;
  personalizationPrice: number;
}

export class GiftWrapService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  // Create gift wrap order
  async createGiftWrap(request: GiftWrapRequest): Promise<GiftWrapResponse> {
    try {
      // Check if order exists
      const order = await Order.findById(request.orderId);
      if (!order) {
        return {
          success: false,
          message: 'Order not found',
        };
      }

      // Calculate gift wrap pricing
      const itemsWithPricing = await this.calculateGiftWrapPricing(request.items);

      const totalGiftPrice = itemsWithPricing.reduce((sum, item) => sum + item.price, 0);

      // Calculate estimated delivery (gift wrapping adds 1-2 days)
      const estimatedDelivery = new Date();
      estimatedDelivery.setDate(estimatedDelivery.getDate() + 3);

      const giftWrap = new GiftWrap({
        orderId: request.orderId,
        items: itemsWithPricing,
        recipientInfo: request.recipientInfo,
        giftMessage: request.giftMessage,
        packaging: request.packaging,
        specialInstructions: request.specialInstructions,
        totalGiftPrice,
        estimatedDelivery,
      });

      await giftWrap.save();

      // Send confirmation email
      await this.sendGiftWrapConfirmation(giftWrap);

      return {
        success: true,
        giftWrapId: giftWrap._id.toString(),
        message: 'Gift wrap order created successfully',
        giftWrap,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create gift wrap: ${error}`,
      };
    }
  }

  // Get gift wrap by order ID
  async getGiftWrapByOrderId(orderId: string): Promise<IGiftWrap | null> {
    try {
      const giftWrap = await GiftWrap.findOne({ orderId })
        .populate('items.productId', 'name images')
        .populate('orderId', 'items totalAmount');

      return giftWrap;
    } catch (error) {
      throw new Error(`Failed to get gift wrap: ${error}`);
    }
  }

  // Get user's gift wrap orders
  async getUserGiftWraps(
    userId: string,
    status?: IGiftWrap['status'],
    page: number = 1,
    limit: number = 20
  ): Promise<{ giftWraps: IGiftWrap[]; total: number }> {
    try {
      const skip = (page - 1) * limit;

      // First get user's orders
      const orders = await Order.find({ user: userId }).select('_id');
      const orderIds = orders.map(order => order._id.toString());

      let filter: any = { orderId: { $in: orderIds } };
      
      if (status) {
        filter.status = status;
      }

      const giftWraps = await GiftWrap.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('items.productId', 'name images')
        .populate('orderId', 'items totalAmount createdAt');

      const total = await GiftWrap.countDocuments(filter);

      return { giftWraps, total };
    } catch (error) {
      throw new Error(`Failed to get user gift wraps: ${error}`);
    }
  }

  // Update gift wrap status
  async updateGiftWrapStatus(
    giftWrapId: string,
    status: IGiftWrap['status']
  ): Promise<GiftWrapResponse> {
    try {
      const giftWrap = await GiftWrap.findById(giftWrapId);
      
      if (!giftWrap) {
        return {
          success: false,
          message: 'Gift wrap not found',
        };
      }

      giftWrap.status = status;
      await giftWrap.save();

      // Send status update notification
      await this.sendGiftWrapStatusUpdate(giftWrap);

      return {
        success: true,
        message: 'Gift wrap status updated successfully',
        giftWrap,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update gift wrap status: ${error}`,
      };
    }
  }

  // Get gift wrap pricing options
  async getGiftWrapPricing(): Promise<GiftWrapPricing[]> {
    try {
      const pricingOptions: GiftWrapPricing[] = [
        {
          wrapType: 'standard',
          basePrice: 4.99,
          giftBoxPrice: 2.99,
          giftBagPrice: 1.99,
          tissuePaperPrice: 0.99,
          greetingCardPrice: 2.99,
          personalizationPrice: 5.99,
        },
        {
          wrapType: 'premium',
          basePrice: 7.99,
          giftBoxPrice: 4.99,
          giftBagPrice: 2.99,
          tissuePaperPrice: 1.99,
          greetingCardPrice: 4.99,
          personalizationPrice: 8.99,
        },
        {
          wrapType: 'luxury',
          basePrice: 12.99,
          giftBoxPrice: 7.99,
          giftBagPrice: 4.99,
          tissuePaperPrice: 2.99,
          greetingCardPrice: 7.99,
          personalizationPrice: 14.99,
        },
        {
          wrapType: 'seasonal',
          basePrice: 6.99,
          giftBoxPrice: 3.99,
          giftBagPrice: 2.49,
          tissuePaperPrice: 1.49,
          greetingCardPrice: 3.99,
          personalizationPrice: 7.99,
        },
      ];

      return pricingOptions;
    } catch (error) {
      throw new Error(`Failed to get gift wrap pricing: ${error}`);
    }
  }

  // Calculate gift wrap pricing for items
  private async calculateGiftWrapPricing(items: GiftWrapRequest['items']): Promise<any[]> {
    const pricingOptions = await this.getGiftWrapPricing();
    const pricingMap = new Map(pricingOptions.map(option => [option.wrapType, option]));

    return items.map(item => {
      const pricing = pricingMap.get(item.giftWrapOptions.wrapType);
      if (!pricing) {
        throw new Error(`Invalid wrap type: ${item.giftWrapOptions.wrapType}`);
      }

      let totalPrice = pricing.basePrice;

      // Add packaging costs
      // Note: In a real implementation, you'd get packaging preferences from the request
      // For now, we'll assume basic packaging
      totalPrice += pricing.giftBoxPrice * 0.5; // Partial cost assumption

      // Add personalization cost if applicable
      if (item.giftWrapOptions.personalization) {
        totalPrice += pricing.personalizationPrice;
      }

      return {
        productId: item.productId,
        giftWrapOptions: item.giftWrapOptions,
        price: Math.round(totalPrice * 100) / 100, // Round to 2 decimal places
      };
    });
  }

  // Send gift wrap confirmation
  private async sendGiftWrapConfirmation(giftWrap: IGiftWrap): Promise<void> {
    try {
      const order = await Order.findById(giftWrap.orderId);
      if (!order) return;

      const user = await User.findById(order.user);
      if (!user) return;

      const emailData = {
        to: user.email,
        subject: 'Your Gift Wrap Order Confirmation',
        html: this.getGiftWrapConfirmationEmail(giftWrap, order),
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send gift wrap confirmation:', error);
    }
  }

  // Get gift wrap confirmation email
  private getGiftWrapConfirmationEmail(giftWrap: IGiftWrap, order: any): string {
    const baseUrl = 'https://yourapp.com';
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #232f3e; color: white; padding: 20px; text-align: center;">
          <h1>🎁 Gift Wrap Confirmation</h1>
        </div>
        <div style="padding: 20px;">
          <h2>Your Gift Wrap Order is Confirmed!</h2>
          <p>Thank you for choosing our gift wrapping service. Your items will be beautifully wrapped and ready for gifting.</p>
          
          <div style="background-color: #f0f2f2; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Order Details:</h3>
            <p><strong>Order ID:</strong> ${order._id}</p>
            <p><strong>Gift Wrap ID:</strong> ${giftWrap._id}</p>
            <p><strong>Recipient:</strong> ${giftWrap.recipientInfo.name}</p>
            <p><strong>Total Gift Price:</strong> $${giftWrap.totalGiftPrice.toFixed(2)}</p>
            <p><strong>Estimated Delivery:</strong> ${giftWrap.estimatedDelivery.toLocaleDateString()}</p>
          </div>

          <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4>Gift Wrap Summary:</h4>
            ${giftWrap.items.map(item => `
              <div style="margin-bottom: 10px;">
                <p><strong>Item:</strong> ${item.productId}</p>
                <p><strong>Wrap Type:</strong> ${item.giftWrapOptions.wrapType}</p>
                ${item.giftWrapOptions.personalization ? `<p><strong>Personalization:</strong> ${item.giftWrapOptions.personalization.text}</p>` : ''}
              </div>
            `).join('')}
          </div>

          ${giftWrap.giftMessage ? `
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h4>Gift Message:</h4>
              <p><strong>${giftWrap.giftMessage.title}</strong></p>
              <p>${giftWrap.giftMessage.message}</p>
              <p>- ${giftWrap.giftMessage.signature}</p>
            </div>
          ` : ''}

          <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}/orders/${order._id}" style="background-color: #ff9900; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              View Order Details
            </a>
          </div>
        </div>
      </div>
    `;
  }

  // Send gift wrap status update
  private async sendGiftWrapStatusUpdate(giftWrap: IGiftWrap): Promise<void> {
    try {
      const order = await Order.findById(giftWrap.orderId);
      if (!order) return;

      const user = await User.findById(order.user);
      if (!user) return;

      const emailData = {
        to: user.email,
        subject: `Gift Wrap Status Update - ${giftWrap.status}`,
        html: this.getGiftWrapStatusUpdateEmail(giftWrap),
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send gift wrap status update:', error);
    }
  }

  // Get gift wrap status update email
  private getGiftWrapStatusUpdateEmail(giftWrap: IGiftWrap): string {
    const baseUrl = 'https://yourapp.com';
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #232f3e; color: white; padding: 20px; text-align: center;">
          <h1>🎁 Gift Wrap Status Update</h1>
        </div>
        <div style="padding: 20px;">
          <h2>Your Gift Wrap Status: ${giftWrap.status}</h2>
          <p>${this.getStatusMessage(giftWrap.status)}</p>
          
          <div style="background-color: #f0f2f2; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Gift Wrap Details:</h3>
            <p><strong>Gift Wrap ID:</strong> ${giftWrap._id}</p>
            <p><strong>Recipient:</strong> ${giftWrap.recipientInfo.name}</p>
            <p><strong>Status:</strong> ${giftWrap.status}</p>
            <p><strong>Estimated Delivery:</strong> ${giftWrap.estimatedDelivery.toLocaleDateString()}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}/gift-wraps/${giftWrap._id}" style="background-color: #ff9900; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Track Gift Wrap Progress
            </a>
          </div>
        </div>
      </div>
    `;
  }

  // Get status message
  private getStatusMessage(status: IGiftWrap['status']): string {
    switch (status) {
      case 'pending':
        return 'Your gift wrap order has been received and is being processed.';
      case 'processing':
        return 'Your items are currently being wrapped with care.';
      case 'completed':
        return 'Your gift wrapping is complete and ready for shipment!';
      case 'cancelled':
        return 'Your gift wrap order has been cancelled.';
      default:
        return 'Your gift wrap status has been updated.';
    }
  }

  // Get gift wrap statistics
  async getGiftWrapStats(): Promise<any> {
    try {
      const totalGiftWraps = await GiftWrap.countDocuments();
      const pendingGiftWraps = await GiftWrap.countDocuments({ status: 'pending' });
      const processingGiftWraps = await GiftWrap.countDocuments({ status: 'processing' });
      const completedGiftWraps = await GiftWrap.countDocuments({ status: 'completed' });

      // Calculate total revenue from gift wrapping
      const allGiftWraps = await GiftWrap.find({});
      const totalRevenue = allGiftWraps.reduce((sum, giftWrap) => sum + giftWrap.totalGiftPrice, 0);

      // Popular wrap types
      const wrapTypeStats = await GiftWrap.aggregate([
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.giftWrapOptions.wrapType',
            count: { $sum: 1 },
            revenue: { $sum: '$items.price' },
          },
        },
        { $sort: { count: -1 } },
      ]);

      return {
        totalGiftWraps,
        pendingGiftWraps,
        processingGiftWraps,
        completedGiftWraps,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        popularWrapTypes: wrapTypeStats,
      };
    } catch (error) {
      throw new Error(`Failed to get gift wrap stats: ${error}`);
    }
  }

  // Validate gift wrap options
  async validateGiftWrapOptions(items: GiftWrapRequest['items']): Promise<{ valid: boolean; message: string }> {
    try {
      for (const item of items) {
        // Check if product exists
        const product = await Product.findById(item.productId);
        if (!product) {
          return { valid: false, message: `Product ${item.productId} not found` };
        }

        // Check if product supports gift wrapping
        if (!product.supportsGiftWrap) {
          return { valid: false, message: `Product ${product.name} does not support gift wrapping` };
        }

        // Validate personalization text length
        if (item.giftWrapOptions.personalization && item.giftWrapOptions.personalization.text.length > 100) {
          return { valid: false, message: 'Personalization text must be 100 characters or less' };
        }

        // Validate gift tag message length
        if (item.giftWrapOptions.giftTag && item.giftWrapOptions.giftTag.message.length > 200) {
          return { valid: false, message: 'Gift tag message must be 200 characters or less' };
        }
      }

      return { valid: true, message: 'Gift wrap options are valid' };
    } catch (error) {
      return { valid: false, message: `Failed to validate gift wrap options: ${error}` };
    }
  }

  // Search gift wraps
  async searchGiftWraps(
    query: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ giftWraps: IGiftWrap[]; total: number }> {
    try {
      const skip = (page - 1) * limit;
      const searchRegex = new RegExp(query, 'i');

      const giftWraps = await GiftWrap.find({
        $or: [
          { 'recipientInfo.name': searchRegex },
          { 'giftMessage.title': searchRegex },
          { 'giftMessage.message': searchRegex },
          { 'specialInstructions': searchRegex },
        ],
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('items.productId', 'name images')
        .populate('orderId', 'items totalAmount');

      const total = await GiftWrap.countDocuments({
        $or: [
          { 'recipientInfo.name': searchRegex },
          { 'giftMessage.title': searchRegex },
          { 'giftMessage.message': searchRegex },
          { 'specialInstructions': searchRegex },
        ],
      });

      return { giftWraps, total };
    } catch (error) {
      throw new Error(`Failed to search gift wraps: ${error}`);
    }
  }

  // Cancel gift wrap
  async cancelGiftWrap(giftWrapId: string): Promise<GiftWrapResponse> {
    try {
      const giftWrap = await GiftWrap.findById(giftWrapId);
      
      if (!giftWrap) {
        return {
          success: false,
          message: 'Gift wrap not found',
        };
      }

      if (giftWrap.status === 'completed') {
        return {
          success: false,
          message: 'Cannot cancel completed gift wrap',
        };
      }

      giftWrap.status = 'cancelled';
      await giftWrap.save();

      // Send cancellation notification
      await this.sendGiftWrapStatusUpdate(giftWrap);

      return {
        success: true,
        message: 'Gift wrap cancelled successfully',
        giftWrap,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to cancel gift wrap: ${error}`,
      };
    }
  }
}
