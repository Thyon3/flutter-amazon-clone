import { Subscription, ISubscription } from '../model/subscription';
import { User } from '../model/user';
import { Product } from '../model/product';
import { Order } from '../model/order';
import { EmailService } from './emailService';

export interface SubscriptionRequest {
  userId: string;
  name: string;
  description: string;
  items: Array<{
    productId: string;
    quantity: number;
    variant?: string;
  }>;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  deliveryDay: number;
  shippingAddress: any;
  paymentMethod: any;
}

export interface SubscriptionResult {
  success: boolean;
  subscriptionId?: string;
  message: string;
  nextDeliveryDate?: Date;
}

export class SubscriptionService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  // Create a new subscription
  async createSubscription(request: SubscriptionRequest): Promise<SubscriptionResult> {
    try {
      // Validate items and calculate pricing
      const validationResult = await this.validateSubscriptionItems(request.items);
      if (!validationResult.valid) {
        return {
          success: false,
          message: validationResult.message,
        };
      }

      // Calculate pricing
      const pricing = await this.calculateSubscriptionPricing(request.items);
      
      // Calculate next delivery date
      const nextDeliveryDate = this.calculateNextDeliveryDate(
        request.frequency,
        request.deliveryDay
      );

      const subscription = new Subscription({
        user: request.userId,
        name: request.name,
        description: request.description,
        items: request.items.map(item => ({
          ...item,
          price: pricing.itemPrices.get(item.productId) || 0,
        })),
        frequency: request.frequency,
        deliveryDay: request.deliveryDay,
        shippingAddress: request.shippingAddress,
        paymentMethod: request.paymentMethod,
        pricing: {
          ...pricing,
          discount: this.calculateSubscriptionDiscount(request.frequency),
        },
        status: 'active',
        nextDeliveryDate,
        startDate: new Date(),
      });

      await subscription.save();

      // Send confirmation email
      await this.sendSubscriptionConfirmation(request.userId, subscription);

      return {
        success: true,
        subscriptionId: subscription._id.toString(),
        message: 'Subscription created successfully',
        nextDeliveryDate,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create subscription: ${error}`,
      };
    }
  }

  // Validate subscription items
  private async validateSubscriptionItems(
    items: SubscriptionRequest['items']
  ): Promise<{ valid: boolean; message: string }> {
    if (items.length === 0) {
      return { valid: false, message: 'At least one item is required' };
    }

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return { valid: false, message: `Product ${item.productId} not found` };
      }
      
      if (product.quantity < item.quantity) {
        return { valid: false, message: `Insufficient stock for ${product.name}` };
      }
    }
    
    return { valid: true, message: 'Items validated' };
  }

  // Calculate subscription pricing
  private async calculateSubscriptionPricing(
    items: SubscriptionRequest['items']
  ): Promise<any> {
    let subtotal = 0;
    const itemPrices = new Map<string, number>();

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (product) {
        const itemTotal = product.price * item.quantity;
        subtotal += itemTotal;
        itemPrices.set(item.productId, product.price);
      }
    }

    const shippingCost = subtotal >= 25 ? 0 : 5.99; // Free shipping over $25
    const tax = subtotal * 0.08; // 8% tax
    const total = subtotal + shippingCost + tax;

    return {
      subtotal,
      shippingCost,
      tax,
      total,
      itemPrices,
    };
  }

  // Calculate subscription discount based on frequency
  private calculateSubscriptionDiscount(frequency: string): number {
    switch (frequency) {
      case 'weekly':
        return 0.05; // 5% discount
      case 'biweekly':
        return 0.08; // 8% discount
      case 'monthly':
        return 0.10; // 10% discount
      case 'quarterly':
        return 0.15; // 15% discount
      case 'yearly':
        return 0.20; // 20% discount
      default:
        return 0;
    }
  }

  // Calculate next delivery date
  private calculateNextDeliveryDate(frequency: string, deliveryDay: number): Date {
    const now = new Date();
    let nextDate = new Date(now);

    switch (frequency) {
      case 'weekly':
        // Next occurrence of the specified day of week
        const daysUntilNext = ((deliveryDay - now.getDay() + 7) % 7) || 7;
        nextDate.setDate(now.getDate() + daysUntilNext);
        break;
      case 'biweekly':
        // Next occurrence of the specified day, then add 2 weeks
        const daysUntilBiweekly = ((deliveryDay - now.getDay() + 7) % 7) || 7;
        nextDate.setDate(now.getDate() + daysUntilBiweekly + 14);
        break;
      case 'monthly':
        // Next occurrence of the specified day of month
        if (deliveryDay > now.getDate()) {
          nextDate.setDate(deliveryDay);
        } else {
          nextDate.setMonth(now.getMonth() + 1);
          nextDate.setDate(deliveryDay);
        }
        break;
      case 'quarterly':
        // Next occurrence of the specified day, then add 3 months
        if (deliveryDay > now.getDate()) {
          nextDate.setDate(deliveryDay);
          nextDate.setMonth(now.getMonth() + 3);
        } else {
          nextDate.setMonth(now.getMonth() + 4);
          nextDate.setDate(deliveryDay);
        }
        break;
      case 'yearly':
        // Next occurrence of the specified day, then add 1 year
        if (deliveryDay > now.getDate()) {
          nextDate.setDate(deliveryDay);
          nextDate.setFullYear(now.getFullYear() + 1);
        } else {
          nextDate.setFullYear(now.getFullYear() + 1);
          nextDate.setDate(deliveryDay);
        }
        break;
    }

    return nextDate;
  }

  // Process subscription deliveries (cron job)
  async processSubscriptionDeliveries(): Promise<number> {
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const dueSubscriptions = await Subscription.find({
      status: 'active',
      nextDeliveryDate: { $lte: now },
    });

    let processedCount = 0;

    for (const subscription of dueSubscriptions) {
      try {
        await this.processSubscriptionDelivery(subscription);
        processedCount++;
      } catch (error) {
        console.error(`Failed to process subscription ${subscription._id}:`, error);
      }
    }

    return processedCount;
  }

  // Process individual subscription delivery
  private async processSubscriptionDelivery(subscription: ISubscription): Promise<void> {
    // Check if items are still available
    const validationResult = await this.validateSubscriptionItems(
      subscription.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        variant: item.variant,
      }))
    );

    if (!validationResult.valid) {
      // Pause subscription if items unavailable
      subscription.status = 'paused';
      await subscription.save();
      await this.notifySubscriptionIssue(subscription, validationResult.message);
      return;
    }

    // Create order for this delivery
    const order = await this.createSubscriptionOrder(subscription);
    
    // Update subscription
    subscription.lastDeliveryDate = new Date();
    subscription.nextDeliveryDate = this.calculateNextDeliveryDate(
      subscription.frequency,
      subscription.deliveryDay
    );
    
    await subscription.save();

    // Send delivery notification
    await this.sendDeliveryNotification(subscription.user, order, subscription);
  }

  // Create order for subscription delivery
  private async createSubscriptionOrder(subscription: ISubscription): Promise<any> {
    const order = new Order({
      user: subscription.user,
      items: subscription.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      })),
      shippingAddress: subscription.shippingAddress,
      paymentMethod: subscription.paymentMethod.type,
      subtotal: subscription.pricing.subtotal,
      shippingCost: subscription.pricing.shippingCost,
      tax: subscription.pricing.tax,
      total: subscription.pricing.total,
      status: 'confirmed',
      orderDate: new Date(),
      estimatedDelivery: subscription.nextDeliveryDate,
      isSubscriptionDelivery: true,
      subscriptionId: subscription._id,
    });

    // Update product quantities
    for (const item of subscription.items) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { quantity: -item.quantity } }
      );
    }

    return await order.save();
  }

  // Pause subscription
  async pauseSubscription(subscriptionId: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const subscription = await Subscription.findOne({ _id: subscriptionId, user: userId });
      
      if (!subscription) {
        return { success: false, message: 'Subscription not found' };
      }

      if (subscription.status !== 'active') {
        return { success: false, message: 'Subscription is not active' };
      }

      subscription.status = 'paused';
      await subscription.save();

      return { success: true, message: 'Subscription paused successfully' };
    } catch (error) {
      return { success: false, message: `Failed to pause subscription: ${error}` };
    }
  }

  // Resume subscription
  async resumeSubscription(subscriptionId: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const subscription = await Subscription.findOne({ _id: subscriptionId, user: userId });
      
      if (!subscription) {
        return { success: false, message: 'Subscription not found' };
      }

      if (subscription.status !== 'paused') {
        return { success: false, message: 'Subscription is not paused' };
      }

      subscription.status = 'active';
      subscription.nextDeliveryDate = this.calculateNextDeliveryDate(
        subscription.frequency,
        subscription.deliveryDay
      );
      await subscription.save();

      return { success: true, message: 'Subscription resumed successfully' };
    } catch (error) {
      return { success: false, message: `Failed to resume subscription: ${error}` };
    }
  }

  // Cancel subscription
  async cancelSubscription(subscriptionId: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const subscription = await Subscription.findOne({ _id: subscriptionId, user: userId });
      
      if (!subscription) {
        return { success: false, message: 'Subscription not found' };
      }

      subscription.status = 'cancelled';
      subscription.endDate = new Date();
      await subscription.save();

      return { success: true, message: 'Subscription cancelled successfully' };
    } catch (error) {
      return { success: false, message: `Failed to cancel subscription: ${error}` };
    }
  }

  // Skip next delivery
  async skipNextDelivery(subscriptionId: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const subscription = await Subscription.findOne({ _id: subscriptionId, user: userId });
      
      if (!subscription) {
        return { success: false, message: 'Subscription not found' };
      }

      if (subscription.skipCount >= subscription.maxSkips) {
        return { success: false, message: 'Maximum skips reached' };
      }

      subscription.skipCount += 1;
      subscription.nextDeliveryDate = this.calculateNextDeliveryDate(
        subscription.frequency,
        subscription.deliveryDay
      );
      await subscription.save();

      return { success: true, message: 'Next delivery skipped successfully' };
    } catch (error) {
      return { success: false, message: `Failed to skip delivery: ${error}` };
    }
  }

  // Get user subscriptions
  async getUserSubscriptions(userId: string): Promise<ISubscription[]> {
    return await Subscription.find({ user: userId })
      .sort({ createdAt: -1 });
  }

  // Get subscription statistics
  async getSubscriptionStats(userId: string): Promise<any> {
    const subscriptions = await Subscription.find({ user: userId });
    
    const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
    const pausedSubscriptions = subscriptions.filter(s => s.status === 'paused');
    const cancelledSubscriptions = subscriptions.filter(s => s.status === 'cancelled');

    const totalMonthlySpend = activeSubscriptions.reduce((sum, sub) => {
      if (sub.frequency === 'monthly') return sum + sub.pricing.total;
      if (sub.frequency === 'weekly') return sum + (sub.pricing.total * 4.33);
      if (sub.frequency === 'biweekly') return sum + (sub.pricing.total * 2.17);
      if (sub.frequency === 'quarterly') return sum + (sub.pricing.total / 3);
      if (sub.frequency === 'yearly') return sum + (sub.pricing.total / 12);
      return sum;
    }, 0);

    return {
      totalSubscriptions: subscriptions.length,
      activeSubscriptions: activeSubscriptions.length,
      pausedSubscriptions: pausedSubscriptions.length,
      cancelledSubscriptions: cancelledSubscriptions.length,
      totalMonthlySpend,
      nextDelivery: activeSubscriptions.length > 0 
        ? activeSubscriptions.reduce((earliest, sub) => 
            sub.nextDeliveryDate < earliest.nextDeliveryDate ? sub : earliest
          ).nextDeliveryDate
        : null,
    };
  }

  // Send subscription confirmation email
  private async sendSubscriptionConfirmation(userId: string, subscription: ISubscription): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      const emailData = {
        to: user.email,
        subject: `Subscription Confirmed: ${subscription.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #232f3e; color: white; padding: 20px; text-align: center;">
              <h1>📦 Subscription Confirmed!</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Hi ${user.name},</h2>
              <p>Your subscription <strong>${subscription.name}</strong> has been set up successfully!</p>
              
              <div style="background-color: #f0f2f2; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Subscription Details:</h3>
                <p><strong>Name:</strong> ${subscription.name}</p>
                <p><strong>Frequency:</strong> ${subscription.frequency}</p>
                <p><strong>Next Delivery:</strong> ${subscription.nextDeliveryDate.toLocaleDateString()}</p>
                <p><strong>Total:</strong> $${subscription.pricing.total.toFixed(2)}</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://yourapp.com/subscriptions" style="background-color: #ff9900; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Manage Subscription
                </a>
              </div>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send subscription confirmation:', error);
    }
  }

  // Send delivery notification
  private async sendDeliveryNotification(userId: string, order: any, subscription: ISubscription): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      const emailData = {
        to: user.email,
        subject: `Your ${subscription.name} is on its way!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #232f3e; color: white; padding: 20px; text-align: center;">
              <h1>🚀 Subscription Delivery!</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Hi ${user.name},</h2>
              <p>Your subscription delivery for <strong>${subscription.name}</strong> has been processed!</p>
              
              <div style="background-color: #f0f2f2; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Delivery Details:</h3>
                <p><strong>Order Number:</strong> ${order._id}</p>
                <p><strong>Delivery Date:</strong> ${subscription.nextDeliveryDate.toLocaleDateString()}</p>
                <p><strong>Total:</strong> $${subscription.pricing.total.toFixed(2)}</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://yourapp.com/orders/${order._id}" style="background-color: #ff9900; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Track Delivery
                </a>
              </div>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send delivery notification:', error);
    }
  }

  // Notify about subscription issues
  private async notifySubscriptionIssue(subscription: ISubscription, issue: string): Promise<void> {
    try {
      const user = await User.findById(subscription.user);
      if (!user) return;

      const emailData = {
        to: user.email,
        subject: `Issue with your ${subscription.name} subscription`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #ff9900; color: white; padding: 20px; text-align: center;">
              <h1>⚠️ Subscription Issue</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Hi ${user.name},</h2>
              <p>There's an issue with your subscription <strong>${subscription.name}</strong>:</p>
              
              <div style="background-color: #f0f2f2; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Issue:</strong> ${issue}</p>
                <p><strong>Status:</strong> Paused</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://yourapp.com/subscriptions" style="background-color: #ff9900; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Review Subscription
                </a>
              </div>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send subscription issue notification:', error);
    }
  }
}
