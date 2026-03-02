import { ShoppingCart, IShoppingCart } from '../model/shoppingCart';
import { Product } from '../model/product';
import { User } from '../model/user';
import { EmailService } from './emailService';
import { randomBytes } from 'crypto';

export interface CartItemRequest {
  productId: string;
  quantity: number;
  variant?: {
    size?: string;
    color?: string;
    customOptions?: Record<string, any>;
  };
  savedForLater?: boolean;
}

export interface CartResponse {
  success: boolean;
  cartId?: string;
  message: string;
  cart?: IShoppingCart;
}

export interface CartSummary {
  itemCount: number;
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  totalAmount: number;
  savings: number;
  estimatedDelivery?: Date;
}

export class ShoppingCartService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  // Get or create cart
  async getOrCreateCart(userId: string, sessionId?: string): Promise<IShoppingCart> {
    try {
      let cart: IShoppingCart | null = null;

      if (userId) {
        cart = await ShoppingCart.findOne({ 
          user: userId, 
          status: 'active',
          expiresAt: { $gt: new Date() }
        });
      } else if (sessionId) {
        cart = await ShoppingCart.findOne({ 
          sessionId, 
          status: 'active',
          expiresAt: { $gt: new Date() }
        });
      }

      if (!cart) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

        cart = new ShoppingCart({
          user: userId,
          sessionId: sessionId || this.generateSessionId(),
          items: [],
          status: 'active',
          expiresAt,
          subtotal: 0,
          taxAmount: 0,
          shippingAmount: 0,
          totalAmount: 0,
        });

        await cart.save();
      }

      return cart;
    } catch (error) {
      throw new Error(`Failed to get or create cart: ${error}`);
    }
  }

  // Add item to cart
  async addItemToCart(
    userId: string,
    item: CartItemRequest,
    sessionId?: string
  ): Promise<CartResponse> {
    try {
      // Validate product
      const product = await Product.findById(item.productId);
      if (!product) {
        return {
          success: false,
          message: 'Product not found',
        };
      }

      if (product.quantity < item.quantity) {
        return {
          success: false,
          message: 'Insufficient stock',
        };
      }

      // Get or create cart
      const cart = await this.getOrCreateCart(userId, sessionId);

      // Check if item already exists
      const existingItemIndex = cart.items.findIndex(
        cartItem => 
          cartItem.productId.toString() === item.productId &&
          !cartItem.savedForLater &&
          JSON.stringify(cartItem.variant) === JSON.stringify(item.variant)
      );

      if (existingItemIndex >= 0) {
        // Update quantity
        const newQuantity = cart.items[existingItemIndex].quantity + item.quantity;
        
        if (product.quantity < newQuantity) {
          return {
            success: false,
            message: 'Insufficient stock for requested quantity',
          };
        }

        cart.items[existingItemIndex].quantity = newQuantity;
        cart.items[existingItemIndex].price = product.price;
      } else {
        // Add new item
        cart.items.push({
          productId: item.productId,
          quantity: item.quantity,
          addedAt: new Date(),
          price: product.price,
          variant: item.variant,
          savedForLater: item.savedForLater || false,
        });
      }

      // Update cart totals
      await this.updateCartTotals(cart);

      // Update last activity
      cart.metadata.lastActivity = new Date();
      await cart.save();

      return {
        success: true,
        cartId: cart._id.toString(),
        message: 'Item added to cart successfully',
        cart,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to add item to cart: ${error}`,
      };
    }
  }

  // Update item quantity
  async updateItemQuantity(
    userId: string,
    productId: string,
    quantity: number,
    variant?: any,
    sessionId?: string
  ): Promise<CartResponse> {
    try {
      if (quantity <= 0) {
        return await this.removeItemFromCart(userId, productId, variant, sessionId);
      }

      const cart = await this.getOrCreateCart(userId, sessionId);
      
      const itemIndex = cart.items.findIndex(
        item => 
          item.productId.toString() === productId &&
          !item.savedForLater &&
          JSON.stringify(item.variant) === JSON.stringify(variant)
      );

      if (itemIndex === -1) {
        return {
          success: false,
          message: 'Item not found in cart',
        };
      }

      // Validate stock
      const product = await Product.findById(productId);
      if (!product || product.quantity < quantity) {
        return {
          success: false,
          message: 'Insufficient stock',
        };
      }

      cart.items[itemIndex].quantity = quantity;
      cart.items[itemIndex].price = product.price;

      await this.updateCartTotals(cart);
      cart.metadata.lastActivity = new Date();
      await cart.save();

      return {
        success: true,
        message: 'Cart item updated successfully',
        cart,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update item quantity: ${error}`,
      };
    }
  }

  // Remove item from cart
  async removeItemFromCart(
    userId: string,
    productId: string,
    variant?: any,
    sessionId?: string
  ): Promise<CartResponse> {
    try {
      const cart = await this.getOrCreateCart(userId, sessionId);
      
      const initialLength = cart.items.length;
      cart.items = cart.items.filter(
        item => 
          !(item.productId.toString() === productId &&
            !item.savedForLater &&
            JSON.stringify(item.variant) === JSON.stringify(variant))
      );

      if (cart.items.length === initialLength) {
        return {
          success: false,
          message: 'Item not found in cart',
        };
      }

      await this.updateCartTotals(cart);
      cart.metadata.lastActivity = new Date();
      await cart.save();

      return {
        success: true,
        message: 'Item removed from cart successfully',
        cart,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to remove item from cart: ${error}`,
      };
    }
  }

  // Save item for later
  async saveItemForLater(
    userId: string,
    productId: string,
    variant?: any,
    sessionId?: string
  ): Promise<CartResponse> {
    try {
      const cart = await this.getOrCreateCart(userId, sessionId);
      
      const itemIndex = cart.items.findIndex(
        item => 
          item.productId.toString() === productId &&
          JSON.stringify(item.variant) === JSON.stringify(variant)
      );

      if (itemIndex === -1) {
        return {
          success: false,
          message: 'Item not found in cart',
        };
      }

      cart.items[itemIndex].savedForLater = true;

      await this.updateCartTotals(cart);
      cart.metadata.lastActivity = new Date();
      await cart.save();

      return {
        success: true,
        message: 'Item saved for later',
        cart,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to save item for later: ${error}`,
      };
    }
  }

  // Move item from saved for later to cart
  async moveToCart(
    userId: string,
    productId: string,
    variant?: any,
    sessionId?: string
  ): Promise<CartResponse> {
    try {
      const cart = await this.getOrCreateCart(userId, sessionId);
      
      const itemIndex = cart.items.findIndex(
        item => 
          item.productId.toString() === productId &&
          JSON.stringify(item.variant) === JSON.stringify(variant)
      );

      if (itemIndex === -1) {
        return {
          success: false,
          message: 'Item not found',
        };
      }

      // Check stock
      const product = await Product.findById(productId);
      if (!product || product.quantity < cart.items[itemIndex].quantity) {
        return {
          success: false,
          message: 'Insufficient stock',
        };
      }

      cart.items[itemIndex].savedForLater = false;
      cart.items[itemIndex].price = product.price;

      await this.updateCartTotals(cart);
      cart.metadata.lastActivity = new Date();
      await cart.save();

      return {
        success: true,
        message: 'Item moved to cart',
        cart,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to move item to cart: ${error}`,
      };
    }
  }

  // Clear cart
  async clearCart(userId: string, sessionId?: string): Promise<CartResponse> {
    try {
      const cart = await this.getOrCreateCart(userId, sessionId);
      
      cart.items = [];
      cart.subtotal = 0;
      cart.taxAmount = 0;
      cart.shippingAmount = 0;
      cart.totalAmount = 0;
      cart.discountAmount = 0;
      cart.couponCode = undefined;

      cart.metadata.lastActivity = new Date();
      await cart.save();

      return {
        success: true,
        message: 'Cart cleared successfully',
        cart,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to clear cart: ${error}`,
      };
    }
  }

  // Get cart summary
  async getCartSummary(userId: string, sessionId?: string): Promise<CartSummary> {
    try {
      const cart = await this.getOrCreateCart(userId, sessionId);
      
      const activeItems = cart.items.filter(item => !item.savedForLater);
      const itemCount = activeItems.reduce((sum, item) => sum + item.quantity, 0);
      
      const savings = cart.items.reduce((sum, item) => {
        const product = item.productId;
        if (typeof product === 'object' && 'originalPrice' in product) {
          return sum + ((product as any).originalPrice - item.price) * item.quantity;
        }
        return sum;
      }, 0);

      return {
        itemCount,
        subtotal: cart.subtotal,
        taxAmount: cart.taxAmount,
        shippingAmount: cart.shippingAmount,
        discountAmount: cart.discountAmount || 0,
        totalAmount: cart.totalAmount,
        savings,
        estimatedDelivery: this.calculateEstimatedDelivery(activeItems),
      };
    } catch (error) {
      throw new Error(`Failed to get cart summary: ${error}`);
    }
  }

  // Apply coupon code
  async applyCouponCode(
    userId: string,
    couponCode: string,
    sessionId?: string
  ): Promise<CartResponse> {
    try {
      const cart = await this.getOrCreateCart(userId, sessionId);
      
      // Validate coupon (in real app, you'd check against coupon database)
      const couponValidation = await this.validateCouponCode(couponCode, cart.subtotal);
      
      if (!couponValidation.valid) {
        return {
          success: false,
          message: couponValidation.message,
        };
      }

      cart.couponCode = couponCode;
      cart.discountAmount = couponValidation.discountAmount;

      await this.updateCartTotals(cart);
      cart.metadata.lastActivity = new Date();
      await cart.save();

      return {
        success: true,
        message: 'Coupon applied successfully',
        cart,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to apply coupon code: ${error}`,
      };
    }
  }

  // Remove coupon code
  async removeCouponCode(userId: string, sessionId?: string): Promise<CartResponse> {
    try {
      const cart = await this.getOrCreateCart(userId, sessionId);
      
      cart.couponCode = undefined;
      cart.discountAmount = 0;

      await this.updateCartTotals(cart);
      cart.metadata.lastActivity = new Date();
      await cart.save();

      return {
        success: true,
        message: 'Coupon removed successfully',
        cart,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to remove coupon code: ${error}`,
      };
    }
  }

  // Merge carts (for guest to registered user conversion)
  async mergeCarts(guestSessionId: string, userId: string): Promise<CartResponse> {
    try {
      const guestCart = await ShoppingCart.findOne({ 
        sessionId: guestSessionId, 
        status: 'active' 
      });

      if (!guestCart) {
        return {
          success: false,
          message: 'Guest cart not found',
        };
      }

      const userCart = await this.getOrCreateCart(userId);

      // Merge items
      guestCart.items.forEach(guestItem => {
        const existingItemIndex = userCart.items.findIndex(
          userItem => 
            userItem.productId.toString() === guestItem.productId.toString() &&
            JSON.stringify(userItem.variant) === JSON.stringify(guestItem.variant)
        );

        if (existingItemIndex >= 0) {
          userCart.items[existingItemIndex].quantity += guestItem.quantity;
        } else {
          userCart.items.push(guestItem);
        }
      });

      await this.updateCartTotals(userCart);
      userCart.metadata.lastActivity = new Date();
      await userCart.save();

      // Mark guest cart as converted
      guestCart.status = 'converted';
      await guestCart.save();

      return {
        success: true,
        cartId: userCart._id.toString(),
        message: 'Carts merged successfully',
        cart: userCart,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to merge carts: ${error}`,
      };
    }
  }

  // Get cart with product details
  async getCartWithDetails(userId: string, sessionId?: string): Promise<IShoppingCart | null> {
    try {
      const cart = await this.getOrCreateCart(userId, sessionId);
      
      // Populate product details
      const populatedCart = await ShoppingCart.findById(cart._id)
        .populate('items.productId', 'name images price quantity description');

      return populatedCart;
    } catch (error) {
      throw new Error(`Failed to get cart with details: ${error}`);
    }
  }

  // Update cart totals
  private async updateCartTotals(cart: IShoppingCart): Promise<void> {
    try {
      const activeItems = cart.items.filter(item => !item.savedForLater);
      
      // Calculate subtotal
      cart.subtotal = activeItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // Calculate tax (8% for example)
      cart.taxAmount = cart.subtotal * 0.08;

      // Calculate shipping (free over $50, otherwise $5)
      cart.shippingAmount = cart.subtotal >= 50 ? 0 : 5;

      // Calculate total
      cart.totalAmount = cart.subtotal + cart.taxAmount + cart.shippingAmount - (cart.discountAmount || 0);
    } catch (error) {
      console.error('Failed to update cart totals:', error);
    }
  }

  // Validate coupon code
  private async validateCouponCode(couponCode: string, subtotal: number): Promise<{ valid: boolean; discountAmount: number; message: string }> {
    try {
      // In a real app, you'd validate against coupon database
      // For now, simple validation
      const coupons = {
        'SAVE10': { discount: 0.1, minAmount: 50, message: '10% off on orders over $50' },
        'SAVE20': { discount: 0.2, minAmount: 100, message: '20% off on orders over $100' },
        'FLAT10': { discount: 10, minAmount: 0, message: '$10 off any order' },
        'FREESHIP': { discount: 5, minAmount: 0, message: 'Free shipping' },
      };

      const coupon = coupons[couponCode as keyof typeof coupons];
      
      if (!coupon) {
        return { valid: false, discountAmount: 0, message: 'Invalid coupon code' };
      }

      if (subtotal < coupon.minAmount) {
        return { valid: false, discountAmount: 0, message: `Minimum order amount is $${coupon.minAmount}` };
      }

      const discountAmount = coupon.discount < 1 ? subtotal * coupon.discount : coupon.discount;

      return {
        valid: true,
        discountAmount,
        message: coupon.message,
      };
    } catch (error) {
      return { valid: false, discountAmount: 0, message: 'Coupon validation failed' };
    }
  }

  // Calculate estimated delivery
  private calculateEstimatedDelivery(items: any[]): Date {
    try {
      // Simple calculation - in real app, you'd check shipping methods and locations
      const maxDeliveryDays = Math.max(...items.map(item => {
        // Assume 3-5 days for regular shipping
        return 5;
      }));

      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + maxDeliveryDays);

      return deliveryDate;
    } catch (error) {
      return new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days default
    }
  }

  // Generate session ID
  private generateSessionId(): string {
    return randomBytes(16).toString('hex');
  }

  // Clean up expired carts
  async cleanupExpiredCarts(): Promise<number> {
    try {
      const result = await ShoppingCart.deleteMany({
        status: 'active',
        expiresAt: { $lt: new Date() },
      });

      return result.deletedCount || 0;
    } catch (error) {
      console.error('Failed to cleanup expired carts:', error);
      return 0;
    }
  }

  // Get abandoned carts
  async getAbandonedCarts(hours: number = 24): Promise<IShoppingCart[]> {
    try {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - hours);

      const abandonedCarts = await ShoppingCart.find({
        status: 'active',
        'metadata.lastActivity': { $lt: cutoffTime },
        items: { $gt: [] },
      })
        .populate('items.productId', 'name images price')
        .populate('user', 'name email')
        .sort({ 'metadata.lastActivity': -1 });

      return abandonedCarts;
    } catch (error) {
      throw new Error(`Failed to get abandoned carts: ${error}`);
    }
  }

  // Send abandoned cart reminder
  async sendAbandonedCartReminder(cartId: string): Promise<void> {
    try {
      const cart = await ShoppingCart.findById(cartId)
        .populate('user', 'name email')
        .populate('items.productId', 'name images price');

      if (!cart || !cart.user) return;

      const emailData = {
        to: (cart.user as any).email,
        subject: 'You left items in your cart!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #232f3e; color: white; padding: 20px; text-align: center;">
              <h1>🛒 Don't Miss Out!</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Hi ${(cart.user as any).name},</h2>
              <p>You left some great items in your cart. Complete your purchase before they're gone!</p>
              
              <div style="background-color: #f0f2f2; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Your Cart Summary:</h3>
                <p><strong>Items:</strong> ${cart.items.length}</p>
                <p><strong>Total:</strong> $${cart.totalAmount.toFixed(2)}</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://yourapp.com/cart/${cart._id}" style="background-color: #ff9900; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Complete Your Order
                </a>
              </div>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send abandoned cart reminder:', error);
    }
  }

  // Get cart analytics
  async getCartAnalytics(): Promise<any> {
    try {
      const totalCarts = await ShoppingCart.countDocuments({ status: 'active' });
      const abandonedCarts = await ShoppingCart.countDocuments({ status: 'abandoned' });
      const convertedCarts = await ShoppingCart.countDocuments({ status: 'converted' });

      const averageCartValue = await ShoppingCart.aggregate([
        { $match: { status: 'active' } },
        {
          $group: {
            _id: null,
            avgValue: { $avg: '$totalAmount' },
            avgItems: { $avg: { $size: '$items' } },
          },
        },
      ]);

      return {
        totalCarts,
        abandonedCarts,
        convertedCarts,
        averageCartValue: averageCartValue[0]?.avgValue || 0,
        averageItemsPerCart: averageCartValue[0]?.avgItems || 0,
        abandonmentRate: totalCarts > 0 ? (abandonedCarts / totalCarts) * 100 : 0,
      };
    } catch (error) {
      throw new Error(`Failed to get cart analytics: ${error}`);
    }
  }
}
