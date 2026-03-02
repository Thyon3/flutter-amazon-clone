import { ExpressCheckout, IExpressCheckout } from '../model/expressCheckout';
import { User } from '../model/user';
import { Product } from '../model/product';
import { Order } from '../model/order';
import { EmailService } from './emailService';

export interface ExpressCheckoutRequest {
  userId: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  paymentMethodId?: string;
  shippingAddressId?: string;
  skipReview?: boolean;
}

export interface ExpressCheckoutResult {
  success: boolean;
  orderId?: string;
  message: string;
  requiresConfirmation?: boolean;
  estimatedDelivery?: string;
  orderSummary?: any;
}

export class ExpressCheckoutService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  // Get or create user's express checkout profile
  async getUserExpressCheckout(userId: string): Promise<IExpressCheckout> {
    let profile = await ExpressCheckout.findOne({ user: userId });
    
    if (!profile) {
      // Create default profile from user data
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      profile = new ExpressCheckout({
        user: userId,
        paymentMethod: 'credit_card',
        shippingAddress: {
          street: user.address?.street || '',
          city: user.address?.city || '',
          state: user.address?.state || '',
          zipCode: user.address?.zipCode || '',
          country: user.address?.country || 'US',
          isDefault: true,
        },
        billingAddress: {
          street: user.address?.street || '',
          city: user.address?.city || '',
          state: user.address?.state || '',
          zipCode: user.address?.zipCode || '',
          country: user.address?.country || 'US',
          isDefault: true,
        },
        savedPaymentMethods: [],
        preferences: {
          defaultShippingMethod: 'standard',
          savePaymentInfo: true,
          requireConfirmation: true,
          skipReview: false,
        },
        isActive: true,
      });
      await profile.save();
    }

    return profile;
  }

  // Process express checkout
  async processExpressCheckout(request: ExpressCheckoutRequest): Promise<ExpressCheckoutResult> {
    try {
      const profile = await this.getUserExpressCheckout(request.userId);
      
      // Validate items
      const validationResult = await this.validateItems(request.items);
      if (!validationResult.valid) {
        return {
          success: false,
          message: validationResult.message,
        };
      }

      // Calculate totals
      const orderSummary = await this.calculateOrderSummary(request.items, profile);
      
      // Check if confirmation is required
      const requiresConfirmation = profile.preferences.requireConfirmation && !request.skipReview;
      
      if (requiresConfirmation) {
        return {
          success: true,
          message: 'Order ready for confirmation',
          requiresConfirmation: true,
          orderSummary,
          estimatedDelivery: this.calculateEstimatedDelivery(profile.preferences.defaultShippingMethod),
        };
      }

      // Process the order
      const order = await this.createOrder(request, profile, orderSummary);
      
      // Send confirmation
      await this.sendOrderConfirmation(request.userId, order);
      
      return {
        success: true,
        orderId: order._id.toString(),
        message: 'Order placed successfully',
        estimatedDelivery: this.calculateEstimatedDelivery(profile.preferences.defaultShippingMethod),
        orderSummary,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to process express checkout: ${error}`,
      };
    }
  }

  // Validate items availability and pricing
  private async validateItems(items: ExpressCheckoutRequest['items']): Promise<{ valid: boolean; message: string }> {
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return { valid: false, message: `Product ${item.productId} not found` };
      }
      
      if (product.quantity < item.quantity) {
        return { valid: false, message: `Insufficient stock for ${product.name}` };
      }
      
      if (product.price !== item.price) {
        return { valid: false, message: `Price changed for ${product.name}` };
      }
    }
    
    return { valid: true, message: 'Items validated' };
  }

  // Calculate order summary
  private async calculateOrderSummary(
    items: ExpressCheckoutRequest['items'], 
    profile: IExpressCheckout
  ): Promise<any> {
    let subtotal = 0;
    const itemDetails = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (product) {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        
        itemDetails.push({
          productId: product._id,
          name: product.name,
          quantity: item.quantity,
          price: item.price,
          total: itemTotal,
          image: product.images[0],
        });
      }
    }

    const shippingCost = this.calculateShippingCost(profile.preferences.defaultShippingMethod, subtotal);
    const tax = subtotal * 0.08; // 8% tax
    const total = subtotal + shippingCost + tax;

    return {
      items: itemDetails,
      subtotal,
      shippingCost,
      tax,
      total,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    };
  }

  // Calculate shipping cost
  private calculateShippingCost(shippingMethod: string, subtotal: number): number {
    if (subtotal >= 35) return 0; // Free shipping for orders over $35
    
    switch (shippingMethod) {
      case 'standard':
        return 5.99;
      case 'express':
        return 12.99;
      case 'overnight':
        return 24.99;
      default:
        return 5.99;
    }
  }

  // Calculate estimated delivery
  private calculateEstimatedDelivery(shippingMethod: string): string {
    const now = new Date();
    let deliveryDate: Date;

    switch (shippingMethod) {
      case 'standard':
        deliveryDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days
        break;
      case 'express':
        deliveryDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days
        break;
      case 'overnight':
        deliveryDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day
        break;
      default:
        deliveryDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    }

    return deliveryDate.toLocaleDateString();
  }

  // Create order
  private async createOrder(
    request: ExpressCheckoutRequest, 
    profile: IExpressCheckout, 
    orderSummary: any
  ): Promise<any> {
    const order = new Order({
      user: request.userId,
      items: orderSummary.items,
      shippingAddress: profile.shippingAddress,
      billingAddress: profile.billingAddress,
      paymentMethod: profile.paymentMethod,
      subtotal: orderSummary.subtotal,
      shippingCost: orderSummary.shippingCost,
      tax: orderSummary.tax,
      total: orderSummary.total,
      status: 'confirmed',
      orderDate: new Date(),
      estimatedDelivery: this.calculateEstimatedDelivery(profile.preferences.defaultShippingMethod),
    });

    // Update product quantities
    for (const item of request.items) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { quantity: -item.quantity } }
      );
    }

    return await order.save();
  }

  // Send order confirmation
  private async sendOrderConfirmation(userId: string, order: any): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      const emailData = {
        to: user.email,
        subject: `Order Confirmation #${order._id}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #232f3e; color: white; padding: 20px; text-align: center;">
              <h1>Order Confirmed!</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Hi ${user.name},</h2>
              <p>Your order has been confirmed and will be shipped soon!</p>
              
              <div style="background-color: #f0f2f2; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Order Details:</h3>
                <p><strong>Order Number:</strong> ${order._id}</p>
                <p><strong>Order Date:</strong> ${order.orderDate.toLocaleDateString()}</p>
                <p><strong>Total Amount:</strong> $${order.total.toFixed(2)}</p>
                <p><strong>Estimated Delivery:</strong> ${order.estimatedDelivery}</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://yourapp.com/orders/${order._id}" style="background-color: #ff9900; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Track Your Order
                </a>
              </div>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send order confirmation:', error);
    }
  }

  // Save payment method
  async savePaymentMethod(
    userId: string, 
    paymentMethod: any
  ): Promise<{ success: boolean; message: string }> {
    try {
      const profile = await this.getUserExpressCheckout(userId);
      
      // If this is the default payment method, unset others
      if (paymentMethod.isDefault) {
        profile.savedPaymentMethods.forEach(method => {
          method.isDefault = false;
        });
      }

      // Add new payment method
      profile.savedPaymentMethods.push({
        id: paymentMethod.id,
        type: paymentMethod.type,
        last4: paymentMethod.last4,
        brand: paymentMethod.brand,
        expiryMonth: paymentMethod.expiryMonth,
        expiryYear: paymentMethod.expiryYear,
        isDefault: paymentMethod.isDefault || profile.savedPaymentMethods.length === 0,
        token: paymentMethod.token,
        createdAt: new Date(),
      });

      await profile.save();

      return {
        success: true,
        message: 'Payment method saved successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to save payment method: ${error}`,
      };
    }
  }

  // Update preferences
  async updatePreferences(
    userId: string, 
    preferences: Partial<IExpressCheckout['preferences']>
  ): Promise<{ success: boolean; message: string }> {
    try {
      const profile = await this.getUserExpressCheckout(userId);
      
      Object.assign(profile.preferences, preferences);
      await profile.save();

      return {
        success: true,
        message: 'Preferences updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update preferences: ${error}`,
      };
    }
  }

  // Get express checkout statistics
  async getExpressCheckoutStats(userId: string): Promise<any> {
    const profile = await this.getUserExpressCheckout(userId);
    
    return {
      isActive: profile.isActive,
      savedPaymentMethods: profile.savedPaymentMethods.length,
      defaultPaymentMethod: profile.savedPaymentMethods.find(m => m.isDefault),
      preferences: profile.preferences,
      lastUpdated: profile.updatedAt,
    };
  }
}
